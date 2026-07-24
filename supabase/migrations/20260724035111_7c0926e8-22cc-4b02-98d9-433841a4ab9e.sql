
REVOKE ALL ON FUNCTION public.add_bonus_drops(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.add_bonus_drops(uuid, integer, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_content_edit() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_bonus_drops(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.add_bonus_drops(uuid, integer, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.enforce_content_edit() TO service_role;
