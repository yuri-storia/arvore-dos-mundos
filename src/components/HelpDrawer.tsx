import React, { useState, useRef, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
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
        a: 'No Fruto "Mapa do Mundo", clique em **Gerar Mapa**. Escolha um dos 6 estilos (Político, Geográfico, Náutico, Explorador, Cidade ou Personalizado), descreva seu mundo e confirme. Custa **5 gotas de Seiva Dourada**. Requer plano Idriel.',
      },
      {
        q: 'O que é a Seiva Dourada?',
        a: 'É a moeda de créditos para funcionalidades de IA. No plano Idriel você recebe **100 gotas por mês**. Custos: texto (1 gota), imagem (5 gotas), análise de mundo (2 gotas).',
      },
      {
        q: 'O que é "Consultar Idriel"?',
        a: 'É um chat de IA disponível dentro de cada Fruto (exceto Mapa do Mundo) que responde perguntas criativas sobre aquele pilar. Cada consulta custa **1 gota de Seiva Dourada**. Disponível apenas no plano Idriel.',
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
        a: 'A Análise de Mundo usa IA para avaliar todo o seu Codex e dar feedback sobre coerência, lacunas e sugestões de melhoria. Custa **2 gotas de Seiva Dourada**. Disponível apenas no plano Idriel.',
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
        a: 'É a funcionalidade de **geração de imagens com IA**. Você descreve o que quer, escolhe estilo e tom, e a IA cria a imagem. Cada imagem custa **5 gotas de Seiva Dourada**. Disponível apenas no plano Idriel.',
      },
      {
        q: 'Quanto custa gerar uma imagem?',
        a: 'Cada imagem gerada pelas Visões de Idriel custa **5 gotas de Seiva Dourada**. No plano Idriel você tem 100 gotas por mês.',
      },
    ],
  },
  geral: {
    label: 'Geral',
    items: [
      {
        q: 'Como posso ter acesso à geração de imagens e análise do mundo?',
        a: 'Essas funcionalidades estão disponíveis exclusivamente no **plano Idriel** (R$ 29,90/mês ou R$ 279/ano). Para fazer upgrade:\n\n1. Clique no seu avatar no canto superior direito\n2. Vá em **Configurações** ou clique no banner de upgrade\n3. Escolha o plano Idriel\n\nCom o plano Idriel você recebe **100 gotas de Seiva Dourada por mês** para usar em geração de imagens (5 gotas), consultas de IA (1 gota) e análise de mundo (2 gotas).',
      },
      {
        q: 'Quais são os planos disponíveis?',
        a: '**🌱 Semente (Grátis):** 1 mundo, 5 fichas, 1 artigo. Sem IA e sem exportação.\n\n**🌿 Raiz (R$ 87/ano):** Mundos, fichas e artigos ilimitados. Exportação em PDF. Sem IA.\n\n**✨ Idriel Mensal (R$ 29,90/mês):** Tudo do Raiz + 100 gotas de Seiva Dourada por mês para IA.\n\n**✨ Idriel Anual (R$ 279/ano):** Mesmo que o mensal, com economia de 22%.',
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
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-40 w-12 h-12 rounded-full flex items-center justify-center border-[2.5px] border-gold/50 bg-gold/[0.08] backdrop-blur-sm hover:bg-gold/[0.20] hover:scale-110 transition-all shadow-[0_0_16px_rgba(218,165,32,0.25),0_0_32px_rgba(218,165,32,0.1)] animate-idriel-pulse overflow-hidden"
        aria-label="Ajuda de Idriel"
      >
        <img src={idrielAvatar} alt="Idriel" className="w-full h-full object-cover rounded-full" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="bg-[hsl(var(--bg-deep))] border-l border-idriel/15 w-[340px] sm:w-[400px] p-0 flex flex-col">
          <SheetHeader className="p-4 pb-3 border-b border-idriel/10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img src={idrielAvatar} alt="Idriel" className="w-10 h-10 rounded-full object-cover border-2 border-idriel/40" />
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-idriel flex items-center justify-center"><Sparkles className="w-2 h-2 text-white" strokeWidth={2.5} /></div>
              </div>
              <div>
                <SheetTitle className="font-cinzel text-idriel-light text-lg">Idriel — Ajuda</SheetTitle>
                <SheetDescription className="font-merriweather text-xs text-text-dim">
                  Perguntas frequentes sobre a plataforma
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {/* Category tabs */}
          <div className="shrink-0 border-b border-idriel/10 px-3 py-2 flex gap-1.5 overflow-x-auto scrollbar-none">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => {
                  setActiveCategory(cat);
                  setMessages([{ role: 'greeting', content: GREETING }]);
                }}
                className={`text-[11px] font-montserrat uppercase tracking-wider px-3 py-1.5 rounded-full border whitespace-nowrap transition-all ${
                  activeCategory === cat
                    ? 'bg-idriel/20 border-idriel/40 text-idriel-light'
                    : 'bg-transparent border-idriel/10 text-text-dim hover:border-idriel/25 hover:text-text-secondary'
                }`}
              >
                {FAQ[cat].label}
              </button>
            ))}
          </div>

          {/* Chat area */}
          <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
            <div className="p-4 space-y-3">
              {messages.map((msg, i) => (
                <ChatBubble key={i} message={msg} />
              ))}

              {/* FAQ chips */}
              <div className="pt-1 space-y-2">
                <p className="text-[10px] font-montserrat uppercase tracking-widest text-idriel/50 text-center">
                  📜 {currentFaq.label}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {currentFaq.items.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => handleAsk(item.q, item.a)}
                      className="text-left text-xs font-merriweather px-3 py-2 rounded-xl border border-idriel/15 bg-idriel/[0.04] hover:bg-idriel/[0.10] hover:border-idriel/30 text-text-secondary hover:text-foreground transition-all"
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
        <div className="bg-idriel/15 border border-idriel/20 rounded-2xl rounded-tr-sm px-3.5 py-2.5 max-w-[85%]">
          <p className="font-merriweather text-sm text-foreground">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5">
      <img src={idrielAvatar} alt="Idriel" className="w-7 h-7 rounded-full object-cover border border-idriel/30 mt-0.5 shrink-0" />
      <div className="bg-idriel/[0.06] border border-idriel/10 rounded-2xl rounded-tl-sm px-3.5 py-2.5 max-w-[85%]">
        <div className="font-merriweather text-sm text-foreground leading-relaxed prose prose-invert prose-sm max-w-none [&_p]:mb-1.5 [&_p:last-child]:mb-0">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
};
