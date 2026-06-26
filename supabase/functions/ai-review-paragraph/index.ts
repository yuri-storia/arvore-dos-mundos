// Edge Function: ai-review-paragraph
// Recebe um parágrafo PT-BR e devolve uma lista de problemas:
//  - spelling: erro de grafia (vai virar sublinhado VERMELHO no editor)
//  - grammar : concordância/regência/colocação (sublinhado AMARELO)
//  - style   : estilo/clareza/redundância opcional (sublinhado AMARELO)
//
// Formato de retorno:
//  { issues: Array<{ text, offset, length, type, suggestions[], reason }> }
//
// Não consome "gotas" — feature de UX absorvida pela plataforma.
// Rate-limit agressivo para evitar abuso.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Issue {
  text: string;
  offset: number;
  length: number;
  type: "spelling" | "grammar" | "style";
  suggestions: string[];
  reason: string;
}

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

    // 90 parágrafos/min por usuário — o cliente cacheia por hash então só
    // texto novo chega aqui.
    const rl = await checkRateLimit(admin, userId, "ai-review-paragraph", 90);
    if (rl) return rl;

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    const text = String(body.text ?? "");
    if (!text.trim()) return json({ issues: [] });
    if (text.length > 2000) {
      return json({ error: "text too long (max 2000 chars)" }, 400);
    }

    const system = [
      "Você é um revisor profissional de português brasileiro.",
      "Analise o parágrafo do usuário e identifique problemas de:",
      "  - 'spelling': palavras inexistentes ou com grafia errada em PT-BR.",
      "  - 'grammar' : concordância, regência, crase, conjugação, pontuação grave, parônimos usados no sentido errado (ex.: sessão/seção, mau/mal, há/a).",
      "  - 'style'   : repetição excessiva, ambiguidade clara, redundância forte. NÃO marque escolhas estilísticas legítimas.",
      "REGRAS DURAS:",
      "  - Aceite nomes próprios, neologismos plausíveis de fantasia/ficção e estrangeirismos consagrados.",
      "  - Para cada problema, 'text' DEVE bater EXATAMENTE com um trecho contíguo do parágrafo original (mesma capitalização e acentuação).",
      "  - 'offset' é a posição (em caracteres, base 0) onde 'text' começa no parágrafo; 'length' é text.length.",
      "  - Forneça de 1 a 4 'suggestions' ordenadas por probabilidade. Strings curtas, só o trecho substituto.",
      "  - 'reason' em PT-BR, curto (até 120 chars), explicando o erro.",
      "  - Se não houver problemas reais, retorne issues: [].",
      "RESPONDA APENAS JSON ESTRITO no formato:",
      '{"issues":[{"text":"...","offset":0,"length":0,"type":"spelling|grammar|style","suggestions":["..."],"reason":"..."}]}',
    ].join("\n");

    const resp = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          response_format: { type: "json_object" },
          temperature: 0.1,
          max_tokens: 1200,
          messages: [
            { role: "system", content: system },
            { role: "user", content: text },
          ],
        }),
      },
    );

    if (!resp.ok) {
      const t = await resp.text().catch(() => "");
      console.error("ai gateway error", resp.status, t);
      return json({ issues: [], degraded: true });
    }

    const data = await resp.json();
    const raw = data?.choices?.[0]?.message?.content ?? "{}";
    let parsed: { issues?: unknown } = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }

    const issues: Issue[] = [];
    if (Array.isArray(parsed.issues)) {
      for (const it of parsed.issues) {
        if (!it || typeof it !== "object") continue;
        const o = it as Record<string, unknown>;
        const itText = typeof o.text === "string" ? o.text : "";
        if (!itText) continue;
        let offset = typeof o.offset === "number" ? o.offset : -1;
        // Reposiciona se IA errou o offset: procura o primeiro casamento exato.
        if (
          offset < 0 ||
          offset + itText.length > text.length ||
          text.slice(offset, offset + itText.length) !== itText
        ) {
          offset = text.indexOf(itText);
        }
        if (offset < 0) continue;
        const type = ((): Issue["type"] => {
          const v = String(o.type ?? "").toLowerCase();
          if (v === "spelling" || v === "grammar" || v === "style") return v;
          return "grammar";
        })();
        const suggestions = Array.isArray(o.suggestions)
          ? o.suggestions
            .filter((s): s is string => typeof s === "string" && !!s.trim())
            .map((s) => s.trim())
            .slice(0, 4)
          : [];
        const reason = typeof o.reason === "string"
          ? o.reason.slice(0, 180)
          : "";
        issues.push({
          text: itText,
          offset,
          length: itText.length,
          type,
          suggestions,
          reason,
        });
      }
    }

    return json({ issues });
  } catch (err) {
    console.error("ai-review-paragraph error", err);
    return json({ issues: [], degraded: true });
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
