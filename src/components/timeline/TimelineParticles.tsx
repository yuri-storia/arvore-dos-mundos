import React, { useMemo } from 'react';

/**
 * Partículas mágicas flutuando no fundo da Linha do Tempo.
 * Puro CSS/SVG — leve, não intercepta cliques.
 */
export const TimelineParticles: React.FC<{ className?: string; count?: number }> = ({
  className = '',
  count = 42,
}) => {
  const particles = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => {
      const seed = (i + 1) * 9973;
      const left = (seed * 7) % 100;
      const top = (seed * 13) % 100;
      const size = 1 + ((seed * 3) % 30) / 10; // 1 – 4 px
      const delay = ((seed * 17) % 100) / 10;   // 0 – 10s
      const duration = 8 + ((seed * 11) % 90) / 10; // 8 – 17s
      // topo: azul-glow. base: dourado.
      const goldRatio = top / 100;
      const color = goldRatio < 0.35
        ? 'hsl(210 90% 78%)'
        : goldRatio < 0.65
          ? 'hsl(180 60% 78%)'
          : 'hsl(46 90% 72%)';
      const opacity = 0.35 + ((seed * 5) % 55) / 100;
      return { id: i, left, top, size, delay, duration, color, opacity };
    });
  }, [count]);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      {particles.map(p => (
        <span
          key={p.id}
          className="absolute rounded-full animate-tl-float"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: p.color,
            opacity: p.opacity,
            boxShadow: `0 0 ${p.size * 4}px ${p.color}`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes tl-float {
          0%   { transform: translate3d(0, 0, 0) scale(1);   opacity: var(--o, 0.4); }
          50%  { transform: translate3d(6px, -14px, 0) scale(1.25); opacity: 1; }
          100% { transform: translate3d(-4px, -28px, 0) scale(0.85); opacity: 0; }
        }
        .animate-tl-float {
          animation-name: tl-float;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }
      `}</style>
    </div>
  );
};

export default TimelineParticles;
