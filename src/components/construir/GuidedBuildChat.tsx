import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, ChevronDown, Leaf, Save, ScrollText, Send, Sparkles, Trees, Check } from 'lucide-react';
import { IdrielStateSprite } from '@/components/idriel/IdrielStateSprite';
import { IdrielMarkdown } from '@/components/IdrielMarkdown';
import { stateForEvent, type IdrielState } from '@/lib/idriel/idrielStates';
import { getFruitStudio, OUTPUT_HINT, OUTPUT_LABEL, type OutputType } from '@/lib/construir/fruitStudioConfig';

interface Props {
  fruitId: number;
  /** Valores atuais dos campos do Fruto (state.db[fruitId]). */
  values: Record<string, string>;
  onFieldChange: (fieldId: string, value: string) => void;
  /** Consulta explícita à IA (consome gota). */
  onConsult: (question: string) => void;
  aiLoading: boolean;
  aiResponse: string;
  canUseAI: boolean;
  onSaveAs: (kind: 'ficha' | 'artigo', text: string) => void;
  onSendTimeline: (text: string) => void;
  /** Slot para funcionalidades especiais do Fruto (ex.: Mapa do Mundo). */
  specialSlot?: React.ReactNode;
  /** Slot do CTA de upgrade quando o plano não permite IA. */
  upgradeSlot?: React.ReactNode;
  historySlot?: React.ReactNode;
}

type Bubble =
  | { kind: 'idriel'; id: string; state: IdrielState; text: string }
  | { kind: 'tutorial'; id: string }
  | { kind: 'user'; id: string; text: string }
  | { kind: 'ai'; id: string; text: string };

export const GuidedBuildChat: React.FC<Props> = ({
  fruitId, values, onFieldChange, onConsult, aiLoading, aiResponse,
  canUseAI, onSaveAs, onSendTimeline, specialSlot, upgradeSlot, historySlot,
}) => {
  const config = useMemo(() => getFruitStudio(fruitId), [fruitId]);
  const questions = config.questions;

  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState('');
  const [askMode, setAskMode] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [log, setLog] = useState<Bubble[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const step = questions[stepIndex];
  const answeredAll = questions.length > 0 && questions.every(q => (values[q.fieldId] || '').trim().length > 0);

  // Reinicia a conversa ao trocar de Fruto — conteúdo 100% estático.
  useEffect(() => {
    const firstUnanswered = questions.findIndex(q => !(values[q.fieldId] || '').trim());
    setStepIndex(firstUnanswered === -1 ? Math.max(0, questions.length - 1) : firstUnanswered);
    setDraft('');
    setAskMode(false);
    setTutorialOpen(false);
    setLog([
      { kind: 'idriel', id: 'intro', state: stateForEvent('enter_fruit'), text: config.intro },
      { kind: 'tutorial', id: 'tutorial' },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fruitId]);

  // Carrega o texto já salvo do campo atual no compositor.
  useEffect(() => {
    if (askMode) return;
    setDraft(step ? (values[step.fieldId] || '') : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, fruitId, askMode]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [log, aiResponse, aiLoading, stepIndex]);

  // Estado visual de Idriel — derivado de eventos, nunca aleatório.
  const idrielState: IdrielState = aiLoading
    ? stateForEvent('ai_codex_query')
    : aiResponse
      ? stateForEvent('creative_discovery')
      : answeredAll
        ? stateForEvent('celebrate')
        : tutorialOpen
          ? stateForEvent('tutorial')
          : askMode
            ? stateForEvent('user_idea')
            : stateForEvent('awaiting_answer');

  const pushUser = (text: string) =>
    setLog(prev => [...prev, { kind: 'user', id: `u-${Date.now()}`, text }]);

  const handleSubmit = () => {
    const text = draft.trim();
    if (!text) return;
    if (askMode) {
      if (!canUseAI) return;
      pushUser(text);
      onConsult(text);
      setAskMode(false);
      setDraft('');
      return;
    }
    if (!step) return;
    onFieldChange(step.fieldId, text);
    pushUser(text);
    setLog(prev => [...prev, {
      kind: 'idriel',
      id: `ack-${Date.now()}`,
      state: stateForEvent('saved'),
      text: stepIndex < questions.length - 1
        ? `Registrado em ${step.label}. Seguimos para o próximo caminho.`
        : `Registrado em ${step.label}. Você percorreu todos os caminhos deste Fruto.`,
    }]);
    setDraft('');
    if (stepIndex < questions.length - 1) setStepIndex(stepIndex + 1);
  };

  const outputs: OutputType[] = config.outputs;

  return (
    <div className="rounded-2xl border border-gold/20 bg-[rgba(4,10,20,0.72)] backdrop-blur-md overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.45)]">
      {/* Cabeçalho compacto do Fruto */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gold/15 bg-gradient-to-r from-gold/[0.06] to-transparent">
        <Trees className="w-3.5 h-3.5 text-gold-champagne shrink-0" strokeWidth={1.75} />
        <span className="font-cinzel font-bold text-[11px] uppercase tracking-[0.14em] text-gold-light truncate">
          {config.num} · {config.name}
        </span>
        <span className="ml-auto font-montserrat text-[10px] text-text-dim tabular-nums shrink-0">
          {questions.length > 0 && `${Math.min(stepIndex + 1, questions.length)}/${questions.length}`}
        </span>
      </div>

      <div className="flex">
        {/* Idriel à esquerda — área de dimensões estáveis */}
        <div className="hidden md:block relative w-[190px] lg:w-[220px] shrink-0 border-r border-gold/10 bg-gradient-to-b from-idriel/[0.06] to-transparent">
          <div className="sticky top-0 h-[420px] lg:h-[480px] flex items-end">
            <IdrielStateSprite state={idrielState} heightClass="h-full" className="w-full" />
          </div>
        </div>

        <div className="flex-1 min-w-0 flex flex-col">
          {/* Transcrição */}
          <div ref={scrollRef} className="flex-1 min-h-[260px] max-h-[420px] lg:max-h-[480px] overflow-y-auto px-4 py-4 space-y-3">
            {/* Idriel no mobile */}
            <div className="md:hidden flex items-center gap-3 mb-1">
              <div className="w-14 h-14 rounded-full overflow-hidden border border-gold/25 bg-idriel/10 shrink-0">
                <IdrielStateSprite state={idrielState} heightClass="h-14" />
              </div>
              <span className="font-cinzel text-[11px] text-gold-light uppercase tracking-widest">Idriel</span>
            </div>

            {log.map(b => {
              if (b.kind === 'user') {
                return (
                  <div key={b.id} className="flex justify-end">
                    <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-blue-main/25 border border-blue-bright/25 px-3.5 py-2 text-sm text-foreground font-merriweather whitespace-pre-wrap">
                      {b.text}
                    </p>
                  </div>
                );
              }
              if (b.kind === 'tutorial') {
                return (
                  <div key={b.id} className="rounded-xl border border-gold/15 bg-gold/[0.04]">
                    <button
                      type="button"
                      onClick={() => setTutorialOpen(o => !o)}
                      className="w-full flex items-center gap-2 px-3.5 py-2.5 text-left"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-gold-champagne shrink-0" strokeWidth={1.75} />
                      <span className="font-cinzel text-[11px] uppercase tracking-wider text-gold-light">
                        Aprender antes de criar
                      </span>
                      <ChevronDown className={`ml-auto w-4 h-4 text-text-dim transition-transform ${tutorialOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {tutorialOpen && (
                      <div className="px-3.5 pb-3.5 space-y-2.5 animate-fadeUp">
                        {config.principles.map((p, i) => (
                          <p key={i} className="font-merriweather text-[13px] leading-relaxed text-text-secondary">
                            {p.body}
                          </p>
                        ))}
                        {config.caseStudy && (
                          <div className="rounded-lg border border-blue-bright/15 bg-blue-bright/[0.04] p-3">
                            <span className="block font-montserrat text-[9px] uppercase tracking-widest text-blue-light mb-1">Estudo de caso</span>
                            <p className="font-merriweather italic text-[13px] leading-relaxed text-text-secondary">{config.caseStudy}</p>
                          </div>
                        )}
                        {config.closing && (
                          <p className="font-merriweather italic text-[12px] text-text-dim">{config.closing}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              }
              return (
                <div key={b.id} className="flex gap-2.5">
                  <Leaf className="w-3.5 h-3.5 text-gold-champagne shrink-0 mt-1" strokeWidth={1.75} />
                  <p className="font-merriweather text-[14px] leading-relaxed text-text-secondary">{b.text}</p>
                </div>
              );
            })}

            {/* Pergunta guiada atual (conteúdo estático) */}
            {!askMode && step && (
              <div className="flex gap-2.5 animate-fadeUp">
                <Leaf className="w-3.5 h-3.5 text-gold-champagne shrink-0 mt-1" strokeWidth={1.75} />
                <div className="min-w-0">
                  <p className="font-cinzel text-[11px] uppercase tracking-wider text-gold-light mb-1">{step.label}</p>
                  {step.placeholder && (
                    <p className="font-merriweather italic text-[13px] leading-relaxed text-text-dim">{step.placeholder}</p>
                  )}
                </div>
              </div>
            )}

            {aiLoading && (
              <div className="flex items-center gap-1 text-text-dim">
                <span className="w-1.5 h-1.5 rounded-full bg-gold-champagne dot-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-gold-champagne dot-bounce-2" />
                <span className="w-1.5 h-1.5 rounded-full bg-gold-champagne dot-bounce-3" />
                <span className="ml-2 font-merriweather italic text-xs">Idriel consulta o Codex do seu mundo…</span>
              </div>
            )}

            {aiResponse && !aiLoading && (
              <div className="animate-fadeUp border-l-[3px] border-gold-light pl-3.5 py-2.5 bg-gold/[0.04] rounded-r-lg">
                <IdrielMarkdown>{aiResponse}</IdrielMarkdown>
                <div className="flex flex-wrap gap-1.5 mt-3 pt-2.5 border-t border-gold/15">
                  {outputs.includes('ficha') && (
                    <button onClick={() => onSaveAs('ficha', aiResponse)} className="px-2.5 py-1 rounded-md text-[10px] font-montserrat font-bold uppercase tracking-wider border border-gold/40 text-gold-light hover:bg-gold/15 transition-colors">
                      <Save className="inline-block w-3 h-3 mr-1 align-[-0.1em]" strokeWidth={1.75} />Ficha
                    </button>
                  )}
                  {outputs.includes('artigo') && (
                    <button onClick={() => onSaveAs('artigo', aiResponse)} className="px-2.5 py-1 rounded-md text-[10px] font-montserrat font-bold uppercase tracking-wider border border-gold/40 text-gold-light hover:bg-gold/15 transition-colors">
                      <Save className="inline-block w-3 h-3 mr-1 align-[-0.1em]" strokeWidth={1.75} />Artigo
                    </button>
                  )}
                  {outputs.includes('timeline') && (
                    <button onClick={() => onSendTimeline(aiResponse)} className="px-2.5 py-1 rounded-md text-[10px] font-montserrat font-bold uppercase tracking-wider border border-gold-champagne/50 text-gold-champagne hover:bg-gold/15 transition-colors">
                      <ScrollText className="inline-block w-3 h-3 mr-1 align-[-0.1em]" strokeWidth={1.75} />Linha do Tempo
                    </button>
                  )}
                </div>
              </div>
            )}

            {answeredAll && !aiLoading && (
              <div className="rounded-xl border border-gold/20 bg-gold/[0.05] p-3 animate-fadeUp">
                <p className="font-merriweather text-[13px] text-text-secondary mb-1.5 inline-flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-gold-light" strokeWidth={2} />
                  {OUTPUT_HINT[config.preferredOutput]}
                </p>
                <p className="font-montserrat text-[10px] uppercase tracking-wider text-text-dim">
                  Use os botões abaixo de cada campo para salvar como {outputs.map(o => OUTPUT_LABEL[o]).join(' · ')}.
                </p>
              </div>
            )}
          </div>

          {/* Compositor */}
          <div className="border-t border-gold/15 px-3.5 py-3 bg-[rgba(2,7,13,0.6)]">
            {!askMode && step?.suggestions?.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-0.5 px-0.5">
                {step.suggestions.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => { setAskMode(true); setDraft(s); inputRef.current?.focus(); }}
                    className="shrink-0 px-2.5 py-1 rounded-full text-[10px] font-montserrat border border-gold/20 text-text-dim hover:text-gold-champagne hover:border-gold/40 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {step?.type === 'select' && !askMode ? (
              <select
                value={values[step.fieldId] || ''}
                onChange={e => { onFieldChange(step.fieldId, e.target.value); setDraft(e.target.value); }}
                className="w-full bg-[rgba(4,12,24,0.6)] border border-blue-bright/20 rounded-lg px-3 py-2 text-sm text-foreground font-merriweather focus:outline-none focus:border-blue-bright/50"
              >
                <option value="">Selecione…</option>
                {step.options?.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
                  }}
                  rows={2}
                  placeholder={askMode ? 'Pergunte a Idriel sobre este Fruto…' : (step?.placeholder || 'Escreva aqui…')}
                  className={`flex-1 min-w-0 resize-y rounded-lg px-3 py-2 text-sm text-foreground font-merriweather placeholder:italic placeholder:text-text-dim/70 focus:outline-none transition-colors ${
                    askMode
                      ? 'bg-gold/[0.05] border border-gold/30 focus:border-gold/60'
                      : 'bg-[rgba(4,12,24,0.6)] border border-blue-bright/20 focus:border-blue-bright/50'
                  }`}
                />
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!draft.trim() || (askMode && (aiLoading || !canUseAI))}
                  className={`shrink-0 h-9 w-9 rounded-lg flex items-center justify-center transition-all disabled:opacity-40 ${
                    askMode
                      ? 'bg-gradient-to-r from-gold-deep via-gold-warm to-gold text-[#1a0f00] shadow-[0_0_14px_hsl(var(--gold)/0.35)]'
                      : 'bg-blue-main hover:bg-blue-bright text-foreground'
                  }`}
                  aria-label={askMode ? 'Enviar pergunta a Idriel' : 'Registrar resposta'}
                >
                  <Send className="w-4 h-4" strokeWidth={2} />
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {canUseAI ? (
                <button
                  type="button"
                  onClick={() => { setAskMode(a => !a); setDraft(''); }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-montserrat font-bold uppercase tracking-wider border transition-colors ${
                    askMode
                      ? 'border-gold-light text-gold-light bg-gold/15'
                      : 'border-gold/25 text-text-dim hover:text-gold-champagne hover:border-gold/45'
                  }`}
                >
                  <Sparkles className="w-3 h-3" strokeWidth={2} />
                  {askMode ? 'Voltar a escrever' : 'Pedir ideias a Idriel · 1 gota'}
                </button>
              ) : upgradeSlot}

              {questions.length > 1 && !askMode && (
                <div className="ml-auto flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setStepIndex(i => Math.max(0, i - 1))}
                    disabled={stepIndex === 0}
                    className="px-2 py-1 rounded text-[10px] font-montserrat text-text-dim border border-blue-bright/15 hover:text-foreground disabled:opacity-30 transition-colors"
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    onClick={() => setStepIndex(i => Math.min(questions.length - 1, i + 1))}
                    disabled={stepIndex >= questions.length - 1}
                    className="px-2 py-1 rounded text-[10px] font-montserrat text-text-dim border border-blue-bright/15 hover:text-foreground disabled:opacity-30 transition-colors"
                  >
                    Próximo campo
                  </button>
                </div>
              )}
            </div>

            {historySlot}
          </div>
        </div>
      </div>

      {specialSlot && (
        <div className="border-t border-gold/15 p-4">{specialSlot}</div>
      )}
    </div>
  );
};
