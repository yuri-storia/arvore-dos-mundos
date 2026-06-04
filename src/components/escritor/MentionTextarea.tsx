import React, { useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Link2 } from 'lucide-react';
import {
  ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem,
} from '@/components/ui/context-menu';
import { CodexEntryPicker } from './CodexEntryPicker';
import type { CodexEntry } from '@/hooks/useCodexEntries';

interface Props {
  value: string;
  onChange: (next: string) => void;
  entries: CodexEntry[];
  placeholder?: string;
  className?: string;
  wrapperClassName?: string;
  rows?: number;
  autoFocus?: boolean;
  onClick?: React.MouseEventHandler<HTMLTextAreaElement>;
}

type Tab = 'all' | 'ficha' | 'artigo';

/**
 * Textarea with:
 *  - `@` autocomplete popup (search + Fichas/Artigos filter)
 *  - right-click "Linkar a entrada do Codex…" → shared picker dialog
 */
export const MentionTextarea = React.forwardRef<HTMLTextAreaElement, Props>(({
  value, onChange, entries, placeholder, className, wrapperClassName, rows, autoFocus, onClick,
}, ref) => {
  const innerRef = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(ref, () => innerRef.current!);
  const [mention, setMention] = useState<{ active: boolean; query: string }>({ active: false, query: '' });
  const [mentionTab, setMentionTab] = useState<Tab>('all');
  const selectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    onChange(v);
    const ta = innerRef.current;
    if (!ta) return;
    const cursor = ta.selectionStart;
    const before = v.slice(0, cursor);
    const m = before.match(/@([\w\sÀ-ÿ-]{0,40})$/);
    if (m) setMention({ active: true, query: m[1] });
    else if (mention.active) setMention({ active: false, query: '' });
  };

  const matches = useMemo(() => {
    if (!mention.active) return [];
    const q = mention.query.toLowerCase().trim();
    return entries
      .filter(e => mentionTab === 'all' || e.entry_type === mentionTab)
      .filter(e => !q || e.title.toLowerCase().includes(q))
      .slice(0, 10);
  }, [mention, entries, mentionTab]);

  const insertMention = (name: string) => {
    const ta = innerRef.current;
    if (!ta) return;
    const cursor = ta.selectionStart;
    const before = value.slice(0, cursor);
    const at = before.lastIndexOf('@');
    if (at < 0) return;
    const next = value.slice(0, at) + `@${name}` + value.slice(cursor);
    onChange(next);
    setMention({ active: false, query: '' });
    setMentionTab('all');
    setTimeout(() => {
      ta.focus();
      const pos = at + name.length + 1;
      ta.setSelectionRange(pos, pos);
    }, 0);
  };

  const handleContextMenu = () => {
    const ta = innerRef.current;
    if (!ta) return;
    selectionRef.current = { start: ta.selectionStart, end: ta.selectionEnd };
  };

  const linkSelection = (entry: CodexEntry) => {
    const ta = innerRef.current;
    if (!ta) return;
    const { start, end } = selectionRef.current;
    const next = value.slice(0, start) + `@${entry.title}` + value.slice(end);
    onChange(next);
    setTimeout(() => {
      ta.focus();
      const pos = start + entry.title.length + 1;
      ta.setSelectionRange(pos, pos);
    }, 0);
  };

  const hasSel = (): boolean => {
    const ta = innerRef.current;
    return !!ta && ta.selectionStart !== ta.selectionEnd;
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className={wrapperClassName ?? 'relative w-full h-full'}>
            <textarea
              ref={innerRef}
              value={value}
              onChange={handleChange}
              onContextMenu={handleContextMenu}
              placeholder={placeholder}
              className={className}
              rows={rows}
              autoFocus={autoFocus}
              onClick={onClick}
            />
            {mention.active && (
              <div
                className="absolute z-50 bg-[#0d1520] border border-blue-bright/20 rounded-lg shadow-xl min-w-[220px] max-w-[300px] overflow-hidden"
                style={{ top: 8, left: 8 }}
                onMouseDown={e => e.preventDefault()}
              >
                <div className="flex items-center gap-1 p-1.5 border-b border-blue-bright/10 bg-white/[0.02]">
                  {(['all', 'ficha', 'artigo'] as Tab[]).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setMentionTab(t)}
                      className={`px-2 py-0.5 text-[9px] uppercase font-montserrat font-bold rounded transition-colors ${
                        mentionTab === t ? 'bg-blue-bright/20 text-blue-light' : 'text-text-dim hover:text-foreground'
                      }`}
                    >
                      {t === 'all' ? 'Todos' : t === 'ficha' ? 'Fichas' : 'Artigos'}
                    </button>
                  ))}
                </div>
                <div className="py-1 max-h-[220px] overflow-y-auto">
                  {matches.length === 0 ? (
                    <p className="text-[11px] text-text-dim italic text-center py-3">Nenhuma entrada.</p>
                  ) : matches.map(e => (
                    <button
                      key={e.id}
                      type="button"
                      onMouseDown={ev => { ev.preventDefault(); insertMention(e.title); }}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-bright/10 transition-colors flex items-center gap-2"
                    >
                      <span className={e.entry_type === 'ficha' ? 'text-blue-light' : 'text-gold-light'}>{e.title}</span>
                      <span className="text-[9px] text-text-dim uppercase ml-auto">{e.entry_type}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="bg-[#0d1520] border-blue-bright/20 min-w-[220px]">
          <ContextMenuItem
            disabled={!hasSel()}
            onSelect={() => setPickerOpen(true)}
            className="text-xs text-blue-light"
          >
            <Link2 className="w-3 h-3 mr-2" />
            {hasSel() ? 'Linkar a entrada do Codex…' : 'Selecione uma palavra primeiro'}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      <CodexEntryPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        entries={entries}
        onSelect={linkSelection}
        title="Linkar seleção a"
      />
    </>
  );
});
MentionTextarea.displayName = 'MentionTextarea';
