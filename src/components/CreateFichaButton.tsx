import React, { useState } from 'react';
import { FRUITS, CODEX_ENTRY_TYPES } from '@/lib/data';
import { useCodexEntries, type CodexEntry } from '@/hooks/useCodexEntries';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  fieldValue: string;
  fieldLabel: string;
  fruitId: number;
}

export const CreateFichaButton: React.FC<Props> = ({ fieldValue, fieldLabel, fruitId }) => {
  const { user } = useAuth();
  const { entries, createEntry, updateEntry } = useCodexEntries();
  const [showMenu, setShowMenu] = useState(false);
  const [showAddTo, setShowAddTo] = useState(false);
  const [selectedType, setSelectedType] = useState('personagem');

  if (!user || !fieldValue?.trim()) return null;

  const handleCreate = async () => {
    await createEntry({
      title: fieldLabel,
      content: fieldValue,
      entry_type: selectedType,
      fruit_id: fruitId,
    });
    setShowMenu(false);
  };

  const handleAddTo = async (entry: CodexEntry) => {
    const separator = entry.content ? '\n\n---\n\n' : '';
    await updateEntry(entry.id, {
      content: `${entry.content}${separator}**${fieldLabel}:**\n${fieldValue}`,
    });
    setShowAddTo(false);
    setShowMenu(false);
  };

  return (
    <div className="relative mt-1.5">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-montserrat font-bold text-blue-light/60 hover:text-blue-light hover:bg-blue-bright/10 border border-transparent hover:border-blue-bright/20 transition-all"
      >
        📋 Criar ficha
      </button>

      {showMenu && (
        <div className="animate-fadeUp absolute left-0 top-full mt-1 z-50 w-[260px] card-glass rounded-lg p-3 shadow-lg border border-blue-bright/30">
          {!showAddTo ? (
            <>
              <h4 className="font-montserrat font-bold text-[10px] uppercase tracking-wider text-blue-light mb-2">Nova ficha a partir deste campo</h4>
              <div className="mb-2">
                <select value={selectedType} onChange={e => setSelectedType(e.target.value)} className="w-full bg-[rgba(4,12,24,0.6)] border border-blue-bright/15 rounded-md px-2 py-1 text-xs text-foreground font-merriweather focus:outline-none focus:border-blue-bright/50">
                  {CODEX_ENTRY_TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={handleCreate} className="px-3 py-1 bg-blue-main hover:bg-blue-bright text-foreground rounded text-[10px] font-montserrat font-bold uppercase transition-colors">
                  Criar
                </button>
                <button onClick={() => setShowAddTo(true)} className="px-3 py-1 bg-gold/20 hover:bg-gold/30 text-gold-light rounded text-[10px] font-montserrat font-bold uppercase transition-colors">
                  Adicionar em existente
                </button>
              </div>
            </>
          ) : (
            <>
              <h4 className="font-montserrat font-bold text-[10px] uppercase tracking-wider text-gold-light mb-2">Adicionar em ficha existente</h4>
              {entries.length === 0 ? (
                <p className="text-[10px] text-text-dim font-merriweather italic">Nenhuma ficha existente.</p>
              ) : (
                <div className="max-h-[200px] overflow-y-auto space-y-1">
                  {entries.map(e => {
                    const typeInfo = CODEX_ENTRY_TYPES.find(t => t.id === e.entry_type);
                    return (
                      <button key={e.id} onClick={() => handleAddTo(e)} className="w-full text-left px-2 py-1.5 rounded hover:bg-blue-bright/10 transition-colors">
                        <span className="text-xs text-foreground font-montserrat font-bold block">{typeInfo?.icon} {e.title}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              <button onClick={() => setShowAddTo(false)} className="mt-2 text-[10px] text-text-dim font-montserrat hover:text-foreground transition-colors">← Voltar</button>
            </>
          )}
          <button onClick={() => setShowMenu(false)} className="absolute top-1 right-1 w-5 h-5 rounded-full text-text-dim hover:text-foreground text-xs flex items-center justify-center">✕</button>
        </div>
      )}
    </div>
  );
};
