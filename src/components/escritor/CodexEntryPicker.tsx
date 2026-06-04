import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Link2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FRUITS } from '@/lib/data';
import type { CodexEntry } from '@/hooks/useCodexEntries';

type Tab = 'all' | 'ficha' | 'artigo';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  entries: CodexEntry[];
  onSelect: (entry: CodexEntry) => void;
  title?: string;
}

/**
 * Premium codex linker — uses a high-z custom portal so it renders ABOVE
 * the expanded Codex card overlay (z-[220]) and any other dialog in the app.
 */
export const CodexEntryPicker: React.FC<Props> = ({
  open, onOpenChange, entries, onSelect, title = 'Vincular a entrada do Codex',
}) => {
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<Tab>('all');

  useEffect(() => {
    if (!open) { setQ(''); setTab('all'); return; }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onOpenChange(false); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onOpenChange]);

  const filtered = useMemo(() => {
    const ql = q.toLowerCase().trim();
    return entries.filter(e => {
      if (tab !== 'all' && e.entry_type !== tab) return false;
      if (ql && !e.title.toLowerCase().includes(ql)) return false;
      return true;
    });
  }, [entries, q, tab]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 animate-in fade-in-0 duration-150">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      {/* Card */}
      <div
        className="relative w-full max-w-md max-h-[70vh] flex flex-col rounded-xl overflow-hidden
          bg-[#0a0f17] border border-gold/30
          shadow-[0_30px_80px_rgba(0,0,0,0.7),0_0_60px_hsl(var(--gold-warm)/0.15)]
          animate-in zoom-in-95 fade-in-0 duration-200"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at top, hsl(var(--gold-warm)/0.08) 0%, transparent 60%)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gold/15">
          <div className="flex items-center gap-2.5 min-w-0">
            <Link2 className="w-4 h-4 text-gold-champagne shrink-0" strokeWidth={1.75} />
            <h3 className="font-cinzel text-[15px] text-gold-light truncate">{title}</h3>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="w-7 h-7 rounded-full text-text-dim hover:text-foreground hover:bg-white/5 flex items-center justify-center transition-colors shrink-0"
            aria-label="Fechar"
          >
            <X className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
        </div>

        {/* Tabs + search */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-gold/10">
          <div className="flex bg-white/[0.03] rounded-md p-0.5 border border-gold/15 shrink-0">
            {(['all', 'ficha', 'artigo'] as Tab[]).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`px-2.5 py-1 text-[10px] uppercase font-montserrat font-bold rounded transition-colors ${
                  tab === t
                    ? 'bg-gradient-to-b from-gold-warm/30 to-gold-deep/30 text-gold-light border border-gold/30'
                    : 'text-text-dim hover:text-foreground'
                }`}
              >
                {t === 'all' ? 'Todos' : t === 'ficha' ? 'Fichas' : 'Artigos'}
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gold-champagne/60 pointer-events-none" />
            <Input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Buscar fichas e artigos…"
              autoFocus
              className="h-8 pl-8 text-xs bg-white/[0.03] border-gold/15 focus-visible:ring-gold/40 focus-visible:ring-offset-0"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 text-text-dim hover:text-foreground"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <ScrollArea className="flex-1 min-h-0">
          {filtered.length === 0 ? (
            <p className="text-xs text-text-dim text-center py-8 italic font-merriweather">
              Nenhuma entrada encontrada.
            </p>
          ) : (
            <div className="py-1">
              {filtered.map(e => {
                const fruit = e.fruit_id !== null ? FRUITS.find(f => f.id === e.fruit_id) : null;
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => { onSelect(e); onOpenChange(false); }}
                    className="w-full text-left px-5 py-2 text-xs hover:bg-gold/[0.06] flex items-center gap-2.5 transition-colors group"
                  >
                    <span
                      className={`font-merriweather truncate ${
                        e.entry_type === 'ficha' ? 'text-blue-light' : 'text-gold-light'
                      }`}
                    >
                      {e.title}
                    </span>
                    <span className="text-[8px] text-text-dim uppercase tracking-wider font-montserrat font-bold ml-auto shrink-0">
                      {e.entry_type}
                    </span>
                    {fruit && <fruit.Icon className="w-3 h-3 text-gold-champagne/70 shrink-0" strokeWidth={1.75} />}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>,
    document.body
  );
};
