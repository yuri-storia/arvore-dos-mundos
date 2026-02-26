import React from 'react';

export const AppHeader: React.FC = () => (
  <header className="text-center pt-8 pb-6 px-4">
    {/* Badge */}
    <div className="inline-block mb-4 px-4 py-1.5 rounded-full border border-blue-bright/20 bg-blue-bright/[0.06]">
      <span className="font-cinzel text-xs tracking-[0.15em] text-blue-light">
        ✦ Universo STORIA · Template Oficial ✦
      </span>
    </div>

    {/* Floating tree */}
    <div className="animate-heroFloat animate-glow-pulse text-6xl mb-4 select-none">🌳</div>

    {/* Title */}
    <h1 className="font-cinzel font-bold text-[clamp(1.6rem,5vw,2.8rem)] leading-tight mb-3">
      <span className="text-foreground">A Árvore </span>
      <span className="text-blue-light">dos Mundos</span>
    </h1>

    {/* Subtitle */}
    <p className="font-merriweather italic text-text-secondary text-sm md:text-base max-w-xl mx-auto mb-4">
      Construa universos ricos e sem furos — fruto a fruto — com o auxílio da Inteligência Artificial
    </p>

    {/* Decorative line */}
    <div className="mx-auto w-[60px] h-[2px] bg-gradient-to-r from-transparent via-blue-bright to-transparent" />
  </header>
);
