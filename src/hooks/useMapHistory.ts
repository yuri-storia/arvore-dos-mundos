import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface MapHistoryItem {
  id: string;
  user_id: string;
  world_id: string;
  image_url: string;
  style: string;
  style_label: string;
  description: string | null;
  created_at: string;
}

export function useMapHistory(worldId?: string) {
  const { user } = useAuth();
  const [history, setHistory] = useState<MapHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!user || !worldId) { setHistory([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('map_history')
      .select('*')
      .eq('world_id', worldId)
      .order('created_at', { ascending: false })
      .limit(30);
    if (error) console.error(error);
    else setHistory((data || []) as MapHistoryItem[]);
    setLoading(false);
  }, [user, worldId]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const addMap = useCallback(async (m: { image_url: string; style: string; style_label: string; description?: string }) => {
    if (!user || !worldId) return null;
    const { data, error } = await supabase
      .from('map_history')
      .insert({ ...m, user_id: user.id, world_id: worldId })
      .select()
      .single();
    if (error) { console.error(error); toast.error('Não foi possível salvar o mapa no histórico.'); return null; }
    setHistory(prev => [data as MapHistoryItem, ...prev].slice(0, 30));
    return data as MapHistoryItem;
  }, [user, worldId]);

  const deleteMap = useCallback(async (id: string) => {
    const prev = history;
    setHistory(h => h.filter(x => x.id !== id));
    const { error } = await supabase.from('map_history').delete().eq('id', id);
    if (error) { toast.error('Erro ao remover mapa'); setHistory(prev); }
  }, [history]);

  return { history, loading, addMap, deleteMap, refetch: fetchHistory };
}
