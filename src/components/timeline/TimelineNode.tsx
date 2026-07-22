import React from 'react';
import { motion } from 'framer-motion';
import {
  Feather, Sparkles, Swords, Compass, Sun, Skull, Flame, Star, Link2, Trash2, GripVertical,
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

/**
 * Paleta refinada por tipo de marco.
 * `gradient` é aplicado ao fundo do card; `border`/`glow`/`accent` refinam o resto.
 * Todas as cores usam tokens semânticos (gold, blue-*, red-alert etc.).
 */
type TypeStyle = {
  gradient: string;
  border: string;
  glowHover: string;
  accent: string; // classe de cor para ícone e era
  chipBg: string; // fundo do selo do tipo
};

const TYPE_STYLES: Record<TimelineEventType, TypeStyle> = {
  fato: {
    gradient: 'from-[hsl(var(--background)/0.85)] via-[hsl(var(--background)/0.7)] to-gold-deep/15',
    border: 'border-gold/25',
    glowHover: 'hover:shadow-[0_0_22px_hsl(var(--gold)/0.32)]',
    accent: 'text-gold-champagne',
    chipBg: 'bg-gold/10 border-gold/30 text-gold-light',
  },
  mito: {
    gradient: 'from-[hsl(var(--background)/0.85)] via-purple-500/10 to-blue-bright/15',
    border: 'border-blue-bright/30',
    glowHover: 'hover:shadow-[0_0_22px_hsl(var(--blue-bright)/0.35)]',
    accent: 'text-blue-light',
    chipBg: 'bg-blue-bright/10 border-blue-bright/30 text-blue-light',
  },
  batalha: {
    gradient: 'from-[hsl(var(--background)/0.85)] via-red-alert/10 to-red-alert/20',
    border: 'border-red-alert/35',
    glowHover: 'hover:shadow-[0_0_22px_hsl(var(--red-alert)/0.35)]',
    accent: 'text-red-alert',
    chipBg: 'bg-red-alert/10 border-red-alert/35 text-red-alert',
  },
  descoberta: {
    gradient: 'from-[hsl(var(--background)/0.85)] via-emerald-500/10 to-teal-400/15',
    border: 'border-emerald-400/30',
    glowHover: 'hover:shadow-[0_0_22px_rgba(52,211,153,0.32)]',
    accent: 'text-emerald-300',
    chipBg: 'bg-emerald-400/10 border-emerald-400/30 text-emerald-200',
  },
  nascimento: {
    gradient: 'from-[hsl(var(--background)/0.85)] via-amber-300/10 to-gold/20',
    border: 'border-amber-300/30',
    glowHover: 'hover:shadow-[0_0_22px_rgba(252,211,77,0.32)]',
    accent: 'text-amber-200',
    chipBg: 'bg-amber-300/10 border-amber-300/30 text-amber-100',
  },
  queda: {
    gradient: 'from-[hsl(var(--background)/0.9)] via-slate-800/40 to-red-alert/15',
    border: 'border-slate-500/30',
    glowHover: 'hover:shadow-[0_0_22px_rgba(148,163,184,0.28)]',
    accent: 'text-slate-300',
    chipBg: 'bg-slate-500/10 border-slate-400/30 text-slate-200',
  },
  ritual: {
    gradient: 'from-[hsl(var(--background)/0.85)] via-fuchsia-500/10 to-orange-500/15',
    border: 'border-fuchsia-400/30',
    glowHover: 'hover:shadow-[0_0_22px_rgba(232,121,249,0.32)]',
    accent: 'text-fuchsia-200',
    chipBg: 'bg-fuchsia-400/10 border-fuchsia-400/30 text-fuchsia-200',
  },
  outro: {
    gradient: 'from-[hsl(var(--background)/0.85)] via-[hsl(var(--background)/0.75)] to-gold-champagne/10',
    border: 'border-gold-champagne/25',
    glowHover: 'hover:shadow-[0_0_22px_hsl(var(--gold-champagne)/0.28)]',
    accent: 'text-gold-champagne',
    chipBg: 'bg-gold-champagne/10 border-gold-champagne/25 text-gold-champagne',
  },
};

export function styleForType(t: TimelineEventType): TypeStyle {
  return TYPE_STYLES[t] ?? TYPE_STYLES.fato;
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
    <div
      className="
        relative grid items-center gap-x-3 md:gap-x-6 min-h-[80px] md:min-h-[100px]
        grid-cols-[3rem_1fr]
        md:grid-cols-[1fr_3.5rem_1fr]
      "
    >
      {/* Coluna esquerda (desktop; card se side==='left') */}
      <div className="hidden md:flex justify-end pr-2">
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
      <div className="relative flex justify-center">
        <motion.button
          onClick={onOpen}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          aria-label={`Abrir marco ${event.title}`}
          className="relative z-10 w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center border-2 border-gold text-[#1a0f00] bg-gradient-to-br from-gold-champagne via-gold to-gold-deep shadow-[0_0_18px_hsl(var(--gold)/0.55)] hover:shadow-[0_0_26px_hsl(var(--gold)/0.85)] transition-shadow"
          style={{ filter: 'drop-shadow(0 0 6px hsl(var(--gold-champagne)/0.55))' }}
        >
          <Icon className="w-4 h-4" strokeWidth={2} />
          <span className="absolute inset-0 rounded-full ring-1 ring-gold-champagne/60 animate-pulse" style={{ animationDuration: '3s' }} />
        </motion.button>
      </div>

      {/* Coluna direita: card no mobile/tablet sempre, no desktop só quando isRight */}
      <div className={`${isRight ? 'md:pl-2' : 'md:hidden'}`}>
        <NodeCard
          event={event} align="left" Icon={Icon}
          onOpen={onOpen} onDelete={onDelete}
          onOpenLinked={onOpenLinked} linkedTitle={linkedTitle}
          dragHandleRef={dragHandleRef} dragHandleProps={dragHandleProps}
        />
      </div>
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
}> = ({ event, align, Icon, onOpen, onDelete, onOpenLinked, linkedTitle, dragHandleRef, dragHandleProps }) => {
  const s = styleForType(event.event_type);
  const typeLabel = EVENT_TYPES.find(t => t.value === event.event_type)?.label ?? 'Marco';
  const hasImage = !!event.image_url;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group max-w-md w-full ${align === 'right' ? 'ml-auto text-right' : ''}`}
    >
      <div
        onClick={onOpen}
        className={`cursor-pointer relative overflow-hidden rounded-xl border ${s.border} bg-gradient-to-br ${s.gradient} backdrop-blur-md p-3 sm:p-4 transition-all ${s.glowHover} hover:border-opacity-70`}
        style={{ boxShadow: '0 0 0 1px hsl(var(--gold) / 0.05), 0 6px 20px -12px rgba(0,0,0,0.6)' }}
        role="button"
        tabIndex={0}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onOpen()}
      >
        {/* brilho dourado sutil no topo */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-gold-champagne/50 to-transparent pointer-events-none" />

        {hasImage && (
          <div className={`relative -mx-3 sm:-mx-4 -mt-3 sm:-mt-4 mb-3 h-28 sm:h-32 overflow-hidden ${align === 'right' ? '' : ''}`}>
            <img
              src={event.image_url!}
              alt={event.title}
              loading="lazy"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--background)/0.9)] via-[hsl(var(--background)/0.25)] to-transparent" />
          </div>
        )}

        {/* linha: era + selo do tipo */}
        <div className={`flex items-center gap-2 mb-1.5 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
          {event.era_label && (
            <div className={`text-[10px] font-montserrat uppercase tracking-[0.15em] ${s.accent}`}>
              {event.era_label}
            </div>
          )}
          <span className={`text-[9px] font-montserrat uppercase tracking-[0.2em] px-1.5 py-0.5 rounded-full border ${s.chipBg}`}>
            {typeLabel}
          </span>
        </div>

        <h3 className={`font-cinzel font-bold text-sm sm:text-base text-foreground leading-snug inline-flex items-center gap-2 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
          <Icon className={`w-3.5 h-3.5 ${s.accent}`} strokeWidth={1.75} />
          <span className="text-left">{event.title}</span>
        </h3>
        {event.description && (
          <p className={`mt-1.5 font-merriweather text-[12.5px] text-text-secondary/90 leading-relaxed line-clamp-3 ${align === 'right' ? 'text-right' : ''}`}>
            {event.description}
          </p>
        )}
        <div className={`mt-2 flex flex-wrap items-center gap-2 ${align === 'right' ? 'justify-end' : ''}`}>
          {linkedTitle && onOpenLinked && (
            <button
              onClick={e => { e.stopPropagation(); onOpenLinked(); }}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-montserrat text-blue-light border border-blue-bright/30 bg-blue-bright/10 hover:bg-blue-bright/20 max-w-[220px] truncate"
              title={`Abrir "${linkedTitle}" no Codex`}
            >
              <Link2 className="w-3 h-3 flex-none" strokeWidth={2} />
              <span className="truncate">{linkedTitle}</span>
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
};

export default TimelineNode;
