import React, { useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Link2 } from 'lucide-react';
import {
  ContextMenu, ContextMenuTrigger, ContextMenuContent,
  ContextMenuItem, ContextMenuSub, ContextMenuSubTrigger, ContextMenuSubContent,
} from '@/components/ui/context-menu';
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

/**
 * Textarea with:
 *  - `@` autocomplete popup of fichas/artigos
 *  - right-click "Linkar com Ficha/Artigo" context menu over a text selection
 *
 * Mentions are stored as `@Title` in the underlying string; rendering layers
 * (MentionChip) strip the `@` glyph and exports flatten it back to plain text.
 */
export const MentionTextarea = React.forwardRef<HTMLTextAreaElement, Props>(({
  value, onChange, entries, placeholder, className, wrapperClassName, rows, autoFocus, onClick,
}, ref) => {
  const innerRef = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(ref, () => innerRef.current!);
  const [mention, setMention] = useState<{ active: boolean; query: string }>({ active: false, query: '' });
  const selectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    onChange(v);
    const ta = innerRef.current;
    if (!ta) return;
    const cursor = ta.selectionStart;
    const before = v.slice(0, cursor);
    const m = before.match(/@(\w*)$/);
    if (m) setMention({ active: true, query: m[1] });
    else if (mention.active) setMention({ active: false, query: '' });
  };

  const matches = useMemo(() => {
    if (!mention.active) return [];
    const q = mention.query.toLowerCase();
    return entries.filter(e => e.title.toLowerCase().includes(q)).slice(0, 8);
  }, [mention, entries]);

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

  const fichas = useMemo(() => entries.filter(e => e.entry_type === 'ficha'), [entries]);
  const artigos = useMemo(() => entries.filter(e => e.entry_type === 'artigo'), [entries]);
  const hasSel = (): boolean => {
    const ta = innerRef.current;
    return !!ta && ta.selectionStart !== ta.selectionEnd;
  };

  return (
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
          {mention.active && matches.length > 0 && (
            <div
              className="absolute z-50 bg-[#0d1520] border border-blue-bright/20 rounded-lg shadow-xl py-1 min-w-[200px] max-w-[280px]"
              style={{ top: 8, left: 8 }}
            >
              {matches.map(e => (
                <button
                  key={e.id}
                  type="button"
                  onMouseDown={ev => { ev.preventDefault(); insertMention(e.title); }}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-bright/10 transition-colors flex items-center gap-2"
                >
                  <span className={e.entry_type === 'ficha' ? 'text-blue-light' : 'text-gold-light'}>{e.title}</span>
                  <span className="text-[9px] text-text-dim">{e.entry_type}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="bg-[#0d1520] border-blue-bright/20 min-w-[200px]">
        {!hasSel() && (
          <ContextMenuItem disabled className="text-[11px] text-text-dim italic">
            Selecione uma palavra primeiro
          </ContextMenuItem>
        )}
        <ContextMenuSub>
          <ContextMenuSubTrigger disabled={!hasSel()} className="text-xs text-blue-light">
            <Link2 className="w-3 h-3 mr-2" /> Linkar com Ficha
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="bg-[#0d1520] border-blue-bright/20 max-h-[280px] overflow-y-auto">
            {fichas.length === 0 ? (
              <ContextMenuItem disabled className="text-xs text-text-dim">Nenhuma ficha</ContextMenuItem>
            ) : fichas.map(e => (
              <ContextMenuItem key={e.id} onSelect={() => linkSelection(e)} className="text-xs text-blue-light">
                {e.title}
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSub>
          <ContextMenuSubTrigger disabled={!hasSel()} className="text-xs text-gold-light">
            <Link2 className="w-3 h-3 mr-2" /> Linkar com Artigo
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="bg-[#0d1520] border-blue-bright/20 max-h-[280px] overflow-y-auto">
            {artigos.length === 0 ? (
              <ContextMenuItem disabled className="text-xs text-text-dim">Nenhum artigo</ContextMenuItem>
            ) : artigos.map(e => (
              <ContextMenuItem key={e.id} onSelect={() => linkSelection(e)} className="text-xs text-gold-light">
                {e.title}
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
      </ContextMenuContent>
    </ContextMenu>
  );
});
MentionTextarea.displayName = 'MentionTextarea';
