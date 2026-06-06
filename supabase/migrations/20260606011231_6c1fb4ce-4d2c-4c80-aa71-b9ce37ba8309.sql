
-- Explicit deny for authenticated writes on beta_codes
CREATE POLICY "Deny authenticated insert on beta_codes"
  ON public.beta_codes AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (false);
CREATE POLICY "Deny authenticated update on beta_codes"
  ON public.beta_codes AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (false) WITH CHECK (false);
CREATE POLICY "Deny authenticated delete on beta_codes"
  ON public.beta_codes AS RESTRICTIVE FOR DELETE TO authenticated
  USING (false);

-- Explicit deny for authenticated writes on user_credit_balance
CREATE POLICY "Deny authenticated insert on user_credit_balance"
  ON public.user_credit_balance AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (false);
CREATE POLICY "Deny authenticated update on user_credit_balance"
  ON public.user_credit_balance AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (false) WITH CHECK (false);
CREATE POLICY "Deny authenticated delete on user_credit_balance"
  ON public.user_credit_balance AS RESTRICTIVE FOR DELETE TO authenticated
  USING (false);
