import React, { useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Link2, Copy, Scissors, ClipboardPaste, Sparkles } from 'lucide-react';
import {
  ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuSeparator,
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
  spellCheck?: boolean;
  lang?: string;
  onClick?: React.MouseEventHandler<HTMLTextAreaElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLTextAreaElement>;
}

type Tab = 'all' | 'ficha' | 'artigo';

/**
 * Textarea with:
 *  - `@` autocomplete popup (search + Fichas/Artigos filter)
 *  - Premium right-click menu: Copiar/Recortar/Colar + "Linkar a entrada do Codex…"
 *  - Ctrl/Cmd+L shortcut: open Codex picker for the selected text
 *  - Optional native PT-BR spellcheck (passed by parent)
 */
export const MentionTextarea = React.forwardRef<HTMLTextAreaElement, Props>(({
  value, onChange, entries, placeholder, className, wrapperClassName, rows, autoFocus,
  spellCheck, lang, onClick, onKeyDown,
}, ref) => {
  const innerRef = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(ref, () => innerRef.current!);
  const [mention, setMention] = useState<{ active: boolean; query: string }>({ active: false, query: '' });
  const [mentionTab, setMentionTab] = useState<Tab>('all');
  const selectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });
  const [hasSelection, setHasSelection] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const captureSelection = () => {
    const ta = innerRef.current;
    if (!ta) return;
    selectionRef.current = { start: ta.selectionStart, end: ta.selectionEnd };
    setHasSelection(ta.selectionStart !== ta.selectionEnd);
  };

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl/Cmd+L → linkar seleção
    if ((e.ctrlKey || e.metaKey) && (e.key === 'l' || e.key === 'L')) {
      const ta = innerRef.current;
      if (ta && ta.selectionStart !== ta.selectionEnd) {
        e.preventDefault();
        selectionRef.current = { start: ta.selectionStart, end: ta.selectionEnd };
        setHasSelection(true);
        setPickerOpen(true);
        return;
      }
    }
    onKeyDown?.(e);
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

  const linkSelection = (entry: CodexEntry) => {
    const ta = innerRef.current;
    if (!ta) return;
    const { start, end } = selectionRef.current;
    if (start === end) return;
    const next = value.slice(0, start) + `@${entry.title}` + value.slice(end);
    onChange(next);
    setTimeout(() => {
      ta.focus();
      const pos = start + entry.title.length + 1;
      ta.setSelectionRange(pos, pos);
    }, 0);
  };

  const replaceSelection = (text: string) => {
    const ta = innerRef.current;
    if (!ta) return;
    const { start, end } = selectionRef.current;
    const next = value.slice(0, start) + text + value.slice(end);
    onChange(next);
    setTimeout(() => {
      ta.focus();
      const pos = start + text.length;
      ta.setSelectionRange(pos, pos);
    }, 0);
  };

  const handleCopy = async () => {
    const { start, end } = selectionRef.current;
    if (start === end) return;
    try { await navigator.clipboard.writeText(value.slice(start, end)); } catch {}
  };
  const handleCut = async () => {
    const { start, end } = selectionRef.current;
    if (start === end) return;
    try { await navigator.clipboard.writeText(value.slice(start, end)); } catch {}
    replaceSelection('');
  };
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) replaceSelection(text);
    } catch {}
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
              onContextMenu={captureSelection}
              onSelect={captureSelection}
              onKeyUp={captureSelection}
              onMouseUp={captureSelection}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className={`mention-textarea ${className ?? ''}`}
              rows={rows}
              autoFocus={autoFocus}
              spellCheck={spellCheck}
              lang={lang}
              onClick={onClick}
            />
            {mention.active && (
              <div
                className="absolute z-50 bg-[#0d1520]/95 backdrop-blur-md border border-blue-bright/30 rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.6)] min-w-[220px] max-w-[300px] overflow-hidden"
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
        <ContextMenuContent className="min-w-[240px] bg-[#0d1520]/95 backdrop-blur-md border-blue-bright/30 shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
          <ContextMenuItem onSelect={handleCopy} disabled={!hasSelection} className="text-xs gap-2 focus:bg-blue-bright/10 focus:text-blue-light">
            <Copy className="w-3 h-3" /> Copiar
            <span className="ml-auto text-[10px] text-text-dim">Ctrl+C</span>
          </ContextMenuItem>
          <ContextMenuItem onSelect={handleCut} disabled={!hasSelection} className="text-xs gap-2 focus:bg-blue-bright/10 focus:text-blue-light">
            <Scissors className="w-3 h-3" /> Recortar
            <span className="ml-auto text-[10px] text-text-dim">Ctrl+X</span>
          </ContextMenuItem>
          <ContextMenuItem onSelect={handlePaste} className="text-xs gap-2 focus:bg-blue-bright/10 focus:text-blue-light">
            <ClipboardPaste className="w-3 h-3" /> Colar
            <span className="ml-auto text-[10px] text-text-dim">Ctrl+V</span>
          </ContextMenuItem>
          <ContextMenuSeparator className="bg-blue-bright/10" />
          <ContextMenuItem
            disabled={!hasSelection}
            onSelect={() => setPickerOpen(true)}
            className="text-xs gap-2 focus:bg-gold/10 focus:text-gold-light data-[disabled]:opacity-50"
          >
            <Link2 className="w-3 h-3 text-gold-light" />
            <span className="text-gold-light">
              {hasSelection ? 'Linkar a entrada do Codex' : 'Selecione uma palavra primeiro'}
            </span>
            <span className="ml-auto text-[10px] text-text-dim">{hasSelection ? 'Ctrl+L' : ''}</span>
            {hasSelection && <Sparkles className="w-3 h-3 text-gold-light/60" />}
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
