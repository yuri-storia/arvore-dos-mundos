// Varre subscriptions Beta/manual/free e dispara avisos de expiração via Resend.
// Disparado por pg_cron diariamente. Idempotente — registra envios em expiration_notifications_sent.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type NotifType = "T-7" | "T-1" | "T+0";

function planLabel(planCode: string | null, billingCycle: string | null): string {
  if (billingCycle === "BETA_FREE") return "Beta da Comunidade";
  if (planCode === "idriel") return "Idriel";
  if (planCode === "template") return "Raiz";
  return "Árvore dos Mundos";
}

function renderHtml(opts: { name?: string; planName: string; daysLeft: number; expired: boolean; renewUrl: string }): string {
  const greeting = opts.name ? `Olá, ${opts.name}` : "Olá, viajante";
  const title = opts.expired
    ? `Seu acesso ${opts.planName} expirou`
    : opts.daysLeft === 1
      ? `Seu acesso ${opts.planName} expira amanhã`
      : `Seu acesso ${opts.planName} expira em ${opts.daysLeft} dias`;
  const intro = opts.expired
    ? `Seu período de acesso terminou. Para continuar construindo seus mundos, escolha um plano e retome de onde parou. Nada é cobrado automaticamente — a cobrança só acontece quando você confirma o pagamento.`
    : `Seu período de acesso está chegando ao fim. Para evitar interrupção, renove escolhendo um plano antes do término. Nada é cobrado automaticamente — você só paga quando confirmar.`;

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#02070d;font-family:Georgia,'Times New Roman',serif;color:#e8e4d8;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#02070d;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:linear-gradient(180deg,#0a1420 0%,#02070d 100%);border:1px solid rgba(212,178,122,0.25);border-radius:16px;overflow:hidden;">
        <tr><td style="padding:36px 40px 8px;text-align:center;">
          <div style="font-family:'Cinzel',Georgia,serif;font-size:11px;letter-spacing:6px;color:#d4b27a;text-transform:uppercase;margin-bottom:8px;">A Árvore dos Mundos</div>
          <h1 style="font-family:'Cinzel',Georgia,serif;font-size:24px;color:#e8d9b8;margin:8px 0 0;font-weight:bold;letter-spacing:1px;">${title}</h1>
        </td></tr>
        <tr><td style="padding:28px 40px 8px;">
          <p style="font-size:16px;line-height:1.7;color:#e8e4d8;margin:0 0 16px;">${greeting},</p>
          <p style="font-size:15px;line-height:1.75;color:#cfc8b5;margin:0 0 24px;">${intro}</p>
        </td></tr>
        <tr><td align="center" style="padding:8px 40px 24px;">
          <a href="${opts.renewUrl}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#d4b27a,#8a6a3a);color:#1a0f00;text-decoration:none;border-radius:10px;font-family:Georgia,serif;font-weight:bold;letter-spacing:1px;text-transform:uppercase;font-size:13px;">Ver planos e renovar</a>
        </td></tr>
        <tr><td style="padding:24px 40px 36px;text-align:center;border-top:1px solid rgba(212,178,122,0.12);">
          <p style="font-size:12px;color:#6b7280;margin:0;line-height:1.6;">Dúvidas? Responda este e-mail.<br><a href="https://arvoredosmundos.app" style="color:#d4b27a;text-decoration:none;">arvoredosmundos.app</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

async function sendEmail(to: string, subject: string, html: string): Promise<{ ok: boolean; error?: string }> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("RESEND_FROM") || "Árvore dos Mundos <acesso@mail.arvoredosmundos.app>";
  if (!apiKey) return { ok: false, error: "no_resend_key" };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  if (!res.ok) return { ok: false, error: await res.text() };
  return { ok: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

  // Auth: only callers presenting the service_role JWT may trigger this
  // (used by pg_cron job; blocks unauthenticated external invocations).
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const authClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: claims, error: claimsErr } = await authClient.auth.getClaims(token);
  if (claimsErr || claims?.claims?.role !== "service_role") {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const supabase = createClient(supabaseUrl, serviceKey);

  // Window: scan subs expiring within next 8 days OR expired within last 1 day
  const now = new Date();
  const upperBound = new Date(now.getTime() + 8 * 86400000).toISOString();
  const lowerBound = new Date(now.getTime() - 1 * 86400000).toISOString();

  const { data: subs, error } = await supabase
    .from("subscriptions")
    .select("id, user_id, plan_code, billing_cycle, expires_at, status")
    .eq("status", "active")
    .in("billing_cycle", ["BETA_FREE", "manual", "monthly", "annual"])
    .gte("expires_at", lowerBound)
    .lte("expires_at", upperBound);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let processed = 0, sent = 0, skipped = 0, failed = 0;
  const renewUrl = "https://arvoredosmundos.app/planos";

  for (const sub of subs || []) {
    processed++;
    if (!sub.expires_at) continue;
    const expiresAt = new Date(sub.expires_at);
    const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / 86400000);

    let type: NotifType | null = null;
    if (daysLeft === 7) type = "T-7";
    else if (daysLeft === 1) type = "T-1";
    else if (daysLeft <= 0 && daysLeft >= -1) type = "T+0";
    if (!type) { skipped++; continue; }

    // Idempotency: skip if already sent for this (sub, type, expires_at)
    const { data: existing } = await supabase
      .from("expiration_notifications_sent")
      .select("id")
      .eq("subscription_id", sub.id)
      .eq("notification_type", type)
      .eq("expires_at", sub.expires_at)
      .maybeSingle();
    if (existing) { skipped++; continue; }

    // Fetch user email + name
    const { data: userResp } = await supabase.auth.admin.getUserById(sub.user_id);
    const email = userResp?.user?.email;
    if (!email) { skipped++; continue; }
    const { data: profile } = await supabase
      .from("profiles").select("display_name").eq("user_id", sub.user_id).maybeSingle();

    const planName = planLabel(sub.plan_code, sub.billing_cycle);
    const expired = type === "T+0";
    const subject = expired
      ? `Seu acesso ${planName} expirou`
      : type === "T-1"
        ? `Seu acesso ${planName} expira amanhã`
        : `Seu acesso ${planName} expira em ${daysLeft} dias`;
    const html = renderHtml({
      name: profile?.display_name || undefined,
      planName, daysLeft: Math.max(daysLeft, 0), expired, renewUrl,
    });

    const result = await sendEmail(email, subject, html);
    if (!result.ok) {
      failed++;
      console.error("send fail", sub.id, result.error);
      continue;
    }

    await supabase.from("expiration_notifications_sent").insert({
      user_id: sub.user_id,
      subscription_id: sub.id,
      notification_type: type,
      expires_at: sub.expires_at,
    });
    sent++;
  }

  return new Response(JSON.stringify({ ok: true, processed, sent, skipped, failed }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
