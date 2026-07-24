CREATE TABLE public.gallery_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  world_id uuid NOT NULL REFERENCES public.worlds(id) ON DELETE CASCADE,
  folder_key text NOT NULL DEFAULT 'Geral',
  src text NOT NULL,
  name text NOT NULL DEFAULT 'Sem título',
  status text NOT NULL DEFAULT 'kept',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gallery_images TO authenticated;
GRANT ALL ON public.gallery_images TO service_role;

ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gallery_images_owner_all"
  ON public.gallery_images
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX gallery_images_world_created_idx
  ON public.gallery_images (world_id, created_at DESC);

CREATE INDEX gallery_images_user_idx
  ON public.gallery_images (user_id);

CREATE TRIGGER trg_gallery_images_updated
  BEFORE UPDATE ON public.gallery_images
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill a partir de worlds.gallery (mantém o JSONB original como backup)
INSERT INTO public.gallery_images (user_id, world_id, folder_key, src, name, status, position, created_at)
SELECT
  w.user_id,
  w.id,
  COALESCE(NULLIF(g.value->>'cat',''), 'Geral'),
  g.value->>'src',
  COALESCE(NULLIF(g.value->>'name',''), 'Sem título'),
  COALESCE(NULLIF(g.value->>'status',''), 'kept'),
  g.ordinality::int,
  now() - (g.ordinality || ' seconds')::interval
FROM public.worlds w
CROSS JOIN LATERAL jsonb_array_elements(
  CASE WHEN jsonb_typeof(w.gallery) = 'array' THEN w.gallery ELSE '[]'::jsonb END
) WITH ORDINALITY AS g(value, ordinality)
WHERE g.value->>'src' IS NOT NULL;