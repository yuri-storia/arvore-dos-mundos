import React, { useState } from 'react';
import { listSaves, deleteSave, type WorldSave } from '@/lib/saves';

interface Props {
  currentSaveId: string;
  onNewWorld: () => void;
  onLoadWorld: (save: WorldSave) => void;
  onSaveWorld: () => void;
}

export const WorldSelector: React.FC<Props> = ({ currentSaveId, onNewWorld, onLoadWorld, onSaveWorld }) => {
  const [open, setOpen] = useState(false);
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

  return (
    <div className="mx-auto max-w-[1060px] px-4 mb-4">
      <div className="card-glass rounded-lg p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={onSaveWorld}
              className="px-3 py-1.5 rounded-md text-xs font-montserrat font-bold uppercase tracking-wider bg-amber hover:bg-amber-bright text-background transition-colors"
            >
              💾 Salvar
            </button>
            <button
              onClick={() => setOpen(!open)}
              className="px-3 py-1.5 rounded-md text-xs font-montserrat font-bold uppercase tracking-wider border border-gold/25 text-text-secondary hover:text-foreground transition-colors"
            >
              📂 Meus Mundos {saves.length > 0 && `(${saves.length})`}
            </button>
            <button
              onClick={onNewWorld}
              className="px-3 py-1.5 rounded-md text-xs font-montserrat font-bold uppercase tracking-wider border border-gold/30 text-gold-light hover:text-gold transition-colors"
            >
              ✦ Novo Mundo
            </button>
          </div>
          {currentSaveId && (
            <span className="text-[10px] text-text-dim font-montserrat">
              Salvamento automático ao trocar de mundo
            </span>
          )}
        </div>

        {open && (
          <div className="mt-4 animate-fadeUp">
            {saves.length === 0 ? (
              <p className="text-sm text-text-dim font-merriweather italic py-3">
                Nenhum mundo salvo ainda. Clique em "Salvar" para criar seu primeiro save.
              </p>
            ) : (
              <div className="grid gap-2 max-h-[300px] overflow-y-auto pr-1">
                {saves.map(s => (
                  <div
                    key={s.id}
                    className={`flex items-center justify-between gap-3 p-3 rounded-md border transition-all cursor-pointer hover:border-gold/30 ${
                      s.id === currentSaveId
                        ? 'border-gold/40 bg-gold/[0.05]'
                        : 'border-gold/10 hover:bg-gold/[0.03]'
                    }`}
                    onClick={() => { onLoadWorld(s); setOpen(false); }}
                  >
                    <div className="min-w-0 flex-1">
                      <h4 className="font-cinzel font-bold text-sm text-foreground truncate">
                        {s.name}
                        {s.id === currentSaveId && <span className="text-gold-light text-[10px] ml-2">● ativo</span>}
                      </h4>
                      <div className="flex gap-3 text-[10px] text-text-dim font-montserrat">
                        <span>{s.method === 'top-down' ? 'Cima p/ Baixo' : 'Baixo p/ Cima'}</span>
                        <span>{formatDate(s.updatedAt)}</span>
                      </div>
                    </div>
                    <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                      {confirmDelete === s.id ? (
                        <>
                          <button
                            onClick={() => handleDelete(s.id)}
                            className="px-2 py-1 rounded text-[10px] font-montserrat font-bold bg-destructive/20 text-destructive border border-destructive/30 hover:bg-destructive/30"
                          >
                            Confirmar
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="px-2 py-1 rounded text-[10px] font-montserrat text-text-dim border border-gold/15"
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(s.id)}
                          className="px-2 py-1 rounded text-[10px] font-montserrat text-text-dim border border-gold/10 hover:border-destructive/30 hover:text-destructive transition-colors"
                        >
                          🗑
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
