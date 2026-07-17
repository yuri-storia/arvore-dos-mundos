// Polimento de formatação de um capítulo pela Idriel.
// A IA NÃO reescreve o texto — apenas corrige diagramação:
//   • quebra parágrafos onde faltam quebras (texto colado);
//   • padroniza travessões de diálogo (— em vez de -, --, "―");
//   • remove espaços duplos, quebras estranhas, hifenização de fim de linha;
//   • preserva capitalização, pontuação de sentido, nomes próprios, itálico/negrito.
//
// Custo: 2 gotas (usa 2× increment_ai_usage 'text'). Equivalente a duas
// perguntas de texto — operação pesa mais que uma consulta comum mas menos que
// uma importação (3 gotas).
//
// Modelo: google/gemini-2.5-flash (bom em PT-BR, contexto grande, barato).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const COST_DROPS = 2;
const MAX_CHARS = 80_000; // ~20k tokens; recusa acima disso pedindo dividir.

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

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
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claimsData.claims.sub as string;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const rl = await checkRateLimit(admin, userId, "ai-format-chapter", 10);
    if (rl) return rl;

    const { data: quota } = await admin.rpc("check_ai_quota", { _user_id: userId, _type: "text" });
    const isAdmin = quota?.admin === true;
    if (!quota?.allowed) {
      const reason = quota?.reason || "unknown";
      const messages: Record<string, string> = {
        no_subscription: "Você precisa de um plano ativo para usar a IA.",
        credit_limit_reached: `Gotas insuficientes (${quota?.used}/${quota?.limit}).`,
      };
      return json({ error: messages[reason] || "Quota exceeded", quota }, 403);
    }
    if (!isAdmin) {
      const used = Number(quota?.credits_used ?? 0);
      const limit = Number(quota?.credit_limit ?? 0);
      if (used + COST_DROPS > limit) {
        return json({
          error: `Esta operação custa ${COST_DROPS} gotas e você tem ${Math.max(0, limit - used)} disponível.`,
          quota,
        }, 403);
      }
    }

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

    const text = typeof body.text === "string" ? body.text : "";
    const guidance = typeof body.guidance === "string" ? body.guidance.trim().slice(0, 1000) : "";
    if (!text.trim() || text.trim().length < 40) {
      return json({ error: "Capítulo curto demais para formatar." }, 400);
    }
    if (text.length > MAX_CHARS) {
      return json({
        error: `Capítulo muito grande (${text.length.toLocaleString("pt-BR")} caracteres). Divida em capítulos menores antes de formatar.`,
      }, 413);
    }

    const system = [
      "Você é uma revisora de diagramação de manuscritos literários em português brasileiro.",
      "Sua tarefa é APENAS corrigir a FORMATAÇÃO do texto recebido, sem reescrever, sem resumir e sem alterar o sentido.",
      "REGRAS DURAS:",
      "  1. Preserve TODAS as palavras, capitalização, pontuação de sentido, nomes próprios, números e ortografia original — não corrija erros de português; isso é responsabilidade do corretor ortográfico.",
      "  2. Quebre parágrafos onde parágrafos claramente diferentes estão colados (mudança de assunto, novo turno de diálogo, nova ação).",
      "  3. Padronize travessões de diálogo para o travessão longo '—' (em-dash) seguido de espaço no início de falas. Substitua '-', '--', '―', '–' quando forem travessão de diálogo.",
      "  4. Remova espaços duplos, espaços antes de pontuação, quebras de linha no meio de parágrafos e hifenização de fim de linha (ex.: 'pala-\\nvra' → 'palavra').",
      "  5. Preserve marcações HTML existentes se houver (<em>, <strong>, <p>, <br>) — só ajuste onde a formatação estiver errada.",
      "  6. NÃO adicione títulos, subtítulos, notas, comentários seus ou marcadores como '###'.",
      "  7. NÃO traduza, NÃO estilize, NÃO 'melhore' a prosa. Apenas diagramação.",
      guidance ? `ORIENTAÇÃO DO USUÁRIO (respeite): """${guidance}"""` : "",
      "SAÍDA: Responda ESTRITAMENTE em JSON no formato { \"formatted\": \"<texto formatado como HTML simples com <p>…</p> por parágrafo>\" }.",
      "Use <p>…</p> para cada parágrafo e <em>/<strong> apenas se já existiam no original. Não use outros elementos.",
    ].filter(Boolean).join("\n");

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "formatted_chapter",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: { formatted: { type: "string" } },
              required: ["formatted"],
            },
          },
        },
        temperature: 0.1,
        messages: [
          { role: "system", content: system },
          { role: "user", content: text },
        ],
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) return json({ error: "Muitas requisições. Aguarde alguns segundos." }, 429);
      if (resp.status === 402) return json({ error: "Créditos de IA esgotados." }, 402);
      const t = await resp.text().catch(() => "");
      console.error("ai-format-chapter gateway error:", resp.status, t.slice(0, 500));
      return json({ error: `AI error ${resp.status}` }, 500);
    }

    const data = await resp.json();
    const raw: string = data?.choices?.[0]?.message?.content ?? "";
    let parsed: { formatted?: string } = {};
    try { parsed = JSON.parse(raw); }
    catch {
      const stripped = raw.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
      try { parsed = JSON.parse(stripped); } catch { parsed = {}; }
    }

    const formatted = typeof parsed.formatted === "string" ? parsed.formatted.trim() : "";
    if (!formatted || formatted.length < Math.floor(text.length * 0.4)) {
      return json({ error: "A Idriel não conseguiu formatar este capítulo. Tente novamente." }, 422);
    }

    // Cobrança: 2× 'text' = 2 gotas — apenas após sucesso.
    for (let i = 0; i < COST_DROPS; i++) {
      try { await admin.rpc("increment_ai_usage", { _user_id: userId, _type: "text" }); }
      catch (e) { console.error("increment_ai_usage failed", e); }
    }

    return json({ formatted, cost_drops: COST_DROPS, model: "google/gemini-2.5-flash" });
  } catch (err) {
    console.error("ai-format-chapter error:", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
