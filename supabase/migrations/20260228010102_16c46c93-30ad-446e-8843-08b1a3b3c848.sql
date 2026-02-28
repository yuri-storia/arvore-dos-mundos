
-- Create worlds table to persist user worldbuilding progress
CREATE TABLE public.worlds (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Mundo Sem Nome',
  method text NOT NULL DEFAULT 'top-down',
  db jsonb NOT NULL DEFAULT '{}'::jsonb,
  gallery jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.worlds ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own worlds"
ON public.worlds FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own worlds"
ON public.worlds FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own worlds"
ON public.worlds FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own worlds"
ON public.worlds FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_worlds_updated_at
BEFORE UPDATE ON public.worlds
FOR EACH ROW
EXECUTE FUNCTION public.update_profiles_updated_at();
