import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, ChevronDown, Leaf, Save, ScrollText, Send, Sparkles, Check, PenLine } from 'lucide-react';
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
  const outputsLabel = outputs.map(o => OUTPUT_LABEL[o]).join(' · ');

  return (
    /* Retângulo maior — o palco de Idriel */
    <div className="relative rounded-[26px] border border-gold/20 bg-[radial-gradient(120%_100%_at_0%_100%,hsl(var(--idriel)/0.16),transparent_58%),linear-gradient(180deg,rgba(6,14,26,0.92),rgba(2,7,13,0.96))] shadow-[0_24px_70px_-24px_rgba(0,0,0,0.85)] overflow-hidden">
      {/* Brilho superior sutil */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />

      {/* Idriel — enquadrada no palco, sangrando pela esquerda */}
      <div className="pointer-events-none absolute left-0 bottom-0 z-0 w-[210px] h-[300px] sm:w-[260px] sm:h-[360px] md:w-[320px] md:h-[calc(100%-8px)] md:top-2 opacity-95 [mask-image:linear-gradient(to_right,black_62%,transparent_100%)] md:[mask-image:linear-gradient(to_right,black_78%,transparent_100%)]">
        <IdrielStateSprite state={idrielState} heightClass="h-full" className="w-full" />
      </div>

      <div className="relative z-10 p-3 sm:p-4 md:p-5 md:pl-[300px]">
        {/* Saudação — voz de Idriel */}
        <div className="mb-3 pl-[92px] sm:pl-[130px] md:pl-0">
          <p className="font-cinzel text-[19px] sm:text-[22px] leading-tight text-foreground">
            Olá, <span className="text-gold-light">Criador!</span>
          </p>
          <p className="font-merriweather text-[12.5px] text-text-dim mt-0.5">
            {config.num} · {config.name} — o que daremos vida agora?
          </p>
        </div>

        {/* Retângulo menor — a área de conversa */}
        <div className="ml-[92px] sm:ml-[130px] md:ml-0 rounded-2xl border border-gold/15 bg-[rgba(3,9,18,0.82)] backdrop-blur-md overflow-hidden shadow-[0_10px_36px_rgba(0,0,0,0.5)]">
          {/* Barra de contexto da conversa */}
          <div className="flex items-center gap-2 px-3.5 py-2 border-b border-gold/12 bg-gradient-to-r from-gold/[0.07] to-transparent">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-gold-champagne opacity-70 animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gold-champagne" />
            </span>
            <span className="font-cinzel text-[10px] uppercase tracking-[0.16em] text-gold-light">
              Conversa com Idriel
            </span>
            <span className="ml-auto inline-flex items-center gap-1 font-montserrat text-[9px] uppercase tracking-wider text-text-dim">
              <PenLine className="w-3 h-3" strokeWidth={1.75} />
              Vira {outputsLabel}
            </span>
            {questions.length > 0 && (
              <span className="font-montserrat text-[10px] text-text-dim tabular-nums pl-2 border-l border-gold/15">
                {Math.min(stepIndex + 1, questions.length)}/{questions.length}
              </span>
            )}
          </div>

          {/* Transcrição */}
          <div ref={scrollRef} className="min-h-[220px] max-h-[300px] md:max-h-[380px] overflow-y-auto px-3.5 py-3.5 space-y-3">
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
                  Salve o que criaram como {outputsLabel}.
                </p>
              </div>
            )}
          </div>

          {/* Compositor */}
          <div className="border-t border-gold/12 px-3.5 py-3 bg-[rgba(2,7,13,0.72)]">
            {/* Chips estratégicos — orientações de Idriel */}
            {!askMode && step?.suggestions?.length > 0 && (
              <div className="mb-2">
                <span className="block font-montserrat text-[9px] uppercase tracking-[0.18em] text-text-dim mb-1.5">
                  <Sparkles className="inline-block w-3 h-3 mr-1 align-[-0.15em] text-gold-champagne" strokeWidth={2} />
                  Sugestões
                </span>
                <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-0.5 px-0.5">
                  {step.suggestions.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => { setAskMode(true); setDraft(s); inputRef.current?.focus(); }}
                      className="shrink-0 px-3 py-1.5 rounded-full text-[11px] font-montserrat border border-gold/25 bg-gold/[0.04] text-text-secondary hover:text-gold-champagne hover:border-gold/50 hover:bg-gold/[0.1] transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
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
                  className={`flex-1 min-w-0 resize-y rounded-xl px-3 py-2 text-sm text-foreground font-merriweather placeholder:italic placeholder:text-text-dim/70 focus:outline-none transition-colors ${
                    askMode
                      ? 'bg-gold/[0.05] border border-gold/30 focus:border-gold/60'
                      : 'bg-[rgba(4,12,24,0.6)] border border-blue-bright/20 focus:border-blue-bright/50'
                  }`}
                />
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!draft.trim() || (askMode && (aiLoading || !canUseAI))}
                  className={`shrink-0 h-10 w-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 ${
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

            <p className="mt-1.5 font-montserrat text-[9.5px] text-text-dim/80">
              {askMode
                ? 'Idriel responde com faíscas — o texto pode virar ficha ou artigo depois.'
                : `O que você escrever aqui é registrado no Fruto e pode ser salvo como ${outputsLabel}.`}
            </p>

            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {canUseAI ? (
                <button
                  type="button"
                  onClick={() => { setAskMode(a => !a); setDraft(''); }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-montserrat font-bold uppercase tracking-wider border transition-colors ${
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

        {specialSlot && (
          <div className="mt-4 rounded-2xl border border-gold/12 bg-[rgba(3,9,18,0.6)] p-3.5">{specialSlot}</div>
        )}
      </div>
    </div>
  );
};
