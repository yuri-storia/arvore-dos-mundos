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
      .select("plan_code, has_idriel, expires_at, status, cancelled_at, billing_cycle, stripe_subscription_id")
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
      // Não há assinatura ativa válida — mas se já existiu alguma (mesmo expirada),
      // devolvemos `plan_code` para que o front trate como "plano expirado" (read-only).
      const { data: latest } = await supa
        .from("subscriptions")
        .select("plan_code, expires_at")
        .eq("user_id", userId)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return new Response(JSON.stringify({
        subscribed: false,
        plan: null,
        plan_code: latest?.plan_code ?? null,
        has_idriel: false,
        has_template: false,
        subscription_end: latest?.expires_at ?? null,
        bonus_drops: bonusDrops,
        billing_cycle: null,
        cancel_at_period_end: false,
        can_change_plan: false,
        scheduled_plan_code: null,
        scheduled_at: null,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const hasIdriel = !!sub.has_idriel;
    const planKey = hasIdriel ? "idriel" : "template";

    // Downgrade agendado (registrado pela função stripe-change-plan via Stripe schedule)
    let scheduledPlanCode: string | null = null;
    let scheduledAt: string | null = null;
    if (sub.stripe_subscription_id && Deno.env.get("STRIPE_SECRET_KEY")) {
      try {
        const Stripe = (await import("https://esm.sh/stripe@18.5.0")).default;
        const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });
        const { STRIPE_PLANS } = await import("../_shared/stripe-plans.ts");
        const s = await stripe.subscriptions.retrieve(sub.stripe_subscription_id as string);
        if (s.schedule) {
          const schedId = typeof s.schedule === "string" ? s.schedule : (s.schedule as any).id;
          const sched = await stripe.subscriptionSchedules.retrieve(schedId);
          const next = sched.phases?.[1];
          const nextPrice = (next?.items?.[0] as any)?.price;
          const nextPriceId = typeof nextPrice === "string" ? nextPrice : nextPrice?.id;
          const match = Object.values(STRIPE_PLANS).find((p: any) => p.priceId === nextPriceId) as any;
          if (match) {
            scheduledPlanCode = match.code;
            scheduledAt = next?.start_date ? new Date(next.start_date * 1000).toISOString() : null;
          }
        }
      } catch (_e) { /* silencioso — não bloqueia a leitura do plano */ }
    }

    return new Response(JSON.stringify({
      subscribed: true,
      plan: planKey,
      plan_code: sub.plan_code,
      has_idriel: hasIdriel,
      has_template: true,
      subscription_end: sub.expires_at,
      bonus_drops: bonusDrops,
      billing_cycle: sub.billing_cycle ?? null,
      cancel_at_period_end: !!sub.cancelled_at,
      can_change_plan: !!sub.stripe_subscription_id,
      scheduled_plan_code: scheduledPlanCode,
      scheduled_at: scheduledAt,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || "error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
