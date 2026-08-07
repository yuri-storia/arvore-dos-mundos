import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sparkles, Hand, ArrowRight, Compass, ClipboardList, Book, BookOpen, Apple, Star, Trees, Palette, Image as ImageIcon, Leaf, Feather, X, type LucideIcon } from 'lucide-react';
import idrielAvatar from '@/assets/idriel-avatar.webp';
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
    title: 'Vamos criar juntos, na prática',
    desc: 'Sou Idriel, Guardiã desta Árvore. Em vez de só mostrar telas, vamos fazer: você vai nomear seu primeiro mundo e abrir seu primeiro manuscrito comigo ao lado. Nada aqui é definitivo — tudo pode ser renomeado ou apagado depois. Siga os contornos dourados.',
    Icon: Trees,
  },

  // ── PASSO 1: NOMEAR O MUNDO ──
  {
    type: 'highlight',
    target: 'world-name',
    title: '1 · Dê um nome ao seu primeiro mundo',
    desc: 'Clique neste campo e escreva um nome — pode ser provisório, tipo "Meu primeiro mundo". É só um rótulo para a Árvore saber onde guardar suas coisas, e você troca quando quiser clicando no próprio título.',
    Icon: Trees,
    tooltipPos: 'bottom',
    mobileCard: 'bottom',
    delay: 300,
  },
  {
    type: 'highlight',
    target: 'create-world',
    title: '2 · Confirme a criação',
    desc: 'Com o nome escrito, toque em "Criar Mundo". A partir daqui tudo o que você registrar — fichas, capítulos, imagens — fica salvo dentro dele automaticamente. Se o botão não aparecer, é porque seu mundo já existe: siga em frente.',
    Icon: Star,
    tooltipPos: 'bottom',
    mobileCard: 'bottom',
    delay: 300,
  },

  // ── CONSTRUIR ──
  {
    type: 'click',
    target: 'tab-construir',
    tabToActivate: 'construir',
    title: '3 · Construir — a fundação do mundo',
    desc: 'Toque em "Construir". É aqui que o mundo ganha corpo, guiado por onze Frutos: mapa, história, culturas, magia, personagens e mais.',
    Icon: Leaf,
    mobileCard: 'top',
  },
  {
    type: 'highlight',
    target: 'method-selector',
    title: 'Escolha por onde começar',
    desc: '"De Cima para Baixo" parte do panorama (mapa, cosmologia, história). "De Baixo para Cima" nasce dos personagens. Não existe escolha errada — é só a ordem em que os Frutos aparecem, e dá para mudar a qualquer momento.',
    Icon: Compass,
    tooltipPos: 'bottom',
    mobileCard: 'bottom',
    delay: 400,
  },
  {
    type: 'highlight',
    target: 'fruit-grid',
    title: 'Escolha um Fruto no carrossel',
    desc: 'Cada card é um pilar do seu universo — mapa, história, culturas, magia, personagens. Deslize e toque no que te empolga: o Estúdio de Criação abaixo se adapta ao Fruto escolhido.',
    Icon: Apple,
    tooltipPos: 'bottom',
    mobileCard: 'auto',
    delay: 400,
    setFruit: 1,
  },
  {
    type: 'highlight',
    target: 'fruit-tutorial',
    title: 'Tutorial do Fruto — comece por aqui',
    desc: 'Toque nesta barra dourada para me ouvir explicar o Fruto: princípios, estudo de caso e caminhos de criação, em conversa. É gratuito, não consome elixir, e você pode reproduzir de novo ao final do chat.',
    Icon: Leaf,
    tooltipPos: 'bottom',
    mobileCard: 'auto',
    delay: 300,
  },
  {
    type: 'highlight',
    target: 'free-writing',
    title: 'Escreva livremente — sem custo',
    desc: 'Este é o espaço azul de brainstorming: escreva o que já sabe, sem chamar a IA e sem gastar gotas. Depois, com um toque, aquilo vira Ficha, Artigo ou Fato na Linha do Tempo dentro do Codex.',
    Icon: ClipboardList,
    tooltipPos: 'top',
    mobileCard: 'auto',
    delay: 250,
  },
  {
    type: 'highlight',
    target: 'idriel-help',
    title: 'Peça ajuda a Idriel — funções douradas',
    desc: 'Tudo o que estiver em dourado sou eu trabalhando. Use as sugestões ou escreva sua pergunta: respondo com base no seu Codex. Cada consulta custa 1 gota de Elixir e está no plano Idriel.',
    Icon: Sparkles,
    tooltipPos: 'top',
    mobileCard: 'auto',
    delay: 200,
  },

  // ── CODEX ──
  {
    type: 'click',
    target: 'tab-codex',
    tabToActivate: 'codex',
    title: '4 · Codex — sua biblioteca viva',
    desc: 'Toque em "Codex". Tudo o que você salvou nos Frutos já está catalogado aqui.',
    Icon: BookOpen,
    mobileCard: 'top',
  },
  {
    type: 'highlight',
    target: 'codex-new-entry',
    title: 'Crie uma ficha para testar',
    desc: 'Experimente criar uma Ficha (com imagem — boa para personagens, lugares e itens) ou um Artigo (texto livre, para lore e regras). Faça uma qualquer só para ver o formato; excluir depois é um clique. Aqui também nasce a Linha do Tempo e a Análise de Mundo.',
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
    title: '5 · Escrever — a história ganha voz',
    desc: 'Toque em "Escrever" para entrar no espaço da sua narrativa.',
    Icon: Feather,
    mobileCard: 'top',
  },
  {
    type: 'highlight',
    target: 'create-manuscript',
    title: '6 · Crie seu primeiro manuscrito',
    desc: 'Toque aqui e dê um nome ao manuscrito — "Livro 1" já serve. Ele se organiza em Capítulos, como um livro de verdade, e o nome pode ser editado depois. Crie o primeiro capítulo e escreva uma linha só para sentir o editor.',
    Icon: Book,
    tooltipPos: 'right',
    mobileCard: 'auto',
    delay: 400,
  },
  {
    type: 'highlight',
    target: 'write-modes',
    title: 'Recursos do editor',
    desc: 'Corretor ortográfico em português, Ctrl+L para vincular qualquer palavra a uma ficha do Codex, Ctrl+F para localizar trechos, meta diária de palavras e exportação em PDF, Word ou e-book quando terminar.',
    Icon: Feather,
    tooltipPos: 'bottom',
    mobileCard: 'auto',
    delay: 300,
  },

  // ── GALERIA ──
  {
    type: 'click',
    target: 'tab-galeria',
    tabToActivate: 'galeria',
    title: '7 · Galeria — referências visuais',
    desc: 'Toque em "Galeria" para ver o repositório visual do seu mundo.',
    Icon: Palette,
    mobileCard: 'top',
  },
  {
    type: 'highlight',
    target: 'gallery-upload',
    title: 'Guarde suas referências',
    desc: 'Suba concept arts, mapas e paisagens que inspiram o mundo, organizados por pasta. Imagens usadas nas fichas caem aqui sozinhas.',
    Icon: ImageIcon,
    tooltipPos: 'bottom',
    mobileCard: 'auto',
    delay: 400,
  },
  {
    type: 'highlight',
    target: 'visoes-idriel',
    title: 'Visões de Idriel — geração de imagens',
    desc: 'Descreva a cena, escolha estilo e qualidade — Essencial (5 gotas) ou Alta Fidelidade (9 gotas) — e eu materializo a imagem. Disponível no plano Idriel.',
    Icon: Sparkles,
    tooltipPos: 'top',
    mobileCard: 'auto',
    delay: 200,
  },

  // ── OUTRO ──
  {
    type: 'outro',
    title: 'Pronto — a jornada é sua',
    desc: 'Você já tem um mundo nomeado, o Codex aberto e um manuscrito começado. Nada disso é permanente: renomeie, apague, recomece. Quando quiser rever este passo a passo, me chame pelo ícone de ajuda. Que a Árvore ilumine seu caminho.',
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
  } catch {
    // localStorage can be unavailable in private browsing; tour should still finish.
  }
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
  const [placementLocked, setPlacementLocked] = useState<'top' | 'bottom' | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const lastRectRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const scrolledForStepRef = useRef<number>(-1);

  const currentStep = TOUR_STEPS[step];
  const mobileDocked = isMobile && currentStep.type !== 'intro' && currentStep.type !== 'outro';

  // Placement is decided ONCE per step (after target found) and locked, to avoid
  // the modal jumping between top/bottom while the page settles.
  const mobilePlacement: 'top' | 'bottom' = (() => {
    if (!mobileDocked) return 'bottom';
    if (currentStep.mobileCard && currentStep.mobileCard !== 'auto') return currentStep.mobileCard;
    return placementLocked ?? 'bottom';
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

  // Reset per-step state
  useEffect(() => {
    lastRectRef.current = null;
    scrolledForStepRef.current = -1;
    setPlacementLocked(null);
    setTargetRect(null);
  }, [step]);

  // Passive measurement: react to scroll/resize + ResizeObserver on the target.
  // Only updates state when the rect actually changes (>= 1px), so it does NOT
  // trigger a render loop that fights with smooth-scroll.
  useEffect(() => {
    if (!active || delayWaiting) return;
    const s = TOUR_STEPS[step];
    if (!s.target) { setTargetRect(null); return; }

    let raf = 0;
    let cancelled = false;
    let ro: ResizeObserver | null = null;

    const measure = () => {
      if (cancelled) return;
      const el = document.querySelector(`[data-tour="${s.target}"]`) as HTMLElement | null;
      // Elemento pode sumir por 1 frame durante re-renders (carrossel, chat).
      // Mantemos o último retângulo conhecido — nunca voltamos ao centro da tela,
      // que é justamente o "salto"/glitch percebido.
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.width < 1 && r.height < 1) return;
      const prev = lastRectRef.current;
      if (
        !prev ||
        Math.abs(prev.x - r.left) >= 2 ||
        Math.abs(prev.y - r.top) >= 2 ||
        Math.abs(prev.w - r.width) >= 2 ||
        Math.abs(prev.h - r.height) >= 2
      ) {
        lastRectRef.current = { x: r.left, y: r.top, w: r.width, h: r.height };
        setTargetRect(r);
      }
    };

    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };

    // Initial measurement — retry a few frames until element mounts.
    let attempts = 0;
    const initial = () => {
      if (cancelled) return;
      const el = document.querySelector(`[data-tour="${s.target}"]`);
      if (el) {
        measure();
        ro = new ResizeObserver(schedule);
        ro.observe(el);
      } else if (attempts++ < 30) {
        raf = requestAnimationFrame(initial);
      }
    };
    initial();

    // Janela curta de acomodação (scroll suave + layout). Depois disso só
    // reagimos a scroll/resize/resize do alvo — sem MutationObserver global,
    // que disparava a cada caractere digitado pela Idriel e fazia o cartão tremer.
    const settleUntil = performance.now() + 900;
    let settleRaf = 0;
    const settle = () => {
      if (cancelled) return;
      measure();
      if (performance.now() < settleUntil) settleRaf = requestAnimationFrame(settle);
    };
    settleRaf = requestAnimationFrame(settle);

    window.addEventListener('scroll', schedule, { passive: true, capture: true });
    window.addEventListener('resize', schedule);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      cancelAnimationFrame(settleRaf);
      ro?.disconnect();
      mo?.disconnect();
      window.removeEventListener('scroll', schedule, { capture: true } as any);
      window.removeEventListener('resize', schedule);
    };
  }, [active, step, delayWaiting]);

  // Lock the mobile placement the first time we get a valid rect for this step.
  useEffect(() => {
    if (!mobileDocked || placementLocked || !targetRect || typeof window === 'undefined') return;
    if (currentStep.mobileCard && currentStep.mobileCard !== 'auto') {
      setPlacementLocked(currentStep.mobileCard);
      return;
    }
    const estimatedCardH = sheetH || Math.min(window.innerHeight * 0.42, 300);
    const topSpace = targetRect.top;
    const bottomSpace = window.innerHeight - targetRect.bottom - MOBILE_NAV_CLEARANCE;
    let next: 'top' | 'bottom';
    if (bottomSpace >= estimatedCardH + 18) next = 'bottom';
    else if (topSpace >= estimatedCardH + 18) next = 'top';
    else next = targetRect.top < window.innerHeight / 2 ? 'bottom' : 'top';
    setPlacementLocked(next);
  }, [mobileDocked, placementLocked, targetRect, sheetH, currentStep.mobileCard]);

  // Scroll target into view — ONCE per step, after placement is locked.
  useEffect(() => {
    if (!active || delayWaiting || !currentStep.target) return;
    if (scrolledForStepRef.current === step) return;
    if (mobileDocked && !placementLocked) return; // wait for placement decision
    const el = document.querySelector(`[data-tour="${currentStep.target}"]`);
    if (!el) return;
    scrolledForStepRef.current = step;
    if (isMobile) {
      const r = el.getBoundingClientRect();
      const cardH = sheetH || Math.min(window.innerHeight * 0.42, 300);
      const place = mobilePlacement;
      const safeTop = place === 'top' ? cardH + 18 : 72;
      const safeBottom = place === 'bottom'
        ? window.innerHeight - cardH - 18
        : window.innerHeight - MOBILE_NAV_CLEARANCE;
      const safeH = Math.max(80, safeBottom - safeTop);
      const desiredTop = safeTop + Math.max(0, (safeH - r.height) / 2);
      const delta = r.top - desiredTop;
      if (Math.abs(delta) > 4) window.scrollBy({ top: delta, behavior: 'smooth' });
    } else {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [active, step, delayWaiting, currentStep.target, isMobile, sheetH, mobilePlacement, mobileDocked, placementLocked]);

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
