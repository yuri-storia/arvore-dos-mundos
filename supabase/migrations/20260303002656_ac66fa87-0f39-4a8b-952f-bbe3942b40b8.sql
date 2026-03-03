
-- Validation trigger for profiles.display_name
CREATE OR REPLACE FUNCTION public.validate_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.display_name IS NOT NULL AND char_length(NEW.display_name) > 100 THEN
    RAISE EXCEPTION 'display_name exceeds 100 characters';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_profile_fields
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.validate_profile_fields();

-- Validation trigger for worlds.name
CREATE OR REPLACE FUNCTION public.validate_world_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF char_length(NEW.name) > 200 THEN
    RAISE EXCEPTION 'world name exceeds 200 characters';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_world_fields
BEFORE INSERT OR UPDATE ON public.worlds
FOR EACH ROW EXECUTE FUNCTION public.validate_world_fields();

-- Validation trigger for codex_entries.title and content
CREATE OR REPLACE FUNCTION public.validate_codex_entry_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF char_length(NEW.title) > 200 THEN
    RAISE EXCEPTION 'title exceeds 200 characters';
  END IF;
  IF NEW.content IS NOT NULL AND char_length(NEW.content) > 50000 THEN
    RAISE EXCEPTION 'content exceeds 50000 characters';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_codex_entry_fields
BEFORE INSERT OR UPDATE ON public.codex_entries
FOR EACH ROW EXECUTE FUNCTION public.validate_codex_entry_fields();
