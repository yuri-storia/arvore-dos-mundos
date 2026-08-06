import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, ChevronDown, Leaf, Save, ScrollText, Send, Sparkles, Wand2 } from 'lucide-react';
import { IdrielStateSprite } from '@/components/idriel/IdrielStateSprite';
import { IdrielMarkdown } from '@/components/IdrielMarkdown';
import { stateForEvent, type IdrielState } from '@/lib/idriel/idrielStates';
import { getFruitStudio, OUTPUT_LABEL, type OutputType } from '@/lib/construir/fruitStudioConfig';

interface Props {
  fruitId: number;
  values: Record<string, string>;
  onFieldChange: (fieldId: string, value: string) => void;
  onConsult: (question: string) => void;
  aiLoading: boolean;
  aiResponse: string;
  canUseAI: boolean;
  onSaveAs: (kind: 'ficha' | 'artigo', text: string) => void;
  onSendTimeline: (text: string) => void;
  specialSlot?: React.ReactNode;
  upgradeSlot?: React.ReactNode;
  historySlot?: React.ReactNode;
}

type Bubble = { id: string; from: 'idriel' | 'user'; text: string; kind?: 'lesson' | 'case' };

/** Ciclo das 8 primeiras imagens — cada Fruto abre com uma Idriel diferente. */
const OPENING_STATES: IdrielState[] = [
  'warm_welcome',
  'curious',
  'explaining',
  'thoughtful',
  'inspired',
  'enthusiastic',
  'determined',
  'neutral_attentive',
];

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const GuidedBuildChat: React.FC<Props> = ({
  fruitId, values, onFieldChange, onConsult, aiLoading, aiResponse,
  canUseAI, onSaveAs, onSendTimeline, specialSlot, upgradeSlot, historySlot,
}) => {
  const config = useMemo(() => getFruitStudio(fruitId), [fruitId]);
  const questions = config.questions;

  const [log, setLog] = useState<Bubble[]>([]);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState('');
  const [askMode, setAskMode] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [specialOpen, setSpecialOpen] = useState(false);
  const [visualState, setVisualState] = useState<IdrielState>(OPENING_STATES[fruitId % OPENING_STATES.length]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const timers = useRef<number[]>([]);

  const step = questions[stepIndex];
  const outputs: OutputType[] = config.outputs;
  const outputsLabel = outputs.map(o => OUTPUT_LABEL[o]).join(' · ');

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };

  /** Sequência animada de falas de Idriel (imita digitação de chat). */
  const streamIdriel = useCallback((texts: { text: string; kind?: Bubble['kind'] }[], state?: IdrielState) => {
    clearTimers();
    if (state) setVisualState(state);
    let delay = 0;
    texts.forEach((t, i) => {
      const wait = i === 0 ? 320 : Math.min(1400, 420 + t.text.length * 4);
      delay += wait;
      timers.current.push(window.setTimeout(() => {
        setTyping(true);
      }, delay - wait) as unknown as number);
      timers.current.push(window.setTimeout(() => {
        setTyping(i < texts.length - 1);
        setLog(prev => [...prev, { id: uid(), from: 'idriel', text: t.text, kind: t.kind }]);
      }, delay) as unknown as number);
    });
  }, []);

  // Reinício ao trocar de Fruto
  useEffect(() => {
    clearTimers();
    setLog([]);
    setTyping(false);
    setDraft('');
    setAskMode(false);
    setSpecialOpen(false);
    const firstUnanswered = questions.findIndex(q => !(values[q.fieldId] || '').trim());
    setStepIndex(firstUnanswered === -1 ? 0 : firstUnanswered);
    setVisualState(OPENING_STATES[fruitId % OPENING_STATES.length]);
    streamIdriel([
      { text: config.intro },
      { text: 'Podemos começar de dois jeitos: aprender sobre este Fruto, ou criar algo agora mesmo.' },
    ]);
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fruitId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [log, typing, aiResponse, aiLoading]);

  useEffect(() => {
    if (aiLoading) setVisualState(stateForEvent('ai_codex_query'));
    else if (aiResponse) setVisualState(stateForEvent('creative_discovery'));
  }, [aiLoading, aiResponse]);

  const pushUser = (text: string) => setLog(prev => [...prev, { id: uid(), from: 'user', text }]);

  /** Tutorial animado do Fruto. */
  const runLesson = () => {
    pushUser('Quero aprender sobre este Fruto.');
    const parts = config.principles.slice(0, 3).map(p => ({ text: `${p.title}\n${p.body}`, kind: 'lesson' as const }));
    streamIdriel([
      { text: `Então ouça com calma o que sei sobre ${config.name}.` },
      ...parts,
      ...(config.closing ? [{ text: config.closing }] : []),
      { text: 'Agora me diga: o que você quer criar hoje? Escolha um dos caminhos abaixo ou escreva à vontade.' },
    ], stateForEvent('tutorial'));
  };

  const runCaseStudy = () => {
    pushUser('Mostre um estudo de caso.');
    streamIdriel([
      { text: 'Veja como isto se sustenta em um mundo já formado:' },
      { text: config.caseStudy, kind: 'case' },
      { text: 'Quer tentar algo parecido no seu mundo? Comece por um dos caminhos abaixo.' },
    ], stateForEvent('lore_reveal'));
  };


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
    pushUser(text);
    onFieldChange(step.fieldId, text);
    const last = stepIndex >= questions.length - 1;
    streamIdriel([{
      text: last
        ? `Registrado em ${step.label}. Você percorreu todos os caminhos deste Fruto — agora podemos transformar isso em ${outputsLabel}.`
        : `Registrado em ${step.label}. Seguimos.`,
    }], stateForEvent(last ? 'celebrate' : 'saved'));
    setDraft('');
    if (!last) setStepIndex(stepIndex + 1);
  };

  const creationChips = step?.suggestions ?? [];

  return (
    <div className="relative overflow-hidden rounded-[26px] border border-gold/20 bg-[radial-gradient(120%_100%_at_0%_0%,hsl(var(--idriel)/0.14),transparent_58%),linear-gradient(180deg,rgba(6,14,26,0.94),rgba(2,7,13,0.97))] shadow-[0_26px_74px_-26px_rgba(0,0,0,0.9)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />

      {/* Idriel — apenas desktop/tablet, com dissolução suave para o fundo */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 z-0 hidden md:block w-[330px] lg:w-[380px]">
        <div className="absolute inset-0 [mask-image:linear-gradient(to_right,black_55%,transparent_96%)]">
          <div className="absolute inset-0 [mask-image:linear-gradient(to_bottom,black_72%,transparent_100%)]">
            <IdrielStateSprite state={visualState} heightClass="h-full" className="w-full" objectClass="object-cover object-top" />
          </div>
        </div>
        <div className="absolute inset-y-0 right-0 w-40 bg-gradient-to-l from-[rgba(2,7,13,0.96)] to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[rgba(2,7,13,0.96)] to-transparent" />
      </div>

      <div className="relative z-10 p-4 sm:p-5 md:p-6 md:pl-[350px] lg:pl-[400px]">
        <div className="mb-4">
          <p className="font-cinzel text-[21px] sm:text-[25px] leading-tight text-foreground">
            Olá, <span className="text-gold-light">Criador!</span>
          </p>
          <p className="font-merriweather text-[12.5px] text-text-dim mt-1">
            {config.name} — o que daremos vida hoje?
          </p>
        </div>

        {/* Card de chat */}
        <div className="rounded-2xl border border-gold/15 bg-[rgba(3,9,18,0.86)] backdrop-blur-md overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.55)]">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gold/10">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-gold-champagne opacity-70 animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gold-champagne" />
            </span>
            <span className="font-cinzel text-[10px] uppercase tracking-[0.18em] text-gold-light">Conversa com Idriel</span>
            {questions.length > 0 && (
              <span className="ml-auto font-montserrat text-[10px] text-text-dim tabular-nums">
                {Math.min(stepIndex + 1, questions.length)}/{questions.length}
              </span>
            )}
          </div>

          {/* Transcrição */}
          <div ref={scrollRef} className="min-h-[260px] max-h-[340px] md:max-h-[420px] overflow-y-auto px-4 py-4 space-y-3.5 scroll-smooth">
            {log.map(b => b.from === 'user' ? (
              <div key={b.id} className="flex justify-end animate-fadeUp">
                <p className="max-w-[82%] rounded-2xl rounded-br-md bg-blue-main/25 border border-blue-bright/25 px-4 py-2.5 text-[13.5px] text-foreground font-merriweather whitespace-pre-wrap">
                  {b.text}
                </p>
              </div>
            ) : (
              <div key={b.id} className="flex gap-2.5 animate-fadeUp">
                {b.kind === 'case'
                  ? <ScrollText className="w-3.5 h-3.5 text-gold-champagne shrink-0 mt-2.5" strokeWidth={1.75} />
                  : b.kind === 'lesson'
                    ? <BookOpen className="w-3.5 h-3.5 text-gold-champagne shrink-0 mt-2.5" strokeWidth={1.75} />
                    : <Leaf className="w-3.5 h-3.5 text-gold-champagne shrink-0 mt-2.5" strokeWidth={1.75} />}
                <p className="max-w-[88%] rounded-2xl rounded-bl-md bg-gold/[0.06] border border-gold/15 px-4 py-2.5 font-merriweather text-[13.5px] leading-relaxed text-text-secondary whitespace-pre-wrap">
                  {b.text}
                </p>
              </div>
            ))}

            {(typing || aiLoading) && (
              <div className="flex items-center gap-1 pl-6 text-text-dim animate-fadeUp">
                <span className="w-1.5 h-1.5 rounded-full bg-gold-champagne dot-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-gold-champagne dot-bounce-2" />
                <span className="w-1.5 h-1.5 rounded-full bg-gold-champagne dot-bounce-3" />
                {aiLoading && <span className="ml-2 font-merriweather italic text-xs">Idriel consulta o Codex…</span>}
              </div>
            )}

            {aiResponse && !aiLoading && (
              <div className="flex gap-2.5 animate-fadeUp">
                <Sparkles className="w-3.5 h-3.5 text-gold-light shrink-0 mt-2.5" strokeWidth={1.75} />
                <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-gold-light/30 bg-gold/[0.07] px-4 py-3">
                  <IdrielMarkdown>{aiResponse}</IdrielMarkdown>
                  <div className="flex flex-wrap gap-2 mt-3 pt-2.5 border-t border-gold/15">
                    {outputs.includes('ficha') && (
                      <button onClick={() => onSaveAs('ficha', aiResponse)} className="px-3 py-1.5 rounded-lg text-[10px] font-montserrat font-bold uppercase tracking-wider border border-gold/40 text-gold-light hover:bg-gold/15 transition-colors">
                        <Save className="inline-block w-3 h-3 mr-1 align-[-0.1em]" strokeWidth={1.75} />Ficha
                      </button>
                    )}
                    {outputs.includes('artigo') && (
                      <button onClick={() => onSaveAs('artigo', aiResponse)} className="px-3 py-1.5 rounded-lg text-[10px] font-montserrat font-bold uppercase tracking-wider border border-gold/40 text-gold-light hover:bg-gold/15 transition-colors">
                        <Save className="inline-block w-3 h-3 mr-1 align-[-0.1em]" strokeWidth={1.75} />Artigo
                      </button>
                    )}
                    {outputs.includes('timeline') && (
                      <button onClick={() => onSendTimeline(aiResponse)} className="px-3 py-1.5 rounded-lg text-[10px] font-montserrat font-bold uppercase tracking-wider border border-gold-champagne/50 text-gold-champagne hover:bg-gold/15 transition-colors">
                        <ScrollText className="inline-block w-3 h-3 mr-1 align-[-0.1em]" strokeWidth={1.75} />Linha do Tempo
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Ações — tutorial */}
          <div className="border-t border-gold/10 px-4 sm:px-5 pt-4 pb-2 bg-[rgba(2,7,13,0.7)] space-y-5">
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={runLesson}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-[11.5px] font-montserrat font-medium border border-gold/35 bg-gold/[0.07] text-gold-champagne hover:bg-gold/15 hover:border-gold/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 transition-all"
              >
                <BookOpen className="w-3.5 h-3.5" strokeWidth={1.75} />Aprender sobre o Fruto
              </button>
              <button
                type="button"
                onClick={runCaseStudy}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-[11.5px] font-montserrat border border-blue-bright/25 bg-blue-bright/[0.06] text-text-secondary hover:text-foreground hover:border-blue-bright/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright/50 transition-all"
              >
                <ScrollText className="w-3.5 h-3.5" strokeWidth={1.75} />Estudo de caso
              </button>
            </div>

            {/* O que criar hoje */}
            {creationChips.length > 0 && (
              <div className="space-y-2.5">
                <p className="font-cinzel text-[10px] uppercase tracking-[0.2em] text-text-dim">O que você quer criar hoje?</p>
                <div className="flex flex-wrap gap-2.5">
                  {creationChips.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => { setAskMode(true); setDraft(s); inputRef.current?.focus(); }}
                      className="px-3.5 py-2 rounded-full text-[11.5px] font-montserrat border border-blue-bright/25 bg-blue-bright/[0.05] text-text-secondary hover:text-foreground hover:border-blue-bright/55 hover:bg-blue-bright/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright/50 transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}


            {/* Compositor */}
            <div>
              <p className="font-cinzel text-[10px] uppercase tracking-[0.18em] text-text-dim mb-1.5">
                {askMode ? 'Pergunta a Idriel · 1 gota' : step ? step.label : 'Escreva livremente'}
              </p>
              {step?.type === 'select' && !askMode ? (
                <select
                  value={values[step.fieldId] || ''}
                  onChange={e => { onFieldChange(step.fieldId, e.target.value); }}
                  className="w-full bg-[rgba(4,12,24,0.6)] border border-blue-bright/20 rounded-xl px-3.5 py-2.5 text-sm text-foreground font-merriweather focus:outline-none focus:border-blue-bright/50"
                >
                  <option value="">Selecione…</option>
                  {step.options?.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <div className="flex items-end gap-2.5">
                  <textarea
                    ref={inputRef}
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                    rows={2}
                    placeholder={askMode ? 'Pergunte a Idriel sobre este Fruto…' : (step?.placeholder || 'Escreva aqui…')}
                    className={`flex-1 min-w-0 resize-y rounded-xl px-3.5 py-2.5 text-[13.5px] text-foreground font-merriweather placeholder:italic placeholder:text-text-dim/70 focus:outline-none transition-colors ${
                      askMode ? 'bg-gold/[0.05] border border-gold/30 focus:border-gold/60'
                              : 'bg-[rgba(4,12,24,0.6)] border border-blue-bright/20 focus:border-blue-bright/50'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!draft.trim() || (askMode && (aiLoading || !canUseAI))}
                    aria-label={askMode ? 'Enviar pergunta a Idriel' : 'Registrar resposta'}
                    className={`shrink-0 h-11 w-11 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 ${
                      askMode ? 'bg-gradient-to-r from-gold-deep via-gold-warm to-gold text-[#1a0f00] shadow-[0_0_14px_hsl(var(--gold)/0.35)]'
                              : 'bg-blue-main hover:bg-blue-bright text-foreground'
                    }`}
                  >
                    <Send className="w-4 h-4" strokeWidth={2} />
                  </button>
                </div>
              )}
              <p className="mt-1.5 font-montserrat text-[9.5px] text-text-dim/80">
                O que você escrever aqui vira {outputsLabel}.
              </p>
            </div>

            {/* Navegação entre caminhos */}
            {questions.length > 1 && !askMode && (
              <div className="flex items-center justify-end gap-1.5">
                <button type="button" onClick={() => setStepIndex(i => Math.max(0, i - 1))} disabled={stepIndex === 0}
                  className="px-2.5 py-1.5 rounded-lg text-[10px] font-montserrat text-text-dim border border-blue-bright/15 hover:text-foreground disabled:opacity-30 transition-colors">
                  Anterior
                </button>
                <button type="button" onClick={() => setStepIndex(i => Math.min(questions.length - 1, i + 1))} disabled={stepIndex >= questions.length - 1}
                  className="px-2.5 py-1.5 rounded-lg text-[10px] font-montserrat text-text-dim border border-blue-bright/15 hover:text-foreground disabled:opacity-30 transition-colors">
                  Próximo
                </button>
              </div>
            )}

            {historySlot && <div className="pb-1">{historySlot}</div>}
          </div>

          {/* Opções especiais de IA — recolhidas e pulsando */}
          <div className="border-t border-gold/15 bg-[linear-gradient(180deg,rgba(2,7,13,0.75),rgba(20,13,2,0.5))]">
            <button
              type="button"
              onClick={() => setSpecialOpen(o => !o)}
              className="w-full flex items-center gap-2 px-4 py-3 text-left group"
            >
              <span className="relative flex items-center justify-center h-6 w-6 rounded-full bg-gold/15 border border-gold/40">
                <span className="absolute inset-0 rounded-full bg-gold/25 animate-ping opacity-60" />
                <Wand2 className="relative w-3.5 h-3.5 text-gold-light" strokeWidth={1.9} />
              </span>
              <span className="font-cinzel text-[11px] uppercase tracking-[0.16em] text-gold-light">
                Poderes de Idriel
              </span>
              <ChevronDown className={`ml-auto w-4 h-4 text-gold-champagne transition-transform ${specialOpen ? 'rotate-180' : ''}`} />
            </button>
            {specialOpen && (
              <div className="px-4 pb-4 space-y-3 animate-fadeUp">
                {canUseAI ? (
                  <button
                    type="button"
                    onClick={() => { setAskMode(true); setDraft(''); inputRef.current?.focus(); }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[10px] font-montserrat font-bold uppercase tracking-wider bg-gradient-to-r from-gold-deep via-gold-warm to-gold text-[#1a0f00] shadow-[0_0_16px_-4px_hsl(var(--gold)/0.6)] hover:brightness-110 transition-all"
                  >
                    <Sparkles className="w-3 h-3" strokeWidth={2} />Pedir ideias a Idriel · 1 gota
                  </button>
                ) : upgradeSlot}
                {specialSlot && (
                  <div className="rounded-2xl border border-gold/15 bg-[rgba(3,9,18,0.6)] p-4">{specialSlot}</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
