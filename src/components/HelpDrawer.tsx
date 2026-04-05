import React, { useState } from 'react';
import { HelpCircle, Send, Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';
import idrielAvatar from '@/assets/idriel-avatar.png';

interface Tip {
  icon: string;
  title: string;
  desc: string;
}

const TAB_TIPS: Record<string, { label: string; tips: Tip[] }> = {
  construir: {
    label: 'Construir',
    tips: [
      { icon: '🌿', title: 'Cada Fruto é um pilar', desc: 'Escolha qualquer um dos 11 Frutos para começar a dar forma ao seu mundo. Não há ordem errada — siga sua inspiração!' },
      { icon: '🗺️', title: 'Mapa do Mundo', desc: 'No primeiro Fruto, gere mapas em diferentes estilos cartográficos usando a Seiva Dourada.' },
      { icon: '📖', title: 'Orientação & Estudo de Caso', desc: 'Dentro de cada Fruto há uma sanfona com minha orientação detalhada, estudo de caso literário e passo a passo. Abra para consultar!' },
      { icon: '🌳', title: 'Consultar Idriel', desc: 'Nos demais Frutos, peça ajuda criativa usando os chips de sugestão ou digitando sua pergunta.' },
      { icon: '💾', title: 'Salvamento automático', desc: 'Tudo que você escreve é salvo na nuvem a cada 2 segundos. Relaxe e crie!' },
    ],
  },
  codex: {
    label: 'Codex',
    tips: [
      { icon: '📝', title: 'Fichas e Artigos', desc: 'Crie Fichas para personagens e locais (com imagem!) ou Artigos estilo wiki para lore e história.' },
      { icon: '🔍', title: 'Filtros inteligentes', desc: 'Encontre entradas por tipo ou por Fruto de origem. Cada categoria mostra a contagem de itens.' },
      { icon: '📊', title: 'Análise de Mundo', desc: 'Peça a Idriel uma análise completa — ela avalia coerência, lacunas e dá sugestões narrativas.' },
    ],
  },
  escrever: {
    label: 'Escrever',
    tips: [
      { icon: '📖', title: 'Três modos de escrita', desc: 'Manuscrito (capítulos organizados como um livro), Mural de Cenas (visualize por status e arraste para reorganizar) ou Rascunhos (escrita livre sem estrutura).' },
      { icon: '⏱️', title: 'Timer Pomodoro', desc: 'Ative sessões focadas de escrita com pausas programadas. Personalize os tempos.' },
      { icon: '@', title: 'Menções do Codex', desc: 'Digite @ no editor para referenciar fichas e artigos do seu mundo.' },
    ],
  },
  galeria: {
    label: 'Galeria',
    tips: [
      { icon: '🖼️', title: 'Referências visuais', desc: 'Faça upload de imagens de inspiração — concept arts, mapas, paisagens, personagens.' },
      { icon: '🏷️', title: 'Organize por Fruto', desc: 'Categorize suas imagens por Fruto para encontrá-las rapidamente.' },
      { icon: '🔎', title: 'Visualização ampliada', desc: 'Clique em qualquer imagem para ver em tela cheia.' },
    ],
  },
  'gerar-imagens': {
    label: 'Visões de Idriel',
    tips: [
      { icon: '🌿', title: 'Criação em dois passos', desc: 'Primeiro refino seu prompt com sabedoria criativa, depois materializo a visão em imagem.' },
      { icon: '🎨', title: 'Estilos e tons', desc: 'Escolha estilo visual, tipo de imagem e tom emocional para guiar a geração.' },
      { icon: '💧', title: 'Custo de 5 gotas', desc: 'Cada imagem consome 5 gotas de Seiva Dourada. Salve suas favoritas na Galeria!' },
    ],
  },
};

const DAILY_LIMIT = 5;

interface Props {
  tab: string;
}

export const HelpDrawer: React.FC<Props> = ({ tab }) => {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);

  const data = TAB_TIPS[tab];
  if (!data) return null;

  const handleAsk = async () => {
    if (!question.trim() || loading || remaining === 0) return;
    setLoading(true);
    setAnswer('');
    try {
      const { data: result, error } = await supabase.functions.invoke('idriel-help', {
        body: { question: question.trim() },
      });
      if (error) {
        if (result?.error === 'daily_limit') {
          setAnswer(result.message);
          setRemaining(0);
          return;
        }
        throw error;
      }
      setAnswer(result?.content || 'Não consegui formular uma resposta no momento.');
      if (result?.remaining !== undefined) setRemaining(result.remaining);
    } catch (e: any) {
      try {
        const body = e?.context?.body ? JSON.parse(e.context.body) : null;
        if (body?.error === 'daily_limit') {
          setAnswer(body.message);
          setRemaining(0);
          return;
        }
      } catch {}
      setAnswer(`🥀 ${e.message || 'Erro ao consultar. Tente novamente.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Idriel button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-40 w-11 h-11 rounded-full flex items-center justify-center border-2 border-idriel/40 bg-idriel/[0.08] backdrop-blur-sm hover:bg-idriel/[0.20] hover:scale-110 transition-all shadow-lg shadow-idriel/10 animate-idriel-pulse overflow-hidden"
        aria-label="Ajuda de Idriel"
      >
        <img src={idrielAvatar} alt="Idriel" className="w-full h-full object-cover rounded-full" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="bg-[hsl(var(--bg-deep))] border-l border-idriel/15 w-[340px] sm:w-[380px] p-0 flex flex-col">
          {/* Header with Idriel */}
          <SheetHeader className="p-5 pb-4 border-b border-idriel/10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src={idrielAvatar}
                  alt="Idriel"
                  className="w-10 h-10 rounded-full object-cover border-2 border-idriel/40"
                />
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-idriel flex items-center justify-center text-[7px]">✨</div>
              </div>
              <div>
                <SheetTitle className="font-cinzel text-idriel-light text-lg">
                  Idriel
                </SheetTitle>
                <SheetDescription className="font-merriweather italic text-xs text-text-dim">
                  Guardiã da Árvore dos Mundos
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1 min-h-0">
            <div className="p-4 space-y-4">
              {/* Section label */}
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-idriel/10" />
                <span className="text-[10px] font-montserrat uppercase tracking-widest text-idriel/60">
                  📜 Guia — {data.label}
                </span>
                <div className="h-px flex-1 bg-idriel/10" />
              </div>

              {/* Static tips */}
              {data.tips.map((tip, i) => (
                <div
                  key={i}
                  className="rounded-lg p-3.5 border border-idriel/10 bg-idriel/[0.03] hover:bg-idriel/[0.06] transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg shrink-0 mt-0.5">{tip.icon}</span>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-montserrat font-bold text-sm text-foreground mb-1">{tip.title}</h4>
                      <p className="font-merriweather text-[13px] text-text-secondary leading-relaxed">{tip.desc}</p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Divider for chat */}
              <div className="flex items-center gap-2 pt-2">
                <div className="h-px flex-1 bg-idriel/15" />
                <span className="text-[10px] font-montserrat uppercase tracking-widest text-idriel/60">
                  💬 Pergunte à Idriel
                </span>
                <div className="h-px flex-1 bg-idriel/15" />
              </div>

              <p className="font-merriweather italic text-[13px] text-text-secondary leading-relaxed">
                Tem alguma dúvida sobre a Árvore dos Mundos? Pergunte — você tem <span className="text-idriel-light font-bold not-italic">{DAILY_LIMIT} perguntas por dia</span> ✨
              </p>

              {/* Answer area */}
              {answer && (
                <div className="animate-fadeUp border-l-[3px] border-idriel-light pl-3 py-2.5 bg-idriel/[0.04] rounded-r-md">
                  <div className="flex items-center gap-2 mb-1.5">
                    <img src={idrielAvatar} alt="Idriel" className="w-5 h-5 rounded-full object-cover border border-idriel/30" />
                    <span className="font-cinzel text-[10px] text-idriel-light">Idriel responde</span>
                  </div>
                  <div className="font-merriweather text-xs text-foreground leading-relaxed prose prose-invert prose-xs max-w-none">
                    <ReactMarkdown>{answer}</ReactMarkdown>
                  </div>
                </div>
              )}

              {loading && (
                <div className="flex items-center gap-2 text-text-dim text-xs py-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-idriel-light" />
                  <span className="font-merriweather italic">Idriel contempla sua pergunta…</span>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Question input — fixed at bottom */}
          <div className="shrink-0 border-t border-idriel/15 p-3 bg-[hsl(var(--bg-deep))]">
            {remaining !== null && (
              <p className="text-[10px] font-montserrat text-text-dim mb-2 text-center">
                {remaining > 0
                  ? <span>🌿 <span className="text-idriel-light">{remaining}</span> perguntas restantes hoje</span>
                  : <span className="text-gold/70">🌙 Idriel descansa até amanhã</span>
                }
              </p>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAsk()}
                placeholder={remaining === 0 ? 'Volte amanhã…' : 'Como funciona…?'}
                disabled={remaining === 0}
                className="flex-1 bg-idriel/[0.04] border border-idriel/20 rounded-md px-3 py-2 text-sm text-foreground font-merriweather placeholder:italic placeholder:text-text-dim/60 focus:outline-none focus:border-idriel/50 disabled:opacity-40"
              />
              <button
                onClick={handleAsk}
                disabled={!question.trim() || loading || remaining === 0}
                className="px-3 py-2 bg-idriel-dim hover:bg-idriel text-foreground rounded-md disabled:opacity-40 transition-colors"
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
