import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface CodexEntry {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  entry_type: string;
  fruit_id: number | null;
  world_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useCodexEntries(worldId?: string) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<CodexEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    if (!user) { setEntries([]); setLoading(false); return; }
    let query = supabase
      .from('codex_entries')
      .select('*')
      .order('updated_at', { ascending: false });
    
    if (worldId) {
      query = query.eq('world_id', worldId);
    } else {
      // If no world selected, show nothing (entries are scoped per world)
      setEntries([]);
      setLoading(false);
      return;
    }

    const { data, error } = await query;
    if (error) { toast.error('Erro ao carregar fichas'); console.error(error); }
    else setEntries(data as CodexEntry[]);
    setLoading(false);
  }, [user, worldId]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const createEntry = useCallback(async (entry: { title: string; content: string; image_url?: string; entry_type: string; fruit_id?: number | null }) => {
    if (!user || !worldId) return null;
    if (entry.title && entry.title.length > 200) { toast.error('Título muito longo (máximo 200 caracteres)'); return null; }
    if (entry.content && entry.content.length > 50000) { toast.error('Conteúdo muito longo (máximo 50.000 caracteres)'); return null; }
    const { data, error } = await supabase
      .from('codex_entries')
      .insert({ ...entry, user_id: user.id, world_id: worldId })
      .select()
      .single();
    if (error) { toast.error('Erro ao criar ficha'); console.error(error); return null; }
    setEntries(prev => [data as CodexEntry, ...prev]);
    toast.success('Ficha criada!');
    return data as CodexEntry;
  }, [user, worldId]);

  const updateEntry = useCallback(async (id: string, updates: Partial<Pick<CodexEntry, 'title' | 'content' | 'image_url' | 'entry_type' | 'fruit_id'>>) => {
    if (updates.title && updates.title.length > 200) { toast.error('Título muito longo (máximo 200 caracteres)'); return; }
    if (updates.content && updates.content.length > 50000) { toast.error('Conteúdo muito longo (máximo 50.000 caracteres)'); return; }
    if (updates.image_url && updates.image_url.startsWith('blob:')) {
      toast.error('Imagem temporária detectada. Faça upload novamente.');
      return;
    }
    const { error } = await supabase.from('codex_entries').update(updates).eq('id', id);
    if (error) { toast.error('Erro ao atualizar ficha'); return; }
    setEntries(prev => prev.map(e => e.id === id ? { ...e, ...updates, updated_at: new Date().toISOString() } : e));
  }, []);

  const deleteEntry = useCallback(async (id: string) => {
    const { error } = await supabase.from('codex_entries').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir ficha'); return; }
    setEntries(prev => prev.filter(e => e.id !== id));
    toast.success('Ficha excluída');
  }, []);

  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    if (!user) return null;
    const ext = file.name.split('.').pop();
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('codex-images').upload(path, file);
    if (error) { toast.error('Erro no upload'); console.error(error); return null; }
    const { data: { publicUrl } } = supabase.storage.from('codex-images').getPublicUrl(path);
    return publicUrl;
  }, [user]);

  /** Fetch entries from a different world (for import) */
  const fetchEntriesFromWorld = useCallback(async (otherWorldId: string): Promise<CodexEntry[]> => {
    if (!user) return [];
    const { data, error } = await supabase
      .from('codex_entries')
      .select('*')
      .eq('world_id', otherWorldId)
      .order('updated_at', { ascending: false });
    if (error) { console.error(error); return []; }
    return (data || []) as CodexEntry[];
  }, [user]);

  /** Import entries into current world */
  const importEntries = useCallback(async (entriesToImport: CodexEntry[]) => {
    if (!user || !worldId) return;
    const inserts = entriesToImport.map(e => ({
      title: e.title,
      content: e.content,
      image_url: e.image_url,
      entry_type: e.entry_type,
      fruit_id: e.fruit_id,
      user_id: user.id,
      world_id: worldId,
    }));
    const { data, error } = await supabase
      .from('codex_entries')
      .insert(inserts)
      .select();
    if (error) { toast.error('Erro ao importar entradas'); console.error(error); return; }
    setEntries(prev => [...(data as CodexEntry[]), ...prev]);
    toast.success(`${entriesToImport.length} entrada(s) importada(s)!`);
  }, [user, worldId]);

  return { entries, loading, createEntry, updateEntry, deleteEntry, uploadImage, refetch: fetchEntries, fetchEntriesFromWorld, importEntries };
}
