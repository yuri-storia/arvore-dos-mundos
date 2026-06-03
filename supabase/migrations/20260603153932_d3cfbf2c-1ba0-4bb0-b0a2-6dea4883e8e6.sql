-- Fix DEFINER_OR_RPC_BYPASS: revoke public execute on internal SECURITY DEFINER functions
-- These are only called from edge functions using the service role, which bypasses GRANTs.
REVOKE EXECUTE ON FUNCTION public.increment_ai_usage(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_ai_quota(uuid, text) FROM PUBLIC, anon, authenticated;

-- Fix PUBLIC_ROLE_DATA_EXPOSURE: scope policies to authenticated role only
DROP POLICY IF EXISTS "Users manage own manuscripts" ON public.manuscripts;
CREATE POLICY "Users manage own manuscripts" ON public.manuscripts
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own chapters" ON public.chapters;
CREATE POLICY "Users manage own chapters" ON public.chapters
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own scenes" ON public.scenes;
CREATE POLICY "Users manage own scenes" ON public.scenes
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own free writings" ON public.free_writings;
CREATE POLICY "Users manage own free writings" ON public.free_writings
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
