// Cancela a assinatura ativa do usuário (Stripe ou, legado, Asaas).
// O acesso permanece até o fim do ciclo já pago.
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const { data: claims, error } = await supa.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (error || !claims?.claims?.sub) return json({ error: "Invalid token" }, 401);
    const userId = claims.claims.sub as string;

    const { data: sub } = await supa
      .from("subscriptions")
      .select("id, provider, stripe_subscription_id, asaas_subscription_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub) return json({ error: "Nenhuma assinatura ativa encontrada." }, 404);

    if (sub.stripe_subscription_id) {
      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });
      await stripe.subscriptions.update(sub.stripe_subscription_id as string, { cancel_at_period_end: true });
    } else if (sub.asaas_subscription_id) {
      const apiKey = Deno.env.get("ASAAS_API_KEY");
      if (apiKey) {
        const res = await fetch(`https://api.asaas.com/v3/subscriptions/${sub.asaas_subscription_id}`, {
          method: "DELETE",
          headers: { access_token: apiKey, "User-Agent": "ArvoreDosMundos/1.0" },
        });
        if (!res.ok) throw new Error(`Asaas cancel ${res.status}: ${await res.text()}`);
      }
    }

    await supa
      .from("subscriptions")
      .update({ cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", sub.id);

    return json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("cancel-subscription error:", msg);
    return json({ error: msg }, 500);
  }
});
