UPDATE auth.users SET email_confirmed_at = now() WHERE id = 'cb43da6e-2e4a-4e35-a4c2-ed8839315cc7';
INSERT INTO public.allowed_emails (email) VALUES ('teste@arvoredosmundos.com') ON CONFLICT DO NOTHING;
INSERT INTO public.subscriptions (user_id, plan, plan_code, status, billing_cycle, started_at, has_idriel)
VALUES ('cb43da6e-2e4a-4e35-a4c2-ed8839315cc7', 'pro', 'raiz_mensal', 'active', 'LIFETIME_COURTESY', now(), false);