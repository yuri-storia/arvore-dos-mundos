import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ElixirLedgerEntry {
  id: string;
  user_id: string;
  delta: number;
  kind: string; // 'recharge' | 'consume_text' | 'consume_image' | 'consume_image_draft' | 'consume_image_premium' | 'bonus' | 'adjustment'
  reason: string | null;
  reference_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface ElixirBalanceState {
  bonusDrops: number;
  ledger: ElixirLedgerEntry[];
  loading: boolean;
  refetch: () => Promise<void>;
}

/**
 * Saldo de Elixir (gotas bônus/recarga) + histórico de movimentos, com
 * atualização em tempo real via Supabase Realtime nas tabelas
 * `user_credit_balance` e `elixir_ledger`.
 */
export function useElixirBalance(): ElixirBalanceState {
  const { user } = useAuth();
  const [bonusDrops, setBonusDrops] = useState(0);
  const [ledger, setLedger] = useState<ElixirLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) { setBonusDrops(0); setLedger([]); setLoading(false); return; }
    setLoading(true);
    const [balRes, ledRes] = await Promise.all([
      supabase.from('user_credit_balance').select('bonus_drops').eq('user_id', user.id).maybeSingle(),
      supabase.from('elixir_ledger').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
    ]);
    if (balRes.data) setBonusDrops((balRes.data as any).bonus_drops || 0);
    else setBonusDrops(0);
    setLedger(((ledRes.data as any[]) || []) as ElixirLedgerEntry[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { refetch(); }, [refetch]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`elixir-${user.id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'user_credit_balance', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const row: any = payload.new || payload.old;
          if (row && typeof row.bonus_drops === 'number') setBonusDrops(row.bonus_drops);
        })
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'elixir_ledger', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const row = payload.new as ElixirLedgerEntry;
          setLedger(prev => [row, ...prev].slice(0, 50));
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return { bonusDrops, ledger, loading, refetch };
}
