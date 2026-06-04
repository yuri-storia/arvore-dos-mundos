
-- 1) Prevent is_admin enumeration: only allow checking own uid (or service_role)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Block enumeration: authenticated callers may only check their own uid.
  -- RLS policies invoking is_admin(auth.uid()) keep working.
  IF auth.uid() IS NOT NULL
     AND auth.role() = 'authenticated'
     AND _user_id <> auth.uid() THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = _user_id
  );
END;
$$;

-- Tighten EXECUTE: keep authenticated (RLS + AuthContext rely on it) but revoke public/anon
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO service_role;

-- 2) Allow users to read their own bug reports
CREATE POLICY "Users can read own bug reports"
  ON public.bug_reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 3) profiles: explicit hardening — no anon access at all
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.profiles FROM PUBLIC;
