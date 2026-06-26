import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ImportedSuggestion } from '@/lib/helpers';

export interface ImportSuggestionStored extends ImportedSuggestion {
  /** ID da entrada do Codex criada a partir desta sugestão (quando já foi materializada) */
  created_entry_id?: string | null;
}

export interface IdrielImportRecord {
  id: string;
  user_id: string;
  world_id: string;
  source_kind: 'pdf' | 'docx' | 'txt' | 'md' | 'texto';
  source_name: string;
  source_size: number;
  storage_path: string | null;
  pasted_text: string | null;
  suggestions: ImportSuggestionStored[];
  created_at: string;
  updated_at: string;
  expires_at: string;
}

const MAX_PER_WORLD = 30;

export function useIdrielImports(worldId: string | null | undefined) {
  const [imports, setImports] = useState<IdrielImportRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!worldId) { setImports([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('idriel_imports' as never)
      .select('*')
      .eq('world_id', worldId)
      .order('created_at', { ascending: false });
    setLoading(false);
    if (error) { console.error('useIdrielImports.fetchAll', error); return; }
    setImports((data || []) as unknown as IdrielImportRecord[]);
  }, [worldId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /** Cria um registro e (FIFO) remove os mais antigos quando passa de MAX_PER_WORLD. */
  const createRecord = useCallback(async (input: {
    sourceKind: IdrielImportRecord['source_kind'];
    sourceName: string;
    sourceSize: number;
    storagePath?: string | null;
    pastedText?: string | null;
    suggestions: ImportSuggestionStored[];
  }): Promise<IdrielImportRecord | null> => {
    if (!worldId) return null;
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData?.user?.id;
    if (!uid) return null;
    const { data, error } = await supabase
      .from('idriel_imports' as never)
      .insert({
        user_id: uid,
        world_id: worldId,
        source_kind: input.sourceKind,
        source_name: input.sourceName.slice(0, 200),
        source_size: input.sourceSize,
        storage_path: input.storagePath ?? null,
        pasted_text: input.pastedText ?? null,
        suggestions: input.suggestions as unknown as object,
      } as never)
      .select('*')
      .single();
    if (error) { console.error('createRecord', error); return null; }

    // FIFO cleanup
    const { data: extras } = await supabase
      .from('idriel_imports' as never)
      .select('id, storage_path')
      .eq('world_id', worldId)
      .order('created_at', { ascending: false })
      .range(MAX_PER_WORLD, MAX_PER_WORLD + 50);
    if (extras && extras.length > 0) {
      const ids = (extras as Array<{ id: string; storage_path: string | null }>).map(e => e.id);
      const paths = (extras as Array<{ id: string; storage_path: string | null }>).map(e => e.storage_path).filter(Boolean) as string[];
      if (paths.length > 0) await supabase.storage.from('idriel-imports').remove(paths);
      await supabase.from('idriel_imports' as never).delete().in('id', ids);
    }

    await fetchAll();
    return data as unknown as IdrielImportRecord;
  }, [worldId, fetchAll]);

  const updateSuggestions = useCallback(async (id: string, suggestions: ImportSuggestionStored[]) => {
    const { error } = await supabase
      .from('idriel_imports' as never)
      .update({ suggestions: suggestions as unknown as object } as never)
      .eq('id', id);
    if (error) { console.error('updateSuggestions', error); return; }
    setImports(prev => prev.map(r => r.id === id ? { ...r, suggestions } : r));
  }, []);

  const deleteRecord = useCallback(async (id: string) => {
    const target = imports.find(r => r.id === id);
    if (target?.storage_path) {
      await supabase.storage.from('idriel-imports').remove([target.storage_path]);
    }
    const { error } = await supabase.from('idriel_imports' as never).delete().eq('id', id);
    if (error) { console.error('deleteRecord', error); return; }
    setImports(prev => prev.filter(r => r.id !== id));
  }, [imports]);

  /** Faz upload do arquivo bruto ao bucket privado e retorna o storage_path. */
  const uploadSourceFile = useCallback(async (file: File): Promise<string | null> => {
    if (!worldId) return null;
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData?.user?.id;
    if (!uid) return null;
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase().slice(0, 8);
    const path = `${uid}/${worldId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('idriel-imports').upload(path, file, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });
    if (error) { console.error('uploadSourceFile', error); return null; }
    return path;
  }, [worldId]);

  return { imports, loading, refetch: fetchAll, createRecord, updateSuggestions, deleteRecord, uploadSourceFile };
}
