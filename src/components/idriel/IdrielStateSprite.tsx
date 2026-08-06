import React, { useEffect, useRef, useState } from 'react';
import { idrielStateSrc, PRELOAD_STATES, type IdrielState } from '@/lib/idriel/idrielStates';

interface Props {
  state: IdrielState;
  className?: string;
  /** Altura fixa da área reservada — evita reflow ao trocar de estado. */
  heightClass?: string;
  /** Classes de encaixe da imagem (default: contain / ancorada embaixo). */
  objectClass?: string;
  /** Esfumaçado apenas na base da imagem. */
  fadeBottom?: boolean;
}

/**
 * Sprite da Idriel — troca direta de imagem (sem crossfade), com um indicador
 * discreto de carregamento enquanto o novo estado é decodificado.
 */
export const IdrielStateSprite: React.FC<Props> = ({
  state,
  className = '',
  heightClass = 'h-full',
  objectClass = 'object-contain object-bottom',
  fadeBottom = true,
}) => {
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const preloaded = useRef(false);
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (preloaded.current) return;
    preloaded.current = true;
    PRELOAD_STATES.forEach(s => {
      const img = new Image();
      img.src = idrielStateSrc(s);
    });
  }, []);

  const src = idrielStateSrc(state);

  useEffect(() => {
    setFailed(false);
    setLoading(!seen.current.has(src));
  }, [src]);

  const done = () => { seen.current.add(src); setLoading(false); };

  return (
    <div
      className={`relative overflow-hidden pointer-events-none select-none ${heightClass} ${className}`}
      aria-hidden="true"
      style={
        fadeBottom
          ? {
              WebkitMaskImage:
                'radial-gradient(78% 70% at 50% 44%, #000 55%, rgba(0,0,0,0.55) 78%, transparent 100%), linear-gradient(to bottom, #000 0%, #000 68%, rgba(0,0,0,0.4) 88%, transparent 100%)',
              maskImage:
                'radial-gradient(78% 70% at 50% 44%, #000 55%, rgba(0,0,0,0.55) 78%, transparent 100%), linear-gradient(to bottom, #000 0%, #000 68%, rgba(0,0,0,0.4) 88%, transparent 100%)',
              WebkitMaskComposite: 'source-in',
              maskComposite: 'intersect',
            }
          : undefined
      }
    >
      {!failed ? (
        <img
          key={src}
          src={src}
          alt=""
          decoding="async"
          onLoad={done}
          onError={() => { setLoading(false); setFailed(true); }}
          className={`absolute inset-0 w-full h-full mix-blend-screen ${objectClass}`}
        />
      ) : (
        <div className="absolute inset-0 flex items-end justify-center pb-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gold/30 to-idriel/20 border border-gold/30" />
        </div>
      )}

      {/* Carregamento discreto: brilho suave no topo da silhueta */}
      {loading && !failed && (
        <div className="absolute inset-0 animate-pulse bg-[radial-gradient(60%_45%_at_50%_25%,hsl(var(--gold)/0.10),transparent_70%)]" />
      )}

    </div>
  );
};
