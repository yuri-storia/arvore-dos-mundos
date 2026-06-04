
CREATE OR REPLACE FUNCTION public.admin_remove_mfa_factors(_user_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  DELETE FROM auth.mfa_factors WHERE user_id = _user_id;
$$;

REVOKE ALL ON FUNCTION public.admin_remove_mfa_factors(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_remove_mfa_factors(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.admin_remove_mfa_factors(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_remove_mfa_factors(uuid) TO service_role;
