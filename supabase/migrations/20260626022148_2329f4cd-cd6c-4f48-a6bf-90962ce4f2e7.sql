
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(uuid, text, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(uuid, text, int) TO service_role;
