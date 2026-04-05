
CREATE TABLE public.idriel_help_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, usage_date)
);

ALTER TABLE public.idriel_help_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own help usage"
  ON public.idriel_help_usage
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages help usage"
  ON public.idriel_help_usage
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
