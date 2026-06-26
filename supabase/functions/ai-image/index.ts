import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rate-limit.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Quality = "draft" | "standard" | "premium";

const MODEL_BY_QUALITY: Record<Quality, string> = {
  draft: "google/gemini-3.1-flash-image",       // Nano Banana 2 — rascunho rápido (1 gota)
  standard: "google/gemini-3-pro-image",        // Nano Banana Pro — padrão (5 gotas)
  premium: "openai/gpt-image-2",                // GPT Image 2 — qualidade máxima (15 gotas)
};

const QUOTA_TYPE_BY_QUALITY: Record<Quality, string> = {
  draft: "image_draft",
  standard: "image",
  premium: "image_premium",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = claimsData.claims.sub;

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { prompt, quality: rawQuality } = body as Record<string, unknown>;
    if (!prompt || typeof prompt !== "string" || prompt.length === 0) {
      return new Response(JSON.stringify({ error: "prompt must be a non-empty string" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const safePrompt = prompt.length > 8000 ? prompt.slice(0, 8000) : prompt;
    const quality: Quality = (rawQuality === "draft" || rawQuality === "premium") ? rawQuality : "standard";
    const model = MODEL_BY_QUALITY[quality];
    const quotaType = QUOTA_TYPE_BY_QUALITY[quality];

    const { data: quota } = await adminClient.rpc("check_ai_quota", { _user_id: userId, _type: quotaType });
    if (!quota?.allowed) {
      const reason = quota?.reason || "unknown";
      const messages: Record<string, string> = {
        no_subscription: "Você precisa de um plano ativo para gerar imagens.",
        credit_limit_reached: `Gotas insuficientes (${quota?.used}/${quota?.limit}). Aguarde o próximo mês ou compre uma recarga.`,
      };
      return new Response(JSON.stringify({ error: messages[reason] || "Quota exceeded", quota }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let imageUrl = "";
    let text = "";

    if (quality === "premium") {
      // GPT Image 2 — /v1/images/generations (different body shape)
      const response = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt: safePrompt,
          size: "1024x1024",
          quality: "high",
          n: 1,
        }),
      });
      if (!response.ok) {
        if (response.status === 429) return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns segundos." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (response.status === 402) return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Entre em contato com o administrador." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const t = await response.text();
        console.error("ai-image (premium) error:", response.status, t);
        throw new Error(`AI image error: ${response.status}`);
      }
      const data = await response.json();
      const b64 = data?.data?.[0]?.b64_json;
      if (!b64) throw new Error("No image generated");
      imageUrl = `data:image/png;base64,${b64}`;
    } else {
      // Gemini image models — chat-completions image shape
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: safePrompt }],
          modalities: ["image", "text"],
        }),
      });
      if (!response.ok) {
        if (response.status === 429) return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns segundos." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (response.status === 402) return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Entre em contato com o administrador." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const t = await response.text();
        console.error(`ai-image (${quality}) error:`, response.status, t);
        throw new Error(`AI image error: ${response.status}`);
      }
      const data = await response.json();
      imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url || "";
      text = data.choices?.[0]?.message?.content || "";
      if (!imageUrl) throw new Error("No image generated");
    }

    await adminClient.rpc("increment_ai_usage", { _user_id: userId, _type: quotaType });

    return new Response(JSON.stringify({ imageUrl, text, quota, quality, model }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-image error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
