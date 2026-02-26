import React, { useState } from 'react';
import { listSaves, deleteSave, type WorldSave } from '@/lib/saves';

interface Props {
  currentSaveId: string;
  onNewWorld: () => void;
  onLoadWorld: (save: WorldSave) => void;
  onSaveWorld: () => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const WorldSelector: React.FC<Props> = ({ currentSaveId, onNewWorld, onLoadWorld, open, setOpen }) => {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const saves = listSaves().sort((a, b) => b.updatedAt - a.updatedAt);

  const handleDelete = (id: string) => {
    deleteSave(id);
    setConfirmDelete(null);
    if (id === currentSaveId) onNewWorld();
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  if (!open) return null;

  return (
    <div className="mx-auto max-w-[1060px] px-4 mb-2 animate-fadeUp">
      {saves.length === 0 ? (
        <p className="text-xs text-text-dim font-merriweather italic py-2 text-center">
          Nenhum mundo salvo ainda.
        </p>
      ) : (
        <div className="grid gap-1.5 max-h-[240px] overflow-y-auto pr-1">
          {saves.map(s => (
            <div
              key={s.id}
              className={`flex items-center justify-between gap-2 px-3 py-2 rounded border transition-all cursor-pointer text-xs ${
                s.id === currentSaveId
                  ? 'border-blue-bright/40 bg-blue-bright/[0.06]'
                  : 'border-blue-bright/10 hover:border-blue-bright/25 hover:bg-blue-bright/[0.03]'
              }`}
              onClick={() => { onLoadWorld(s); setOpen(false); }}
            >
              <div className="min-w-0 flex-1">
                <span className="font-cinzel font-bold text-xs text-foreground truncate block">
                  {s.name}
                  {s.id === currentSaveId && <span className="text-blue-light text-[9px] ml-1.5">● ativo</span>}
                </span>
                <span className="text-[9px] text-text-dim font-montserrat">
                  {s.method === 'top-down' ? 'Cima→Baixo' : 'Baixo→Cima'} · {formatDate(s.updatedAt)}
                </span>
              </div>
              <div onClick={e => e.stopPropagation()}>
                {confirmDelete === s.id ? (
                  <div className="flex gap-1">
                    <button onClick={() => handleDelete(s.id)} className="px-1.5 py-0.5 rounded text-[9px] font-montserrat font-bold bg-destructive/20 text-destructive border border-destructive/30">
                      Sim
                    </button>
                    <button onClick={() => setConfirmDelete(null)} className="px-1.5 py-0.5 rounded text-[9px] font-montserrat text-text-dim border border-blue-bright/15">
                      Não
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete(s.id)} className="px-1.5 py-0.5 rounded text-[9px] text-text-dim hover:text-destructive transition-colors">
                    🗑
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
