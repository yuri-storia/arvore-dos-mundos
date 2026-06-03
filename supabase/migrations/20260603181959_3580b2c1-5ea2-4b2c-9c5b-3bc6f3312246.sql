
-- Asaas customers map
CREATE TABLE public.asaas_customers (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  asaas_customer_id TEXT NOT NULL UNIQUE,
  environment TEXT NOT NULL DEFAULT 'sandbox',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.asaas_customers TO authenticated;
GRANT ALL ON public.asaas_customers TO service_role;
ALTER TABLE public.asaas_customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own asaas customer" ON public.asaas_customers FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Asaas payments log
CREATE TABLE public.asaas_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asaas_payment_id TEXT NOT NULL UNIQUE,
  asaas_subscription_id TEXT,
  asaas_customer_id TEXT NOT NULL,
  plan_code TEXT NOT NULL,
  kind TEXT NOT NULL,             -- 'subscription' | 'recharge'
  drops INT,                      -- for recharges
  amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL,
  billing_type TEXT,              -- PIX, CREDIT_CARD, BOLETO, UNDEFINED
  invoice_url TEXT,
  due_date DATE,
  paid_at TIMESTAMPTZ,
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.asaas_payments TO authenticated;
GRANT ALL ON public.asaas_payments TO service_role;
ALTER TABLE public.asaas_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own payments" ON public.asaas_payments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_asaas_payments_user ON public.asaas_payments(user_id);
CREATE INDEX idx_asaas_payments_sub ON public.asaas_payments(asaas_subscription_id);

-- Extend subscriptions with Asaas + plan_code
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS asaas_subscription_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS plan_code TEXT,
  ADD COLUMN IF NOT EXISTS has_idriel BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS billing_cycle TEXT,
  ADD COLUMN IF NOT EXISTS environment TEXT NOT NULL DEFAULT 'sandbox';

-- User credit balance (persistent recharge drops, separate from monthly Idriel allowance)
CREATE TABLE public.user_credit_balance (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  bonus_drops INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_credit_balance TO authenticated;
GRANT ALL ON public.user_credit_balance TO service_role;
ALTER TABLE public.user_credit_balance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own balance" ON public.user_credit_balance FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.add_bonus_drops(_user_id UUID, _drops INT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_credit_balance (user_id, bonus_drops)
  VALUES (_user_id, _drops)
  ON CONFLICT (user_id) DO UPDATE SET
    bonus_drops = public.user_credit_balance.bonus_drops + _drops,
    updated_at = now();
END;
$$;
