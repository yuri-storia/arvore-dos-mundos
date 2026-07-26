
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
  _monthly_used INT;
  _monthly_limit INT := 100;
  _bonus INT;
  _total_available INT;
  _cost INT;
BEGIN
  IF EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = _user_id) THEN
    RETURN jsonb_build_object('allowed', true, 'credits_used', 0, 'credit_limit', 999999, 'admin', true);
  END IF;

  SELECT status INTO _status
  FROM subscriptions
  WHERE user_id = _user_id AND status = 'active';

  IF _status IS NULL THEN
    -- Sem plano: ainda permite se houver gotas bônus (recarga avulsa)
    SELECT COALESCE(bonus_drops, 0) INTO _bonus FROM public.user_credit_balance WHERE user_id = _user_id;
    _bonus := COALESCE(_bonus, 0);
    _cost := CASE _type WHEN 'text' THEN 1 WHEN 'image_draft' THEN 2 WHEN 'image' THEN 5 WHEN 'image_premium' THEN 15 ELSE 5 END;
    IF _bonus >= _cost THEN
      RETURN jsonb_build_object('allowed', true, 'credits_used', 0, 'credit_limit', _bonus, 'bonus_drops', _bonus, 'source', 'bonus');
    END IF;
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

  _monthly_used := _text_count
                 + (_image_draft_count * 2)
                 + (_image_count * 5)
                 + (_image_premium_count * 15);

  SELECT COALESCE(bonus_drops, 0) INTO _bonus FROM public.user_credit_balance WHERE user_id = _user_id;
  _bonus := COALESCE(_bonus, 0);

  _cost := CASE _type
    WHEN 'text' THEN 1
    WHEN 'image_draft' THEN 2
    WHEN 'image' THEN 5
    WHEN 'image_premium' THEN 15
    ELSE 5
  END;

  -- Total disponível = (limite mensal - já consumido) + saldo bônus
  _total_available := GREATEST(_monthly_limit - _monthly_used, 0) + _bonus;

  IF _cost > _total_available THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'credit_limit_reached',
      'used', _monthly_used,
      'limit', _monthly_limit,
      'bonus_drops', _bonus
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'credits_used', _monthly_used,
    'credit_limit', _monthly_limit,
    'bonus_drops', _bonus,
    'total_available', _total_available
  );
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
  _cost INT := CASE _type
    WHEN 'text' THEN 1
    WHEN 'image_draft' THEN 2
    WHEN 'image' THEN 5
    WHEN 'image_premium' THEN 15
    ELSE 1
  END;
  _text_count INT; _image_count INT; _image_draft_count INT; _image_premium_count INT;
  _monthly_used INT;
  _monthly_limit INT := 100;
  _monthly_remaining INT;
  _from_monthly INT;
  _from_bonus INT;
  _new_balance INT;
BEGIN
  -- Admin: registra consumo mas não debita bônus.
  IF EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = _user_id) THEN
    INSERT INTO ai_usage (user_id, month, text_count, image_count, image_draft_count, image_premium_count)
    VALUES (_user_id, _month,
      CASE WHEN _type = 'text' THEN 1 ELSE 0 END,
      CASE WHEN _type = 'image' THEN 1 ELSE 0 END,
      CASE WHEN _type = 'image_draft' THEN 1 ELSE 0 END,
      CASE WHEN _type = 'image_premium' THEN 1 ELSE 0 END)
    ON CONFLICT (user_id, month) DO UPDATE SET
      text_count          = ai_usage.text_count          + CASE WHEN _type = 'text' THEN 1 ELSE 0 END,
      image_count         = ai_usage.image_count         + CASE WHEN _type = 'image' THEN 1 ELSE 0 END,
      image_draft_count   = ai_usage.image_draft_count   + CASE WHEN _type = 'image_draft' THEN 1 ELSE 0 END,
      image_premium_count = ai_usage.image_premium_count + CASE WHEN _type = 'image_premium' THEN 1 ELSE 0 END;
    RETURN;
  END IF;

  SELECT text_count, image_count, image_draft_count, image_premium_count
    INTO _text_count, _image_count, _image_draft_count, _image_premium_count
  FROM ai_usage WHERE user_id = _user_id AND month = _month;

  _text_count := COALESCE(_text_count,0);
  _image_count := COALESCE(_image_count,0);
  _image_draft_count := COALESCE(_image_draft_count,0);
  _image_premium_count := COALESCE(_image_premium_count,0);

  _monthly_used := _text_count + (_image_draft_count * 2) + (_image_count * 5) + (_image_premium_count * 15);
  _monthly_remaining := GREATEST(_monthly_limit - _monthly_used, 0);

  -- Usa primeiro o mensal, depois o bônus (só desconta bônus se realmente houver plano ativo — sem plano, o custo total já é bônus)
  IF EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = _user_id AND status = 'active') THEN
    _from_monthly := LEAST(_cost, _monthly_remaining);
    _from_bonus   := _cost - _from_monthly;
  ELSE
    _from_monthly := 0;
    _from_bonus   := _cost;
  END IF;

  -- Contabiliza no ai_usage apenas a parte coberta pelo mensal (mantém o teto mensal fiel).
  -- Para simplicidade, quando parte do custo vai pro bônus, ainda gravamos a operação inteira
  -- (mantém histórico de "quantas gerações"), mas o débito extra sai do saldo bônus.
  INSERT INTO ai_usage (user_id, month, text_count, image_count, image_draft_count, image_premium_count)
  VALUES (_user_id, _month,
    CASE WHEN _type = 'text' AND _from_monthly > 0 THEN 1 ELSE 0 END,
    CASE WHEN _type = 'image' AND _from_monthly > 0 THEN 1 ELSE 0 END,
    CASE WHEN _type = 'image_draft' AND _from_monthly > 0 THEN 1 ELSE 0 END,
    CASE WHEN _type = 'image_premium' AND _from_monthly > 0 THEN 1 ELSE 0 END)
  ON CONFLICT (user_id, month) DO UPDATE SET
    text_count          = ai_usage.text_count          + CASE WHEN _type = 'text'          AND _from_monthly > 0 THEN 1 ELSE 0 END,
    image_count         = ai_usage.image_count         + CASE WHEN _type = 'image'         AND _from_monthly > 0 THEN 1 ELSE 0 END,
    image_draft_count   = ai_usage.image_draft_count   + CASE WHEN _type = 'image_draft'   AND _from_monthly > 0 THEN 1 ELSE 0 END,
    image_premium_count = ai_usage.image_premium_count + CASE WHEN _type = 'image_premium' AND _from_monthly > 0 THEN 1 ELSE 0 END;

  -- Log do débito do pacote mensal (delta negativo, sem alterar saldo bônus)
  IF _from_monthly > 0 THEN
    INSERT INTO public.elixir_ledger (user_id, kind, delta, reference)
    VALUES (_user_id, 'consume', -_from_monthly, _type);
  END IF;

  -- Debita bônus quando necessário
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
