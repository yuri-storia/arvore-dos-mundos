ALTER TABLE public.timeline_events ADD COLUMN IF NOT EXISTS year TEXT;

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
  IF NEW.year IS NOT NULL AND char_length(NEW.year) > 60 THEN
    RAISE EXCEPTION 'year exceeds 60 characters';
  END IF;
  RETURN NEW;
END;
$$;