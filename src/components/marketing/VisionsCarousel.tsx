import React from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface VisionItem {
  src: string;
  title: string;
  caption: string;
}

interface Props {
  items: VisionItem[];
}

/**
 * Carrossel editorial de imagens geradas dentro da plataforma.
 * Slides de largura fixa e proporção uniforme para manter o ritmo visual da página.
 */
const VisionsCarousel: React.FC<Props> = ({ items }) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: 'start', loop: true, containScroll: 'trimSnaps' });
  const [selected, setSelected] = React.useState(0);

  React.useEffect(() => {
    if (!emblaApi) return;
    const sync = () => setSelected(emblaApi.selectedScrollSnap());
    emblaApi.on('select', sync);
    emblaApi.on('reInit', sync);
    sync();
  }, [emblaApi]);

  return (
    <div className="relative">
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex gap-5 sm:gap-6">
          {items.map((it) => (
            <figure
              key={it.src}
              className="shrink-0 w-[80%] sm:w-[54%] lg:w-[38%] overflow-hidden rounded-2xl border border-gold/[0.12] bg-[rgba(4,12,24,0.42)]"
            >
              <div className="relative aspect-[16/10] overflow-hidden">
                <img
                  src={it.src}
                  alt={it.title}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  style={{ boxShadow: 'inset 0 -50px 70px -40px rgba(2,7,13,0.95)' }}
                />
              </div>
              <figcaption className="px-5 py-4 border-t border-gold/[0.08]">
                <p className="font-cinzel font-bold text-[13.5px] text-foreground mb-1">{it.title}</p>
                <p className="font-manrope text-[12.5px] text-text-dim leading-[1.75]">{it.caption}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 mt-8">
        <button
          type="button"
          onClick={() => emblaApi?.scrollPrev()}
          aria-label="Imagem anterior"
          className="w-9 h-9 rounded-full border border-gold/25 bg-[rgba(2,7,13,0.7)] flex items-center justify-center text-gold-champagne hover:bg-gold/10 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" strokeWidth={2} />
        </button>

        <div className="flex items-center gap-1.5">
          {items.map((it, i) => (
            <button
              key={it.src}
              type="button"
              onClick={() => emblaApi?.scrollTo(i)}
              aria-label={`Ir para ${it.title}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === selected ? 'w-6 bg-gold-champagne' : 'w-1.5 bg-gold-champagne/30'
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => emblaApi?.scrollNext()}
          aria-label="Próxima imagem"
          className="w-9 h-9 rounded-full border border-gold/25 bg-[rgba(2,7,13,0.7)] flex items-center justify-center text-gold-champagne hover:bg-gold/10 transition-colors"
        >
          <ChevronRight className="w-4 h-4" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
};

export default VisionsCarousel;
