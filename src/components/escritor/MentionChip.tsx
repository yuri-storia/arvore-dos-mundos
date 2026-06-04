import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, Link2Off, Repeat } from 'lucide-react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { CodexEntryPicker } from './CodexEntryPicker';
import type { CodexEntry } from '@/hooks/useCodexEntries';
import { FRUITS } from '@/lib/data';

interface Props {
  name: string;
  entry?: CodexEntry;
  onClick?: () => void;
  /** Optional: when set, chip's right-click menu enables "Trocar vínculo…" via picker. */
  allEntries?: CodexEntry[];
  /** Optional: chip's right-click "Desvincular" callback. */
  onUnlink?: () => void;
  /** Optional: chip's right-click "Trocar vínculo…" callback (receives the new entry). */
  onReplace?: (entry: CodexEntry) => void;
}

/**
 * Inline chip rendering a mention. Stored as `@Title` in text; chip strips the
 * `@` and styles by entry type. Hover shows a portaled preview (no layout shift).
 * When `onUnlink`/`onReplace` are provided, right-click reveals a context menu.
 */
export const MentionChip: React.FC<Props> = React.memo(({ name, entry, onClick, allEntries, onUnlink, onReplace }) => {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Close menu on outside click / escape
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('mousedown', close);
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, true);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
    };
  }, [menu]);

  const hasMenu = !!(onUnlink || (onReplace && allEntries));

  if (!entry) {
    return (
      <span className="text-text-dim/60 italic" title="Referência não encontrada no Codex">
        {name}
      </span>
    );
  }

  const isFicha = entry.entry_type === 'ficha';
  const fruit = entry.fruit_id !== null && entry.fruit_id !== undefined
    ? FRUITS.find(f => f.id === entry.fruit_id) : null;
  const excerpt = (entry.content || '').replace(/^__magictype__\n?/, '').trim().slice(0, 280);

  return (
    <>
      <HoverCard openDelay={150} closeDelay={80}>
        <HoverCardTrigger asChild>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClick?.(); }}
            onContextMenu={hasMenu ? (e) => {
              e.preventDefault(); e.stopPropagation();
              setMenu({ x: e.clientX, y: e.clientY });
            } : undefined}
            className={`inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded text-[12px] font-montserrat font-bold transition-colors align-baseline ${
              isFicha
                ? 'bg-blue-bright/15 text-blue-light hover:bg-blue-bright/25'
                : 'bg-gold/15 text-gold-light hover:bg-gold/25'
            }`}
          >
            {name}
          </button>
        </HoverCardTrigger>
        <HoverCardContent
          side="top"
          align="start"
          sideOffset={6}
          className="w-72 p-0 overflow-hidden border-blue-bright/20 bg-[hsl(var(--bg-deep))]"
        >
          {entry.image_url && (
            <img src={entry.image_url} alt={entry.title} className="w-full h-24 object-cover" loading="lazy" />
          )}
          <div className="p-3">
            <p className="text-[9px] font-montserrat uppercase tracking-widest text-text-dim mb-0.5 inline-flex items-center gap-1">
              <span>{isFicha ? 'Ficha' : 'Artigo'}</span>
              {fruit && (
                <>
                  <span>·</span>
                  <fruit.Icon className="inline-block w-3 h-3 align-[-0.1em] text-gold-champagne" strokeWidth={1.75} />
                  <span>{fruit.name}</span>
                </>
              )}
            </p>
            <h4 className={`font-cinzel font-bold text-sm mb-1.5 ${isFicha ? 'text-blue-light' : 'text-gold-light'}`}>
              {entry.title}
            </h4>
            {excerpt ? (
              <p className="text-[11px] text-foreground/80 font-merriweather leading-snug whitespace-pre-wrap line-clamp-5">
                {excerpt}{excerpt.length === 280 ? '…' : ''}
              </p>
            ) : (
              <p className="text-[11px] text-text-dim italic">Sem conteúdo.</p>
            )}
            {(onClick || hasMenu) && (
              <p className="text-[10px] text-text-dim/70 mt-2 italic">
                {onClick ? 'Clique para abrir' : ''}{onClick && hasMenu ? ' · ' : ''}{hasMenu ? 'Botão direito p/ opções' : ''}
              </p>
            )}
          </div>
        </HoverCardContent>
      </HoverCard>

      {menu && createPortal(
        <ul
          onMouseDown={e => e.stopPropagation()}
          className="fixed z-[500] min-w-[180px] bg-[#0d1520] border border-blue-bright/20 rounded-md shadow-2xl py-1 text-xs"
          style={{ top: menu.y, left: menu.x }}
        >
          {onClick && (
            <li>
              <button type="button" onClick={() => { setMenu(null); onClick(); }}
                className="w-full text-left px-3 py-1.5 hover:bg-blue-bright/10 flex items-center gap-2">
                <ExternalLink className="w-3 h-3" /> Abrir
              </button>
            </li>
          )}
          {onReplace && allEntries && (
            <li>
              <button type="button" onClick={() => { setMenu(null); setPickerOpen(true); }}
                className="w-full text-left px-3 py-1.5 hover:bg-blue-bright/10 text-blue-light flex items-center gap-2">
                <Repeat className="w-3 h-3" /> Trocar vínculo…
              </button>
            </li>
          )}
          {onUnlink && (
            <li>
              <button type="button" onClick={() => { setMenu(null); onUnlink(); }}
                className="w-full text-left px-3 py-1.5 hover:bg-red-alert/15 text-red-alert flex items-center gap-2">
                <Link2Off className="w-3 h-3" /> Desvincular
              </button>
            </li>
          )}
        </ul>,
        document.body,
      )}

      {allEntries && onReplace && (
        <CodexEntryPicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          entries={allEntries}
          onSelect={onReplace}
          title="Trocar vínculo"
        />
      )}
    </>
  );
});
MentionChip.displayName = 'MentionChip';

// ── Tokenization (entry-aware: matches longest known title) ──
const MENTION_REGEX = /@([A-Za-zÀ-ÿ0-9_\-]+(?:\s+[A-Za-zÀ-ÿ0-9_\-]+){0,5})/g;

export function buildEntriesByName(entries: CodexEntry[]): Map<string, CodexEntry> {
  const map = new Map<string, CodexEntry>();
  entries.forEach(e => map.set(e.title.toLowerCase(), e));
  return map;
}

export type MentionToken = { type: 'text' | 'mention'; value: string; entry?: CodexEntry };

export function tokenizeMentions(text: string, byName: Map<string, CodexEntry>): MentionToken[] {
  const out: MentionToken[] = [];
  let lastIdx = 0;
  const re = new RegExp(MENTION_REGEX.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const candidate = m[1];
    const words = candidate.split(/\s+/);
    // Prefer the longest prefix that resolves to a known entry; fall back to first word.
    let name = words[0];
    for (let n = words.length; n >= 1; n--) {
      const cand = words.slice(0, n).join(' ');
      if (byName.has(cand.toLowerCase())) { name = cand; break; }
    }
    if (m.index > lastIdx) out.push({ type: 'text', value: text.slice(lastIdx, m.index) });
    out.push({ type: 'mention', value: name, entry: byName.get(name.toLowerCase()) });
    lastIdx = m.index + 1 + name.length;
    re.lastIndex = lastIdx;
  }
  if (lastIdx < text.length) out.push({ type: 'text', value: text.slice(lastIdx) });
  return out;
}

/** Absolute character length consumed by a token in the source string. */
const tokenLen = (t: MentionToken) => t.type === 'text' ? t.value.length : 1 + t.value.length;

/**
 * High-level renderer for mention-laced text. Each chip gets per-occurrence
 * `onUnlink` / `onReplace` bound to its absolute slice in the source.
 */
export function renderInlineMentions(
  text: string,
  byName: Map<string, CodexEntry>,
  opts?: {
    allEntries?: CodexEntry[];
    onOpenEntry?: (id: string) => void;
    onSave?: (next: string) => void;
  },
): React.ReactNode[] {
  const parts = tokenizeMentions(text, byName);
  let cursor = 0;
  return parts.map((p, i) => {
    if (p.type === 'text') { cursor += p.value.length; return <span key={i}>{p.value}</span>; }
    const start = cursor;
    const end = cursor + tokenLen(p);
    cursor = end;
    const onUnlink = opts?.onSave
      ? () => opts.onSave!(text.slice(0, start) + p.value + text.slice(end))
      : undefined;
    const onReplace = opts?.onSave
      ? (ne: CodexEntry) => opts.onSave!(text.slice(0, start) + '@' + ne.title + text.slice(end))
      : undefined;
    return (
      <MentionChip
        key={i}
        name={p.value}
        entry={p.entry}
        onClick={p.entry && opts?.onOpenEntry ? () => opts.onOpenEntry!(p.entry!.id) : undefined}
        allEntries={opts?.allEntries}
        onUnlink={onUnlink}
        onReplace={onReplace}
      />
    );
  });
}

/**
 * Walk ReactMarkdown children, replacing `@name` inside string nodes with MentionChip.
 */
export function renderMentionChildren(
  children: React.ReactNode,
  byName: Map<string, CodexEntry>,
  onOpen?: (id: string) => void,
  opts?: { allEntries?: CodexEntry[]; onSave?: (next: string) => void; sourceText?: string },
): React.ReactNode {
  // When sourceText + onSave are provided, defer to renderInlineMentions for richer features.
  if (opts?.sourceText !== undefined && opts.onSave) {
    return renderInlineMentions(opts.sourceText, byName, {
      allEntries: opts.allEntries, onOpenEntry: onOpen, onSave: opts.onSave,
    });
  }
  const out: React.ReactNode[] = [];
  React.Children.forEach(children, (child, idx) => {
    if (typeof child === 'string') {
      const parts = tokenizeMentions(child, byName);
      parts.forEach((p, i) => {
        if (p.type === 'text') out.push(p.value);
        else out.push(
          <MentionChip
            key={`m-${idx}-${i}`}
            name={p.value}
            entry={p.entry}
            allEntries={opts?.allEntries}
            onClick={p.entry && onOpen ? () => onOpen(p.entry!.id) : undefined}
          />,
        );
      });
    } else {
      out.push(child);
    }
  });
  return out;
}
