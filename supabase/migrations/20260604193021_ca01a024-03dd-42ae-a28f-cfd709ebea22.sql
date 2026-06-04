REVOKE EXECUTE ON FUNCTION public.admin_user_aggregates() FROM authenticated, anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_user_aggregates() TO service_role;

-- Add in-function admin guard as defense in depth
CREATE OR REPLACE FUNCTION public.admin_user_aggregates()
 RETURNS TABLE(user_id uuid, plan_code text, has_idriel boolean, sub_status text, billing_cycle text, expires_at timestamp with time zone, started_at timestamp with time zone, bonus_drops integer, is_admin boolean, recharges_count integer, recharge_total numeric, lifetime_total numeric, last_payment_at timestamp with time zone, ai_text_month integer, ai_image_month integer, ai_text_total integer, ai_image_total integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  WITH current_sub AS (
    SELECT DISTINCT ON (s.user_id)
      s.user_id, s.plan_code, s.has_idriel, s.status AS sub_status, s.billing_cycle, s.expires_at, s.started_at
    FROM subscriptions s
    ORDER BY s.user_id, (s.status = 'active') DESC, s.started_at DESC NULLS LAST
  ),
  pay AS (
    SELECT
      ap.user_id,
      COUNT(*) FILTER (WHERE ap.kind = 'recharge' AND ap.status IN ('CONFIRMED','RECEIVED','paid'))::int AS recharges_count,
      COALESCE(SUM(ap.amount) FILTER (WHERE ap.kind = 'recharge' AND ap.status IN ('CONFIRMED','RECEIVED','paid')), 0) AS recharge_total,
      COALESCE(SUM(ap.amount) FILTER (WHERE ap.status IN ('CONFIRMED','RECEIVED','paid')), 0) AS lifetime_total,
      MAX(ap.paid_at) FILTER (WHERE ap.status IN ('CONFIRMED','RECEIVED','paid')) AS last_payment_at
    FROM asaas_payments ap
    GROUP BY ap.user_id
  ),
  ai_m AS (
    SELECT
      au.user_id,
      COALESCE(SUM(au.text_count)  FILTER (WHERE au.month = to_char(now(),'YYYY-MM')), 0)::int AS ai_text_month,
      COALESCE(SUM(au.image_count) FILTER (WHERE au.month = to_char(now(),'YYYY-MM')), 0)::int AS ai_image_month,
      COALESCE(SUM(au.text_count), 0)::int  AS ai_text_total,
      COALESCE(SUM(au.image_count), 0)::int AS ai_image_total
    FROM ai_usage au
    GROUP BY au.user_id
  )
  SELECT
    p.user_id,
    s.plan_code,
    COALESCE(s.has_idriel, false),
    s.sub_status,
    s.billing_cycle,
    s.expires_at,
    s.started_at,
    COALESCE(b.bonus_drops, 0),
    (a.user_id IS NOT NULL),
    COALESCE(pay.recharges_count, 0),
    COALESCE(pay.recharge_total, 0),
    COALESCE(pay.lifetime_total, 0),
    pay.last_payment_at,
    COALESCE(ai_m.ai_text_month, 0),
    COALESCE(ai_m.ai_image_month, 0),
    COALESCE(ai_m.ai_text_total, 0),
    COALESCE(ai_m.ai_image_total, 0)
  FROM profiles p
  LEFT JOIN current_sub s          ON s.user_id     = p.user_id
  LEFT JOIN user_credit_balance b  ON b.user_id     = p.user_id
  LEFT JOIN admin_users a          ON a.user_id     = p.user_id
  LEFT JOIN pay                    ON pay.user_id   = p.user_id
  LEFT JOIN ai_m                   ON ai_m.user_id  = p.user_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_user_aggregates() FROM authenticated, anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_user_aggregates() TO service_role;