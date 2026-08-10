import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface LightboxItem {
  src: string;
  alt?: string;
  name?: string;
  id?: string;
}

interface Props {
  src?: string;
  alt?: string;
  onClose: () => void;
  /** Optional list of images for arrow-key navigation. */
  items?: LightboxItem[];
  /** Starting index when items are provided. */
  initialIndex?: number;
}

export const ImageLightbox: React.FC<Props> = ({
  src,
  alt,
  onClose,
  items,
  initialIndex = 0,
}) => {
  const hasItems = items && items.length > 0;
  const [index, setIndex] = useState(
    hasItems ? Math.max(0, Math.min(initialIndex, items!.length - 1)) : 0
  );

  const current = hasItems
    ? items![index]
    : { src: src || '', alt: alt || '', name: '' };
  const total = hasItems ? items!.length : 1;
  const canPrev = hasItems && total > 1;
  const canNext = hasItems && total > 1;

  const goPrev = () => {
    if (!hasItems) return;
    setIndex(i => (i - 1 + total) % total);
  };

  const goNext = () => {
    if (!hasItems) return;
    setIndex(i => (i + 1) % total);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      }
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, total]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/85 flex items-center justify-center p-4 cursor-zoom-out"
      onClick={onClose}
    >
      {canPrev && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); goPrev(); }}
          aria-label="Imagem anterior"
          className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/50 hover:bg-gold/30 border border-white/20 hover:border-gold/60 text-white flex items-center justify-center transition-colors backdrop-blur-sm"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2} />
        </button>
      )}

      <img
        key={current.src}
        src={current.src}
        alt={current.alt}
        className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-fadeUp"
        onClick={e => e.stopPropagation()}
      />

      {canNext && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); goNext(); }}
          aria-label="Próxima imagem"
          className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/50 hover:bg-gold/30 border border-white/20 hover:border-gold/60 text-white flex items-center justify-center transition-colors backdrop-blur-sm"
        >
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2} />
        </button>
      )}

      {hasItems && total > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-full bg-black/60 border border-white/10 text-white/90 text-xs font-montserrat backdrop-blur-sm">
          {index + 1} / {total}
        </div>
      )}

      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white text-lg flex items-center justify-center transition-colors z-20"
        aria-label="Fechar"
      >
        <X className="w-4 h-4" strokeWidth={2} />
      </button>
    </div>,
    document.body
  );
};
