ALTER TABLE public.ai_usage
  ADD COLUMN IF NOT EXISTS image_draft_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS image_premium_count INT NOT NULL DEFAULT 0;

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
                 + (_image_draft_count * 1)
                 + (_image_count * 5)
                 + (_image_premium_count * 15);

  _cost := CASE
    WHEN _type = 'text' THEN 1
    WHEN _type = 'image_draft' THEN 1
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

CREATE OR REPLACE FUNCTION public.increment_ai_usage(_user_id uuid, _type text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _month TEXT := to_char(now(), 'YYYY-MM');
BEGIN
  INSERT INTO ai_usage (user_id, month, text_count, image_count, image_draft_count, image_premium_count)
  VALUES (
    _user_id, _month,
    CASE WHEN _type = 'text' THEN 1 ELSE 0 END,
    CASE WHEN _type = 'image' THEN 1 ELSE 0 END,
    CASE WHEN _type = 'image_draft' THEN 1 ELSE 0 END,
    CASE WHEN _type = 'image_premium' THEN 1 ELSE 0 END
  )
  ON CONFLICT (user_id, month) DO UPDATE SET
    text_count          = ai_usage.text_count          + CASE WHEN _type = 'text' THEN 1 ELSE 0 END,
    image_count         = ai_usage.image_count         + CASE WHEN _type = 'image' THEN 1 ELSE 0 END,
    image_draft_count   = ai_usage.image_draft_count   + CASE WHEN _type = 'image_draft' THEN 1 ELSE 0 END,
    image_premium_count = ai_usage.image_premium_count + CASE WHEN _type = 'image_premium' THEN 1 ELSE 0 END;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.check_ai_quota(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_ai_usage(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_ai_quota(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_ai_usage(uuid, text) TO service_role;