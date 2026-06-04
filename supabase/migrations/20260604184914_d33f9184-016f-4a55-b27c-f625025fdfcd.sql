
-- 2FA Audit log
CREATE TABLE public.mfa_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'enrolled', 'unenrolled', 'challenge_success', 'challenge_failed',
    'backup_codes_generated', 'backup_code_used', 'recovery_factor_removed'
  )),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX mfa_audit_log_user_idx ON public.mfa_audit_log (user_id, created_at DESC);

GRANT SELECT, INSERT ON public.mfa_audit_log TO authenticated;
GRANT ALL ON public.mfa_audit_log TO service_role;

ALTER TABLE public.mfa_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own MFA audit log"
  ON public.mfa_audit_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert their own MFA audit events"
  ON public.mfa_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 2FA Backup codes (hashed)
CREATE TABLE public.mfa_backup_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX mfa_backup_codes_user_idx ON public.mfa_backup_codes (user_id);
CREATE UNIQUE INDEX mfa_backup_codes_hash_unique ON public.mfa_backup_codes (user_id, code_hash);

-- Users can only see metadata (count, used status) — never insert/update from client.
-- All write operations go through edge functions with service role.
GRANT SELECT ON public.mfa_backup_codes TO authenticated;
GRANT ALL ON public.mfa_backup_codes TO service_role;

ALTER TABLE public.mfa_backup_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own backup code metadata"
  ON public.mfa_backup_codes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
