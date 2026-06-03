// Cria cobrança (assinatura ou avulsa) no Asaas e devolve invoiceUrl
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ASAAS_BASE = "https://api-sandbox.asaas.com/v3";

type PlanDef = {
  name: string;
  amount: number;
  kind: "subscription" | "recharge";
  cycle?: "MONTHLY" | "YEARLY";
  drops?: number;
  hasIdriel?: boolean;
};

const PLANS: Record<string, PlanDef> = {
  raiz_mensal:   { name: "Raiz - Mensal",   amount: 19.90, kind: "subscription", cycle: "MONTHLY", hasIdriel: false },
  raiz_anual:    { name: "Raiz - Anual",    amount: 197.00, kind: "subscription", cycle: "YEARLY",  hasIdriel: false },
  idriel_mensal: { name: "Idriel - Mensal", amount: 39.90, kind: "subscription", cycle: "MONTHLY", hasIdriel: true  },
  idriel_anual:  { name: "Idriel - Anual",  amount: 397.00, kind: "subscription", cycle: "YEARLY",  hasIdriel: true  },
  recarga_15:    { name: "15 gotas de Elixir",  amount:  4.90, kind: "recharge", drops:  15 },
  recarga_25:    { name: "25 gotas de Elixir",  amount:  7.90, kind: "recharge", drops:  25 },
  recarga_50:    { name: "50 gotas de Elixir",  amount: 14.90, kind: "recharge", drops:  50 },
  recarga_100:   { name: "100 gotas de Elixir", amount: 27.90, kind: "recharge", drops: 100 },
  recarga_200:   { name: "200 gotas de Elixir", amount: 54.90, kind: "recharge", drops: 200 },
};

async function asaas(path: string, init: RequestInit = {}) {
  const apiKey = Deno.env.get("ASAAS_API_KEY");
  if (!apiKey) throw new Error("ASAAS_API_KEY not configured");
  const res = await fetch(`${ASAAS_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "ArvoreDosMundos/1.0",
      access_token: apiKey,
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch {}
  if (!res.ok) {
    throw new Error(`Asaas ${path} ${res.status}: ${text}`);
  }
  return json;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const token = authHeader.replace("Bearer ", "");

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const { data: claims, error: claimErr } = await supa.auth.getClaims(token);
    if (claimErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claims.claims.sub as string;
    const userEmail = (claims.claims.email as string) || "";

    const body = await req.json().catch(() => ({}));
    const planCode = String(body.planId || body.plan || "");
    const cpfFromBody = String(body.cpfCnpj || "").replace(/\D/g, "");
    const plan = PLANS[planCode];
    if (!plan) {
      return new Response(JSON.stringify({ error: "Unknown plan", planCode }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Pull profile (display_name + cpf_cnpj)
    const { data: profile } = await supa.from("profiles")
      .select("display_name, cpf_cnpj")
      .eq("user_id", userId)
      .maybeSingle();

    // Resolve CPF: body wins (just collected from user), otherwise profile
    let cpfCnpj = (cpfFromBody || (profile?.cpf_cnpj || "")).replace(/\D/g, "");
    if (!cpfCnpj || (cpfCnpj.length !== 11 && cpfCnpj.length !== 14)) {
      return new Response(JSON.stringify({
        error: "cpf_required",
        message: "CPF ou CNPJ é obrigatório para emitir cobranças no Brasil.",
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Persist CPF on profile if it came from body
    if (cpfFromBody && cpfFromBody !== (profile?.cpf_cnpj || "")) {
      await supa.from("profiles").update({ cpf_cnpj: cpfCnpj }).eq("user_id", userId);
    }

    // Get or create asaas customer
    let customerId: string | null = null;
    const { data: existing } = await supa.from("asaas_customers").select("asaas_customer_id").eq("user_id", userId).maybeSingle();
    const displayName = profile?.display_name || userEmail.split("@")[0] || "Usuário";

    if (existing?.asaas_customer_id) {
      customerId = existing.asaas_customer_id;
      // Ensure CPF is set on the Asaas customer record (idempotent)
      await asaas(`/customers/${customerId}`, {
        method: "POST",
        body: JSON.stringify({ cpfCnpj, name: displayName, email: userEmail }),
      }).catch((e) => console.warn("update customer cpf:", e?.message));
    } else {
      const created = await asaas("/customers", {
        method: "POST",
        body: JSON.stringify({
          name: displayName,
          email: userEmail,
          cpfCnpj,
          externalReference: userId,
        }),
      });
      customerId = created.id;
      await supa.from("asaas_customers").upsert({
        user_id: userId,
        asaas_customer_id: customerId,
        environment: "sandbox",
        updated_at: new Date().toISOString(),
      });
    }


    const origin = req.headers.get("origin") || "https://arvoredosmundos.app";

    // Create payment (subscription or one-off)
    let invoiceUrl: string;
    let asaasPaymentId: string;
    let asaasSubscriptionId: string | null = null;
    let dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    if (plan.kind === "subscription") {
      const sub = await asaas("/subscriptions", {
        method: "POST",
        body: JSON.stringify({
          customer: customerId,
          billingType: "UNDEFINED", // user chooses PIX, boleto or credit card
          value: plan.amount,
          nextDueDate: dueDate,
          cycle: plan.cycle,
          description: `Árvore dos Mundos — ${plan.name}`,
          externalReference: `${userId}:${planCode}`,
        }),
      });
      asaasSubscriptionId = sub.id;
      // Fetch first payment to get invoice URL
      const payments = await asaas(`/subscriptions/${sub.id}/payments`);
      const first = payments?.data?.[0];
      if (!first) throw new Error("Subscription created but no payment generated yet");
      asaasPaymentId = first.id;
      invoiceUrl = first.invoiceUrl;
    } else {
      const payment = await asaas("/payments", {
        method: "POST",
        body: JSON.stringify({
          customer: customerId,
          billingType: "UNDEFINED",
          value: plan.amount,
          dueDate,
          description: `Árvore dos Mundos — ${plan.name}`,
          externalReference: `${userId}:${planCode}`,
        }),
      });
      asaasPaymentId = payment.id;
      invoiceUrl = payment.invoiceUrl;
    }

    // Log payment row
    await supa.from("asaas_payments").insert({
      user_id: userId,
      asaas_payment_id: asaasPaymentId,
      asaas_subscription_id: asaasSubscriptionId,
      asaas_customer_id: customerId,
      plan_code: planCode,
      kind: plan.kind,
      drops: plan.drops ?? null,
      amount: plan.amount,
      status: "PENDING",
      due_date: dueDate,
      invoice_url: invoiceUrl,
    });

    return new Response(JSON.stringify({ url: invoiceUrl, paymentId: asaasPaymentId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("create-checkout error:", err?.message || err);
    return new Response(JSON.stringify({ error: err?.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
