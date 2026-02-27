
-- Plan type enum
CREATE TYPE public.plan_type AS ENUM ('basico', 'pro');

-- Subscriptions table
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan plan_type NOT NULL DEFAULT 'basico',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'pending')),
  eduzz_transaction_id TEXT,
  eduzz_subscription_id TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Monthly usage tracking
CREATE TABLE public.ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  month TEXT NOT NULL, -- format: '2026-02'
  text_count INT NOT NULL DEFAULT 0,
  image_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, month)
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

-- Subscriptions policies
CREATE POLICY "Users can view own subscription"
ON public.subscriptions FOR SELECT
USING (auth.uid() = user_id);

-- AI usage policies
CREATE POLICY "Users can view own usage"
ON public.ai_usage FOR SELECT
USING (auth.uid() = user_id);

-- Update timestamp triggers
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_profiles_updated_at();

CREATE TRIGGER update_ai_usage_updated_at
BEFORE UPDATE ON public.ai_usage
FOR EACH ROW EXECUTE FUNCTION public.update_profiles_updated_at();

-- Function to get plan limits
CREATE OR REPLACE FUNCTION public.get_plan_limits(_plan plan_type)
RETURNS TABLE(text_limit INT, image_limit INT)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT 
    CASE _plan WHEN 'basico' THEN 50 WHEN 'pro' THEN 200 END,
    CASE _plan WHEN 'basico' THEN 10 WHEN 'pro' THEN 40 END;
$$;

-- Function to check if user can use AI (called from edge functions)
CREATE OR REPLACE FUNCTION public.check_ai_quota(_user_id UUID, _type TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _plan plan_type;
  _status TEXT;
  _month TEXT;
  _text_count INT;
  _image_count INT;
  _text_limit INT;
  _image_limit INT;
BEGIN
  -- Get active subscription
  SELECT plan, status INTO _plan, _status
  FROM subscriptions
  WHERE user_id = _user_id AND status = 'active';

  IF _plan IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'no_subscription');
  END IF;

  -- Get current month usage
  _month := to_char(now(), 'YYYY-MM');
  
  SELECT text_count, image_count INTO _text_count, _image_count
  FROM ai_usage
  WHERE user_id = _user_id AND month = _month;

  _text_count := COALESCE(_text_count, 0);
  _image_count := COALESCE(_image_count, 0);

  -- Get limits
  SELECT text_limit, image_limit INTO _text_limit, _image_limit
  FROM get_plan_limits(_plan);

  -- Check quota
  IF _type = 'text' AND _text_count >= _text_limit THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'text_limit_reached', 'used', _text_count, 'limit', _text_limit);
  END IF;

  IF _type = 'image' AND _image_count >= _image_limit THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'image_limit_reached', 'used', _image_count, 'limit', _image_limit);
  END IF;

  RETURN jsonb_build_object('allowed', true, 'plan', _plan, 'text_used', _text_count, 'text_limit', _text_limit, 'image_used', _image_count, 'image_limit', _image_limit);
END;
$$;

-- Function to increment usage (called from edge functions)
CREATE OR REPLACE FUNCTION public.increment_ai_usage(_user_id UUID, _type TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _month TEXT;
BEGIN
  _month := to_char(now(), 'YYYY-MM');
  
  INSERT INTO ai_usage (user_id, month, text_count, image_count)
  VALUES (_user_id, _month, 
    CASE WHEN _type = 'text' THEN 1 ELSE 0 END,
    CASE WHEN _type = 'image' THEN 1 ELSE 0 END)
  ON CONFLICT (user_id, month)
  DO UPDATE SET
    text_count = ai_usage.text_count + CASE WHEN _type = 'text' THEN 1 ELSE 0 END,
    image_count = ai_usage.image_count + CASE WHEN _type = 'image' THEN 1 ELSE 0 END,
    updated_at = now();
END;
$$;
