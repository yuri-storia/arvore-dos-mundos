import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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

const KEY = (uid?: string, wid?: string) => ['map-history', uid, wid] as const;

export function useMapHistory(worldId?: string) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: history = [], isLoading: loading, refetch } = useQuery({
    queryKey: KEY(user?.id, worldId),
    enabled: !!user && !!worldId,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    queryFn: async (): Promise<MapHistoryItem[]> => {
      const { data, error } = await supabase
        .from('map_history')
        .select('*')
        .eq('world_id', worldId!)
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) { console.error(error); return []; }
      return (data || []) as MapHistoryItem[];
    },
  });

  const setLocal = (updater: (prev: MapHistoryItem[]) => MapHistoryItem[]) =>
    qc.setQueryData(KEY(user?.id, worldId), (old: MapHistoryItem[] = []) => updater(old));

  const addMap = useCallback(async (m: { image_url: string; style: string; style_label: string; description?: string }) => {
    if (!user || !worldId) return null;
    const { data, error } = await supabase
      .from('map_history')
      .insert({ ...m, user_id: user.id, world_id: worldId })
      .select()
      .single();
    if (error) { console.error(error); toast.error('Não foi possível salvar o mapa no histórico.'); return null; }
    setLocal(prev => [data as MapHistoryItem, ...prev].slice(0, 30));
    return data as MapHistoryItem;
  }, [user, worldId]);

  const deleteMap = useCallback(async (id: string) => {
    let snapshot: MapHistoryItem[] = [];
    setLocal(prev => { snapshot = prev; return prev.filter(x => x.id !== id); });
    const { error } = await supabase.from('map_history').delete().eq('id', id);
    if (error) { toast.error('Erro ao remover mapa'); setLocal(() => snapshot); }
  }, [user?.id, worldId]);

  return { history, loading, addMap, deleteMap, refetch };
}
