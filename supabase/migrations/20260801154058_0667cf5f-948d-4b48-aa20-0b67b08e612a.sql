CREATE TABLE public.image_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'vision',
  status TEXT NOT NULL DEFAULT 'pending',
  phase TEXT NOT NULL DEFAULT 'compiling',
  pct INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  prompt TEXT,
  error TEXT,
  cost INTEGER NOT NULL DEFAULT 0,
  quality TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.image_jobs TO authenticated;
GRANT ALL ON public.image_jobs TO service_role;

ALTER TABLE public.image_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own image jobs"
ON public.image_jobs FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_image_jobs_user_created ON public.image_jobs (user_id, created_at DESC);

CREATE TRIGGER update_image_jobs_updated_at
BEFORE UPDATE ON public.image_jobs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();