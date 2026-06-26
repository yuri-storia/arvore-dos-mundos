
-- Rate limit table + function (per-minute window)
CREATE TABLE IF NOT EXISTS public.ai_rate_limits (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  function_name TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, function_name, window_start)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_rate_limits TO service_role;
ALTER TABLE public.ai_rate_limits ENABLE ROW LEVEL SECURITY;
-- Only service_role accesses this; no policies for authenticated/anon.

CREATE INDEX IF NOT EXISTS ai_rate_limits_cleanup_idx ON public.ai_rate_limits (window_start);

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _user_id UUID,
  _function TEXT,
  _max_per_min INT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _window TIMESTAMPTZ := date_trunc('minute', now());
  _current INT;
BEGIN
  -- Best-effort cleanup of old windows (>10 min)
  DELETE FROM public.ai_rate_limits
   WHERE window_start < now() - interval '10 minutes';

  INSERT INTO public.ai_rate_limits (user_id, function_name, window_start, count)
  VALUES (_user_id, _function, _window, 1)
  ON CONFLICT (user_id, function_name, window_start)
  DO UPDATE SET count = public.ai_rate_limits.count + 1
  RETURNING count INTO _current;

  IF _current > _max_per_min THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'count', _current,
      'limit', _max_per_min,
      'retry_after_seconds', 60 - EXTRACT(SECOND FROM now() - _window)::int
    );
  END IF;

  RETURN jsonb_build_object('allowed', true, 'count', _current, 'limit', _max_per_min);
END;
$$;

-- Extend world_analyses fruit_scores to support justifications.
-- Schema is jsonb so no DDL needed; comment for documentation only.
COMMENT ON COLUMN public.world_analyses.fruit_scores IS
  'jsonb mapping fruit_id -> { score: 1-5, justification?: text, evidence?: text[] }';
