import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Auth check
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

    // Check quota
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: quota } = await adminClient.rpc("check_ai_quota", { _user_id: userId, _type: "text" });
    if (!quota?.allowed) {
      const reason = quota?.reason || "unknown";
      const messages: Record<string, string> = {
        no_subscription: "Você precisa de um plano ativo para usar a IA.",
        credit_limit_reached: `Créditos esgotados (${quota?.used}/${quota?.limit}). Aguarde o próximo mês.`,
      };
      return new Response(JSON.stringify({ error: messages[reason] || "Quota exceeded", quota }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get and validate request body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { messages, systemPrompt } = body as Record<string, unknown>;

    if (!messages || !Array.isArray(messages) || messages.length === 0 || messages.length > 50) {
      return new Response(JSON.stringify({ error: "messages must be an array with 1-50 items" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const validRoles = new Set(["user", "assistant", "system"]);
    for (const msg of messages) {
      if (!msg || typeof msg !== "object" || typeof msg.role !== "string" || !validRoles.has(msg.role) || typeof msg.content !== "string" || msg.content.length > 30000) {
        return new Response(JSON.stringify({ error: "Each message must have a valid role (user/assistant/system) and content (string, max 10000 chars)" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    if (systemPrompt !== undefined && (typeof systemPrompt !== "string" || systemPrompt.length > 10000)) {
      return new Response(JSON.stringify({ error: "systemPrompt must be a string with max 10000 chars" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Call Lovable AI
    const aiMessages = [];
    if (systemPrompt) {
      aiMessages.push({ role: "system", content: systemPrompt });
    }
    aiMessages.push(...messages);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: aiMessages,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Entre em contato com o administrador." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Increment usage
    await adminClient.rpc("increment_ai_usage", { _user_id: userId, _type: "text" });

    return new Response(JSON.stringify({ content, quota }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-text error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
