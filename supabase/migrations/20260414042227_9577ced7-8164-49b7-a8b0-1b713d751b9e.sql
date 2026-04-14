-- 1. Deny UPDATE on allowed_emails for authenticated users
CREATE POLICY "Deny direct allowed_emails updates"
ON public.allowed_emails FOR UPDATE
TO authenticated
USING (false);

-- 2. Fix public bucket listing: drop the overly broad SELECT policy and replace with owner-scoped one
DROP POLICY IF EXISTS "Codex images are publicly accessible" ON storage.objects;

CREATE POLICY "Users can view own codex images"
ON storage.objects FOR SELECT
USING (bucket_id = 'codex-images' AND auth.uid()::text = (storage.foldername(name))[1]);