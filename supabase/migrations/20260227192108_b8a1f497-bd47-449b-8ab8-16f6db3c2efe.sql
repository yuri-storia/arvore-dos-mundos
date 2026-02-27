
-- Storage bucket for codex images
INSERT INTO storage.buckets (id, name, public) VALUES ('codex-images', 'codex-images', true);

-- Allow authenticated users to upload their own images
CREATE POLICY "Users can upload codex images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'codex-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to update their own images
CREATE POLICY "Users can update own codex images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'codex-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to delete their own images
CREATE POLICY "Users can delete own codex images"
ON storage.objects FOR DELETE
USING (bucket_id = 'codex-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Public read access for codex images
CREATE POLICY "Codex images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'codex-images');

-- Codex entries table
CREATE TABLE public.codex_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Sem título',
  content TEXT DEFAULT '',
  image_url TEXT,
  entry_type TEXT NOT NULL DEFAULT 'personagem',
  fruit_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.codex_entries ENABLE ROW LEVEL SECURITY;

-- Users can view their own entries
CREATE POLICY "Users can view own codex entries"
ON public.codex_entries FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own entries
CREATE POLICY "Users can create codex entries"
ON public.codex_entries FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own entries
CREATE POLICY "Users can update own codex entries"
ON public.codex_entries FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own entries
CREATE POLICY "Users can delete own codex entries"
ON public.codex_entries FOR DELETE
USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE TRIGGER update_codex_entries_updated_at
BEFORE UPDATE ON public.codex_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_profiles_updated_at();
