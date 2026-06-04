-- Adicionar world_id em world_analyses para escopar análises por mundo
ALTER TABLE public.world_analyses
  ADD COLUMN IF NOT EXISTS world_id uuid REFERENCES public.worlds(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_world_analyses_world_id
  ON public.world_analyses(world_id);
