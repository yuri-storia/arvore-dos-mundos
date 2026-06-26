
-- Sprint 1 P0 #1 + #2: enforce plan limits server-side + webhook observability

-- 1) Helper: user has active paid access (admin or active subscription)
CREATE OR REPLACE FUNCTION public.user_has_active_paid_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = _user_id)
      OR EXISTS (
        SELECT 1 FROM public.subscriptions
        WHERE user_id = _user_id
          AND status = 'active'
          AND (expires_at IS NULL OR expires_at > now())
      );
$$;

-- 2) Trigger: block INSERT on gated resources without paid access
CREATE OR REPLACE FUNCTION public.enforce_plan_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    RAISE EXCEPTION 'user_id obrigatório' USING ERRCODE = '22023';
  END IF;
  IF NOT public.user_has_active_paid_access(NEW.user_id) THEN
    RAISE EXCEPTION 'plan_required: assinatura ativa necessária'
      USING ERRCODE = 'P0001', HINT = 'upgrade_required';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_plan_creation_worlds ON public.worlds;
CREATE TRIGGER enforce_plan_creation_worlds
  BEFORE INSERT ON public.worlds
  FOR EACH ROW EXECUTE FUNCTION public.enforce_plan_creation();

DROP TRIGGER IF EXISTS enforce_plan_creation_codex ON public.codex_entries;
CREATE TRIGGER enforce_plan_creation_codex
  BEFORE INSERT ON public.codex_entries
  FOR EACH ROW EXECUTE FUNCTION public.enforce_plan_creation();

-- Nota: chapters NÃO é gated — usuário com plano expirado mantém acesso ao
-- manuscrito existente (alinhado com canWrite=true em usePlanLimits).

-- 3) Webhook observability table
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  event_type text NOT NULL,
  external_id text,
  user_id uuid,
  status text NOT NULL DEFAULT 'received',
  error_message text,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

GRANT SELECT ON public.webhook_events TO authenticated;
GRANT ALL ON public.webhook_events TO service_role;

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view webhook events" ON public.webhook_events;
CREATE POLICY "Admins view webhook events"
  ON public.webhook_events FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_webhook_events_status
  ON public.webhook_events(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_events_source
  ON public.webhook_events(source, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_events_external
  ON public.webhook_events(external_id);
