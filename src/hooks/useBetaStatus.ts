import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface BetaStatus {
  loading: boolean;
  hasBeta: boolean;
  raizGrantedUntil: string | null;
  idrielDiscountUntil: string | null;
  idrielChargesUsed: number;
  idrielChargesLeft: number;
  daysLeft: number;        // days remaining on Raiz beta (>=0)
  raizExpired: boolean;    // raiz beta period ended
  promoStillValid: boolean; // pode resgatar Idriel a R$ 19,90/mês x 3
  promoDaysLeft: number;   // dias restantes da janela de resgate (após Raiz expirar)
  promoExpired: boolean;   // janela de 7 dias terminou sem resgate
}

const EMPTY: BetaStatus = {
  loading: true,
  hasBeta: false,
  raizGrantedUntil: null,
  idrielDiscountUntil: null,
  idrielChargesUsed: 0,
  idrielChargesLeft: 0,
  daysLeft: 0,
  raizExpired: false,
  promoStillValid: false,
  promoDaysLeft: 0,
  promoExpired: false,
};

function diffDays(target: Date): number {
  const ms = target.getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

export function useBetaStatus(): BetaStatus {
  const { user } = useAuth();
  const [status, setStatus] = useState<BetaStatus>(EMPTY);

  const fetchStatus = useCallback(async () => {
    if (!user) {
      setStatus({ ...EMPTY, loading: false });
      return;
    }
    const { data } = await supabase
      .from('beta_redemptions')
      .select('raiz_granted_until, idriel_discount_until, idriel_charges_used')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!data) {
      setStatus({ ...EMPTY, loading: false });
      return;
    }

    const raizUntil = new Date(data.raiz_granted_until);
    const idrielUntil = new Date(data.idriel_discount_until);
    const now = new Date();
    const used = data.idriel_charges_used || 0;

    const raizExpired = raizUntil.getTime() < now.getTime();
    const promoStillValid = idrielUntil.getTime() > now.getTime() && used < 3;
    setStatus({
      loading: false,
      hasBeta: true,
      raizGrantedUntil: data.raiz_granted_until,
      idrielDiscountUntil: data.idriel_discount_until,
      idrielChargesUsed: used,
      idrielChargesLeft: Math.max(0, 3 - used),
      daysLeft: diffDays(raizUntil),
      raizExpired,
      promoStillValid,
      promoDaysLeft: diffDays(idrielUntil),
      promoExpired: raizExpired && !promoStillValid,
    });
  }, [user]);

  useEffect(() => {
    fetchStatus();
    // refresh once per hour so the daily counter ticks down naturally
    const interval = setInterval(fetchStatus, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  return status;
}
