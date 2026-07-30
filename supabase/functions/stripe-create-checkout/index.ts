// Cria uma sessão de Checkout na Stripe (assinaturas e recargas de gotas).
// Assinaturas podem ser compradas com ou sem login (a conta é criada no webhook).
// Recargas de Elixir exigem login E assinatura Idriel ativa.
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { STRIPE_PLANS } from "../_shared/stripe-plans.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_ORIGINS = new Set([
  "https://arvoredosmundos.app",
  "https://www.arvoredosmundos.app",
  "https://arvore-dos-mundos.lovable.app",
]);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

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

    // Login é opcional para assinaturas, obrigatório para recargas.
    let userId: string | null = null;
    let userEmail = "";
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const { data: claims } = await supa.auth.getClaims(authHeader.replace("Bearer ", ""));
      if (claims?.claims?.sub) {
        userId = claims.claims.sub as string;
        userEmail = (claims.claims.email as string) || "";
      }
    }

    const body = await req.json().catch(() => ({}));
    const planCode = String(body.planId || body.plan || "");
    const inviteToken = String(body.invite || "");
    const plan = STRIPE_PLANS[planCode];
    if (!plan) return json({ error: "Plano desconhecido", planCode }, 400);

    if (plan.inviteOnly && inviteToken !== "arvore-fundador-2026") {
      return json({ error: "Este plano é exclusivo por convite." }, 403);
    }

    // Recargas: exigem login e plano Idriel ativo
    if (plan.kind === "recharge") {
      if (!userId) return json({ error: "Faça login para comprar recargas." }, 401);
      const { data: sub } = await supa
        .from("subscriptions")
        .select("has_idriel, status, expires_at")
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();
      const { data: adm } = await supa
        .from("admin_users").select("user_id").eq("user_id", userId).maybeSingle();
      const active = !!sub?.has_idriel && (!sub.expires_at || new Date(sub.expires_at) > new Date());
      if (!active && !adm) {
        return json({ error: "Recargas de Elixir são exclusivas para assinantes do plano Idriel." }, 403);
      }
    }

    const reqOrigin = req.headers.get("origin") || "";
    const origin = ALLOWED_ORIGINS.has(reqOrigin) ? reqOrigin : "https://arvoredosmundos.app";

    // Reaproveita o customer da Stripe quando já existir
    let customerId: string | undefined;
    if (userEmail) {
      const found = await stripe.customers.list({ email: userEmail, limit: 1 });
      if (found.data.length > 0) customerId = found.data[0].id;
    }

    const metadata: Record<string, string> = {
      plan_code: plan.code,
      kind: plan.kind,
      drops: String(plan.drops ?? ""),
      user_id: userId ?? "",
    };

    const session = await stripe.checkout.sessions.create({
      mode: plan.kind === "subscription" ? "subscription" : "payment",
      customer: customerId,
      customer_email: customerId ? undefined : (userEmail || undefined),
      line_items: [{ price: plan.priceId, quantity: 1 }],
      ...(plan.couponId ? { discounts: [{ coupon: plan.couponId }] } : {}),
      success_url: `${origin}/obrigado?session_id={CHECKOUT_SESSION_ID}&plano=${encodeURIComponent(plan.code)}`,
      cancel_url: `${origin}/planos?cancelled=1`,
      metadata,
      ...(plan.kind === "subscription"
        ? { subscription_data: { metadata } }
        : { payment_intent_data: { metadata } }),
      locale: "pt-BR",
      allow_promotion_codes: plan.couponId ? undefined : true,
    });

    // Log inicial (o webhook confirma depois)
    await supa.from("asaas_payments").insert({
      user_id: userId,
      provider: "stripe",
      asaas_payment_id: `checkout_${session.id}`,
      asaas_customer_id: customerId ?? null,
      plan_code: plan.code,
      kind: plan.kind,
      drops: plan.drops ?? null,
      amount: plan.amount,
      status: "CHECKOUT_CREATED",
      invoice_url: session.url,
    });

    return json({ url: session.url, sessionId: session.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("stripe-create-checkout error:", msg);
    return json({ error: msg }, 500);
  }
});
