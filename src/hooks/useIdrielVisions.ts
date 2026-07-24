import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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

export function useIdrielVisions(worldId?: string) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: visions = [], isLoading: loading, refetch } = useQuery({
    queryKey: KEY(user?.id, worldId),
    enabled: !!user && !!worldId,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    queryFn: async (): Promise<IdrielVision[]> => {
      // Payload enxuto: descartamos o `prompt` (que pode chegar a >1KB por linha)
      // no listagem. Se algum dia precisarmos reabrir com o prompt exato, buscamos
      // sob demanda por id.
      const { data, error } = await supabase
        .from('idriel_visions')
        .select('id,user_id,world_id,description,image_url,style,image_type,tone,extras,created_at')
        .eq('world_id', worldId!)
        .order('created_at', { ascending: false })
        .limit(60);
      if (error) { console.error(error); return []; }
      return (data || []).map((r: any) => ({ ...r, prompt: '' })) as IdrielVision[];
    },
  });

  const setLocal = (updater: (prev: IdrielVision[]) => IdrielVision[]) =>
    qc.setQueryData(KEY(user?.id, worldId), (old: IdrielVision[] = []) => updater(old));

  const saveVision = useCallback(async (v: Omit<IdrielVision, 'id' | 'user_id' | 'created_at' | 'world_id'>) => {
    if (!user || !worldId) return null;
    const { data, error } = await supabase
      .from('idriel_visions')
      .insert({ ...v, user_id: user.id, world_id: worldId })
      .select()
      .single();
    if (error) { console.error(error); return null; }
    setLocal(prev => [data as IdrielVision, ...prev]);
    return data as IdrielVision;
  }, [user, worldId]);

  const updateVisionImage = useCallback(async (id: string, image_url: string) => {
    const { error } = await supabase.from('idriel_visions').update({ image_url }).eq('id', id);
    if (error) { console.error(error); return; }
    setLocal(prev => prev.map(v => v.id === id ? { ...v, image_url } : v));
  }, [user?.id, worldId]);

  const deleteVision = useCallback(async (id: string) => {
    const { error } = await supabase.from('idriel_visions').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir visão'); return; }
    setLocal(prev => prev.filter(v => v.id !== id));
  }, [user?.id, worldId]);

  return { visions, loading, saveVision, updateVisionImage, deleteVision, refetch };
}
