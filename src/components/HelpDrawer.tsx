import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, ScrollText, X, MessageCircle } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';
import idrielAvatar from '@/assets/idriel-avatar.png';
import idrielVideo from '@/assets/idriel-animated.mp4.asset.json';

interface ChatMessage {
  role: 'user' | 'assistant' | 'greeting';
  content: string;
}

const FAQ: Record<string, { label: string; items: { q: string; a: string }[] }> = {
  construir: {
    label: 'Construir',
    items: [
      { q: 'Como funcionam os 11 Frutos?', a: 'Cada Fruto representa um pilar do worldbuilding (ex.: Cosmogonia, Povos e Culturas, Magia). Basta clicar em um Fruto na lista lateral e preencher os campos. Tudo salva automaticamente a cada 2 segundos.' },
      { q: 'Qual a diferença entre "Cima pra Baixo" e "Baixo pra Cima"?', a: '**Cima pra Baixo** começa pelo macro (cosmogonia, mapa) e desce até detalhes (personagens, conflitos). **Baixo pra Cima** começa por um detalhe concreto (um personagem, uma cidade) e expande o mundo ao redor dele. Escolha a que fizer mais sentido para você — é possível trocar a qualquer momento.' },
      { q: 'Como gerar um mapa do mundo?', a: 'No Fruto "Mapa do Mundo", clique em **Gerar Mapa**. Escolha um dos 6 estilos (Político, Geográfico, Náutico, Explorador, Cidade ou Personalizado), descreva seu mundo e confirme. Custa **5 gotas de Elixir dos Mundos**. Requer plano Idriel.' },
      { q: 'O que é o Elixir dos Mundos?', a: 'É a **poção que Idriel destila** a partir da **Seiva Lendária da Árvore dos Mundos** — a essência que alimenta toda a magia criativa da plataforma. Cada gota libera um poder: **texto (1 gota)**, **imagem (5 gotas)**, **análise de mundo (2 gotas)**. O plano Idriel garante **100 gotas renovadas por mês**.' },
      { q: 'O que é "Consultar Idriel"?', a: 'É um chat de IA disponível dentro de cada Fruto (exceto Mapa do Mundo) que responde perguntas criativas sobre aquele pilar. Cada consulta custa **1 gota de Elixir dos Mundos**. Disponível apenas no plano Idriel.' },
      { q: 'Como funciona o salvamento automático?', a: 'Tudo o que você escreve nos campos dos Frutos é salvo automaticamente a cada 2 segundos. Não é necessário clicar em nenhum botão de salvar.' },
    ],
  },
  codex: {
    label: 'Codex',
    items: [
      { q: 'Qual a diferença entre Ficha e Artigo?', a: '**Fichas** são entradas visuais com imagem, ideais para personagens, locais e criaturas. **Artigos** são textos em estilo wiki, ideais para lore, história e regras do mundo.' },
      { q: 'Como filtrar entradas por Fruto?', a: 'No topo do Codex, use o filtro por Fruto para mostrar apenas as entradas relacionadas a um pilar específico (ex.: Povos, Magia, Fauna).' },
      { q: 'Como exportar meu Codex em PDF?', a: 'Clique no botão de exportação dentro de cada entrada do Codex para gerar um PDF individual. Disponível nos planos Raiz e Idriel.' },
      { q: 'O que é a Análise de Mundo?', a: 'A Análise de Mundo usa IA para avaliar todo o seu Codex e dar feedback sobre coerência, lacunas e sugestões de melhoria. Custa **2 gotas de Elixir dos Mundos**. Disponível apenas no plano Idriel.' },
      { q: 'Posso adicionar imagem nas fichas?', a: 'Sim! Ao criar ou editar uma Ficha, há um campo de upload de imagem. Você pode usar imagens suas ou geradas pelas Visões de Idriel.' },
    ],
  },
  escrever: {
    label: 'Escrever',
    items: [
      { q: 'Quais são os modos de escrita?', a: 'São três: **Manuscrito** (capítulos e cenas organizados hierarquicamente), **Quadro** (Kanban visual com colunas personalizáveis) e **Livre** (blocos de texto independentes para rascunhos rápidos).' },
      { q: 'Como usar o Timer Pomodoro?', a: 'Clique no ícone de relógio na aba Escrever. Você pode configurar tempo de foco e pausa. O timer ajuda a manter sessões de escrita produtivas.' },
      { q: 'Como mencionar fichas do Codex com @?', a: 'Enquanto escreve no Manuscrito ou Escrita Livre, digite **@** seguido do nome da ficha. Uma lista de sugestões aparecerá para você selecionar a referência.' },
      { q: 'Como funciona o Manuscrito?', a: 'No modo Manuscrito, você cria **capítulos** e dentro deles adiciona **cenas**. As cenas podem ser reordenadas arrastando e têm status (rascunho, revisão, pronto).' },
      { q: 'O que é o Mural de Cenas?', a: 'É o modo **Quadro** (Kanban) onde você organiza cenas visualmente em colunas. Útil para planejar a estrutura do enredo e acompanhar o progresso.' },
    ],
  },
  galeria: {
    label: 'Galeria',
    items: [
      { q: 'Como fazer upload de imagens?', a: 'Na aba Galeria, clique em **Adicionar Imagem** e selecione o arquivo do seu computador. A imagem será salva no seu mundo.' },
      { q: 'Como organizar imagens por Fruto?', a: 'Ao fazer upload, você pode atribuir uma categoria (ligada a um Fruto) para filtrar suas imagens depois.' },
      { q: 'O que são as Visões de Idriel?', a: 'É a funcionalidade de **geração de imagens com IA**. Você descreve o que quer, escolhe estilo e tom, e a IA cria a imagem. Cada imagem custa **5 gotas de Elixir dos Mundos**. Disponível apenas no plano Idriel.' },
      { q: 'Quanto custa gerar uma imagem?', a: 'Cada imagem gerada pelas Visões de Idriel custa **5 gotas de Elixir dos Mundos**. No plano Idriel você tem 100 gotas por mês.' },
    ],
  },
  geral: {
    label: 'Geral',
    items: [
      { q: 'Como posso ter acesso à geração de imagens e análise do mundo?', a: 'Essas funcionalidades estão disponíveis exclusivamente no **plano Idriel** (R$ 39,90/mês ou R$ 397/ano). Para fazer upgrade:\n\n1. Clique no seu avatar no canto superior direito\n2. Vá em **Configurações** ou clique no banner de upgrade\n3. Escolha o plano Idriel\n\nCom o plano Idriel você recebe **100 gotas de Elixir dos Mundos por mês** para usar em geração de imagens (5 gotas), consultas de IA (1 gota) e análise de mundo (2 gotas).' },
      { q: 'Quais são os planos disponíveis?', a: '**Raiz (R$ 19,90/mês ou R$ 197/ano):** Mundos, fichas e artigos ilimitados. Manuscrito, Mural de Arcos e Exportação em PDF/Word/Kindle. Sem IA.\n\n**Idriel (R$ 39,90/mês ou R$ 397/ano):** Tudo do Raiz + Idriel (IA texto e imagens), mapas IA, análise de mundo e 100 gotas de Elixir dos Mundos por mês.\n\nNos planos anuais você ganha 2 meses grátis.' },
      { q: 'Como criar múltiplos mundos?', a: 'Você precisa de um plano pago (Raiz ou Idriel). Com o plano ativo, use a barra lateral para criar novos mundos clicando em **+ Novo Mundo**.' },
    ],
  },
};

const GREETING = 'Sou Idriel, élfica imortal e guardiã da Árvore dos Mundos. Escolha um tema abaixo ou toque em uma pergunta para que eu a responda, viajante.';

interface Props { tab: string; }

export const HelpDrawer: React.FC<Props> = ({ tab }) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeCategory, setActiveCategory] = useState(tab);
  const scrollRef = useRef<HTMLDivElement>(null);
  const heroVideoRef = useRef<HTMLVideoElement>(null);

  const categories = Object.keys(FAQ);

  useEffect(() => {
    setMessages([{ role: 'greeting', content: GREETING }]);
    setActiveCategory(tab in FAQ ? tab : 'geral');
  }, [tab]);

  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (el) (el as HTMLElement).scrollTop = (el as HTMLElement).scrollHeight;
    }
  }, [messages]);

  // Try to autoplay hero video when drawer opens
  useEffect(() => {
    if (open && heroVideoRef.current) {
      heroVideoRef.current.play().catch(() => {});
    }
  }, [open]);

  const handleAsk = (q: string, a: string) => {
    setMessages(prev => [...prev, { role: 'user', content: q }, { role: 'assistant', content: a }]);
  };

  const currentFaq = FAQ[activeCategory] || FAQ.geral;

  return (
    <>
      {/* === Floating Idriel orb (premium) === */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Falar com Idriel"
        className="group fixed top-14 right-6 sm:right-8 z-[140] flex items-center gap-3 pl-1.5 pr-3 sm:pr-4 py-1.5 rounded-full transition-all hover:-translate-y-0.5 active:scale-95 max-w-[calc(100vw-4rem)]"
        style={{
          background:
            'linear-gradient(135deg, hsl(var(--bg-deep)) 0%, hsl(var(--card)) 50%, hsl(var(--gold-deep) / 0.68) 100%)',
          border: '1px solid hsl(var(--gold-champagne) / 0.45)',
          boxShadow:
            '0 8px 18px hsl(var(--background) / 0.62), inset 0 0 18px hsl(var(--gold-warm) / 0.12), inset 0 1px 0 hsl(var(--gold-cream) / 0.18)',
        }}
      >
        {/* Halo */}
        <span
          className="pointer-events-none absolute inset-0 rounded-full opacity-70 group-hover:opacity-100 transition-opacity"
          style={{
            background:
              'radial-gradient(60% 60% at 30% 30%, hsl(46 90% 70% / 0.18) 0%, transparent 70%)',
          }}
        />
        {/* Live avatar */}
        <span
          className="relative block w-12 h-12 sm:w-13 sm:h-13 rounded-full overflow-hidden shrink-0"
          style={{
            boxShadow:
              '0 0 0 1.5px hsl(46 90% 75% / 0.7), 0 0 22px hsl(40 90% 60% / 0.5)',
          }}
        >
          <video
            src={idrielVideo.url}
            poster={idrielAvatar}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            className="w-full h-full object-cover"
          />
          {/* Sheen */}
          <span
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse at 30% 25%, hsl(46 100% 90% / 0.25) 0%, transparent 55%)',
            }}
          />
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

      {/* === Premium Drawer === */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="border-l border-gold-bronze/40 p-0 flex flex-col w-full sm:w-[440px] md:w-[480px] lg:w-[520px] sm:max-w-[92vw]"
          style={{
            background:
              'radial-gradient(120% 60% at 80% 0%, hsl(34 50% 14% / 0.55) 0%, transparent 55%), linear-gradient(180deg, hsl(220 60% 4%) 0%, hsl(220 70% 2.5%) 100%)',
            boxShadow: '-18px 0 60px hsl(220 80% 1% / 0.7)',
          }}
        >
          {/* Close button (custom premium) */}
          <button
            onClick={() => setOpen(false)}
            aria-label="Fechar"
            className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full flex items-center justify-center border border-gold-bronze/40 bg-black/30 backdrop-blur hover:bg-gold-deep/30 hover:border-gold-champagne/60 text-gold-cream transition-colors"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>

          {/* === HERO: Idriel video, responsive height === */}
          <div
            className="relative shrink-0 overflow-hidden border-b border-gold-bronze/30"
            style={{
              background:
                'linear-gradient(180deg, hsl(220 70% 3%) 0%, hsl(220 60% 5%) 100%)',
            }}
          >
            <div className="relative w-full h-[200px] sm:h-[230px] md:h-[250px]">
              <video
                ref={heroVideoRef}
                src={idrielVideo.url}
                poster={idrielAvatar}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                aria-label="Idriel, anfitriã élfica"
                className="absolute inset-0 w-full h-full object-cover"
              />
              {/* Vignette + bottom gradient */}
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    'radial-gradient(ellipse at 50% 35%, transparent 45%, hsl(220 80% 2% / 0.75) 100%)',
                }}
              />
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-28"
                style={{
                  background:
                    'linear-gradient(to bottom, transparent 0%, hsl(220 80% 2% / 0.96) 90%)',
                }}
              />
              {/* Gold rim glow */}
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  boxShadow:
                    'inset 0 0 80px hsl(40 70% 30% / 0.25), inset 0 -1px 0 hsl(46 80% 65% / 0.35)',
                }}
              />

              {/* Title overlay */}
              <div className="absolute bottom-3 left-4 right-4">
                <p className="font-montserrat uppercase tracking-[0.28em] text-[9px] text-gold-champagne/80 mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" strokeWidth={2} />
                  Anfitriã da Árvore
                </p>
                <SheetTitle className="font-cinzel font-bold text-[1.4rem] sm:text-[1.55rem] leading-tight bg-gradient-to-r from-[hsl(46_95%_85%)] via-[hsl(42_90%_70%)] to-[hsl(34_80%_55%)] bg-clip-text text-transparent">
                  Idriel
                </SheetTitle>
                <SheetDescription className="font-amiri italic text-[12.5px] text-text-secondary mt-0.5">
                  Sua guia élfica entre os Frutos
                </SheetDescription>
              </div>
            </div>
          </div>

          {/* === Category chips === */}
          <div className="shrink-0 border-b border-gold-bronze/25 px-3 py-2.5 flex gap-1.5 overflow-x-auto scrollbar-none">
            {categories.map(cat => {
              const active = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => {
                    setActiveCategory(cat);
                    setMessages([{ role: 'greeting', content: GREETING }]);
                  }}
                  className={`text-[10.5px] font-montserrat font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full whitespace-nowrap transition-all border ${
                    active
                      ? 'text-[#1a0f00] border-transparent'
                      : 'bg-transparent border-gold-bronze/25 text-text-secondary hover:border-gold-champagne/50 hover:text-gold-cream'
                  }`}
                  style={
                    active
                      ? {
                          background:
                            'linear-gradient(135deg, hsl(46 95% 85%) 0%, hsl(42 90% 68%) 45%, hsl(34 80% 50%) 100%)',
                          boxShadow:
                            'inset 0 1px 0 hsl(46 100% 95% / 0.55), 0 6px 16px hsl(34 70% 25% / 0.5)',
                        }
                      : undefined
                  }
                >
                  {FAQ[cat].label}
                </button>
              );
            })}
          </div>

          {/* === Chat / FAQ list === */}
          <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
            <div className="p-4 space-y-3">
              {messages.map((msg, i) => (
                <ChatBubble key={i} message={msg} />
              ))}

              <div className="pt-2 space-y-2.5">
                <p className="text-[10px] font-montserrat font-bold uppercase tracking-[0.22em] text-gold-champagne/70 text-center flex items-center justify-center gap-1.5">
                  <ScrollText className="w-3.5 h-3.5" strokeWidth={1.75} />
                  Pergaminhos · {currentFaq.label}
                </p>
                <div className="flex flex-col gap-2">
                  {currentFaq.items.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => handleAsk(item.q, item.a)}
                      className="group text-left text-[13.5px] font-amiri px-3.5 py-2.5 rounded-xl border border-gold-bronze/25 hover:border-gold-champagne/55 text-text-secondary hover:text-foreground transition-all flex items-start gap-2.5"
                      style={{
                        background:
                          'linear-gradient(135deg, hsl(220 60% 6% / 0.85), hsl(34 40% 14% / 0.18))',
                      }}
                    >
                      <MessageCircle
                        className="w-3.5 h-3.5 mt-1 shrink-0 text-gold-champagne/70 group-hover:text-gold-champagne transition-colors"
                        strokeWidth={1.75}
                      />
                      <span className="flex-1">{item.q}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
};

const ChatBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end animate-fade-in">
        <div
          className="rounded-2xl rounded-tr-sm px-3.5 py-2.5 max-w-[85%]"
          style={{
            background:
              'linear-gradient(135deg, hsl(34 60% 38% / 0.5), hsl(28 50% 22% / 0.45))',
            border: '1px solid hsl(46 80% 70% / 0.32)',
            boxShadow: '0 4px 14px hsl(220 80% 2% / 0.45)',
          }}
        >
          <p className="font-amiri text-[13.5px] text-foreground">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5 animate-fade-in">
      <span
        className="relative w-9 h-9 rounded-full overflow-hidden shrink-0 mt-0.5"
        style={{
          boxShadow:
            '0 0 0 1.5px hsl(46 90% 75% / 0.55), 0 0 12px hsl(40 90% 60% / 0.35)',
        }}
      >
        <video
          src={idrielVideo.url}
          poster={idrielAvatar}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="w-full h-full object-cover"
        />
      </span>
      <div
        className="rounded-2xl rounded-tl-sm px-3.5 py-2.5 max-w-[85%]"
        style={{
          background:
            'linear-gradient(135deg, hsl(220 65% 6%), hsl(220 70% 4%))',
          border: '1px solid hsl(34 60% 45% / 0.28)',
          boxShadow: '0 4px 14px hsl(220 80% 2% / 0.55)',
        }}
      >
        <div className="font-amiri text-[13.5px] text-foreground leading-relaxed prose prose-invert prose-sm max-w-none [&_p]:mb-1.5 [&_p:last-child]:mb-0 [&_strong]:text-gold-champagne">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
};
