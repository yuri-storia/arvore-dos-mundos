import { useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  folderCovers: Record<number, string>;
  updated_at: string;
}

const WORLDS_KEY = (uid: string | undefined) => ['worlds', uid] as const;

export function useWorlds() {
  const { user } = useAuth();
  const qc = useQueryClient();
  // Cache da última versão salva por worldId — usado pelo diff do autosave
  // para evitar reescrever campos pesados (db, gallery) quando só o nome muda.
  const lastSavedRef = useRef<Record<string, { name: string; method: MethodType; db: unknown; gallery: unknown; folderCovers: unknown }>>({});

  const { data: worlds = [], isLoading: loading, refetch } = useQuery({
    queryKey: WORLDS_KEY(user?.id),
    enabled: !!user,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    queryFn: async (): Promise<WorldRecord[]> => {
      const { data, error } = await supabase
        .from('worlds')
        .select('id, name, method, updated_at')
        .order('updated_at', { ascending: false });
      if (error) { console.error(error); toast.error('Erro ao carregar mundos'); return []; }
      return (data as any[]).map(d => ({
        id: d.id,
        name: d.name,
        method: d.method as MethodType,
        db: {},
        gallery: [],
        folderCovers: {},
        updated_at: d.updated_at,
      }));
    },
  });

  // Carrega o payload completo (db + gallery + folder_covers) apenas do mundo ativo.
  const loadWorldFull = useCallback(async (id: string): Promise<WorldRecord | null> => {
    const { data, error } = await supabase
      .from('worlds')
      .select('id, name, method, updated_at, db, gallery, folder_covers')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) { if (error) console.error(error); return null; }
    const d = data as any;
    const rec: WorldRecord = {
      id: d.id,
      name: d.name,
      method: d.method as MethodType,
      db: (d.db || {}) as Record<number, Record<string, string>>,
      gallery: (d.gallery || []) as GalleryImage[],
      folderCovers: (d.folder_covers || {}) as Record<number, string>,
      updated_at: d.updated_at,
    };
    // Sincroniza baseline do diff do autosave.
    lastSavedRef.current[id] = { name: rec.name, method: rec.method, db: rec.db, gallery: rec.gallery, folderCovers: rec.folderCovers };
    return rec;
  }, []);

  const createWorld = useCallback(async (state: AppState): Promise<WorldRecord | null> => {
    if (!user) return null;
    const name = state.worldName || 'Mundo Sem Nome';
    if (name.length > 200) { toast.error('Nome do mundo muito longo (máximo 200 caracteres)'); return null; }
    const { data, error } = await supabase
      .from('worlds')
      .insert({
        user_id: user.id,
        name,
        method: state.method,
        db: state.db as any,
        gallery: state.gallery as any,
        folder_covers: (state.folderCovers || {}) as any,
      } as any)
      .select()
      .single();
    if (error) { console.error(error); toast.error('Erro ao criar mundo'); return null; }
    const d = data as any;
    const record: WorldRecord = {
      id: d.id,
      name: d.name,
      method: d.method as MethodType,
      db: (d.db || {}) as any,
      gallery: (d.gallery || []) as any,
      folderCovers: (d.folder_covers || {}) as any,
      updated_at: d.updated_at,
    };
    lastSavedRef.current[record.id] = { name: record.name, method: record.method, db: record.db, gallery: record.gallery, folderCovers: record.folderCovers };
    qc.setQueryData(WORLDS_KEY(user.id), (old: WorldRecord[] = []) => [record, ...old]);
    return record;
  }, [user, qc]);

  /**
   * Update com diff: só envia ao banco os campos que realmente mudaram desde
   * a última gravação. Evita reescrever JSONs pesados (db + gallery) a cada
   * autosave de 2s quando apenas o nome ou o método foi alterado.
   */
  const updateWorld = useCallback(async (id: string, updates: Partial<Pick<WorldRecord, 'name' | 'method' | 'db' | 'gallery' | 'folderCovers'>>) => {
    if (updates.name && updates.name.length > 200) { toast.error('Nome do mundo muito longo (máximo 200 caracteres)'); return; }

    const baseline = lastSavedRef.current[id];
    const patch: Record<string, unknown> = {};
    if (updates.name !== undefined && (!baseline || updates.name !== baseline.name)) patch.name = updates.name;
    if (updates.method !== undefined && (!baseline || updates.method !== baseline.method)) patch.method = updates.method;
    if (updates.db !== undefined && (!baseline || updates.db !== baseline.db)) patch.db = updates.db as any;
    if (updates.gallery !== undefined && (!baseline || updates.gallery !== baseline.gallery)) patch.gallery = updates.gallery as any;
    if (updates.folderCovers !== undefined && (!baseline || updates.folderCovers !== baseline.folderCovers)) patch.folder_covers = updates.folderCovers as any;

    if (Object.keys(patch).length === 0) return; // nada para gravar

    const { error } = await supabase.from('worlds').update(patch as any).eq('id', id);
    if (error) {
      console.error(error);
      toast.error('Não foi possível salvar o mundo. Verifique sua conexão e tente novamente.');
      return;
    }
    lastSavedRef.current[id] = {
      name: (patch.name as string) ?? baseline?.name ?? '',
      method: (patch.method as MethodType) ?? baseline?.method ?? ('top-down' as MethodType),
      db: (patch.db as any) ?? baseline?.db ?? {},
      gallery: (patch.gallery as any) ?? baseline?.gallery ?? [],
      folderCovers: (patch.folder_covers as any) ?? baseline?.folderCovers ?? {},
    };
    qc.setQueryData(WORLDS_KEY(user?.id), (old: WorldRecord[] = []) =>
      old.map(w => w.id === id ? { ...w, ...updates, updated_at: new Date().toISOString() } : w)
    );
  }, [qc, user?.id]);

  const deleteWorld = useCallback(async (id: string) => {
    const { error } = await supabase.from('worlds').delete().eq('id', id);
    if (error) { console.error(error); toast.error('Erro ao excluir mundo'); return; }
    delete lastSavedRef.current[id];
    qc.setQueryData(WORLDS_KEY(user?.id), (old: WorldRecord[] = []) => old.filter(w => w.id !== id));
    toast.success('Mundo excluído');
  }, [qc, user?.id]);

  return { worlds, loading, createWorld, updateWorld, deleteWorld, loadWorldFull, refetch };
}
