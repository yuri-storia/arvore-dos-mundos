import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const STEPS = [
  { icon: '✦', title: 'Dê um nome ao seu mundo', desc: 'Comece pelo campo acima e clique em "Criar Mundo" — esse é o coração da sua criação.' },
  { icon: '🧭', title: 'Escolha seu método de criação', desc: 'Cima para Baixo: comece pela visão geral do mundo e desça aos detalhes. Baixo para Cima: comece pelos personagens e construa o mundo ao redor deles.' },
  { icon: '🌿', title: 'Escolha um Fruto para começar', desc: 'Você não precisa ir em ordem. Comece pelo pilar que mais te destrava: Mapa, Cultura, Magia, Personagens…' },
  { icon: '✍️', title: 'Preencha os campos e peça sugestões à IA', desc: 'Use os chips de sugestão ou escreva livremente. A IA vai expandir suas ideias.' },
  { icon: '🖼️', title: 'Gere imagens e monte sua galeria', desc: 'Crie referências visuais para seu mundo na aba "Gerar Imagens" e organize na "Galeria".' },
  { icon: '💾', title: 'Tudo é salvo automaticamente', desc: 'Após criar seu mundo, todas as alterações são salvas automaticamente. Crie quantos mundos quiser e alterne entre eles.' },
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

          {/* API Key highlight */}
          <div className="mt-5 rounded-lg p-4 border border-blue-bright/30 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, hsl(211 76% 42% / 0.2) 0%, hsl(214 60% 8% / 0.85) 100%)' }}>
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-bright/60 to-transparent" />
            <div className="flex gap-3 items-start">
              <span className="text-xl shrink-0 mt-0.5">🔑</span>
              <div>
                <h3 className="font-montserrat font-bold text-sm text-blue-light">
                  Como adicionar sua Chave OpenAI
                </h3>
                <p className="font-merriweather text-text-secondary text-xs leading-relaxed mt-1">
                  Para usar a IA (sugestões de texto e geração de imagens), você precisa de uma chave da OpenAI.
                </p>
                <ol className="mt-2 space-y-1.5 text-xs font-merriweather text-text-secondary leading-relaxed list-decimal list-inside">
                  <li>
                    Acesse{' '}
                    <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener" className="text-blue-light hover:underline font-montserrat font-semibold">
                      platform.openai.com/api-keys
                    </a>
                    {' '}e faça login (ou crie uma conta gratuita).
                  </li>
                  <li>Clique em <span className="font-montserrat font-semibold text-foreground">"Create new secret key"</span> e copie a chave gerada (começa com <code className="text-blue-light bg-blue-bright/10 px-1 rounded">sk-…</code>).</li>
                  <li>Cole a chave no campo <span className="font-montserrat font-semibold text-gold-light">"🔑 Chave OpenAI"</span> no rodapé desta página.</li>
                  <li>Pronto! A chave fica salva no seu navegador e funciona em todos os seus mundos.</li>
                </ol>
                <p className="mt-2 text-[11px] text-text-dim font-merriweather italic">
                  💡 Sua chave nunca é enviada a servidores externos — ela é usada apenas localmente no seu navegador.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
