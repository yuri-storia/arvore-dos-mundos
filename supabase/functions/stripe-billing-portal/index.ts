// Abre o Portal do Cliente da Stripe — troca de forma de pagamento,
// faturas/recibos e dados de cobrança do próprio usuário autenticado.
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Não autenticado" }, 401);
    const { data: claims } = await supa.auth.getClaims(authHeader.replace("Bearer ", ""));
    const userId = claims?.claims?.sub as string | undefined;
    const email = (claims?.claims?.email as string) || "";
    if (!userId) return json({ error: "Não autenticado" }, 401);

    // Descobre o customer: primeiro pela assinatura salva, depois pelo e-mail
    let customerId: string | null = null;
    const { data: sub } = await supa
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle();
    customerId = sub?.stripe_customer_id ?? null;

    if (!customerId && email) {
      const found = await stripe.customers.list({ email, limit: 1 });
      if (found.data.length > 0) customerId = found.data[0].id;
    }

    if (!customerId) {
      return json({ error: "Nenhuma cobrança encontrada para esta conta na Stripe." }, 404);
    }

    const reqOrigin = req.headers.get("origin") || "";
    const origin = ALLOWED_ORIGINS.has(reqOrigin) ? reqOrigin : "https://arvoredosmundos.app";

    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/settings`,
      locale: "pt-BR",
    });

    return json({ url: portal.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("stripe-billing-portal error:", msg);
    return json({ error: msg }, 500);
  }
});
