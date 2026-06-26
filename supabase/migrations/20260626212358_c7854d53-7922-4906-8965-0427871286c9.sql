
-- 1) Grant admin to Rodolfo Machado
INSERT INTO public.admin_users (user_id)
SELECT id FROM auth.users WHERE lower(email) = 'machado.ro@live.com'
ON CONFLICT (user_id) DO NOTHING;

-- 2) Ensure he has an active subscription record (so legacy checks pass even if quota bypass is removed)
INSERT INTO public.subscriptions (user_id, plan, plan_code, status, has_idriel, billing_cycle, started_at, expires_at, environment, asaas_subscription_id)
SELECT u.id, 'pro', 'raiz_vitalicio', 'active', true, 'lifetime', now(), NULL, 'manual', 'admin_grant_' || u.id
FROM auth.users u
WHERE lower(u.email) = 'machado.ro@live.com'
ON CONFLICT (user_id) DO UPDATE SET
  status = 'active',
  plan_code = 'raiz_vitalicio',
  has_idriel = true,
  billing_cycle = 'lifetime',
  expires_at = NULL,
  cancelled_at = NULL;

-- 3) Admins bypass quota entirely (elixir infinito)
CREATE OR REPLACE FUNCTION public.check_ai_quota(_user_id uuid, _type text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _status TEXT;
  _month TEXT;
  _text_count INT;
  _image_count INT;
  _image_draft_count INT;
  _image_premium_count INT;
  _credits_used INT;
  _credit_limit INT := 100;
  _cost INT;
BEGIN
  -- Admins têm elixir infinito
  IF EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = _user_id) THEN
    RETURN jsonb_build_object('allowed', true, 'credits_used', 0, 'credit_limit', 999999, 'admin', true);
  END IF;

  SELECT status INTO _status
  FROM subscriptions
  WHERE user_id = _user_id AND status = 'active';

  IF _status IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'no_subscription');
  END IF;

  _month := to_char(now(), 'YYYY-MM');

  SELECT text_count, image_count, image_draft_count, image_premium_count
    INTO _text_count, _image_count, _image_draft_count, _image_premium_count
  FROM ai_usage
  WHERE user_id = _user_id AND month = _month;

  _text_count := COALESCE(_text_count, 0);
  _image_count := COALESCE(_image_count, 0);
  _image_draft_count := COALESCE(_image_draft_count, 0);
  _image_premium_count := COALESCE(_image_premium_count, 0);

  _credits_used := _text_count
                 + (_image_draft_count * 2)
                 + (_image_count * 5)
                 + (_image_premium_count * 15);

  _cost := CASE
    WHEN _type = 'text' THEN 1
    WHEN _type = 'image_draft' THEN 2
    WHEN _type = 'image' THEN 5
    WHEN _type = 'image_premium' THEN 15
    ELSE 5
  END;

  IF _credits_used + _cost > _credit_limit THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'credit_limit_reached', 'used', _credits_used, 'limit', _credit_limit);
  END IF;

  RETURN jsonb_build_object('allowed', true, 'credits_used', _credits_used, 'credit_limit', _credit_limit);
END;
$function$;
