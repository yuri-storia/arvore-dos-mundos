
CREATE TABLE public.map_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  world_id UUID NOT NULL REFERENCES public.worlds(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  style TEXT NOT NULL,
  style_label TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX map_history_world_created_idx ON public.map_history (world_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.map_history TO authenticated;
GRANT ALL ON public.map_history TO service_role;
ALTER TABLE public.map_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own map history" ON public.map_history FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
