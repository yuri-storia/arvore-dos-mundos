import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Trees, Plus, ScrollText, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { useTimelineEvents, type TimelineEvent, type TimelineEventType } from '@/hooks/useTimelineEvents';
import type { CodexEntry } from '@/hooks/useCodexEntries';
import { TimelineNode } from './TimelineNode';
import { TimelineEventDialog } from './TimelineEventDialog';
import { TimelineRootsAnimation } from './TimelineRootsAnimation';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog';
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

export const TimelineView: React.FC<Props> = ({ worldId, codexEntries, onOpenEntry }) => {
  const { events, loading, createEvent, updateEvent, deleteEvent, reorderEvent } = useTimelineEvents(worldId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TimelineEvent | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<TimelineEvent | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

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
    title: string; description: string; era_label: string;
    event_type: TimelineEventType; codex_entry_id: string | null; image_url: string | null;
  }) => {
    if (editing) {
      await updateEvent(editing.id, payload);
    } else {
      await createEvent(payload);
    }
  };

  const handleBadgeClick = (id: string) => {
    // Toggle apenas do card clicado — outros permanecem no estado atual.
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpandedIds(new Set(events.map(e => e.id)));
  const collapseAll = () => setExpandedIds(new Set());
  const allExpanded = events.length > 0 && expandedIds.size === events.length;


  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = events.findIndex(x => x.id === active.id);
    const newIndex = events.findIndex(x => x.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    await reorderEvent(active.id as string, newIndex);
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
          {/* Linha vertical dourada — centralizada em TODAS as larguras */}
          <div
            aria-hidden
            className="pointer-events-none absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[3px] rounded-full bg-gradient-to-b from-gold-champagne/40 via-gold to-gold-deep/60 shadow-[0_0_10px_hsl(var(--gold)/0.35)]"
          />

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={events.map(e => e.id)} strategy={verticalListSortingStrategy}>
              <div className="relative space-y-3 sm:space-y-4">
                {events.map((ev, i) => {
                  const linked = ev.codex_entry_id ? entriesById.get(ev.codex_entry_id) : null;
                  return (
                    <SortableRow
                      key={ev.id}
                      event={ev}
                      side={i % 2 === 0 ? 'left' : 'right'}
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

          {/* Selo final "Presente" — centralizado */}
          <div className="relative mt-6 flex justify-center">
            <div className="flex flex-col items-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-4 h-4 rounded-full bg-gold shadow-[0_0_18px_hsl(var(--gold)/0.7)]"
              />
              <span className="mt-2 font-cinzel text-[10px] uppercase tracking-[0.25em] text-gold-champagne/80 whitespace-nowrap">Presente</span>
            </div>
          </div>
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
