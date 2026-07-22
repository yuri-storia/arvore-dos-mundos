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
          className="block w-full h-auto select-none pointer-events-none opacity-80"
        />

        {/* Vinheta lateral: mescla as bordas horizontais no fundo do site */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(to right, #030910 0%, rgba(3,9,16,0) 14%, rgba(3,9,16,0) 86%, #030910 100%)',
          }}
        />
        {/* Vinheta vertical: mescla topo e base no fundo do site */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, #030910 0%, rgba(3,9,16,0) 12%, rgba(3,9,16,0) 82%, #030910 100%)',
          }}
        />
      </div>
    </div>
  );
};

export default TimelineRootsAnimation;
