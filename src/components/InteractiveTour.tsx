import React, { useState, useEffect, useCallback, useRef } from 'react';
import idrielAvatar from '@/assets/idriel-avatar.png';
import type { TabType } from '@/lib/data';

/**
 * Step types:
 * - intro/outro: centered modal, "Next"/"Finish" button
 * - click: highlights element, user must click it to advance (e.g. tabs)
 * - highlight: highlights element, shows info tooltip, "Próximo" button to advance
 */
export interface TourStep {
  type: 'intro' | 'click' | 'highlight' | 'outro';
  target?: string; // data-tour attribute value
  title: string;
  desc: string;
  icon: string;
  tabToActivate?: TabType;
  /** For highlight steps: preferred tooltip position relative to target */
  tooltipPos?: 'right' | 'bottom' | 'left' | 'top' | 'center';
  /** Delay before showing this step (ms) — useful after tab switch */
  delay?: number;
  /** Switch to this fruit index before showing the step */
  setFruit?: number;
}

const TOUR_STEPS: TourStep[] = [
  // ── INTRO ──
  {
    type: 'intro',
    title: 'Bem-vindo(a) à Árvore dos Mundos!',
    desc: 'Saudações, viajante! Eu sou Idriel, guardiã ancestral desta árvore mágica. Será uma honra guiá-lo(a) por cada ferramenta deste lugar sagrado. Preste atenção nos destaques dourados — eles mostram onde a magia acontece!',
    icon: '🌳',
  },

  // ── CONSTRUIR ──
  {
    type: 'click',
    target: 'tab-construir',
    tabToActivate: 'construir',
    title: 'Aba Construir',
    desc: 'Vamos começar pela fundação do seu mundo, viajante. Clique em Construir!',
    icon: '🌿',
  },
  {
    type: 'highlight',
    target: 'fruit-grid',
    title: 'Os 11 Frutos do Mundo',
    desc: 'Cada card é um Fruto — um pilar do seu mundo, viajante. Mapa, história, culturas, magia, religiões… Clique em qualquer Fruto para abrir seus campos de preenchimento. Não precisa seguir ordem!',
    icon: '🍎',
    tooltipPos: 'bottom',
    delay: 400,
    setFruit: 1, // Switch away from fruit 0 (Mapa do Mundo) so Consultar Idriel appears
  },
  {
    type: 'highlight',
    target: 'consult-idriel',
    title: 'Consultar Idriel (Plano Completo)',
    desc: 'Dentro de cada Fruto, viajante, você pode me consultar! Use os chips de sugestão ou escreva sua dúvida. Este recurso é exclusivo do plano Template + Idriel e custa apenas 1 gota de Seiva.',
    icon: '🌿',
    tooltipPos: 'top',
    delay: 200,
  },

  // ── CODEX ──
  {
    type: 'click',
    target: 'tab-codex',
    tabToActivate: 'codex',
    title: 'Aba Codex',
    desc: 'Agora vamos ver onde tudo se organiza, viajante. Clique em Codex!',
    icon: '📖',
  },
  {
    type: 'highlight',
    target: 'codex-new-entry',
    title: 'Criar Fichas e Artigos',
    desc: 'Aqui você cria Fichas (com imagem, para personagens, locais e itens) e Artigos (texto livre, para lore e regras). Tudo que você preenche nos Frutos também aparece aqui automaticamente!',
    icon: '📋',
    tooltipPos: 'left',
    delay: 400,
  },

  // ── ESCREVER ──
  {
    type: 'click',
    target: 'tab-escrever',
    tabToActivate: 'escrever',
    title: 'Aba Escrever',
    desc: 'Hora de dar vida à sua história, viajante! Clique em Escrever!',
    icon: '✍️',
  },
  {
    type: 'highlight',
    target: 'create-manuscript',
    title: 'Criar Manuscrito',
    desc: 'Comece criando um manuscrito, viajante. Dentro dele, você organiza Capítulos e Cenas — como um livro de verdade. Depois pode exportar em PDF, Word ou HTML para e-book!',
    icon: '📕',
    tooltipPos: 'bottom',
    delay: 400,
  },

  // ── GALERIA ──
  {
    type: 'click',
    target: 'tab-galeria',
    tabToActivate: 'galeria',
    title: 'Aba Galeria',
    desc: 'Por último, as referências visuais, viajante! Clique em Galeria!',
    icon: '🎨',
  },
  {
    type: 'highlight',
    target: 'gallery-upload',
    title: 'Upload de Referências',
    desc: 'Faça upload das imagens que inspiram seu mundo — concept arts, mapas, paisagens. Organize por categoria de Fruto para encontrar facilmente.',
    icon: '🖼️',
    tooltipPos: 'bottom',
    delay: 400,
  },
  {
    type: 'highlight',
    target: 'visoes-idriel',
    title: 'Visões de Idriel — Geração de Imagens',
    desc: 'Aqui eu materializo as visões do seu mundo, viajante! Descreva o que imagina, escolha estilo e tom, e eu gero a imagem com IA. Cada visão custa 5 gotas de Seiva Dourada. Este recurso é exclusivo do plano completo.',
    icon: '✨',
    tooltipPos: 'top',
    delay: 200,
  },

  // ── OUTRO ──
  {
    type: 'outro',
    title: 'A jornada começa agora!',
    desc: 'Agora você conhece cada ferramenta da Árvore, viajante. Comece pelo Fruto que mais te inspira — não existe ordem certa. E lembre-se: clique no "?" dourado para me chamar a qualquer momento. Que a Árvore ilumine o seu caminho! ✨',
    icon: '🌟',
  },
];

const TOUR_STORAGE_KEY = 'adm_interactive_tour_done';
const ONBOARDING_STORAGE_KEY = 'adm_onboarding_seen';

function hasDoneTour(): boolean {
  try { return localStorage.getItem(TOUR_STORAGE_KEY) === 'true'; } catch { return false; }
}

function markTourDone() {
  try {
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(['construir', 'codex', 'escrever', 'galeria']));
  } catch {}
}

interface Props {
  active: boolean;
  onFinish: () => void;
  setActiveTab: (t: TabType) => void;
  setCurrentFruit?: (id: number) => void;
}

export const InteractiveTour: React.FC<Props> = ({ active, onFinish, setActiveTab, setCurrentFruit }) => {
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [animating, setAnimating] = useState(false);
  const [delayWaiting, setDelayWaiting] = useState(false);
  const rafRef = useRef<number>(0);

  const currentStep = TOUR_STEPS[step];

  // Handle delay for steps that need it (after tab switch)
  useEffect(() => {
    if (!active) return;
    const s = TOUR_STEPS[step];
    if (s.delay) {
      setDelayWaiting(true);
      const t = setTimeout(() => setDelayWaiting(false), s.delay);
      return () => clearTimeout(t);
    } else {
      setDelayWaiting(false);
    }
  }, [active, step]);

  // Measure target element position
  const measureTarget = useCallback(() => {
    if (!active || delayWaiting) return;
    const s = TOUR_STEPS[step];
    if (s.target) {
      const el = document.querySelector(`[data-tour="${s.target}"]`);
      if (el) {
        setTargetRect(el.getBoundingClientRect());
      } else {
        setTargetRect(null);
      }
    } else {
      setTargetRect(null);
    }
    rafRef.current = requestAnimationFrame(measureTarget);
  }, [active, step, delayWaiting]);

  useEffect(() => {
    if (active && !delayWaiting) {
      rafRef.current = requestAnimationFrame(measureTarget);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, measureTarget, delayWaiting]);

  // Scroll target into view
  useEffect(() => {
    if (!active || delayWaiting || !currentStep.target) return;
    const el = document.querySelector(`[data-tour="${currentStep.target}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [active, step, delayWaiting, currentStep.target]);

  const goNext = useCallback(() => {
    if (step >= TOUR_STEPS.length - 1) {
      finish();
      return;
    }
    // Activate tab for the current click step
    if (TOUR_STEPS[step].tabToActivate) {
      setActiveTab(TOUR_STEPS[step].tabToActivate!);
    }
    // Switch fruit if next step requires it
    const nextStep = TOUR_STEPS[step + 1];
    if (nextStep.setFruit !== undefined && setCurrentFruit) {
      setCurrentFruit(nextStep.setFruit);
    }
    setAnimating(true);
    setTimeout(() => {
      setStep(s => s + 1);
      setAnimating(false);
    }, 250);
  }, [step, setActiveTab, setCurrentFruit]);

  const finish = () => {
    markTourDone();
    setStep(0);
    setActiveTab('construir');
    onFinish();
  };

  if (!active || delayWaiting) {
    // During delay, show a subtle loading overlay
    if (active && delayWaiting) {
      return (
        <div className="fixed inset-0 z-[9998] bg-background/60 pointer-events-auto" />
      );
    }
    return null;
  }

  const isCenter = currentStep.type === 'intro' || currentStep.type === 'outro';
  const hasNextButton = currentStep.type === 'intro' || currentStep.type === 'outro' || currentStep.type === 'highlight';
  const pad = 10;

  // Calculate tooltip position
  const getTooltipStyle = (): React.CSSProperties => {
    if (isCenter) {
      return { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' };
    }
    if (!targetRect) {
      return { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' };
    }
    const pos = currentStep.tooltipPos || 'right';
    const cardW = 380;
    const cardH = 280;

    switch (pos) {
      case 'right':
        return {
          left: Math.min(targetRect.right + 20, window.innerWidth - cardW - 16),
          top: Math.max(targetRect.top, 16),
        };
      case 'left':
        return {
          left: Math.max(targetRect.left - cardW - 20, 16),
          top: Math.max(targetRect.top, 16),
        };
      case 'bottom':
        return {
          left: Math.max(Math.min(targetRect.left, window.innerWidth - cardW - 16), 16),
          top: Math.min(targetRect.bottom + 16, window.innerHeight - cardH - 16),
        };
      case 'top':
        return {
          left: Math.max(Math.min(targetRect.left, window.innerWidth - cardW - 16), 16),
          top: Math.max(targetRect.top - cardH - 16, 16),
        };
      default:
        return {
          left: Math.min(targetRect.right + 16, window.innerWidth - cardW - 16),
          top: Math.max(targetRect.top - 20, 16),
        };
    }
  };

  return (
    <>
      {/* Overlay with spotlight cutout */}
      <div className="fixed inset-0 z-[9998] pointer-events-none">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <mask id="tour-mask">
              <rect width="100%" height="100%" fill="white" />
              {targetRect && (
                <rect
                  x={targetRect.left - pad}
                  y={targetRect.top - pad}
                  width={targetRect.width + pad * 2}
                  height={targetRect.height + pad * 2}
                  rx="12"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            width="100%" height="100%"
            fill="rgba(2, 7, 13, 0.82)"
            mask="url(#tour-mask)"
            className="pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          />
        </svg>
      </div>

      {/* Pulsing border around target */}
      {targetRect && (
        <div
          className="fixed z-[9999] pointer-events-none rounded-xl border-2 border-idriel-light animate-tour-pulse"
          style={{
            left: targetRect.left - pad,
            top: targetRect.top - pad,
            width: targetRect.width + pad * 2,
            height: targetRect.height + pad * 2,
          }}
        />
      )}

      {/* Clickable area over target for click steps */}
      {targetRect && currentStep.type === 'click' && (
        <div
          className="fixed z-[10000] rounded-xl cursor-pointer"
          onClick={() => goNext()}
          style={{
            left: targetRect.left - pad,
            top: targetRect.top - pad,
            width: targetRect.width + pad * 2,
            height: targetRect.height + pad * 2,
          }}
        />
      )}

      {/* Tooltip / Card */}
      <div
        className={`fixed z-[10001] transition-all duration-300 ${animating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
        style={getTooltipStyle()}
      >
        <div className={`card-glass-idriel rounded-2xl p-5 shadow-2xl border border-idriel/20 ${isCenter ? 'w-[92vw] max-w-[480px]' : 'w-[360px] max-w-[90vw]'}`}>
          {/* Avatar + header */}
          <div className="flex items-center gap-3 mb-3">
            <div className="relative shrink-0">
              <img src={idrielAvatar} alt="Idriel" className="w-10 h-10 rounded-full object-cover border-2 border-idriel/50 animate-idriel-pulse" />
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-idriel flex items-center justify-center text-[7px]">✨</div>
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-cinzel font-bold text-xs text-idriel-light block">Idriel</span>
              <span className="font-montserrat text-[8px] text-text-secondary uppercase tracking-widest">Guardiã da Árvore</span>
            </div>
            <span className="text-[9px] font-montserrat text-idriel/50 uppercase tracking-wider shrink-0">
              {step + 1}/{TOUR_STEPS.length}
            </span>
          </div>

          {/* Content */}
          <div className="flex items-start gap-2.5 mb-4">
            <span className="text-xl shrink-0">{currentStep.icon}</span>
            <div className="flex-1 min-w-0">
              <h4 className="font-montserrat font-bold text-[13px] text-foreground mb-1">{currentStep.title}</h4>
              <p className="font-merriweather italic text-[12px] text-text-secondary leading-relaxed">{currentStep.desc}</p>
            </div>
          </div>

          {/* Instruction for click steps */}
          {currentStep.type === 'click' && (
            <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-idriel/[0.08] border border-idriel/15">
              <span className="text-base animate-bounce">👆</span>
              <span className="font-montserrat text-[11px] text-idriel-light font-bold">
                Clique no botão pulsando para continuar
              </span>
            </div>
          )}

          {/* Progress + actions */}
          <div className="flex items-center justify-between pt-3 border-t border-idriel/15">
            {/* Progress bar instead of dots (too many steps for dots) */}
            <div className="flex-1 mr-3">
              <div className="h-1 bg-idriel/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-idriel-light rounded-full transition-all duration-500"
                  style={{ width: `${((step + 1) / TOUR_STEPS.length) * 100}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={finish} className="text-[10px] font-montserrat text-text-dim hover:text-foreground px-2 py-1 transition-colors">
                Pular
              </button>
              {hasNextButton && (
                <button
                  onClick={currentStep.type === 'outro' ? finish : goNext}
                  className="px-3.5 py-1.5 rounded-lg text-[11px] font-montserrat font-bold text-background bg-idriel-light hover:bg-idriel-glow transition-all shadow-md shadow-idriel/20"
                >
                  {currentStep.type === 'outro' ? '✨ Começar!' : 'Próximo →'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export { hasDoneTour, TOUR_STORAGE_KEY };
