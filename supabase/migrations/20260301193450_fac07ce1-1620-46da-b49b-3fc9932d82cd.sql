-- Revoke client-side access to increment_ai_usage to prevent quota manipulation
REVOKE EXECUTE ON FUNCTION public.increment_ai_usage FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_ai_usage FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_ai_usage FROM public;

-- Only service_role (used by edge functions) should call this
GRANT EXECUTE ON FUNCTION public.increment_ai_usage TO service_role;