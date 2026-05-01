CREATE TABLE public.idriel_visions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  world_id UUID NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  prompt TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  style TEXT,
  image_type TEXT,
  tone TEXT,
  extras TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.idriel_visions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own idriel visions"
ON public.idriel_visions
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_idriel_visions_world ON public.idriel_visions(world_id, created_at DESC);