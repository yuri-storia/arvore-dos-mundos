import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Feather, Sparkles, Swords, Compass, Sun, Skull, Flame, Star, Link2, Trash2, Pencil,
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

type TypeStyle = {
  gradient: string;
  border: string;
  glowHover: string;
  accent: string;
  chipBg: string;
  badgeBg: string;
  badgeBorder: string;
  badgeIcon: string;
  badgeShadow: string;
  railTint: string;
};

const TYPE_STYLES: Record<TimelineEventType, TypeStyle> = {
  fato: {
    gradient: 'from-[hsl(var(--background)/0.85)] via-[hsl(var(--background)/0.7)] to-gold-deep/15',
    border: 'border-gold/25',
    glowHover: 'hover:shadow-[0_0_22px_hsl(var(--gold)/0.32)]',
    accent: 'text-gold-champagne',
    chipBg: 'bg-gold/10 border-gold/30 text-gold-light',
    badgeBg: 'bg-gradient-to-br from-gold-champagne via-gold to-gold-deep',
    badgeBorder: 'border-gold',
    badgeIcon: 'text-[#1a0f00]',
    badgeShadow: '0 0 18px hsl(var(--gold) / 0.55)',
    railTint: 'from-gold/70 to-gold/0',
  },
  mito: {
    gradient: 'from-[hsl(var(--background)/0.85)] via-purple-500/10 to-blue-bright/15',
    border: 'border-blue-bright/30',
    glowHover: 'hover:shadow-[0_0_22px_hsl(var(--blue-bright)/0.35)]',
    accent: 'text-blue-light',
    chipBg: 'bg-blue-bright/10 border-blue-bright/30 text-blue-light',
    badgeBg: 'bg-gradient-to-br from-indigo-400 via-blue-500 to-purple-600',
    badgeBorder: 'border-blue-bright',
    badgeIcon: 'text-white',
    badgeShadow: '0 0 18px hsl(var(--blue-bright) / 0.65)',
    railTint: 'from-blue-bright/70 to-blue-bright/0',
  },
  batalha: {
    gradient: 'from-[hsl(var(--background)/0.85)] via-red-alert/10 to-red-alert/20',
    border: 'border-red-alert/35',
    glowHover: 'hover:shadow-[0_0_22px_hsl(var(--red-alert)/0.35)]',
    accent: 'text-red-alert',
    chipBg: 'bg-red-alert/10 border-red-alert/35 text-red-alert',
    badgeBg: 'bg-gradient-to-br from-red-500 via-red-alert to-red-900',
    badgeBorder: 'border-red-alert',
    badgeIcon: 'text-white',
    badgeShadow: '0 0 18px hsl(var(--red-alert) / 0.65)',
    railTint: 'from-red-alert/70 to-red-alert/0',
  },
  descoberta: {
    gradient: 'from-[hsl(var(--background)/0.85)] via-emerald-500/10 to-teal-400/15',
    border: 'border-emerald-400/30',
    glowHover: 'hover:shadow-[0_0_22px_rgba(52,211,153,0.32)]',
    accent: 'text-emerald-300',
    chipBg: 'bg-emerald-400/10 border-emerald-400/30 text-emerald-200',
    badgeBg: 'bg-gradient-to-br from-emerald-300 via-emerald-500 to-teal-700',
    badgeBorder: 'border-emerald-300',
    badgeIcon: 'text-white',
    badgeShadow: '0 0 18px rgba(52,211,153,0.65)',
    railTint: 'from-emerald-300/70 to-emerald-300/0',
  },
  nascimento: {
    gradient: 'from-[hsl(var(--background)/0.85)] via-amber-300/10 to-gold/20',
    border: 'border-amber-300/30',
    glowHover: 'hover:shadow-[0_0_22px_rgba(252,211,77,0.32)]',
    accent: 'text-amber-200',
    chipBg: 'bg-amber-300/10 border-amber-300/30 text-amber-100',
    badgeBg: 'bg-gradient-to-br from-amber-200 via-amber-400 to-orange-500',
    badgeBorder: 'border-amber-300',
    badgeIcon: 'text-[#3a1b00]',
    badgeShadow: '0 0 18px rgba(252,211,77,0.65)',
    railTint: 'from-amber-300/70 to-amber-300/0',
  },
  queda: {
    gradient: 'from-[hsl(var(--background)/0.9)] via-slate-800/40 to-red-alert/15',
    border: 'border-slate-500/30',
    glowHover: 'hover:shadow-[0_0_22px_rgba(148,163,184,0.28)]',
    accent: 'text-slate-300',
    chipBg: 'bg-slate-500/10 border-slate-400/30 text-slate-200',
    badgeBg: 'bg-gradient-to-br from-slate-400 via-slate-600 to-slate-900',
    badgeBorder: 'border-slate-400',
    badgeIcon: 'text-white',
    badgeShadow: '0 0 18px rgba(148,163,184,0.55)',
    railTint: 'from-slate-400/70 to-slate-400/0',
  },
  ritual: {
    gradient: 'from-[hsl(var(--background)/0.85)] via-fuchsia-500/10 to-orange-500/15',
    border: 'border-fuchsia-400/30',
    glowHover: 'hover:shadow-[0_0_22px_rgba(232,121,249,0.32)]',
    accent: 'text-fuchsia-200',
    chipBg: 'bg-fuchsia-400/10 border-fuchsia-400/30 text-fuchsia-200',
    badgeBg: 'bg-gradient-to-br from-fuchsia-300 via-fuchsia-500 to-orange-500',
    badgeBorder: 'border-fuchsia-300',
    badgeIcon: 'text-white',
    badgeShadow: '0 0 18px rgba(232,121,249,0.65)',
    railTint: 'from-fuchsia-300/70 to-fuchsia-300/0',
  },
  outro: {
    gradient: 'from-[hsl(var(--background)/0.85)] via-[hsl(var(--background)/0.75)] to-gold-champagne/10',
    border: 'border-gold-champagne/25',
    glowHover: 'hover:shadow-[0_0_22px_hsl(var(--gold-champagne)/0.28)]',
    accent: 'text-gold-champagne',
    chipBg: 'bg-gold-champagne/10 border-gold-champagne/25 text-gold-champagne',
    badgeBg: 'bg-gradient-to-br from-gold-champagne via-gold to-gold-deep',
    badgeBorder: 'border-gold-champagne',
    badgeIcon: 'text-[#1a0f00]',
    badgeShadow: '0 0 18px hsl(var(--gold-champagne) / 0.55)',
    railTint: 'from-gold-champagne/70 to-gold-champagne/0',
  },
};

export function styleForType(t: TimelineEventType): TypeStyle {
  return TYPE_STYLES[t] ?? TYPE_STYLES.fato;
}

interface Props {
  event: TimelineEvent;
  side: 'left' | 'right';
  expanded: boolean;
  onBadgeClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpenLinked?: () => void;
  linkedTitle?: string | null;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  isDragging?: boolean;
}

export const TimelineNode: React.FC<Props> = ({
  event, side, expanded, onBadgeClick, onEdit, onDelete,
  onOpenLinked, linkedTitle, dragHandleProps, isDragging,
}) => {
  const Icon = iconForType(event.event_type);
  const s = styleForType(event.event_type);
  const isRight = side === 'right';
  const typeLabel = EVENT_TYPES.find(t => t.value === event.event_type)?.label ?? 'Marco';

  return (
    <div
      className={`
        relative grid items-center gap-x-2 sm:gap-x-3 md:gap-x-5
        grid-cols-[1fr_2.75rem_1fr] sm:grid-cols-[1fr_3rem_1fr]
        min-h-[64px]
        ${isDragging ? 'opacity-60' : ''}
      `}
    >
      {/* Slot esquerdo */}
      <div className="min-w-0 flex justify-end">
        {!isRight && (
          <NodeCard
            event={event} side="left" Icon={Icon} style={s} typeLabel={typeLabel}
            expanded={expanded}
            onEdit={onEdit} onDelete={onDelete}
            onOpenLinked={onOpenLinked} linkedTitle={linkedTitle}
          />
        )}
      </div>

      {/* Badge central (também é o drag handle) */}
      <div className="relative flex justify-center">
        <div
          aria-hidden
          className={`
            pointer-events-none absolute top-1/2 -translate-y-1/2 h-[2px] w-1/2
            ${isRight ? 'left-1/2 bg-gradient-to-r' : 'right-1/2 bg-gradient-to-l'}
            ${s.railTint}
          `}
        />
        <motion.button
          {...(dragHandleProps as any)}
          onClick={onBadgeClick}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.92 }}
          aria-label={expanded ? `Recolher marco ${event.title}` : `Expandir marco ${event.title}`}
          aria-expanded={expanded}
          title={
            expanded
              ? `Clique para recolher · Segure e arraste para reordenar`
              : `${event.year ? `${event.year} · ` : ''}${event.title} — Clique para expandir · Segure e arraste para reordenar`
          }
          className={`
            relative z-10 w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center
            border-2 ${s.badgeBorder} ${s.badgeBg} ${s.badgeIcon}
            transition-shadow cursor-grab active:cursor-grabbing touch-none
          `}
          style={{ boxShadow: s.badgeShadow }}
        >
          <Icon className="w-4 h-4" strokeWidth={2} />
          {expanded && (
            <span className="absolute inset-0 rounded-full ring-2 ring-gold-champagne/70 animate-pulse" style={{ animationDuration: '2.4s' }} />
          )}
        </motion.button>
      </div>

      {/* Slot direito */}
      <div className="min-w-0">
        {isRight && (
          <NodeCard
            event={event} side="right" Icon={Icon} style={s} typeLabel={typeLabel}
            expanded={expanded}
            onEdit={onEdit} onDelete={onDelete}
            onOpenLinked={onOpenLinked} linkedTitle={linkedTitle}
          />
        )}
      </div>
    </div>
  );
};

const NodeCard: React.FC<{
  event: TimelineEvent;
  side: 'left' | 'right';
  Icon: any;
  style: TypeStyle;
  typeLabel: string;
  expanded: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onOpenLinked?: () => void;
  linkedTitle?: string | null;
}> = ({ event, side, Icon, style: s, typeLabel, expanded, onEdit, onDelete, onOpenLinked, linkedTitle }) => {
  const hasImage = !!event.image_url;

  // Alinhamento responsivo:
  // - Mobile/Tablet (< lg): cards da esquerda alinham à esquerda; cards da direita alinham à direita.
  // - Desktop (≥ lg): zig-zag apontando para o eixo central (esquerda→direita, direita→esquerda).
  const isLeft = side === 'left';
  const wrapperAlign = isLeft
    ? 'mr-auto text-left lg:ml-auto lg:mr-0 lg:text-right'
    : 'ml-auto text-right lg:mr-auto lg:ml-0 lg:text-left';
  const rowDir = isLeft
    ? 'flex-row lg:flex-row-reverse'
    : 'flex-row-reverse lg:flex-row';
  const textAlign = isLeft
    ? 'text-left lg:text-right'
    : 'text-right lg:text-left';
  const metaJustify = isLeft
    ? 'justify-end lg:justify-start'
    : 'justify-start lg:justify-end';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ layout: { duration: 0.25 }, opacity: { duration: 0.25 } }}
      className={`w-full max-w-md ${wrapperAlign}`}
    >
      <motion.div
        layout
        onClick={expanded ? () => onEdit() : undefined}
        role={expanded ? 'button' : undefined}
        tabIndex={expanded ? 0 : -1}
        onKeyDown={expanded ? (e) => { if (e.key === 'Enter') onEdit(); } : undefined}
        title={expanded ? 'Clique para editar' : undefined}
        transition={{ layout: { duration: 0.42, ease: [0.22, 0.9, 0.32, 1] } }}
        className={`
          relative overflow-hidden rounded-xl border ${s.border}
          bg-gradient-to-br ${s.gradient} backdrop-blur-md
          transition-[box-shadow,border-color] duration-300 ${s.glowHover} hover:border-opacity-70
          ${expanded ? 'p-3 sm:p-4 cursor-pointer' : 'px-3 py-2 sm:px-3.5 sm:py-2.5'}
        `}
        style={{ boxShadow: '0 0 0 1px hsl(var(--gold) / 0.05), 0 6px 20px -12px rgba(0,0,0,0.6)' }}
      >
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-gold-champagne/50 to-transparent pointer-events-none" />

        {/* ---- COLLAPSED ---- */}
        {!expanded && (
          <div className={`flex items-center gap-2 min-w-0 ${rowDir}`}>
            <Icon className={`w-3.5 h-3.5 flex-none ${s.accent}`} strokeWidth={2} />
            <div className={`min-w-0 flex items-center gap-1.5 ${rowDir}`}>
              {event.year ? (
                <span className="flex-none inline-flex items-center px-1.5 py-0.5 rounded-md bg-gold/10 border border-gold/20 text-gold-champagne font-cinzel font-bold text-[11px] sm:text-xs leading-none">
                  {event.year}
                </span>
              ) : null}
              <h3 className={`font-cinzel font-semibold text-[13px] sm:text-sm text-foreground leading-tight truncate ${textAlign}`}>
                {event.title}
              </h3>
            </div>
          </div>
        )}

        {/* ---- EXPANDED ---- */}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              key="expanded"
              initial={{ opacity: 0, height: 0, filter: 'blur(4px)' }}
              animate={{ opacity: 1, height: 'auto', filter: 'blur(0px)' }}
              exit={{ opacity: 0, height: 0, filter: 'blur(4px)' }}
              transition={{
                height: { duration: 0.42, ease: [0.22, 0.9, 0.32, 1] },
                opacity: { duration: 0.32, ease: 'easeOut' },
                filter: { duration: 0.28, ease: 'easeOut' },
              }}
              className="overflow-hidden"
            >
              {hasImage && (
                <div className="relative -mx-3 sm:-mx-4 -mt-3 sm:-mt-4 mb-3 h-28 sm:h-32 overflow-hidden">
                  <img
                    src={event.image_url!}
                    alt={event.title}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--background)/0.9)] via-[hsl(var(--background)/0.25)] to-transparent" />
                </div>
              )}

              <div className={`flex items-center gap-2 mb-1.5 ${rowDir}`}>
                {event.era_label && (
                  <div className={`text-[10px] font-montserrat uppercase tracking-[0.15em] ${s.accent}`}>
                    {event.era_label}
                  </div>
                )}
                <span className={`text-[9px] font-montserrat uppercase tracking-[0.2em] px-1.5 py-0.5 rounded-full border ${s.chipBg}`}>
                  {typeLabel}
                </span>
              </div>

              <h3 className={`font-cinzel font-bold text-sm sm:text-base text-foreground leading-snug inline-flex items-center gap-2 ${rowDir}`}>
                <Icon className={`w-3.5 h-3.5 ${s.accent}`} strokeWidth={1.75} />
                <span>
                  {event.year ? <span className="text-gold-champagne/80 mr-1">{event.year} ·</span> : null}
                  {event.title}
                </span>
              </h3>

              {event.description && (
                <p className={`mt-1.5 font-merriweather text-[12.5px] text-text-secondary/90 leading-relaxed whitespace-pre-wrap ${textAlign}`}>
                  {event.description}
                </p>
              )}

              <div className={`mt-3 pt-2 border-t border-gold/10 flex flex-wrap items-center gap-2 ${metaJustify}`}>
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
                <div className="inline-flex items-center gap-1 ml-auto">
                  <button
                    onClick={e => { e.stopPropagation(); onEdit(); }}
                    aria-label="Editar marco"
                    className="inline-flex items-center justify-center w-7 h-7 rounded text-text-dim hover:text-gold-champagne"
                    title="Editar marco"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); onDelete(); }}
                    aria-label="Excluir marco"
                    className="inline-flex items-center justify-center w-7 h-7 rounded text-text-dim hover:text-red-alert"
                    title="Excluir marco"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export default TimelineNode;
