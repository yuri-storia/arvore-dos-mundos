import React from 'react';
import { motion } from 'framer-motion';
import {
  Feather, Sparkles, Swords, Compass, Sun, Skull, Flame, Star, BookOpen, Link2, Trash2, GripVertical,
} from 'lucide-react';
import type { TimelineEvent, TimelineEventType } from '@/hooks/useTimelineEvents';

export const EVENT_TYPES: { value: TimelineEventType; label: string; Icon: any }[] = [
  { value: 'fato',        label: 'Fato',        Icon: Feather },
  { value: 'mito',        label: 'Mito',        Icon: Sparkles },
  { value: 'batalha',     label: 'Batalha',     Icon: Swords },
  { value: 'descoberta',  label: 'Descoberta',  Icon: Compass },
  { value: 'nascimento',  label: 'Nascimento',  Icon: Sun },
  { value: 'queda',       label: 'Queda',       Icon: Skull },
  { value: 'ritual',      label: 'Ritual',      Icon: Flame },
  { value: 'outro',       label: 'Outro',       Icon: Star },
];

export function iconForType(type: TimelineEventType) {
  return EVENT_TYPES.find(t => t.value === type)?.Icon ?? Feather;
}

interface Props {
  event: TimelineEvent;
  side: 'left' | 'right';
  onOpen: () => void;
  onDelete: () => void;
  onOpenLinked?: () => void;
  linkedTitle?: string | null;
  dragHandleRef?: React.Ref<HTMLButtonElement>;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
}

export const TimelineNode: React.FC<Props> = ({
  event, side, onOpen, onDelete, onOpenLinked, linkedTitle, dragHandleRef, dragHandleProps,
}) => {
  const Icon = iconForType(event.event_type);
  const isRight = side === 'right';

  return (
    <div className="relative flex items-stretch min-h-[92px]">
      {/* Coluna esquerda (card se side==='left', vazia se right) */}
      <div className={`hidden sm:flex flex-1 ${isRight ? '' : 'justify-end pr-8'}`}>
        {!isRight && (
          <NodeCard
            event={event} align="right" Icon={Icon}
            onOpen={onOpen} onDelete={onDelete}
            onOpenLinked={onOpenLinked} linkedTitle={linkedTitle}
            dragHandleRef={dragHandleRef} dragHandleProps={dragHandleProps}
          />
        )}
      </div>

      {/* Gema central */}
      <div className="relative w-14 flex-none flex flex-col items-center">
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[3px] bg-gradient-to-b from-gold-champagne/40 via-gold to-gold-deep/60 rounded-full" />
        <motion.button
          onClick={onOpen}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          aria-label={`Abrir marco ${event.title}`}
          className="relative z-10 mt-4 w-10 h-10 rounded-full flex items-center justify-center border-2 border-gold text-[#1a0f00] bg-gradient-to-br from-gold-champagne via-gold to-gold-deep shadow-[0_0_18px_hsl(var(--gold)/0.55)] hover:shadow-[0_0_26px_hsl(var(--gold)/0.85)] transition-shadow"
          style={{ filter: 'drop-shadow(0 0 6px hsl(var(--gold-champagne)/0.55))' }}
        >
          <Icon className="w-4 h-4" strokeWidth={2} />
          <span className="absolute inset-0 rounded-full ring-1 ring-gold-champagne/60 animate-pulse" style={{ animationDuration: '3s' }} />
        </motion.button>
      </div>

      {/* Coluna direita */}
      <div className={`flex-1 ${isRight ? 'pl-4 sm:pl-8' : 'hidden sm:block'}`}>
        {(isRight || true) && (
          <div className={`${isRight ? 'block' : 'sm:block hidden'}`}>
            {isRight && (
              <NodeCard
                event={event} align="left" Icon={Icon}
                onOpen={onOpen} onDelete={onDelete}
                onOpenLinked={onOpenLinked} linkedTitle={linkedTitle}
                dragHandleRef={dragHandleRef} dragHandleProps={dragHandleProps}
              />
            )}
          </div>
        )}
      </div>

      {/* Card único no mobile (sempre à direita, ignora side) */}
      {!isRight && (
        <div className="sm:hidden flex-1 pl-4">
          <NodeCard
            event={event} align="left" Icon={Icon}
            onOpen={onOpen} onDelete={onDelete}
            onOpenLinked={onOpenLinked} linkedTitle={linkedTitle}
            dragHandleRef={dragHandleRef} dragHandleProps={dragHandleProps}
          />
        </div>
      )}
    </div>
  );
};

const NodeCard: React.FC<{
  event: TimelineEvent;
  align: 'left' | 'right';
  Icon: any;
  onOpen: () => void;
  onDelete: () => void;
  onOpenLinked?: () => void;
  linkedTitle?: string | null;
  dragHandleRef?: React.Ref<HTMLButtonElement>;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
}> = ({ event, align, Icon, onOpen, onDelete, onOpenLinked, linkedTitle, dragHandleRef, dragHandleProps }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className={`group max-w-md w-full ${align === 'right' ? 'ml-auto text-right' : ''}`}
  >
    <div
      onClick={onOpen}
      className="cursor-pointer relative rounded-lg border border-gold/25 bg-[hsl(var(--background)/0.65)] backdrop-blur-md p-3 sm:p-4 hover:border-gold/60 hover:shadow-[0_0_18px_hsl(var(--gold)/0.28)] transition-all"
      style={{ boxShadow: '0 0 0 1px hsl(var(--gold) / 0.06)' }}
      role="button"
      tabIndex={0}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onOpen()}
    >
      {event.era_label && (
        <div className={`text-[10px] font-montserrat uppercase tracking-[0.15em] text-gold-champagne/90 mb-1 ${align === 'right' ? 'text-right' : ''}`}>
          {event.era_label}
        </div>
      )}
      <h3 className={`font-cinzel font-bold text-sm sm:text-base text-foreground leading-snug inline-flex items-center gap-2 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
        <Icon className="w-3.5 h-3.5 text-gold-champagne" strokeWidth={1.75} />
        <span className="text-left">{event.title}</span>
      </h3>
      {event.description && (
        <p className={`mt-1.5 font-merriweather text-[12.5px] text-text-secondary/90 leading-relaxed line-clamp-3 ${align === 'right' ? 'text-right' : ''}`}>
          {event.description}
        </p>
      )}
      <div className={`mt-2 flex flex-wrap items-center gap-2 ${align === 'right' ? 'justify-end' : ''}`}>
        {linkedTitle && (
          <button
            onClick={e => { e.stopPropagation(); onOpenLinked?.(); }}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-montserrat text-blue-light border border-blue-bright/30 bg-blue-bright/10 hover:bg-blue-bright/20"
          >
            <Link2 className="w-3 h-3" strokeWidth={2} />
            {linkedTitle}
          </button>
        )}
        <button
          ref={dragHandleRef}
          {...dragHandleProps}
          onClick={e => e.stopPropagation()}
          aria-label="Reordenar"
          className="ml-auto inline-flex items-center justify-center w-6 h-6 rounded text-text-dim hover:text-gold-champagne cursor-grab active:cursor-grabbing"
          type="button"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          aria-label="Excluir marco"
          className="inline-flex items-center justify-center w-6 h-6 rounded text-text-dim hover:text-red-alert"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  </motion.div>
);

export default TimelineNode;
