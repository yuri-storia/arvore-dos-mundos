ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS idriel_intro text,
  ADD COLUMN IF NOT EXISTS idriel_intro_done boolean NOT NULL DEFAULT false;