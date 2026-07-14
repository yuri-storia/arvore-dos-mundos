
DO $$
DECLARE
  _uid uuid;
  _emails text[] := ARRAY['kletic84@gmail.com','thikaywn@gmail.com'];
  _e text;
BEGIN
  FOREACH _e IN ARRAY _emails LOOP
    SELECT id INTO _uid FROM auth.users WHERE lower(email) = lower(_e) LIMIT 1;
    IF _uid IS NOT NULL THEN
      UPDATE public.subscriptions
         SET status = 'cancelled', cancelled_at = now()
       WHERE user_id = _uid AND status = 'active';
      DELETE FROM auth.users WHERE id = _uid;
    END IF;
  END LOOP;
END $$;
