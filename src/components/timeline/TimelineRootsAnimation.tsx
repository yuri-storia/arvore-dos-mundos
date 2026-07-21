import React, { useMemo } from 'react';
import rootsAsset from '@/assets/timeline-roots.png.asset.json';

/**
 * Animação das raízes da Árvore dos Mundos.
 * - Imagem base com mix-blend-mode: screen (o preto #030910 do fundo da arte
 *   é anulado e se funde perfeitamente ao fundo do app).
 * - Partículas douradas descem pelas raízes até o orbe central pulsante.
 * - Puro CSS/SVG — sem vídeo, sem custo de decodificação.
 */

// Coordenadas relativas (%) — orbe central da imagem
const ORB = { x: 50, y: 82 };

// Pontos de partida (topos/laterais das raízes) — em % da imagem.
// Ajustados visualmente para acompanhar os ramos da arte.
const PARTICLE_ORIGINS: Array<{ x: number; y: number; delay: number; duration: number }> = [
  { x: 20, y: 35, delay: 0.0, duration: 4.2 },
  { x: 30, y: 22, delay: 0.9, duration: 3.8 },
  { x: 38, y: 15, delay: 1.7, duration: 4.6 },
  { x: 46, y: 10, delay: 0.4, duration: 4.0 },
  { x: 54, y: 12, delay: 2.1, duration: 4.4 },
  { x: 62, y: 18, delay: 1.2, duration: 3.6 },
  { x: 70, y: 28, delay: 2.6, duration: 4.2 },
  { x: 80, y: 38, delay: 0.6, duration: 4.8 },
  { x: 25, y: 52, delay: 1.5, duration: 3.4 },
  { x: 75, y: 55, delay: 2.3, duration: 3.6 },
  { x: 42, y: 45, delay: 3.0, duration: 3.2 },
  { x: 58, y: 42, delay: 0.2, duration: 3.8 },
];

export const TimelineRootsAnimation: React.FC = () => {
  const particles = useMemo(() => PARTICLE_ORIGINS, []);

  return (
    <div className="relative mb-2 bg-[#030910] overflow-hidden">
      <div className="relative mx-auto w-full max-w-[720px]">
        {/* Imagem base das raízes */}
        <img
          src={rootsAsset.url}
          alt=""
          aria-hidden
          className="relative block w-full h-auto select-none pointer-events-none"
          style={{ mixBlendMode: 'screen' }}
        />

        {/* Camada de partículas fluindo até o orbe */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{ mixBlendMode: 'screen' }}
        >
          {particles.map((p, i) => {
            const dx = ORB.x - p.x;
            const dy = ORB.y - p.y;
            return (
              <span
                key={i}
                className="timeline-particle"
                style={{
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  // @ts-expect-error - CSS custom properties
                  '--dx': `${dx}%`,
                  '--dy': `${dy}%`,
                  animationDelay: `${p.delay}s`,
                  animationDuration: `${p.duration}s`,
                }}
              />
            );
          })}

          {/* Orbe central: halo pulsante + núcleo */}
          <span
            className="timeline-orb-halo"
            style={{ left: `${ORB.x}%`, top: `${ORB.y}%` }}
          />
          <span
            className="timeline-orb-core"
            style={{ left: `${ORB.x}%`, top: `${ORB.y}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default TimelineRootsAnimation;
