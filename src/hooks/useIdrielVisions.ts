import { useState, useEffect, useCallback } from 'react';
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

export function useIdrielVisions(worldId?: string) {
  const { user } = useAuth();
  const [visions, setVisions] = useState<IdrielVision[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchVisions = useCallback(async () => {
    if (!user || !worldId) { setVisions([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('idriel_visions')
      .select('*')
      .eq('world_id', worldId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) console.error(error);
    else setVisions((data || []) as IdrielVision[]);
    setLoading(false);
  }, [user, worldId]);

  useEffect(() => { fetchVisions(); }, [fetchVisions]);

  const saveVision = useCallback(async (v: Omit<IdrielVision, 'id' | 'user_id' | 'created_at' | 'world_id'>) => {
    if (!user || !worldId) return null;
    const { data, error } = await supabase
      .from('idriel_visions')
      .insert({ ...v, user_id: user.id, world_id: worldId })
      .select()
      .single();
    if (error) { console.error(error); return null; }
    setVisions(prev => [data as IdrielVision, ...prev]);
    return data as IdrielVision;
  }, [user, worldId]);

  const updateVisionImage = useCallback(async (id: string, image_url: string) => {
    const { error } = await supabase.from('idriel_visions').update({ image_url }).eq('id', id);
    if (error) { console.error(error); return; }
    setVisions(prev => prev.map(v => v.id === id ? { ...v, image_url } : v));
  }, []);

  const deleteVision = useCallback(async (id: string) => {
    const { error } = await supabase.from('idriel_visions').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir visão'); return; }
    setVisions(prev => prev.filter(v => v.id !== id));
  }, []);

  return { visions, loading, saveVision, updateVisionImage, deleteVision, refetch: fetchVisions };
}
