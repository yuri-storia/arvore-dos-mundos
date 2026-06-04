import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Storyline {
  id: string;
  user_id: string;
  world_id: string;
  manuscript_id: string | null;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface StorylineColumn {
  id: string;
  storyline_id: string;
  user_id: string;
  title: string;
  color: string | null;
  sort_order: number;
  created_at: string;
}

const DEFAULT_COLUMNS = [
  { title: 'Ideia', color: 'yellow' },
  { title: 'Rascunho', color: 'blue' },
  { title: 'Revisão', color: 'purple' },
  { title: 'Pronto', color: 'green' },
];

export function useStorylines(worldId?: string) {
  const { user } = useAuth();
  const [storylines, setStorylines] = useState<Storyline[]>([]);
  const [activeStoryline, setActiveStoryline] = useState<Storyline | null>(null);
  const [columns, setColumns] = useState<StorylineColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const creatingDefaultRef = useRef(false);

  // Fetch all storylines for the world
  const fetchStorylines = useCallback(async () => {
    if (!user || !worldId) { setStorylines([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('storylines')
      .select('*')
      .eq('world_id', worldId)
      .order('created_at', { ascending: true });
    if (error) console.error(error);
    setStorylines((data || []) as Storyline[]);
    setLoading(false);
  }, [user, worldId]);

  useEffect(() => { fetchStorylines(); }, [fetchStorylines]);

  // Auto-create + select first storyline so the user always has a board
  useEffect(() => {
    if (!user || !worldId || loading) return;
    if (storylines.length === 0) {
      if (creatingDefaultRef.current) return; // guarda contra dupla criação por re-render
      creatingDefaultRef.current = true;
      (async () => {
        try {
          const { data, error } = await supabase
            .from('storylines')
            .insert({ user_id: user.id, world_id: worldId, name: 'Sem título' })
            .select().single();
          if (error || !data) return;
          const sl = data as Storyline;
          // Seed default columns
          const seed = DEFAULT_COLUMNS.map((c, i) => ({
            storyline_id: sl.id, user_id: user.id,
            title: c.title, color: c.color, sort_order: i,
          }));
          await supabase.from('storyline_columns').insert(seed);
          setStorylines([sl]);
          setActiveStoryline(sl);
        } finally {
          // mantém true: já existe storyline; evita criação dupla mesmo em refetches
        }
      })();
    } else if (!activeStoryline) {
      setActiveStoryline(storylines[0]);
    }
  }, [storylines, activeStoryline, user, worldId, loading]);

  // Fetch columns when active storyline changes
  useEffect(() => {
    if (!activeStoryline) { setColumns([]); return; }
    (async () => {
      const { data } = await supabase
        .from('storyline_columns')
        .select('*')
        .eq('storyline_id', activeStoryline.id)
        .order('sort_order', { ascending: true });
      setColumns((data || []) as StorylineColumn[]);
    })();
  }, [activeStoryline]);

  const createStoryline = useCallback(async (name: string, manuscriptId?: string | null) => {
    if (!user || !worldId) return null;
    const { data, error } = await supabase
      .from('storylines')
      .insert({ user_id: user.id, world_id: worldId, name: name || 'Sem título', manuscript_id: manuscriptId ?? null })
      .select().single();
    if (error || !data) { toast.error('Erro ao criar storyline'); return null; }
    const sl = data as Storyline;
    const seed = DEFAULT_COLUMNS.map((c, i) => ({
      storyline_id: sl.id, user_id: user.id, title: c.title, color: c.color, sort_order: i,
    }));
    await supabase.from('storyline_columns').insert(seed);
    setStorylines(prev => [...prev, sl]);
    setActiveStoryline(sl);
    toast.success('Storyline criada!');
    return sl;
  }, [user, worldId]);

  const updateStoryline = useCallback(async (id: string, updates: Partial<Pick<Storyline, 'name' | 'manuscript_id'>>) => {
    const { error } = await supabase.from('storylines').update(updates).eq('id', id);
    if (error) { toast.error('Erro ao atualizar'); return; }
    setStorylines(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    if (activeStoryline?.id === id) setActiveStoryline(prev => prev ? { ...prev, ...updates } : prev);
  }, [activeStoryline]);

  const deleteStoryline = useCallback(async (id: string) => {
    const { error } = await supabase.from('storylines').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir'); return; }
    setStorylines(prev => prev.filter(s => s.id !== id));
    if (activeStoryline?.id === id) setActiveStoryline(null);
    toast.success('Storyline excluída');
  }, [activeStoryline]);

  const createColumn = useCallback(async (title: string = 'Nova coluna') => {
    if (!user || !activeStoryline) return null;
    const sortOrder = columns.length;
    const { data, error } = await supabase
      .from('storyline_columns')
      .insert({ storyline_id: activeStoryline.id, user_id: user.id, title, sort_order: sortOrder })
      .select().single();
    if (error || !data) { toast.error('Erro ao criar coluna'); return null; }
    const col = data as StorylineColumn;
    setColumns(prev => [...prev, col]);
    return col;
  }, [user, activeStoryline, columns.length]);

  const updateColumn = useCallback(async (id: string, updates: Partial<Pick<StorylineColumn, 'title' | 'color' | 'sort_order'>>) => {
    const { error } = await supabase.from('storyline_columns').update(updates).eq('id', id);
    if (error) { toast.error('Erro ao atualizar coluna'); return; }
    setColumns(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  const deleteColumn = useCallback(async (id: string) => {
    const { error } = await supabase.from('storyline_columns').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir coluna'); return; }
    setColumns(prev => prev.filter(c => c.id !== id));
  }, []);

  return {
    storylines, activeStoryline, setActiveStoryline,
    columns, loading,
    createStoryline, updateStoryline, deleteStoryline,
    createColumn, updateColumn, deleteColumn,
    refetch: fetchStorylines,
  };
}
