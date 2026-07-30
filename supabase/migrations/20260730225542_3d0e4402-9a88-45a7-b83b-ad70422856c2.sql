ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'asaas',
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

CREATE INDEX IF NOT EXISTS subscriptions_stripe_sub_idx ON public.subscriptions (stripe_subscription_id);

ALTER TABLE public.asaas_payments
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'asaas';

ALTER TABLE public.asaas_payments ALTER COLUMN asaas_customer_id DROP NOT NULL;