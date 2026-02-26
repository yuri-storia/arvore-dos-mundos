import React from 'react';

export const OnboardingBanner: React.FC = () => {
  return (
    <div className="mx-auto max-w-[1060px] px-3 sm:px-4 py-4">
      <div className="card-glass rounded-lg p-5 sm:p-6">
        <h2 className="font-cinzel font-bold text-base sm:text-lg text-foreground mb-3">
          🌿 Aproxime-se da Árvore dos Mundos e conheça os Frutos do Worldbuilding
        </h2>
        <p className="font-merriweather text-blue-light text-xs sm:text-sm leading-[1.85] mb-4">
          Você não precisa começar pelo 1º Fruto. Comece pelo pilar que mais te destrava agora — Mapa, Cultura, Magia, Personagens — e conecte os outros em seguida. A ordem não é escrita em pedra.
          <br /><br />
          <strong className="text-gold-light">Método camadas:</strong> detalhe alto no ponto de partida, menos detalhe nas bordas. O mundo cresce conforme a história exige.
        </p>
        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-1 rounded-full border border-blue-bright/15 bg-blue-bright/5 text-blue-light text-[11px] font-montserrat">
            ① Escolha 1 ponto de partida
          </span>
          <span className="px-3 py-1 rounded-full border border-blue-bright/15 bg-blue-bright/5 text-blue-light text-[11px] font-montserrat">
            ② Responda o mínimo mundo viável
          </span>
          <span className="px-3 py-1 rounded-full border border-blue-bright/15 bg-blue-bright/5 text-blue-light text-[11px] font-montserrat">
            ③ Expanda em camadas
          </span>
        </div>
      </div>
    </div>
  );
};
