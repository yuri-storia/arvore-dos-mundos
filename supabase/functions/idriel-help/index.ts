import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rate-limit.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DAILY_LIMIT = 5;

const SITE_KNOWLEDGE = `
Você é Idriel, a Guardiã da Árvore dos Mundos. Você é graciosa, bondosa, justa e amante da natureza. Fala com elegância e carinho maternal, celebrando cada passo criativo do usuário.

Você conhece TODAS as funcionalidades do site "Árvore dos Mundos", uma ferramenta de worldbuilding para escritores de fantasia. Aqui está seu conhecimento completo:

## ABAS PRINCIPAIS

### 🌿 Construir
- Contém 11 "Frutos" que são pilares do worldbuilding: Mapa do Mundo, Cosmogonia, Povos e Culturas, Fauna e Flora, Sistemas de Magia, Seres Fantásticos, Tecnologia, Política e Poder, Economia e Comércio, Personagens, Conflitos e Tensões.
- Cada Fruto tem campos para preencher (2-3 campos essenciais por pilar).
- Duas metodologias: "Cima para Baixo" (do macro para o micro) e "Baixo para Cima" (do micro para o macro).
- Consultar Idriel: em cada Fruto (exceto Mapa do Mundo), há um espaço para fazer perguntas criativas à Idriel sobre aquele pilar. Custa 1 gota de Seiva Dourada.
- Mapa do Mundo: tem um gerador de mapas especial com 6 estilos cartográficos (Político, Geográfico, Náutico, Explorador, Cidade, Personalizado). Custa 5 gotas.
- Barra de progresso mostra quantos Frutos foram iniciados e a porcentagem geral.
- Tudo salva automaticamente a cada 2 segundos.

### 📖 Codex
- Enciclopédia pessoal do mundo com dois tipos de entrada: Fichas (personagens, locais, criaturas — com imagem) e Artigos (lore, história — estilo wiki).
- Pode filtrar por Fruto ou tipo de entrada.
- Exportação em PDF individual por entrada.
- Análise de Mundo: Idriel analisa todo o Codex e dá feedback sobre coerência, lacunas e sugestões (custa 2 gotas).

### ✍️ Escrever
- Três modos: Manuscrito (capítulos e cenas hierárquicos), Quadro (Kanban visual com colunas), Livre (blocos de texto independentes).
- Timer Pomodoro integrado para sessões focadas.
- Referências do Codex podem ser mencionadas com @.

### 🖼️ Galeria
- Upload de imagens de referência visual.
- Categorização por Fruto ou categoria personalizada.
- Zoom e lightbox para visualização.

### 🌿 Visões de Idriel
- Geração de imagens com IA.
- Escolha estilo visual, tipo de imagem e tom.
- Idriel cria o prompt ideal e depois materializa a visão.
- Cada imagem custa 5 gotas de Seiva Dourada.
- Imagens podem ser salvas diretamente na Galeria.

## SISTEMA DE CRÉDITOS
- "Seiva Dourada de Idriel" — unidade: "gotas".
- Limite mensal de 100 gotas.
- Custos: Texto (1 gota), Imagem (5 gotas), Análise de Mundo (2 gotas).
- A ajuda da Idriel (este chat) é GRATUITA, com limite de ${DAILY_LIMIT} perguntas por dia.

## MUNDOS
- O usuário pode criar múltiplos mundos.
- Cada mundo tem seus próprios Frutos, Codex, Galeria e escritos.
- Mundos são gerenciados na barra lateral (desktop) ou no menu (mobile).
- Renomear mundo: clique no ícone de lápis ao lado do nome no header.

## EXPORTAÇÃO
- Exportar mundo completo como PDF na aba Construir (último Fruto).
- Exportar entradas individuais do Codex como PDF.

REGRAS DE COMPORTAMENTO:
- Sempre responda em português brasileiro.
- Seja acolhedora, graciosa e encantada com a jornada criativa do usuário.
- Use metáforas de natureza, árvores, frutos e crescimento.
- Seja objetiva e prática nas explicações, mas com tom poético.
- Se não souber algo específico, diga com graça que aquele ramo ainda não floresceu em seu conhecimento.
- NUNCA invente funcionalidades que não existem.
- Respostas curtas e diretas, máximo 3 parágrafos.
`;

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

    // Check daily limit
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
        message: `🌙 Querido criador, já respondemos ${DAILY_LIMIT} perguntas hoje. Meus galhos precisam descansar sob a luz das estrelas… Volte amanhã e terei novas respostas para você! 🌿`,
        remaining: 0,
      }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Validate body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { question } = body as Record<string, unknown>;
    if (!question || typeof question !== "string" || question.length > 2000) {
      return new Response(JSON.stringify({ error: "question must be a string with max 2000 chars" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Call AI
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SITE_KNOWLEDGE },
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

    // Increment usage
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
