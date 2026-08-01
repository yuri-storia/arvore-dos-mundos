// Troca de plano (upgrade / downgrade / mudança de ciclo) e reativação.
//
// Regras de produto:
//  - UPGRADE (Criador → Idriel, ou mensal → anual): aplicado na hora, com
//    proração cobrada imediatamente. O usuário passa a ter os benefícios já.
//  - DOWNGRADE (Idriel → Criador, ou anual → mensal): agendado para o fim do
//    ciclo já pago (Subscription Schedule). Nada é cobrado agora e o usuário
//    mantém o que pagou até o fim do período.
//  - REACTIVATE: desfaz um cancelamento pendente (cancel_at_period_end).
//  - CANCEL_SCHEDULED: desfaz um downgrade agendado.
//
// Ações: "preview" | "apply" | "reactivate" | "cancel_scheduled"
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { STRIPE_PLANS, planByPriceId, comparePlans } from "../_shared/stripe-plans.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const periodEndOf = (sub: any): number | null => {
  const item = sub?.items?.data?.[0];
  return (sub?.current_period_end as number) ?? (item?.current_period_end as number) ?? null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const secret = Deno.env.get("STRIPE_SECRET_KEY");
    if (!secret) return json({ error: "STRIPE_SECRET_KEY não configurada" }, 500);
    const stripe = new Stripe(secret, { apiVersion: "2025-08-27.basil" });

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Não autenticado" }, 401);
    const { data: claims } = await supa.auth.getClaims(authHeader.replace("Bearer ", ""));
    const userId = claims?.claims?.sub as string | undefined;
    if (!userId) return json({ error: "Não autenticado" }, 401);

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const action = String((body as any).action || "preview");
    const targetCode = String((body as any).planId || "");

    // Assinatura local
    const { data: row } = await supa
      .from("subscriptions")
      .select("id, plan_code, stripe_subscription_id, status")
      .eq("user_id", userId)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const stripeSubId = row?.stripe_subscription_id as string | undefined;
    if (!stripeSubId) {
      // Sem assinatura na Stripe: o caminho é o checkout normal.
      return json({ needsCheckout: true, reason: "no_active_stripe_subscription" });
    }

    const sub = await stripe.subscriptions.retrieve(stripeSubId, { expand: ["schedule"] });
    if (sub.status === "canceled" || sub.status === "incomplete_expired") {
      return json({ needsCheckout: true, reason: "subscription_ended" });
    }

    const item = sub.items.data[0];
    const currentPriceId = item?.price?.id as string;
    const currentPlan = currentPriceId ? planByPriceId(currentPriceId) : undefined;
    const periodEnd = periodEndOf(sub);

    // ── Reativar cancelamento pendente ─────────────────────────────
    if (action === "reactivate") {
      if (!sub.cancel_at_period_end) return json({ ok: true, alreadyActive: true });
      await stripe.subscriptions.update(stripeSubId, { cancel_at_period_end: false });
      await supa.from("subscriptions")
        .update({ status: "active", cancelled_at: null, updated_at: new Date().toISOString() })
        .eq("id", row!.id);
      return json({ ok: true, action: "reactivate" });
    }

    // ── Cancelar downgrade agendado ────────────────────────────────
    if (action === "cancel_scheduled") {
      const schedId = typeof sub.schedule === "string" ? sub.schedule : (sub.schedule as any)?.id;
      if (!schedId) return json({ ok: true, nothingScheduled: true });
      await stripe.subscriptionSchedules.release(schedId);
      return json({ ok: true, action: "cancel_scheduled" });
    }

    const target = STRIPE_PLANS[targetCode];
    if (!target || target.kind !== "subscription") return json({ error: "Plano inválido", targetCode }, 400);
    if (target.inviteOnly) return json({ error: "Este plano é exclusivo por convite." }, 403);

    if (currentPriceId === target.priceId) {
      return json({ error: "Você já está neste plano.", sameplan: true }, 400);
    }

    const direction = currentPlan ? comparePlans(currentPlan, target) : "upgrade";

    // ── Prévia ─────────────────────────────────────────────────────
    if (action === "preview") {
      let amountDue: number | null = null;
      let credit: number | null = null;
      if (direction === "upgrade") {
        try {
          const preview = await (stripe.invoices as any).createPreview({
            customer: typeof sub.customer === "string" ? sub.customer : (sub.customer as any).id,
            subscription: stripeSubId,
            subscription_details: {
              items: [{ id: item.id, price: target.priceId, quantity: 1 }],
              proration_behavior: "always_invoice",
            },
          });
          amountDue = (preview.amount_due ?? 0) / 100;
          credit = (preview.lines?.data ?? [])
            .filter((l: any) => (l.amount ?? 0) < 0)
            .reduce((s: number, l: any) => s + Math.abs(l.amount), 0) / 100;
        } catch (e) {
          console.warn("preview falhou:", e instanceof Error ? e.message : e);
        }
      }
      return json({
        ok: true,
        direction,
        currentPlanCode: currentPlan?.code ?? row?.plan_code ?? null,
        targetPlanCode: target.code,
        effectiveAt: direction === "upgrade" ? "now" : "period_end",
        periodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        amountDue,
        credit,
        cancelAtPeriodEnd: !!sub.cancel_at_period_end,
      });
    }

    if (action !== "apply") return json({ error: "Ação desconhecida" }, 400);

    // Se havia downgrade agendado, libera o schedule antes de qualquer mudança.
    const existingSchedule = typeof sub.schedule === "string" ? sub.schedule : (sub.schedule as any)?.id;
    if (existingSchedule) {
      try { await stripe.subscriptionSchedules.release(existingSchedule); } catch { /* noop */ }
    }

    const metadata = {
      plan_code: target.code,
      kind: "subscription",
      user_id: userId,
    };

    if (direction === "upgrade") {
      await stripe.subscriptions.update(stripeSubId, {
        items: [{ id: item.id, price: target.priceId, quantity: 1 }],
        proration_behavior: "always_invoice",
        cancel_at_period_end: false,
        payment_behavior: "allow_incomplete",
        metadata,
      });

      const now = new Date();
      const expires = new Date(now);
      if (target.cycle === "yearly") expires.setFullYear(expires.getFullYear() + 1);
      else expires.setMonth(expires.getMonth() + 1);

      await supa.from("subscriptions").update({
        plan_code: target.code,
        has_idriel: !!target.hasIdriel,
        billing_cycle: target.cycle,
        status: "active",
        cancelled_at: null,
        expires_at: expires.toISOString(),
        updated_at: now.toISOString(),
      }).eq("id", row!.id);

      return json({ ok: true, direction, effectiveAt: "now", planCode: target.code });
    }

    // ── Downgrade: agenda para o fim do ciclo pago ──────────────────
    const schedule = await stripe.subscriptionSchedules.create({ from_subscription: stripeSubId });
    const phase0: any = schedule.phases[0];
    await stripe.subscriptionSchedules.update(schedule.id, {
      end_behavior: "release",
      metadata,
      phases: [
        {
          items: [{ price: currentPriceId, quantity: 1 }],
          start_date: phase0.start_date,
          end_date: phase0.end_date,
        },
        {
          items: [{ price: target.priceId, quantity: 1 }],
          iterations: 1,
          metadata,
        },
      ],
    });

    return json({
      ok: true,
      direction,
      effectiveAt: "period_end",
      periodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      planCode: target.code,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("stripe-change-plan error:", msg);
    return json({ error: msg }, 500);
  }
});
