import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface IdrielSuggestion {
  id: string;
  user_id: string;
  world_id: string;
  fruit_id: number;
  question: string;
  response: string;
  created_at: string;
}

export function useIdrielHistory(worldId?: string, fruitId?: number) {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<IdrielSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!user || !worldId || fruitId === undefined) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('idriel_suggestions')
      .select('*')
      .eq('world_id', worldId)
      .eq('fruit_id', fruitId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error(error);
    } else {
      setSuggestions((data || []) as IdrielSuggestion[]);
    }
    setLoading(false);
  }, [user, worldId, fruitId]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const saveSuggestion = useCallback(async (question: string, response: string) => {
    if (!user || !worldId || fruitId === undefined) return null;
    const { data, error } = await supabase
      .from('idriel_suggestions')
      .insert({ user_id: user.id, world_id: worldId, fruit_id: fruitId, question, response })
      .select()
      .single();
    if (error) { console.error(error); return null; }
    setSuggestions(prev => [data as IdrielSuggestion, ...prev]);
    return data as IdrielSuggestion;
  }, [user, worldId, fruitId]);

  const deleteSuggestion = useCallback(async (id: string) => {
    const { error } = await supabase.from('idriel_suggestions').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir sugestão'); return; }
    setSuggestions(prev => prev.filter(s => s.id !== id));
  }, []);

  return { suggestions, loading, saveSuggestion, deleteSuggestion, refetch: fetchHistory };
}
