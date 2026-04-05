import React, { useState, useEffect } from 'react';
import { X, ChevronRight } from 'lucide-react';

interface Tip {
  icon: string;
  title: string;
  desc: string;
}

const TAB_TIPS: Record<string, Tip[]> = {
  construir: [
    { icon: '🌿', title: 'Bem-vindo à Árvore dos Mundos!', desc: 'Eu sou Idriel, sua guardiã. Aqui você vai cultivar 11 Frutos — cada um é um pilar do seu mundo. Escolha qualquer um para começar!' },
    { icon: '🗺️', title: 'Crie mapas no primeiro Fruto', desc: 'No Fruto "Mapa do Mundo", você pode gerar mapas em estilos como político, geográfico ou explorador. Experimente!' },
    { icon: '💾', title: 'Relaxe, eu cuido de tudo', desc: 'Suas criações são salvas automaticamente a cada 2 segundos. Foque no que importa — dar vida ao seu mundo.' },
  ],
  codex: [
    { icon: '📖', title: 'Seu Codex pessoal', desc: 'Aqui você organiza tudo sobre seu mundo. Crie Fichas com imagens para personagens e locais, ou Artigos estilo wiki para lore e história.' },
    { icon: '📊', title: 'Análise de Mundo', desc: 'Quando tiver algumas entradas, peça a mim uma análise completa — avalio coerência, lacunas e dou sugestões para fortalecer sua criação.' },
  ],
  escrever: [
    { icon: '✍️', title: 'Hora de escrever!', desc: 'Escolha entre Manuscrito (capítulos organizados), Quadro (visão Kanban) ou Escrita Livre. Cada modo serve um estilo diferente de criação.' },
    { icon: '⏱️', title: 'Foco com Pomodoro', desc: 'Ative o timer para sessões focadas. Escreva com calma e faça pausas — as melhores ideias florescem quando descansamos.' },
  ],
  galeria: [
    { icon: '🖼️', title: 'Referências visuais', desc: 'Traga as imagens que inspiram seu mundo — concept arts, mapas, paisagens. Categorize por Fruto para encontrar tudo facilmente.' },
  ],
  'gerar-imagens': [
    { icon: '🌿', title: 'Visões de Idriel', desc: 'Descreva o que imagina e eu materializo em uma imagem. Escolha estilo, tipo e tom — cada visão custa 5 gotas de Seiva Dourada.' },
    { icon: '💾', title: 'Salve suas visões', desc: 'Após gerar uma imagem, salve-a na Galeria para usar como referência. Suas visões são sementes do mundo que está criando.' },
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

  if (!visible || !TAB_TIPS[tab]) return null;

  const tips = TAB_TIPS[tab];
  const tip = tips[step];

  return (
    <div className="mx-auto max-w-[1060px] px-4 mb-3 animate-fadeUp">
      <div className="relative rounded-lg p-4 border border-emerald-500/25 bg-emerald-500/[0.04] backdrop-blur-sm">
        <button onClick={dismiss} className="absolute top-2 right-2 p-1 text-text-dim hover:text-foreground transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-start gap-3">
          <span className="text-2xl shrink-0 mt-0.5">{tip.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-cinzel text-[10px] text-emerald-300/70">
                🌳 Idriel diz…
              </span>
              <span className="text-[9px] font-montserrat uppercase tracking-widest text-emerald-400/40">
                {step + 1}/{tips.length}
              </span>
            </div>
            <h4 className="font-montserrat font-bold text-sm text-foreground mb-0.5">{tip.title}</h4>
            <p className="font-merriweather italic text-xs text-text-dim leading-relaxed">{tip.desc}</p>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3">
          <div className="flex gap-1.5">
            {tips.map((_, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === step ? 'bg-emerald-400' : 'bg-emerald-500/20'}`} />
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={dismiss} className="text-[10px] font-montserrat text-text-dim hover:text-foreground transition-colors">
              Pular
            </button>
            {step < tips.length - 1 ? (
              <button onClick={() => setStep(s => s + 1)}
                className="flex items-center gap-1 text-[10px] font-montserrat font-bold text-emerald-300 hover:text-emerald-200 transition-colors">
                Próxima <ChevronRight className="w-3 h-3" />
              </button>
            ) : (
              <button onClick={dismiss}
                className="text-[10px] font-montserrat font-bold text-emerald-300 hover:text-emerald-200 transition-colors">
                Entendi! ✓
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
