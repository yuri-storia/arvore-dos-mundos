import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const STEPS = [
  { icon: '✦', title: 'Dê um nome ao seu mundo', desc: 'Comece pelo campo acima — esse é o coração da sua criação.' },
  { icon: '🌿', title: 'Escolha um Fruto para começar', desc: 'Você não precisa ir em ordem. Comece pelo pilar que mais te destrava: Mapa, Cultura, Magia, Personagens…' },
  { icon: '✍️', title: 'Preencha os campos e peça sugestões à IA', desc: 'Use os chips de sugestão ou escreva livremente. A IA vai expandir suas ideias.' },
  { icon: '🖼️', title: 'Gere imagens e monte sua galeria', desc: 'Crie referências visuais para seu mundo na aba "Gerar Imagens" e organize na "Galeria".' },
  { icon: '💾', title: 'Salve e continue quando quiser', desc: 'Seus mundos ficam salvos localmente. Crie quantos quiser e alterne entre eles.' },
];

export const OnboardingBanner: React.FC = () => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mx-auto max-w-[1060px] px-3 sm:px-4 py-4">
      <div className="card-glass-gold rounded-lg p-5 sm:p-6">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between gap-3 text-left group"
        >
          <h2 className="font-cinzel font-bold text-base sm:text-lg text-gold-light group-hover:text-gold transition-colors">
            ✦ Como usar a Árvore dos Mundos
          </h2>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-gold shrink-0" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gold shrink-0" />
          )}
        </button>

        {!expanded && (
          <p className="font-merriweather text-gold-light/70 text-xs sm:text-sm mt-2 leading-relaxed">
            Clique para ver o passo a passo e começar a construir seu mundo.
          </p>
        )}

        {expanded && (
          <div className="mt-4 space-y-3 animate-fadeUp">
            {STEPS.map((step, i) => (
              <div key={i} className="flex gap-3 items-start">
                <span className="text-lg shrink-0 mt-0.5">{step.icon}</span>
                <div>
                  <h3 className="font-montserrat font-bold text-sm text-gold-light">
                    {i + 1}. {step.title}
                  </h3>
                  <p className="font-merriweather text-text-secondary text-xs leading-relaxed mt-0.5">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
