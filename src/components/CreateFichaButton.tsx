import React, { useState } from 'react';
import { FRUITS, CODEX_ENTRY_TYPES } from '@/lib/data';
import { useCodexEntries, type CodexEntry } from '@/hooks/useCodexEntries';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  fieldValue: string;
  fieldLabel: string;
  fruitId: number;
  children: React.ReactNode;
}

export const CreateFichaButton: React.FC<Props> = ({ fieldValue, fieldLabel, fruitId, children }) => {
  const { user } = useAuth();
  const { entries, createEntry, updateEntry } = useCodexEntries();
  const [showMenu, setShowMenu] = useState(false);
  const [showAddTo, setShowAddTo] = useState(false);
  const [selectedType, setSelectedType] = useState('personagem');

  const hasValue = !!fieldValue?.trim();

  return (
    <div className="relative">
      {/* The field content */}
      {children}

      {/* Bottom bar with save button */}
      {user && (
        <div className="flex items-center justify-end px-2 py-1.5 rounded-b-md bg-[rgba(4,12,24,0.4)] border border-t-0 border-blue-bright/15">
          <button
            onClick={() => hasValue && setShowMenu(!showMenu)}
            disabled={!hasValue}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-montserrat font-bold uppercase tracking-wider transition-all ${
              hasValue
                ? 'bg-blue-main/80 hover:bg-blue-bright text-foreground border border-blue-bright/40 shadow-[0_0_12px_rgba(33,150,243,0.2)] hover:shadow-[0_0_18px_rgba(33,150,243,0.35)]'
                : 'bg-secondary/30 text-text-dim/40 border border-blue-bright/10 cursor-not-allowed'
            }`}
          >
            💾 Salvar Informação
          </button>
        </div>
      )}

      {/* Dropdown menu */}
      {showMenu && (
        <div className="animate-fadeUp absolute right-0 bottom-full mb-1 z-50 w-[280px] card-glass rounded-lg p-3 shadow-lg border border-blue-bright/30">
          {!showAddTo ? (
            <>
              <h4 className="font-montserrat font-bold text-[10px] uppercase tracking-wider text-blue-light mb-2">Salvar como nova ficha no Codex</h4>
              <div className="mb-2">
                <select value={selectedType} onChange={e => setSelectedType(e.target.value)} className="w-full bg-[rgba(4,12,24,0.6)] border border-blue-bright/15 rounded-md px-2 py-1 text-xs text-foreground font-merriweather focus:outline-none focus:border-blue-bright/50">
                  {CODEX_ENTRY_TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    await createEntry({ title: fieldLabel, content: fieldValue, entry_type: selectedType, fruit_id: fruitId });
                    setShowMenu(false);
                  }}
                  className="px-3 py-1.5 bg-blue-main hover:bg-blue-bright text-foreground rounded text-[10px] font-montserrat font-bold uppercase transition-colors"
                >
                  Criar nova ficha
                </button>
                <button onClick={() => setShowAddTo(true)} className="px-3 py-1.5 bg-gold/20 hover:bg-gold/30 text-gold-light rounded text-[10px] font-montserrat font-bold uppercase transition-colors">
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
                      <button
                        key={e.id}
                        onClick={async () => {
                          const separator = e.content ? '\n\n---\n\n' : '';
                          await updateEntry(e.id, { content: `${e.content}${separator}**${fieldLabel}:**\n${fieldValue}` });
                          setShowAddTo(false);
                          setShowMenu(false);
                        }}
                        className="w-full text-left px-2 py-1.5 rounded hover:bg-blue-bright/10 transition-colors"
                      >
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
