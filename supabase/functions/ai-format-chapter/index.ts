// Polimento de formatação de um capítulo pela Idriel.
// Dois modos:
//   • "boundaries" (padrão, 1 gota, modelo lite): recebe texto plano já
//     pré-processado no client e devolve APENAS a lista de primeiras linhas
//     de cada parágrafo (verbatim). O client fatia localmente — impossível
//     perder ou reescrever texto.
//   • "rewrite" (2 gotas, modelo full): reescreve o capítulo em HTML
//     preservando marcações inline (<em>/<strong>). Usado só quando o
//     capítulo tem formatação rica que o modo boundaries destruiria.
//
// Em ambos os modos a IA JAMAIS altera palavras, ortografia ou sentido.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const COST_BOUNDARIES = 1;
const COST_REWRITE = 2;
const MAX_CHARS = 80_000;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

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

    const rl = await checkRateLimit(admin, userId, "ai-format-chapter", 20);
    if (rl) return rl;

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

    const text = typeof body.text === "string" ? body.text : "";
    const guidance = typeof body.guidance === "string" ? body.guidance.trim().slice(0, 1000) : "";
    const mode: "boundaries" | "rewrite" = body.mode === "rewrite" ? "rewrite" : "boundaries";
    const costDrops = mode === "rewrite" ? COST_REWRITE : COST_BOUNDARIES;

    if (!text.trim() || text.trim().length < 40) {
      return json({ error: "Capítulo curto demais para formatar." }, 400);
    }
    if (text.length > MAX_CHARS) {
      return json({
        error: `Capítulo muito grande (${text.length.toLocaleString("pt-BR")} caracteres). Divida em capítulos menores.`,
      }, 413);
    }

    // Quota
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
      if (used + costDrops > limit) {
        return json({
          error: `Esta operação custa ${costDrops} gota${costDrops === 1 ? "" : "s"} e você tem ${Math.max(0, limit - used)} disponível.`,
          quota,
        }, 403);
      }
    }

    if (mode === "boundaries") {
      return await runBoundariesMode({ text, guidance, LOVABLE_API_KEY, admin, userId });
    }
    return await runRewriteMode({ text, guidance, LOVABLE_API_KEY, admin, userId });
  } catch (err) {
    console.error("ai-format-chapter error:", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// MODO BOUNDARIES — 1 gota, flash-lite. IA só marca onde quebrar parágrafos.
// ─────────────────────────────────────────────────────────────────────────────
async function runBoundariesMode(args: {
  text: string; guidance: string; LOVABLE_API_KEY: string; admin: any; userId: string;
}) {
  const { text, guidance, LOVABLE_API_KEY, admin, userId } = args;

  const system = [
    "Você identifica FRONTEIRAS de parágrafos em texto literário PT-BR.",
    "Sua ÚNICA tarefa é devolver a PRIMEIRA linha de cada parágrafo do texto recebido.",
    "REGRAS DURAS:",
    "  1. Cada 'first_line' DEVE existir literalmente no texto (mesma capitalização, acentos, pontuação — mínimo 12 caracteres, único o suficiente para localizar sem ambiguidade).",
    "  2. NÃO reescreva. NÃO traduza. NÃO invente linhas. NÃO corrija ortografia.",
    "  3. Uma linha nova começa quando: muda o assunto, começa nova fala (—/–/-), começa uma ação distinta, ou há mudança clara de sujeito.",
    "  4. Falas de diálogo (linhas começando com travessão) SEMPRE são parágrafos separados.",
    "  5. Devolva as fronteiras em ORDEM de aparição no texto.",
    "  6. Se o texto já parece bem quebrado, ainda assim liste TODAS as primeiras linhas de parágrafo.",
    guidance ? `ORIENTAÇÃO DO USUÁRIO (respeite): """${guidance}"""` : "",
  ].filter(Boolean).join("\n");

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
    body: JSON.stringify({
      model: "google/gemini-3.1-flash-lite",
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "paragraph_boundaries",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              starts: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: { first_line: { type: "string" } },
                  required: ["first_line"],
                },
              },
            },
            required: ["starts"],
          },
        },
      },
      temperature: 0.1,
      messages: [
        { role: "system", content: system },
        { role: "user", content: `TEXTO (delimitado por <<<>>>):\n<<<\n${text}\n>>>` },
      ],
    }),
  });

  if (!resp.ok) return relayError(resp, "boundaries");

  const data = await resp.json();
  const raw: string = data?.choices?.[0]?.message?.content ?? "";
  let parsed: { starts?: Array<{ first_line?: string }> } = {};
  try { parsed = JSON.parse(raw); }
  catch {
    const stripped = raw.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    try { parsed = JSON.parse(stripped); } catch { parsed = {}; }
  }

  const starts = Array.isArray(parsed.starts)
    ? parsed.starts
        .map((s) => (typeof s?.first_line === "string" ? s.first_line.trim() : ""))
        .filter((s) => s.length >= 8)
    : [];

  if (starts.length === 0) return json({ error: "Sem fronteiras identificadas. Tente novamente." }, 422);

  // Cobra 1 gota após sucesso.
  try { await admin.rpc("increment_ai_usage", { _user_id: userId, _type: "text" }); }
  catch (e) { console.error("increment_ai_usage failed", e); }

  return json({
    mode: "boundaries",
    starts,
    cost_drops: COST_BOUNDARIES,
    model: "google/gemini-3.1-flash-lite",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// MODO REWRITE — 2 gotas, flash full. Para capítulos com HTML rico.
// ─────────────────────────────────────────────────────────────────────────────
async function runRewriteMode(args: {
  text: string; guidance: string; LOVABLE_API_KEY: string; admin: any; userId: string;
}) {
  const { text, guidance, LOVABLE_API_KEY, admin, userId } = args;

  const system = [
    "Você é uma revisora de diagramação de manuscritos literários em português brasileiro.",
    "Sua tarefa é APENAS corrigir a FORMATAÇÃO do texto recebido, sem reescrever, sem resumir e sem alterar o sentido.",
    "REGRAS DURAS:",
    "  1. Preserve TODAS as palavras, capitalização, pontuação de sentido, nomes próprios, números e ortografia original.",
    "  2. Quebre parágrafos onde parágrafos claramente diferentes estão colados.",
    "  3. Padronize travessões de diálogo para '—' (em-dash) no início de falas.",
    "  4. Remova espaços duplos, quebras no meio de parágrafos, hifenização de fim de linha.",
    "  5. Preserve marcações HTML inline existentes (<em>, <strong>, <u>, <s>).",
    "  6. NÃO adicione títulos, notas ou marcadores.",
    guidance ? `ORIENTAÇÃO DO USUÁRIO (respeite): """${guidance}"""` : "",
    "SAÍDA: JSON { \"formatted\": \"<HTML com <p>…</p> por parágrafo>\" }.",
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

  if (!resp.ok) return relayError(resp, "rewrite");

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

  for (let i = 0; i < COST_REWRITE; i++) {
    try { await admin.rpc("increment_ai_usage", { _user_id: userId, _type: "text" }); }
    catch (e) { console.error("increment_ai_usage failed", e); }
  }

  return json({
    mode: "rewrite",
    formatted,
    cost_drops: COST_REWRITE,
    model: "google/gemini-2.5-flash",
  });
}

async function relayError(resp: Response, tag: string) {
  if (resp.status === 429) return json({ error: "Muitas requisições. Aguarde alguns segundos." }, 429);
  if (resp.status === 402) return json({ error: "Créditos de IA esgotados." }, 402);
  const t = await resp.text().catch(() => "");
  console.error(`ai-format-chapter[${tag}] gateway error:`, resp.status, t.slice(0, 500));
  return json({ error: `AI error ${resp.status}` }, 500);
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
