import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Trees, Plus, ScrollText } from 'lucide-react';
import { useTimelineEvents, type TimelineEvent, type TimelineEventType } from '@/hooks/useTimelineEvents';
import type { CodexEntry } from '@/hooks/useCodexEntries';
import { TimelineNode } from './TimelineNode';
import { TimelineEventDialog } from './TimelineEventDialog';
import { TimelineRootsAnimation } from './TimelineRootsAnimation';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog';

interface Props {
  worldId: string;
  codexEntries: CodexEntry[];
  onOpenEntry?: (id: string) => void;
}

export const TimelineView: React.FC<Props> = ({ worldId, codexEntries, onOpenEntry }) => {
  const { events, loading, createEvent, updateEvent, deleteEvent } = useTimelineEvents(worldId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TimelineEvent | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<TimelineEvent | null>(null);

  const entriesById = useMemo(() => {
    const m = new Map<string, CodexEntry>();
    codexEntries.forEach(e => m.set(e.id, e));
    return m;
  }, [codexEntries]);

  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (ev: TimelineEvent) => { setEditing(ev); setDialogOpen(true); };

  const submit = async (payload: {
    title: string; description: string; era_label: string;
    event_type: TimelineEventType; codex_entry_id: string | null;
  }) => {
    if (editing) {
      await updateEvent(editing.id, payload);
    } else {
      await createEvent(payload);
    }
  };

  return (
    <div className="animate-fadeUp">
      {/* Cabeçalho ornamental: raízes animadas da Árvore dos Mundos ACIMA do título.
          Energia dourada flui das pontas das raízes até o orbe central pulsante.
          O componente usa mix-blend-mode: screen para se fundir ao fundo do app. */}
      <TimelineRootsAnimation />

      <div className="text-center mb-6 -mt-6 sm:-mt-10 relative">
        <h2 className="font-cinzel font-bold text-lg sm:text-xl text-gold-light inline-flex items-center gap-2">
          <ScrollText className="w-4 h-4 text-gold-champagne" strokeWidth={1.75} />
          Linha do Tempo
        </h2>
        <p className="font-merriweather italic text-text-dim text-xs sm:text-sm max-w-md mx-auto mt-1">
          Marcos que brotam das raízes da Árvore e sustentam a história do seu mundo.
        </p>
        <button
          onClick={openNew}
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-gradient-to-r from-gold-deep via-gold-warm to-gold text-[#1a0f00] hover:from-gold-warm hover:via-gold hover:to-gold-light text-xs font-montserrat font-bold uppercase tracking-wider shadow-[0_0_14px_hsl(var(--gold)/0.35)] hover:shadow-[0_0_22px_hsl(var(--gold)/0.55)] transition-all"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2.25} /> Novo marco
        </button>
      </div>


      {/* Corpo da linha */}
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
        <div className="relative mx-auto max-w-3xl px-2 sm:px-4 py-2">
          {/* Linha contínua vertical dourada
              - Mobile/tablet (com sidebar): alinhada à coluna da gema esquerda
              - Desktop (≥ md): centralizada
          */}
          <div
            aria-hidden
            className="
              pointer-events-none absolute top-0 bottom-0 w-[3px] rounded-full
              left-[calc(0.5rem+1.5rem-1.5px)]
              md:left-1/2 md:-translate-x-1/2
              bg-gradient-to-b from-gold-champagne/40 via-gold to-gold-deep/60
              shadow-[0_0_10px_hsl(var(--gold)/0.35)]
            "
          />

          <div className="relative space-y-5 md:space-y-0">
            {events.map((ev, i) => {
              const linked = ev.codex_entry_id ? entriesById.get(ev.codex_entry_id) : null;
              return (
                <TimelineNode
                  key={ev.id}
                  event={ev}
                  side={i % 2 === 0 ? 'left' : 'right'}
                  onOpen={() => openEdit(ev)}
                  onDelete={() => setConfirmDelete(ev)}
                  linkedTitle={linked?.title ?? null}
                  onOpenLinked={linked && onOpenEntry ? () => onOpenEntry(linked.id) : undefined}
                />
              );
            })}
          </div>

          {/* selo final (raiz principal) */}
          <div className="relative mt-6 flex flex-col items-center md:items-center">
            <div className="w-full flex md:justify-center">
              <div className="ml-[calc(0.5rem+1.5rem-0.5rem)] md:ml-0 flex flex-col items-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-4 h-4 rounded-full bg-gold shadow-[0_0_18px_hsl(var(--gold)/0.7)]"
                />
                <span className="mt-2 font-cinzel text-[10px] uppercase tracking-[0.25em] text-gold-champagne/80">Presente</span>
              </div>
            </div>
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
              {confirmDelete ? `"${confirmDelete.title}" será removido para sempre.` : ''}
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
