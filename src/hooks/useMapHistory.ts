import { useCallback, useMemo } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
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
const PAGE_SIZE = 20;

export function useMapHistory(worldId?: string) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: KEY(user?.id, worldId),
    enabled: !!user && !!worldId,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    initialPageParam: 0 as number,
    getNextPageParam: (last: MapHistoryItem[], pages) =>
      last.length < PAGE_SIZE ? undefined : pages.length * PAGE_SIZE,
    queryFn: async ({ pageParam }): Promise<MapHistoryItem[]> => {
      const from = pageParam as number;
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await supabase
        .from('map_history')
        .select('*')
        .eq('world_id', worldId!)
        .order('created_at', { ascending: false })
        .range(from, to);
      if (error) { console.error(error); return []; }
      return (data || []) as MapHistoryItem[];
    },
  });

  const history = useMemo(
    () => query.data?.pages.flat() ?? [],
    [query.data]
  );

  const setLocal = (updater: (prev: MapHistoryItem[][]) => MapHistoryItem[][]) =>
    qc.setQueryData(KEY(user?.id, worldId), (old: any) => {
      const pages = old?.pages ?? [];
      const nextPages = updater(pages);
      return { ...(old ?? {}), pages: nextPages, pageParams: old?.pageParams ?? [0] };
    });

  const addMap = useCallback(async (m: { image_url: string; style: string; style_label: string; description?: string }) => {
    if (!user || !worldId) return null;
    const { data, error } = await supabase
      .from('map_history')
      .insert({ ...m, user_id: user.id, world_id: worldId })
      .select()
      .single();
    if (error) { console.error(error); toast.error('Não foi possível salvar o mapa no histórico.'); return null; }
    setLocal(pages => {
      const first = pages[0] ?? [];
      return [[data as MapHistoryItem, ...first], ...pages.slice(1)];
    });
    return data as MapHistoryItem;
  }, [user, worldId]);

  const updateMapImage = useCallback(async (id: string, image_url: string) => {
    const { error } = await supabase.from('map_history').update({ image_url }).eq('id', id);
    if (error) { console.error(error); return; }
    setLocal(pages => pages.map(pg => pg.map(m => m.id === id ? { ...m, image_url } : m)));
  }, [user?.id, worldId]);

  const deleteMap = useCallback(async (id: string) => {
    const { error } = await supabase.from('map_history').delete().eq('id', id);
    if (error) { toast.error('Erro ao remover mapa'); return; }
    setLocal(pages => pages.map(pg => pg.filter(x => x.id !== id)));
  }, [user?.id, worldId]);

  return {
    history,
    loading: query.isLoading,
    hasMore: !!query.hasNextPage,
    loadMore: () => query.fetchNextPage(),
    isFetchingMore: query.isFetchingNextPage,
    addMap,
    updateMapImage,
    deleteMap,
    refetch: query.refetch,
  };
}
