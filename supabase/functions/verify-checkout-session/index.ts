import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const sessionId = typeof body?.session_id === "string" ? body.session_id.trim() : "";

    if (!sessionId || !/^cs_[A-Za-z0-9_]{10,200}$/.test(sessionId)) {
      return json({ valid: false, reason: "invalid_token" }, 200);
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return json({ valid: false, reason: "not_configured" }, 200);

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    let session;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId);
    } catch (_e) {
      return json({ valid: false, reason: "not_found" }, 200);
    }

    const paid = session.payment_status === "paid" || session.payment_status === "no_payment_required";
    const complete = session.status === "complete";

    if (!paid || !complete) {
      return json({ valid: false, reason: "not_paid" }, 200);
    }

    return json({
      valid: true,
      plan: (session.metadata?.plan_code as string) ?? null,
      email: session.customer_details?.email ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[VERIFY-CHECKOUT-SESSION]", message);
    return json({ valid: false, reason: "error" }, 500);
  }
});
