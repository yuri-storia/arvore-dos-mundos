// Demo login: valida token de auditoria e devolve sessão do usuário demo.
// Toda a validação acontece no servidor. O token nunca aparece no bundle do front.
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// timingSafeEqual sem depender de node crypto
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const expected = Deno.env.get("DEMO_ACCESS_TOKEN") ?? "";
    if (!expected) return json({ error: "demo_disabled" }, 503);

    const expiresAt = Deno.env.get("DEMO_EXPIRES_AT");
    if (expiresAt) {
      const t = Date.parse(expiresAt);
      if (Number.isFinite(t) && Date.now() > t) {
        return json({ error: "demo_expired" }, 410);
      }
    }

    let body: { token?: string } = {};
    try { body = await req.json(); } catch { /* ignore */ }
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!token || !safeEqual(token, expected)) {
      return json({ error: "invalid_token" }, 401);
    }

    const email = Deno.env.get("DEMO_USER_EMAIL");
    const password = Deno.env.get("DEMO_USER_PASSWORD");
    if (!email || !password) return json({ error: "demo_not_configured" }, 500);

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { data, error } = await supa.auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      return json({ error: "signin_failed", detail: error?.message }, 500);
    }

    // Segurança extra: só devolvemos a sessão se o usuário estiver marcado como demo.
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const { data: prof } = await admin
      .from("profiles")
      .select("is_demo")
      .eq("user_id", data.user!.id)
      .maybeSingle();

    if (!prof?.is_demo) {
      return json({ error: "not_a_demo_account" }, 403);
    }

    return json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      demo_expires_at: expiresAt ?? null,
    });
  } catch (err) {
    return json({ error: "server_error", detail: (err as Error).message }, 500);
  }
});
