// Lê assinatura ativa direto da tabela `subscriptions` (alimentada pelo webhook do Asaas)
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ subscribed: false, plan: null }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const token = authHeader.replace("Bearer ", "");
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );
    const { data: claims, error } = await supa.auth.getClaims(token);
    if (error || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ subscribed: false, plan: null }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claims.claims.sub as string;

    const nowIso = new Date().toISOString();
    const { data: sub } = await supa
      .from("subscriptions")
      .select("plan_code, has_idriel, expires_at, status")
      .eq("user_id", userId)
      .eq("status", "active")
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Bonus drops from recharges
    const { data: bal } = await supa
      .from("user_credit_balance")
      .select("bonus_drops")
      .eq("user_id", userId)
      .maybeSingle();

    const bonusDrops = bal?.bonus_drops ?? 0;

    if (!sub) {
      return new Response(JSON.stringify({
        subscribed: false, plan: null, has_idriel: false, has_template: false,
        subscription_end: null, bonus_drops: bonusDrops,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const hasIdriel = !!sub.has_idriel;
    const planKey = hasIdriel ? "idriel" : "template";

    return new Response(JSON.stringify({
      subscribed: true,
      plan: planKey,
      plan_code: sub.plan_code,
      has_idriel: hasIdriel,
      has_template: true,
      subscription_end: sub.expires_at,
      bonus_drops: bonusDrops,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || "error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
