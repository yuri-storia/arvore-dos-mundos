
CREATE TABLE public.admin_deletion_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_user_id UUID,
  actor_email TEXT,
  target_user_id UUID,
  target_email TEXT,
  confirm_email TEXT,
  outcome TEXT NOT NULL,
  reason TEXT,
  status_code INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_deletion_audit TO authenticated;
GRANT ALL ON public.admin_deletion_audit TO service_role;
ALTER TABLE public.admin_deletion_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view deletion audit"
  ON public.admin_deletion_audit
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));
