// Resgata um código beta: concede 1 mês de Raiz grátis e habilita 3 cobranças
// avulsas de Idriel a R$19,90 nos próximos 4 meses.
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Login obrigatório" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: claims } = await supa.auth.getClaims(token);
    const userId = claims?.claims?.sub as string | undefined;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const code = String(body.code || "").trim().toUpperCase();
    if (!code || code.length > 64) {
      return new Response(JSON.stringify({ error: "Código inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Já resgatou?
    const { data: existing } = await supa
      .from("beta_redemptions")
      .select("id, code, raiz_granted_until, idriel_discount_until")
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({
        ok: true,
        already: true,
        raiz_granted_until: existing.raiz_granted_until,
        idriel_discount_until: existing.idriel_discount_until,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Validar código
    const { data: beta } = await supa
      .from("beta_codes")
      .select("*")
      .eq("code", code)
      .maybeSingle();
    if (!beta || !beta.active) {
      return new Response(JSON.stringify({ error: "Código inexistente ou desativado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (beta.expires_at && new Date(beta.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Código expirado" }), {
        status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (beta.uses_count >= beta.max_uses) {
      return new Response(JSON.stringify({ error: "Código esgotado" }), {
        status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = Date.now();
    const raizUntil = new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString();
    // Janela curta de resgate: 7 dias após o fim do Raiz para garantir Idriel a R$ 19,90/mês x 3.
    const idrielDiscountUntil = new Date(now + 37 * 24 * 60 * 60 * 1000).toISOString();

    // Cria/atualiza assinatura Raiz beta
    await supa.from("subscriptions").insert({
      user_id: userId,
      plan_code: "raiz_mensal",
      plan: "template",
      has_idriel: false,
      billing_cycle: "BETA_FREE",
      status: "active",
      started_at: new Date().toISOString(),
      expires_at: raizUntil,
      asaas_subscription_id: `beta_${code}_${userId}`,
    });

    await supa.from("beta_redemptions").insert({
      user_id: userId,
      code,
      raiz_granted_until: raizUntil,
      idriel_discount_until: idrielDiscountUntil,
      idriel_charges_used: 0,
    });

    await supa.from("beta_codes")
      .update({ uses_count: beta.uses_count + 1 })
      .eq("id", beta.id);

    return new Response(JSON.stringify({
      ok: true,
      raiz_granted_until: raizUntil,
      idriel_discount_until: idrielDiscountUntil,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("redeem-beta-code error:", err?.message || err);
    return new Response(JSON.stringify({ error: err?.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
