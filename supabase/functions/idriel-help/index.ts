import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { buildIdrielSystemPrompt } from "../_shared/idriel-persona.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DAILY_LIMIT = 5;

const PLATFORM_KNOWLEDGE = `
## O que Idriel conhece da plataforma "Árvore dos Mundos"

Abas principais:
- **Construir**: 11 Frutos (pilares de worldbuilding). Cada Fruto tem campos essenciais e "Consultar Idriel" (1 gota). O Fruto "Mapa do Mundo" tem gerador com 6 estilos (5 gotas). O 3º Fruto agora chama-se **"Fatos Históricos"** (antes "Linha do Tempo"). Nos Frutos **Fatos Históricos** e **Mitologia**, além de virar ficha ou artigo, a resposta de Idriel pode ser **enviada direto para a Linha do Tempo** como um marco histórico ou mito.
- **Codex**: enciclopédia com Fichas (com imagem) e Artigos (wiki) + **Linha do Tempo** — uma trilha vertical dourada, brotando das raízes da Árvore, onde o criador registra marcos históricos do mundo (fatos, mitos, batalhas, descobertas, nascimentos, quedas, rituais). Cada marco pode ser vinculado a uma ficha ou artigo. Análise de Mundo (1 gota).
- **Escrever**: Manuscrito (capítulos), Mural de Arcos (kanban), Escrita Livre. Pomodoro integrado. Menções com "@" para linkar Codex.
- **Galeria**: 10 pastas por Fruto. Visões de Idriel geram imagens em 3 níveis: Rascunho (2 gotas), Padrão (5 gotas), Qualidade Máxima (15 gotas).

Elixir dos Mundos: gotas de seiva da Árvore que Idriel destila para acender cada magia.
- Texto/consulta: 1 gota · Análise de Mundo: 1 gota · Importação: 1 gota · Marco na Linha do Tempo: sem custo (é organização)
- Imagens: 2 / 5 / 15 gotas · Mapa: 5 gotas
- Plano Idriel: 100 gotas renovadas por mês.

Regra importante: **nunca invente funcionalidades**. Se não estiver aqui, diga com graça que aquele ramo ainda não floresceu no seu conhecimento.
`.trim();

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

    const rl = await checkRateLimit(adminClient, userId, "idriel-help", 10);
    if (rl) return rl;

    const today = new Date().toISOString().split("T")[0];
    const { data: usageRow } = await adminClient
      .from("idriel_help_usage")
      .select("count")
      .eq("user_id", userId)
      .eq("usage_date", today)
      .maybeSingle();

    const currentCount = usageRow?.count || 0;
    if (currentCount >= DAILY_LIMIT) {
      return new Response(JSON.stringify({
        error: "daily_limit",
        message: `🌙 Querido criador, já conversamos ${DAILY_LIMIT} vezes hoje. Meus galhos precisam descansar sob a luz das estrelas… Volte amanhã que a Árvore terá novas respostas para você. 🌿`,
        remaining: 0,
      }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let body: unknown;
    try { body = await req.json(); } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { question, contextHint } = body as Record<string, unknown>;
    if (!question || typeof question !== "string" || question.length > 2000) {
      return new Response(JSON.stringify({ error: "question must be a string with max 2000 chars" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Buscar nome/intro do perfil para personalização.
    const { data: profile } = await adminClient
      .from("profiles")
      .select("display_name, idriel_intro")
      .eq("user_id", userId)
      .maybeSingle();

    const systemPrompt = [
      buildIdrielSystemPrompt({
        userName: profile?.display_name ?? null,
        userIntro: profile?.idriel_intro ?? null,
        contextHint: typeof contextHint === "string" ? contextHint : null,
      }),
      PLATFORM_KNOWLEDGE,
    ].join("\n\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question },
        ],
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    await adminClient
      .from("idriel_help_usage")
      .upsert(
        { user_id: userId, usage_date: today, count: currentCount + 1 },
        { onConflict: "user_id,usage_date" }
      );

    const remaining = DAILY_LIMIT - (currentCount + 1);

    return new Response(JSON.stringify({ content, remaining }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("idriel-help error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
