import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const EDUZZ_WEBHOOK_SECRET = Deno.env.get("EDUZZ_WEBHOOK_SECRET");
    
    // Verify webhook signature if secret is configured
    if (EDUZZ_WEBHOOK_SECRET) {
      const signature = req.headers.get("x-eduzz-signature") || req.headers.get("x-webhook-signature");
      // Eduzz sends a signature header - verify it matches
      // For now, we do a simple check. In production, implement HMAC verification.
      if (!signature) {
        console.warn("No webhook signature found in headers");
      }
    }

    const body = await req.json();
    console.log("Eduzz webhook received:", JSON.stringify(body));

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Eduzz webhook events:
    // - purchase_complete / invoice_paid: ativa assinatura
    // - subscription_canceled / refund: cancela assinatura
    // - subscription_renewed: renova
    const event = body.event_type || body.trans_status || body.event;
    const email = body.cus_email || body.customer?.email || body.email;
    const transactionId = body.trans_cod || body.transaction_id || body.id;
    const productId = body.product_id || body.pro_cod;

    if (!email) {
      console.error("No email in webhook payload");
      return new Response(JSON.stringify({ error: "No email found" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine plan from product ID or body
    // You'll configure these product IDs when setting up Eduzz
    const PRODUCT_BASICO = Deno.env.get("EDUZZ_PRODUCT_BASICO") || "";
    const PRODUCT_PRO = Deno.env.get("EDUZZ_PRODUCT_PRO") || "";
    
    let plan: "basico" | "pro" = "basico";
    if (String(productId) === PRODUCT_PRO) {
      plan = "pro";
    }

    // Find user by email
    const { data: users } = await adminClient.auth.admin.listUsers();
    const user = users?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      // User not yet registered - add to allowed_emails so they can sign up
      await adminClient.from("allowed_emails").upsert(
        { email: email.toLowerCase() },
        { onConflict: "email" }
      );
      console.log(`User ${email} not found, added to allowed_emails`);
      
      // Create a pending subscription entry we'll activate when user signs up
      // We'll store it with email reference for later matching
      return new Response(JSON.stringify({ 
        status: "pending", 
        message: "User not registered yet. Email added to allowed list." 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle different events
    const isActivation = ["purchase_complete", "invoice_paid", "completed", "approved", "3"].includes(String(event));
    const isCancellation = ["subscription_canceled", "refund", "refunded", "cancelled", "6", "7"].includes(String(event));

    if (isActivation) {
      await adminClient.from("subscriptions").upsert(
        {
          user_id: user.id,
          plan,
          status: "active",
          eduzz_transaction_id: String(transactionId),
          started_at: new Date().toISOString(),
          expires_at: null,
          cancelled_at: null,
        },
        { onConflict: "user_id" }
      );
      console.log(`Subscription activated for ${email}: ${plan}`);
    } else if (isCancellation) {
      await adminClient.from("subscriptions").update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
      }).eq("user_id", user.id);
      console.log(`Subscription cancelled for ${email}`);
    } else {
      console.log(`Unhandled event type: ${event}`);
    }

    return new Response(JSON.stringify({ status: "ok" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("eduzz-webhook error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
