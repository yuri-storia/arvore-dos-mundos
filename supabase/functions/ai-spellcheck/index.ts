// Edge Function: ai-spellcheck
// Lightweight PT-BR spell-check + suggestion endpoint backed by Gemini Flash.
// Returns whether a word is correct and up to 5 suggestions. Does NOT consume
// "gotas" — it's a UX feature absorbed by the platform.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth
      .getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return json({ error: "Unauthorized" }, 401);
    }
    const userId = claimsData.claims.sub as string;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Anti-burst: 60 checks/min — the client caches aggressively so this is
    // only hit on novel words.
    const rl = await checkRateLimit(admin, userId, "ai-spellcheck", 60);
    if (rl) return rl;

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    const word = String(body.word ?? "").trim();
    const before = String(body.before ?? "").slice(-120);
    const after = String(body.after ?? "").slice(0, 120);

    if (!word || word.length > 60) {
      return json({ error: "word must be 1-60 chars" }, 400);
    }

    // Very short purely-uppercase or numeric tokens are not "words" — treat as
    // correct without spending an API call.
    if (/^\d+$/.test(word) || word.length < 2) {
      return json({ correct: true, suggestions: [] });
    }

    const system =
      "Você é um corretor ortográfico do português brasileiro. " +
      "Responda APENAS em JSON estrito, sem texto adicional. " +
      "Considere o contexto da frase para julgar se a palavra está correta " +
      "(inclusive nomes próprios comuns em PT-BR e termos de fantasia/ficção " +
      'plausíveis). Não corrija estrangeirismos consagrados. ' +
      "Formato exato: " +
      '{"correct": boolean, "suggestions": string[] (no máx. 5, ordenadas por probabilidade), "reason"?: string}.';

    const user = JSON.stringify({
      palavra: word,
      contexto_antes: before,
      contexto_depois: after,
    });

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 200,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      console.error("ai gateway error", resp.status, text);
      // Fail-soft: report as correct so the UI never blocks the user.
      return json({ correct: true, suggestions: [], degraded: true });
    }

    const data = await resp.json();
    const raw = data?.choices?.[0]?.message?.content ?? "{}";
    let parsed: { correct?: boolean; suggestions?: unknown; reason?: string } = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }

    const correct = parsed.correct !== false; // default to correct on garbage
    const suggestions = Array.isArray(parsed.suggestions)
      ? parsed.suggestions
        .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
        .map((s) => s.trim())
        .slice(0, 5)
      : [];

    return json({ correct, suggestions, reason: parsed.reason });
  } catch (err) {
    console.error("ai-spellcheck error", err);
    return json({ correct: true, suggestions: [], degraded: true });
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
