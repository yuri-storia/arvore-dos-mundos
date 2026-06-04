import React from 'react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import type { CodexEntry } from '@/hooks/useCodexEntries';
import { FRUITS } from '@/lib/data';

interface Props {
  name: string;
  entry?: CodexEntry;
  onClick?: () => void;
}

/**
 * Inline chip that renders an `@reference` mention.
 * - If the referenced entry exists, shows a HoverCard preview (image, type, excerpt).
 * - If unresolved, renders dimmed italic text.
 */
export const MentionChip: React.FC<Props> = React.memo(({ name, entry, onClick }) => {
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
    <HoverCard openDelay={120} closeDelay={80}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onClick?.(); }}
          className={`inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded text-[12px] font-montserrat font-bold transition-colors align-baseline ${
            isFicha
              ? 'bg-blue-bright/15 text-blue-light hover:bg-blue-bright/25'
              : 'bg-gold/15 text-gold-light hover:bg-gold/25'
          }`}
        >
          @{name}
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
          {onClick && (
            <p className="text-[10px] text-text-dim/70 mt-2 italic">Clique para abrir →</p>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
});
MentionChip.displayName = 'MentionChip';

// ── Tokenization helpers ──
const MENTION_REGEX = /@([A-Za-zÀ-ÿ0-9_\-]+(?:\s[A-Za-zÀ-ÿ0-9_\-]+)?)/g;

export function buildEntriesByName(entries: CodexEntry[]): Map<string, CodexEntry> {
  const map = new Map<string, CodexEntry>();
  entries.forEach(e => map.set(e.title.toLowerCase(), e));
  return map;
}

export function tokenizeMentions(
  text: string,
  byName: Map<string, CodexEntry>,
): Array<{ type: 'text' | 'mention'; value: string; entry?: CodexEntry }> {
  const out: Array<{ type: 'text' | 'mention'; value: string; entry?: CodexEntry }> = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(MENTION_REGEX.source, 'g');
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIdx) out.push({ type: 'text', value: text.slice(lastIdx, match.index) });
    const name = match[1];
    out.push({ type: 'mention', value: name, entry: byName.get(name.toLowerCase()) });
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < text.length) out.push({ type: 'text', value: text.slice(lastIdx) });
  return out;
}

/**
 * Walk ReactMarkdown children, replacing `@name` inside string nodes with MentionChip.
 */
export function renderMentionChildren(
  children: React.ReactNode,
  byName: Map<string, CodexEntry>,
  onOpen?: (id: string) => void,
): React.ReactNode {
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
