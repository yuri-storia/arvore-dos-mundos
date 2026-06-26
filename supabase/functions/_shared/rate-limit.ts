// Shared rate-limit helper for AI edge functions.
// Uses the `check_rate_limit` SQL function (per-minute window).
//
// Usage:
//   const rl = await checkRateLimit(adminClient, userId, "ai-text", 20);
//   if (rl) return rl; // 429 Response

// deno-lint-ignore no-explicit-any
type AdminClient = any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export async function checkRateLimit(
  admin: AdminClient,
  userId: string,
  fnName: string,
  maxPerMin: number,
): Promise<Response | null> {
  try {
    const { data } = await admin.rpc("check_rate_limit", {
      _user_id: userId,
      _function: fnName,
      _max_per_min: maxPerMin,
    });
    if (data && data.allowed === false) {
      const retry = Math.max(1, Number(data.retry_after_seconds) || 30);
      return new Response(
        JSON.stringify({
          error: `Idriel recebeu pedidos demais ao mesmo tempo. Aguarde ~${retry}s e tente novamente.`,
          rate_limit: data,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": String(retry),
          },
        },
      );
    }
  } catch (e) {
    // Fail-open: do not block AI if the rate-limit table itself is unhealthy.
    console.error("rate-limit check failed", e);
  }
  return null;
}
