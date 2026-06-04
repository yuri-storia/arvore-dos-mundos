import type { AppState, MethodType, GalleryImage } from './data';

export interface WorldSave {
  id: string;
  name: string;
  method: MethodType;
  db: Record<number, Record<string, string>>;
  gallery: GalleryImage[];
  updatedAt: number;
}

const SAVES_KEY = 'adm_worlds';

export function listSaves(): WorldSave[] {
  try {
    const raw = localStorage.getItem(SAVES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function writeSaves(saves: WorldSave[]) {
  try {
    localStorage.setItem(SAVES_KEY, JSON.stringify(saves));
  } catch (err) {
    console.error('Erro ao salvar no localStorage:', err);
    // Toast importado dinamicamente para evitar dependência circular em arquivo puro
    import('sonner').then(({ toast }) => {
      toast.error('Memória do navegador cheia. Exporte seus mundos e remova rascunhos antigos.');
    }).catch(() => {});
  }
}

export function saveWorld(state: AppState): WorldSave {
  const saves = listSaves();
  const existing = saves.find(s => s.id === state.currentSaveId);
  const save: WorldSave = {
    id: state.currentSaveId || crypto.randomUUID(),
    name: state.worldName || 'Mundo Sem Nome',
    method: state.method,
    db: state.db,
    gallery: state.gallery,
    updatedAt: Date.now(),
  };
  if (existing) {
    const idx = saves.indexOf(existing);
    saves[idx] = save;
  } else {
    saves.push(save);
  }
  writeSaves(saves);
  return save;
}

export function deleteSave(id: string) {
  const saves = listSaves().filter(s => s.id !== id);
  writeSaves(saves);
}

export function loadSave(id: string): WorldSave | null {
  return listSaves().find(s => s.id === id) || null;
}
