import React, { useRef, useState } from 'react';
import { Play, Pause } from 'lucide-react';

interface DemoVideoProps {
  src: string;
  poster: string;
  kicker: string;
  title: string;
  desc: string;
  duration?: string;
  className?: string;
  /** Mostra apenas o quadro do vídeo — o texto vive fora, na composição editorial. */
  bare?: boolean;
}

/**
 * Vídeo demonstrativo da plataforma — clique para reproduzir (com som desligado,
 * em loop). Carregamento preguiçoso para não pesar a página de vendas.
 */
export const DemoVideo: React.FC<DemoVideoProps> = ({
  src, poster, kicker, title, desc, duration, className = '', bare = false,
}) => {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  return (
    <figure
      className={`group relative rounded-2xl overflow-hidden border border-gold-warm/15 bg-[rgba(4,12,24,0.55)] backdrop-blur-xl shadow-[0_30px_90px_-40px_rgba(0,0,0,0.95)] transition-transform duration-500 ease-out hover:-translate-y-1 ${className}`}
    >

      <div className="relative aspect-video w-full overflow-hidden bg-[#02070d]">
        <video
          ref={ref}
          src={src}
          poster={poster}
          muted
          loop
          playsInline
          preload="none"
          onClick={toggle}
          onEnded={() => setPlaying(false)}
          aria-label={`${kicker} — ${title}`}
          className="absolute inset-0 w-full h-full object-contain cursor-pointer"
        />
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? `Pausar vídeo: ${title}` : `Reproduzir vídeo: ${title}`}
          className={`absolute inset-0 grid place-items-center transition-opacity ${
            playing ? 'opacity-0 hover:opacity-100' : 'opacity-100'
          }`}
          style={{
            background: playing
              ? 'transparent'
              : 'radial-gradient(ellipse at center, hsl(214 60% 3% / 0.25) 0%, hsl(214 60% 3% / 0.6) 100%)',
          }}
        >
          <span
            className="w-16 h-16 rounded-full border border-gold-warm/60 bg-[rgba(4,12,24,0.7)] backdrop-blur-md grid place-items-center transition-transform group-hover:scale-105"
            style={{ boxShadow: '0 0 42px hsl(38 60% 45% / 0.35)' }}
          >
            {playing
              ? <Pause className="w-6 h-6 text-gold-champagne" strokeWidth={1.8} />
              : <Play className="w-6 h-6 text-gold-champagne translate-x-[2px]" strokeWidth={1.8} />}
          </span>
        </button>

        {duration && !playing && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full border border-gold-warm/30 bg-[rgba(4,12,24,0.7)] backdrop-blur-md px-2.5 py-1 font-manrope font-semibold uppercase tracking-[0.22em] text-[9px] text-gold-champagne pointer-events-none">
            {kicker} · {duration}
          </span>
        )}
      </div>

      {!bare && (
        <figcaption className="relative px-5 sm:px-6 py-5 border-t border-gold-warm/15 bg-[rgba(4,12,24,0.45)]">
          <p className="font-manrope font-semibold uppercase tracking-[0.22em] text-[10px] text-gold-champagne mb-1.5">
            {kicker}
          </p>
          <h4 className="font-cinzel font-bold text-base sm:text-lg text-foreground mb-2">{title}</h4>
          <p className="font-manrope text-[13px] sm:text-sm text-text-secondary leading-[1.75]">{desc}</p>
        </figcaption>
      )}

    </figure>
  );
};

export default DemoVideo;
