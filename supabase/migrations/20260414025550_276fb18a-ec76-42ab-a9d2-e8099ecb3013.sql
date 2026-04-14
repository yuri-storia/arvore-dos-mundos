ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS content text DEFAULT '';
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS word_count integer DEFAULT 0;