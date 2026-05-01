CREATE TABLE public.storyline_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  storyline_column_id UUID NOT NULL REFERENCES public.storyline_columns(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Sem título',
  content TEXT NOT NULL DEFAULT '',
  color TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.storyline_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own storyline cards"
ON public.storyline_cards
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_storyline_cards_column ON public.storyline_cards(storyline_column_id);
CREATE INDEX idx_storyline_cards_user ON public.storyline_cards(user_id);

CREATE TRIGGER update_storyline_cards_updated_at
BEFORE UPDATE ON public.storyline_cards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();