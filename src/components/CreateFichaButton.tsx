import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { Save, ArrowLeft, X, ClipboardList, PencilLine, Sparkles, BookOpen, Feather, Loader2, ScrollText } from 'lucide-react';

import { FRUITS } from '@/lib/data';
import { useCodexEntries, type CodexEntry } from '@/hooks/useCodexEntries';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

// Overlay centralizado renderizado direto no <body> via portal — evita bugs de
// posicionamento causados por ancestrais com `transform`/`filter`/`backdrop-filter`
// (que quebram `position: fixed` de dialogs internos).
const CenteredOverlay: React.FC<{ open: boolean; onClose: () => void; children: React.ReactNode }> = ({ open, onClose, children }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)' }} aria-hidden="true" />
      <div style={{ position: 'relative', width: '100%', maxWidth: '28rem' }}>{children}</div>
    </div>,
    document.body,
  );
};

interface Props {
  fieldValue: string;
  fieldLabel: string;
  fruitId: number;
  worldId?: string;
  entryType?: 'ficha' | 'artigo';
  onCreated?: (action: 'codex' | 'continue') => void;
  /** Chamado logo após o conteúdo ser salvo (novo ou anexado a existente).
   * Usado pelo pai para limpar o campo — o texto já vive no Codex. */
  onSaved?: () => void;
  timelineOption?: {
    label?: string;
    onSelect: (fieldValue: string, fieldLabel: string) => void;
  };
  children: React.ReactNode;
}

export const CreateFichaButton: React.FC<Props> = ({ fieldValue, fieldLabel, fruitId, worldId, entryType = 'ficha', onCreated, onSaved, timelineOption, children }) => {
  const { user } = useAuth();
  const { entries, createEntry, updateEntry } = useCodexEntries(worldId);
  const [showMenu, setShowMenu] = useState(false);
  const [showAddTo, setShowAddTo] = useState(false);
  const [showTitleDialog, setShowTitleDialog] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [createdEntryName, setCreatedEntryName] = useState('');
  const [saving, setSaving] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    if (!showMenu) return;
    const handlePointer = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
        setShowAddTo(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setShowMenu(false); setShowAddTo(false); }
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('touchstart', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('touchstart', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [showMenu]);

  const hasValue = !!fieldValue?.trim();
  const isFicha = entryType === 'ficha';

  const matchingEntries = entries.filter(e => 
    isFicha ? e.entry_type !== 'artigo' : e.entry_type === 'artigo'
  );

  const handleCreateClick = () => {
    setCustomTitle(fieldLabel);
    setShowTitleDialog(true);
  };

  const handleConfirmCreate = async () => {
    if (saving) return;
    const title = customTitle.trim() || fieldLabel;
    if (!title) { toast.error('Dê um título à ficha antes de criar'); return; }
    if (!worldId) { toast.error('Selecione ou crie um mundo antes de salvar a ficha'); return; }
    setSaving(true);
    try {
      const entry = await createEntry({
        title,
        content: fieldValue,
        entry_type: isFicha ? 'ficha' : 'artigo',
        fruit_id: fruitId,
      });
      if (entry) {
        setShowTitleDialog(false);
        setShowMenu(false);
        setCreatedEntryName(title);
        setShowSuccessDialog(true);
        onSaved?.();
      }
      // Em caso de erro, o hook já dispara toast e mantemos o dialog aberto
      // para o usuário tentar de novo sem perder o que digitou.
    } finally {
      setSaving(false);
    }
  };


  const handleSuccessAction = (action: 'codex' | 'continue') => {
    setShowSuccessDialog(false);
    onCreated?.(action);
  };

  return (
    <div className="relative">
      {children}

      {user && (
        <div className="flex items-center justify-end px-2 py-1.5 rounded-b-md bg-[hsl(var(--blue-main)/0.12)] border border-t-0 border-blue-bright/20">
          <button
            onClick={() => hasValue && setShowMenu(!showMenu)}
            disabled={!hasValue}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-montserrat font-bold uppercase tracking-wider transition-all ${
              hasValue
                ? 'bg-blue-main/80 hover:bg-blue-bright text-foreground border border-blue-bright/40 shadow-[0_0_12px_rgba(33,150,243,0.2)] hover:shadow-[0_0_18px_rgba(33,150,243,0.35)]'
                : 'bg-secondary/30 text-text-dim/40 border border-blue-bright/10 cursor-not-allowed'
            }`}
          >
            <><Save className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />Salvar Informação</>
          </button>
        </div>
      )}

      {showMenu && (
        <div ref={menuRef} className="animate-fadeUp absolute right-0 bottom-full mb-1 z-50 w-[280px] card-glass rounded-lg p-3 shadow-lg border border-blue-bright/30">
          {!showAddTo ? (
            <>
              <h4 className="font-montserrat font-bold text-[10px] uppercase tracking-wider text-blue-light mb-2">
                {isFicha ? 'Salvar como nova ficha no Codex' : 'Salvar como novo artigo no Codex'}
              </h4>
              <div className="flex gap-2">
                <button
                  onClick={handleCreateClick}
                  className="px-3 py-1.5 bg-blue-main hover:bg-blue-bright text-foreground rounded text-[10px] font-montserrat font-bold uppercase transition-colors"
                >
                  {isFicha ? 'Criar Ficha' : 'Criar Artigo'}
                </button>
                <button onClick={() => setShowAddTo(true)} className="px-3 py-1.5 bg-gold/20 hover:bg-gold/30 text-gold-light rounded text-[10px] font-montserrat font-bold uppercase transition-colors">
                  {isFicha ? 'Inserir em Ficha Existente' : 'Inserir em Artigo Existente'}
                </button>
              </div>
              {timelineOption && (
                <div className="mt-3 pt-3 border-t border-gold/20">
                  <h4 className="font-montserrat font-bold text-[10px] uppercase tracking-wider text-gold-light mb-2 inline-flex items-center gap-1.5">
                    <ScrollText className="w-3 h-3 text-gold-champagne" strokeWidth={1.75} />
                    Linha do Tempo
                  </h4>
                  <button
                    onClick={() => {
                      timelineOption.onSelect(fieldValue, fieldLabel);
                      setShowMenu(false);
                    }}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-montserrat font-bold uppercase tracking-wider bg-gradient-to-r from-gold-deep via-gold-warm to-gold text-[#1a0f00] hover:from-gold-warm hover:via-gold hover:to-gold-light shadow-[0_0_10px_hsl(var(--gold)/0.25)] hover:shadow-[0_0_16px_hsl(var(--gold)/0.45)] transition-all"
                  >
                    <ScrollText className="w-3 h-3" strokeWidth={2} />
                    {timelineOption.label ?? 'Criar entrada na Linha do Tempo'}
                  </button>
                </div>
              )}
            </>

          ) : (
            <>
              <h4 className="font-montserrat font-bold text-[10px] uppercase tracking-wider text-gold-light mb-2">
                {isFicha ? 'Inserir em ficha existente' : 'Inserir em artigo existente'}
              </h4>
              {matchingEntries.length === 0 ? (
                <p className="text-[10px] text-text-dim font-merriweather italic">
                  {isFicha ? 'Nenhuma ficha existente.' : 'Nenhum artigo existente.'}
                </p>
              ) : (
                <div className="max-h-[200px] overflow-y-auto space-y-1">
                  {matchingEntries.map(e => {
                    const fruitInfo = FRUITS.find(f => f.id === e.fruit_id);
                    return (
                      <button
                        key={e.id}
                        onClick={async () => {
                          try {
                            const separator = e.content ? '\n\n---\n\n' : '';
                            await updateEntry(e.id, { content: `${e.content}${separator}**${fieldLabel}:**\n${fieldValue}` });
                            toast.success(`Adicionado a "${e.title}"`);
                            onSaved?.();
                          } catch (err) {
                            toast.error('Não foi possível atualizar a ficha');
                            console.error(err);
                          } finally {
                            setShowAddTo(false);
                            setShowMenu(false);
                          }
                        }}
                        className="w-full text-left px-2 py-1.5 rounded hover:bg-blue-bright/10 transition-colors"
                      >
                        <span className="text-xs text-foreground font-montserrat font-bold block">{fruitInfo?.icon} {e.title}</span>
                      </button>

                    );
                  })}
                </div>
              )}
              <button onClick={() => setShowAddTo(false)} className="mt-2 inline-flex items-center gap-1 text-[10px] text-text-dim font-montserrat hover:text-foreground transition-colors"><ArrowLeft className="w-3 h-3" strokeWidth={2} />Voltar</button>
            </>
          )}
          <button onClick={() => setShowMenu(false)} className="absolute top-1 right-1 w-5 h-5 rounded-full text-text-dim hover:text-foreground flex items-center justify-center" aria-label="Fechar"><X className="w-3.5 h-3.5" strokeWidth={2} /></button>
        </div>
      )}

      {/* Title input dialog */}
      <CenteredOverlay open={showTitleDialog} onClose={() => { if (!saving) setShowTitleDialog(false); }}>
        <div className="card-glass border border-blue-bright/30 rounded-lg p-6 shadow-2xl">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <h2 className="font-cinzel text-blue-light text-lg">
                {isFicha ? <><ClipboardList className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />Nova Ficha</> : <><PencilLine className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />Novo Artigo</>}
              </h2>
              <p className="text-text-dim font-merriweather text-sm mt-1">
                Escolha um título para {isFicha ? 'sua ficha' : 'seu artigo'}:
              </p>
            </div>
            <button onClick={() => !saving && setShowTitleDialog(false)} className="text-text-dim hover:text-foreground" aria-label="Fechar">
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
          <input
            type="text"
            value={customTitle}
            onChange={e => setCustomTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleConfirmCreate()}
            placeholder="Digite o título…"
            autoFocus
            className="w-full bg-[rgba(4,12,24,0.6)] border border-blue-bright/20 rounded-md px-3 py-2 text-sm text-foreground font-merriweather focus:outline-none focus:border-blue-bright/50"
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={() => setShowTitleDialog(false)} disabled={saving} className="text-text-dim">
              Cancelar
            </Button>
            <Button onClick={handleConfirmCreate} disabled={saving} className="bg-blue-main hover:bg-blue-bright text-foreground">
              {saving ? (<><Loader2 className="inline-block w-3.5 h-3.5 mr-1.5 animate-spin align-[-0.15em]" />Criando…</>) : 'Criar'}
            </Button>
          </div>
        </div>
      </CenteredOverlay>

      {/* Success dialog */}
      <CenteredOverlay open={showSuccessDialog} onClose={() => setShowSuccessDialog(false)}>
        <div className={`rounded-lg p-6 shadow-2xl border ${isFicha ? 'card-glass border-blue-bright/30' : 'card-glass-gold border-gold/30'}`}>
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <h2 className={`font-cinzel text-lg ${isFicha ? 'text-blue-light' : 'text-gold-light'}`}>
                <Sparkles className="inline-block w-4 h-4 mr-1.5 align-[-0.2em] text-gold-champagne" strokeWidth={1.75} />{isFicha ? 'Ficha Criada!' : 'Artigo Criado!'}
              </h2>
              <p className="text-text-secondary font-merriweather text-sm mt-1">
                <strong>"{createdEntryName}"</strong> foi salvo no Codex com sucesso.
              </p>
            </div>
            <button onClick={() => setShowSuccessDialog(false)} className="text-text-dim hover:text-foreground" aria-label="Fechar">
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => handleSuccessAction('codex')}
              className={`${isFicha ? 'border-blue-bright/30 text-blue-light hover:bg-blue-main/20' : 'border-gold/30 text-gold-light hover:bg-gold/20'}`}
            >
              <BookOpen className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />Ver Codex
            </Button>
            <Button
              onClick={() => handleSuccessAction('continue')}
              className={`${isFicha ? 'bg-blue-main hover:bg-blue-bright' : 'bg-gold/80 hover:bg-gold'} text-foreground`}
            >
              <Feather className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />Continuar a Criar
            </Button>
          </div>
        </div>
      </CenteredOverlay>
    </div>
  );
};
