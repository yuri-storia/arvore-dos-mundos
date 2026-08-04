import React, { useEffect, useRef, useState } from 'react';
import { idrielStateSrc, PRELOAD_STATES, type IdrielState } from '@/lib/idriel/idrielStates';

interface Props {
  state: IdrielState;
  className?: string;
  /** Altura fixa da área reservada — evita reflow ao trocar de estado. */
  heightClass?: string;
}

/**
 * Sprite da Idriel com área de dimensões estáveis e crossfade suave.
 * Nunca altera a altura do container ao trocar de estado.
 */
export const IdrielStateSprite: React.FC<Props> = ({ state, className = '', heightClass = 'h-full' }) => {
  const [current, setCurrent] = useState(state);
  const [previous, setPrevious] = useState<IdrielState | null>(null);
  const [failed, setFailed] = useState(false);
  const preloaded = useRef(false);

  useEffect(() => {
    if (preloaded.current) return;
    preloaded.current = true;
    PRELOAD_STATES.forEach(s => {
      const img = new Image();
      img.src = idrielStateSrc(s);
    });
  }, []);

  useEffect(() => {
    if (state === current) return;
    setPrevious(current);
    setCurrent(state);
    setFailed(false);
    const t = setTimeout(() => setPrevious(null), 300);
    return () => clearTimeout(t);
  }, [state, current]);

  return (
    <div className={`relative overflow-hidden pointer-events-none select-none ${heightClass} ${className}`} aria-hidden="true">
      {previous && (
        <img
          key={`prev-${previous}`}
          src={idrielStateSrc(previous)}
          alt=""
          className="absolute inset-0 w-full h-full object-contain object-bottom opacity-0 motion-safe:transition-opacity motion-safe:duration-300"
        />
      )}
      {!failed && (
        <img
          key={current}
          src={idrielStateSrc(current)}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="absolute inset-0 w-full h-full object-contain object-bottom animate-idriel-fade"
        />
      )}
      {failed && (
        <div className="absolute inset-0 flex items-end justify-center pb-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gold/30 to-idriel/20 border border-gold/30" />
        </div>
      )}
    </div>
  );
};
