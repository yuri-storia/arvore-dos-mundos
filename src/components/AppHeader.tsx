import React from 'react';
import treeWallpaper from '@/assets/tree-wallpaper.webp';

export const AppHeader: React.FC = () => (
  <header className="relative text-center pt-8 pb-6 px-4 overflow-hidden">
    {/* Background image */}
    <div className="absolute inset-0 z-0">
      <img
        src={treeWallpaper}
        alt=""
        className="w-full h-full object-cover object-center opacity-25"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-b from-transparent to-background blur-sm" />
    </div>

    <div className="relative z-10">
      {/* Badge */}
      <div className="inline-block mb-4 px-4 py-1.5 rounded-full border border-blue-bright/20 bg-blue-bright/[0.06]">
        <span className="font-cinzel text-xs tracking-[0.15em] text-blue-light">
          ✦ Universo STORIA · Template Oficial ✦
        </span>
      </div>

      {/* Spacer where tree emoji used to be */}
      <div className="mb-4" />

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
    </div>
  </header>
);
