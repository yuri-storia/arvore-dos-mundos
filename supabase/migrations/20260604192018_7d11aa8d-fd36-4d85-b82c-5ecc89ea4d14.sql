
CREATE TABLE public.expiration_notifications_sent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subscription_id uuid NOT NULL,
  notification_type text NOT NULL CHECK (notification_type IN ('T-7','T-1','T+0')),
  expires_at timestamptz NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subscription_id, notification_type, expires_at)
);

GRANT SELECT ON public.expiration_notifications_sent TO authenticated;
GRANT ALL ON public.expiration_notifications_sent TO service_role;

ALTER TABLE public.expiration_notifications_sent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications" ON public.expiration_notifications_sent
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Service role manages all" ON public.expiration_notifications_sent
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX idx_exp_notif_sub ON public.expiration_notifications_sent(subscription_id);
