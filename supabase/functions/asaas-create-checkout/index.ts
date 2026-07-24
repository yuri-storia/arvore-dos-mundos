// Cria checkout hospedado no Asaas (Asaas Checkout - /v3/checkouts)
// Aceita compra com OU sem login. O Asaas coleta CPF, nome e dados de pagamento.
// Métodos aceitos: PIX e CREDIT_CARD apenas (sem boleto).
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ASAAS_BASE = "https://api.asaas.com/v3";

type PlanDef = {
  name: string;
  amount: number;
  kind: "subscription" | "recharge" | "upgrade";
  cycle?: "MONTHLY" | "YEARLY";
  drops?: number;
  hasIdriel?: boolean;
};

const PLANS: Record<string, PlanDef> = {
  raiz_mensal:   { name: "Criador - Mensal",   amount: 19.90,  kind: "subscription", cycle: "MONTHLY", hasIdriel: false },
  raiz_anual:    { name: "Criador - Anual",    amount: 197.90, kind: "subscription", cycle: "YEARLY",  hasIdriel: false },
  idriel_mensal: { name: "Idriel - Mensal",    amount: 39.90,  kind: "subscription", cycle: "MONTHLY", hasIdriel: true  },
  idriel_anual:  { name: "Idriel - Anual",     amount: 397.90, kind: "subscription", cycle: "YEARLY",  hasIdriel: true  },
  // Convite Fundador — R$ 19,90/mês por 3 meses, depois R$ 39,90/mês (ajuste manual/fluxo dedicado)
  fundador_mensal: { name: "Fundador - Mensal", amount: 19.90,  kind: "subscription", cycle: "MONTHLY", hasIdriel: true },
  fundador_anual:  { name: "Fundador - Anual",  amount: 397.90, kind: "subscription", cycle: "YEARLY",  hasIdriel: true },
  recarga_15:    { name: "15 gotas de Elixir",  amount:  4.90, kind: "recharge", drops:  15 },
  recarga_25:    { name: "25 gotas de Elixir",  amount:  7.90, kind: "recharge", drops:  25 },
  recarga_50:    { name: "50 gotas de Elixir",  amount: 14.90, kind: "recharge", drops:  50 },
  recarga_100:   { name: "100 gotas de Elixir", amount: 27.90, kind: "recharge", drops: 100 },
  recarga_200:   { name: "200 gotas de Elixir", amount: 54.90, kind: "recharge", drops: 200 },
  // Upgrades — sempre exigem login (validado abaixo). Criam nova assinatura Idriel
  // com o valor cheio do plano de destino; a assinatura anterior é substituída pelo webhook.
  upgrade_raiz_m_to_idriel_m: { name: "Idriel - Mensal",  amount:  39.90, kind: "upgrade", cycle: "MONTHLY", hasIdriel: true },
  upgrade_raiz_m_to_idriel_a: { name: "Idriel - Anual",   amount: 397.90, kind: "upgrade", cycle: "YEARLY",  hasIdriel: true },
  upgrade_raiz_a_to_idriel_a: { name: "Idriel - Anual",   amount: 397.90, kind: "upgrade", cycle: "YEARLY",  hasIdriel: true },
  upgrade_raiz_a_to_idriel_m: { name: "Idriel - Mensal",  amount:  39.90, kind: "upgrade", cycle: "MONTHLY", hasIdriel: true },
};

const UPGRADE_REQUIREMENT: Record<string, string[]> = {
  upgrade_raiz_m_to_idriel_m: ["raiz_mensal"],
  upgrade_raiz_m_to_idriel_a: ["raiz_mensal"],
  upgrade_raiz_a_to_idriel_a: ["raiz_anual"],
  upgrade_raiz_a_to_idriel_m: ["raiz_anual"],
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

    // Upgrades exigem login + plano atual compatível
    if (plan.kind === "upgrade") {
      if (!userId) {
        return new Response(JSON.stringify({ error: "Login obrigatório para upgrade" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const required = UPGRADE_REQUIREMENT[planCode] || [];
      const { data: currentSub } = await supa
        .from("subscriptions")
        .select("plan_code, status")
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();
      if (!currentSub || !required.includes(currentSub.plan_code)) {
        return new Response(JSON.stringify({
          error: "Upgrade indisponível para seu plano atual",
          current: currentSub?.plan_code || null,
          required,
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }




    const ALLOWED_ORIGINS = new Set(["https://arvoredosmundos.app", "https://www.arvoredosmundos.app"]);
    const reqOrigin = req.headers.get("origin") || "";
    const origin = ALLOWED_ORIGINS.has(reqOrigin) ? reqOrigin : "https://arvoredosmundos.app";

    // externalReference: <userId>:<planCode>  ou  guest:<planCode>:<random>
    const externalReference = userId
      ? `${userId}:${planCode}`
      : `guest:${planCode}:${crypto.randomUUID()}`;

    // Não enviamos customerData — o Asaas Checkout exige TODOS os campos quando presente.
    const isSubscription = plan.kind === "subscription";
    const isUpgrade = plan.kind === "upgrade";
    // Upgrades entram como assinatura recorrente do plano de destino (Idriel)
    const asRecurring = isSubscription || isUpgrade;
    const itemName = (`AdM — ${plan.name}`).slice(0, 30); // máx 30 chars
    const description = asRecurring
      ? `Assinatura ${plan.cycle === "YEARLY" ? "anual" : "mensal"} — ${plan.name}`
      : `Recarga avulsa de ${plan.drops} gotas`;

    const checkoutPayload: Record<string, any> = {
      billingTypes: asRecurring ? ["CREDIT_CARD"] : ["CREDIT_CARD", "PIX"],
      chargeTypes: asRecurring ? ["RECURRENT"] : ["DETACHED"],
      minutesToExpire: 60,
      callback: {
        successUrl: `${origin}/obrigado?ref=${encodeURIComponent(externalReference)}`,
        cancelUrl: `${origin}/planos?cancelled=1`,
        expiredUrl: `${origin}/planos?expired=1`,
      },
      items: [{
        name: itemName,
        description,
        value: plan.amount,
        quantity: 1,
      }],
      externalReference,
      notificationEnabled: true,
    };

    if (asRecurring) {
      const nextDueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      checkoutPayload.subscription = {
        cycle: plan.cycle,
        nextDueDate,
      };
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
