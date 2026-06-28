import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Leaf, Map, BookOpen, Trees, Save, BarChart3, Search, Feather, Timer, Image as ImageIcon, Sparkles, type LucideIcon } from 'lucide-react';
import idrielAvatar from '@/assets/idriel-avatar.webp';

interface Tip {
  Icon: LucideIcon;

  title: string;
  desc: string;
}

const TAB_TIPS: Record<string, Tip[]> = {
  construir: [
    { Icon: Leaf, title: 'Saudações, viajante!', desc: 'Eu sou Idriel, guardiã desta Árvore. Aqui você vai cultivar 11 Frutos — cada um é um pilar do seu mundo. Escolha qualquer um para começar!' },
    { Icon: Map, title: 'Crie mapas no primeiro Fruto', desc: 'No Fruto "Mapa do Mundo", você pode gerar mapas em estilos como político, geográfico ou explorador com o Elixir dos Mundos (plano completo).' },
    { Icon: BookOpen, title: 'Orientação em cada Fruto', desc: 'Dentro de cada Fruto você encontra minha "Orientação para Criação & Estudo de Caso" — uma sanfona com guia, exemplos literários e passo a passo. Consulte sempre que precisar!' },
    { Icon: Trees, title: 'Me consulte (plano completo)', desc: 'Nos demais Frutos, peça minha ajuda criativa usando os chips de sugestão ou digitando sua pergunta. Custa apenas 1 gota. Recurso exclusivo do plano Template + Idriel.' },
    { Icon: Save, title: 'Relaxe, eu cuido de tudo', desc: 'Suas criações são salvas automaticamente a cada 2 segundos. Foque no que importa — dar vida ao seu mundo, viajante.' },
  ],
  codex: [
    { Icon: BookOpen, title: 'Seu Codex pessoal', desc: 'Aqui você organiza tudo sobre seu mundo. Crie Fichas com imagens para personagens e locais, ou Artigos estilo wiki para lore.' },
    { Icon: BarChart3, title: 'Posso analisar seu mundo', desc: 'Quando tiver algumas entradas, peça-me uma análise completa — avalio coerência, lacunas e dou sugestões para fortalecer sua criação.' },
    { Icon: Search, title: 'Filtros inteligentes', desc: 'Use os filtros para encontrar entradas por tipo ou por Fruto de origem. Cada categoria mostra quantos itens possui.' },
  ],
  escrever: [
    { Icon: Feather, title: 'Hora de escrever, viajante!', desc: 'Escolha entre Manuscrito (capítulos organizados como um livro), Mural de Cenas (visualize e arraste cenas por status) ou Rascunhos (escrita livre, sem estrutura). Passe o mouse sobre cada modo para saber mais!' },
    { Icon: Timer, title: 'Foco com Pomodoro', desc: 'Ative o timer para sessões focadas. Escreva com calma e faça pausas — as melhores ideias florescem quando descansamos.' },
  ],
  galeria: [
    { Icon: ImageIcon, title: 'Referências visuais', desc: 'Traga as imagens que inspiram seu mundo — concept arts, mapas, paisagens. Categorize por Fruto para encontrar facilmente.' },
    { Icon: Sparkles, title: 'Visões de Idriel (plano completo)', desc: 'Logo abaixo da galeria, abra "Visões de Idriel" para gerar imagens com IA em 3 níveis: Rascunho (2 gotas), Padrão (5 gotas) ou Qualidade Máxima (15 gotas). Descreva o que imagina e Idriel materializa. Recurso exclusivo do plano Template + Idriel.' },
  ],
};

const STORAGE_KEY = 'adm_onboarding_seen';

function getSeenTabs(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function markSeen(tab: string) {
  const seen = getSeenTabs();
  seen.add(tab);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...seen]));
}

interface Props {
  tab: string;
}

export const OnboardingTips: React.FC<Props> = ({ tab }) => {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const seen = getSeenTabs();
    if (!seen.has(tab) && TAB_TIPS[tab]) {
      setVisible(true);
      setStep(0);
    } else {
      setVisible(false);
    }
  }, [tab]);

  const dismiss = () => {
    setVisible(false);
    markSeen(tab);
  };

  const goToStep = (newStep: number) => {
    setAnimating(true);
    setTimeout(() => {
      setStep(newStep);
      setAnimating(false);
    }, 200);
  };

  if (!visible || !TAB_TIPS[tab]) return null;

  const tips = TAB_TIPS[tab];
  const tip = tips[step];

  return (
    <>
      {/* Backdrop overlay */}
      <div className="fixed inset-0 bg-background/60 backdrop-blur-[3px] z-40 animate-fadeUp" onClick={dismiss} />

      {/* Popup card */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[92vw] max-w-[480px] animate-slideUp">
        <div className="card-glass-idriel rounded-2xl p-6 relative overflow-hidden">
          {/* Close */}
          <button onClick={dismiss} className="absolute top-4 right-4 p-1.5 text-text-dim hover:text-foreground transition-colors z-10">
            <X className="w-5 h-5" />
          </button>

          {/* Idriel avatar + label */}
          <div className="flex items-center gap-3.5 mb-5">
            <div className="relative shrink-0">
              <img
                src={idrielAvatar}
                alt="Idriel"
                className="w-14 h-14 rounded-full object-cover border-2 border-idriel/50 animate-idriel-pulse"
              />
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-idriel flex items-center justify-center"><Sparkles className="w-2 h-2 text-white" strokeWidth={2.5} /></div>
            </div>
            <div>
              <span className="font-cinzel font-bold text-base text-idriel-light block">Idriel</span>
              <span className="font-montserrat text-[10px] text-text-secondary uppercase tracking-widest">Guardiã da Árvore dos Mundos</span>
            </div>
            {/* Step indicator — beside the name, not overlapping */}
            <span className="ml-auto mr-8 text-[10px] font-montserrat uppercase tracking-wider text-idriel/60 shrink-0">
              {step + 1}/{tips.length}
            </span>
          </div>

          {/* Tip content with animation */}
          <div className={`transition-all duration-200 ${animating ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}>
            <div className="flex items-start gap-3.5 mb-5">
              <tip.Icon className="w-6 h-6 shrink-0 mt-0.5 text-gold-light" strokeWidth={1.75} />
              <div className="flex-1 min-w-0">
                <h4 className="font-montserrat font-bold text-base text-foreground mb-1.5">{tip.title}</h4>
                <p className="font-merriweather italic text-[15px] text-text-secondary leading-relaxed">{tip.desc}</p>
              </div>
            </div>
          </div>

          {/* Progress + navigation */}
          <div className="flex items-center justify-between mt-1 pt-4 border-t border-idriel/15">
            {/* Progress dots */}
            <div className="flex gap-2.5">
              {tips.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goToStep(i)}
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                    i === step
                      ? 'bg-idriel-light scale-125 shadow-[0_0_10px_hsl(var(--idriel-glow)/0.6)]'
                      : i < step
                        ? 'bg-idriel/50'
                        : 'bg-idriel/15'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2.5">
              {/* Skip */}
              <button onClick={dismiss} className="text-xs font-montserrat text-text-dim hover:text-foreground transition-colors px-2 py-1">
                Pular
              </button>

              {/* Back */}
              {step > 0 && (
                <button
                  onClick={() => goToStep(step - 1)}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-montserrat font-bold text-idriel-light border border-idriel/25 hover:border-idriel/50 hover:bg-idriel/8 transition-all"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Anterior
                </button>
              )}

              {/* Next / Done */}
              {step < tips.length - 1 ? (
                <button
                  onClick={() => goToStep(step + 1)}
                  className="flex items-center gap-1 px-4 py-2 rounded-lg text-xs font-montserrat font-bold text-background bg-idriel-light hover:bg-idriel-glow transition-all shadow-md shadow-idriel/20"
                >
                  Próxima <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={dismiss}
                  className="px-4 py-2 rounded-lg text-xs font-montserrat font-bold text-background bg-idriel-light hover:bg-idriel-glow transition-all shadow-md shadow-idriel/20"
                >
                  <><Sparkles className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />Começar!</>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
