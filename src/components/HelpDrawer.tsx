import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';
import idrielAvatar from '@/assets/idriel-avatar.png';

interface ChatMessage {
  role: 'user' | 'assistant' | 'greeting';
  content: string;
}

const PRESETS: Record<string, { label: string; questions: string[] }> = {
  construir: {
    label: 'Construir',
    questions: [
      'Como funcionam os 11 Frutos?',
      'Qual a diferença entre Cima pra Baixo e Baixo pra Cima?',
      'Como gerar um mapa do mundo?',
      'O que é a Seiva Dourada?',
      'O que é Consultar Idriel?',
      'Como funciona o salvamento automático?',
    ],
  },
  codex: {
    label: 'Codex',
    questions: [
      'Qual a diferença entre Ficha e Artigo?',
      'Como filtrar entradas por Fruto?',
      'Como exportar meu Codex em PDF?',
      'O que é a Análise de Mundo?',
      'Posso adicionar imagem nas fichas?',
    ],
  },
  escrever: {
    label: 'Escrever',
    questions: [
      'Quais são os modos de escrita?',
      'Como usar o Timer Pomodoro?',
      'Como mencionar fichas do Codex com @?',
      'Como funciona o Manuscrito?',
      'O que é o Mural de Cenas?',
    ],
  },
  galeria: {
    label: 'Galeria',
    questions: [
      'Como fazer upload de imagens?',
      'Como organizar imagens por Fruto?',
      'O que são as Visões de Idriel?',
      'Quanto custa gerar uma imagem?',
    ],
  },
};

const DAILY_LIMIT = 5;

const GREETING = `Olá, viajante! 🌿 Sou Idriel, Guardiã da Árvore dos Mundos. Estou aqui para guiá-lo pela plataforma. Escolha uma pergunta abaixo ou digite a sua — você tem **${DAILY_LIMIT} perguntas gratuitas por dia**.`;

interface Props {
  tab: string;
}

export const HelpDrawer: React.FC<Props> = ({ tab }) => {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const data = PRESETS[tab];

  // Reset chat when tab changes
  useEffect(() => {
    setMessages([{ role: 'greeting', content: GREETING }]);
  }, [tab]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [messages, loading]);

  const handleAsk = async (q?: string) => {
    const text = (q || question).trim();
    if (!text || loading || remaining === 0) return;

    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setQuestion('');
    setLoading(true);

    try {
      const { data: result, error } = await supabase.functions.invoke('idriel-help', {
        body: { question: text },
      });
      if (error) {
        if (result?.error === 'daily_limit') {
          setMessages(prev => [...prev, { role: 'assistant', content: result.message }]);
          setRemaining(0);
          return;
        }
        throw error;
      }
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: result?.content || 'Não consegui formular uma resposta no momento.',
      }]);
      if (result?.remaining !== undefined) setRemaining(result.remaining);
    } catch (e: any) {
      try {
        const body = e?.context?.body ? JSON.parse(e.context.body) : null;
        if (body?.error === 'daily_limit') {
          setMessages(prev => [...prev, { role: 'assistant', content: body.message }]);
          setRemaining(0);
          return;
        }
      } catch {}
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `🥀 ${e.message || 'Erro ao consultar. Tente novamente.'}`,
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  if (!data) return null;

  const showPresets = messages.length <= 1 && !loading;

  return (
    <>
      {/* Floating Idriel button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-40 w-12 h-12 rounded-full flex items-center justify-center border-[2.5px] border-gold/50 bg-gold/[0.08] backdrop-blur-sm hover:bg-gold/[0.20] hover:scale-110 transition-all shadow-[0_0_16px_rgba(218,165,32,0.25),0_0_32px_rgba(218,165,32,0.1)] animate-idriel-pulse overflow-hidden"
        aria-label="Ajuda de Idriel"
      >
        <img src={idrielAvatar} alt="Idriel" className="w-full h-full object-cover rounded-full" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="bg-[hsl(var(--bg-deep))] border-l border-idriel/15 w-[340px] sm:w-[400px] p-0 flex flex-col">
          {/* Header */}
          <SheetHeader className="p-4 pb-3 border-b border-idriel/10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img src={idrielAvatar} alt="Idriel" className="w-10 h-10 rounded-full object-cover border-2 border-idriel/40" />
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-idriel flex items-center justify-center text-[7px]">✨</div>
              </div>
              <div>
                <SheetTitle className="font-cinzel text-idriel-light text-lg">Idriel</SheetTitle>
                <SheetDescription className="font-merriweather italic text-xs text-text-dim">
                  Guardiã da Árvore dos Mundos
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {/* Chat area */}
          <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
            <div className="p-4 space-y-3">
              {messages.map((msg, i) => (
                <ChatBubble key={i} message={msg} />
              ))}

              {loading && (
                <div className="flex items-start gap-2.5">
                  <img src={idrielAvatar} alt="Idriel" className="w-7 h-7 rounded-full object-cover border border-idriel/30 mt-0.5 shrink-0" />
                  <div className="bg-idriel/[0.06] border border-idriel/10 rounded-2xl rounded-tl-sm px-3.5 py-2.5 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-idriel-light" />
                    <span className="font-merriweather italic text-xs text-text-dim">Contemplando…</span>
                  </div>
                </div>
              )}

              {/* Preset questions */}
              {showPresets && (
                <div className="pt-1 space-y-2">
                  <p className="text-[10px] font-montserrat uppercase tracking-widest text-idriel/50 text-center">
                    📜 {data.label} — Perguntas frequentes
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {data.questions.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => handleAsk(q)}
                        disabled={remaining === 0}
                        className="text-left text-xs font-merriweather px-3 py-2 rounded-xl border border-idriel/15 bg-idriel/[0.04] hover:bg-idriel/[0.10] hover:border-idriel/30 text-text-secondary hover:text-foreground transition-all disabled:opacity-40"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="shrink-0 border-t border-idriel/15 p-3 bg-[hsl(var(--bg-deep))]">
            {remaining !== null && (
              <p className="text-[10px] font-montserrat text-text-dim mb-2 text-center">
                {remaining > 0
                  ? <span>🌿 <span className="text-idriel-light">{remaining}</span> perguntas restantes hoje</span>
                  : <span className="text-gold/70">🌙 Idriel descansa até amanhã</span>}
              </p>
            )}
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAsk()}
                placeholder={remaining === 0 ? 'Volte amanhã…' : 'Como funciona…?'}
                disabled={remaining === 0}
                className="flex-1 bg-idriel/[0.04] border border-idriel/20 rounded-full px-4 py-2 text-sm text-foreground font-merriweather placeholder:italic placeholder:text-text-dim/60 focus:outline-none focus:border-idriel/50 disabled:opacity-40"
              />
              <button
                onClick={() => handleAsk()}
                disabled={!question.trim() || loading || remaining === 0}
                className="w-9 h-9 flex items-center justify-center bg-idriel-dim hover:bg-idriel text-foreground rounded-full disabled:opacity-40 transition-colors shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

/* ─── Chat Bubble ─── */
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
