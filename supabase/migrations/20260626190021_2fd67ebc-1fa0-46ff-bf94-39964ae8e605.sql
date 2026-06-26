
CREATE TABLE public.idriel_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  world_id uuid NOT NULL REFERENCES public.worlds(id) ON DELETE CASCADE,
  source_kind text NOT NULL CHECK (source_kind IN ('pdf','docx','txt','md','texto')),
  source_name text NOT NULL,
  source_size integer NOT NULL DEFAULT 0,
  storage_path text,
  pasted_text text,
  suggestions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '60 days')
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.idriel_imports TO authenticated;
GRANT ALL ON public.idriel_imports TO service_role;

ALTER TABLE public.idriel_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own imports"
  ON public.idriel_imports FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idriel_imports_world_idx ON public.idriel_imports(world_id, created_at DESC);
CREATE INDEX idriel_imports_user_idx ON public.idriel_imports(user_id, created_at DESC);

CREATE TRIGGER trg_idriel_imports_updated_at
  BEFORE UPDATE ON public.idriel_imports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage RLS for bucket 'idriel-imports' — owner-only access by folder=user_id
CREATE POLICY "Users read own idriel imports"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'idriel-imports' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users upload own idriel imports"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'idriel-imports' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users update own idriel imports"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'idriel-imports' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users delete own idriel imports"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'idriel-imports' AND (storage.foldername(name))[1] = auth.uid()::text);
