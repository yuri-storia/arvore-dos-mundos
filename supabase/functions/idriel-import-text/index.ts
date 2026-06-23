import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const { text, sourceType } = body as Record<string, unknown>;
    if (!text || typeof text !== "string" || text.length < 50 || text.length > 200000) {
      return new Response(JSON.stringify({ error: "text must be a string with 50-200000 chars" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const kind = typeof sourceType === "string" ? sourceType : "texto";

    const systemPrompt = `Você é Idriel, uma curadora de worldbuilding. Receba o texto enviado pelo criador e identifique entradas de Codex que podem ser criadas a partir dele. Retorne SOMENTE JSON válido no formato exato:
{"entries":[{"type":"ficha"|"artigo","title":"...","fruit_id":0..10,"summary":"..."}]}

Regras:
- "ficha" = entidade concreta e visual (personagem, local, criatura, objeto). Resumo curto, factual.
- "artigo" = conceito amplo (sistema, cultura, lore, evento). Resumo em 2-4 parágrafos.
- Title máximo 80 caracteres.
- Summary máximo 1500 caracteres por entrada, em português brasileiro.
- Crie entre 3 e 20 entradas (priorize qualidade).
- NÃO invente conteúdo: extraia apenas o que está no texto.
- Use fruit_id correto.

${FRUITS_HINT}

Tipo da fonte: ${kind}.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text.slice(0, 200000) },
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
      throw new Error("A IA não retornou um JSON válido. Tente de novo com um texto mais limpo.");
    }
    const entries = (parsed.entries || []).filter(e =>
      e && (e.type === "ficha" || e.type === "artigo") &&
      typeof e.title === "string" && e.title.length > 0 && e.title.length <= 200 &&
      typeof e.summary === "string" && e.summary.length > 0 && e.summary.length <= 5000 &&
      typeof e.fruit_id === "number" && e.fruit_id >= 0 && e.fruit_id <= 10
    ).slice(0, 30);

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
