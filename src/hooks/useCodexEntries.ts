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
  created_at: string;
  updated_at: string;
}

export function useCodexEntries() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<CodexEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    if (!user) { setEntries([]); setLoading(false); return; }
    const { data, error } = await supabase
      .from('codex_entries')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) { toast.error('Erro ao carregar fichas'); console.error(error); }
    else setEntries(data as CodexEntry[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const createEntry = useCallback(async (entry: { title: string; content: string; image_url?: string; entry_type: string; fruit_id?: number | null }) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('codex_entries')
      .insert({ ...entry, user_id: user.id })
      .select()
      .single();
    if (error) { toast.error('Erro ao criar ficha'); console.error(error); return null; }
    setEntries(prev => [data as CodexEntry, ...prev]);
    toast.success('Ficha criada!');
    return data as CodexEntry;
  }, [user]);

  const updateEntry = useCallback(async (id: string, updates: Partial<Pick<CodexEntry, 'title' | 'content' | 'image_url' | 'entry_type' | 'fruit_id'>>) => {
    // Prevent saving blob URLs — they are temporary and won't persist
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

  return { entries, loading, createEntry, updateEntry, deleteEntry, uploadImage, refetch: fetchEntries };
}
