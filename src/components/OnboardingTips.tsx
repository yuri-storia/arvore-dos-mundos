import React, { useState, useEffect } from 'react';
import { X, ChevronRight } from 'lucide-react';

interface Tip {
  icon: string;
  title: string;
  desc: string;
}

const TAB_TIPS: Record<string, Tip[]> = {
  construir: [
    { icon: '🌿', title: 'Escolha um Fruto', desc: 'Clique em qualquer um dos 11 Frutos para começar a preencher os campos do seu mundo.' },
    { icon: '✍️', title: 'Peça ajuda a Idriel', desc: 'Use o botão "Solicitar Ajuda de Idriel" em qualquer campo para receber sugestões criativas.' },
    { icon: '💾', title: 'Salva automaticamente', desc: 'Tudo que você escreve é salvo automaticamente na nuvem a cada 2 segundos.' },
  ],
  codex: [
    { icon: '📝', title: 'Fichas e Artigos', desc: 'Crie Fichas (personagens, locais) com imagem ou Artigos (lore, história) estilo wiki.' },
    { icon: '🔍', title: 'Filtre por Fruto', desc: 'Use o dropdown de filtro para encontrar entradas por categoria rapidamente.' },
    { icon: '📄', title: 'Exporte como PDF', desc: 'Expanda uma entrada e clique em "Exportar PDF" para gerar um documento formatado.' },
  ],
  escrever: [
    { icon: '📖', title: 'Três modos de escrita', desc: 'Manuscrito (hierárquico), Quadro (Kanban visual) ou Livre (blocos independentes).' },
    { icon: '@', title: 'Menções do Codex', desc: 'Digite @NomeDoPersonagem no editor para referenciar fichas e artigos do seu mundo.' },
    { icon: '⏱️', title: 'Timer Pomodoro', desc: 'Use o timer personalizável para sessões focadas de escrita com pausas programadas.' },
  ],
  galeria: [
    { icon: '🖼️', title: 'Upload em lote', desc: 'Arraste múltiplas imagens ou clique na área de upload para adicionar várias de uma vez.' },
    { icon: '🏷️', title: 'Categorize por Fruto', desc: 'Escolha a categoria antes do upload para organizar suas referências visuais.' },
    { icon: '🔎', title: 'Zoom e download', desc: 'Clique em qualquer imagem para ampliar. Passe o mouse para opções de remover.' },
  ],
  'gerar-imagens': [
    { icon: '🌿', title: 'Dois passos criativos', desc: 'Primeiro Idriel cria o prompt ideal, depois materializa a imagem com Seiva Dourada.' },
    { icon: '🎨', title: 'Estilos visuais', desc: 'Escolha estilo, tipo de imagem e tom para guiar a geração exatamente como imagina.' },
    { icon: '💾', title: 'Salve na galeria', desc: 'Após gerar, salve direto na galeria com a categoria desejada para referência futura.' },
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
      <div className="relative rounded-lg p-4 border border-blue-bright/30 bg-blue-bright/[0.06] backdrop-blur-sm">
        <button onClick={dismiss} className="absolute top-2 right-2 p-1 text-text-dim hover:text-foreground transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-start gap-3">
          <span className="text-2xl shrink-0 mt-0.5">{tip.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[9px] font-montserrat uppercase tracking-widest text-blue-light/60">
                Dica {step + 1} de {tips.length}
              </span>
            </div>
            <h4 className="font-montserrat font-bold text-sm text-foreground mb-0.5">{tip.title}</h4>
            <p className="font-merriweather text-xs text-text-dim leading-relaxed">{tip.desc}</p>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3">
          {/* Progress dots */}
          <div className="flex gap-1.5">
            {tips.map((_, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === step ? 'bg-blue-light' : 'bg-blue-bright/20'}`} />
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={dismiss} className="text-[10px] font-montserrat text-text-dim hover:text-foreground transition-colors">
              Pular
            </button>
            {step < tips.length - 1 ? (
              <button onClick={() => setStep(s => s + 1)}
                className="flex items-center gap-1 text-[10px] font-montserrat font-bold text-blue-light hover:text-blue-bright transition-colors">
                Próxima <ChevronRight className="w-3 h-3" />
              </button>
            ) : (
              <button onClick={dismiss}
                className="text-[10px] font-montserrat font-bold text-blue-light hover:text-blue-bright transition-colors">
                Entendi! ✓
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
