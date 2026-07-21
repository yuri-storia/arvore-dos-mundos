import React from 'react';
import videoAsset from '@/assets/timeline-roots-loop.mp4.asset.json';

/**
 * Vídeo das raízes da Árvore dos Mundos com energia fluindo do azul
 * (parte superior) até o orbe dourado central. Um esfumaçado (vinheta)
 * na cor do fundo do site (#030910) mescla as bordas do vídeo com o
 * background do app, sem uso de mix-blend-mode.
 */
export const TimelineRootsAnimation: React.FC = () => {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  // Autoplay fallback: some browsers ignore autoplay until we call play()
  // explicitly after mount. muted+playsInline satisfies iOS/Safari policies.
  React.useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    const tryPlay = () => {
      const p = v.play();
      if (p && typeof p.catch === 'function') p.catch(() => { /* ignore */ });
    };
    tryPlay();
    // Retry once metadata is ready (mobile browsers)
    v.addEventListener('loadeddata', tryPlay, { once: true });
    return () => v.removeEventListener('loadeddata', tryPlay);
  }, []);

  return (
    <div className="relative mb-2 bg-[#030910] overflow-hidden">
      <div className="relative mx-auto w-full max-w-[720px]">
        <video
          ref={videoRef}
          src={videoAsset.url}
          autoPlay
          muted
          loop
          playsInline
          {...({ 'webkit-playsinline': 'true' } as Record<string, string>)}
          disablePictureInPicture
          disableRemotePlayback
          controls={false}
          preload="auto"
          aria-hidden
          className="block w-full h-auto select-none pointer-events-none"
        />

        {/* Vinheta lateral: mescla suavemente as bordas horizontais no fundo do site */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(to right, #030910 0%, rgba(3,9,16,0.85) 6%, rgba(3,9,16,0) 22%, rgba(3,9,16,0) 78%, rgba(3,9,16,0.85) 94%, #030910 100%)',
          }}
        />
        {/* Vinheta vertical: mescla topo e base no fundo do site */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, #030910 0%, rgba(3,9,16,0.9) 8%, rgba(3,9,16,0) 22%, rgba(3,9,16,0) 74%, rgba(3,9,16,0.9) 92%, #030910 100%)',
          }}
        />
        {/* Vinheta radial suave para amaciar os 4 cantos */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(3,9,16,0) 55%, rgba(3,9,16,0.55) 85%, #030910 100%)',
          }}
        />
      </div>
    </div>
  );
};

export default TimelineRootsAnimation;
