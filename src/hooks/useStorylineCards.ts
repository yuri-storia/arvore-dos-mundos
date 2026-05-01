import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface StorylineCard {
  id: string;
  user_id: string;
  storyline_column_id: string;
  title: string;
  content: string;
  color: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function useStorylineCards(columnIds: string[]) {
  const { user } = useAuth();
  const [cards, setCards] = useState<StorylineCard[]>([]);
  const [loading, setLoading] = useState(false);

  const key = columnIds.slice().sort().join(',');

  const fetchCards = useCallback(async () => {
    if (!user || columnIds.length === 0) { setCards([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('storyline_cards')
      .select('*')
      .in('storyline_column_id', columnIds)
      .order('sort_order', { ascending: true });
    if (error) console.error(error);
    setCards((data || []) as StorylineCard[]);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, key]);

  useEffect(() => { fetchCards(); }, [fetchCards]);

  const createCard = useCallback(async (storylineColumnId: string, title = 'Sem título') => {
    if (!user) return null;
    const sortOrder = cards.filter(c => c.storyline_column_id === storylineColumnId).length;
    const { data, error } = await supabase
      .from('storyline_cards')
      .insert({ user_id: user.id, storyline_column_id: storylineColumnId, title, sort_order: sortOrder })
      .select().single();
    if (error || !data) { toast.error('Erro ao criar card'); return null; }
    const card = data as StorylineCard;
    setCards(prev => [...prev, card]);
    return card;
  }, [user, cards]);

  const updateCard = useCallback(async (
    id: string,
    updates: Partial<Pick<StorylineCard, 'title' | 'content' | 'color' | 'sort_order' | 'storyline_column_id'>>
  ) => {
    // Optimistic update
    setCards(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    const { error } = await supabase.from('storyline_cards').update(updates).eq('id', id);
    if (error) { toast.error('Erro ao atualizar card'); console.error(error); }
  }, []);

  const deleteCard = useCallback(async (id: string) => {
    setCards(prev => prev.filter(c => c.id !== id));
    const { error } = await supabase.from('storyline_cards').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir card'); }
  }, []);

  return { cards, loading, createCard, updateCard, deleteCard, refetch: fetchCards };
}
