import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface FreeWriting {
  id: string;
  world_id: string;
  title: string;
  content: string;
  word_count: number;
  chapter_id: string | null;
  created_at: string;
  updated_at: string;
}

function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export function useFreeWritings(worldId?: string) {
  const { user } = useAuth();
  const [writings, setWritings] = useState<FreeWriting[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user || !worldId) { setWritings([]); setLoading(false); return; }
    const { data, error } = await supabase
      .from('free_writings')
      .select('*')
      .eq('world_id', worldId)
      .order('updated_at', { ascending: false });
    if (error) { toast.error('Erro ao carregar escritos'); console.error(error); }
    else setWritings(data as FreeWriting[]);
    setLoading(false);
  }, [user, worldId]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = useCallback(async (title?: string) => {
    if (!user || !worldId) return null;
    const { data, error } = await supabase
      .from('free_writings')
      .insert({ user_id: user.id, world_id: worldId, title: title || 'Sem título' })
      .select()
      .single();
    if (error) { toast.error('Erro ao criar bloco'); return null; }
    const w = data as FreeWriting;
    setWritings(prev => [w, ...prev]);
    return w;
  }, [user, worldId]);

  const update = useCallback(async (id: string, updates: Partial<Pick<FreeWriting, 'title' | 'content' | 'chapter_id'>>) => {
    const finalUpdates: any = { ...updates };
    if (updates.content !== undefined) finalUpdates.word_count = countWords(updates.content);
    const { error } = await supabase.from('free_writings').update(finalUpdates).eq('id', id);
    if (error) { toast.error('Erro ao salvar'); return; }
    setWritings(prev => prev.map(w => w.id === id ? { ...w, ...finalUpdates } : w));
  }, []);

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from('free_writings').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir'); return; }
    setWritings(prev => prev.filter(w => w.id !== id));
  }, []);

  const totalWords = writings.reduce((sum, w) => sum + (w.word_count || 0), 0);

  return { writings, loading, totalWords, create, update, remove, refetch: fetch };
}
