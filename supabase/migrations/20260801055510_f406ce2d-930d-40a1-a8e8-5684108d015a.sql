ALTER TABLE public.ai_usage ADD COLUMN IF NOT EXISTS extra_cost INT NOT NULL DEFAULT 0;

DROP FUNCTION IF EXISTS public.check_ai_quota(uuid, text);
DROP FUNCTION IF EXISTS public.increment_ai_usage(uuid, text);

CREATE OR REPLACE FUNCTION public.check_ai_quota(_user_id uuid, _type text, _cost_override int DEFAULT NULL)
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
  _extra_cost INT;
  _monthly_used INT;
  _monthly_limit INT := 150;
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

  _cost := COALESCE(_cost_override,
    CASE _type WHEN 'text' THEN 1 WHEN 'image_draft' THEN 2 WHEN 'image' THEN 5 WHEN 'image_premium' THEN 15 ELSE 5 END);
  IF _cost < 1 THEN _cost := 1; END IF;

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

  SELECT text_count, image_count, image_draft_count, image_premium_count, extra_cost
    INTO _text_count, _image_count, _image_draft_count, _image_premium_count, _extra_cost
  FROM ai_usage
  WHERE user_id = _user_id AND month = _month;

  _text_count := COALESCE(_text_count, 0);
  _image_count := COALESCE(_image_count, 0);
  _image_draft_count := COALESCE(_image_draft_count, 0);
  _image_premium_count := COALESCE(_image_premium_count, 0);
  _extra_cost := COALESCE(_extra_cost, 0);

  _monthly_used := _text_count + (_image_draft_count * 2) + (_image_count * 5) + (_image_premium_count * 15) + _extra_cost;
  _monthly_used := GREATEST(_monthly_used, 0);

  _total_available := GREATEST(_monthly_limit - _monthly_used, 0) + _bonus;

  IF _cost > _total_available THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'credit_limit_reached', 'used', _monthly_used, 'limit', _monthly_limit, 'bonus_drops', _bonus);
  END IF;

  RETURN jsonb_build_object('allowed', true, 'credits_used', _monthly_used, 'credit_limit', _monthly_limit, 'bonus_drops', _bonus, 'total_available', _total_available, 'cost', _cost);
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_ai_usage(_user_id uuid, _type text, _cost_override int DEFAULT NULL)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _month TEXT := to_char(now(), 'YYYY-MM');
  _base INT := CASE _type
    WHEN 'text' THEN 1
    WHEN 'image_draft' THEN 2
    WHEN 'image' THEN 5
    WHEN 'image_premium' THEN 15
    ELSE 1
  END;
  _cost INT := GREATEST(COALESCE(_cost_override, _base), 1);
  _text_count INT; _image_count INT; _image_draft_count INT; _image_premium_count INT; _extra_cost INT;
  _monthly_used INT;
  _monthly_limit INT := 150;
  _monthly_remaining INT;
  _from_monthly INT;
  _from_bonus INT;
  _delta_extra INT;
  _new_balance INT;
BEGIN
  -- Admin: registra consumo mas não debita bônus.
  IF EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = _user_id) THEN
    INSERT INTO ai_usage (user_id, month, text_count, image_count, image_draft_count, image_premium_count, extra_cost)
    VALUES (_user_id, _month,
      CASE WHEN _type = 'text' THEN 1 ELSE 0 END,
      CASE WHEN _type = 'image' THEN 1 ELSE 0 END,
      CASE WHEN _type = 'image_draft' THEN 1 ELSE 0 END,
      CASE WHEN _type = 'image_premium' THEN 1 ELSE 0 END,
      _cost - _base)
    ON CONFLICT (user_id, month) DO UPDATE SET
      text_count          = ai_usage.text_count          + CASE WHEN _type = 'text' THEN 1 ELSE 0 END,
      image_count         = ai_usage.image_count         + CASE WHEN _type = 'image' THEN 1 ELSE 0 END,
      image_draft_count   = ai_usage.image_draft_count   + CASE WHEN _type = 'image_draft' THEN 1 ELSE 0 END,
      image_premium_count = ai_usage.image_premium_count + CASE WHEN _type = 'image_premium' THEN 1 ELSE 0 END,
      extra_cost          = ai_usage.extra_cost          + (_cost - _base);
    RETURN;
  END IF;

  SELECT text_count, image_count, image_draft_count, image_premium_count, extra_cost
    INTO _text_count, _image_count, _image_draft_count, _image_premium_count, _extra_cost
  FROM ai_usage WHERE user_id = _user_id AND month = _month;

  _text_count := COALESCE(_text_count,0);
  _image_count := COALESCE(_image_count,0);
  _image_draft_count := COALESCE(_image_draft_count,0);
  _image_premium_count := COALESCE(_image_premium_count,0);
  _extra_cost := COALESCE(_extra_cost,0);

  _monthly_used := GREATEST(_text_count + (_image_draft_count * 2) + (_image_count * 5) + (_image_premium_count * 15) + _extra_cost, 0);
  _monthly_remaining := GREATEST(_monthly_limit - _monthly_used, 0);

  IF EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = _user_id AND status = 'active') THEN
    _from_monthly := LEAST(_cost, _monthly_remaining);
    _from_bonus   := _cost - _from_monthly;
  ELSE
    _from_monthly := 0;
    _from_bonus   := _cost;
  END IF;

  -- Ajuste para que o consumo mensal registrado seja exatamente _from_monthly.
  _delta_extra := CASE WHEN _from_monthly > 0 THEN _from_monthly - _base ELSE 0 END;

  INSERT INTO ai_usage (user_id, month, text_count, image_count, image_draft_count, image_premium_count, extra_cost)
  VALUES (_user_id, _month,
    CASE WHEN _type = 'text' AND _from_monthly > 0 THEN 1 ELSE 0 END,
    CASE WHEN _type = 'image' AND _from_monthly > 0 THEN 1 ELSE 0 END,
    CASE WHEN _type = 'image_draft' AND _from_monthly > 0 THEN 1 ELSE 0 END,
    CASE WHEN _type = 'image_premium' AND _from_monthly > 0 THEN 1 ELSE 0 END,
    _delta_extra)
  ON CONFLICT (user_id, month) DO UPDATE SET
    text_count          = ai_usage.text_count          + CASE WHEN _type = 'text'          AND _from_monthly > 0 THEN 1 ELSE 0 END,
    image_count         = ai_usage.image_count         + CASE WHEN _type = 'image'         AND _from_monthly > 0 THEN 1 ELSE 0 END,
    image_draft_count   = ai_usage.image_draft_count   + CASE WHEN _type = 'image_draft'   AND _from_monthly > 0 THEN 1 ELSE 0 END,
    image_premium_count = ai_usage.image_premium_count + CASE WHEN _type = 'image_premium' AND _from_monthly > 0 THEN 1 ELSE 0 END,
    extra_cost          = ai_usage.extra_cost          + _delta_extra;

  IF _from_monthly > 0 THEN
    INSERT INTO public.elixir_ledger (user_id, kind, delta, reference)
    VALUES (_user_id, 'consume', -_from_monthly, _type);
  END IF;

  IF _from_bonus > 0 THEN
    UPDATE public.user_credit_balance
       SET bonus_drops = GREATEST(bonus_drops - _from_bonus, 0),
           updated_at = now()
     WHERE user_id = _user_id
     RETURNING bonus_drops INTO _new_balance;

    INSERT INTO public.elixir_ledger (user_id, kind, delta, balance_after, reference)
    VALUES (_user_id, 'consume_bonus', -_from_bonus, _new_balance, _type);
  END IF;
END;
$function$;