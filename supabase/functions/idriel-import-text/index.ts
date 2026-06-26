import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rate-limit.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FRUITS_HINT = `Frutos disponíveis (use o id):
0 = Mapa & Geografia
1 = Sistema Político
2 = Linha do Tempo
3 = Cultura & Sociedade
4 = Magia / Tecnologia
5 = Seres & Criaturas
6 = Economia
7 = Linguagem
8 = Mitologia & Religião
9 = Personagens
10 = Narrativa & Conflitos`;

const SYSTEM_PROMPT = `Você é Idriel, uma curadora de worldbuilding. Leia o documento enviado pelo criador e identifique entradas de Codex que podem ser criadas a partir dele. Retorne SOMENTE JSON válido no formato exato:
{"entries":[{"type":"ficha"|"artigo","title":"...","fruit_id":0..10,"summary":"..."}]}

Regras gerais:
- "ficha" = entidade concreta e visual (personagem, local, criatura, objeto). Resumo curto, factual.
- "artigo" = conceito amplo (sistema, cultura, lore, evento). Resumo em 2-4 parágrafos.
- Title máximo 80 caracteres.
- Summary máximo 1500 caracteres por entrada, em português brasileiro.
- Crie entre 5 e 30 entradas (priorize qualidade, cobertura e PERSONAGENS).
- NÃO invente conteúdo: extraia apenas o que está no documento. Quando uma informação não estiver explícita, omita o campo no resumo (não preencha com suposições).
- Use fruit_id correto.

PRIORIDADE ALTA — Personagens citados:
- Faça uma varredura DEDICADA atrás de TODOS os personagens nomeados ou descritos no documento (protagonistas, secundários, mencionados de passagem, antagonistas, figuras históricas, divindades, NPCs, narradores em primeira pessoa, povos-personagens).
- Para CADA personagem identificado, gere uma ficha (type="ficha", fruit_id=9 — Personagens), mesmo quando aparecer brevemente. É melhor errar para mais do que omitir.
- O título da ficha deve ser o nome próprio do personagem (sem títulos genéricos como "O Rei" se o nome existir no texto).
- O resumo da ficha de personagem deve, quando o texto fornecer, cobrir nesta ordem: identidade e papel na história, aparência física, traços de personalidade, motivações/objetivos, relações com outros personagens, arco/eventos-chave em que aparece. Use bullet-like prose curta e factual, não invente.
- Se houver dúvida se um termo é personagem ou conceito (ex.: "O Guardião"), trate como personagem quando agir, falar ou for descrito como ser; trate como artigo (ex.: fruit_id 8) quando for cargo/instituição abstrata.

Cobertura dos pilares de worldbuilding (após os personagens):
- Gere fichas/artigos cobrindo os demais frutos quando o documento mencionar: locais (0), governo e facções (1), eventos da linha do tempo (2), costumes/cultura (3), magia/tecnologia (4), criaturas (5), economia (6), línguas (7), mitologia e religião (8), conflitos e tramas (10).

${FRUITS_HINT}`;

// ~15 MB cap on base64 payloads (gateway accepts up to 20MB; deixa folga p/ JSON overhead)
const MAX_BASE64_BYTES = 20 * 1024 * 1024;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claimsData.claims.sub;

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const rl = await checkRateLimit(adminClient, userId, "idriel-import-text", 3);
    if (rl) return rl;

    // Importing pesa: cobra como 5 chamadas de texto (~5 gotas). Validamos o cap UMA vez antes.
    const { data: q } = await adminClient.rpc("check_ai_quota", { _user_id: userId, _type: "text" });

    if (!q?.allowed) {
      return new Response(JSON.stringify({ error: "Créditos insuficientes para importar (custo: 5 gotas).", quota: q }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: unknown;
    try { body = await req.json(); } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const {
      text,
      sourceType,
      fileData,      // base64 (sem prefixo data:) — opcional
      mimeType,      // ex: application/pdf
      fileName,      // opcional, p/ contexto no prompt
    } = body as Record<string, unknown>;

    const kind = typeof sourceType === "string" ? sourceType : "texto";
    const userContent: Array<Record<string, unknown>> = [];

    // — Caminho multimodal (PDF nativo) —
    if (typeof fileData === "string" && fileData.length > 0 && typeof mimeType === "string") {
      if (fileData.length > MAX_BASE64_BYTES) {
        return new Response(JSON.stringify({ error: "Arquivo muito grande (máx. ~15 MB)." }), { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (mimeType !== "application/pdf") {
        return new Response(JSON.stringify({ error: "Apenas PDF é suportado em modo multimodal." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      userContent.push({
        type: "text",
        text: `Tipo da fonte: ${kind}${typeof fileName === "string" ? ` (arquivo: ${fileName})` : ""}.\nLeia o documento anexado e extraia as entradas de Codex.`,
      });
      userContent.push({
        type: "file",
        file: {
          filename: typeof fileName === "string" ? fileName : "documento.pdf",
          file_data: `data:${mimeType};base64,${fileData}`,
        },
      });
    } else if (typeof text === "string" && text.length >= 50) {
      // — Caminho texto (DOCX/TXT/MD/colado) —
      if (text.length > 400000) {
        return new Response(JSON.stringify({ error: "Texto muito longo (máx. 400.000 caracteres)." }), { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      userContent.push({
        type: "text",
        text: `Tipo da fonte: ${kind}.\n\n--- INÍCIO DO TEXTO ---\n${text}\n--- FIM DO TEXTO ---`,
      });
    } else {
      return new Response(JSON.stringify({ error: "Envie 'fileData'+'mimeType' (PDF) ou 'text' com 50+ caracteres." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
        max_tokens: 8192,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns segundos." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const t = await response.text();
      console.error("import-text gateway error", response.status, t);
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    let parsed: { entries?: Array<{ type: string; title: string; fruit_id: number; summary: string }> } = {};
    try { parsed = JSON.parse(content); } catch {
      console.error("invalid JSON from model:", content.slice(0, 300));
      throw new Error("A IA não retornou um JSON válido. Tente de novo com um documento mais limpo.");
    }
    const entries = (parsed.entries || []).filter(e =>
      e && (e.type === "ficha" || e.type === "artigo") &&
      typeof e.title === "string" && e.title.length > 0 && e.title.length <= 200 &&
      typeof e.summary === "string" && e.summary.length > 0 && e.summary.length <= 5000 &&
      typeof e.fruit_id === "number" && e.fruit_id >= 0 && e.fruit_id <= 10
    ).slice(0, 40);

    // Cobra 5 gotas (5 chamadas de texto) — uma vez que tudo deu certo
    for (let i = 0; i < 5; i++) {
      await adminClient.rpc("increment_ai_usage", { _user_id: userId, _type: "text" });
    }

    return new Response(JSON.stringify({ entries }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("idriel-import-text error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
