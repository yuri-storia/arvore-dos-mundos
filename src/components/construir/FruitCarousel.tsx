import React, { useEffect, useRef, useCallback } from 'react';
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
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const restoredRef = useRef(false);
  const storageKey = `construir_carousel_scroll_${currentSaveId ?? 'none'}`;

  // Restore scroll position on mount / world change
  useEffect(() => {
    restoredRef.current = false;
    const el = scrollRef.current;
    if (!el) return;
    const raw = sessionStorage.getItem(storageKey);
    if (raw !== null) {
      const val = parseInt(raw, 10);
      if (!Number.isNaN(val)) {
        requestAnimationFrame(() => {
          el.scrollLeft = val;
          restoredRef.current = true;
        });
        return;
      }
    }
    // No saved position: center current active card
    requestAnimationFrame(() => {
      scrollCardIntoView(currentFruit, 'auto');
      restoredRef.current = true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Persist scroll position
  const handleScroll = useCallback(() => {
    if (!restoredRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    sessionStorage.setItem(storageKey, String(el.scrollLeft));
  }, [storageKey]);

  const scrollCardIntoView = (fruitId: number, behavior: ScrollBehavior = 'smooth') => {
    const el = scrollRef.current;
    const card = cardRefs.current.get(fruitId);
    if (!el || !card) return;
    const target = card.offsetLeft - (el.clientWidth - card.clientWidth) / 2;
    el.scrollTo({ left: Math.max(0, target), behavior });
  };

  const scrollByCards = (dir: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    // Approximate card width from first card
    const first = cardRefs.current.values().next().value as HTMLButtonElement | undefined;
    const step = first ? first.clientWidth + 16 : 200;
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  const handleSelect = (id: number) => {
    onSelect(id);
    scrollCardIntoView(id);
  };

  return (
    <div className="mb-6">
      <div className="relative">
        <button
          type="button"
          aria-label="Anterior"
          onClick={() => scrollByCards(-1)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-background/90 backdrop-blur-md border border-gold-bronze/40 flex items-center justify-center text-gold-light hover:text-gold-champagne hover:border-gold-warm hover:bg-gold-deep/30 transition-all shadow-[0_0_20px_rgba(0,0,0,0.4)] active:scale-95"
        >
          <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={2} />
        </button>
        <button
          type="button"
          aria-label="Próximo"
          onClick={() => scrollByCards(1)}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-background/90 backdrop-blur-md border border-gold-bronze/40 flex items-center justify-center text-gold-light hover:text-gold-champagne hover:border-gold-warm hover:bg-gold-deep/30 transition-all shadow-[0_0_20px_rgba(0,0,0,0.4)] active:scale-95"
        >
          <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={2} />
        </button>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          id="fruit-carousel"
          data-tour="fruit-grid"
          className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth py-3 px-12 sm:px-14 -mx-3 sm:-mx-4 scrollbar-hidden"
          style={{ scrollBehavior: 'smooth' }}
        >
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
                ref={(el) => {
                  if (el) cardRefs.current.set(f.id, el);
                  else cardRefs.current.delete(f.id);
                }}
                title={tooltip}
                onClick={() => handleSelect(f.id)}
                className={`relative shrink-0 snap-center aspect-[3/4] w-[150px] sm:w-[170px] md:w-[180px] lg:w-[190px] rounded-xl overflow-hidden transition-all duration-500 ease-out group ${
                  isActive
                    ? 'ring-2 ring-blue-bright shadow-[0_0_36px_rgba(59,130,246,0.45),0_0_18px_hsl(var(--gold-warm)/0.25)] scale-[1.06] -translate-y-1 animate-fruit-active'
                    : 'ring-1 ring-transparent hover:ring-gold-bronze/40 hover:shadow-[0_8px_30px_rgba(0,0,0,0.35)] hover:-translate-y-0.5'
                }`}
              >
                {/* Card base */}
                <div className={`absolute inset-0 bg-gradient-to-br ${f.gradient} ${isActive ? 'opacity-[0.32]' : 'opacity-[0.18] group-hover:opacity-[0.28]'} transition-opacity`} />
                {coverImage ? (
                  <img
                    src={coverImage}
                    alt={f.name}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${isActive ? 'opacity-95' : 'opacity-50 group-hover:opacity-70'}`}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center opacity-20 group-hover:opacity-30 transition-opacity">
                    <f.Icon className="w-12 h-12 text-gold-champagne" strokeWidth={1.25} />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

                {/* Active glow overlay */}
                {isActive && (
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-blue-bright/20 via-transparent to-transparent" />
                )}

                {/* Elegant top badge */}
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

                {/* Bottom content */}
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

                {/* Active indicator line */}
                <div className={`absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-main via-blue-bright to-blue-light transition-transform origin-left duration-500 ${isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`} />
              </button>
            );
          })}
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
              onClick={() => handleSelect(f.id)}
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
