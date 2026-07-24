
-- 1. Tabela de ledger de Elixir dos Mundos (histórico auditável)
CREATE TABLE IF NOT EXISTS public.elixir_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('recharge','consume','monthly_grant','bonus','adjustment','refund')),
  delta integer NOT NULL, -- positivo = crédito, negativo = débito
  balance_after integer,  -- pode ser NULL quando não aplicável (ex: consumos que só afetam ai_usage)
  reference text,         -- id de pagamento, tipo de IA, etc.
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_elixir_ledger_user_created
  ON public.elixir_ledger (user_id, created_at DESC);

GRANT SELECT ON public.elixir_ledger TO authenticated;
GRANT ALL ON public.elixir_ledger TO service_role;

ALTER TABLE public.elixir_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own elixir ledger" ON public.elixir_ledger;
CREATE POLICY "Users view own elixir ledger"
  ON public.elixir_ledger FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Bloqueia writes de authenticated (apenas server writes via SECURITY DEFINER)
DROP POLICY IF EXISTS "Deny authenticated insert on elixir_ledger" ON public.elixir_ledger;
CREATE POLICY "Deny authenticated insert on elixir_ledger"
  ON public.elixir_ledger AS RESTRICTIVE FOR INSERT
  TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "Deny authenticated update on elixir_ledger" ON public.elixir_ledger;
CREATE POLICY "Deny authenticated update on elixir_ledger"
  ON public.elixir_ledger AS RESTRICTIVE FOR UPDATE
  TO authenticated
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Deny authenticated delete on elixir_ledger" ON public.elixir_ledger;
CREATE POLICY "Deny authenticated delete on elixir_ledger"
  ON public.elixir_ledger AS RESTRICTIVE FOR DELETE
  TO authenticated
  USING (false);

-- 2. add_bonus_drops: também loga no ledger
CREATE OR REPLACE FUNCTION public.add_bonus_drops(_user_id uuid, _drops integer, _reference text DEFAULT NULL, _kind text DEFAULT 'recharge')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _new_balance integer;
BEGIN
  INSERT INTO public.user_credit_balance (user_id, bonus_drops)
  VALUES (_user_id, _drops)
  ON CONFLICT (user_id) DO UPDATE SET
    bonus_drops = public.user_credit_balance.bonus_drops + _drops,
    updated_at = now()
  RETURNING bonus_drops INTO _new_balance;

  INSERT INTO public.elixir_ledger (user_id, kind, delta, balance_after, reference)
  VALUES (_user_id, COALESCE(_kind,'recharge'), _drops, _new_balance, _reference);
END;
$$;

-- Overload legado (2 args) — mantém compatibilidade com chamadas antigas
CREATE OR REPLACE FUNCTION public.add_bonus_drops(_user_id uuid, _drops integer)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.add_bonus_drops(_user_id, _drops, NULL::text, 'recharge'::text);
$$;

-- 3. increment_ai_usage: registra consumo no ledger
CREATE OR REPLACE FUNCTION public.increment_ai_usage(_user_id uuid, _type text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _month TEXT := to_char(now(), 'YYYY-MM');
  _cost INT := CASE _type
    WHEN 'text' THEN 1
    WHEN 'image_draft' THEN 2
    WHEN 'image' THEN 5
    WHEN 'image_premium' THEN 15
    ELSE 1
  END;
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

  -- Log de consumo (delta negativo)
  INSERT INTO public.elixir_ledger (user_id, kind, delta, reference)
  VALUES (_user_id, 'consume', -_cost, _type);
END;
$$;

-- 4. Enforcement server-side: bloqueia UPDATE/INSERT em conteúdo quando plano inativo.
--    Só aplica para chamadas com role='authenticated' (clientes com JWT do usuário).
--    Edge functions e service_role continuam funcionando normalmente.
CREATE OR REPLACE FUNCTION public.enforce_content_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid;
  _target uuid;
BEGIN
  -- Só atua para requisições autenticadas do próprio cliente.
  IF auth.role() <> 'authenticated' THEN
    RETURN NEW;
  END IF;

  _uid := auth.uid();
  IF _uid IS NULL THEN
    RETURN NEW;
  END IF;

  -- Descobre o dono da linha (todas as tabelas usam user_id na raiz).
  BEGIN
    _target := (to_jsonb(NEW) ->> 'user_id')::uuid;
  EXCEPTION WHEN others THEN
    _target := NULL;
  END;

  -- Se a linha não pertence ao chamador, deixa RLS resolver.
  IF _target IS NOT NULL AND _target <> _uid THEN
    RETURN NEW;
  END IF;

  -- Bloqueia se não tem assinatura ativa (admins passam via user_has_active_paid_access).
  IF NOT public.user_has_active_paid_access(_uid) THEN
    RAISE EXCEPTION 'plan_required: assinatura inativa — edição bloqueada'
      USING ERRCODE = 'P0001', HINT = 'upgrade_required';
  END IF;

  RETURN NEW;
END;
$$;

-- Aplica trigger em tabelas de conteúdo (INSERT e UPDATE).
DO $$
DECLARE
  t text;
  tables text[] := ARRAY['worlds','codex_entries','chapters','manuscripts','timeline_events','storylines','storyline_cards','free_writings','scenes','map_history','idriel_visions'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Só cria se a tabela existe (some deployments podem não ter todas).
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS enforce_content_edit_ins ON public.%I', t);
      EXECUTE format('DROP TRIGGER IF EXISTS enforce_content_edit_upd ON public.%I', t);
      EXECUTE format('CREATE TRIGGER enforce_content_edit_ins BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.enforce_content_edit()', t);
      EXECUTE format('CREATE TRIGGER enforce_content_edit_upd BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.enforce_content_edit()', t);
    END IF;
  END LOOP;
END $$;

-- 5. Realtime: garante que as tabelas de status de plano/saldo publicam mudanças.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'user_credit_balance'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.user_credit_balance';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'elixir_ledger'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.elixir_ledger';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'subscriptions'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions';
  END IF;
END $$;

ALTER TABLE public.user_credit_balance REPLICA IDENTITY FULL;
ALTER TABLE public.elixir_ledger REPLICA IDENTITY FULL;
ALTER TABLE public.subscriptions REPLICA IDENTITY FULL;
