import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CodexCard } from '@/components/CodexCard';
import type { CodexEntry } from '@/hooks/useCodexEntries';
import type { GalleryImage } from '@/lib/data';

interface Props {
  entry: CodexEntry;
  prevEntry: CodexEntry | null;
  nextEntry: CodexEntry | null;
  navIndex: number;
  navTotal: number;
  onClose: () => void;
  onGoPrev?: () => void;
  onGoNext?: () => void;
  onUpdate: (id: string, updates: Partial<Pick<CodexEntry, 'title' | 'content' | 'image_url' | 'entry_type' | 'fruit_id' | 'image_position'>>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onImageUpload: (file: File) => Promise<string | null>;
  onLightbox: (v: { src: string; alt: string } | null) => void;
  gallery: GalleryImage[];
  siblings: CodexEntry[];
  onOpenEntry: (id: string) => void;
}

const SWIPE_THRESHOLD = 70;        // px horizontal movement to trigger
const SWIPE_MAX_VERTICAL = 60;     // px max vertical drift
const SWIPE_MAX_DURATION = 600;    // ms

export const ExpandedCodexOverlay: React.FC<Props> = ({
  entry, prevEntry, nextEntry, navIndex, navTotal,
  onClose, onGoPrev, onGoNext,
  onUpdate, onDelete, onImageUpload, onLightbox, gallery, siblings, onOpenEntry,
}) => {
  const touchStart = useRef<{ x: number; y: number; t: number } | null>(null);
  const [dragDx, setDragDx] = useState(0);

  const isInteractive = (target: EventTarget | null) => {
    const el = target as HTMLElement | null;
    if (!el) return false;
    return !!el.closest('input, textarea, select, button, a, [contenteditable="true"], .ProseMirror');
  };

  const onTouchStart: React.TouchEventHandler = (e) => {
    if (isInteractive(e.target)) { touchStart.current = null; return; }
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY, t: Date.now() };
    setDragDx(0);
  };
  const onTouchMove: React.TouchEventHandler = (e) => {
    if (!touchStart.current) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = Math.abs(t.clientY - touchStart.current.y);
    if (dy < SWIPE_MAX_VERTICAL) setDragDx(dx);
  };
  const onTouchEnd: React.TouchEventHandler = (e) => {
    if (!touchStart.current) { setDragDx(0); return; }
    const dt = Date.now() - touchStart.current.t;
    const dx = dragDx;
    touchStart.current = null;
    setDragDx(0);
    if (dt > SWIPE_MAX_DURATION) return;
    if (dx <= -SWIPE_THRESHOLD && nextEntry && onGoNext) onGoNext();
    else if (dx >= SWIPE_THRESHOLD && prevEntry && onGoPrev) onGoPrev();
  };

  return (
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center bg-background/85 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Prev button (desktop) */}
      {prevEntry && (
        <button
          type="button"
          onClick={onGoPrev}
          aria-label={`Entrada anterior: ${prevEntry.title}`}
          title={`← ${prevEntry.title}`}
          className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full items-center justify-center
            bg-[rgba(4,12,24,0.75)] border border-gold/25 text-gold-light hover:border-gold/60 hover:bg-[rgba(4,12,24,0.9)]
            transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
        >
          <ChevronLeft className="w-5 h-5" strokeWidth={2} />
        </button>
      )}

      {/* Next button (desktop) */}
      {nextEntry && (
        <button
          type="button"
          onClick={onGoNext}
          aria-label={`Próxima entrada: ${nextEntry.title}`}
          title={`${nextEntry.title} →`}
          className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full items-center justify-center
            bg-[rgba(4,12,24,0.75)] border border-gold/25 text-gold-light hover:border-gold/60 hover:bg-[rgba(4,12,24,0.9)]
            transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
        >
          <ChevronRight className="w-5 h-5" strokeWidth={2} />
        </button>
      )}

      <div
        className="w-full max-w-[900px] touch-pan-y"
        style={{
          transform: dragDx ? `translateX(${dragDx * 0.35}px)` : undefined,
          transition: dragDx ? 'none' : 'transform 180ms ease-out',
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <CodexCard
          entry={entry}
          expanded={true}
          onToggle={onClose}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onImageUpload={onImageUpload}
          onLightbox={onLightbox}
          gallery={gallery}
          siblings={siblings}
          onOpenEntry={onOpenEntry}
        />

        {/* Position indicator + mobile hint */}
        {navTotal > 1 && (
          <div className="mt-3 flex items-center justify-center gap-3 text-[10px] font-montserrat uppercase tracking-[0.18em] text-gold-champagne/70">
            <span>{navIndex + 1} / {navTotal}</span>
            <span className="hidden sm:inline">· ← → para navegar</span>
            <span className="sm:hidden">· arraste para os lados</span>
          </div>
        )}
      </div>
    </div>
  );
};
