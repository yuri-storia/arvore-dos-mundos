
CREATE TABLE public.timeline_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  world_id uuid NOT NULL REFERENCES public.worlds(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  era_label text,
  event_type text NOT NULL DEFAULT 'fato',
  sort_index double precision NOT NULL DEFAULT 0,
  codex_entry_id uuid REFERENCES public.codex_entries(id) ON DELETE SET NULL,
  fruit_id integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.timeline_events TO authenticated;
GRANT ALL ON public.timeline_events TO service_role;

ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own timeline select" ON public.timeline_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own timeline insert" ON public.timeline_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own timeline update" ON public.timeline_events FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own timeline delete" ON public.timeline_events FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX timeline_events_world_idx ON public.timeline_events(world_id, sort_index);
CREATE INDEX timeline_events_codex_entry_idx ON public.timeline_events(codex_entry_id);

CREATE OR REPLACE FUNCTION public.validate_timeline_event_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF char_length(NEW.title) > 200 THEN
    RAISE EXCEPTION 'title exceeds 200 characters';
  END IF;
  IF NEW.description IS NOT NULL AND char_length(NEW.description) > 10000 THEN
    RAISE EXCEPTION 'description exceeds 10000 characters';
  END IF;
  IF NEW.era_label IS NOT NULL AND char_length(NEW.era_label) > 120 THEN
    RAISE EXCEPTION 'era_label exceeds 120 characters';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER timeline_events_validate
BEFORE INSERT OR UPDATE ON public.timeline_events
FOR EACH ROW EXECUTE FUNCTION public.validate_timeline_event_fields();

CREATE TRIGGER timeline_events_updated_at
BEFORE UPDATE ON public.timeline_events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
