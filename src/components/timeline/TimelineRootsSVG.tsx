import React from 'react';

/**
 * Raízes ornamentais que descem da Árvore dos Mundos (topo azul-glow)
 * e se transformam em dourado ao tocar a Linha do Tempo (base gold).
 * Inspirado em ilustração de raízes pintadas — orgânico, assimétrico,
 * ramificações finas e volumosas convivendo, sem sobreposição truncada.
 */
export const TimelineRootsSVG: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 800 360"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    preserveAspectRatio="xMidYMax meet"
  >
    <defs>
      {/* Degradê principal: azul (Árvore) → dourado (Tempo) */}
      <linearGradient id="root-main" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="hsl(210 90% 72%)" stopOpacity="0.05" />
        <stop offset="18%"  stopColor="hsl(210 90% 72%)" stopOpacity="0.85" />
        <stop offset="42%"  stopColor="hsl(200 70% 68%)" stopOpacity="0.95" />
        <stop offset="62%"  stopColor="hsl(45 78% 68%)"  stopOpacity="1" />
        <stop offset="88%"  stopColor="hsl(42 82% 55%)"  stopOpacity="1" />
        <stop offset="100%" stopColor="hsl(38 70% 42%)"  stopOpacity="1" />
      </linearGradient>

      {/* Degradê secundário (raízes finas, mais etéreo) */}
      <linearGradient id="root-thin" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="hsl(210 90% 80%)" stopOpacity="0" />
        <stop offset="30%"  stopColor="hsl(205 85% 75%)" stopOpacity="0.7" />
        <stop offset="70%"  stopColor="hsl(46 80% 72%)"  stopOpacity="0.9" />
        <stop offset="100%" stopColor="hsl(42 78% 55%)"  stopOpacity="0.6" />
      </linearGradient>

      {/* Halo do selo central */}
      <radialGradient id="root-seal" cx="50%" cy="50%" r="50%">
        <stop offset="0%"   stopColor="hsl(46 90% 80%)"  stopOpacity="1" />
        <stop offset="55%"  stopColor="hsl(42 82% 55%)"  stopOpacity="0.9" />
        <stop offset="100%" stopColor="hsl(38 70% 35%)"  stopOpacity="0" />
      </radialGradient>

      {/* Aura ampla dourada base */}
      <radialGradient id="root-aura" cx="50%" cy="85%" r="55%">
        <stop offset="0%"   stopColor="hsl(46 85% 65%)"  stopOpacity="0.25" />
        <stop offset="60%"  stopColor="hsl(42 80% 50%)"  stopOpacity="0.06" />
        <stop offset="100%" stopColor="hsl(38 70% 40%)"  stopOpacity="0" />
      </radialGradient>

      {/* Brilho azul topo (herança da Árvore) */}
      <radialGradient id="root-sky" cx="50%" cy="0%" r="60%">
        <stop offset="0%"   stopColor="hsl(210 90% 72%)" stopOpacity="0.28" />
        <stop offset="100%" stopColor="hsl(210 90% 72%)" stopOpacity="0" />
      </radialGradient>

      {/* Glow filter para as raízes principais */}
      <filter id="root-glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="2.2" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>

    {/* halos de fundo */}
    <rect x="0" y="0" width="800" height="360" fill="url(#root-sky)" />
    <ellipse cx="400" cy="330" rx="360" ry="60" fill="url(#root-aura)" />

    {/* === Raízes grossas principais === */}
    <g fill="none" strokeLinecap="round" filter="url(#root-glow)">
      {/* Tronco central que desce ao selo */}
      <path
        d="M400 0 C 402 60, 395 120, 400 190 C 402 220, 400 260, 400 320"
        stroke="url(#root-main)" strokeWidth="4.5" opacity="0.95"
      />
      {/* Grande curva esquerda */}
      <path
        d="M400 40 C 340 90, 260 130, 180 200 C 130 245, 90 290, 60 320"
        stroke="url(#root-main)" strokeWidth="3.8" opacity="0.9"
      />
      {/* Grande curva direita */}
      <path
        d="M400 40 C 460 90, 540 130, 620 200 C 670 245, 710 290, 740 320"
        stroke="url(#root-main)" strokeWidth="3.8" opacity="0.9"
      />
      {/* Raiz intermediária esquerda */}
      <path
        d="M400 60 C 360 110, 300 160, 250 230 C 220 270, 200 300, 190 320"
        stroke="url(#root-main)" strokeWidth="2.6" opacity="0.85"
      />
      {/* Raiz intermediária direita */}
      <path
        d="M400 60 C 440 110, 500 160, 550 230 C 580 270, 600 300, 610 320"
        stroke="url(#root-main)" strokeWidth="2.6" opacity="0.85"
      />
      {/* Raízes curtas laterais próximas ao selo */}
      <path
        d="M400 200 C 370 230, 340 260, 315 315"
        stroke="url(#root-main)" strokeWidth="2.2" opacity="0.9"
      />
      <path
        d="M400 200 C 430 230, 460 260, 485 315"
        stroke="url(#root-main)" strokeWidth="2.2" opacity="0.9"
      />
    </g>

    {/* === Raízes finas etéreas === */}
    <g fill="none" strokeLinecap="round" opacity="0.85">
      <path d="M400 20  C 350 70,  270 100, 210 160 C 170 200, 140 250, 120 310" stroke="url(#root-thin)" strokeWidth="1.1" />
      <path d="M400 20  C 450 70,  530 100, 590 160 C 630 200, 660 250, 680 310" stroke="url(#root-thin)" strokeWidth="1.1" />
      <path d="M400 80  C 320 130, 220 170, 150 250 C 110 290, 90 310, 80 320"  stroke="url(#root-thin)" strokeWidth="0.9" />
      <path d="M400 80  C 480 130, 580 170, 650 250 C 690 290, 710 310, 720 320" stroke="url(#root-thin)" strokeWidth="0.9" />
      <path d="M400 120 C 370 170, 320 210, 290 280 C 275 300, 268 315, 265 320" stroke="url(#root-thin)" strokeWidth="0.8" />
      <path d="M400 120 C 430 170, 480 210, 510 280 C 525 300, 532 315, 535 320" stroke="url(#root-thin)" strokeWidth="0.8" />
      <path d="M400 160 C 380 200, 355 240, 340 310"                              stroke="url(#root-thin)" strokeWidth="0.7" />
      <path d="M400 160 C 420 200, 445 240, 460 310"                              stroke="url(#root-thin)" strokeWidth="0.7" />
      <path d="M180 200 C 160 240, 140 275, 135 315"                              stroke="url(#root-thin)" strokeWidth="0.7" />
      <path d="M620 200 C 640 240, 660 275, 665 315"                              stroke="url(#root-thin)" strokeWidth="0.7" />
      <path d="M250 230 C 235 260, 225 285, 220 315"                              stroke="url(#root-thin)" strokeWidth="0.6" />
      <path d="M550 230 C 565 260, 575 285, 580 315"                              stroke="url(#root-thin)" strokeWidth="0.6" />
    </g>

    {/* === Nós/gemas ao longo das raízes === */}
    <g>
      {[
        [180, 200, 2.2], [620, 200, 2.2], [250, 230, 1.6], [550, 230, 1.6],
        [315, 315, 1.4], [485, 315, 1.4], [120, 310, 1.2], [680, 310, 1.2],
      ].map(([cx, cy, r], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="hsl(46 90% 78%)" opacity="0.9" />
      ))}
    </g>

    {/* === Selo central onde a raiz encontra a Linha do Tempo === */}
    <g transform="translate(400 320)">
      <circle r="34" fill="url(#root-seal)" opacity="0.9" />
      <circle r="16" fill="hsl(220 40% 6%)" stroke="hsl(46 85% 60%)" strokeWidth="1.5" />
      <circle r="7"  fill="hsl(46 90% 70%)" opacity="0.95" />
      <circle r="24" fill="none" stroke="hsl(46 80% 60%)" strokeWidth="0.6" opacity="0.6" strokeDasharray="1.5 3" />
      <circle r="30" fill="none" stroke="hsl(46 75% 55%)" strokeWidth="0.4" opacity="0.35" strokeDasharray="1 4" />
    </g>
  </svg>
);

export default TimelineRootsSVG;
