import React, { useEffect, useCallback, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ArrowLeft, ArrowRight, Star } from 'lucide-react';
import { FRUITS } from '@/lib/data';
import { FRUIT_IMAGES } from '@/assets/fruitImages';
import { getFruitScore, getFruitDetail } from '@/hooks/useLatestAnalysis';

interface Props {
  orderedFruits: typeof FRUITS;
  currentFruit: number;
  currentSaveId: string | null;
  fruitScores: Record<string, any>;
  hasAnalysis: boolean;
  onSelect: (id: number) => void;
}

export const FruitCarousel: React.FC<Props> = ({
  orderedFruits,
  currentFruit,
  currentSaveId,
  fruitScores,
  hasAnalysis,
  onSelect,
}) => {
  const storageKey = `construir_carousel_snap_${currentSaveId ?? 'none'}`;

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'center',
    containScroll: 'trimSnaps',
    dragFree: false,
    loop: false,
    duration: 28, // fluidity of transitions
    skipSnaps: false,
  });

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const onSelectSnap = useCallback(() => {
    if (!emblaApi) return;
    const idx = emblaApi.selectedScrollSnap();
    setSelectedIndex(idx);
    setCanPrev(emblaApi.canScrollPrev());
    setCanNext(emblaApi.canScrollNext());
    sessionStorage.setItem(storageKey, String(idx));
  }, [emblaApi, storageKey]);

  // Wire up embla events
  useEffect(() => {
    if (!emblaApi) return;
    onSelectSnap();
    emblaApi.on('select', onSelectSnap);
    emblaApi.on('reInit', onSelectSnap);
    return () => {
      emblaApi.off('select', onSelectSnap);
      emblaApi.off('reInit', onSelectSnap);
    };
  }, [emblaApi, onSelectSnap]);

  // Restore last snap on mount / world change
  useEffect(() => {
    if (!emblaApi) return;
    const raw = sessionStorage.getItem(storageKey);
    if (raw !== null) {
      const idx = parseInt(raw, 10);
      if (!Number.isNaN(idx)) {
        emblaApi.scrollTo(idx, true);
        return;
      }
    }
    // Otherwise center on active fruit
    const activeIdx = orderedFruits.findIndex((f) => f.id === currentFruit);
    if (activeIdx >= 0) emblaApi.scrollTo(activeIdx, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emblaApi, storageKey]);

  // Keep carousel in sync when active fruit is set from outside
  useEffect(() => {
    if (!emblaApi) return;
    const activeIdx = orderedFruits.findIndex((f) => f.id === currentFruit);
    if (activeIdx >= 0 && activeIdx !== emblaApi.selectedScrollSnap()) {
      emblaApi.scrollTo(activeIdx);
    }
  }, [currentFruit, emblaApi, orderedFruits]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((idx: number) => emblaApi?.scrollTo(idx), [emblaApi]);

  const handleSelect = (id: number, idx: number) => {
    onSelect(id);
    scrollTo(idx);
  };

  return (
    <div className="mb-6">
      <div className="relative">
        <button
          type="button"
          aria-label="Anterior"
          onClick={scrollPrev}
          disabled={!canPrev}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-background/90 backdrop-blur-md border border-gold-bronze/40 flex items-center justify-center text-gold-light hover:text-gold-champagne hover:border-gold-warm hover:bg-gold-deep/30 transition-all shadow-[0_0_20px_rgba(0,0,0,0.4)] active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={2} />
        </button>
        <button
          type="button"
          aria-label="Próximo"
          onClick={scrollNext}
          disabled={!canNext}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-background/90 backdrop-blur-md border border-gold-bronze/40 flex items-center justify-center text-gold-light hover:text-gold-champagne hover:border-gold-warm hover:bg-gold-deep/30 transition-all shadow-[0_0_20px_rgba(0,0,0,0.4)] active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={2} />
        </button>

        <div
          ref={emblaRef}
          data-tour="fruit-grid"
          className="overflow-hidden py-6 px-12 sm:px-14 -mx-3 sm:-mx-4 cursor-grab active:cursor-grabbing"
        >
          <div className="flex gap-3 sm:gap-4 touch-pan-y select-none">
            {orderedFruits.map((f, idx) => {
              const score = getFruitScore(fruitScores, f.id);
              const detail = getFruitDetail(fruitScores, f.id);
              const justification = detail?.justification;
              const evidence = detail?.evidence;
              const tooltip = justification
                ? `${justification}${evidence?.length ? `\n\nEvidência: ${evidence.join(', ')}` : ''}`
                : f.desc;
              const isActive = currentFruit === f.id;
              const isMastered = score >= 5;
              const coverImage = FRUIT_IMAGES[f.id];
              return (
                <button
                  key={f.id}
                  title={tooltip}
                  onClick={() => handleSelect(f.id, idx)}
                  className={`relative shrink-0 aspect-[3/4] w-[150px] sm:w-[170px] md:w-[180px] lg:w-[190px] rounded-xl overflow-hidden transition-all duration-500 ease-out group ${
                    isActive
                      ? 'ring-2 ring-blue-bright shadow-[0_0_36px_rgba(59,130,246,0.45),0_0_18px_hsl(var(--gold-warm)/0.25)] scale-[1.06] -translate-y-1 animate-fruit-active'
                      : 'ring-1 ring-transparent hover:ring-gold-bronze/40 hover:shadow-[0_8px_30px_rgba(0,0,0,0.35)] hover:-translate-y-0.5'
                  }`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${f.gradient} ${isActive ? 'opacity-[0.32]' : 'opacity-[0.18] group-hover:opacity-[0.28]'} transition-opacity`} />
                  {coverImage ? (
                    <img
                      src={coverImage}
                      alt={f.name}
                      draggable={false}
                      className={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-300 ${isActive ? 'opacity-95' : 'opacity-50 group-hover:opacity-70'}`}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center opacity-20 group-hover:opacity-30 transition-opacity">
                      <f.Icon className="w-12 h-12 text-gold-champagne" strokeWidth={1.25} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

                  {isActive && (
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-blue-bright/20 via-transparent to-transparent" />
                  )}

                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-full backdrop-blur-sm border text-[9px] font-cinzel transition-colors ${
                      isActive
                        ? 'bg-blue-bright/25 border-blue-bright/60 text-blue-light'
                        : 'bg-background/70 border-gold-bronze/30 text-gold-champagne'
                    }`}>
                      {f.num}
                    </span>
                    {isMastered && (
                      <span className="w-5 h-5 rounded-full bg-gradient-to-br from-gold-light to-gold-deep flex items-center justify-center text-background shadow-[0_0_8px_hsl(var(--gold-warm)/0.6)]">
                        <Star className="w-2.5 h-2.5" strokeWidth={2.5} fill="currentColor" />
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <span className="text-[10px] font-montserrat text-blue-light/80 uppercase tracking-wider block mb-0.5">
                      {idx + 1}º passo
                    </span>
                    <span className="font-cinzel font-bold text-xs sm:text-sm text-foreground leading-tight block mb-2">
                      {f.name}
                    </span>
                    <div className="flex items-center justify-between">
                      {score > 0 ? (
                        <span className="inline-flex items-center gap-0.5">
                          {[1,2,3,4,5].map(i => (
                            <Star key={i} className="w-2 h-2" strokeWidth={1.5}
                              style={{ color: 'hsl(var(--gold-light))', fill: i <= score ? 'hsl(var(--gold-light))' : 'transparent', opacity: i <= score ? 1 : 0.35 }} />
                          ))}
                        </span>
                      ) : (
                        <span className="text-[9px] text-text-dim/60 italic font-montserrat">
                          {hasAnalysis ? 'não avaliado' : 'sem análise'}
                        </span>
                      )}
                      <span className={`text-[9px] font-montserrat uppercase tracking-wider ${isActive ? 'text-blue-light' : 'text-text-dim/60 group-hover:text-blue-light/80'} transition-colors`}>
                        {isActive ? 'Ativo' : 'Abrir'}
                      </span>
                    </div>
                  </div>

                  <div className={`absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-main via-blue-bright to-blue-light transition-transform origin-left duration-500 ${isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`} />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pagination dots */}
      <div className="mt-3 flex items-center justify-center gap-1.5 flex-wrap px-4">
        {orderedFruits.map((f, idx) => {
          const isActive = currentFruit === f.id;
          return (
            <button
              key={f.id}
              type="button"
              aria-label={`Ir para ${f.name}`}
              onClick={() => handleSelect(f.id, idx)}
              className={`group flex items-center justify-center transition-all duration-300 ${
                isActive ? 'w-6 h-2' : 'w-2 h-2 hover:w-3'
              }`}
            >
              <span
                className={`block rounded-full transition-all duration-300 ${
                  isActive
                    ? 'w-6 h-2 bg-gradient-to-r from-blue-main to-blue-bright shadow-[0_0_10px_rgba(59,130,246,0.7)]'
                    : 'w-2 h-2 bg-gold-bronze/40 group-hover:bg-gold-light/70'
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
};
