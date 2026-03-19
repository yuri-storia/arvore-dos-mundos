import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const STEPS = [
  { icon: '🌳', title: 'Crie seu mundo', desc: 'Faça login, nomeie seu mundo no campo acima e clique em "Criar Mundo". Tudo salva na nuvem automaticamente.' },
  { icon: '🧭', title: 'Escolha o método', desc: 'Cima para Baixo: do panorama aos detalhes. Baixo para Cima: dos personagens ao mundo. Escolha na aba Construir.' },
  { icon: '🌿', title: 'Explore os 11 Frutos', desc: 'Cada Fruto é um pilar do worldbuilding (Mapa, Cultura, Magia…). Vá em qualquer ordem — comece pelo que te inspira!' },
  { icon: '✍️', title: 'Escreva com ajuda de Idriel', desc: 'Use 🌿 Solicitar Ajuda de Idriel nos campos para sugestões. Clique "Salvar Informação" para guardar fichas no Codex e exporte como PDF.' },
  { icon: '🖼️', title: 'Gere imagens', desc: 'Crie referências visuais na aba "Gerar Imagens" e organize-as na Galeria por Fruto.' },
];

export const OnboardingBanner: React.FC = () => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mx-auto max-w-[1060px] px-3 sm:px-4 py-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-2 group py-2"
      >
        <h2
          className="font-cinzel font-bold text-xs sm:text-sm text-gold-light group-hover:text-gold-light transition-colors uppercase tracking-[0.15em] animate-pulse"
          style={{
            textShadow: '0 0 8px hsl(38 73% 60% / 0.8), 0 0 20px hsl(38 73% 60% / 0.5), 0 0 40px hsl(38 67% 48% / 0.3)',
          }}
        >
          ✦ Tutorial: Como usar A Árvore dos Mundos ✦
        </h2>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gold-light shrink-0 transition-colors" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gold-light shrink-0 animate-bounce transition-colors" />
        )}
      </button>

      {expanded && (
        <div className="mt-2 rounded-lg p-5 sm:p-6 backdrop-blur-[20px] border border-gold-light/30 shadow-[0_4px_30px_rgba(200,146,42,0.15)] animate-fadeUp" style={{ background: 'linear-gradient(135deg, hsl(38 67% 48% / 0.25) 0%, hsl(38 73% 60% / 0.18) 50%, hsl(38 67% 48% / 0.22) 100%)' }}>
          <div className="space-y-3">
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

          {/* Subscription info */}
          <div className="mt-5 rounded-lg p-4 border border-amber-500/30 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(180,130,20,0.15) 0%, rgba(218,165,32,0.08) 100%)' }}>
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
            <div className="flex gap-3 items-start">
              <span className="text-xl shrink-0 mt-0.5">👑</span>
              <div>
                <h3 className="font-montserrat font-bold text-sm text-gold-light">
                  Sobre os Créditos
                </h3>
                <p className="font-merriweather text-text-secondary text-xs leading-relaxed mt-1">
                  Seu plano inclui <strong className="text-gold-light">100 créditos mensais</strong> de IA. Textos custam <strong className="text-gold-light">1 crédito</strong> e imagens custam <strong className="text-gold-light">5 créditos</strong>. Você decide como gastar!
                </p>
                <p className="mt-2 text-[11px] text-text-dim font-merriweather italic">
                  💡 Acompanhe seus créditos restantes no banner dourado no topo da página.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
