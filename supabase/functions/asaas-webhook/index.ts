// Recebe eventos do Asaas e atualiza assinaturas / saldo de gotas
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, asaas-access-token",
};

const PLAN_MAP: Record<string, { hasIdriel: boolean; cycle: "monthly" | "yearly"; tier: "raiz" | "idriel" }> = {
  raiz_mensal:   { hasIdriel: false, cycle: "monthly", tier: "raiz"   },
  raiz_anual:    { hasIdriel: false, cycle: "yearly",  tier: "raiz"   },
  idriel_mensal: { hasIdriel: true,  cycle: "monthly", tier: "idriel" },
  idriel_anual:  { hasIdriel: true,  cycle: "yearly",  tier: "idriel" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const expectedToken = Deno.env.get("ASAAS_WEBHOOK_TOKEN");
    if (expectedToken) {
      const got = req.headers.get("asaas-access-token");
      if (got !== expectedToken) {
        console.warn("webhook: invalid token");
        return new Response("Unauthorized", { status: 401, headers: corsHeaders });
      }
    }

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const event = await req.json();
    const eventType: string = event.event || "";
    const payment = event.payment;
    if (!payment) {
      return new Response(JSON.stringify({ ok: true, ignored: "no payment" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // externalReference = "<userId>:<planCode>"
    const externalRef: string = payment.externalReference || "";
    const [userId, planCode] = externalRef.split(":");

    // Always upsert payment record
    await supa.from("asaas_payments").upsert({
      user_id: userId || null,
      asaas_payment_id: payment.id,
      asaas_subscription_id: payment.subscription || null,
      asaas_customer_id: payment.customer,
      plan_code: planCode || "unknown",
      kind: payment.subscription ? "subscription" : "recharge",
      amount: payment.value,
      status: payment.status,
      billing_type: payment.billingType || null,
      invoice_url: payment.invoiceUrl || null,
      due_date: payment.dueDate || null,
      paid_at: payment.confirmedDate ? new Date(payment.confirmedDate).toISOString() : null,
      raw: event,
      updated_at: new Date().toISOString(),
    }, { onConflict: "asaas_payment_id" });

    const isConfirmed =
      eventType === "PAYMENT_CONFIRMED" ||
      eventType === "PAYMENT_RECEIVED" ||
      eventType === "PAYMENT_RECEIVED_IN_CASH";

    const isReversed =
      eventType === "PAYMENT_REFUNDED" ||
      eventType === "PAYMENT_CHARGEBACK_REQUESTED" ||
      eventType === "PAYMENT_CHARGEBACK_DISPUTE" ||
      eventType === "PAYMENT_REVERSED";

    if (!userId) {
      return new Response(JSON.stringify({ ok: true, note: "no externalReference" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (isConfirmed) {
      // Recharge -> add bonus drops
      const dropsMap: Record<string, number> = {
        recarga_15: 15, recarga_25: 25, recarga_50: 50, recarga_100: 100, recarga_200: 200,
      };
      if (dropsMap[planCode]) {
        await supa.rpc("add_bonus_drops", { _user_id: userId, _drops: dropsMap[planCode] });
      }

      // Subscription -> activate
      const planMeta = PLAN_MAP[planCode];
      if (planMeta) {
        const cycleDays = planMeta.cycle === "yearly" ? 366 : 32;
        const expires = new Date(Date.now() + cycleDays * 24 * 60 * 60 * 1000).toISOString();

        // Deactivate any prior active subs of same user
        await supa.from("subscriptions").update({ status: "cancelled", cancelled_at: new Date().toISOString() })
          .eq("user_id", userId).eq("status", "active");

        await supa.from("subscriptions").insert({
          user_id: userId,
          plan: "pro",
          status: "active",
          plan_code: planCode,
          has_idriel: planMeta.hasIdriel,
          billing_cycle: planMeta.cycle,
          asaas_customer_id: payment.customer,
          asaas_subscription_id: payment.subscription || null,
          environment: "sandbox",
          started_at: new Date().toISOString(),
          expires_at: expires,
        });
      }
    }

    if (isReversed && payment.subscription) {
      await supa.from("subscriptions").update({ status: "cancelled", cancelled_at: new Date().toISOString() })
        .eq("asaas_subscription_id", payment.subscription);
    }

    if (eventType === "SUBSCRIPTION_DELETED" || eventType === "SUBSCRIPTION_INACTIVATED") {
      const subId = event.subscription?.id;
      if (subId) {
        await supa.from("subscriptions").update({ status: "cancelled", cancelled_at: new Date().toISOString() })
          .eq("asaas_subscription_id", subId);
      }
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("asaas-webhook error:", err?.message || err);
    return new Response(JSON.stringify({ error: err?.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
