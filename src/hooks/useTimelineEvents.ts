import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type TimelineEventType =
  | 'fato' | 'mito' | 'batalha' | 'descoberta'
  | 'nascimento' | 'queda' | 'ritual' | 'outro';

export interface TimelineEvent {
  id: string;
  user_id: string;
  world_id: string;
  title: string;
  description: string | null;
  year: string | null;
  era_label: string | null;
  event_type: TimelineEventType;
  sort_index: number;
  codex_entry_id: string | null;
  fruit_id: number | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}


const KEY = (worldId?: string) => ['timeline', worldId ?? null] as const;

export function useTimelineEvents(worldId?: string) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: events = [], isLoading: loading, refetch } = useQuery({
    queryKey: KEY(worldId),
    enabled: !!user && !!worldId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    queryFn: async (): Promise<TimelineEvent[]> => {
      const { data, error } = await supabase
        .from('timeline_events')
        .select('*')
        .eq('world_id', worldId!)
        .order('sort_index', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) { toast.error('Erro ao carregar a Linha do Tempo'); console.error(error); return []; }
      return (data || []) as TimelineEvent[];
    },
  });

  const createEvent = useCallback(async (payload: {
    title: string;
    description?: string;
    era_label?: string;
    event_type?: TimelineEventType;
    codex_entry_id?: string | null;
    fruit_id?: number | null;
    image_url?: string | null;
    sort_index?: number;
  }): Promise<TimelineEvent | null> => {
    if (!user) { toast.error('Faça login para registrar marcos'); return null; }
    if (!worldId) { toast.error('Selecione um mundo antes de criar o marco'); return null; }
    if (!payload.title.trim()) { toast.error('Dê um nome ao marco'); return null; }
    const last = events[events.length - 1];
    const sort_index = payload.sort_index ?? (last ? last.sort_index + 1000 : 1000);
    const { data, error } = await supabase
      .from('timeline_events')
      .insert({
        user_id: user.id,
        world_id: worldId,
        title: payload.title.trim(),
        description: payload.description ?? null,
        era_label: payload.era_label ?? null,
        event_type: payload.event_type ?? 'fato',
        codex_entry_id: payload.codex_entry_id ?? null,
        fruit_id: payload.fruit_id ?? null,
        image_url: payload.image_url ?? null,
        sort_index,
      })

      .select()
      .single();
    if (error) { toast.error(`Erro ao criar marco: ${error.message}`); console.error(error); return null; }
    qc.setQueryData(KEY(worldId), (old: TimelineEvent[] = []) =>
      [...old, data as TimelineEvent].sort((a, b) => a.sort_index - b.sort_index));
    toast.success('Marco gravado na Linha do Tempo');
    return data as TimelineEvent;
  }, [user, worldId, events, qc]);

  const updateEvent = useCallback(async (id: string, updates: Partial<Omit<TimelineEvent, 'id' | 'user_id' | 'world_id' | 'created_at' | 'updated_at'>>) => {
    const { error } = await supabase.from('timeline_events').update(updates).eq('id', id);
    if (error) { toast.error('Erro ao atualizar marco'); console.error(error); return; }
    qc.setQueryData(KEY(worldId), (old: TimelineEvent[] = []) =>
      old.map(e => e.id === id ? { ...e, ...updates, updated_at: new Date().toISOString() } as TimelineEvent : e)
         .sort((a, b) => a.sort_index - b.sort_index));
  }, [qc, worldId]);

  const deleteEvent = useCallback(async (id: string) => {
    const { error } = await supabase.from('timeline_events').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir marco'); return; }
    qc.setQueryData(KEY(worldId), (old: TimelineEvent[] = []) => old.filter(e => e.id !== id));
    toast.success('Marco removido da Linha do Tempo');
  }, [qc, worldId]);

  /** Reordena inserindo `id` entre os índices vizinhos (usa média). */
  const reorderEvent = useCallback(async (id: string, newIndex: number) => {
    const ordered = [...events].sort((a, b) => a.sort_index - b.sort_index);
    const current = ordered.find(e => e.id === id);
    if (!current) return;
    const without = ordered.filter(e => e.id !== id);
    const before = without[newIndex - 1];
    const after = without[newIndex];
    let sort_index: number;
    if (!before && after) sort_index = after.sort_index - 1000;
    else if (before && !after) sort_index = before.sort_index + 1000;
    else if (before && after) sort_index = (before.sort_index + after.sort_index) / 2;
    else sort_index = 1000;
    await updateEvent(id, { sort_index });
  }, [events, updateEvent]);

  return { events, loading, refetch, createEvent, updateEvent, deleteEvent, reorderEvent };
}
