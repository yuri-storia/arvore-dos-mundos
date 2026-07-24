import { useCallback, useMemo } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface IdrielVision {
  id: string;
  user_id: string;
  world_id: string;
  description: string;
  prompt: string;
  image_url: string | null;
  style: string | null;
  image_type: string | null;
  tone: string | null;
  extras: string | null;
  created_at: string;
}

const KEY = (uid?: string, wid?: string) => ['idriel-visions', uid, wid] as const;
const PAGE_SIZE = 20;
const LIST_COLS = 'id,user_id,world_id,description,image_url,style,image_type,tone,extras,created_at';

export function useIdrielVisions(worldId?: string) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: KEY(user?.id, worldId),
    enabled: !!user && !!worldId,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    initialPageParam: 0 as number,
    getNextPageParam: (last: IdrielVision[], pages) =>
      last.length < PAGE_SIZE ? undefined : pages.length * PAGE_SIZE,
    queryFn: async ({ pageParam }): Promise<IdrielVision[]> => {
      const from = pageParam as number;
      const to = from + PAGE_SIZE - 1;
      // Payload enxuto na listagem: descartamos o `prompt` (que pode chegar a >1KB
      // por linha). Usamos `fetchVisionPrompt(id)` sob demanda quando o usuário
      // clica em Reusar/Reprocessar.
      const { data, error } = await supabase
        .from('idriel_visions')
        .select(LIST_COLS)
        .eq('world_id', worldId!)
        .order('created_at', { ascending: false })
        .range(from, to);
      if (error) { console.error(error); return []; }
      return (data || []).map((r: any) => ({ ...r, prompt: '' })) as IdrielVision[];
    },
  });

  const visions = useMemo(
    () => query.data?.pages.flat() ?? [],
    [query.data]
  );

  const setLocal = (updater: (prev: IdrielVision[][]) => IdrielVision[][]) =>
    qc.setQueryData(KEY(user?.id, worldId), (old: any) => {
      const pages = old?.pages ?? [];
      const nextPages = updater(pages);
      return { ...(old ?? {}), pages: nextPages, pageParams: old?.pageParams ?? [0] };
    });

  const saveVision = useCallback(async (v: Omit<IdrielVision, 'id' | 'user_id' | 'created_at' | 'world_id'>) => {
    if (!user || !worldId) return null;
    const { data, error } = await supabase
      .from('idriel_visions')
      .insert({ ...v, user_id: user.id, world_id: worldId })
      .select(LIST_COLS)
      .single();
    if (error) { console.error(error); return null; }
    const row = { ...(data as any), prompt: v.prompt || '' } as IdrielVision;
    setLocal(pages => {
      const first = pages[0] ?? [];
      return [[row, ...first], ...pages.slice(1)];
    });
    return row;
  }, [user, worldId]);

  const updateVisionImage = useCallback(async (id: string, image_url: string) => {
    const { error } = await supabase.from('idriel_visions').update({ image_url }).eq('id', id);
    if (error) { console.error(error); return; }
    setLocal(pages => pages.map(pg => pg.map(v => v.id === id ? { ...v, image_url } : v)));
  }, [user?.id, worldId]);

  const deleteVision = useCallback(async (id: string) => {
    const { error } = await supabase.from('idriel_visions').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir visão'); return; }
    setLocal(pages => pages.map(pg => pg.filter(v => v.id !== id)));
  }, [user?.id, worldId]);

  /** Busca sob demanda o `prompt` completo (usado ao Reusar / Reprocessar). */
  const fetchVisionPrompt = useCallback(async (id: string): Promise<string | null> => {
    const { data, error } = await supabase
      .from('idriel_visions')
      .select('prompt')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) return null;
    return (data as any).prompt ?? '';
  }, []);

  return {
    visions,
    loading: query.isLoading,
    hasMore: !!query.hasNextPage,
    loadMore: () => query.fetchNextPage(),
    isFetchingMore: query.isFetchingNextPage,
    saveVision,
    updateVisionImage,
    deleteVision,
    fetchVisionPrompt,
    refetch: query.refetch,
  };
}
