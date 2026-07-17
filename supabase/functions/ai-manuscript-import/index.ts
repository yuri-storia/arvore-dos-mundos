// Detecção de capítulos com IA — custo fixo de 3 gotas por importação.
// Estratégia: a IA recebe o texto bruto (já normalizado no client) e devolve
// apenas as FRONTEIRAS dos capítulos ({ title, first_line }). O client então
// fatia localmente pela `first_line`, garantindo que o conteúdo permaneça
// idêntico ao extraído (a IA não reescreve o corpo).
//
// Custo: 3× increment_ai_usage(_type='text') = 3 gotas (equivalente a 3
// mensagens de texto no sistema atual).
//
// Modelo: google/gemini-2.5-flash (contexto grande, barato, bom em PT-BR).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const COST_DROPS = 3;
const MAX_TEXT_CHARS = 400_000; // ~100k tokens de input; corta o excedente com aviso

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
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = claimsData.claims.sub;

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Rate limit: 4 importações/min (é operação cara e pesada).
    const rl = await checkRateLimit(adminClient, userId, "ai-manuscript-import", 4);
    if (rl) return rl;

    // Quota: precisa de 3 créditos disponíveis. check_ai_quota devolve
    // credits_used + credit_limit; validamos manualmente o custo composto.
    const { data: quota } = await adminClient.rpc("check_ai_quota", { _user_id: userId, _type: "text" });
    const isAdmin = quota?.admin === true;
    if (!quota?.allowed) {
      const reason = quota?.reason || "unknown";
      const messages: Record<string, string> = {
        no_subscription: "Você precisa de um plano ativo para usar a IA.",
        credit_limit_reached: `Gotas insuficientes (${quota?.used}/${quota?.limit}).`,
      };
      return new Response(JSON.stringify({ error: messages[reason] || "Quota exceeded", quota }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!isAdmin) {
      const used = Number(quota?.credits_used ?? 0);
      const limit = Number(quota?.credit_limit ?? 0);
      if (used + COST_DROPS > limit) {
        return new Response(JSON.stringify({
          error: `Esta operação custa ${COST_DROPS} gotas e você tem ${Math.max(0, limit - used)} disponível. Compre uma recarga ou aguarde o próximo mês.`,
          quota,
        }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    let body: unknown;
    try { body = await req.json(); } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { rawText, expectedCount, guidance } = body as Record<string, unknown>;
    if (typeof rawText !== "string" || rawText.trim().length < 200) {
      return new Response(JSON.stringify({ error: "rawText muito curto — nada para importar." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const expected = typeof expectedCount === "number" && Number.isFinite(expectedCount) && expectedCount > 0 && expectedCount < 500
      ? Math.floor(expectedCount) : undefined;
    const userGuidance = typeof guidance === "string" ? guidance.trim().slice(0, 2000) : "";

    const truncated = rawText.length > MAX_TEXT_CHARS;
    const workText = truncated ? rawText.slice(0, MAX_TEXT_CHARS) : rawText;

    const systemPrompt = [
      "Você é um assistente que identifica capítulos em manuscritos literários.",
      "Sua ÚNICA tarefa é achar onde cada capítulo começa e devolver:",
      "  - title: um título curto e limpo para o capítulo (ex.: 'Capítulo 1 — O Encontro', 'Prólogo', 'A Chegada').",
      "  - first_line: a PRIMEIRA linha do capítulo copiada VERBATIM (idêntica, byte a byte) do texto fornecido. Escolha uma linha suficientemente única para localizar sem ambiguidade (mínimo 8 caracteres, não copie linhas repetidas de cabeçalho/rodapé).",
      "Nunca reescreva, resuma ou traduza conteúdo. Nunca invente linhas — a 'first_line' deve existir literalmente no texto.",
      "Se o manuscrito não tem capítulos claros, devolva 1 único item com title='Capítulo 1' e first_line = a primeira linha real do texto.",
      "Ignore índices/sumários no início: se detectar um sumário listando capítulos, use as OCORRÊNCIAS REAIS mais adiante, não os itens do sumário.",
      "Ignore prefácios/agradecimentos/dedicatórias como capítulos separados apenas se forem muito curtos (< 300 palavras); caso contrário inclua-os.",
      expected ? `O usuário informou que o manuscrito tem aproximadamente ${expected} capítulos — use isso como forte indício.` : "",
      truncated ? "ATENÇÃO: o texto foi truncado por ser muito grande. Trabalhe com o que recebeu." : "",
    ].filter(Boolean).join("\n");

    const userPrompt = `TEXTO DO MANUSCRITO (delimitado por <<<>>>):\n<<<\n${workText}\n>>>`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "chapter_boundaries",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                chapters: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      title: { type: "string" },
                      first_line: { type: "string" },
                    },
                    required: ["title", "first_line"],
                  },
                },
              },
              required: ["chapters"],
            },
          },
        },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Entre em contato com o administrador." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("ai-manuscript-import gateway error:", aiResponse.status, errText.slice(0, 500));
      throw new Error(`AI error ${aiResponse.status}`);
    }

    const data = await aiResponse.json();
    const rawContent: string = data?.choices?.[0]?.message?.content ?? "";
    if (!rawContent) throw new Error("A IA não retornou conteúdo. Tente novamente.");

    let parsed: { chapters?: Array<{ title?: string; first_line?: string }> };
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      // Alguns provedores embrulham em markdown; tentar remover.
      const stripped = rawContent.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
      parsed = JSON.parse(stripped);
    }

    const boundaries = Array.isArray(parsed.chapters) ? parsed.chapters
      .filter((c) => typeof c?.title === "string" && typeof c?.first_line === "string" && c.first_line.trim().length >= 6)
      .map((c) => ({ title: String(c.title).trim().slice(0, 200), first_line: String(c.first_line).trim() }))
      : [];

    if (boundaries.length === 0) {
      return new Response(JSON.stringify({ error: "A IA não conseguiu identificar capítulos neste texto." }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cobrança: 3× 'text' = 3 gotas. Feito só APÓS a IA responder com sucesso.
    for (let i = 0; i < COST_DROPS; i++) {
      try { await adminClient.rpc("increment_ai_usage", { _user_id: userId, _type: "text" }); }
      catch (e) { console.error("increment_ai_usage failed", e); }
    }

    return new Response(JSON.stringify({
      boundaries,
      truncated,
      cost_drops: COST_DROPS,
      model: "google/gemini-2.5-flash",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ai-manuscript-import error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
