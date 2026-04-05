
-- Add status to scenes for Kanban
ALTER TABLE public.scenes 
ADD COLUMN status text NOT NULL DEFAULT 'ideia';

-- Free writings table
CREATE TABLE public.free_writings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  world_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Sem título',
  content text DEFAULT '',
  word_count integer NOT NULL DEFAULT 0,
  chapter_id uuid REFERENCES public.chapters(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.free_writings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own free writings"
ON public.free_writings
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_free_writings_updated_at
BEFORE UPDATE ON public.free_writings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
