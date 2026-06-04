import React, { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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

/** Shared picker dialog (search + Fichas/Artigos tabs) used for right-click
 *  "Linkar com…" and chip "Trocar vínculo…". */
export const CodexEntryPicker: React.FC<Props> = ({ open, onOpenChange, entries, onSelect, title = 'Vincular a entrada do Codex' }) => {
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<Tab>('all');

  const filtered = useMemo(() => {
    const ql = q.toLowerCase().trim();
    return entries.filter(e => {
      if (tab !== 'all' && e.entry_type !== tab) return false;
      if (ql && !e.title.toLowerCase().includes(ql)) return false;
      return true;
    });
  }, [entries, q, tab]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[70vh] flex flex-col bg-[#0d1520] border-blue-bright/20">
        <DialogHeader>
          <DialogTitle className="font-cinzel text-blue-light text-base">{title}</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <div className="flex bg-white/[0.03] rounded-md p-0.5 border border-blue-bright/10 shrink-0">
            {(['all', 'ficha', 'artigo'] as Tab[]).map(t => (
              <button key={t} type="button" onClick={() => setTab(t)}
                className={`px-2 py-1 text-[10px] uppercase font-montserrat font-bold rounded transition-colors ${
                  tab === t ? 'bg-blue-bright/20 text-blue-light' : 'text-text-dim hover:text-foreground'
                }`}>
                {t === 'all' ? 'Todos' : t === 'ficha' ? 'Fichas' : 'Artigos'}
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-text-dim pointer-events-none" />
            <Input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Buscar fichas e artigos…"
              autoFocus
              className="h-8 pl-7 text-xs bg-white/[0.03] border-blue-bright/10"
            />
            {q && (
              <button type="button" onClick={() => setQ('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 text-text-dim hover:text-foreground">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
        <ScrollArea className="flex-1 border border-blue-bright/10 rounded">
          {filtered.length === 0 ? (
            <p className="text-xs text-text-dim text-center py-6 italic">Nenhuma entrada encontrada.</p>
          ) : (
            <div className="py-1">
              {filtered.map(e => {
                const fruit = e.fruit_id !== null ? FRUITS.find(f => f.id === e.fruit_id) : null;
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => { onSelect(e); onOpenChange(false); }}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-bright/10 flex items-center gap-2 transition-colors"
                  >
                    <span className={e.entry_type === 'ficha' ? 'text-blue-light' : 'text-gold-light'}>{e.title}</span>
                    <span className="text-[9px] text-text-dim uppercase ml-auto">{e.entry_type}</span>
                    {fruit && <fruit.Icon className="w-3 h-3 text-gold-champagne shrink-0" strokeWidth={1.75} />}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
