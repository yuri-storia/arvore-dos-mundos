// Recebe eventos do Asaas e atualiza assinaturas / saldo de gotas.
// Em PAYMENT_CONFIRMED: cria conta automaticamente se não existir (compra sem login)
// e dispara e-mail de boas-vindas com magic link.
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, asaas-access-token",
};

const PLAN_MAP: Record<string, { hasIdriel: boolean; cycle: "monthly" | "yearly"; tier: "raiz" | "idriel" | "fundador"; displayName: string; amount: number }> = {
  raiz_mensal:      { hasIdriel: false, cycle: "monthly", tier: "raiz",     displayName: "Criador Mensal",          amount: 19.90  },
  raiz_anual:       { hasIdriel: false, cycle: "yearly",  tier: "raiz",     displayName: "Criador Anual",           amount: 197.90 },
  idriel_mensal:    { hasIdriel: true,  cycle: "monthly", tier: "idriel",   displayName: "Idriel Mensal",           amount: 39.90  },
  idriel_anual:     { hasIdriel: true,  cycle: "yearly",  tier: "idriel",   displayName: "Idriel Anual",            amount: 397.90 },
  fundador_mensal:  { hasIdriel: true,  cycle: "monthly", tier: "fundador", displayName: "Membro Fundador Mensal",  amount: 19.90  },
  
};

// Upgrades: SKU avulso -> ativa Idriel + cria nova assinatura recorrente futura
const UPGRADE_MAP: Record<string, { targetPlanCode: "idriel_mensal" | "idriel_anual"; displayName: string; firstAmount: number }> = {
  upgrade_raiz_m_to_idriel_m: { targetPlanCode: "idriel_mensal", displayName: "Idriel Mensal", firstAmount:  39.90 },
  upgrade_raiz_m_to_idriel_a: { targetPlanCode: "idriel_anual",  displayName: "Idriel Anual",  firstAmount: 397.90 },
  upgrade_raiz_a_to_idriel_a: { targetPlanCode: "idriel_anual",  displayName: "Idriel Anual",  firstAmount: 397.90 },
  upgrade_raiz_a_to_idriel_m: { targetPlanCode: "idriel_mensal", displayName: "Idriel Mensal", firstAmount:  39.90 },
};

const RECHARGE_MAP: Record<string, { drops: number; displayName: string; amount: number }> = {
  recarga_15:  { drops: 15,  displayName: "15 gotas",  amount: 4.90  },
  recarga_25:  { drops: 25,  displayName: "25 gotas",  amount: 7.90  },
  recarga_50:  { drops: 50,  displayName: "50 gotas",  amount: 14.90 },
  recarga_100: { drops: 100, displayName: "100 gotas", amount: 27.90 },
  recarga_200: { drops: 200, displayName: "200 gotas", amount: 54.90 },
};

const ASAAS_BASE = "https://api.asaas.com/v3";

async function asaasFetch(path: string, init: RequestInit = {}) {
  const apiKey = Deno.env.get("ASAAS_API_KEY");
  if (!apiKey) throw new Error("ASAAS_API_KEY missing");
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
  if (!res.ok) throw new Error(`Asaas ${path} ${res.status}: ${text}`);
  return json;
}

const APP_ORIGIN = "https://arvoredosmundos.app";

async function ensureUser(
  supa: ReturnType<typeof createClient>,
  email: string,
  name?: string
): Promise<{ userId: string; isNewUser: boolean }> {
  // Procura usuário existente
  const { data: list } = await supa.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existing = list?.users?.find((u: any) => (u.email || "").toLowerCase() === email.toLowerCase());
  if (existing) return { userId: existing.id, isNewUser: false };

  // Cria usuário
  const { data: created, error: createErr } = await supa.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: name ? { display_name: name } : {},
  });
  if (createErr || !created?.user) {
    throw new Error(`Falha ao criar usuário: ${createErr?.message}`);
  }
  return { userId: created.user.id, isNewUser: true };
}

async function generateMagicLink(supa: ReturnType<typeof createClient>, email: string): Promise<string | undefined> {
  const { data, error } = await supa.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${APP_ORIGIN}/` },
  });
  if (error) {
    console.warn("generateLink failed:", error.message);
    return undefined;
  }
  return data?.properties?.action_link;
}

async function sendWelcomeEmail(payload: {
  email: string; name?: string; planName: string; amount: number;
  isNewUser: boolean; magicLink?: string; loginUrl?: string;
}) {
  try {
    const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-welcome-email`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) console.warn("welcome email failed:", res.status, await res.text());
  } catch (e: any) {
    console.warn("welcome email exception:", e?.message);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Observabilidade: registramos um evento mesmo antes de processar para
  // garantir que nenhum webhook fique "invisível" em caso de exceção.
  let logSupa: ReturnType<typeof createClient> | null = null;
  let webhookLogId: string | null = null;
  let rawPayload: any = null;

  try {
    const expectedToken = Deno.env.get("ASAAS_WEBHOOK_TOKEN");
    if (!expectedToken) {
      console.error("ASAAS_WEBHOOK_TOKEN not configured");
      return new Response("Server misconfigured", { status: 500, headers: corsHeaders });
    }
    const got = req.headers.get("asaas-access-token");
    if (got !== expectedToken) {
      console.warn("webhook: invalid token");
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );
    logSupa = supa;

    const event = await req.json();
    rawPayload = event;
    const eventType: string = event.event || "";
    const payment = event.payment;

    // Log inicial — status "received"
    try {
      const { data: logged } = await supa.from("webhook_events").insert({
        source: "asaas",
        event_type: eventType || "unknown",
        external_id: payment?.id || event?.subscription?.id || null,
        status: "received",
        payload: event,
      }).select("id").maybeSingle();
      webhookLogId = logged?.id ?? null;
    } catch (e) { console.warn("webhook_events insert failed:", e); }


    // Subscription lifecycle (sem payment)
    if (eventType.startsWith("SUBSCRIPTION_")) {
      const sub = event.subscription;
      if (sub?.id) {
        if (eventType === "SUBSCRIPTION_DELETED" || eventType === "SUBSCRIPTION_INACTIVATED") {
          await supa.from("subscriptions").update({ status: "cancelled", cancelled_at: new Date().toISOString() })
            .eq("asaas_subscription_id", sub.id);
        }
      }
      return new Response(JSON.stringify({ ok: true, kind: "subscription_event" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!payment) {
      return new Response(JSON.stringify({ ok: true, ignored: "no payment" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // externalReference: "<userId>:<planCode>" OU "guest:<planCode>:<uuid>"
    const externalRef: string = payment.externalReference || "";
    const parts = externalRef.split(":");
    let userId: string | null = null;
    let planCode: string = "";
    let isGuest = false;
    if (parts[0] === "guest") {
      isGuest = true;
      planCode = parts[1] || "";
    } else {
      userId = parts[0] || null;
      planCode = parts[1] || "";
    }

    // Sempre upsert do pagamento
    await supa.from("asaas_payments").upsert({
      user_id: userId,
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

    if (isConfirmed) {
      // Se for guest, busca dados do cliente no Asaas para obter o e-mail
      let payerEmail: string | undefined;
      let payerName: string | undefined;
      if (isGuest || !userId) {
        try {
          const apiKey = Deno.env.get("ASAAS_API_KEY")!;
          const custRes = await fetch(`https://api.asaas.com/v3/customers/${payment.customer}`, {
            headers: { access_token: apiKey, "User-Agent": "ArvoreDosMundos/1.0" },
          });
          if (custRes.ok) {
            const cust = await custRes.json();
            payerEmail = cust.email;
            payerName = cust.name;
          }
        } catch (e) { console.warn("fetch customer failed:", e); }

        if (payerEmail) {
          const { userId: createdId } = await ensureUser(supa, payerEmail, payerName);
          userId = createdId;
          // Atualiza asaas_payments com o user_id resolvido
          await supa.from("asaas_payments").update({ user_id: userId }).eq("asaas_payment_id", payment.id);
        }
      }

      if (!userId) {
        console.warn("PAYMENT_CONFIRMED sem userId resolvível:", payment.id);
        return new Response(JSON.stringify({ ok: true, note: "no user resolved" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Vincula customer
      await supa.from("asaas_customers").upsert({
        user_id: userId,
        asaas_customer_id: payment.customer,
        environment: "production",
        updated_at: new Date().toISOString(),
      });

      // Recharge
      const recharge = RECHARGE_MAP[planCode];
      if (recharge) {
        await supa.rpc("add_bonus_drops", { _user_id: userId, _drops: recharge.drops });
      }


      // Subscription
      const planMeta = PLAN_MAP[planCode];
      if (planMeta) {
        if (planMeta.hasIdriel && payment.subscription) {
          const { data: currentSub } = await supa
            .from("subscriptions")
            .select("asaas_subscription_id, plan_code")
            .eq("user_id", userId)
            .eq("status", "active")
            .maybeSingle();

          if (
            currentSub?.asaas_subscription_id &&
            currentSub.asaas_subscription_id !== payment.subscription &&
            typeof currentSub.plan_code === "string" &&
            currentSub.plan_code.startsWith("raiz_")
          ) {
            try {
              await asaasFetch(`/subscriptions/${currentSub.asaas_subscription_id}`, { method: "DELETE" });
            } catch (e: any) {
              console.warn("cancel previous creator sub failed:", e?.message);
            }
          }
        }

        const cycleDays = planMeta.cycle === "yearly" ? 366 : 32;
        const expires = new Date(Date.now() + cycleDays * 24 * 60 * 60 * 1000).toISOString();
        const { error: upsertErr } = await supa.from("subscriptions").upsert({
          user_id: userId,
          plan: "pro",
          status: "active",
          plan_code: planCode,
          has_idriel: planMeta.hasIdriel,
          billing_cycle: planMeta.cycle,
          asaas_customer_id: payment.customer,
          asaas_subscription_id: payment.subscription || null,
          environment: "production",
          started_at: new Date().toISOString(),
          expires_at: expires,
          cancelled_at: null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
        if (upsertErr) console.error("subscription upsert error:", upsertErr);

        // Membro Fundador mensal: após as 3 primeiras cobranças confirmadas a
        // recorrência passa automaticamente para o preço cheio da Idriel.
        if (planCode === "fundador_mensal" && payment.subscription) {
          const { count } = await supa
            .from("asaas_payments")
            .select("id", { count: "exact", head: true })
            .eq("asaas_subscription_id", payment.subscription)
            .eq("plan_code", "fundador_mensal")
            .in("status", ["CONFIRMED", "RECEIVED", "paid", "PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]);
          if ((count ?? 0) >= 3) {
            try {
              await asaasFetch(`/subscriptions/${payment.subscription}`, {
                method: "PUT",
                body: JSON.stringify({ value: 39.90 }),
              });
            } catch (e: any) { console.warn("founder monthly price update failed:", e?.message); }
          }
        }
      }

      // Upgrade flow: o checkout já cria a recorrência do plano Idriel pago.
      // Aqui cancelamos a assinatura Criador anterior e vinculamos a assinatura
      // recém-paga ao plano Idriel, evitando recorrência duplicada.
      const upgrade = UPGRADE_MAP[planCode];
      if (upgrade) {
        try {
          // 1. Busca assinatura atual ativa
          const { data: currentSub } = await supa
            .from("subscriptions")
            .select("asaas_subscription_id, expires_at, plan_code, billing_cycle")
            .eq("user_id", userId)
            .eq("status", "active")
            .maybeSingle();

          // 2. Cancela a assinatura Criador antiga no Asaas (se houver)
          if (currentSub?.asaas_subscription_id && currentSub.asaas_subscription_id !== payment.subscription) {
            try {
              await asaasFetch(`/subscriptions/${currentSub.asaas_subscription_id}`, { method: "DELETE" });
            } catch (e: any) { console.warn("cancel old sub failed:", e?.message); }
          }

          // 3. Upsert da subscriptions com Idriel ativo
          const targetMeta = PLAN_MAP[upgrade.targetPlanCode];
          const cycleDays = targetMeta.cycle === "yearly" ? 366 : 32;
          const expires = new Date(Date.now() + cycleDays * 24 * 60 * 60 * 1000).toISOString();
          await supa.from("subscriptions").upsert({
            user_id: userId,
            plan: "pro",
            status: "active",
            plan_code: upgrade.targetPlanCode,
            has_idriel: true,
            billing_cycle: targetMeta.cycle,
            asaas_customer_id: payment.customer,
            asaas_subscription_id: payment.subscription || null,
            environment: "production",
            started_at: new Date().toISOString(),
            expires_at: expires,
            cancelled_at: null,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });
        } catch (e: any) {
          console.error("upgrade flow error:", e?.message);
        }
      }

      // Envia e-mail de boas-vindas (apenas se identificarmos o email)
      // Busca o e-mail do auth.users se ainda não temos
      let emailForMail = payerEmail;
      let nameForMail = payerName;
      if (!emailForMail) {
        const { data: u } = await supa.auth.admin.getUserById(userId);
        emailForMail = u?.user?.email;
        nameForMail = (u?.user?.user_metadata as any)?.display_name;
      }

      if (emailForMail) {
        // Sempre gera magic link — funciona tanto para novo quanto para existente
        const magicLink = await generateMagicLink(supa, emailForMail);
        const planInfo = planMeta || recharge || (upgrade ? { displayName: upgrade.displayName, amount: upgrade.firstAmount } : undefined);
        await sendWelcomeEmail({
          email: emailForMail,
          name: nameForMail,
          planName: planInfo?.displayName || planCode,
          amount: planInfo?.amount || payment.value,
          isNewUser: isGuest, // guest = novo usuário criado agora
          magicLink,
          loginUrl: magicLink || `${APP_ORIGIN}/login`,
        });
      }
    }

    if (isReversed && payment.subscription) {
      await supa.from("subscriptions").update({ status: "cancelled", cancelled_at: new Date().toISOString() })
        .eq("asaas_subscription_id", payment.subscription);
    }

    // Marca evento como processado
    if (webhookLogId) {
      try {
        await supa.from("webhook_events")
          .update({ status: "processed", processed_at: new Date().toISOString() })
          .eq("id", webhookLogId);
      } catch (e) { console.warn("webhook_events update failed:", e); }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    const msg = err?.message || String(err);
    console.error("asaas-webhook error:", msg);

    // Registra falha para auditoria/replay manual no painel admin
    if (logSupa) {
      try {
        if (webhookLogId) {
          await logSupa.from("webhook_events")
            .update({ status: "failed", error_message: msg, processed_at: new Date().toISOString() })
            .eq("id", webhookLogId);
        } else {
          await logSupa.from("webhook_events").insert({
            source: "asaas",
            event_type: "exception",
            status: "failed",
            error_message: msg,
            payload: rawPayload ?? {},
          });
        }
      } catch (e) { console.warn("webhook_events failure log failed:", e); }
    }

    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
