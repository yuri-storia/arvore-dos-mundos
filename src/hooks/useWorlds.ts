import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { AppState, MethodType, GalleryImage } from '@/lib/data';

export interface WorldRecord {
  id: string;
  name: string;
  method: MethodType;
  // db/gallery são carregados sob demanda (lazy) para tornar a listagem instantânea.
  db: Record<number, Record<string, string>>;
  gallery: GalleryImage[];
  updated_at: string;
}

export function useWorlds() {
  const { user } = useAuth();
  const [worlds, setWorlds] = useState<WorldRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWorlds = useCallback(async () => {
    if (!user) { setWorlds([]); setLoading(false); return; }
    // Listagem leve: NÃO trazer os JSONs pesados (db, gallery).
    // Esses campos podem ter centenas de KB cada e travam a tela inicial.
    const { data, error } = await supabase
      .from('worlds')
      .select('id, name, method, updated_at')
      .order('updated_at', { ascending: false });
    if (error) { console.error(error); toast.error('Erro ao carregar mundos'); }
    else setWorlds((data as any[]).map(d => ({
      id: d.id,
      name: d.name,
      method: d.method as MethodType,
      db: {},
      gallery: [],
      updated_at: d.updated_at,
    })));
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchWorlds(); }, [fetchWorlds]);

  // Carrega o payload completo (db + gallery) apenas do mundo ativo.
  const loadWorldFull = useCallback(async (id: string): Promise<WorldRecord | null> => {
    const { data, error } = await supabase
      .from('worlds')
      .select('id, name, method, updated_at, db, gallery')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) { if (error) console.error(error); return null; }
    return {
      id: data.id,
      name: data.name,
      method: data.method as MethodType,
      db: (data.db || {}) as Record<number, Record<string, string>>,
      gallery: (data.gallery || []) as GalleryImage[],
      updated_at: data.updated_at,
    };
  }, []);

  const createWorld = useCallback(async (state: AppState): Promise<WorldRecord | null> => {
    if (!user) return null;
    const name = state.worldName || 'Mundo Sem Nome';
    if (name.length > 200) { toast.error('Nome do mundo muito longo (máximo 200 caracteres)'); return null; }
    const { data, error } = await supabase
      .from('worlds')
      .insert({
        user_id: user.id,
        name: state.worldName || 'Mundo Sem Nome',
        method: state.method,
        db: state.db as any,
        gallery: state.gallery as any,
      })
      .select()
      .single();
    if (error) { console.error(error); toast.error('Erro ao criar mundo'); return null; }
    const record: WorldRecord = {
      id: data.id,
      name: data.name,
      method: data.method as MethodType,
      db: (data.db || {}) as any,
      gallery: (data.gallery || []) as any,
      updated_at: data.updated_at,
    };
    setWorlds(prev => [record, ...prev]);
    return record;
  }, [user]);

  const updateWorld = useCallback(async (id: string, updates: Partial<Pick<WorldRecord, 'name' | 'method' | 'db' | 'gallery'>>) => {
    if (updates.name && updates.name.length > 200) { toast.error('Nome do mundo muito longo (máximo 200 caracteres)'); return; }
    const { error } = await supabase
      .from('worlds')
      .update(updates as any)
      .eq('id', id);
    if (error) {
      console.error(error);
      toast.error('Não foi possível salvar o mundo. Verifique sua conexão e tente novamente.');
      return;
    }
    setWorlds(prev => prev.map(w => w.id === id ? { ...w, ...updates, updated_at: new Date().toISOString() } : w));
  }, []);

  const deleteWorld = useCallback(async (id: string) => {
    const { error } = await supabase.from('worlds').delete().eq('id', id);
    if (error) { console.error(error); toast.error('Erro ao excluir mundo'); return; }
    setWorlds(prev => prev.filter(w => w.id !== id));
    toast.success('Mundo excluído');
  }, []);

  return { worlds, loading, createWorld, updateWorld, deleteWorld, refetch: fetchWorlds };
}
