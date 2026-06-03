-- Função agregada para o painel admin: faz tudo em UMA query (em vez de 5 IN(...) lists).
-- Executa com SECURITY DEFINER; só é chamada pela edge function admin-dashboard (já valida admin antes).
CREATE OR REPLACE FUNCTION public.admin_user_aggregates()
RETURNS TABLE (
  user_id uuid,
  plan_code text,
  has_idriel boolean,
  sub_status text,
  billing_cycle text,
  expires_at timestamptz,
  started_at timestamptz,
  bonus_drops integer,
  is_admin boolean,
  recharges_count integer,
  recharge_total numeric,
  lifetime_total numeric,
  last_payment_at timestamptz,
  ai_text_month integer,
  ai_image_month integer,
  ai_text_total integer,
  ai_image_total integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH current_sub AS (
    SELECT DISTINCT ON (user_id)
      user_id, plan_code, has_idriel, status AS sub_status, billing_cycle, expires_at, started_at
    FROM subscriptions
    ORDER BY user_id, (status = 'active') DESC, started_at DESC NULLS LAST
  ),
  pay AS (
    SELECT
      user_id,
      COUNT(*) FILTER (WHERE kind = 'recharge' AND status IN ('CONFIRMED','RECEIVED','paid'))::int AS recharges_count,
      COALESCE(SUM(amount) FILTER (WHERE kind = 'recharge' AND status IN ('CONFIRMED','RECEIVED','paid')), 0) AS recharge_total,
      COALESCE(SUM(amount) FILTER (WHERE status IN ('CONFIRMED','RECEIVED','paid')), 0) AS lifetime_total,
      MAX(paid_at) FILTER (WHERE status IN ('CONFIRMED','RECEIVED','paid')) AS last_payment_at
    FROM asaas_payments
    GROUP BY user_id
  ),
  ai_m AS (
    SELECT
      user_id,
      COALESCE(SUM(text_count)  FILTER (WHERE month = to_char(now(),'YYYY-MM')), 0)::int AS ai_text_month,
      COALESCE(SUM(image_count) FILTER (WHERE month = to_char(now(),'YYYY-MM')), 0)::int AS ai_image_month,
      COALESCE(SUM(text_count), 0)::int  AS ai_text_total,
      COALESCE(SUM(image_count), 0)::int AS ai_image_total
    FROM ai_usage
    GROUP BY user_id
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
$$;

REVOKE ALL ON FUNCTION public.admin_user_aggregates() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_user_aggregates() TO service_role;

-- Índices para acelerar joins/filtros usados pelo painel admin
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status_started
  ON public.subscriptions (user_id, status, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_asaas_payments_user
  ON public.asaas_payments (user_id);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_month
  ON public.ai_usage (user_id, month);

CREATE INDEX IF NOT EXISTS idx_bug_reports_status_created
  ON public.bug_reports (status, created_at DESC);
