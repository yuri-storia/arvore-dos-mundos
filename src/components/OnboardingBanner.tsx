import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const STEPS = [
  { icon: '✦', title: 'Crie sua conta e faça login', desc: 'Para salvar seu progresso, fichas e imagens, entre com seu e-mail. Tudo fica salvo na nuvem automaticamente.' },
  { icon: '🌳', title: 'Dê um nome ao seu mundo', desc: 'Comece pelo campo acima e clique em "Criar Mundo" — esse é o ponto de partida da sua criação.' },
  { icon: '🧭', title: 'Escolha seu método de criação', desc: 'Cima para Baixo: comece pela visão geral do mundo e desça aos detalhes. Baixo para Cima: comece pelos personagens e construa o mundo ao redor deles.' },
  { icon: '🌿', title: 'Explore os 11 Frutos', desc: 'Cada Fruto representa um pilar do worldbuilding (Mapa, Cultura, Magia, Personagens…). Não precisa ir em ordem — comece pelo que mais te inspira!' },
  { icon: '✍️', title: 'Preencha os campos e peça ajuda à IA', desc: 'Use o botão 💡 Modo Ajuda AI para receber sugestões contextualizadas. A IA já está integrada — basta ter um plano ativo.' },
  { icon: '📖', title: 'Salve fichas no Codex', desc: 'Use o botão "Salvar Informação" nos campos para criar fichas organizadas por Fruto. Exporte fichas individuais ou em lote como PDF.' },
  { icon: '🖼️', title: 'Gere imagens e monte sua galeria', desc: 'Na aba "Gerar Imagens", crie referências visuais com IA. Ao salvar, escolha em qual Fruto a imagem será organizada na Galeria.' },
  { icon: '💾', title: 'Tudo salva automaticamente', desc: 'Após criar seu mundo, cada alteração é salva na nuvem. Crie quantos mundos quiser e alterne entre eles nas configurações.' },
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
