// Admin dashboard backend — list users, manage admins, change plans, list bugs.
// All actions require the caller to be an admin (verified via is_admin RPC).
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
    const token = authHeader.replace("Bearer ", "");

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const { data: claims, error: claimsErr } = await supa.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) return json({ error: "unauthorized" }, 401);
    const callerId = claims.claims.sub as string;

    // Verify admin
    const { data: adminRow } = await supa.from("admin_users").select("user_id").eq("user_id", callerId).maybeSingle();
    if (!adminRow) return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body?.action as string;

    switch (action) {
      case "list_users": {
        // Parallel: paginated auth list + single aggregate RPC (DB does the heavy lifting)
        const [authRes, aggRes] = await Promise.all([
          supa.auth.admin.listUsers({ page: 1, perPage: 1000 }),
          supa.rpc("admin_user_aggregates"),
        ]);
        if (authRes.error) return json({ error: authRes.error.message }, 500);
        if (aggRes.error) return json({ error: aggRes.error.message }, 500);

        const aggBy = new Map<string, any>();
        for (const r of (aggRes.data ?? []) as any[]) aggBy.set(r.user_id, r);

        const result = authRes.data.users.map((u) => {
          const a = aggBy.get(u.id);
          return {
            id: u.id,
            email: u.email,
            created_at: u.created_at,
            last_sign_in_at: u.last_sign_in_at,
            is_admin: a?.is_admin ?? false,
            plan_code: a?.plan_code ?? null,
            has_idriel: !!a?.has_idriel,
            sub_status: a?.sub_status ?? null,
            billing_cycle: a?.billing_cycle ?? null,
            expires_at: a?.expires_at ?? null,
            bonus_drops: a?.bonus_drops ?? 0,
            recharges_count: a?.recharges_count ?? 0,
            recharge_total: Number(a?.recharge_total ?? 0),
            lifetime_total: Number(a?.lifetime_total ?? 0),
            last_payment_at: a?.last_payment_at ?? null,
            ai_text_month: a?.ai_text_month ?? 0,
            ai_image_month: a?.ai_image_month ?? 0,
            ai_text_total: a?.ai_text_total ?? 0,
            ai_image_total: a?.ai_image_total ?? 0,
          };
        });

        return json({ users: result }, 200);
      }


      case "grant_admin": {
        const targetId = body?.user_id as string;
        if (!targetId) return json({ error: "user_id required" }, 400);
        const { error } = await supa.from("admin_users").insert({ user_id: targetId });
        if (error && !String(error.message).includes("duplicate")) return json({ error: error.message }, 500);
        return json({ ok: true });
      }

      case "revoke_admin": {
        const targetId = body?.user_id as string;
        if (!targetId) return json({ error: "user_id required" }, 400);
        if (targetId === callerId) return json({ error: "cannot revoke self" }, 400);
        const { error } = await supa.from("admin_users").delete().eq("user_id", targetId);
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true });
      }

      case "set_plan": {
        // Manually set a user's subscription. No payment is charged; the user can be billed
        // normally after expires_at.
        // body: { user_id, plan_code, duration_days? }
        // plan_code: 'raiz_mensal'|'raiz_anual'|'idriel_mensal'|'idriel_anual'|'raiz_vitalicio'|'beta_raiz'|'none'
        const targetId = body?.user_id as string;
        const planCode = body?.plan_code as string;
        const durationDays = Number(body?.duration_days ?? 0);
        if (!targetId || !planCode) return json({ error: "user_id and plan_code required" }, 400);

        if (planCode === "none") {
          const { error } = await supa.from("subscriptions").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("user_id", targetId).eq("status", "active");
          if (error) return json({ error: error.message }, 500);
          return json({ ok: true });
        }

        const now = new Date();

        // Beta path: grants N days of Raiz + records beta_redemption (with Idriel discount window).
        if (planCode === "beta_raiz") {
          const days = durationDays > 0 ? durationDays : 30;
          const raizUntil = new Date(now.getTime() + days * 86400_000).toISOString();
          const idrielDiscountUntil = new Date(now.getTime() + (days + 120) * 86400_000).toISOString();
          const adminCode = "ADMIN_GRANT";

          await supa.from("beta_codes").upsert(
            { code: adminCode, label: "Concessão manual (admin)", max_uses: 1_000_000, active: true },
            { onConflict: "code" }
          );

          await supa.from("subscriptions").update({ status: "cancelled", cancelled_at: now.toISOString() })
            .eq("user_id", targetId).eq("status", "active");

          const { error: subErr } = await supa.from("subscriptions").insert({
            user_id: targetId,
            plan: "pro",
            plan_code: "raiz_mensal",
            status: "active",
            has_idriel: false,
            billing_cycle: "BETA_FREE",
            started_at: now.toISOString(),
            expires_at: raizUntil,
            environment: "manual",
            asaas_subscription_id: `beta_admin_${targetId}_${now.getTime()}`,
          });
          if (subErr) return json({ error: subErr.message }, 500);

          const { error: redErr } = await supa.from("beta_redemptions").upsert({
            user_id: targetId,
            code: adminCode,
            raiz_granted_until: raizUntil,
            idriel_discount_until: idrielDiscountUntil,
            idriel_charges_used: 0,
            redeemed_at: now.toISOString(),
          }, { onConflict: "user_id" });
          if (redErr) return json({ error: redErr.message }, 500);

          return json({ ok: true, expires_at: raizUntil });
        }

        const hasIdriel = planCode.startsWith("idriel_");
        const isLifetime = planCode === "raiz_vitalicio";
        const isAnnual = planCode.endsWith("_anual");
        let expiresAt: string | null;
        if (isLifetime) expiresAt = null;
        else if (durationDays > 0) expiresAt = new Date(now.getTime() + durationDays * 86400_000).toISOString();
        else if (isAnnual) expiresAt = new Date(now.getTime() + 365 * 86400_000).toISOString();
        else expiresAt = new Date(now.getTime() + 30 * 86400_000).toISOString();

        await supa.from("subscriptions").update({ status: "cancelled", cancelled_at: now.toISOString() })
          .eq("user_id", targetId).eq("status", "active");

        const { error } = await supa.from("subscriptions").insert({
          user_id: targetId,
          plan: "pro",
          plan_code: planCode,
          status: "active",
          has_idriel: hasIdriel,
          billing_cycle: isLifetime ? "lifetime" : (isAnnual ? "YEARLY" : "MONTHLY"),
          started_at: now.toISOString(),
          expires_at: expiresAt,
          environment: "manual",
        });
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true, expires_at: expiresAt });
      }

      case "add_drops": {
        const targetId = body?.user_id as string;
        const drops = Number(body?.drops ?? 0);
        if (!targetId || !drops) return json({ error: "user_id and drops required" }, 400);
        const { error } = await supa.rpc("add_bonus_drops", { _user_id: targetId, _drops: drops });
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true });
      }

      case "list_bugs": {
        const { data, error } = await supa.from("bug_reports").select("*").order("created_at", { ascending: false }).limit(500);
        if (error) return json({ error: error.message }, 500);
        return json({ bugs: data });
      }

      case "update_bug": {
        const id = body?.id as string;
        const status = body?.status as string;
        if (!id || !status) return json({ error: "id and status required" }, 400);
        const { error } = await supa.from("bug_reports").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true });
      }

      case "delete_bug": {
        const id = body?.id as string;
        if (!id) return json({ error: "id required" }, 400);
        const { error } = await supa.from("bug_reports").delete().eq("id", id);
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true });
      }

      case "get_user_detail": {
        const targetId = body?.user_id as string;
        if (!targetId) return json({ error: "user_id required" }, 400);

        const { data: authUser } = await supa.auth.admin.getUserById(targetId);

        const [
          { data: subs }, { data: bal }, { data: payments }, { data: usages },
          { data: bugs }, { data: profile }, { data: adminRow2 },
        ] = await Promise.all([
          supa.from("subscriptions").select("*").eq("user_id", targetId).order("started_at", { ascending: false }),
          supa.from("user_credit_balance").select("*").eq("user_id", targetId).maybeSingle(),
          supa.from("asaas_payments").select("*").eq("user_id", targetId).order("created_at", { ascending: false }).limit(200),
          supa.from("ai_usage").select("*").eq("user_id", targetId).order("month", { ascending: false }).limit(24),
          supa.from("bug_reports").select("*").eq("user_id", targetId).order("created_at", { ascending: false }).limit(50),
          supa.from("profiles").select("*").eq("user_id", targetId).maybeSingle(),
          supa.from("admin_users").select("user_id").eq("user_id", targetId).maybeSingle(),
        ]);

        return json({
          user: {
            id: targetId,
            email: authUser?.user?.email ?? null,
            created_at: authUser?.user?.created_at ?? null,
            last_sign_in_at: authUser?.user?.last_sign_in_at ?? null,
            is_admin: !!adminRow2,
            display_name: profile?.display_name ?? null,
            cpf_cnpj: profile?.cpf_cnpj ?? null,
          },
          subscriptions: subs ?? [],
          balance: bal ?? { bonus_drops: 0 },
          payments: payments ?? [],
          ai_usage: usages ?? [],
          bug_reports: bugs ?? [],
        });
      }

      default:
        return json({ error: "unknown action" }, 400);
    }
  } catch (err: any) {
    return json({ error: err?.message || "error" }, 500);
  }
});
