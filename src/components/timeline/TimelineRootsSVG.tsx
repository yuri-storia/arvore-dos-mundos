import React from 'react';

/**
 * Raízes ornamentais douradas que brotam do topo da Linha do Tempo.
 * Ecoam a Árvore dos Mundos (branding do app). Usam tokens gold/blue-glow.
 */
export const TimelineRootsSVG: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 320 160"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    style={{ filter: 'drop-shadow(0 0 14px hsl(var(--gold) / 0.35))' }}
  >
    <defs>
      <linearGradient id="tl-root-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"  stopColor="hsl(var(--gold-champagne))" stopOpacity="0.15" />
        <stop offset="55%" stopColor="hsl(var(--gold))"           stopOpacity="0.9" />
        <stop offset="100%" stopColor="hsl(var(--gold-deep))"     stopOpacity="1" />
      </linearGradient>
      <radialGradient id="tl-root-halo" cx="50%" cy="90%" r="55%">
        <stop offset="0%"   stopColor="hsl(var(--gold-champagne))" stopOpacity="0.35" />
        <stop offset="70%"  stopColor="hsl(var(--gold))"           stopOpacity="0.05" />
        <stop offset="100%" stopColor="hsl(var(--gold))"           stopOpacity="0" />
      </radialGradient>
    </defs>

    {/* halo suave */}
    <ellipse cx="160" cy="150" rx="150" ry="34" fill="url(#tl-root-halo)" />

    {/* raízes laterais (esquerda) */}
    <path
      d="M160 155 C 130 120, 90 110, 40 60 M160 155 C 120 130, 70 120, 20 90 M160 155 C 140 130, 110 130, 80 100"
      stroke="url(#tl-root-grad)" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.85"
    />
    {/* raízes laterais (direita) */}
    <path
      d="M160 155 C 190 120, 230 110, 280 60 M160 155 C 200 130, 250 120, 300 90 M160 155 C 180 130, 210 130, 240 100"
      stroke="url(#tl-root-grad)" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.85"
    />
    {/* raízes secundárias finas */}
    <path
      d="M160 155 C 150 130, 120 120, 100 80 M160 155 C 170 130, 200 120, 220 80 M160 155 C 155 135, 140 125, 130 95 M160 155 C 165 135, 180 125, 190 95"
      stroke="hsl(var(--gold-champagne))" strokeWidth="0.9" fill="none" strokeLinecap="round" opacity="0.55"
    />

    {/* selo real central de onde brota o tronco */}
    <g transform="translate(160 154)">
      <circle r="9" fill="hsl(var(--bg-deep, var(--background)))" stroke="hsl(var(--gold))" strokeWidth="1.4" />
      <circle r="4" fill="hsl(var(--gold))" opacity="0.85" />
      <circle r="14" fill="none" stroke="hsl(var(--gold-champagne))" strokeWidth="0.6" opacity="0.5" strokeDasharray="1.5 2.5" />
    </g>
  </svg>
);

export default TimelineRootsSVG;
