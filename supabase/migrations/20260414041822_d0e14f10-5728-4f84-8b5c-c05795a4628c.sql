-- Explicitly deny any client-side INSERT into admin_users
CREATE POLICY "Deny direct admin inserts"
ON public.admin_users FOR INSERT
TO authenticated
WITH CHECK (false);

-- Explicitly deny any client-side DELETE from admin_users
CREATE POLICY "Deny direct admin deletes"
ON public.admin_users FOR DELETE
TO authenticated
USING (false);

-- Explicitly deny any client-side UPDATE on admin_users
CREATE POLICY "Deny direct admin updates"
ON public.admin_users FOR UPDATE
TO authenticated
USING (false);