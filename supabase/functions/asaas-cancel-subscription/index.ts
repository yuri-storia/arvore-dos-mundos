// Cancela a assinatura ativa do usuário no Asaas
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ASAAS_BASE = "https://api-sandbox.asaas.com/v3";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const token = authHeader.replace("Bearer ", "");
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );
    const { data: claims, error } = await supa.auth.getClaims(token);
    if (error || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claims.claims.sub as string;

    const { data: sub } = await supa.from("subscriptions")
      .select("id, asaas_subscription_id")
      .eq("user_id", userId).eq("status", "active")
      .order("started_at", { ascending: false }).limit(1).maybeSingle();

    if (!sub?.asaas_subscription_id) {
      return new Response(JSON.stringify({ error: "No active subscription" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const apiKey = Deno.env.get("ASAAS_API_KEY")!;
    const res = await fetch(`${ASAAS_BASE}/subscriptions/${sub.asaas_subscription_id}`, {
      method: "DELETE",
      headers: { access_token: apiKey, "User-Agent": "ArvoreDosMundos/1.0" },
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Asaas cancel ${res.status}: ${text}`);
    }

    await supa.from("subscriptions").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", sub.id);

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("asaas-cancel error:", err?.message || err);
    return new Response(JSON.stringify({ error: err?.message || "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
