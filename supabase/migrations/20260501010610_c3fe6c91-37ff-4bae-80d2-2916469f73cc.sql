
-- 1. idriel_suggestions: history of AI responses per fruit
CREATE TABLE public.idriel_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  world_id UUID NOT NULL,
  fruit_id INTEGER NOT NULL,
  question TEXT NOT NULL,
  response TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.idriel_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own idriel suggestions"
ON public.idriel_suggestions
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_idriel_suggestions_world_fruit
  ON public.idriel_suggestions (user_id, world_id, fruit_id, created_at DESC);

-- 2. storylines: groupings of customizable Kanban-like boards
CREATE TABLE public.storylines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  world_id UUID NOT NULL,
  manuscript_id UUID NULL,
  name TEXT NOT NULL DEFAULT 'Sem título',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.storylines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own storylines"
ON public.storylines
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_storylines_world ON public.storylines (user_id, world_id);

CREATE TRIGGER update_storylines_updated_at
BEFORE UPDATE ON public.storylines
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 3. storyline_columns: dynamic columns inside each storyline
CREATE TABLE public.storyline_columns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  storyline_id UUID NOT NULL REFERENCES public.storylines(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Sem título',
  sort_order INTEGER NOT NULL DEFAULT 0,
  color TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.storyline_columns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own storyline columns"
ON public.storyline_columns
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_storyline_columns_storyline
  ON public.storyline_columns (storyline_id, sort_order);

-- 4. scenes: optional link to storyline columns (kept legacy 'status' as fallback)
ALTER TABLE public.scenes
  ADD COLUMN storyline_column_id UUID NULL;

CREATE INDEX idx_scenes_storyline_column ON public.scenes (storyline_column_id);
