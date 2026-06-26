
REVOKE EXECUTE ON FUNCTION public.check_ai_quota(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_ai_usage(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(uuid, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.add_bonus_drops(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_user_aggregates() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_remove_mfa_factors(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_email_allowed(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.user_has_active_paid_access(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_set_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_plan_creation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON TABLE public.ai_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.ai_rate_limits TO service_role;

CREATE INDEX IF NOT EXISTS idx_codex_entries_world_updated
  ON public.codex_entries (world_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_worlds_user_updated
  ON public.worlds (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chapters_manuscript_sort
  ON public.chapters (manuscript_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_manuscripts_world
  ON public.manuscripts (world_id);
