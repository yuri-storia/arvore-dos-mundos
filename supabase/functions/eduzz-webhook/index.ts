import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function verifySignature(secret: string, bodyText: string, signature: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const expectedBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(bodyText));
  const expectedHex = toHex(expectedBuf);

  // Constant-time comparison
  if (expectedHex.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expectedHex.length; i++) {
    mismatch |= expectedHex.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const EDUZZ_WEBHOOK_SECRET = Deno.env.get("EDUZZ_WEBHOOK_SECRET");

    if (!EDUZZ_WEBHOOK_SECRET) {
      console.error("EDUZZ_WEBHOOK_SECRET not configured");
      return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Read body as text for signature verification, then parse
    const bodyText = await req.text();

    const signature = req.headers.get("x-eduzz-signature") || req.headers.get("x-webhook-signature");
    if (!signature) {
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const valid = await verifySignature(EDUZZ_WEBHOOK_SECRET, bodyText, signature);
    if (!valid) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = JSON.parse(bodyText);

    // Log only non-sensitive fields
    const event = body.event_type || body.trans_status || body.event;
    const email = body.cus_email || body.customer?.email || body.email;
    const transactionId = body.trans_cod || body.transaction_id || body.id;
    const productId = body.product_id || body.pro_cod;

    console.log("Eduzz webhook received:", {
      event,
      product_id: productId,
      has_email: !!email,
      timestamp: new Date().toISOString(),
    });

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (!email) {
      console.error("No email in webhook payload");
      return new Response(JSON.stringify({ error: "No email found" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine plan from product ID
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
      await adminClient.from("allowed_emails").upsert(
        { email: email.toLowerCase() },
        { onConflict: "email" }
      );
      console.log("User not found, added to allowed_emails");
      
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
      console.log(`Subscription activated: ${plan}`);
    } else if (isCancellation) {
      await adminClient.from("subscriptions").update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
      }).eq("user_id", user.id);
      console.log("Subscription cancelled");
    } else {
      console.log(`Unhandled event type: ${event}`);
    }

    return new Response(JSON.stringify({ status: "ok" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("eduzz-webhook error:", e instanceof Error ? e.message : "Unknown error");
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
