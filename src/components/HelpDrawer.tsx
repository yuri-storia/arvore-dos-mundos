import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, ScrollText } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';
import idrielAvatar from '@/assets/idriel-avatar.png';

interface ChatMessage {
  role: 'user' | 'assistant' | 'greeting';
  content: string;
}

const FAQ: Record<string, { label: string; items: { q: string; a: string }[] }> = {
  construir: {
    label: 'Construir',
    items: [
      {
        q: 'Como funcionam os 11 Frutos?',
        a: 'Cada Fruto representa um pilar do worldbuilding (ex.: Cosmogonia, Povos e Culturas, Magia). Basta clicar em um Fruto na lista lateral e preencher os campos. Tudo salva automaticamente a cada 2 segundos.',
      },
      {
        q: 'Qual a diferença entre "Cima pra Baixo" e "Baixo pra Cima"?',
        a: '**Cima pra Baixo** começa pelo macro (cosmogonia, mapa) e desce até detalhes (personagens, conflitos). **Baixo pra Cima** começa por um detalhe concreto (um personagem, uma cidade) e expande o mundo ao redor dele. Escolha a que fizer mais sentido para você — é possível trocar a qualquer momento.',
      },
      {
        q: 'Como gerar um mapa do mundo?',
        a: 'No Fruto "Mapa do Mundo", clique em **Gerar Mapa**. Escolha um dos 6 estilos (Político, Geográfico, Náutico, Explorador, Cidade ou Personalizado), descreva seu mundo e confirme. Custa **5 gotas de Elixir dos Mundos**. Requer plano Idriel.',
      },
      {
        q: 'O que é o Elixir dos Mundos?',
        a: 'É a moeda de créditos para funcionalidades de IA. No plano Idriel você recebe **100 gotas por mês**. Custos: texto (1 gota), imagem (5 gotas), análise de mundo (2 gotas).',
      },
      {
        q: 'O que é "Consultar Idriel"?',
        a: 'É um chat de IA disponível dentro de cada Fruto (exceto Mapa do Mundo) que responde perguntas criativas sobre aquele pilar. Cada consulta custa **1 gota de Elixir dos Mundos**. Disponível apenas no plano Idriel.',
      },
      {
        q: 'Como funciona o salvamento automático?',
        a: 'Tudo o que você escreve nos campos dos Frutos é salvo automaticamente a cada 2 segundos. Não é necessário clicar em nenhum botão de salvar.',
      },
    ],
  },
  codex: {
    label: 'Codex',
    items: [
      {
        q: 'Qual a diferença entre Ficha e Artigo?',
        a: '**Fichas** são entradas visuais com imagem, ideais para personagens, locais e criaturas. **Artigos** são textos em estilo wiki, ideais para lore, história e regras do mundo.',
      },
      {
        q: 'Como filtrar entradas por Fruto?',
        a: 'No topo do Codex, use o filtro por Fruto para mostrar apenas as entradas relacionadas a um pilar específico (ex.: Povos, Magia, Fauna).',
      },
      {
        q: 'Como exportar meu Codex em PDF?',
        a: 'Clique no botão de exportação dentro de cada entrada do Codex para gerar um PDF individual. Disponível nos planos Raiz e Idriel.',
      },
      {
        q: 'O que é a Análise de Mundo?',
        a: 'A Análise de Mundo usa IA para avaliar todo o seu Codex e dar feedback sobre coerência, lacunas e sugestões de melhoria. Custa **2 gotas de Elixir dos Mundos**. Disponível apenas no plano Idriel.',
      },
      {
        q: 'Posso adicionar imagem nas fichas?',
        a: 'Sim! Ao criar ou editar uma Ficha, há um campo de upload de imagem. Você pode usar imagens suas ou geradas pelas Visões de Idriel.',
      },
    ],
  },
  escrever: {
    label: 'Escrever',
    items: [
      {
        q: 'Quais são os modos de escrita?',
        a: 'São três: **Manuscrito** (capítulos e cenas organizados hierarquicamente), **Quadro** (Kanban visual com colunas personalizáveis) e **Livre** (blocos de texto independentes para rascunhos rápidos).',
      },
      {
        q: 'Como usar o Timer Pomodoro?',
        a: 'Clique no ícone de relógio na aba Escrever. Você pode configurar tempo de foco e pausa. O timer ajuda a manter sessões de escrita produtivas.',
      },
      {
        q: 'Como mencionar fichas do Codex com @?',
        a: 'Enquanto escreve no Manuscrito ou Escrita Livre, digite **@** seguido do nome da ficha. Uma lista de sugestões aparecerá para você selecionar a referência.',
      },
      {
        q: 'Como funciona o Manuscrito?',
        a: 'No modo Manuscrito, você cria **capítulos** e dentro deles adiciona **cenas**. As cenas podem ser reordenadas arrastando e têm status (rascunho, revisão, pronto).',
      },
      {
        q: 'O que é o Mural de Cenas?',
        a: 'É o modo **Quadro** (Kanban) onde você organiza cenas visualmente em colunas. Útil para planejar a estrutura do enredo e acompanhar o progresso.',
      },
    ],
  },
  galeria: {
    label: 'Galeria',
    items: [
      {
        q: 'Como fazer upload de imagens?',
        a: 'Na aba Galeria, clique em **Adicionar Imagem** e selecione o arquivo do seu computador. A imagem será salva no seu mundo.',
      },
      {
        q: 'Como organizar imagens por Fruto?',
        a: 'Ao fazer upload, você pode atribuir uma categoria (ligada a um Fruto) para filtrar suas imagens depois.',
      },
      {
        q: 'O que são as Visões de Idriel?',
        a: 'É a funcionalidade de **geração de imagens com IA**. Você descreve o que quer, escolhe estilo e tom, e a IA cria a imagem. Cada imagem custa **5 gotas de Elixir dos Mundos**. Disponível apenas no plano Idriel.',
      },
      {
        q: 'Quanto custa gerar uma imagem?',
        a: 'Cada imagem gerada pelas Visões de Idriel custa **5 gotas de Elixir dos Mundos**. No plano Idriel você tem 100 gotas por mês.',
      },
    ],
  },
  geral: {
    label: 'Geral',
    items: [
      {
        q: 'Como posso ter acesso à geração de imagens e análise do mundo?',
        a: 'Essas funcionalidades estão disponíveis exclusivamente no **plano Idriel** (R$ 39,90/mês ou R$ 397/ano). Para fazer upgrade:\n\n1. Clique no seu avatar no canto superior direito\n2. Vá em **Configurações** ou clique no banner de upgrade\n3. Escolha o plano Idriel\n\nCom o plano Idriel você recebe **100 gotas de Elixir dos Mundos por mês** para usar em geração de imagens (5 gotas), consultas de IA (1 gota) e análise de mundo (2 gotas).',
      },
      {
        q: 'Quais são os planos disponíveis?',
        a: '**Raiz (R$ 19,90/mês ou R$ 197/ano):** Mundos, fichas e artigos ilimitados. Manuscrito, Mural de Arcos e Exportação em PDF/Word/Kindle. Sem IA.\n\n**Idriel (R$ 39,90/mês ou R$ 397/ano):** Tudo do Raiz + Idriel (IA texto e imagens), mapas IA, análise de mundo e 100 gotas de Elixir dos Mundos por mês.\n\nNos planos anuais você ganha 2 meses grátis.',
      },
      {
        q: 'Como criar múltiplos mundos?',
        a: 'Você precisa de um plano pago (Raiz ou Idriel). Com o plano ativo, use a barra lateral para criar novos mundos clicando em **+ Novo Mundo**.',
      },
    ],
  },
};

const GREETING = `Olá! Sou Idriel, sua assistente na Árvore dos Mundos. Selecione uma pergunta abaixo ou navegue pelas categorias para tirar suas dúvidas.`;

interface Props {
  tab: string;
}

export const HelpDrawer: React.FC<Props> = ({ tab }) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeCategory, setActiveCategory] = useState(tab);
  const scrollRef = useRef<HTMLDivElement>(null);

  const categories = Object.keys(FAQ);

  useEffect(() => {
    setMessages([{ role: 'greeting', content: GREETING }]);
    setActiveCategory(tab in FAQ ? tab : 'geral');
  }, [tab]);

  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const handleAsk = (q: string, a: string) => {
    setMessages(prev => [...prev, { role: 'user', content: q }, { role: 'assistant', content: a }]);
  };

  const currentFaq = FAQ[activeCategory] || FAQ.geral;

  return (
    <>
      {/* Botão flutuante de Idriel — destaque premium */}
      <button
        onClick={() => setOpen(true)}
        className="group fixed bottom-6 right-6 z-[90] flex items-center gap-3 pl-2 pr-4 py-2 rounded-full transition-all hover:-translate-y-0.5 animate-idriel-pulse"
        style={{
          background: 'linear-gradient(135deg, hsl(28 32% 22%) 0%, hsl(30 30% 32%) 45%, hsl(34 42% 48%) 100%)',
          border: '1px solid hsl(40 50% 70% / 0.55)',
          boxShadow: '0 10px 32px hsl(28 32% 12% / 0.6), 0 0 28px hsl(34 42% 50% / 0.35), inset 0 1px 0 hsl(42 60% 96% / 0.25)',
        }}
        aria-label="Falar com Idriel"
      >
        <span
          className="block w-12 h-12 rounded-full overflow-hidden ring-2"
          style={{ boxShadow: '0 0 18px hsl(40 50% 78% / 0.5)' }}
        >
          <img src={idrielAvatar} alt="Idriel" className="w-full h-full object-cover" />
        </span>
        <span className="hidden sm:flex flex-col items-start leading-tight pr-1">
          <span className="font-cinzel font-bold text-[13px] text-gradient-gold tracking-wide">Idriel</span>
          <span className="font-montserrat uppercase tracking-[0.18em] text-[9px] text-gold-cream/80">Ajuda</span>
        </span>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="border-l border-gold-bronze/40 w-[340px] sm:w-[420px] p-0 flex flex-col"
          style={{
            background:
              'linear-gradient(180deg, hsl(214 65% 5%) 0%, hsl(214 60% 3%) 100%)',
            boxShadow: '-12px 0 40px hsl(28 32% 10% / 0.5)',
          }}
        >
          <SheetHeader
            className="p-5 pb-4 border-b border-gold-bronze/25 shrink-0 relative overflow-hidden"
            style={{
              background:
                'linear-gradient(135deg, hsl(28 32% 22% / 0.45) 0%, hsl(34 42% 30% / 0.18) 60%, transparent 100%)',
            }}
          >
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <img
                  src={idrielAvatar}
                  alt="Idriel"
                  className="w-14 h-14 rounded-full object-cover"
                  style={{
                    border: '2px solid hsl(40 50% 78% / 0.7)',
                    boxShadow: '0 0 18px hsl(34 42% 50% / 0.5)',
                  }}
                />
                <div
                  className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, hsl(40 50% 78%), hsl(34 42% 58%))',
                  }}
                >
                  <Sparkles className="w-2.5 h-2.5 text-[#1a0f00]" strokeWidth={2.5} />
                </div>
              </div>
              <div className="min-w-0">
                <SheetTitle className="font-cinzel text-gradient-gold text-xl leading-tight">
                  Idriel
                </SheetTitle>
                <SheetDescription className="font-amiri text-sm text-text-secondary">
                  Sua guia na Árvore dos Mundos
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {/* Categorias */}
          <div className="shrink-0 border-b border-gold-bronze/20 px-3 py-2.5 flex gap-1.5 overflow-x-auto scrollbar-none">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => {
                  setActiveCategory(cat);
                  setMessages([{ role: 'greeting', content: GREETING }]);
                }}
                className={`text-[11px] font-montserrat font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full border whitespace-nowrap transition-all ${
                  activeCategory === cat
                    ? 'text-[#1a0f00] border-transparent'
                    : 'bg-transparent border-gold-bronze/25 text-text-secondary hover:border-gold-champagne/50 hover:text-gold-cream'
                }`}
                style={
                  activeCategory === cat
                    ? {
                        background:
                          'linear-gradient(135deg, hsl(42 55% 90%) 0%, hsl(40 50% 78%) 45%, hsl(34 42% 58%) 100%)',
                        boxShadow: 'inset 0 1px 0 hsl(42 60% 96% / 0.5), 0 4px 14px hsl(34 42% 30% / 0.45)',
                      }
                    : undefined
                }
              >
                {FAQ[cat].label}
              </button>
            ))}
          </div>

          {/* Chat */}
          <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
            <div className="p-4 space-y-3">
              {messages.map((msg, i) => (
                <ChatBubble key={i} message={msg} />
              ))}

              <div className="pt-1 space-y-2">
                <p className="text-[10px] font-montserrat font-bold uppercase tracking-[0.22em] text-gold-champagne/70 text-center flex items-center justify-center gap-1.5">
                  <ScrollText className="w-3.5 h-3.5" strokeWidth={1.75} />
                  {currentFaq.label}
                </p>
                <div className="flex flex-col gap-2">
                  {currentFaq.items.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => handleAsk(item.q, item.a)}
                      className="text-left text-sm font-amiri px-4 py-2.5 rounded-lg border border-gold-bronze/25 bg-gold-deep/[0.10] hover:bg-gold-deep/25 hover:border-gold-champagne/40 text-text-secondary hover:text-foreground transition-all"
                    >
                      {item.q}
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
      <div className="flex justify-end">
        <div
          className="rounded-2xl rounded-tr-sm px-3.5 py-2.5 max-w-[85%]"
          style={{
            background: 'linear-gradient(135deg, hsl(34 42% 30% / 0.5), hsl(28 32% 22% / 0.45))',
            border: '1px solid hsl(40 50% 70% / 0.3)',
          }}
        >
          <p className="font-amiri text-sm text-foreground">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5">
      <img
        src={idrielAvatar}
        alt="Idriel"
        className="w-8 h-8 rounded-full object-cover mt-0.5 shrink-0"
        style={{ border: '1px solid hsl(40 50% 70% / 0.5)' }}
      />
      <div
        className="rounded-2xl rounded-tl-sm px-3.5 py-2.5 max-w-[85%]"
        style={{
          background: 'linear-gradient(135deg, hsl(214 60% 7%), hsl(214 65% 5%))',
          border: '1px solid hsl(34 42% 45% / 0.25)',
        }}
      >
        <div className="font-amiri text-sm text-foreground leading-relaxed prose prose-invert prose-sm max-w-none [&_p]:mb-1.5 [&_p:last-child]:mb-0 [&_strong]:text-gold-champagne">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
};
