import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Trees, Plus, ScrollText, ChevronsDownUp, ChevronsUpDown, Link2, X, GripVertical, Search } from 'lucide-react';
import { useTimelineEvents, type TimelineEvent, type TimelineEventType } from '@/hooks/useTimelineEvents';
import type { CodexEntry } from '@/hooks/useCodexEntries';
import { TimelineNode } from './TimelineNode';
import { TimelineEventDialog } from './TimelineEventDialog';
import { TimelineRootsAnimation } from './TimelineRootsAnimation';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Props {
  worldId: string;
  codexEntries: CodexEntry[];
  onOpenEntry?: (id: string) => void;
}

const PRESENT_ID = '__present__';

interface PresentState {
  sortIndex: number | null;   // null = auto (após o último marco)
  linkedEventId: string | null;
}

const presentKey = (worldId: string) => `adm:timeline:present:${worldId}`;

function loadPresent(worldId: string): PresentState {
  try {
    const raw = localStorage.getItem(presentKey(worldId));
    if (!raw) return { sortIndex: null, linkedEventId: null };
    const p = JSON.parse(raw);
    return {
      sortIndex: typeof p.sortIndex === 'number' ? p.sortIndex : null,
      linkedEventId: typeof p.linkedEventId === 'string' ? p.linkedEventId : null,
    };
  } catch { return { sortIndex: null, linkedEventId: null }; }
}

function savePresent(worldId: string, s: PresentState) {
  try { localStorage.setItem(presentKey(worldId), JSON.stringify(s)); } catch {}
}

interface SortableRowProps {
  event: TimelineEvent;
  side: 'left' | 'right';
  expanded: boolean;
  linkedTitle: string | null;
  onBadgeClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpenLinked?: () => void;
}

const SortableRow: React.FC<SortableRowProps> = (props) => {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: props.event.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TimelineNode
        event={props.event}
        side={props.side}
        expanded={props.expanded}
        onBadgeClick={props.onBadgeClick}
        onEdit={props.onEdit}
        onDelete={props.onDelete}
        linkedTitle={props.linkedTitle}
        onOpenLinked={props.onOpenLinked}
        dragHandleProps={{ ...attributes, ...listeners } as any}
        isDragging={isDragging}
      />
    </div>
  );
};

interface SortablePresentProps {
  events: TimelineEvent[];
  linkedEvent: TimelineEvent | null;
  onLink: (id: string | null) => void;
  onClearPosition: () => void;
  hasCustomPosition: boolean;
}

const SortablePresent: React.FC<SortablePresentProps> = ({
  events, linkedEvent, onLink, onClearPosition, hasCustomPosition,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: PRESENT_ID });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  const [open, setOpen] = useState(false);

  return (
    <div ref={setNodeRef} style={style} className="relative flex flex-col items-center py-2">
      <div className="grid grid-cols-[1fr_2.75rem_1fr] sm:grid-cols-[1fr_3rem_1fr] items-center gap-x-2 sm:gap-x-3 md:gap-x-5 w-full">
        <div />
        <div className="relative flex justify-center">
          <motion.button
            {...(attributes as any)}
            {...(listeners as any)}
            onClick={(e) => { e.preventDefault(); setOpen(true); }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            aria-label="Marco do Presente — arraste para reposicionar ou clique para vincular a um marco"
            title="Presente — segure e arraste para reposicionar · clique para vincular a um marco"
            className="relative z-10 w-5 h-5 rounded-full bg-gold shadow-[0_0_18px_hsl(var(--gold)/0.7)] cursor-grab active:cursor-grabbing touch-none ring-2 ring-gold-champagne/60"
          >
            <span className="sr-only">Presente</span>
          </motion.button>
        </div>
        <div />
      </div>

      <div className="mt-1.5 flex items-center gap-1.5">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1 font-cinzel text-[10px] uppercase tracking-[0.25em] text-gold-champagne/85 hover:text-gold-light transition-colors"
              title="Vincular o Presente a um marco"
            >
              <GripVertical className="w-3 h-3 opacity-60" strokeWidth={2} />
              Presente
              {linkedEvent && (
                <span className="ml-1 inline-flex items-center gap-1 normal-case tracking-normal text-blue-light">
                  · <Link2 className="w-3 h-3" strokeWidth={2} />
                  <span className="max-w-[140px] truncate">{linkedEvent.title}</span>
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="center" className="w-72 p-3 bg-[#0a0f18] border-gold/25">
            <div className="text-[10px] uppercase tracking-[0.2em] text-gold-champagne font-montserrat mb-2">
              Vincular o Presente a um marco
            </div>
            {events.length === 0 ? (
              <p className="text-xs text-text-dim font-merriweather italic">Crie um marco primeiro para vincular.</p>
            ) : (
              <div className="max-h-56 overflow-y-auto space-y-1">
                <button
                  onClick={() => { onLink(null); setOpen(false); }}
                  className={`w-full text-left text-xs px-2 py-1.5 rounded font-merriweather ${!linkedEvent ? 'bg-gold/15 text-gold-light' : 'text-text-secondary hover:bg-gold/10'}`}
                >
                  — Sem vínculo (posição livre) —
                </button>
                {events.map(ev => (
                  <button
                    key={ev.id}
                    onClick={() => { onLink(ev.id); setOpen(false); }}
                    className={`w-full text-left text-xs px-2 py-1.5 rounded font-merriweather truncate ${linkedEvent?.id === ev.id ? 'bg-blue-bright/15 text-blue-light' : 'text-text-secondary hover:bg-gold/10'}`}
                    title={ev.title}
                  >
                    {ev.year || ev.era_label ? <span className="text-gold-champagne mr-1">{ev.year || ev.era_label} ·</span> : null}
                    {ev.title}
                  </button>
                ))}
              </div>
            )}
            {(hasCustomPosition || linkedEvent) && (
              <button
                onClick={() => { onClearPosition(); setOpen(false); }}
                className="mt-2 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.15em] text-text-dim hover:text-gold-champagne transition-colors"
              >
                <X className="w-3 h-3" /> Restaurar posição padrão (após o último marco)
              </button>
            )}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export const TimelineView: React.FC<Props> = ({ worldId, codexEntries, onOpenEntry }) => {
  const { events, loading, createEvent, updateEvent, deleteEvent, reorderEvent } = useTimelineEvents(worldId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TimelineEvent | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<TimelineEvent | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [present, setPresent] = useState<PresentState>({ sortIndex: null, linkedEventId: null });

  useEffect(() => { setPresent(loadPresent(worldId)); }, [worldId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const entriesById = useMemo(() => {
    const m = new Map<string, CodexEntry>();
    codexEntries.forEach(e => m.set(e.id, e));
    return m;
  }, [codexEntries]);

  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (ev: TimelineEvent) => { setEditing(ev); setDialogOpen(true); };

  const submit = async (payload: {
    title: string; description: string; year: string; era_label: string;
    event_type: TimelineEventType; codex_entry_id: string | null; image_url: string | null;
  }) => {
    if (editing) await updateEvent(editing.id, payload);
    else await createEvent(payload);
  };

  const handleBadgeClick = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpandedIds(new Set(events.map(e => e.id)));
  const collapseAll = () => setExpandedIds(new Set());
  const allExpanded = events.length > 0 && expandedIds.size === events.length;

  // Determina a posição efetiva do Presente na lista.
  // - Se vinculado a um evento existente: renderiza logo após ele.
  // - Se posição custom salva: usa esse sort_index.
  // - Senão: no fim.
  const linkedEvent = present.linkedEventId ? events.find(e => e.id === present.linkedEventId) ?? null : null;
  const sortedEvents = useMemo(() => [...events].sort((a, b) => a.sort_index - b.sort_index), [events]);

  const presentSortIndex = useMemo(() => {
    if (linkedEvent) {
      const idx = sortedEvents.findIndex(e => e.id === linkedEvent.id);
      const next = sortedEvents[idx + 1];
      return next ? (linkedEvent.sort_index + next.sort_index) / 2 : linkedEvent.sort_index + 500;
    }
    if (present.sortIndex !== null) return present.sortIndex;
    const last = sortedEvents[sortedEvents.length - 1];
    return last ? last.sort_index + 1000 : 0;
  }, [linkedEvent, present.sortIndex, sortedEvents]);

  // Lista combinada ordenada (eventos + marcador Presente)
  type Item = { kind: 'event'; ev: TimelineEvent; sort_index: number } | { kind: 'present'; sort_index: number };
  const items: Item[] = useMemo(() => {
    const arr: Item[] = sortedEvents.map(ev => ({ kind: 'event', ev, sort_index: ev.sort_index }));
    arr.push({ kind: 'present', sort_index: presentSortIndex });
    arr.sort((a, b) => a.sort_index - b.sort_index);
    return arr;
  }, [sortedEvents, presentSortIndex]);

  const itemIds = items.map(it => it.kind === 'present' ? PRESENT_ID : it.ev.id);

  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const oldIndex = itemIds.indexOf(active.id as string);
    const newIndex = itemIds.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;

    if (active.id === PRESENT_ID) {
      // Reposiciona o Presente entre vizinhos (ignorando ele mesmo).
      const others = items.filter(it => !(it.kind === 'present'));
      const before = others[newIndex - (newIndex > oldIndex ? 0 : 0) - 1] as Item | undefined;
      const after = others[newIndex - (newIndex > oldIndex ? 0 : 0)] as Item | undefined;
      // Simplificação: calcular pelos vizinhos na nova posição visível
      // Reconstroi lista sem o Presente e insere no newIndex ajustado.
      const withoutPresent = items.filter(it => it.kind !== 'present');
      const insertAt = newIndex > oldIndex ? newIndex : newIndex; // índice na lista sem present
      // Após remover o present, o índice de destino é `newIndex` se o present estava depois; caso contrário `newIndex - 0`.
      // Ajuste correto:
      const adjIndex = oldIndex < newIndex ? newIndex : newIndex;
      const beforeIt = withoutPresent[adjIndex - 1] as any;
      const afterIt = withoutPresent[adjIndex] as any;
      let newSort: number;
      if (!beforeIt && afterIt) newSort = afterIt.sort_index - 1000;
      else if (beforeIt && !afterIt) newSort = beforeIt.sort_index + 1000;
      else if (beforeIt && afterIt) newSort = (beforeIt.sort_index + afterIt.sort_index) / 2;
      else newSort = 1000;
      const next: PresentState = { sortIndex: newSort, linkedEventId: null };
      setPresent(next);
      savePresent(worldId, next);
      return;
    }

    // Movendo um evento: precisamos considerar o Presente entre os itens.
    // O sortable retorna o newIndex na lista combinada; mapear para índice em `events` (sem Presente).
    const activeIdStr = active.id as string;
    const combined = [...items];
    const [moved] = combined.splice(oldIndex, 1);
    combined.splice(newIndex, 0, moved);
    // A nova ordem dos eventos é combined.filter(kind==='event').map(ev).
    const newEventOrder = combined.filter(it => it.kind === 'event').map(it => (it as any).ev.id as string);
    const targetIndex = newEventOrder.indexOf(activeIdStr);
    if (targetIndex === -1) return;
    await reorderEvent(activeIdStr, targetIndex);
  };

  const linkPresent = (eventId: string | null) => {
    const next: PresentState = { sortIndex: null, linkedEventId: eventId };
    setPresent(next);
    savePresent(worldId, next);
  };

  const clearPresentPosition = () => {
    const next: PresentState = { sortIndex: null, linkedEventId: null };
    setPresent(next);
    savePresent(worldId, next);
  };

  return (
    <div className="animate-fadeUp">
      <TimelineRootsAnimation />

      <div className="text-center mb-6 -mt-6 sm:-mt-10 relative">
        <h2 className="font-cinzel font-bold text-lg sm:text-xl text-gold-light inline-flex items-center gap-2">
          <ScrollText className="w-4 h-4 text-gold-champagne" strokeWidth={1.75} />
          Linha do Tempo
        </h2>
        <p className="font-merriweather italic text-text-dim text-xs sm:text-sm max-w-md mx-auto mt-1">
          Marcos que brotam das raízes da Árvore e sustentam a história do seu mundo.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={openNew}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-gradient-to-r from-gold-deep via-gold-warm to-gold text-[#1a0f00] hover:from-gold-warm hover:via-gold hover:to-gold-light text-xs font-montserrat font-bold uppercase tracking-wider shadow-[0_0_14px_hsl(var(--gold)/0.35)] hover:shadow-[0_0_22px_hsl(var(--gold)/0.55)] transition-all"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.25} /> Novo marco
          </button>
          {events.length > 0 && (
            <button
              onClick={allExpanded ? collapseAll : expandAll}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-gold/25 bg-gold/5 text-gold-champagne hover:bg-gold/10 hover:border-gold/40 text-[11px] font-montserrat font-semibold uppercase tracking-wider transition-all"
              title={allExpanded ? 'Recolher todos os marcos' : 'Expandir todos os marcos'}
            >
              {allExpanded ? <ChevronsDownUp className="w-3.5 h-3.5" strokeWidth={2} /> : <ChevronsUpDown className="w-3.5 h-3.5" strokeWidth={2} />}
              {allExpanded ? 'Recolher tudo' : 'Expandir tudo'}
            </button>
          )}
        </div>
        {events.length > 0 && (
          <div className="mt-3 max-w-md mx-auto relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gold-champagne/70" strokeWidth={1.75} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Pesquisar marcos por título, era ou descrição…"
              className="w-full pl-9 pr-9 py-2 rounded-md bg-background/40 border border-gold/25 text-xs text-foreground placeholder:text-text-dim/70 font-merriweather focus:outline-none focus:border-gold/60 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-text-dim hover:text-foreground"
                aria-label="Limpar pesquisa"
              ><X className="w-3 h-3" strokeWidth={2} /></button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-text-dim font-merriweather italic text-sm">Desenrolando o pergaminho…</div>
      ) : events.length === 0 ? (
        <div className="text-center py-14 max-w-md mx-auto">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-gold/10 flex items-center justify-center border border-gold/25">
            <Trees className="w-7 h-7 text-gold-champagne" strokeWidth={1.5} />
          </div>
          <h3 className="font-cinzel font-bold text-base text-foreground mb-1">A Árvore ainda espera seus marcos</h3>
          <p className="font-merriweather text-sm text-text-dim">
            Grave o primeiro acontecimento — uma fundação, um mito, uma batalha — e veja a linha dourada florescer.
          </p>
        </div>
      ) : (
        <div className="relative mx-auto max-w-3xl px-3 sm:px-4 py-2">
          <div
            aria-hidden
            className="pointer-events-none absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[3px] rounded-full bg-gradient-to-b from-gold-champagne/40 via-gold to-gold-deep/60 shadow-[0_0_10px_hsl(var(--gold)/0.35)]"
          />

          {(() => {
            const q = search.trim().toLowerCase();
            const displayItems = q
              ? items.filter(it => {
                  if (it.kind === 'present') return false;
                  const ev = it.ev;
                  return (
                    ev.title?.toLowerCase().includes(q) ||
                    (ev.description ?? '').toLowerCase().includes(q) ||
                    (ev.era_label ?? '').toLowerCase().includes(q) ||
                    (ev.year ?? '').toLowerCase().includes(q)
                  );
                })
              : items;
            const displayIds = displayItems.map(it => it.kind === 'present' ? PRESENT_ID : it.ev.id);
            return (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={q ? () => {} : handleDragEnd}>
            <SortableContext items={displayIds} strategy={verticalListSortingStrategy}>
              <div className="relative space-y-3 sm:space-y-4">
                {q && displayItems.length === 0 && (
                  <div className="text-center py-8 text-text-dim font-merriweather italic text-sm">Nenhum marco corresponde à sua busca.</div>
                )}
                {displayItems.map((it, i) => {
                  if (it.kind === 'present') {
                    return (
                      <SortablePresent
                        key={PRESENT_ID}
                        events={sortedEvents}
                        linkedEvent={linkedEvent}
                        onLink={linkPresent}
                        onClearPosition={clearPresentPosition}
                        hasCustomPosition={present.sortIndex !== null}
                      />
                    );
                  }
                  const ev = it.ev;
                  const linked = ev.codex_entry_id ? entriesById.get(ev.codex_entry_id) : null;
                  // Alterna lados usando a posição do evento entre eventos (não a combinada)
                  const evIndex = sortedEvents.findIndex(e => e.id === ev.id);
                  return (
                    <SortableRow
                      key={ev.id}
                      event={ev}
                      side={evIndex % 2 === 0 ? 'left' : 'right'}
                      expanded={expandedIds.has(ev.id)}
                      linkedTitle={linked?.title ?? null}
                      onBadgeClick={() => handleBadgeClick(ev.id)}
                      onEdit={() => openEdit(ev)}
                      onDelete={() => setConfirmDelete(ev)}
                      onOpenLinked={linked && onOpenEntry ? () => onOpenEntry(linked.id) : undefined}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      <TimelineEventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        codexEntries={codexEntries}
        onSubmit={submit}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={o => !o && setConfirmDelete(null)}>
        <AlertDialogContent className="border-red-alert/30 bg-[#0a0f18]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-cinzel text-red-alert">Apagar marco da Linha do Tempo?</AlertDialogTitle>
            <AlertDialogDescription className="font-montserrat text-sm text-text-secondary">
              {confirmDelete ? `"${confirmDelete.title}" será removido para sempre. Essa ação não pode ser desfeita.` : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-alert/20 text-red-alert border border-red-alert/40 hover:bg-red-alert/30"
              onClick={async () => {
                if (!confirmDelete) return;
                await deleteEvent(confirmDelete.id);
                setConfirmDelete(null);
              }}
            >
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TimelineView;
