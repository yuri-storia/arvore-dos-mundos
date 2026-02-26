import React from 'react';

export const OnboardingBanner: React.FC = () => {
  return (
    <div className="mx-auto max-w-[1060px] px-3 sm:px-4 py-4">
      <div className="card-glass rounded-lg p-5 sm:p-6">
        <h2 className="font-cinzel font-bold text-base sm:text-lg text-foreground mb-3">
          🌿 Aproxime-se da Árvore dos Mundos e conheça os Frutos do Worldbuilding
        </h2>
        <p className="font-merriweather text-blue-light text-xs sm:text-sm leading-[1.85]">
          Você não precisa começar pelo 1º Fruto. Comece pelo pilar que mais te destrava agora — Mapa, Cultura, Magia, Personagens — e conecte os outros em seguida. A ordem não é escrita em pedra.
        </p>
      </div>
    </div>
  );
};
