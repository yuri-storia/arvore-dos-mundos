import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Trees, Leaf, Feather, Sparkles, Compass, Image as ImageIcon } from 'lucide-react';
import idrielAvatar from '@/assets/idriel-avatar.png';

const STEPS = [
  { Icon: Trees, title: 'Crie seu mundo', desc: 'Faça login, nomeie seu mundo no campo acima e clique em "Criar Mundo". Tudo salva na nuvem automaticamente.' },
  { Icon: Compass, title: 'Escolha o método', desc: 'Cima para Baixo: do panorama aos detalhes. Baixo para Cima: dos personagens ao mundo. Escolha na aba Construir.' },
  { Icon: Leaf, title: 'Explore os 11 Frutos', desc: 'Cada Fruto é um pilar do worldbuilding (Mapa, Cultura, Magia…). Vá em qualquer ordem — comece pelo que te inspira!' },
  { Icon: Feather, title: 'Escreva sua história', desc: 'Na aba Escrever, crie manuscritos com capítulos e cenas, organize no mural ou escreva rascunhos livres. Exporte como PDF ou Word.' },
  { Icon: ImageIcon, title: 'Galeria e Visões de Idriel', desc: 'Na aba Galeria, faça upload de referências visuais e gere imagens com IA através das Visões de Idriel (plano completo).' },
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
          Tutorial: Como usar A Árvore dos Mundos
        </h2>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gold-light shrink-0 transition-colors" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gold-light shrink-0 animate-bounce transition-colors" />
        )}
      </button>

      {expanded && (
        <div className="mt-2 rounded-lg p-5 sm:p-6 backdrop-blur-[20px] border border-gold-light/30 shadow-[0_4px_30px_rgba(200,146,42,0.15)] animate-fadeUp" style={{ background: 'linear-gradient(135deg, hsl(38 67% 48% / 0.25) 0%, hsl(38 73% 60% / 0.18) 50%, hsl(38 67% 48% / 0.22) 100%)' }}>
          
          {/* Idriel introduction */}
          <div className="flex gap-4 items-center mb-5 p-4 rounded-lg border border-gold/30" style={{ background: 'linear-gradient(135deg, rgba(218,165,32,0.12) 0%, rgba(139,92,246,0.08) 50%, rgba(16,185,129,0.08) 100%)' }}>
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 border-gold/50 shadow-[0_0_20px_rgba(218,165,32,0.3)] shrink-0">
              <img src={idrielAvatar} alt="Idriel" className="w-full h-full object-cover object-top" />
            </div>
            <div>
              <h3 className="font-cinzel font-bold text-sm text-gold-light"><><Leaf className="inline-block w-4 h-4 mr-1.5 align-[-0.2em] text-gold-champagne" strokeWidth={1.75} />Conheça Idriel</></h3>
              <p className="font-merriweather text-text-secondary text-xs leading-relaxed mt-1">
                <strong className="text-gold-light">Idriel, a Guardiã da Árvore dos Mundos</strong>, é a sua mentora élfica pessoal. Ela observa cada mundo que nasce e guia você com sabedoria milenar. Peça ajuda a ela em qualquer campo, consulte-a sobre seu Fruto atual ou solicite uma <strong className="text-gold-light">Análise de Mundo</strong> completa no Codex. Idriel se encanta com cada detalhe que você cria!
              </p>
            </div>
          </div>

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

          {/* Subscription info — gamified with Idriel */}
          <div className="mt-5 rounded-lg p-4 border border-amber-500/30 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(180,130,20,0.15) 0%, rgba(218,165,32,0.08) 100%)' }}>
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
            <div className="flex gap-3 items-start">
              <Sparkles className="w-5 h-5 shrink-0 mt-1 text-gold-champagne" strokeWidth={1.75} />
              <div>
                <h3 className="font-montserrat font-bold text-sm text-gold-light">
                  Seiva Dourada — Energia de Idriel
                </h3>
                <p className="font-merriweather text-text-secondary text-xs leading-relaxed mt-1">
                  Idriel alimenta suas habilidades com <strong className="text-gold-light">Seiva Dourada</strong> — a energia que flui pela Árvore dos Mundos. Seu plano inclui <strong className="text-gold-light">100 gotas de Seiva</strong> por mês. Textos consomem <strong className="text-gold-light">1 gota</strong>, imagens consomem <strong className="text-gold-light">5 gotas</strong> e uma Análise de Mundo consome <strong className="text-gold-light">2 gotas</strong>.
                </p>
                <p className="mt-2 text-[11px] text-text-dim font-merriweather italic">
                  <><Leaf className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em] text-gold-champagne" strokeWidth={1.75} />Acompanhe sua Seiva Dourada no banner dourado no topo da página. A cada lua nova (mês), Idriel renova sua energia!</>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};