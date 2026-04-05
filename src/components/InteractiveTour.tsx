import React, { useState, useEffect, useCallback, useRef } from 'react';
import idrielAvatar from '@/assets/idriel-avatar.png';
import type { TabType } from '@/lib/data';

export interface TourStep {
  type: 'intro' | 'click' | 'outro';
  target?: string; // data-tour attribute value
  title: string;
  desc: string;
  icon: string;
  tabToActivate?: TabType;
}

const TOUR_STEPS: TourStep[] = [
  {
    type: 'intro',
    title: 'Bem-vinda à Árvore dos Mundos!',
    desc: 'Eu sou Idriel, sua guardiã ancestral. Vou te guiar pelos galhos desta árvore mágica. Cada aba é uma ferramenta poderosa para dar vida ao seu mundo. Vamos conhecê-las juntas?',
    icon: '🌳',
  },
  {
    type: 'click',
    target: 'tab-construir',
    tabToActivate: 'construir',
    title: 'Construir — Os 11 Frutos',
    desc: 'Aqui você cultiva os 11 Frutos do seu mundo: geografia, culturas, magia, religiões e muito mais. Cada Fruto tem campos guiados e minha ajuda criativa. Clique para conhecer!',
    icon: '🌿',
  },
  {
    type: 'click',
    target: 'tab-codex',
    tabToActivate: 'codex',
    title: 'Codex — Sua Enciclopédia',
    desc: 'O Codex organiza tudo que você criou: fichas de personagens, locais, itens e artigos de lore. Posso até analisar seu mundo e sugerir melhorias! Clique para explorar!',
    icon: '📖',
  },
  {
    type: 'click',
    target: 'tab-escrever',
    tabToActivate: 'escrever',
    title: 'Escrever — Sua História',
    desc: 'Escolha entre Manuscrito (capítulos e cenas), Mural de Cenas (organize por status) ou Rascunhos (escrita livre). Tudo com referências do Codex integradas! Clique para ver!',
    icon: '✍️',
  },
  {
    type: 'click',
    target: 'tab-galeria',
    tabToActivate: 'galeria',
    title: 'Galeria — Visões do Mundo',
    desc: 'Salve referências visuais e gere imagens com IA usando as Visões de Idriel. Cada visão custa 5 gotas de Seiva Dourada. Clique para descobrir!',
    icon: '🎨',
  },
  {
    type: 'outro',
    title: 'Pronta para criar!',
    desc: 'Agora você conhece todas as ferramentas. Comece pelo Fruto que mais te inspira — não existe ordem certa. E lembre-se: estou sempre aqui para ajudar. Clique no botão "?" dourado quando precisar. Boa jornada, criadora de mundos! ✨',
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
    // Also mark all tab tips as seen since tour covers them
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(['construir', 'codex', 'escrever', 'galeria']));
  } catch {}
}

interface Props {
  active: boolean;
  onFinish: () => void;
  setActiveTab: (t: TabType) => void;
}

export const InteractiveTour: React.FC<Props> = ({ active, onFinish, setActiveTab }) => {
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [animating, setAnimating] = useState(false);
  const rafRef = useRef<number>(0);

  const currentStep = TOUR_STEPS[step];

  // Measure target element position
  const measureTarget = useCallback(() => {
    if (!active) return;
    const s = TOUR_STEPS[step];
    if (s.target) {
      const el = document.querySelector(`[data-tour="${s.target}"]`);
      if (el) {
        setTargetRect(el.getBoundingClientRect());
      }
    } else {
      setTargetRect(null);
    }
    rafRef.current = requestAnimationFrame(measureTarget);
  }, [active, step]);

  useEffect(() => {
    if (active) {
      rafRef.current = requestAnimationFrame(measureTarget);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, measureTarget]);

  // For click steps, elevate the target element above overlay
  useEffect(() => {
    if (!active || currentStep.type !== 'click' || !currentStep.target) return;
    const el = document.querySelector(`[data-tour="${currentStep.target}"]`) as HTMLElement | null;
    if (el) {
      el.style.position = 'relative';
      el.style.zIndex = '10000';
    }
    return () => {
      if (el) {
        el.style.position = '';
        el.style.zIndex = '';
      }
    };
  }, [active, step, currentStep]);

  // Listen for clicks on target elements
  useEffect(() => {
    if (!active || currentStep.type !== 'click' || !currentStep.target) return;
    const handler = (e: MouseEvent) => {
      const target = document.querySelector(`[data-tour="${currentStep.target}"]`);
      if (target && (target === e.target || target.contains(e.target as Node))) {
        if (currentStep.tabToActivate) {
          setActiveTab(currentStep.tabToActivate);
        }
        goNext();
      }
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [active, step, currentStep]);

  const goNext = () => {
    if (step >= TOUR_STEPS.length - 1) {
      finish();
      return;
    }
    setAnimating(true);
    setTimeout(() => {
      setStep(s => s + 1);
      setAnimating(false);
    }, 250);
  };

  const finish = () => {
    markTourDone();
    setStep(0);
    onFinish();
  };

  if (!active) return null;

  const isCenter = currentStep.type === 'intro' || currentStep.type === 'outro';
  const pad = 8;

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


      {/* Tooltip / Card */}
      <div
        className={`fixed z-[10001] transition-all duration-300 ${animating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
        style={
          isCenter
            ? { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }
            : targetRect
              ? {
                  left: Math.min(targetRect.right + 16, window.innerWidth - 420),
                  top: Math.max(targetRect.top - 20, 16),
                }
              : { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }
        }
      >
        <div className={`card-glass-idriel rounded-2xl p-6 shadow-2xl border border-idriel/20 ${isCenter ? 'w-[92vw] max-w-[480px]' : 'w-[380px] max-w-[90vw]'}`}>
          {/* Avatar + header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative shrink-0">
              <img src={idrielAvatar} alt="Idriel" className="w-12 h-12 rounded-full object-cover border-2 border-idriel/50 animate-idriel-pulse" />
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-idriel flex items-center justify-center text-[8px]">✨</div>
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-cinzel font-bold text-sm text-idriel-light block">Idriel</span>
              <span className="font-montserrat text-[9px] text-text-secondary uppercase tracking-widest">Guardiã da Árvore</span>
            </div>
            <span className="text-[10px] font-montserrat text-idriel/50 uppercase tracking-wider shrink-0">
              {step + 1}/{TOUR_STEPS.length}
            </span>
          </div>

          {/* Content */}
          <div className="flex items-start gap-3 mb-5">
            <span className="text-2xl shrink-0">{currentStep.icon}</span>
            <div className="flex-1 min-w-0">
              <h4 className="font-montserrat font-bold text-sm text-foreground mb-1.5">{currentStep.title}</h4>
              <p className="font-merriweather italic text-[13px] text-text-secondary leading-relaxed">{currentStep.desc}</p>
            </div>
          </div>

          {/* Instruction for click steps */}
          {currentStep.type === 'click' && (
            <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-idriel/[0.08] border border-idriel/15">
              <span className="text-lg animate-bounce">👆</span>
              <span className="font-montserrat text-xs text-idriel-light font-bold">
                Clique no botão pulsando para continuar
              </span>
            </div>
          )}

          {/* Progress + actions */}
          <div className="flex items-center justify-between pt-3 border-t border-idriel/15">
            <div className="flex gap-2">
              {TOUR_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    i === step ? 'bg-idriel-light scale-125 shadow-[0_0_8px_hsl(var(--idriel-glow)/0.6)]'
                      : i < step ? 'bg-idriel/50' : 'bg-idriel/15'
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={finish} className="text-[11px] font-montserrat text-text-dim hover:text-foreground px-2 py-1 transition-colors">
                Pular tour
              </button>
              {(currentStep.type === 'intro' || currentStep.type === 'outro') && (
                <button
                  onClick={currentStep.type === 'outro' ? finish : goNext}
                  className="px-4 py-2 rounded-lg text-xs font-montserrat font-bold text-background bg-idriel-light hover:bg-idriel-glow transition-all shadow-md shadow-idriel/20"
                >
                  {currentStep.type === 'outro' ? '✨ Começar a criar!' : 'Vamos lá! →'}
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
