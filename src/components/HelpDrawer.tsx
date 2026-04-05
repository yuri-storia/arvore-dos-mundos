import React, { useState } from 'react';
import { HelpCircle, Send, Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';

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
      { icon: '🗺️', title: 'Mapa do Mundo', desc: 'No primeiro Fruto, você pode gerar mapas em diferentes estilos cartográficos usando a Seiva Dourada.' },
      { icon: '🌳', title: 'Consultar Idriel', desc: 'Nos demais Frutos, peça ajuda criativa à Idriel usando os chips de sugestão ou digitando sua pergunta.' },
      { icon: '💾', title: 'Salvamento automático', desc: 'Tudo que você escreve é salvo automaticamente na nuvem a cada 2 segundos. Relaxe e crie!' },
    ],
  },
  codex: {
    label: 'Codex',
    tips: [
      { icon: '📝', title: 'Fichas e Artigos', desc: 'Crie Fichas para personagens, locais e criaturas (com imagem de capa!) ou Artigos para lore e história, no estilo wiki.' },
      { icon: '🔍', title: 'Filtros inteligentes', desc: 'Use os filtros para encontrar entradas por tipo ou por Fruto de origem. Cada categoria mostra a contagem de itens.' },
      { icon: '📊', title: 'Análise de Mundo', desc: 'Peça a Idriel uma análise completa do seu mundo — ela avalia coerência, lacunas e dá sugestões narrativas.' },
    ],
  },
  escrever: {
    label: 'Escrever',
    tips: [
      { icon: '📖', title: 'Três modos de escrita', desc: 'Manuscrito organiza capítulos e cenas hierarquicamente. Quadro dá uma visão Kanban visual. Livre permite escrever livremente.' },
      { icon: '⏱️', title: 'Timer Pomodoro', desc: 'Ative o timer para sessões focadas de escrita com pausas programadas. Personalize os tempos como preferir.' },
      { icon: '@', title: 'Menções do Codex', desc: 'Digite @ no editor para referenciar fichas e artigos do seu mundo, mantendo tudo conectado.' },
    ],
  },
  galeria: {
    label: 'Galeria',
    tips: [
      { icon: '🖼️', title: 'Referências visuais', desc: 'Faça upload de imagens que inspiram seu mundo — concept arts, mapas, paisagens, personagens.' },
      { icon: '🏷️', title: 'Organize por Fruto', desc: 'Categorize suas imagens por Fruto para encontrá-las rapidamente quando precisar de referência.' },
      { icon: '🔎', title: 'Visualização ampliada', desc: 'Clique em qualquer imagem para ver em tela cheia. Passe o mouse para ver opções de remover.' },
    ],
  },
  'gerar-imagens': {
    label: 'Visões de Idriel',
    tips: [
      { icon: '🌿', title: 'Criação em dois passos', desc: 'Primeiro Idriel refina seu prompt com sabedoria criativa, depois materializa a visão em uma imagem.' },
      { icon: '🎨', title: 'Estilos e tons', desc: 'Escolha estilo visual, tipo de imagem e tom emocional para guiar a geração exatamente como imagina.' },
      { icon: '💧', title: 'Custo de 5 gotas', desc: 'Cada imagem gerada consome 5 gotas de Seiva Dourada. Salve suas favoritas direto na Galeria!' },
    ],
  },
};

interface Props {
  tab: string;
}

export const HelpDrawer: React.FC<Props> = ({ tab }) => {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  const data = TAB_TIPS[tab];
  if (!data) return null;

  const handleAsk = async () => {
    if (!question.trim() || loading) return;
    setLoading(true);
    setAnswer('');
    try {
      const { data: result, error } = await supabase.functions.invoke('idriel-help', {
        body: { question: question.trim() },
      });
      if (error) throw error;
      setAnswer(result?.content || 'Idriel não conseguiu responder no momento.');
    } catch (e: any) {
      setAnswer(`🥀 ${e.message || 'Erro ao consultar Idriel. Tente novamente.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating golden ? button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-40 w-10 h-10 rounded-full flex items-center justify-center border border-gold/40 bg-gold/[0.10] backdrop-blur-sm text-gold-light hover:bg-gold/[0.25] hover:scale-110 transition-all shadow-lg shadow-gold/10"
        aria-label="Ajuda de Idriel"
      >
        <HelpCircle className="w-5 h-5" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="bg-[#060c16] border-l border-gold/15 w-[340px] sm:w-[380px] p-0 flex flex-col">
          <SheetHeader className="p-5 pb-3 border-b border-gold/10 shrink-0">
            <SheetTitle className="font-cinzel text-gold-light text-base flex items-center gap-2">
              🌳 Idriel — Guardiã
            </SheetTitle>
            <SheetDescription className="font-merriweather italic text-[11px] text-text-dim">
              Sua guia pela Árvore dos Mundos. Pergunte o que quiser!
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1 min-h-0">
            <div className="p-4 space-y-4">
              {/* Section label */}
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-gold/10" />
                <span className="text-[9px] font-montserrat uppercase tracking-widest text-gold/50">
                  📜 Guia — {data.label}
                </span>
                <div className="h-px flex-1 bg-gold/10" />
              </div>

              {/* Static tips in Idriel's voice */}
              {data.tips.map((tip, i) => (
                <div
                  key={i}
                  className="rounded-lg p-3.5 border border-gold/10 bg-gold/[0.03] hover:bg-gold/[0.06] transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg shrink-0 mt-0.5">{tip.icon}</span>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-montserrat font-bold text-[13px] text-foreground mb-1">{tip.title}</h4>
                      <p className="font-merriweather text-xs text-text-dim leading-relaxed">{tip.desc}</p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Divider */}
              <div className="flex items-center gap-2 pt-2">
                <div className="h-px flex-1 bg-emerald-500/15" />
                <span className="text-[9px] font-montserrat uppercase tracking-widest text-emerald-400/60">
                  💬 Pergunte à Idriel
                </span>
                <div className="h-px flex-1 bg-emerald-500/15" />
              </div>

              <p className="font-merriweather italic text-[11px] text-text-dim leading-relaxed">
                Tem alguma dúvida sobre como usar a Árvore dos Mundos? Pergunte livremente — esta ajuda é <span className="text-emerald-300 font-bold not-italic">gratuita e ilimitada</span> 🌿
              </p>

              {/* Answer area */}
              {answer && (
                <div className="animate-fadeUp border-l-[3px] border-emerald-400 pl-3 py-2.5 bg-emerald-500/5 rounded-r-md">
                  <span className="font-cinzel text-[10px] text-emerald-300 block mb-1.5">🌿 Idriel responde</span>
                  <div className="font-merriweather text-xs text-foreground leading-relaxed prose prose-invert prose-xs max-w-none">
                    <ReactMarkdown>{answer}</ReactMarkdown>
                  </div>
                </div>
              )}

              {loading && (
                <div className="flex items-center gap-2 text-text-dim text-xs py-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  <span className="font-merriweather italic">Idriel contempla sua pergunta…</span>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Question input — fixed at bottom */}
          <div className="shrink-0 border-t border-emerald-500/15 p-3 bg-[#060c16]">
            <div className="flex gap-2">
              <input
                type="text"
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAsk()}
                placeholder="Como funciona…?"
                className="flex-1 bg-[rgba(4,12,24,0.6)] border border-emerald-500/20 rounded-md px-3 py-2 text-sm text-foreground font-merriweather placeholder:italic placeholder:text-text-dim/60 focus:outline-none focus:border-emerald-400/50"
              />
              <button
                onClick={handleAsk}
                disabled={!question.trim() || loading}
                className="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-foreground rounded-md disabled:opacity-40 transition-colors"
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
