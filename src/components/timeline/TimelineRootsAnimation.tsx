import React from 'react';
import videoAsset from '@/assets/timeline-roots-loop.mp4.asset.json';

/**
 * Vídeo das raízes da Árvore dos Mundos com energia fluindo do azul
 * (parte superior) até o orbe dourado central. Um esfumaçado (vinheta)
 * na cor do fundo do site (#030910) mescla as bordas do vídeo com o
 * background do app, sem uso de mix-blend-mode.
 */
export const TimelineRootsAnimation: React.FC = () => {
  return (
    <div className="relative mb-2 bg-[#030910] overflow-hidden">
      <div className="relative mx-auto w-full max-w-[720px]">
        <video
          src={videoAsset.url}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden
          className="block w-full h-auto select-none pointer-events-none"
        />

        {/* Máscara para ocultar a marca d'água no canto inferior direito do vídeo.
            Dimensionada generosamente e com blur para funcionar em qualquer proporção. */}
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            right: '-2%',
            bottom: '-2%',
            width: 'clamp(120px, 28%, 320px)',
            height: 'clamp(80px, 32%, 260px)',
            filter: 'blur(14px)',
            background:
              'radial-gradient(ellipse at 70% 70%, #030910 0%, #030910 35%, rgba(3,9,16,0.9) 55%, rgba(3,9,16,0.55) 72%, rgba(3,9,16,0) 100%)',
          }}
        />

        {/* Vinheta lateral esfumaçada: fade horizontal generoso e suave */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(to right, #030910 0%, rgba(3,9,16,0.92) 6%, rgba(3,9,16,0.55) 14%, rgba(3,9,16,0.18) 24%, rgba(3,9,16,0) 34%, rgba(3,9,16,0) 66%, rgba(3,9,16,0.18) 76%, rgba(3,9,16,0.55) 86%, rgba(3,9,16,0.92) 94%, #030910 100%)',
          }}
        />
        {/* Vinheta vertical esfumaçada: fade topo/base generoso e suave */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, #030910 0%, rgba(3,9,16,0.92) 6%, rgba(3,9,16,0.55) 14%, rgba(3,9,16,0.18) 24%, rgba(3,9,16,0) 34%, rgba(3,9,16,0) 66%, rgba(3,9,16,0.18) 76%, rgba(3,9,16,0.55) 86%, rgba(3,9,16,0.92) 94%, #030910 100%)',
          }}
        />
        {/* Vinheta radial: esfumaçado nos cantos para fusão orgânica com o background */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(3,9,16,0) 45%, rgba(3,9,16,0.35) 72%, #030910 100%)',
          }}
        />
      </div>
    </div>
  );
};

export default TimelineRootsAnimation;
