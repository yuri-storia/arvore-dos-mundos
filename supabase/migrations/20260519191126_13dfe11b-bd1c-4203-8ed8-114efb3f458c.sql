CREATE TABLE public.bug_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 5 AND 4000),
  context TEXT,
  route TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can submit bug reports"
ON public.bug_reports FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Admins can read bug reports"
ON public.bug_reports FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update bug reports"
ON public.bug_reports FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete bug reports"
ON public.bug_reports FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE INDEX idx_bug_reports_created_at ON public.bug_reports (created_at DESC);