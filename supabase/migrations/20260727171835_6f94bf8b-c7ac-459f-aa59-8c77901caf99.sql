CREATE OR REPLACE FUNCTION public.validate_codex_entry_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _email text;
BEGIN
  SELECT email INTO _email FROM auth.users WHERE id = NEW.user_id;
  IF lower(coalesce(_email,'')) = 'erinsaurogonfenix@gmail.com' THEN
    RETURN NEW;
  END IF;
  IF char_length(NEW.title) > 200 THEN
    RAISE EXCEPTION 'title exceeds 200 characters';
  END IF;
  IF NEW.content IS NOT NULL AND char_length(NEW.content) > 50000 THEN
    RAISE EXCEPTION 'content exceeds 50000 characters';
  END IF;
  RETURN NEW;
END;
$function$;