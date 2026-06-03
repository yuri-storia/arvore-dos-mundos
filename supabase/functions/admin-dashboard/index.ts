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
        // Pull auth users via admin API (paginated, up to 1000)
        const { data: list, error: listErr } = await supa.auth.admin.listUsers({ page: 1, perPage: 1000 });
        if (listErr) return json({ error: listErr.message }, 500);

        const users = list.users;
        const ids = users.map((u) => u.id);

        const [{ data: subs }, { data: bals }, { data: admins }, { data: payments }, { data: usages }] = await Promise.all([
          supa.from("subscriptions").select("user_id, plan_code, has_idriel, status, billing_cycle, expires_at, started_at, asaas_subscription_id").in("user_id", ids),
          supa.from("user_credit_balance").select("user_id, bonus_drops").in("user_id", ids),
          supa.from("admin_users").select("user_id").in("user_id", ids),
          supa.from("asaas_payments").select("user_id, kind, amount, status, paid_at, drops, plan_code").in("user_id", ids),
          supa.from("ai_usage").select("user_id, month, text_count, image_count").in("user_id", ids),
        ]);

        const subBy = new Map<string, any>();
        // pick the most recent active sub per user; fallback to most recent any
        for (const s of subs ?? []) {
          const prev = subBy.get(s.user_id);
          if (!prev) { subBy.set(s.user_id, s); continue; }
          const prevActive = prev.status === "active";
          const curActive = s.status === "active";
          if (curActive && !prevActive) subBy.set(s.user_id, s);
          else if (curActive === prevActive) {
            if ((s.started_at ?? "") > (prev.started_at ?? "")) subBy.set(s.user_id, s);
          }
        }
        const balBy = new Map((bals ?? []).map((b) => [b.user_id, b.bonus_drops ?? 0]));
        const adminSet = new Set((admins ?? []).map((a) => a.user_id));

        const payAgg = new Map<string, { recharges: number; recharge_total: number; last_payment: string | null; lifetime_total: number }>();
        for (const p of payments ?? []) {
          const a = payAgg.get(p.user_id) ?? { recharges: 0, recharge_total: 0, last_payment: null, lifetime_total: 0 };
          if (p.status === "CONFIRMED" || p.status === "RECEIVED" || p.status === "paid") {
            a.lifetime_total += Number(p.amount ?? 0);
            if (p.kind === "recharge") {
              a.recharges += 1;
              a.recharge_total += Number(p.amount ?? 0);
            }
            if (p.paid_at && (!a.last_payment || p.paid_at > a.last_payment)) a.last_payment = p.paid_at;
          }
          payAgg.set(p.user_id, a);
        }

        const currentMonth = new Date().toISOString().slice(0, 7);
        const usageBy = new Map<string, { text_month: number; image_month: number; text_total: number; image_total: number }>();
        for (const u of usages ?? []) {
          const a = usageBy.get(u.user_id) ?? { text_month: 0, image_month: 0, text_total: 0, image_total: 0 };
          a.text_total += u.text_count ?? 0;
          a.image_total += u.image_count ?? 0;
          if (u.month === currentMonth) {
            a.text_month += u.text_count ?? 0;
            a.image_month += u.image_count ?? 0;
          }
          usageBy.set(u.user_id, a);
        }

        const result = users.map((u) => {
          const s = subBy.get(u.id);
          const pa = payAgg.get(u.id) ?? { recharges: 0, recharge_total: 0, last_payment: null, lifetime_total: 0 };
          const ug = usageBy.get(u.id) ?? { text_month: 0, image_month: 0, text_total: 0, image_total: 0 };
          return {
            id: u.id,
            email: u.email,
            created_at: u.created_at,
            last_sign_in_at: u.last_sign_in_at,
            is_admin: adminSet.has(u.id),
            plan_code: s?.plan_code ?? null,
            has_idriel: !!s?.has_idriel,
            sub_status: s?.status ?? null,
            billing_cycle: s?.billing_cycle ?? null,
            expires_at: s?.expires_at ?? null,
            bonus_drops: balBy.get(u.id) ?? 0,
            recharges_count: pa.recharges,
            recharge_total: pa.recharge_total,
            lifetime_total: pa.lifetime_total,
            last_payment_at: pa.last_payment,
            ai_text_month: ug.text_month,
            ai_image_month: ug.image_month,
            ai_text_total: ug.text_total,
            ai_image_total: ug.image_total,
          };
        });

        return json({ users: result });
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
        // Manually set a user's subscription. Used to grant lifetime plans or fix records.
        // body: { user_id, plan_code: 'raiz_mensal'|'raiz_anual'|'idriel_mensal'|'idriel_anual'|'raiz_vitalicio'|'none' }
        const targetId = body?.user_id as string;
        const planCode = body?.plan_code as string;
        if (!targetId || !planCode) return json({ error: "user_id and plan_code required" }, 400);

        if (planCode === "none") {
          const { error } = await supa.from("subscriptions").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("user_id", targetId).eq("status", "active");
          if (error) return json({ error: error.message }, 500);
          return json({ ok: true });
        }

        const hasIdriel = planCode.startsWith("idriel_");
        const isLifetime = planCode === "raiz_vitalicio";
        const isAnnual = planCode.endsWith("_anual");
        const now = new Date();
        let expiresAt: string | null;
        if (isLifetime) expiresAt = null;
        else if (isAnnual) expiresAt = new Date(now.getTime() + 365 * 86400_000).toISOString();
        else expiresAt = new Date(now.getTime() + 31 * 86400_000).toISOString();

        // Cancel any existing active subscription, then insert a new one (keeps history).
        await supa.from("subscriptions").update({ status: "cancelled", cancelled_at: now.toISOString() })
          .eq("user_id", targetId).eq("status", "active");

        const { error } = await supa.from("subscriptions").insert({
          user_id: targetId,
          plan: hasIdriel ? "idriel" : "template",
          plan_code: planCode,
          status: "active",
          has_idriel: hasIdriel,
          billing_cycle: isLifetime ? "lifetime" : (isAnnual ? "YEARLY" : "MONTHLY"),
          started_at: now.toISOString(),
          expires_at: expiresAt,
          environment: "manual",
        });
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true });
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
