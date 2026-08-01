UPDATE public.subscriptions
SET status = 'cancelled',
    cancelled_at = COALESCE(cancelled_at, now()),
    expires_at = COALESCE(expires_at, now()),
    has_idriel = false,
    billing_cycle = 'monthly',
    updated_at = now()
WHERE billing_cycle = 'LIFETIME_COURTESY';

UPDATE public.user_credit_balance b
SET bonus_drops = 0, updated_at = now()
WHERE b.bonus_drops > 0
  AND EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = b.user_id
      AND s.cancelled_at IS NOT NULL
      AND s.status = 'cancelled'
      AND s.plan_code = 'raiz_mensal'
      AND s.stripe_subscription_id IS NULL
  );