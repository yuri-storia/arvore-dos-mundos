import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, ScrollText, X, MessageCircle, Compass, BookOpen, Feather, ArrowLeft, ChevronRight } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';
import idrielAvatar from '@/assets/idriel-avatar.webp';
import idrielVideo from '@/assets/idriel-animated.mp4.asset.json';
import { WORLDBUILDING_LESSONS, type WorldbuildingLesson } from '@/lib/idriel/worldbuildingLessons';
import { IDRIEL_DIALOGUES, type Dialogue, type DialogueNode } from '@/lib/idriel/dialogues';
import { PlanStatusCard } from '@/components/PlanStatusCard';
import { UpgradeIdrielDialog } from '@/components/UpgradeIdrielDialog';

/* ============================================================
 * Types
 * ============================================================ */

type HubView = 'menu' | 'tour' | 'faq' | 'lessons' | 'lesson-detail' | 'dialogues' | 'dialogue-detail';

interface ChatMessage {
  role: 'user' | 'assistant' | 'greeting';
  content: string;
}

/* ============================================================
 * FAQ (funcionalidades)
 * ============================================================ */

const FAQ: Record<string, { label: string; items: { q: string; a: string }[] }> = {
  construir: {
    label: 'Construir',
    items: [
      { q: 'Como funciona o Estúdio de Criação?', a: 'Escolha um Fruto no carrossel e o Estúdio abaixo se adapta a ele. A barra dourada **Tutorial do Fruto** abre a conversa comigo (princípios, estudo de caso e caminhos de criação) — de graça, sem gastar gotas. O que você escrever fica salvo automaticamente.' },
      { q: 'Como funcionam os 11 Frutos?', a: 'Cada Fruto representa um pilar do worldbuilding (ex.: Cosmogonia, Povos e Culturas, Magia). Navegue por eles no carrossel ou pelo botão **Próximo Fruto**.' },
      { q: 'Onde escrevo sem gastar elixir?', a: 'No bloco azul **Escreva livremente** (brainstorming): texto livre, custo zero, sem chamar a IA. Depois é só salvar como **Ficha**, **Artigo** ou **Fato na Linha do Tempo** no Codex.' },
      { q: 'Como sei o que ativa a Idriel?', a: 'Tudo o que é **dourado** sou eu. No bloco **Peça ajuda a Idriel** os chips mostram o custo (· 1 gota) e a resposta usa o seu Codex como contexto. O azul nunca consome elixir.' },
      { q: 'Qual a diferença entre "Cima pra Baixo" e "Baixo pra Cima"?', a: '**Cima pra Baixo** começa pelo macro (cosmogonia, mapa) e desce até detalhes. **Baixo pra Cima** começa por um detalhe concreto (um personagem, uma cidade) e expande o mundo ao redor. O seletor fica no cabeçalho, ao lado do Elixir.' },
      { q: 'Como gerar um mapa do mundo?', a: 'Apenas no Fruto **Mapa do Mundo**: use **Crie Mapas com Idriel**, escolha entre os 6 estilos cartográficos e confirme o custo em gotas.' },
      { q: 'Posso rever o tutorial de um Fruto?', a: 'Sim. Ao final da conversa há o botão de **reproduzir o tutorial novamente**, e a barra dourada recolhe/expande a qualquer momento.' },

    ],
  },
  codex: {
    label: 'Codex',
    items: [
      { q: 'Qual a diferença entre Ficha e Artigo?', a: '**Fichas** têm imagem, ideais para personagens, locais e criaturas. **Artigos** são wiki, ideais para lore e história.' },
      { q: 'Como vincular qualquer palavra a uma ficha?', a: 'Selecione a palavra no editor e pressione **Ctrl+K** (ou use o botão de link). Escolha a ficha alvo — o texto visível continua o seu; só o vínculo aponta para a entrada canônica.' },
      { q: 'O que é a Análise de Mundo?', a: 'Eu leio todo o seu Codex e devolvo coerência, lacunas e faíscas. Custa **1 gota**.' },
    ],
  },
  escrever: {
    label: 'Escrever',
    items: [
      { q: 'Quais são os modos de escrita?', a: '**Manuscrito** (capítulos), **Mural de Arcos** (kanban visual) e **Escrita Livre** (blocos rápidos).' },
      { q: 'Como mencionar fichas com @?', a: 'Digite **@** e o nome da ficha. Ao passar o mouse sobre uma menção, aparece a prévia; clicar abre no painel lateral de Referências do Codex.' },
      { q: 'Como importar um manuscrito?', a: 'Use **Importar Manuscrito** (.epub/.pdf/.docx/.txt). Idriel pode polir a segmentação em capítulos com sua orientação livre (3 gotas).' },
    ],
  },
  galeria: {
    label: 'Galeria',
    items: [
      { q: 'Como funcionam as pastas?', a: 'A Galeria tem **10 pastas** — uma para cada Fruto — e organiza suas imagens automaticamente.' },
      { q: 'O que são as Visões de Idriel?', a: 'Geração de imagens em 2 níveis: **Essencial (5 gotas)** e **Alta Fidelidade (9 gotas)**. Mapas custam 7 ou 10 gotas.' },
    ],
  },
  geral: {
    label: 'Geral',
    items: [
      { q: 'Quais são os planos?', a: '**Criador (R$ 19,90/mês ou R$ 197,90/ano)** libera worldbuilding, fichas, escrita e exportação em PDF. **Idriel (R$ 39,90/mês ou R$ 397,90/ano)** adiciona todas as IAs, geração de imagens e 150 gotas de Elixir por mês.' },
      { q: 'Como faço upgrade de plano?', a: 'Em **Configurações → Minha conta** ou na página **/planos**, clique em *Fazer upgrade*. O upgrade vale **na hora** e você paga apenas a diferença proporcional aos dias restantes do ciclo atual.' },
      { q: 'E se eu quiser voltar para um plano menor?', a: 'É o **downgrade**: nada é cobrado agora e você mantém todos os recursos do plano atual até o fim do período já pago. A mudança entra em vigor na renovação seguinte — e pode ser desfeita a qualquer momento antes disso.' },
      { q: 'Mudar de mensal para anual vale a pena?', a: 'Sim: o anual equivale a **2 meses grátis**. A troca é feita como upgrade imediato, com crédito proporcional do que você já pagou no mês.' },
      { q: 'O que acontece se eu cancelar?', a: 'Você mantém o acesso completo até o fim do ciclo já pago. Depois disso **nada é apagado**: seus mundos, fichas, artigos e manuscritos continuam salvos em **modo somente leitura**, com exportação em **PDF e Word** liberada para você levar o conteúdo. A exclusão só acontece se você mesmo pedir em Configurações.' },
      { q: 'Posso reativar depois de cancelar?', a: 'Sim. Enquanto o ciclo pago não terminar, aparece o botão **Reativar assinatura** em Minha conta. Depois disso, basta assinar novamente e tudo volta a ficar editável.' },
      { q: 'Como criar múltiplos mundos?', a: 'Com plano ativo, use a barra lateral (desktop) ou o menu **Meus Projetos** (mobile) para criar um novo mundo.' },
    ],
  },
};

const GREETING = 'Aqui, entre folhas, respondo o que sei da plataforma. Toque em uma pergunta ou escolha outra categoria — a Árvore ouve.';

/* ============================================================
 * Component
 * ============================================================ */

interface Props { tab: string; }

const ORB_POS_STORAGE = 'adm_idriel_orb_pos';
const ORB_SIZE_FALLBACK = { w: 180, h: 60 };
const DRAG_THRESHOLD = 5;

export const HelpDrawer: React.FC<Props> = ({ tab }) => {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<HubView>('menu');
  const [activeCategory, setActiveCategory] = useState(tab in FAQ ? tab : 'geral');
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'greeting', content: GREETING }]);
  const [activeLesson, setActiveLesson] = useState<WorldbuildingLesson | null>(null);
  const [activeDialogue, setActiveDialogue] = useState<Dialogue | null>(null);
  const [dialogueNode, setDialogueNode] = useState<DialogueNode | null>(null);
  const [dialogueLog, setDialogueLog] = useState<{ role: 'idriel' | 'user'; text: string }[]>([]);
  const [dragging, setDragging] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const heroVideoRef = useRef<HTMLVideoElement>(null);

  const [orbPos, setOrbPos] = useState<{ x: number; y: number } | null>(() => {
    try {
      const raw = localStorage.getItem(ORB_POS_STORAGE);
      if (!raw) return null;
      const p = JSON.parse(raw);
      if (typeof p?.x === 'number' && typeof p?.y === 'number') return p;
    } catch { /* ignore */ }
    return null;
  });
  const orbRef = useRef<HTMLButtonElement>(null);
  const dragState = useRef<{
    pointerId: number;
    startX: number; startY: number;
    originX: number; originY: number;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    if (open && heroVideoRef.current) heroVideoRef.current.play().catch(() => {});
  }, [open]);

  useEffect(() => {
    try { if (orbPos) localStorage.setItem(ORB_POS_STORAGE, JSON.stringify(orbPos)); } catch { /* ignore */ }
  }, [orbPos]);

  useEffect(() => {
    const onResize = () => {
      setOrbPos(prev => {
        if (!prev) return prev;
        const w = orbRef.current?.offsetWidth ?? ORB_SIZE_FALLBACK.w;
        const h = orbRef.current?.offsetHeight ?? ORB_SIZE_FALLBACK.h;
        return {
          x: Math.max(4, Math.min(prev.x, window.innerWidth - w - 4)),
          y: Math.max(4, Math.min(prev.y, window.innerHeight - h - 4)),
        };
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const rect = orbRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragState.current = {
      pointerId: e.pointerId,
      startX: e.clientX, startY: e.clientY,
      originX: rect.left, originY: rect.top,
      moved: false,
    };
    try { orbRef.current?.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  };
  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const s = dragState.current;
    if (!s || s.pointerId !== e.pointerId) return;
    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;
    if (!s.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    if (!s.moved) setDragging(true);
    s.moved = true;
    const w = orbRef.current?.offsetWidth ?? ORB_SIZE_FALLBACK.w;
    const h = orbRef.current?.offsetHeight ?? ORB_SIZE_FALLBACK.h;
    setOrbPos({
      x: Math.max(4, Math.min(s.originX + dx, window.innerWidth - w - 4)),
      y: Math.max(4, Math.min(s.originY + dy, window.innerHeight - h - 4)),
    });
  };
  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const s = dragState.current;
    if (!s || s.pointerId !== e.pointerId) return;
    const wasDrag = s.moved;
    dragState.current = null;
    setDragging(false);
    try { orbRef.current?.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    if (!wasDrag) { setView('menu'); setOpen(true); }
  };

  const startTour = () => {
    setOpen(false);
    setTimeout(() => window.dispatchEvent(new Event('adm:start-tour')), 220);
  };

  const openLesson = (l: WorldbuildingLesson) => { setActiveLesson(l); setView('lesson-detail'); };
  const openDialogue = (d: Dialogue) => {
    setActiveDialogue(d);
    setDialogueNode(d.opening);
    setDialogueLog([{ role: 'idriel', text: d.opening.idriel }]);
    setView('dialogue-detail');
  };
  const chooseDialogue = (choiceId: string) => {
    if (!dialogueNode) return;
    const choice = dialogueNode.choices.find(c => c.id === choiceId);
    if (!choice) return;
    setDialogueLog(prev => [
      ...prev,
      { role: 'user', text: choice.label },
      { role: 'idriel', text: choice.reply },
    ]);
    if (choice.next) {
      setDialogueLog(prev => [...prev, { role: 'idriel', text: choice.next!.idriel }]);
      setDialogueNode(choice.next);
    } else {
      setDialogueNode(null);
    }
  };

  const goBackToMenu = () => {
    setView('menu');
    setActiveLesson(null);
    setActiveDialogue(null);
    setDialogueNode(null);
    setDialogueLog([]);
  };

  const currentFaq = FAQ[activeCategory] || FAQ.geral;

  return (
    <>
      {/* === Floating Idriel orb === */}
      <button
        ref={orbRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        aria-label="Falar com Idriel (arraste para mover)"
        title="Clique para abrir · arraste para mover"
        className={`group fixed z-[140] flex items-center gap-3 pl-1.5 pr-3 sm:pr-4 py-1.5 rounded-full transition-shadow hover:-translate-y-0.5 active:scale-95 max-w-[calc(100vw-1rem)] touch-none select-none ${dragging ? 'cursor-grabbing' : 'cursor-grab'} ${orbPos ? '' : 'top-14 right-6 sm:right-8'}`}
        style={{
          ...(orbPos ? { left: orbPos.x, top: orbPos.y } : null),
          background: 'linear-gradient(135deg, hsl(var(--bg-deep)) 0%, hsl(var(--card)) 50%, hsl(var(--gold-deep) / 0.68) 100%)',
          border: '1px solid hsl(var(--gold-champagne) / 0.45)',
          boxShadow: '0 8px 18px hsl(var(--background) / 0.62), inset 0 0 18px hsl(var(--gold-warm) / 0.12), inset 0 1px 0 hsl(var(--gold-cream) / 0.18)',
        }}
      >
        <span className="pointer-events-none absolute inset-0 rounded-full opacity-70 group-hover:opacity-100 transition-opacity"
          style={{ background: 'radial-gradient(60% 60% at 30% 30%, hsl(46 90% 70% / 0.18) 0%, transparent 70%)' }} />
        <span className="relative block w-12 h-12 sm:w-13 sm:h-13 rounded-full overflow-hidden shrink-0"
          style={{ boxShadow: '0 0 0 1.5px hsl(46 90% 75% / 0.7), 0 0 22px hsl(40 90% 60% / 0.5)' }}>
          <video src={idrielVideo.url} poster={idrielAvatar} autoPlay muted loop playsInline preload="metadata" className="w-full h-full object-cover" />
        </span>
        <span className="hidden sm:flex flex-col items-start leading-tight pr-1">
          <span className="font-cinzel font-bold text-[13px] tracking-wide bg-gradient-to-r from-[hsl(46_95%_82%)] via-[hsl(42_90%_68%)] to-[hsl(34_80%_52%)] bg-clip-text text-transparent">
            Idriel
          </span>
          <span className="font-montserrat uppercase tracking-[0.22em] text-[8.5px] text-gold-cream/75">
            Ajuda · Guia
          </span>
        </span>
      </button>

      {/* === Drawer === */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="border-l border-gold-bronze/40 p-0 flex flex-col w-full sm:w-[440px] md:w-[480px] lg:w-[520px] sm:max-w-[92vw]"
          onInteractOutside={(event) => {
            const target = event.detail.originalEvent.target;
            if (target instanceof Element && target.closest('[data-upgrade-idriel-dialog="true"]')) {
              event.preventDefault();
            }
          }}
          style={{
            background: 'radial-gradient(120% 60% at 80% 0%, hsl(34 50% 14% / 0.55) 0%, transparent 55%), linear-gradient(180deg, hsl(220 60% 4%) 0%, hsl(220 70% 2.5%) 100%)',
            boxShadow: '-18px 0 60px hsl(220 80% 1% / 0.7)',
          }}
        >
          <button
            onClick={() => setOpen(false)}
            aria-label="Fechar"
            className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full flex items-center justify-center border border-gold-bronze/40 bg-black/30 backdrop-blur hover:bg-gold-deep/30 hover:border-gold-champagne/60 text-gold-cream transition-colors"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>

          {/* Hero */}
          <div className="relative shrink-0 overflow-hidden border-b border-gold-bronze/30"
            style={{ background: 'linear-gradient(180deg, hsl(220 70% 3%) 0%, hsl(220 60% 5%) 100%)' }}>
            <div className="relative w-full h-[180px] sm:h-[210px]">
              <video ref={heroVideoRef} src={idrielVideo.url} poster={idrielAvatar} autoPlay muted loop playsInline preload="metadata" aria-label="Idriel" className="absolute inset-0 w-full h-full object-cover" />
              <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 35%, transparent 45%, hsl(220 80% 2% / 0.78) 100%)' }} />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24" style={{ background: 'linear-gradient(to bottom, transparent 0%, hsl(220 80% 2% / 0.96) 90%)' }} />
              <div className="absolute bottom-3 left-4 right-4">
                <p className="font-montserrat uppercase tracking-[0.28em] text-[9px] text-gold-champagne/80 mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" strokeWidth={2} /> Guardiã da Árvore
                </p>
                <SheetTitle className="font-cinzel font-bold text-[1.4rem] sm:text-[1.55rem] leading-tight bg-gradient-to-r from-[hsl(46_95%_85%)] via-[hsl(42_90%_70%)] to-[hsl(34_80%_55%)] bg-clip-text text-transparent">
                  Idriel
                </SheetTitle>
                <SheetDescription className="font-amiri italic text-[12.5px] text-text-secondary mt-0.5">
                  Guardiã da Árvore dos Mundos — a caneta continua sua
                </SheetDescription>
              </div>
            </div>
          </div>

          {/* Sub-nav quando não estamos no menu */}
          {view !== 'menu' && (
            <div className="shrink-0 flex items-center gap-2 px-4 py-2 border-b border-gold-bronze/25">
              <button
                onClick={() => {
                  if (view === 'lesson-detail') { setActiveLesson(null); setView('lessons'); return; }
                  if (view === 'dialogue-detail') { setActiveDialogue(null); setDialogueNode(null); setDialogueLog([]); setView('dialogues'); return; }
                  goBackToMenu();
                }}
                className="inline-flex items-center gap-1.5 text-[11px] font-montserrat uppercase tracking-wider text-gold-cream/80 hover:text-gold-champagne transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Voltar
              </button>
              <span className="text-[11px] font-cinzel text-text-secondary truncate">
                {view === 'tour' && 'Tour guiado'}
                {view === 'faq' && 'Funcionalidades'}
                {view === 'lessons' && 'Aprenda Worldbuilding'}
                {view === 'lesson-detail' && activeLesson?.title}
                {view === 'dialogues' && 'Conversar com Idriel'}
                {view === 'dialogue-detail' && activeDialogue?.title}
              </span>
            </div>
          )}

          <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
            <div className="p-4 pb-8">
              {view === 'menu' && (
                <HubMenu
                  onTour={startTour}
                  onFaq={() => setView('faq')}
                  onLessons={() => setView('lessons')}
                  onDialogues={() => setView('dialogues')}
                  onUpgradeRequest={() => {
                    setOpen(false);
                    setShowUpgrade(true);
                  }}
                />
              )}

              {view === 'faq' && (
                <FaqView
                  activeCategory={activeCategory}
                  setActiveCategory={(c) => { setActiveCategory(c); setMessages([{ role: 'greeting', content: GREETING }]); }}
                  categories={Object.keys(FAQ)}
                  faq={FAQ}
                  messages={messages}
                  onAsk={(q, a) => setMessages(prev => [...prev, { role: 'user', content: q }, { role: 'assistant', content: a }])}
                />
              )}

              {view === 'lessons' && (
                <LessonsList lessons={WORLDBUILDING_LESSONS} onPick={openLesson} />
              )}

              {view === 'lesson-detail' && activeLesson && (
                <LessonDetail lesson={activeLesson} />
              )}

              {view === 'dialogues' && (
                <DialoguesList dialogues={IDRIEL_DIALOGUES} onPick={openDialogue} />
              )}

              {view === 'dialogue-detail' && activeDialogue && (
                <DialogueRunner
                  log={dialogueLog}
                  node={dialogueNode}
                  onChoose={chooseDialogue}
                  onRestart={() => openDialogue(activeDialogue)}
                />
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
      <UpgradeIdrielDialog open={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </>
  );
};

/* ============================================================
 * Hub menu
 * ============================================================ */

const HubMenu: React.FC<{
  onTour: () => void;
  onFaq: () => void;
  onLessons: () => void;
  onDialogues: () => void;
  onUpgradeRequest: () => void;
}> = ({ onTour, onFaq, onLessons, onDialogues, onUpgradeRequest }) => (
  <div className="space-y-3.5">
    <PlanStatusCard variant="help" onUpgradeRequest={onUpgradeRequest} />
    <p className="font-amiri italic text-[13px] text-text-secondary text-center mb-5">
      Escolha um caminho entre as raízes, viajante.
    </p>
    <HubCard
      icon={<Compass className="w-[18px] h-[18px]" strokeWidth={1.75} />}
      title="Fazer o Tour"
      desc="Uma volta guiada pela plataforma, comigo do lado."
      onClick={onTour}
    />
    <HubCard
      icon={<ScrollText className="w-[18px] h-[18px]" strokeWidth={1.75} />}
      title="Funcionalidades"
      desc="Perguntas frequentes sobre cada aba, gotas e recursos."
      onClick={onFaq}
    />
    <HubCard
      icon={<BookOpen className="w-[18px] h-[18px]" strokeWidth={1.75} />}
      title="Aprenda Worldbuilding"
      desc="Mini-aulas curtas na minha voz — sementes, magia, povos, conflito."
      onClick={onLessons}
    />
    <HubCard
      icon={<Feather className="w-[18px] h-[18px]" strokeWidth={1.75} />}
      title="Conversar com Idriel"
      desc="Diálogos íntimos que revelam a lore da Árvore dos Mundos."
      onClick={onDialogues}
    />
  </div>
);

const HubCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
}> = ({ icon, title, desc, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="group relative w-full text-left flex items-center gap-3.5 p-[1px] rounded-2xl transition-all hover:-translate-y-0.5 active:scale-[0.995] focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-champagne/60"
      style={{
        background: 'linear-gradient(135deg, hsl(46 95% 78% / 0.55) 0%, hsl(38 70% 45% / 0.28) 45%, hsl(34 60% 30% / 0.4) 100%)',
        boxShadow: '0 8px 24px hsl(220 80% 2% / 0.55), 0 0 0 1px hsl(34 40% 12% / 0.4) inset',
      }}
    >
      <span
        className="relative flex items-center gap-3.5 w-full rounded-[15px] px-4 py-3.5 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, hsl(220 65% 5%) 0%, hsl(224 55% 7%) 55%, hsl(30 30% 10%) 100%)',
        }}
      >
        {/* sheen dourado no hover */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: 'radial-gradient(120% 80% at 0% 0%, hsl(46 95% 70% / 0.18) 0%, transparent 55%), radial-gradient(80% 60% at 100% 100%, hsl(34 80% 45% / 0.14) 0%, transparent 60%)',
          }}
        />
        <span
          className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-[#1a0f00] font-cinzel transition-transform group-hover:scale-105"
          style={{
            background: 'linear-gradient(135deg, hsl(46 95% 85%) 0%, hsl(42 90% 68%) 45%, hsl(34 80% 50%) 100%)',
            boxShadow: 'inset 0 1px 0 hsl(46 100% 95% / 0.75), inset 0 -2px 6px hsl(28 60% 22% / 0.5), 0 4px 14px hsl(34 70% 25% / 0.5)',
          }}
        >
          {icon}
        </span>
        <span className="relative flex-1 min-w-0">
          <span className="block font-cinzel font-bold tracking-wide text-[14px] bg-gradient-to-r from-[hsl(46_95%_88%)] via-[hsl(42_90%_75%)] to-[hsl(34_75%_58%)] bg-clip-text text-transparent">
            {title}
          </span>
          <span className="block font-amiri text-[12.5px] text-text-secondary leading-snug mt-0.5">
            {desc}
          </span>
        </span>
        <ChevronRight className="relative w-4 h-4 text-gold-cream/50 group-hover:text-gold-champagne group-hover:translate-x-0.5 transition-all" />
      </span>
    </button>
  );
};

/* ============================================================
 * FAQ view (antigo comportamento)
 * ============================================================ */

const FaqView: React.FC<{
  activeCategory: string;
  setActiveCategory: (c: string) => void;
  categories: string[];
  faq: typeof FAQ;
  messages: ChatMessage[];
  onAsk: (q: string, a: string) => void;
}> = ({ activeCategory, setActiveCategory, categories, faq, messages, onAsk }) => {
  const currentFaq = faq[activeCategory] || faq.geral;
  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
        {categories.map(cat => {
          const active = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`text-[10.5px] font-montserrat font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full whitespace-nowrap transition-all border ${
                active ? 'text-[#1a0f00] border-transparent' : 'bg-transparent border-gold-bronze/25 text-text-secondary hover:border-gold-champagne/50 hover:text-gold-cream'
              }`}
              style={active ? {
                background: 'linear-gradient(135deg, hsl(46 95% 85%) 0%, hsl(42 90% 68%) 45%, hsl(34 80% 50%) 100%)',
                boxShadow: 'inset 0 1px 0 hsl(46 100% 95% / 0.55), 0 6px 16px hsl(34 70% 25% / 0.5)',
              } : undefined}
            >
              {faq[cat].label}
            </button>
          );
        })}
      </div>

      {messages.map((msg, i) => <ChatBubble key={i} message={msg} />)}

      <div className="pt-1 space-y-2.5">
        <p className="text-[10px] font-montserrat font-bold uppercase tracking-[0.22em] text-gold-champagne/70 text-center flex items-center justify-center gap-1.5">
          <ScrollText className="w-3.5 h-3.5" strokeWidth={1.75} />
          Pergaminhos · {currentFaq.label}
        </p>
        <div className="flex flex-col gap-2">
          {currentFaq.items.map((item, i) => (
            <button
              key={i}
              onClick={() => onAsk(item.q, item.a)}
              className="group text-left text-[13.5px] font-amiri px-3.5 py-2.5 rounded-xl border border-gold-bronze/25 hover:border-gold-champagne/55 text-text-secondary hover:text-foreground transition-all flex items-start gap-2.5"
              style={{ background: 'linear-gradient(135deg, hsl(220 60% 6% / 0.85), hsl(34 40% 14% / 0.18))' }}
            >
              <MessageCircle className="w-3.5 h-3.5 mt-1 shrink-0 text-gold-champagne/70 group-hover:text-gold-champagne transition-colors" strokeWidth={1.75} />
              <span className="flex-1">{item.q}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ============================================================
 * Lessons
 * ============================================================ */

const LessonsList: React.FC<{ lessons: WorldbuildingLesson[]; onPick: (l: WorldbuildingLesson) => void }> = ({ lessons, onPick }) => (
  <div className="space-y-2.5">
    <p className="font-amiri italic text-[13px] text-text-secondary text-center mb-2">
      Mini-aulas curtas — leia em silêncio, como quem escuta uma raiz falar.
    </p>
    {lessons.map((l) => (
      <button
        key={l.id}
        onClick={() => onPick(l)}
        className="group w-full text-left p-3.5 rounded-xl border border-gold-bronze/30 hover:border-gold-champagne/55 transition-all hover:-translate-y-0.5"
        style={{ background: 'linear-gradient(135deg, hsl(140 45% 12% / 0.55), hsl(220 60% 5% / 0.85))' }}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="font-cinzel font-bold text-[13.5px] text-foreground">{l.title}</span>
          <span className="text-[10px] font-montserrat uppercase tracking-wider text-gold-champagne/70">{l.minutes} min</span>
        </div>
        <p className="font-amiri text-[12.5px] text-text-secondary leading-snug">{l.summary}</p>
      </button>
    ))}
  </div>
);

const LessonDetail: React.FC<{ lesson: WorldbuildingLesson }> = ({ lesson }) => (
  <article className="space-y-4">
    <header>
      <p className="text-[10px] font-montserrat uppercase tracking-[0.22em] text-gold-champagne/70 mb-1">
        Mini-aula · {lesson.minutes} min
      </p>
      <h3 className="font-cinzel font-bold text-lg text-foreground">{lesson.title}</h3>
    </header>
    <p className="font-amiri text-[14px] leading-relaxed text-foreground italic">{lesson.intro}</p>
    <div className="space-y-3">
      {lesson.sections.map((s, i) => (
        <div key={i} className="rounded-xl border border-gold-bronze/25 p-3.5"
          style={{ background: 'linear-gradient(135deg, hsl(220 60% 6% / 0.85), hsl(34 40% 14% / 0.18))' }}>
          <h4 className="font-cinzel font-semibold text-[13px] text-gold-champagne mb-1.5">{s.heading}</h4>
          <p className="font-amiri text-[13.5px] leading-relaxed text-text-secondary">{s.body}</p>
        </div>
      ))}
    </div>
    <div className="rounded-xl border p-3.5"
      style={{
        background: 'linear-gradient(135deg, hsl(46 95% 78% / 0.14), hsl(34 80% 48% / 0.08))',
        borderColor: 'hsl(46 90% 70% / 0.5)',
      }}>
      <p className="text-[10px] font-montserrat uppercase tracking-[0.22em] text-gold-champagne mb-1.5 flex items-center gap-1.5">
        <Sparkles className="w-3 h-3" /> Faísca de Idriel
      </p>
      <p className="font-amiri text-[14px] leading-relaxed text-foreground italic">{lesson.spark}</p>
    </div>
  </article>
);

/* ============================================================
 * Dialogues (lore)
 * ============================================================ */

const DialoguesList: React.FC<{ dialogues: Dialogue[]; onPick: (d: Dialogue) => void }> = ({ dialogues, onPick }) => (
  <div className="space-y-2.5">
    <p className="font-amiri italic text-[13px] text-text-secondary text-center mb-2">
      Conversas em voz baixa. Escolha um caminho e deixe a lore se revelar.
    </p>
    {dialogues.map((d) => (
      <button
        key={d.id}
        onClick={() => onPick(d)}
        className="group w-full text-left p-3.5 rounded-xl border border-gold-bronze/30 hover:border-gold-champagne/55 transition-all hover:-translate-y-0.5"
        style={{ background: 'linear-gradient(135deg, hsl(210 60% 12% / 0.55), hsl(220 60% 5% / 0.85))' }}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="font-cinzel font-bold text-[13.5px] text-foreground">{d.title}</span>
          <ChevronRight className="w-4 h-4 text-gold-cream/60 group-hover:text-gold-champagne transition-colors" />
        </div>
        <p className="font-amiri italic text-[12.5px] text-text-secondary leading-snug">{d.hook}</p>
      </button>
    ))}
  </div>
);

const DialogueRunner: React.FC<{
  log: { role: 'idriel' | 'user'; text: string }[];
  node: DialogueNode | null;
  onChoose: (id: string) => void;
  onRestart: () => void;
}> = ({ log, node, onChoose, onRestart }) => (
  <div className="space-y-4">
    <div className="space-y-3">
      {log.map((entry, i) => (
        <ChatBubble key={i} message={{ role: entry.role === 'idriel' ? 'assistant' : 'user', content: entry.text }} />
      ))}
    </div>

    {node ? (
      <div className="space-y-2 pt-2">
        <p className="text-[10px] font-montserrat uppercase tracking-[0.22em] text-gold-champagne/70 text-center">
          Escolha uma resposta
        </p>
        {node.choices.map((c) => (
          <button
            key={c.id}
            onClick={() => onChoose(c.id)}
            className="w-full text-left text-[13.5px] font-amiri px-3.5 py-2.5 rounded-xl border border-gold-bronze/30 hover:border-gold-champagne/55 text-text-secondary hover:text-foreground transition-all"
            style={{ background: 'linear-gradient(135deg, hsl(220 60% 6% / 0.85), hsl(34 40% 14% / 0.18))' }}
          >
            {c.label}
          </button>
        ))}
      </div>
    ) : (
      <div className="pt-2 flex justify-center">
        <button
          onClick={onRestart}
          className="text-[11px] font-montserrat uppercase tracking-wider text-gold-champagne/80 hover:text-gold-champagne underline underline-offset-4"
        >
          Recomeçar esta conversa
        </button>
      </div>
    )}
  </div>
);

/* ============================================================
 * Chat bubble (shared)
 * ============================================================ */

const ChatBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end animate-fade-in">
        <div className="rounded-2xl rounded-tr-sm px-3.5 py-2.5 max-w-[85%]"
          style={{
            background: 'linear-gradient(135deg, hsl(34 60% 38% / 0.5), hsl(28 50% 22% / 0.45))',
            border: '1px solid hsl(46 80% 70% / 0.32)',
            boxShadow: '0 4px 14px hsl(220 80% 2% / 0.45)',
          }}>
          <p className="font-amiri text-[13.5px] text-foreground">{message.content}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2.5 animate-fade-in">
      <span className="relative w-9 h-9 rounded-full overflow-hidden shrink-0 mt-0.5"
        style={{ boxShadow: '0 0 0 1.5px hsl(46 90% 75% / 0.55), 0 0 12px hsl(40 90% 60% / 0.35)' }}>
        <video src={idrielVideo.url} poster={idrielAvatar} autoPlay muted loop playsInline preload="metadata" className="w-full h-full object-cover" />
      </span>
      <div className="rounded-2xl rounded-tl-sm px-3.5 py-2.5 max-w-[85%]"
        style={{
          background: 'linear-gradient(135deg, hsl(220 65% 6%), hsl(220 70% 4%))',
          border: '1px solid hsl(34 60% 45% / 0.28)',
          boxShadow: '0 4px 14px hsl(220 80% 2% / 0.55)',
        }}>
        <div className="font-amiri text-[13px] text-foreground leading-relaxed prose prose-invert prose-sm max-w-none [&_p]:text-[13px] [&_p]:leading-[1.55] [&_p]:mb-1.5 [&_p:last-child]:mb-0 [&_strong]:text-gold-champagne">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
};
