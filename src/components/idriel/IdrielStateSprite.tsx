import React, { useEffect, useRef, useState } from 'react';
import { idrielStateSrc, PRELOAD_STATES, type IdrielState } from '@/lib/idriel/idrielStates';

interface Props {
  state: IdrielState;
  className?: string;
  /** Altura fixa da área reservada — evita reflow ao trocar de estado. */
  heightClass?: string;
  /** Classes de encaixe da imagem (default: contain / ancorada embaixo). */
  objectClass?: string;
}

/**
 * Sprite da Idriel — troca direta de imagem, sem crossfade nem animação.
 * A área mantém dimensões estáveis para não causar reflow.
 */
export const IdrielStateSprite: React.FC<Props> = ({
  state,
  className = '',
  heightClass = 'h-full',
  objectClass = 'object-contain object-bottom',
}) => {
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

  useEffect(() => { setFailed(false); }, [state]);

  return (
    <div className={`relative overflow-hidden pointer-events-none select-none ${heightClass} ${className}`} aria-hidden="true">
      {!failed ? (
        <img
          src={idrielStateSrc(state)}
          alt=""
          decoding="async"
          onError={() => setFailed(true)}
          className={`absolute inset-0 w-full h-full ${objectClass}`}
        />
      ) : (
        <div className="absolute inset-0 flex items-end justify-center pb-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gold/30 to-idriel/20 border border-gold/30" />
        </div>
      )}
    </div>
  );
};
