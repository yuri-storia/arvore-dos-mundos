
CREATE TABLE public.beta_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  label TEXT,
  max_uses INTEGER NOT NULL DEFAULT 100,
  uses_count INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.beta_codes TO authenticated;
GRANT ALL ON public.beta_codes TO service_role;
ALTER TABLE public.beta_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone authenticated can read active beta codes"
  ON public.beta_codes FOR SELECT
  TO authenticated
  USING (active = true);

CREATE TABLE public.beta_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  code TEXT NOT NULL REFERENCES public.beta_codes(code) ON DELETE RESTRICT,
  raiz_granted_until TIMESTAMPTZ NOT NULL,
  idriel_discount_until TIMESTAMPTZ NOT NULL,
  idriel_charges_used INTEGER NOT NULL DEFAULT 0,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.beta_redemptions TO authenticated;
GRANT ALL ON public.beta_redemptions TO service_role;
ALTER TABLE public.beta_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users can read their own beta redemption"
  ON public.beta_redemptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Código inicial para distribuir à comunidade
INSERT INTO public.beta_codes (code, label, max_uses, expires_at)
VALUES ('COMUNIDADE2026', 'Beta — Comunidade 2026', 500, now() + interval '180 days')
ON CONFLICT (code) DO NOTHING;
