DROP POLICY IF EXISTS "anyone authenticated can read active beta codes" ON public.beta_codes;

CREATE POLICY "Admins can read beta codes"
  ON public.beta_codes
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));