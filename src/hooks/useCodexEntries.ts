import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { optimizeImage } from '@/lib/imageOptimizer';
import { handlePlanEditError } from '@/lib/planErrors';

export interface CodexEntry {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  entry_type: string;
  fruit_id: number | null;
  world_id: string | null;
  image_position: { x: number; y: number } | null;
  created_at: string;
  updated_at: string;
}

const CODEX_KEY = (worldId?: string) => ['codex', worldId ?? null] as const;

// ── Registro GLOBAL de conteúdos já hidratados ────────────────────────────
// Precisa ser compartilhado entre TODAS as instâncias do hook: uma ficha
// criada na aba "Construir" (instância A) precisa ser considerada hidratada
// na aba "Codex" (instância B), senão a edição fica bloqueada para sempre
// ("Carregando conteúdo…") em entradas recém-criadas.
const hydratedStore = new Set<string>();
const hydratedListeners = new Set<() => void>();
const markHydrated = (ids: string[]) => {
  let changed = false;
  ids.forEach(id => { if (id && !hydratedStore.has(id)) { hydratedStore.add(id); changed = true; } });
  if (changed) hydratedListeners.forEach(l => l());
};


// Lista enxuta — não traz `content` (pode ter dezenas de KB por entrada).
// O `content` é carregado sob demanda quando o card é expandido.
const LIST_COLUMNS = 'id, title, image_url, entry_type, fruit_id, world_id, image_position, created_at, updated_at';

export function useCodexEntries(worldId?: string) {
  const { user } = useAuth();
  const isUnlimited = (user?.email || '').toLowerCase() === 'erinsaurogonfenix@gmail.com';
  const qc = useQueryClient();

  // Rastreia quais entradas já tiveram o `content` completo carregado do banco.
  // A listagem inicial vem sem `content` (payload enxuto), então o CodexCard
  // precisa saber quando é seguro renderizar/editar sem risco de sobrescrever
  // o texto real com string vazia.
  const [hydratedIds, setHydratedIds] = useState<Set<string>>(new Set());
  const hydratingRef = useRef<Set<string>>(new Set());
  // Mundos em que a hidratação em lote está atualmente rodando (previne
  // requisições concorrentes). NÃO é persistente: ao terminar removemos, para
  // que futuras entradas sem content possam disparar nova hidratação.
  const bulkInflightRef = useRef<Set<string>>(new Set());
  const isContentHydrated = useCallback((id: string) => hydratedIds.has(id), [hydratedIds]);

  const { data: entries = [], isLoading: loading, refetch } = useQuery({
    queryKey: CODEX_KEY(worldId),
    enabled: !!user && !!worldId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    queryFn: async (): Promise<CodexEntry[]> => {
      const { data, error } = await supabase
        .from('codex_entries')
        .select(LIST_COLUMNS)
        .eq('world_id', worldId!)
        .order('updated_at', { ascending: false });
      if (error) { toast.error('Erro ao carregar fichas'); console.error(error); return []; }
      // Preserva o `content` já hidratado no cache anterior. Sem isso, quando
      // o navegador refoca a aba depois de `staleTime` (30s), o refetch
      // sobrescreve o texto com string vazia — apagando prévias na UI e,
      // pior, arriscando salvar vazio por cima do texto real no banco quando
      // o usuário editar em seguida.
      const prev = qc.getQueryData<CodexEntry[]>(CODEX_KEY(worldId)) || [];
      const prevById = new Map(prev.map(e => [e.id, e.content] as const));
      return (data || []).map((d: any) => ({
        ...d,
        content: d.content ?? prevById.get(d.id) ?? '',
      })) as CodexEntry[];
    },
  });

  /**
   * Hidratação em lote: garante que todas as entradas do mundo tenham
   * `content` completo em memória. Reage a qualquer refresh da listagem
   * (troca de mundo, refetch por foco, invalidação) — se sobrarem entradas
   * sem conteúdo, dispara uma única requisição extra e mescla.
   */
  useEffect(() => {
    if (!user || !worldId) return;
    if (!entries.length) return;
    if (bulkInflightRef.current.has(worldId)) return;
    const missing = entries.filter(e => !hydratedIds.has(e.id));
    if (!missing.length) return;
    bulkInflightRef.current.add(worldId);
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('codex_entries')
        .select('id, content')
        .eq('world_id', worldId);
      bulkInflightRef.current.delete(worldId);
      if (cancelled) return;
      if (error) {
        console.error('bulk codex hydrate failed', error);
        return;
      }
      const byId = new Map<string, string>();
      (data || []).forEach((row: any) => byId.set(row.id, (row.content as string) || ''));
      qc.setQueryData(CODEX_KEY(worldId), (old: CodexEntry[] = []) =>
        old.map(e => byId.has(e.id) ? { ...e, content: byId.get(e.id)! } : e)
      );
      setHydratedIds(prev => {
        const n = new Set(prev);
        byId.forEach((_, id) => n.add(id));
        return n;
      });
    })();
    return () => { cancelled = true; };
  }, [user, worldId, entries, hydratedIds, qc]);

  /** Busca o `content` completo de uma ficha sob demanda (ao expandir). */
  const fetchEntryContent = useCallback(async (id: string): Promise<string> => {
    if (hydratingRef.current.has(id)) return '';
    hydratingRef.current.add(id);
    try {
      const { data, error } = await supabase
        .from('codex_entries')
        .select('content, updated_at')
        .eq('id', id)
        .maybeSingle();
      if (error || !data) { if (error) console.error(error); return ''; }
      const full = (data.content as string) || '';
      qc.setQueryData(CODEX_KEY(worldId), (old: CodexEntry[] = []) =>
        old.map(e => e.id === id ? { ...e, content: full } : e)
      );
      setHydratedIds(prev => {
        if (prev.has(id)) return prev;
        const n = new Set(prev); n.add(id); return n;
      });
      return full;
    } finally {
      hydratingRef.current.delete(id);
    }
  }, [qc, worldId]);

  const createEntry = useCallback(async (entry: { title: string; content: string; image_url?: string; entry_type: string; fruit_id?: number | null }) => {
    if (!user) { toast.error('Faça login para criar fichas'); return null; }
    if (!worldId) { toast.error('Selecione ou crie um mundo antes de salvar a ficha'); return null; }
    if (!isUnlimited && entry.title && entry.title.length > 200) { toast.error('Título muito longo (máximo 200 caracteres)'); return null; }
    if (!isUnlimited && entry.content && entry.content.length > 50000) { toast.error('Conteúdo muito longo (máximo 50.000 caracteres)'); return null; }
    const { data, error } = await supabase
      .from('codex_entries')
      .insert({ ...entry, user_id: user.id, world_id: worldId })
      .select()
      .single();
    if (error) { if (!handlePlanEditError(error)) toast.error(`Erro ao criar ficha: ${error.message}`); console.error(error); return null; }
    qc.setQueryData(CODEX_KEY(worldId), (old: CodexEntry[] = []) => [data as any, ...old]);
    setHydratedIds(prev => {
      const id = (data as any)?.id;
      if (!id || prev.has(id)) return prev;
      const n = new Set(prev); n.add(id); return n;
    });
    toast.success(entry.entry_type === 'artigo' ? 'Artigo criado!' : 'Ficha criada!');
    return data as unknown as CodexEntry;
  }, [user, worldId, qc, isUnlimited]);


  const updateEntry = useCallback(async (id: string, updates: Partial<Pick<CodexEntry, 'title' | 'content' | 'image_url' | 'entry_type' | 'fruit_id' | 'image_position'>>) => {
    if (!isUnlimited && updates.title && updates.title.length > 200) { toast.error('Título muito longo (máximo 200 caracteres)'); return; }
    if (!isUnlimited && updates.content && updates.content.length > 50000) { toast.error('Conteúdo muito longo (máximo 50.000 caracteres)'); return; }
    if (updates.image_url && updates.image_url.startsWith('blob:')) {
      toast.error('Imagem temporária detectada. Faça upload novamente.');
      return;
    }
    const { error } = await supabase.from('codex_entries').update(updates).eq('id', id);
    if (error) { if (!handlePlanEditError(error)) toast.error('Erro ao atualizar ficha'); return; }
    qc.setQueryData(CODEX_KEY(worldId), (old: CodexEntry[] = []) =>
      old.map(e => e.id === id ? { ...e, ...updates, updated_at: new Date().toISOString() } : e)
    );
  }, [qc, worldId]);

  const deleteEntry = useCallback(async (id: string) => {
    const { error } = await supabase.from('codex_entries').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir ficha'); return; }
    qc.setQueryData(CODEX_KEY(worldId), (old: CodexEntry[] = []) => old.filter(e => e.id !== id));
    toast.success('Ficha excluída');
  }, [qc, worldId]);

  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    if (!user) return null;
    try {
      const optimized = await optimizeImage(file);
      const ext = optimized.name.split('.').pop() || 'webp';
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('codex-images').upload(path, optimized, {
        cacheControl: '31536000',
        contentType: optimized.type || 'image/webp',
      });
      if (error) { toast.error('Erro no upload'); console.error(error); return null; }
      const { data: { publicUrl } } = supabase.storage.from('codex-images').getPublicUrl(path);
      return publicUrl;
    } catch (err) {
      console.error(err);
      toast.error('Erro ao processar imagem');
      return null;
    }
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
    return (data || []) as unknown as CodexEntry[];
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
    qc.setQueryData(CODEX_KEY(worldId), (old: CodexEntry[] = []) => [
      ...((data as any[]) ?? []),
      ...old,
    ]);
    // Marca como hidratadas (temos o `content` completo já no insert-return).
    setHydratedIds(prev => {
      const n = new Set(prev);
      ((data as any[]) ?? []).forEach(row => { if (row?.id) n.add(row.id); });
      return n;
    });
    toast.success(`${entriesToImport.length} entrada(s) importada(s)!`);
  }, [user, worldId, qc]);

  return {
    entries, loading,
    createEntry, updateEntry, deleteEntry,
    uploadImage, refetch,
    fetchEntriesFromWorld, importEntries,
    fetchEntryContent,
    isContentHydrated,
  };
}
