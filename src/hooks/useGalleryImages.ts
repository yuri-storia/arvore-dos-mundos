import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { GalleryImage } from '@/lib/data';

interface Row {
  id: string;
  user_id: string;
  world_id: string;
  folder_key: string;
  src: string;
  name: string;
  status: 'kept' | 'unsorted';
  position: number;
  created_at: string;
}

const KEY = (uid?: string, wid?: string) => ['gallery-images', uid, wid] as const;

const rowToImage = (r: Row): GalleryImage => ({
  id: r.id,
  src: r.src,
  name: r.name,
  cat: r.folder_key,
  status: r.status,
});

/**
 * Nova arquitetura de galeria: cada imagem é uma linha em `public.gallery_images`,
 * atrelada a `user_id` + `world_id`. Escreve na hora (sem debounce), então
 * uploads persistem mesmo se o usuário fechar a aba imediatamente e voltar
 * de outro dispositivo. Substitui o antigo JSONB `worlds.gallery`.
 */
export function useGalleryImages(worldId?: string) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: rows = [], isLoading: loading } = useQuery({
    queryKey: KEY(user?.id, worldId),
    enabled: !!user && !!worldId,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase
        .from('gallery_images')
        .select('id,user_id,world_id,folder_key,src,name,status,position,created_at')
        .eq('world_id', worldId!)
        .order('position', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) { console.error(error); return []; }
      return (data || []) as Row[];
    },
  });

  const gallery = useMemo(() => rows.map(rowToImage), [rows]);

  const setLocal = (updater: (prev: Row[]) => Row[]) =>
    qc.setQueryData(KEY(user?.id, worldId), (old: Row[] = []) => updater(old));

  const addImages = useCallback(async (imgs: Omit<GalleryImage, 'id'>[]): Promise<GalleryImage[]> => {
    if (!user || !worldId || imgs.length === 0) return [];
    const startPos = rows.length;
    const payload = imgs.map((img, i) => ({
      user_id: user.id,
      world_id: worldId,
      folder_key: img.cat || 'Geral',
      src: img.src,
      name: img.name || 'Sem título',
      status: img.status || 'kept',
      position: startPos + i,
    }));
    const { data, error } = await supabase
      .from('gallery_images')
      .insert(payload)
      .select('id,user_id,world_id,folder_key,src,name,status,position,created_at');
    if (error) { console.error(error); toast.error('Não foi possível salvar as imagens.'); return []; }
    const inserted = (data || []) as Row[];
    setLocal(prev => [...prev, ...inserted]);
    return inserted.map(rowToImage);
  }, [user, worldId, rows.length]);

  const updateImage = useCallback(async (id: string, patch: Partial<Pick<GalleryImage, 'name' | 'cat' | 'status'>>) => {
    const dbPatch: Record<string, unknown> = {};
    if (patch.name !== undefined) dbPatch.name = patch.name;
    if (patch.cat !== undefined) dbPatch.folder_key = patch.cat;
    if (patch.status !== undefined) dbPatch.status = patch.status;
    if (Object.keys(dbPatch).length === 0) return;
    // otimista
    const snap = rows;
    setLocal(prev => prev.map(r => r.id === id ? { ...r, ...dbPatch } as Row : r));
    const { error } = await supabase.from('gallery_images').update(dbPatch).eq('id', id);
    if (error) { console.error(error); toast.error('Erro ao atualizar imagem'); setLocal(() => snap); }
  }, [rows]);

  const removeImage = useCallback(async (id: string) => {
    const snap = rows;
    setLocal(prev => prev.filter(r => r.id !== id));
    const { error } = await supabase.from('gallery_images').delete().eq('id', id);
    if (error) { console.error(error); toast.error('Erro ao remover imagem'); setLocal(() => snap); }
  }, [rows]);

  /**
   * Aceita um array desejado (compatibilidade com API antiga `setGallery(next)`),
   * calcula o diff e aplica inserts/updates/deletes reais. Evita reescrever tudo.
   */
  const replaceAll = useCallback(async (next: GalleryImage[]) => {
    const currentById = new Map(rows.map(r => [r.id, r]));
    const nextIds = new Set(next.map(n => n.id));

    // deletes: presentes no atual, ausentes no next
    const toDelete = rows.filter(r => !nextIds.has(r.id));

    // updates: mesmo id mas cat/name/status mudaram
    const toUpdate: Array<{ id: string; patch: Partial<Pick<GalleryImage, 'name' | 'cat' | 'status'>> }> = [];
    // inserts: id não existe no atual
    const toInsert: Omit<GalleryImage, 'id'>[] = [];

    next.forEach(n => {
      const cur = currentById.get(n.id);
      if (!cur) {
        toInsert.push({ src: n.src, name: n.name, cat: n.cat, status: n.status });
      } else {
        const patch: Record<string, string> = {};
        if (cur.folder_key !== (n.cat || 'Geral')) patch.cat = n.cat;
        if (cur.name !== (n.name || 'Sem título')) patch.name = n.name;
        if ((cur.status || 'kept') !== (n.status || 'kept')) patch.status = n.status || 'kept';
        if (Object.keys(patch).length > 0) toUpdate.push({ id: n.id, patch: patch as any });
      }
    });

    await Promise.all([
      ...toDelete.map(r => removeImage(r.id)),
      ...toUpdate.map(u => updateImage(u.id, u.patch)),
      toInsert.length > 0 ? addImages(toInsert) : Promise.resolve(),
    ]);
  }, [rows, addImages, updateImage, removeImage]);

  const addOne = useCallback(async (img: Omit<GalleryImage, 'id'>) => {
    const [created] = await addImages([img]);
    return created;
  }, [addImages]);

  return { gallery, loading, addImages, addOne, updateImage, removeImage, replaceAll };
}
