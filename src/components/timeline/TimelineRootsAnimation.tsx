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
          className="block w-full h-auto select-none pointer-events-none opacity-95"
        />

        {/* Máscara sobre a marca d'água no canto inferior direito do vídeo */}
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            right: '4%',
            bottom: '10%',
            width: '12%',
            aspectRatio: '1 / 1',
            background:
              'radial-gradient(circle at center, #030910 0%, #030910 45%, rgba(3,9,16,0.85) 65%, rgba(3,9,16,0) 100%)',
          }}
        />

        {/* Vinheta lateral esfumaçada bem forte */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(to right, #030910 0%, #030910 8%, rgba(3,9,16,0.95) 16%, rgba(3,9,16,0.7) 26%, rgba(3,9,16,0.35) 36%, rgba(3,9,16,0) 46%, rgba(3,9,16,0) 54%, rgba(3,9,16,0.35) 64%, rgba(3,9,16,0.7) 74%, rgba(3,9,16,0.95) 84%, #030910 92%, #030910 100%)',
          }}
        />
        {/* Vinheta vertical esfumaçada bem forte */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, #030910 0%, #030910 8%, rgba(3,9,16,0.95) 16%, rgba(3,9,16,0.7) 26%, rgba(3,9,16,0.35) 36%, rgba(3,9,16,0) 46%, rgba(3,9,16,0) 54%, rgba(3,9,16,0.35) 64%, rgba(3,9,16,0.7) 74%, rgba(3,9,16,0.95) 84%, #030910 92%, #030910 100%)',
          }}
        />
        {/* Vinheta radial: cantos totalmente fundidos ao background */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(3,9,16,0) 30%, rgba(3,9,16,0.5) 60%, rgba(3,9,16,0.9) 85%, #030910 100%)',
          }}
        />
      </div>
    </div>
  );
};

export default TimelineRootsAnimation;
