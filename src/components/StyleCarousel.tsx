import React from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { Check, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

export interface StyleCarouselItem {
  id: string;
  label: string;
  description?: string;
  image?: string;
}

interface Props {
  items: StyleCarouselItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  /** Compact height variant (used inside dense forms). */
  size?: 'md' | 'sm';
}

/**
 * Compact horizontal carousel of visual style thumbnails.
 * Uses embla with free drag + snap points and shows arrow controls
 * only when there is overflow to scroll.
 */
export const StyleCarousel: React.FC<Props> = ({ items, selectedId, onSelect, size = 'md' }) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    dragFree: true,
    align: 'start',
    containScroll: 'trimSnaps',
  });
  const [canPrev, setCanPrev] = React.useState(false);
  const [canNext, setCanNext] = React.useState(false);

  React.useEffect(() => {
    if (!emblaApi) return;
    const sync = () => {
      setCanPrev(emblaApi.canScrollPrev());
      setCanNext(emblaApi.canScrollNext());
    };
    emblaApi.on('select', sync);
    emblaApi.on('reInit', sync);
    sync();
  }, [emblaApi]);

  React.useEffect(() => {
    if (!emblaApi) return;
    const idx = items.findIndex(i => i.id === selectedId);
    if (idx >= 0) emblaApi.scrollTo(idx);
  }, [selectedId, emblaApi, items]);

  const cardWidth = size === 'sm' ? 'w-[120px] sm:w-[132px]' : 'w-[140px] sm:w-[152px]';

  return (
    <div className="relative">
      <div ref={emblaRef} className="overflow-hidden px-1 -mx-1">
        <div className="flex gap-2.5">
          {items.map(s => {
            const active = s.id === selectedId;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelect(s.id)}
                aria-pressed={active}
                className={`relative shrink-0 ${cardWidth} aspect-[4/5] overflow-hidden rounded-xl border transition-all ${
                  active
                    ? 'border-gold ring-2 ring-gold/50 shadow-[0_0_18px_rgba(218,165,32,0.35)]'
                    : 'border-gold/10 hover:border-gold/40'
                }`}
              >
                {s.image ? (
                  <img
                    src={s.image}
                    alt={s.label}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-gold/10 via-background to-gold/[0.03] flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-gold-champagne/70" strokeWidth={1.5} />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                {active && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-gold text-background flex items-center justify-center shadow-[0_0_12px_rgba(218,165,32,0.6)]">
                    <Check className="w-3.5 h-3.5" strokeWidth={3} />
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 p-2 text-left">
                  <div className={`font-cinzel text-[11px] leading-tight ${active ? 'text-gold-light' : 'text-foreground'}`}>{s.label}</div>
                  {s.description && (
                    <div className="font-merriweather text-[9px] text-text-dim leading-tight line-clamp-2 mt-0.5">{s.description}</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {canPrev && (
        <button
          type="button"
          onClick={() => emblaApi?.scrollPrev()}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 w-8 h-8 rounded-full bg-background/95 border border-gold/40 backdrop-blur flex items-center justify-center text-gold-light hover:bg-gold/15 transition-colors shadow-lg"
          aria-label="Anterior"
        >
          <ChevronLeft className="w-4 h-4" strokeWidth={2} />
        </button>
      )}
      {canNext && (
        <button
          type="button"
          onClick={() => emblaApi?.scrollNext()}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 w-8 h-8 rounded-full bg-background/95 border border-gold/40 backdrop-blur flex items-center justify-center text-gold-light hover:bg-gold/15 transition-colors shadow-lg"
          aria-label="Próximo"
        >
          <ChevronRight className="w-4 h-4" strokeWidth={2} />
        </button>
      )}
    </div>
  );
};
