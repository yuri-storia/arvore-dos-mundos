// Cria checkout hospedado no Asaas (Asaas Checkout - /v3/checkouts)
// Aceita compra com OU sem login. O Asaas coleta CPF, nome e dados de pagamento.
// Métodos aceitos: PIX e CREDIT_CARD apenas (sem boleto).
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
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // Auth é OPCIONAL. Se logado, pré-preenchemos dados; se não, Asaas coleta tudo.
    let userId: string | null = null;
    let userEmail: string = "";
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: claims } = await supa.auth.getClaims(token);
      if (claims?.claims?.sub) {
        userId = claims.claims.sub as string;
        userEmail = (claims.claims.email as string) || "";
      }
    }

    const body = await req.json().catch(() => ({}));
    const planCode = String(body.planId || body.plan || "");
    const plan = PLANS[planCode];
    if (!plan) {
      return new Response(JSON.stringify({ error: "Unknown plan", planCode }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const origin = req.headers.get("origin") || "https://arvoredosmundos.app";

    // externalReference: <userId>:<planCode>  ou  guest:<planCode>:<random>
    const externalReference = userId
      ? `${userId}:${planCode}`
      : `guest:${planCode}:${crypto.randomUUID()}`;

    // Pré-preenchimento (apenas se logado) — não bloqueia se faltar
    let customerData: Record<string, any> | undefined;
    if (userId) {
      const { data: profile } = await supa.from("profiles")
        .select("display_name, cpf_cnpj")
        .eq("user_id", userId).maybeSingle();
      customerData = {
        name: profile?.display_name || userEmail.split("@")[0] || undefined,
        email: userEmail || undefined,
        cpfCnpj: profile?.cpf_cnpj || undefined,
      };
      // remove undefined
      customerData = Object.fromEntries(
        Object.entries(customerData).filter(([, v]) => v !== undefined && v !== "")
      );
      if (Object.keys(customerData).length === 0) customerData = undefined;
    }

    // Monta payload do Asaas Checkout
    const checkoutPayload: Record<string, any> = {
      billingTypes: ["CREDIT_CARD", "PIX"],
      chargeTypes: plan.kind === "subscription" ? ["RECURRENT"] : ["DETACHED"],
      minutesToExpire: 60,
      callback: {
        successUrl: `${origin}/obrigado?ref=${encodeURIComponent(externalReference)}`,
        cancelUrl: `${origin}/planos?cancelled=1`,
        expiredUrl: `${origin}/planos?expired=1`,
      },
      items: [{
        name: `Árvore dos Mundos — ${plan.name}`,
        description: plan.kind === "subscription"
          ? `Assinatura ${plan.cycle === "YEARLY" ? "anual" : "mensal"}`
          : `Recarga avulsa de ${plan.drops} gotas`,
        value: plan.amount,
        quantity: 1,
      }],
      externalReference,
      notificationEnabled: true,
    };

    if (plan.kind === "subscription") {
      const nextDueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      checkoutPayload.subscription = {
        cycle: plan.cycle,
        nextDueDate,
      };
    }

    if (customerData) {
      checkoutPayload.customerData = customerData;
    }

    const checkout = await asaas("/checkouts", {
      method: "POST",
      body: JSON.stringify(checkoutPayload),
    });

    // Asaas retorna { id, link } (ou { id, url } dependendo da versão)
    const checkoutUrl: string = checkout.link || checkout.url || checkout.invoiceUrl;
    if (!checkoutUrl) {
      console.error("Asaas checkout sem URL:", JSON.stringify(checkout));
      throw new Error("Asaas não retornou URL de checkout");
    }

    // Log do checkout (sem payment ainda — virá pelo webhook)
    await supa.from("asaas_payments").insert({
      user_id: userId,
      asaas_payment_id: `checkout_${checkout.id}`,
      asaas_subscription_id: null,
      asaas_customer_id: null,
      plan_code: planCode,
      kind: plan.kind,
      drops: plan.drops ?? null,
      amount: plan.amount,
      status: "CHECKOUT_CREATED",
      invoice_url: checkoutUrl,
    });

    return new Response(JSON.stringify({ url: checkoutUrl, checkoutId: checkout.id }), {
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
