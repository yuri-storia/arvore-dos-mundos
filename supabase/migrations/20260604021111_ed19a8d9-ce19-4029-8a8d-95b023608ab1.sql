REVOKE EXECUTE ON FUNCTION public.add_bonus_drops(uuid, int) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.add_bonus_drops(uuid, int) FROM anon;
REVOKE EXECUTE ON FUNCTION public.add_bonus_drops(uuid, int) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.add_bonus_drops(uuid, int) TO service_role;

REVOKE EXECUTE ON FUNCTION public.increment_ai_usage(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_ai_usage(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_ai_usage(uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.increment_ai_usage(uuid, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.check_ai_quota(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_ai_quota(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_ai_quota(uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.check_ai_quota(uuid, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.admin_user_aggregates() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_user_aggregates() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_user_aggregates() TO authenticated;