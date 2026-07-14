
-- 1) Upgrade all BETA_FREE users to lifetime Raiz (preserve everything else)
UPDATE public.subscriptions
   SET billing_cycle = 'LIFETIME_COURTESY',
       expires_at    = NULL,
       plan_code     = 'raiz_mensal',
       status        = 'active',
       updated_at    = now()
 WHERE billing_cycle = 'BETA_FREE';

-- 2) Delete test account (cascade removes worlds/codex/manuscripts/etc.)
DELETE FROM public.subscriptions WHERE user_id = 'cb43da6e-2e4a-4e35-a4c2-ed8839315cc7';
DELETE FROM public.profiles      WHERE user_id = 'cb43da6e-2e4a-4e35-a4c2-ed8839315cc7';
DELETE FROM auth.users           WHERE id      = 'cb43da6e-2e4a-4e35-a4c2-ed8839315cc7';

-- 3) Drop demo mode plumbing
DROP FUNCTION IF EXISTS public.reset_demo_data() CASCADE;
DROP FUNCTION IF EXISTS public.is_demo_user(uuid) CASCADE;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_demo;

-- 4) Drop beta tables (no user content; only tracking metadata)
DROP TABLE IF EXISTS public.beta_redemptions CASCADE;
DROP TABLE IF EXISTS public.beta_codes       CASCADE;
