import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Manuscript {
  id: string;
  world_id: string;
  title: string;
  synopsis: string | null;
  word_count_goal: number | null;
  created_at: string;
  updated_at: string;
}

export interface Chapter {
  id: string;
  manuscript_id: string;
  title: string;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Scene {
  id: string;
  chapter_id: string;
  title: string;
  content: string;
  word_count: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export function useManuscript(worldId?: string) {
  const { user } = useAuth();
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [activeManuscript, setActiveManuscript] = useState<Manuscript | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch manuscripts for a world
  const fetchManuscripts = useCallback(async () => {
    if (!user || !worldId) { setManuscripts([]); setLoading(false); return; }
    const { data, error } = await supabase
      .from('manuscripts')
      .select('*')
      .eq('world_id', worldId)
      .order('created_at', { ascending: true });
    if (error) { toast.error('Erro ao carregar manuscritos'); console.error(error); }
    else setManuscripts(data as Manuscript[]);
    setLoading(false);
  }, [user, worldId]);

  useEffect(() => { fetchManuscripts(); }, [fetchManuscripts]);

  // Auto-select first manuscript
  useEffect(() => {
    if (manuscripts.length > 0 && !activeManuscript) {
      setActiveManuscript(manuscripts[0]);
    } else if (manuscripts.length === 0) {
      setActiveManuscript(null);
    }
  }, [manuscripts, activeManuscript]);

  // Fetch chapters & scenes when manuscript changes
  useEffect(() => {
    if (!activeManuscript) { setChapters([]); setScenes([]); return; }
    (async () => {
      const { data: chaps } = await supabase
        .from('chapters')
        .select('*')
        .eq('manuscript_id', activeManuscript.id)
        .order('sort_order', { ascending: true });
      setChapters((chaps || []) as Chapter[]);

      const chapterIds = (chaps || []).map((c: any) => c.id);
      if (chapterIds.length > 0) {
        const { data: sc } = await supabase
          .from('scenes')
          .select('*')
          .in('chapter_id', chapterIds)
          .order('sort_order', { ascending: true });
        setScenes((sc || []) as Scene[]);
      } else {
        setScenes([]);
      }
    })();
  }, [activeManuscript]);

  const createManuscript = useCallback(async (title?: string) => {
    if (!user || !worldId) return null;
    const { data, error } = await supabase
      .from('manuscripts')
      .insert({ user_id: user.id, world_id: worldId, title: title || 'Sem título' })
      .select()
      .single();
    if (error) { toast.error('Erro ao criar manuscrito'); return null; }
    const ms = data as Manuscript;
    setManuscripts(prev => [...prev, ms]);
    setActiveManuscript(ms);
    toast.success('Manuscrito criado!');
    return ms;
  }, [user, worldId]);

  const updateManuscript = useCallback(async (id: string, updates: Partial<Pick<Manuscript, 'title' | 'synopsis' | 'word_count_goal'>>) => {
    const { error } = await supabase.from('manuscripts').update(updates).eq('id', id);
    if (error) { toast.error('Erro ao atualizar manuscrito'); return; }
    setManuscripts(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
    if (activeManuscript?.id === id) setActiveManuscript(prev => prev ? { ...prev, ...updates } : prev);
  }, [activeManuscript]);

  const deleteManuscript = useCallback(async (id: string) => {
    const { error } = await supabase.from('manuscripts').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir manuscrito'); return; }
    setManuscripts(prev => prev.filter(m => m.id !== id));
    if (activeManuscript?.id === id) setActiveManuscript(null);
    toast.success('Manuscrito excluído');
  }, [activeManuscript]);

  const createChapter = useCallback(async (title?: string) => {
    if (!user || !activeManuscript) return null;
    const nextOrder = chapters.length;
    const { data, error } = await supabase
      .from('chapters')
      .insert({ user_id: user.id, manuscript_id: activeManuscript.id, title: title || `Capítulo ${nextOrder + 1}`, sort_order: nextOrder })
      .select()
      .single();
    if (error) { toast.error('Erro ao criar capítulo'); return null; }
    const ch = data as Chapter;
    setChapters(prev => [...prev, ch]);
    return ch;
  }, [user, activeManuscript, chapters.length]);

  const updateChapter = useCallback(async (id: string, updates: Partial<Pick<Chapter, 'title' | 'notes' | 'sort_order'>>) => {
    const { error } = await supabase.from('chapters').update(updates).eq('id', id);
    if (error) { toast.error('Erro ao atualizar capítulo'); return; }
    setChapters(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  const deleteChapter = useCallback(async (id: string) => {
    const { error } = await supabase.from('chapters').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir capítulo'); return; }
    setChapters(prev => prev.filter(c => c.id !== id));
    setScenes(prev => prev.filter(s => s.chapter_id !== id));
    toast.success('Capítulo excluído');
  }, []);

  const createScene = useCallback(async (chapterId: string, title?: string) => {
    if (!user) return null;
    const chapterScenes = scenes.filter(s => s.chapter_id === chapterId);
    const nextOrder = chapterScenes.length;
    const { data, error } = await supabase
      .from('scenes')
      .insert({ user_id: user.id, chapter_id: chapterId, title: title || `Cena ${nextOrder + 1}`, sort_order: nextOrder })
      .select()
      .single();
    if (error) { toast.error('Erro ao criar cena'); return null; }
    const sc = data as Scene;
    setScenes(prev => [...prev, sc]);
    return sc;
  }, [user, scenes]);

  const updateScene = useCallback(async (id: string, updates: Partial<Pick<Scene, 'title' | 'content' | 'sort_order'>>) => {
    const finalUpdates: any = { ...updates };
    if (updates.content !== undefined) {
      finalUpdates.word_count = countWords(updates.content);
    }
    const { error } = await supabase.from('scenes').update(finalUpdates).eq('id', id);
    if (error) { toast.error('Erro ao salvar cena'); return; }
    setScenes(prev => prev.map(s => s.id === id ? { ...s, ...finalUpdates } : s));
  }, []);

  const deleteScene = useCallback(async (id: string) => {
    const { error } = await supabase.from('scenes').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir cena'); return; }
    setScenes(prev => prev.filter(s => s.id !== id));
  }, []);

  const totalWordCount = scenes.reduce((sum, s) => sum + (s.word_count || 0), 0);

  return {
    manuscripts, activeManuscript, setActiveManuscript,
    chapters, scenes, loading, totalWordCount,
    createManuscript, updateManuscript, deleteManuscript,
    createChapter, updateChapter, deleteChapter,
    createScene, updateScene, deleteScene,
    refetch: fetchManuscripts,
  };
}
