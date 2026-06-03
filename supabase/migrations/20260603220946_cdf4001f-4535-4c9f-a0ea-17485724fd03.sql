
ALTER TABLE public.bug_reports
  ADD COLUMN IF NOT EXISTS attachment_path TEXT,
  ADD COLUMN IF NOT EXISTS attachment_type TEXT;

-- Storage policies for bug-attachments bucket
CREATE POLICY "Authenticated users can upload own bug attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'bug-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can read own bug attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'bug-attachments'
  AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin(auth.uid()))
);

CREATE POLICY "Admins can delete bug attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'bug-attachments' AND public.is_admin(auth.uid()));
