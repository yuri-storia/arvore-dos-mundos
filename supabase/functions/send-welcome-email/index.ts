// Envia e-mail de boas-vindas via Resend após pagamento confirmado.
// Invocado pelo asaas-webhook. Aceita magic link (novo usuário) ou só confirmação (usuário existente).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Payload {
  email: string;
  name?: string;
  planName: string;
  amount: number;
  isNewUser: boolean;
  magicLink?: string; // obrigatório se isNewUser
  loginUrl?: string;  // fallback para usuário existente
  tempPassword?: string; // senha inicial gerada para contas novas
}

function renderHtml(p: Payload): string {
  const greeting = p.name ? `Olá, ${p.name}` : "Olá, viajante";
  const cta = p.isNewUser
    ? `<a href="${p.magicLink}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#d4b27a,#8a6a3a);color:#1a0f00;text-decoration:none;border-radius:10px;font-family:Georgia,serif;font-weight:bold;letter-spacing:1px;text-transform:uppercase;font-size:13px;">Acessar minha conta</a>`
    : `<a href="${p.loginUrl}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#d4b27a,#8a6a3a);color:#1a0f00;text-decoration:none;border-radius:10px;font-family:Georgia,serif;font-weight:bold;letter-spacing:1px;text-transform:uppercase;font-size:13px;">Entrar no aplicativo</a>`;

  const intro = p.isNewUser
    ? `Sua jornada na <strong>Árvore dos Mundos</strong> começa agora. Criamos uma conta para você com este e-mail e uma <strong>senha de acesso</strong> logo abaixo. Você pode entrar pelo botão (link único, válido por 1 hora) ou usando e-mail e senha na tela de login.`
    : `Sua assinatura <strong>${p.planName}</strong> foi ativada. Já pode entrar e continuar a construir seus mundos.`;

  const credentialsBlock = p.isNewUser
    ? `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 0;background:rgba(212,178,122,0.06);border:1px solid rgba(212,178,122,0.25);border-radius:12px;">
        <tr>
          <td style="padding:18px 20px;font-size:14px;color:#e8e4d8;line-height:1.8;">
            <strong style="color:#d4b27a;letter-spacing:1px;">SEUS DADOS DE ACESSO</strong><br>
            E-mail: <strong>${p.email}</strong><br>
            ${p.tempPassword ? `Senha: <strong style="font-family:'Courier New',monospace;font-size:16px;letter-spacing:1px;color:#e8d9b8;">${p.tempPassword}</strong>` : ""}
          </td>
        </tr>
      </table>
      <p style="font-size:13px;color:#9aa0a6;line-height:1.6;margin:14px 0 0;">Por segurança, troque essa senha depois de entrar em <em>Configurações → Conta</em>. Se preferir, você também pode entrar sempre pelo link "Esqueci a senha" na tela de login.</p>`
    : "";

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Bem-vindo à Árvore dos Mundos</title>
</head>
<body style="margin:0;padding:0;background:#02070d;font-family:Georgia,'Times New Roman',serif;color:#e8e4d8;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#02070d;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:linear-gradient(180deg,#0a1420 0%,#02070d 100%);border:1px solid rgba(212,178,122,0.25);border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:36px 40px 8px;text-align:center;">
              <div style="font-family:'Cinzel',Georgia,serif;font-size:11px;letter-spacing:6px;color:#d4b27a;text-transform:uppercase;margin-bottom:8px;">A Árvore dos Mundos</div>
              <h1 style="font-family:'Cinzel',Georgia,serif;font-size:26px;color:#e8d9b8;margin:8px 0 0;font-weight:bold;letter-spacing:1px;">Bem-vindo(a)</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 40px 8px;">
              <p style="font-size:16px;line-height:1.7;color:#e8e4d8;margin:0 0 16px;">${greeting},</p>
              <p style="font-size:15px;line-height:1.75;color:#cfc8b5;margin:0 0 24px;">${intro}</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:8px 40px 24px;">
              ${cta}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 40px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top:1px solid rgba(212,178,122,0.18);padding-top:20px;">
                <tr>
                  <td style="font-size:13px;color:#9aa0a6;line-height:1.7;">
                    <strong style="color:#d4b27a;">Recibo do pagamento</strong><br>
                    Plano: ${p.planName}<br>
                    Valor: R$ ${p.amount.toFixed(2).replace(".", ",")}<br>
                    Status: <span style="color:#7dd3a0;">Confirmado</span>
                  </td>
                </tr>
              </table>
              ${credentialsBlock}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 36px;text-align:center;border-top:1px solid rgba(212,178,122,0.12);">
              <p style="font-size:12px;color:#6b7280;margin:0;line-height:1.6;">
                Dúvidas? Responda este e-mail.<br>
                <a href="https://arvoredosmundos.app" style="color:#d4b27a;text-decoration:none;">arvoredosmundos.app</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Only allow service-role callers (e.g. asaas-webhook). Reject anon/user JWTs.
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!serviceKey || token !== serviceKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const apiKey = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("RESEND_FROM") || "Árvore dos Mundos <acesso@mail.arvoredosmundos.app>";

    if (!apiKey) {
      console.warn("RESEND_API_KEY ausente — pulando envio de e-mail.");
      return new Response(JSON.stringify({ ok: false, skipped: "no_resend_key" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const p = (await req.json()) as Payload;
    if (!p?.email || !p?.planName) {
      return new Response(JSON.stringify({ error: "missing fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const html = renderHtml(p);
    const subject = p.isNewUser
      ? "Sua conta está pronta — Árvore dos Mundos"
      : "Assinatura ativada — Árvore dos Mundos";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: [p.email],
        subject,
        html,
      }),
    });

    const text = await res.text();
    if (!res.ok) {
      console.error("Resend error:", res.status, text);
      return new Response(JSON.stringify({ ok: false, error: text }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, response: text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("send-welcome-email error:", err?.message || err);
    return new Response(JSON.stringify({ error: err?.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
