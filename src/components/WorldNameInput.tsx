import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ChevronDown, ChevronUp, FolderOpen, Plus } from 'lucide-react';
import { listSaves, deleteSave, type WorldSave } from '@/lib/saves';

interface Props {
  worldName: string;
  setWorldName: (n: string) => void;
  hasBeenCreated: boolean;
  onCreateWorld: () => void;
  onLoadWorld: (save: WorldSave) => void;
  onNewWorld: () => void;
  currentSaveId: string;
}

export const WorldNameInput: React.FC<Props> = ({ worldName, setWorldName, hasBeenCreated, onCreateWorld, onLoadWorld, onNewWorld, currentSaveId }) => {
  const [glowing, setGlowing] = useState(false);
  const [focused, setFocused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const saves = listSaves().sort((a, b) => b.updatedAt - a.updatedAt);

  useEffect(() => {
    if (!worldName) return;
    setGlowing(true);
    const t = setTimeout(() => setGlowing(false), 800);
    return () => clearTimeout(t);
  }, [worldName]);

  useEffect(() => {
    if (focused && inputRef.current) inputRef.current.focus();
  }, [focused]);

  const handleDelete = (id: string) => {
    deleteSave(id);
    setConfirmDelete(null);
    if (id === currentSaveId) onNewWorld();
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const showCreateButton = worldName.trim().length > 0 && !hasBeenCreated;

  return (
    <div className="mx-auto max-w-[1060px] px-4 mb-6 mt-8 flex flex-col items-center text-center">
      {/* "Meus Projetos" toggle button */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-gold/[0.10] border border-gold/30 hover:bg-gold/[0.18] hover:border-gold/50 transition-all backdrop-blur-sm mb-3 group"
      >
        <FolderOpen className="w-3 h-3 text-gold/70 group-hover:text-gold-light transition-colors" />
        <span className="font-cinzel text-[9px] uppercase tracking-[0.2em] text-gold group-hover:text-gold-light transition-colors">
          Meus Projetos {saves.length > 0 && `(${saves.length})`}
        </span>
        {menuOpen
          ? <ChevronUp className="w-3 h-3 text-gold/60" />
          : <ChevronDown className="w-3 h-3 text-gold/60" />
        }
      </button>

      {/* Dropdown: saved worlds + new world */}
      {menuOpen && (
        <div className="w-full max-w-md mb-4 animate-fadeUp rounded-lg border border-gold/20 backdrop-blur-[16px] overflow-hidden" style={{ background: 'linear-gradient(135deg, hsl(38 67% 48% / 0.08) 0%, hsl(214 60% 3% / 0.85) 100%)' }}>
          {/* New world button */}
          <button
            onClick={() => { onNewWorld(); setMenuOpen(false); }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-[10px] font-montserrat font-bold uppercase tracking-wider text-gold-light/80 hover:text-gold-light hover:bg-gold/[0.08] transition-all border-b border-gold/10"
          >
            <Plus className="w-3 h-3" />
            Criar Novo Mundo
          </button>

          {/* Saved worlds list */}
          {saves.length === 0 ? (
            <p className="text-[10px] text-text-dim font-merriweather italic py-3 text-center">
              Nenhum projeto salvo ainda.
            </p>
          ) : (
            <div className="max-h-[200px] overflow-y-auto">
              {saves.map(s => (
                <div
                  key={s.id}
                  className={`flex items-center justify-between gap-2 px-3 py-2 cursor-pointer transition-all text-xs border-b border-gold/5 last:border-0 ${
                    s.id === currentSaveId
                      ? 'bg-blue-bright/[0.06]'
                      : 'hover:bg-blue-bright/[0.03]'
                  }`}
                  onClick={() => { onLoadWorld(s); setMenuOpen(false); }}
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-cinzel font-bold text-[11px] text-foreground truncate block">
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
                        <button onClick={() => handleDelete(s.id)} className="px-1.5 py-0.5 rounded text-[9px] font-montserrat font-bold bg-destructive/20 text-destructive border border-destructive/30">Sim</button>
                        <button onClick={() => setConfirmDelete(null)} className="px-1.5 py-0.5 rounded text-[9px] font-montserrat text-text-dim border border-blue-bright/15">Não</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDelete(s.id)} className="px-1.5 py-0.5 rounded text-[9px] text-text-dim hover:text-destructive transition-colors">🗑</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* World name display / input */}
      {worldName && !focused ? (
        <div
          onClick={() => setFocused(true)}
          className="cursor-text w-full max-w-2xl text-center text-[clamp(1.6rem,4.5vw,2.8rem)] font-cinzel font-bold text-foreground leading-tight transition-all duration-500"
          style={{
            textShadow: glowing
              ? '0 0 40px hsl(207 90% 61% / 0.7), 0 0 80px hsl(207 90% 61% / 0.4), 0 0 120px hsl(207 90% 61% / 0.2), 0 2px 4px rgba(0,0,0,0.5)'
              : '0 0 30px hsl(207 90% 61% / 0.25), 0 2px 4px rgba(0,0,0,0.5)',
          }}
        >
          {worldName}
        </div>
      ) : (
        <input
          ref={inputRef}
          type="text"
          value={worldName}
          onChange={e => setWorldName(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Nome do seu Projeto…"
          className="w-full max-w-2xl bg-transparent border-0 text-center text-[clamp(1.6rem,4.5vw,2.8rem)] font-cinzel font-bold text-foreground placeholder:text-text-dim/40 placeholder:text-[clamp(1.1rem,3vw,1.8rem)] placeholder:font-normal focus:outline-none leading-tight transition-all duration-500"
          style={{
            textShadow: glowing
              ? '0 0 40px hsl(207 90% 61% / 0.7), 0 0 80px hsl(207 90% 61% / 0.4), 0 0 120px hsl(207 90% 61% / 0.2), 0 2px 4px rgba(0,0,0,0.5)'
              : '0 0 30px hsl(207 90% 61% / 0.25), 0 2px 4px rgba(0,0,0,0.5)',
          }}
        />
      )}

      {/* Glowing blue line under world name */}
      <div className="relative mt-4 w-full max-w-md h-[2px]">
        <div className="w-full h-full bg-gradient-to-r from-transparent via-[hsl(207,90%,61%)] to-transparent opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[hsl(207,90%,61%)] to-transparent blur-[6px] opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[hsl(207,90%,61%)] to-transparent blur-[14px] opacity-40" />
      </div>

      {showCreateButton && (
        <button
          onClick={onCreateWorld}
          className="mt-4 inline-flex items-center gap-2 px-5 py-2 rounded-full font-montserrat font-bold text-xs uppercase tracking-wider border border-gold/40 bg-gold/[0.12] hover:bg-gold/[0.22] text-gold-light hover:text-gold-light transition-all backdrop-blur-sm shadow-[0_0_20px_rgba(200,146,42,0.15)] hover:shadow-[0_0_30px_rgba(200,146,42,0.25)] animate-fadeUp"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Criar Mundo
        </button>
      )}
    </div>
  );
};
