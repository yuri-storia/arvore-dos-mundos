import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sparkles, Hand, ArrowRight, Compass, ClipboardList, Book, BookOpen, Apple, Star, Trees, Palette, Image as ImageIcon, Leaf, Feather, X, type LucideIcon } from 'lucide-react';
import idrielAvatar from '@/assets/idriel-avatar.png';
import { useIsMobile } from '@/hooks/use-mobile';
import type { TabType } from '@/lib/data';

/**
 * Premium guided tour by Idriel — gold/grimoire aesthetic.
 *
 * Step types:
 *  - intro/outro: centered card, "Próximo"/"Começar" button
 *  - click:       highlights an element; user must click it to advance
 *  - highlight:   highlights element, shows tooltip + "Próximo" button
 */
export interface TourStep {
  type: 'intro' | 'click' | 'highlight' | 'outro';
  target?: string;
  title: string;
  desc: string;
  Icon: LucideIcon;
  tabToActivate?: TabType;
  tooltipPos?: 'right' | 'bottom' | 'left' | 'top' | 'center';
  mobileCard?: 'top' | 'bottom' | 'auto';
  delay?: number;
  setFruit?: number;
  setMethod?: 'top-down' | 'bottom-up';
}

const TOUR_STEPS: TourStep[] = [
  // ── INTRO ──
  {
    type: 'intro',
    title: 'Bem-vindo(a) à Árvore dos Mundos',
    desc: 'Sou Idriel, guardiã ancestral desta Árvore. Em poucos passos, conduzirei você por cada câmara desta plataforma — para que sua jornada criativa comece em terreno firme. Acompanhe os contornos dourados: é por eles que cada ferramenta se revela.',
    Icon: Trees,
  },

  // ── CONSTRUIR ──
  {
    type: 'click',
    target: 'tab-construir',
    tabToActivate: 'construir',
    title: 'Construir — a fundação do mundo',
    desc: 'Toque em "Construir" para acessar o jardim dos onze Frutos do worldbuilding.',
    Icon: Leaf,
    mobileCard: 'top',
  },
  {
    type: 'highlight',
    target: 'method-selector',
    title: 'Dois caminhos de criação',
    desc: '"De Cima para Baixo" parte do panorama — mapa, cosmologia, história — até alcançar os detalhes. "De Baixo para Cima" nasce dos personagens e expande o mundo conforme a narrativa exige. Trate-os como guias: criadores experientes transitam livremente entre os Frutos.',
    Icon: Compass,
    tooltipPos: 'bottom',
    mobileCard: 'bottom',
    delay: 400,
  },
  {
    type: 'click',
    target: 'method-bottom-up',
    title: 'Experimente "De Baixo para Cima"',
    desc: 'Selecione esta abordagem para observar como a ordem dos Frutos se reorganiza — colocando personagens e enredo antes do panorama geral.',
    Icon: Compass,
    tooltipPos: 'bottom',
    mobileCard: 'bottom',
    delay: 200,
    setMethod: 'bottom-up',
  },
  {
    type: 'highlight',
    target: 'fruit-grid',
    title: 'Os onze Frutos do mundo',
    desc: 'Cada card é um Fruto: um pilar do seu universo — mapa, história, culturas, magia, personagens e mais. O método sugere uma ordem, mas a colheita pode seguir a inspiração do momento.',
    Icon: Apple,
    tooltipPos: 'bottom',
    mobileCard: 'auto',
    delay: 400,
    setFruit: 1,
  },
  {
    type: 'highlight',
    target: 'consult-idriel',
    title: 'Consultar Idriel em cada Fruto',
    desc: 'Dentro de cada Fruto, posso ser consultada sobre aquele pilar específico. Use as sugestões rápidas ou formule sua própria pergunta. Cada consulta consome 1 gota de Elixir e está disponível no plano Idriel.',
    Icon: Leaf,
    tooltipPos: 'top',
    mobileCard: 'auto',
    delay: 200,
  },

  // ── CODEX ──
  {
    type: 'click',
    target: 'tab-codex',
    tabToActivate: 'codex',
    title: 'Codex — sua biblioteca viva',
    desc: 'Toque em "Codex" para acessar a biblioteca onde todo o conhecimento do seu mundo é catalogado.',
    Icon: BookOpen,
    mobileCard: 'top',
  },
  {
    type: 'highlight',
    target: 'codex-new-entry',
    title: 'Fichas, Artigos e Análise de Mundo',
    desc: 'Crie Fichas (com imagem, ideais para personagens, locais e itens) e Artigos (texto livre, para lore e regras). Tudo o que você registra nos Frutos aparece aqui automaticamente. Quando desejar, solicite uma Análise de Mundo — minha avaliação completa sobre o estado da sua criação.',
    Icon: ClipboardList,
    tooltipPos: 'left',
    mobileCard: 'auto',
    delay: 400,
  },

  // ── ESCREVER ──
  {
    type: 'click',
    target: 'tab-escrever',
    tabToActivate: 'escrever',
    title: 'Escrever — a história ganha voz',
    desc: 'Toque em "Escrever" para entrar no espaço dedicado à sua narrativa.',
    Icon: Feather,
    mobileCard: 'top',
  },
  {
    type: 'highlight',
    target: 'create-manuscript',
    title: 'Criar Manuscrito',
    desc: 'Inicie um Manuscrito e organize-o em Capítulos, como em um livro. O editor traz verificador ortográfico nativo em português, atalho Ctrl+L para vincular qualquer palavra ao Codex e Ctrl+F para localizar trechos no texto. Ao concluir, exporte em PDF, Word ou formato e-book.',
    Icon: Book,
    tooltipPos: 'right',
    mobileCard: 'auto',
    delay: 400,
  },

  // ── GALERIA ──
  {
    type: 'click',
    target: 'tab-galeria',
    tabToActivate: 'galeria',
    title: 'Galeria — referências visuais',
    desc: 'Toque em "Galeria" para acessar o repositório visual do seu mundo.',
    Icon: Palette,
    mobileCard: 'top',
  },
  {
    type: 'highlight',
    target: 'gallery-upload',
    title: 'Suas referências',
    desc: 'Reúna concept arts, mapas e paisagens que inspiram seu mundo. Organize por Fruto para encontrar tudo com facilidade quando a criação pedir.',
    Icon: ImageIcon,
    tooltipPos: 'bottom',
    mobileCard: 'auto',
    delay: 400,
  },
  {
    type: 'highlight',
    target: 'visoes-idriel',
    title: 'Visões de Idriel — geração de imagens',
    desc: 'Descreva a cena imaginada, escolha estilo e tom, e materializarei a imagem por meio de IA. Cada visão consome 5 gotas de Elixir e está disponível no plano Idriel.',
    Icon: Sparkles,
    tooltipPos: 'top',
    mobileCard: 'auto',
    delay: 200,
  },

  // ── OUTRO ──
  {
    type: 'outro',
    title: 'A jornada começa',
    desc: 'Você conhece agora cada câmara desta Árvore. Inicie pelo Fruto que mais o chama — não há ordem correta, apenas a sua. Estarei disponível a qualquer momento pelo retrato no canto superior direito da página. Que a Árvore ilumine seu caminho.',
    Icon: Star,
  },
];

const TOUR_STORAGE_KEY = 'adm_interactive_tour_done';
const ONBOARDING_STORAGE_KEY = 'adm_onboarding_seen';
const MOBILE_NAV_CLEARANCE = 84;

function hasDoneTour(): boolean {
  try { return localStorage.getItem(TOUR_STORAGE_KEY) === 'true'; } catch { return false; }
}

function markTourDone() {
  try {
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(['construir', 'codex', 'escrever', 'galeria']));
  } catch {}
}

export { TOUR_STORAGE_KEY, hasDoneTour, markTourDone };

interface Props {
  active: boolean;
  onFinish: () => void;
  setActiveTab: (t: TabType) => void;
  setCurrentFruit?: (id: number) => void;
  setMethod?: (m: 'top-down' | 'bottom-up') => void;
}

export const InteractiveTour: React.FC<Props> = ({ active, onFinish, setActiveTab, setCurrentFruit, setMethod }) => {
  const isMobile = useIsMobile();
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [animating, setAnimating] = useState(false);
  const [delayWaiting, setDelayWaiting] = useState(false);
  const [sheetH, setSheetH] = useState(0);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number>(0);

  const currentStep = TOUR_STEPS[step];
  const mobileDocked = isMobile && currentStep.type !== 'intro' && currentStep.type !== 'outro';
  const mobilePlacement: 'top' | 'bottom' = (() => {
    if (!mobileDocked) return 'bottom';
    if (currentStep.mobileCard && currentStep.mobileCard !== 'auto') return currentStep.mobileCard;
    if (!targetRect || typeof window === 'undefined') return 'bottom';

    const estimatedCardH = sheetH || Math.min(window.innerHeight * 0.42, 300);
    const topSpace = targetRect.top;
    const bottomSpace = window.innerHeight - targetRect.bottom - MOBILE_NAV_CLEARANCE;

    if (bottomSpace >= estimatedCardH + 18) return 'bottom';
    if (topSpace >= estimatedCardH + 18) return 'top';
    return targetRect.top < window.innerHeight / 2 ? 'bottom' : 'top';
  })();

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

  const measureTarget = useCallback(() => {
    if (!active || delayWaiting) return;
    const s = TOUR_STEPS[step];
    if (s.target) {
      const el = document.querySelector(`[data-tour="${s.target}"]`);
      setTargetRect(el ? el.getBoundingClientRect() : null);
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

  // Scroll target into view. On mobile we keep it inside the safe area
  // ABOVE the bottom sheet, so the tooltip can never overlap the highlighted
  // element / button.
  useEffect(() => {
    if (!active || delayWaiting || !currentStep.target) return;
    const el = document.querySelector(`[data-tour="${currentStep.target}"]`);
    if (!el) return;
    if (isMobile) {
      const r = el.getBoundingClientRect();
      const cardH = sheetH || Math.min(window.innerHeight * 0.42, 300);
      const safeTop = mobilePlacement === 'top' ? cardH + 18 : 72;
      const safeBottom = mobilePlacement === 'bottom'
        ? window.innerHeight - cardH - 18
        : window.innerHeight - MOBILE_NAV_CLEARANCE;
      const safeH = Math.max(80, safeBottom - safeTop);
      const desiredTop = safeTop + Math.max(0, (safeH - r.height) / 2);
      const delta = r.top - desiredTop;
      if (Math.abs(delta) > 4) window.scrollBy({ top: delta, behavior: 'smooth' });
    } else {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [active, step, delayWaiting, currentStep.target, isMobile, sheetH, mobilePlacement]);

  // Measure the bottom sheet height on mobile so the scroll math is accurate.
  useEffect(() => {
    if (!isMobile || !sheetRef.current) { setSheetH(0); return; }
    const el = sheetRef.current;
    const ro = new ResizeObserver(() => setSheetH(el.offsetHeight));
    ro.observe(el);
    setSheetH(el.offsetHeight);
    return () => ro.disconnect();
  }, [isMobile, step, delayWaiting]);

  const finish = () => {
    markTourDone();
    setStep(0);
    setActiveTab('construir');
    onFinish();
  };

  const goNext = useCallback(() => {
    if (step >= TOUR_STEPS.length - 1) {
      finish();
      return;
    }
    if (TOUR_STEPS[step].tabToActivate) {
      setActiveTab(TOUR_STEPS[step].tabToActivate!);
    }
    const nextStep = TOUR_STEPS[step + 1];
    if (nextStep.setFruit !== undefined && setCurrentFruit) {
      setCurrentFruit(nextStep.setFruit);
    }
    if (TOUR_STEPS[step].setMethod && setMethod) {
      setMethod(TOUR_STEPS[step].setMethod!);
    }
    setAnimating(true);
    setTimeout(() => {
      setStep(s => s + 1);
      setAnimating(false);
    }, 250);
  }, [step, setActiveTab, setCurrentFruit, setMethod]);

  if (!active || delayWaiting) {
    if (active && delayWaiting) {
      return <div className="fixed inset-0 z-[9998] bg-background/60 pointer-events-auto" />;
    }
    return null;
  }

  const isCenter = currentStep.type === 'intro' || currentStep.type === 'outro';
  const hasNextButton = currentStep.type === 'intro' || currentStep.type === 'outro' || currentStep.type === 'highlight';
  const pad = 10;

  const getTooltipStyle = (): React.CSSProperties => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const isMobileView = vw < 640;
    const margin = isMobileView ? 8 : 16;

    if (isCenter || !targetRect) {
      return { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' };
    }

    if (isMobileView) {
      const spaceBelow = vh - targetRect.bottom - margin;
      const spaceAbove = targetRect.top - margin;
      const top = spaceBelow > 200
        ? targetRect.bottom + margin
        : spaceAbove > 200
          ? Math.max(margin, targetRect.top - 260)
          : Math.max(margin, vh / 2 - 130);
      return { left: margin, right: margin, top: Math.min(top, vh - 280) };
    }

    const pos = currentStep.tooltipPos || 'right';
    const cardW = Math.min(380, vw - margin * 2);
    const cardH = 300;
    const clampLeft = (l: number) => Math.max(margin, Math.min(l, vw - cardW - margin));
    const clampTop = (t: number) => Math.max(margin, Math.min(t, vh - cardH - margin));

    switch (pos) {
      case 'right':  return { left: clampLeft(targetRect.right + 20), top: clampTop(targetRect.top) };
      case 'left':   return { left: clampLeft(targetRect.left - cardW - 20), top: clampTop(targetRect.top) };
      case 'bottom': return { left: clampLeft(targetRect.left), top: clampTop(targetRect.bottom + margin) };
      case 'top':    return { left: clampLeft(targetRect.left), top: clampTop(targetRect.top - cardH - margin) };
      default:       return { left: clampLeft(targetRect.right + margin), top: clampTop(targetRect.top - 20) };
    }
  };

  return (
    <>
      {/* Spotlight overlay */}
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
                  rx="14"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            width="100%" height="100%"
            fill="rgba(2, 7, 13, 0.88)"
            mask="url(#tour-mask)"
            className="pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          />
        </svg>
      </div>

      {/* Pulsing gold border around target */}
      {targetRect && (
        <div
          className="fixed z-[9999] pointer-events-none rounded-xl animate-tour-pulse"
          style={{
            left: targetRect.left - pad,
            top: targetRect.top - pad,
            width: targetRect.width + pad * 2,
            height: targetRect.height + pad * 2,
            border: '2px solid hsl(var(--gold-champagne))',
            boxShadow:
              '0 0 0 1px hsl(var(--gold-warm)/0.5), 0 0 24px hsl(var(--gold-warm)/0.4), 0 0 60px hsl(var(--gold-warm)/0.25)',
          }}
        />
      )}

      {/* Click capture overlay for click-type steps */}
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

      {/* Tooltip / card */}
      {(() => {
        const wrapperClass = mobileDocked
          ? `fixed z-[10001] left-0 right-0 px-3 transition-transform duration-300 ${
              mobilePlacement === 'top'
                ? `top-0 pt-[max(12px,env(safe-area-inset-top))] pb-3 ${animating ? '-translate-y-4 opacity-0' : 'translate-y-0 opacity-100'}`
                : `bottom-0 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] ${animating ? 'translate-y-4 opacity-0' : 'translate-y-0 opacity-100'}`
            }`
          : `fixed z-[10001] transition-all duration-300 ${animating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`;
        const cardClass = mobileDocked
          ? 'relative rounded-2xl p-4 overflow-hidden w-full mx-auto max-w-[560px]'
          : `relative rounded-2xl p-5 sm:p-6 overflow-hidden ${
              isCenter ? 'w-[92vw] max-w-[500px]' : 'w-full sm:w-[380px] max-w-[90vw]'
            }`;
        return (
          <div
            ref={mobileDocked ? sheetRef : undefined}
            className={wrapperClass}
            style={mobileDocked ? undefined : getTooltipStyle()}
          >
            <div
              className={cardClass}
              style={{
                background:
                  'linear-gradient(160deg, rgba(20,14,4,0.97) 0%, rgba(10,8,2,0.98) 55%, rgba(8,5,10,0.97) 100%)',
                border: '1px solid hsl(var(--gold)/0.40)',
                boxShadow: mobileDocked
                  ? mobilePlacement === 'top'
                    ? '0 18px 50px rgba(0,0,0,0.7), 0 0 60px hsl(var(--gold-warm)/0.20), inset 0 1px 0 hsl(var(--gold-champagne)/0.22)'
                    : '0 -18px 50px rgba(0,0,0,0.7), 0 0 60px hsl(var(--gold-warm)/0.20), inset 0 1px 0 hsl(var(--gold-champagne)/0.22)'
                  : '0 30px 80px rgba(0,0,0,0.7), 0 0 80px hsl(var(--gold-warm)/0.18), inset 0 1px 0 hsl(var(--gold-champagne)/0.18)',
              }}
            >
              {/* Mobile grab indicator */}
              {mobileDocked && (
                <div className="flex justify-center -mt-1 mb-2">
                  <span className="block w-10 h-1 rounded-full bg-gold-champagne/40" />
                </div>
              )}

              {/* Top ornamental glow */}
              <span
                className="pointer-events-none absolute inset-0 opacity-70"
                style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 0%, hsl(var(--gold-warm)/0.18) 0%, transparent 70%)' }}
              />

              <div className="relative">
                {/* Header */}
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-full overflow-hidden shrink-0"
                    style={{
                      border: '1.5px solid hsl(var(--gold-champagne)/0.6)',
                      boxShadow: '0 0 0 1px hsl(var(--gold-warm)/0.25), 0 0 18px hsl(var(--gold-warm)/0.35)',
                    }}
                  >
                    <img src={idrielAvatar} alt="Idriel" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-cinzel font-bold text-[13px] bg-gradient-to-r from-gold-warm via-gold-champagne to-gold-cream bg-clip-text text-transparent block leading-tight">
                      Idriel
                    </span>
                    <span className="font-montserrat text-[8px] text-gold-champagne/70 uppercase tracking-[0.22em]">
                      Guardiã da Árvore
                    </span>
                  </div>
                  <span
                    className="text-[9px] font-montserrat font-bold text-gold-light/70 uppercase tracking-wider shrink-0 px-2 py-0.5 rounded-full"
                    style={{ background: 'hsl(var(--gold-warm)/0.08)', border: '1px solid hsl(var(--gold-warm)/0.18)' }}
                  >
                    {step + 1}/{TOUR_STEPS.length}
                  </span>
                  {mobileDocked && (
                    <button
                      onClick={finish}
                      aria-label="Fechar tour"
                      className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center border border-gold/25 bg-black/40 text-gold-champagne/80 active:scale-95"
                    >
                      <X className="w-4 h-4" strokeWidth={2} />
                    </button>
                  )}
                </div>

                {/* Content */}
                <div className="flex items-start gap-2.5 mb-4">
                  <currentStep.Icon className="w-5 h-5 shrink-0 text-gold-champagne mt-0.5" strokeWidth={1.5} />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-cinzel font-bold text-[15px] text-foreground mb-1.5 leading-tight">
                      {currentStep.title}
                    </h4>
                    <p className={`font-merriweather italic text-text-secondary leading-relaxed ${mobileDocked ? 'text-[12px] max-h-[28vh] overflow-y-auto pr-1' : 'text-[12.5px]'}`}>
                      {currentStep.desc}
                    </p>
                  </div>
                </div>

                {/* Click instruction */}
                {currentStep.type === 'click' && (
                  <div
                    className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg"
                    style={{
                      background: 'linear-gradient(135deg, hsl(var(--gold-warm)/0.15) 0%, hsl(var(--gold-deep)/0.08) 100%)',
                      border: '1px solid hsl(var(--gold)/0.30)',
                    }}
                  >
                    <Hand className="w-4 h-4 text-gold-champagne animate-bounce shrink-0" strokeWidth={2} />
                    <span className="font-montserrat text-[11px] text-gold-light font-bold tracking-wide">
                      Toque no destaque dourado para continuar
                    </span>
                  </div>
                )}

                {/* Progress + actions */}
                <div className={`flex items-center justify-between pt-3 border-t border-gold/15 ${mobileDocked ? 'gap-3' : ''}`}>
                  <div className="flex-1 mr-3">
                    <div className="h-[3px] bg-gold/10 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${((step + 1) / TOUR_STEPS.length) * 100}%`,
                          background:
                            'linear-gradient(90deg, hsl(var(--gold-deep)) 0%, hsl(var(--gold-warm)) 50%, hsl(var(--gold-champagne)) 100%)',
                          boxShadow: '0 0 10px hsl(var(--gold-warm)/0.6)',
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!mobileDocked && (
                      <button
                        onClick={finish}
                        className="text-[10px] font-montserrat text-text-dim hover:text-gold-champagne px-2 py-1 transition-colors uppercase tracking-wider"
                      >
                        Pular
                      </button>
                    )}
                    {hasNextButton && (
                      <button
                        onClick={currentStep.type === 'outro' ? finish : goNext}
                        className={`rounded-lg font-montserrat font-bold uppercase tracking-wider text-[#1a0f00] transition-all active:scale-95 ${
                          mobileDocked ? 'px-5 py-2.5 text-[12px] min-h-[44px]' : 'px-4 py-1.5 text-[11px]'
                        }`}
                        style={{
                          background:
                            'linear-gradient(135deg, hsl(var(--gold-deep)) 0%, hsl(var(--gold-warm)) 50%, hsl(var(--gold)) 100%)',
                          boxShadow:
                            '0 4px 14px hsl(var(--gold-warm)/0.4), inset 0 1px 0 hsl(var(--gold-cream)/0.35)',
                        }}
                      >
                        {currentStep.type === 'outro' ? (
                          <><Sparkles className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />Começar</>
                        ) : (
                          <>Próximo <ArrowRight className="inline-block w-3.5 h-3.5 ml-1 align-[-0.15em]" strokeWidth={2} /></>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
};
