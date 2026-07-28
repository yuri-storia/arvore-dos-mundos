ALTER TABLE public.world_analyses
  DROP COLUMN IF EXISTS covered_fruits,
  DROP COLUMN IF EXISTS ficha_count,
  DROP COLUMN IF EXISTS artigo_count;