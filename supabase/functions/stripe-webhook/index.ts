// Webhook da Stripe: ativa assinaturas, credita gotas de recarga e trata cancelamentos.
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { STRIPE_PLANS, planByPriceId, type StripePlanDef } from "../_shared/stripe-plans.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, stripe-signature",
};

const APP_ORIGIN = "https://arvoredosmundos.app";

type Supa = ReturnType<typeof createClient>;

/** Gera uma senha temporária legível e forte (letras, dígitos e um símbolo). */
function generateTempPassword(): string {
  const alpha = "abcdefghijkmnopqrstuvwxyz";
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const symbols = "!@#$%&*";
  const pick = (set: string, n: number) =>
    Array.from(crypto.getRandomValues(new Uint32Array(n)))
      .map((v) => set[v % set.length])
      .join("");
  const raw = pick(upper, 2) + pick(alpha, 6) + pick(digits, 3) + pick(symbols, 1);
  // embaralha
  const arr = raw.split("");
  const rnd = crypto.getRandomValues(new Uint32Array(arr.length));
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rnd[i] % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join("");
}

async function ensureUser(supa: Supa, email: string) {
  const { data: list } = await supa.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existing = list?.users?.find((u: any) => (u.email || "").toLowerCase() === email.toLowerCase());
  if (existing) return { userId: existing.id, isNewUser: false, tempPassword: undefined as string | undefined };
  const tempPassword = generateTempPassword();
  const { data: created, error } = await supa.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    // Nunca usamos o nome do titular do cartão — o nome é definido pelo próprio
    // usuário no primeiro encontro com Idriel.
    user_metadata: {},
  });
  if (error || !created?.user) throw new Error(`Falha ao criar usuário: ${error?.message}`);
  return { userId: created.user.id, isNewUser: true, tempPassword };
}

async function magicLink(supa: Supa, email: string) {
  const { data, error } = await supa.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${APP_ORIGIN}/` },
  });
  if (error) return undefined;
  return data?.properties?.action_link;
}

async function sendWelcomeEmail(payload: Record<string, unknown>) {
  try {
    const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-welcome-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) console.warn("welcome email failed:", res.status, await res.text());
  } catch (e) {
    console.warn("welcome email exception:", (e as Error)?.message);
  }
}

function expiresFor(cycle?: string) {
  const days = cycle === "yearly" ? 366 : 32;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supa = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  let event: Stripe.Event;
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });

  try {
    const signature = req.headers.get("stripe-signature");
    const whSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const raw = await req.text();
    if (!whSecret) return new Response("STRIPE_WEBHOOK_SECRET não configurado", { status: 500, headers: corsHeaders });
    if (!signature) return new Response("Assinatura ausente", { status: 400, headers: corsHeaders });
    event = await stripe.webhooks.constructEventAsync(raw, signature, whSecret);
  } catch (err) {
    console.error("stripe-webhook signature error:", (err as Error)?.message);
    return new Response("Invalid signature", { status: 400, headers: corsHeaders });
  }

  let logId: string | null = null;
  try {
    const { data: logRow } = await supa
      .from("webhook_events")
      .insert({
        source: "stripe",
        event_type: event.type,
        external_id: event.id,
        status: "received",
        payload: event as unknown as Record<string, unknown>,
      })
      .select("id")
      .maybeSingle();
    logId = (logRow as any)?.id ?? null;

    // ── Pagamento concluído (assinatura ou recarga) ──────────────────
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const meta = (session.metadata || {}) as Record<string, string>;
      const plan: StripePlanDef | undefined = STRIPE_PLANS[meta.plan_code || ""];
      if (!plan) throw new Error(`plan_code desconhecido: ${meta.plan_code}`);

      let userId: string | null = meta.user_id || null;
      const email = session.customer_details?.email || session.customer_email || undefined;
      let isNewUser = false;
      let tempPassword: string | undefined;

      if (!userId && email) {
        const r = await ensureUser(supa, email);
        userId = r.userId;
        isNewUser = r.isNewUser;
        tempPassword = r.tempPassword;
      }
      if (!userId) throw new Error("Não foi possível resolver o usuário do checkout");

      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
      const subscriptionId =
        typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null;

      await supa.from("asaas_payments").upsert(
        {
          user_id: userId,
          provider: "stripe",
          asaas_payment_id: session.id,
          asaas_subscription_id: subscriptionId,
          asaas_customer_id: customerId,
          plan_code: plan.code,
          kind: plan.kind,
          drops: plan.drops ?? null,
          amount: (session.amount_total ?? 0) / 100,
          status: "paid",
          billing_type: "STRIPE",
          paid_at: new Date().toISOString(),
          raw: event as unknown as Record<string, unknown>,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "asaas_payment_id" },
      );

      if (plan.kind === "recharge" && plan.drops) {
        await supa.rpc("add_bonus_drops", {
          _user_id: userId,
          _drops: plan.drops,
          _reference: `stripe:${session.id}`,
          _kind: "recharge",
        });
      }

      if (plan.kind === "subscription") {
        await supa.from("subscriptions").upsert(
          {
            user_id: userId,
            plan: "pro",
            status: "active",
            plan_code: plan.code,
            has_idriel: !!plan.hasIdriel,
            billing_cycle: plan.cycle,
            provider: "stripe",
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            environment: "production",
            started_at: new Date().toISOString(),
            expires_at: expiresFor(plan.cycle),
            cancelled_at: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );

        // Plano Criador ganha 5 gotas de cortesia apenas na primeira assinatura.
        if (!plan.hasIdriel) {
          const { count } = await supa
            .from("elixir_ledger")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("kind", "bonus_criador");
          if ((count ?? 0) === 0) {
            await supa.rpc("add_bonus_drops", {
              _user_id: userId,
              _drops: 5,
              _reference: "cortesia_criador",
              _kind: "bonus_criador",
            });
          }
        }
      }

      let mailTo = email;
      // O nome vem SEMPRE do perfil do usuário (definido por ele), nunca do
      // titular do cartão usado no pagamento.
      let mailName: string | undefined;
      {
        const { data: prof } = await supa
          .from("profiles")
          .select("display_name")
          .eq("user_id", userId)
          .maybeSingle();
        mailName = (prof as any)?.display_name || undefined;
      }
      if (!mailTo) {
        const { data: u } = await supa.auth.admin.getUserById(userId);
        mailTo = u?.user?.email ?? undefined;
      }
      if (mailTo) {
        const link = await magicLink(supa, mailTo);
        await sendWelcomeEmail({
          email: mailTo,
          name: mailName,
          planName: plan.name,
          amount: (session.amount_total ?? 0) / 100,
          isNewUser,
          tempPassword,
          magicLink: link,
          loginUrl: link || `${APP_ORIGIN}/login`,
        });
      }
    }

    // ── Renovação paga ───────────────────────────────────────────────
    if (event.type === "invoice.paid") {
      const invoice = event.data.object as Stripe.Invoice;
      const subId = typeof (invoice as any).subscription === "string"
        ? (invoice as any).subscription as string
        : (invoice as any).subscription?.id ?? null;
      const line: any = invoice.lines?.data?.[0];
      const priceId = line?.pricing?.price_details?.price ?? line?.price?.id;
      const plan = priceId ? planByPriceId(priceId) : undefined;
      if (subId && plan) {
        await supa
          .from("subscriptions")
          .update({
            status: "active",
            expires_at: expiresFor(plan.cycle),
            cancelled_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subId);
      }
    }

    // ── Cancelamento ─────────────────────────────────────────────────
    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      await supa
        .from("subscriptions")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", sub.id);
    }

    if (event.type === "customer.subscription.updated") {
      const sub = event.data.object as Stripe.Subscription;
      const status = sub.status === "active" || sub.status === "trialing" ? "active" : "cancelled";
      await supa
        .from("subscriptions")
        .update({
          status,
          cancelled_at: sub.cancel_at_period_end ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", sub.id);
    }

    if (logId) {
      await supa
        .from("webhook_events")
        .update({ status: "processed", processed_at: new Date().toISOString() })
        .eq("id", logId);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("stripe-webhook error:", msg);
    if (logId) {
      await supa
        .from("webhook_events")
        .update({ status: "failed", error_message: msg, processed_at: new Date().toISOString() })
        .eq("id", logId);
    }
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
