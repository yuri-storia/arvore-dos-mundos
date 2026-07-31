import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface BillingCharge {
  id: string;
  plan_code: string;
  kind: string;
  amount: number;
  status: string;
  drops: number | null;
  invoice_url: string | null;
  paid_at: string | null;
  created_at: string;
  provider: string;
}

/** Histórico de cobranças (assinaturas e recargas) do próprio usuário. */
export function useBillingHistory() {
  const { user } = useAuth();
  const [charges, setCharges] = useState<BillingCharge[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) { setCharges([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('asaas_payments')
      .select('id, plan_code, kind, amount, status, drops, invoice_url, paid_at, created_at, provider')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);
    setCharges(((data as BillingCharge[]) || []));
    setLoading(false);
  }, [user]);

  useEffect(() => { refetch(); }, [refetch]);

  return { charges, loading, refetch };
}

/** Abre o Portal do Cliente da Stripe (forma de pagamento, faturas, recibos). */
export async function openBillingPortal(): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke('stripe-billing-portal');
  if (error) return null;
  if (data?.error) return null;
  return (data?.url as string) || null;
}
