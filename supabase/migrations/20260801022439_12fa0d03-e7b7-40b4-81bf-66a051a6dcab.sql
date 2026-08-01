ALTER TABLE public.elixir_ledger DROP CONSTRAINT IF EXISTS elixir_ledger_kind_check;
ALTER TABLE public.elixir_ledger ADD CONSTRAINT elixir_ledger_kind_check
  CHECK (kind = ANY (ARRAY['recharge','consume','monthly_grant','bonus','bonus_criador','adjustment','refund']));

CREATE OR REPLACE FUNCTION public.check_ai_quota(_user_id uuid, _type text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _status TEXT;
  _has_idriel BOOLEAN;
  _month TEXT;
  _text_count INT;
  _image_count INT;
  _image_draft_count INT;
  _image_premium_count INT;
  _monthly_used INT;
  _monthly_limit INT := 100;
  _bonus INT;
  _total_available INT;
  _cost INT;
BEGIN
  IF EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = _user_id) THEN
    RETURN jsonb_build_object('allowed', true, 'credits_used', 0, 'credit_limit', 999999, 'admin', true);
  END IF;

  SELECT status, has_idriel INTO _status, _has_idriel
  FROM subscriptions
  WHERE user_id = _user_id AND status = 'active';

  _cost := CASE _type WHEN 'text' THEN 1 WHEN 'image_draft' THEN 2 WHEN 'image' THEN 5 WHEN 'image_premium' THEN 15 ELSE 5 END;

  SELECT COALESCE(bonus_drops, 0) INTO _bonus FROM public.user_credit_balance WHERE user_id = _user_id;
  _bonus := COALESCE(_bonus, 0);

  IF _status IS NULL THEN
    IF _bonus >= _cost THEN
      RETURN jsonb_build_object('allowed', true, 'credits_used', 0, 'credit_limit', _bonus, 'bonus_drops', _bonus, 'source', 'bonus');
    END IF;
    RETURN jsonb_build_object('allowed', false, 'reason', 'no_subscription');
  END IF;

  IF NOT COALESCE(_has_idriel, false) THEN
    IF _bonus >= _cost THEN
      RETURN jsonb_build_object('allowed', true, 'credits_used', 0, 'credit_limit', _bonus, 'bonus_drops', _bonus, 'total_available', _bonus, 'source', 'bonus');
    END IF;
    RETURN jsonb_build_object('allowed', false, 'reason', 'credit_limit_reached', 'used', 0, 'limit', 0, 'bonus_drops', _bonus);
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

  _monthly_used := _text_count + (_image_draft_count * 2) + (_image_count * 5) + (_image_premium_count * 15);

  _total_available := GREATEST(_monthly_limit - _monthly_used, 0) + _bonus;

  IF _cost > _total_available THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'credit_limit_reached', 'used', _monthly_used, 'limit', _monthly_limit, 'bonus_drops', _bonus);
  END IF;

  RETURN jsonb_build_object('allowed', true, 'credits_used', _monthly_used, 'credit_limit', _monthly_limit, 'bonus_drops', _bonus, 'total_available', _total_available);
END;
$function$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT s.user_id FROM public.subscriptions s
    WHERE s.status = 'active' AND COALESCE(s.has_idriel, false) = false
      AND NOT EXISTS (
        SELECT 1 FROM public.elixir_ledger e
        WHERE e.user_id = s.user_id AND e.kind = 'bonus_criador'
      )
  LOOP
    PERFORM public.add_bonus_drops(r.user_id, 5, 'cortesia_criador', 'bonus_criador');
  END LOOP;
END $$;