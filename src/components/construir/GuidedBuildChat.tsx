import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, ChevronDown, Leaf, RotateCcw, Save, ScrollText, Send, Sparkles, Wand2 } from 'lucide-react';
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
  const [chatOpen, setChatOpen] = useState(true);
  const [pathChoice, setPathChoice] = useState(true);
  const [progress, setProgress] = useState<{ label: string; done: number; total: number } | null>(null);

  const [visualState, setVisualState] = useState<IdrielState>(OPENING_STATES[fruitId % OPENING_STATES.length]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const timers = useRef<number[]>([]);

  const step = questions[stepIndex];
  const outputs: OutputType[] = config.outputs;
  const outputsLabel = outputs.map(o => OUTPUT_LABEL[o]).join(' · ');

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };

  /** Sequência animada de falas de Idriel (imita digitação de chat). */
  const streamIdriel = useCallback((texts: { text: string; kind?: Bubble['kind'] }[], state?: IdrielState, progressLabel?: string) => {
    clearTimers();
    if (state) setVisualState(state);
    if (progressLabel) setProgress({ label: progressLabel, done: 0, total: texts.length });
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
        if (progressLabel) setProgress({ label: progressLabel, done: i + 1, total: texts.length });
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
    setProgress(null);
    setChatOpen(true);
    setPathChoice(true);

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
  const runLesson = useCallback((replay = false) => {
    setChatOpen(true);
    if (replay) setLog([]);
    pushUser(replay ? 'Reproduzir o tutorial novamente.' : 'Quero aprender sobre este Fruto.');
    const parts = config.principles.slice(0, 3).map(p => ({ text: `${p.title}\n${p.body}`, kind: 'lesson' as const }));
    streamIdriel([
      { text: `Então ouça com calma o que sei sobre ${config.name}.` },
      ...parts,
      ...(config.closing ? [{ text: config.closing }] : []),
      { text: 'Agora me diga: o que você quer criar hoje? Escolha um dos caminhos abaixo ou escreva à vontade.' },
    ], stateForEvent('tutorial'), 'Tutorial');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, streamIdriel]);

  const runCaseStudy = () => {
    setChatOpen(true);
    pushUser('Mostre um estudo de caso.');
    streamIdriel([
      { text: 'Veja como isto se sustenta em um mundo já formado:' },
      { text: config.caseStudy, kind: 'case' },
      { text: 'Quer tentar algo parecido no seu mundo? Comece por um dos caminhos abaixo.' },
    ], stateForEvent('lore_reveal'), 'Estudo de caso');
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
    <div className="blue-panel relative overflow-hidden rounded-[26px] border border-idriel/25 shadow-[0_26px_74px_-26px_rgba(0,0,0,0.9)] lg:min-h-[664px]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-idriel/60 to-transparent" />

      {/* Nicho escuro atrás da Idriel — funde melhor o recorte */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-0 hidden lg:block w-[520px]"
        style={{
          background:
            'radial-gradient(70% 62% at 34% 52%, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.82) 42%, rgba(0,0,0,0.42) 70%, transparent 100%)',
        }}
      />

      {/* Idriel — apenas desktop, tamanho fixo e centralizada verticalmente */}
      <div className="pointer-events-none absolute lg:left-[-52px] xl:left-0 top-1/2 -translate-y-1/2 z-0 hidden lg:block w-[380px] h-[620px]">
        <IdrielStateSprite state={visualState} heightClass="h-[620px]" className="w-[380px]" objectClass="object-contain object-center" />
      </div>


      <div className="relative z-10 p-4 sm:p-5 md:p-6 lg:pl-[348px] xl:pl-[404px] lg:flex lg:flex-col lg:justify-center">

        <div className="mb-5">
          <p className="font-montserrat text-[9.5px] uppercase tracking-[0.32em] text-gold-champagne/70 mb-2">
            Estúdio de Criação
          </p>
          <p className="font-cinzel text-[22px] sm:text-[27px] leading-[1.2] tracking-[0.01em] text-foreground">
            Olá, <span className="text-gold-light">Criador!</span>
          </p>
          <p className="font-merriweather text-[12.5px] leading-relaxed text-text-dim mt-1.5">
            <span className="text-text-secondary">{config.name}</span> — o que daremos vida hoje?
          </p>
          <span className="mt-3 block h-px w-24 bg-gradient-to-r from-gold/45 to-transparent" />
        </div>


        {/* Card de chat */}
        <div className="rounded-2xl border border-gold/15 bg-[rgba(3,9,18,0.86)] backdrop-blur-md overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.55)]">
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gold/10">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-gold-champagne opacity-70 animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gold-champagne" />
            </span>
            <h3 className="font-cinzel text-[13.5px] sm:text-[15px] uppercase tracking-[0.16em] text-gold-light">Tutorial do Fruto</h3>

            {progress && (
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-gold/25 bg-gold/[0.07] px-2.5 py-1 font-montserrat text-[9.5px] uppercase tracking-[0.14em] text-gold-champagne">
                {progress.label}
                <span className="tabular-nums text-text-dim">{progress.done}/{progress.total}</span>
              </span>
            )}

            <div className="ml-auto flex items-center gap-1.5">
              {questions.length > 0 && (
                <span className="font-montserrat text-[10px] text-text-dim tabular-nums pr-1">
                  {Math.min(stepIndex + 1, questions.length)}/{questions.length}
                </span>
              )}
              <button
                type="button"
                onClick={() => runLesson(true)}
                aria-label="Reiniciar o tutorial animado"
                title="Reiniciar tutorial"
                className="h-7 w-7 rounded-lg flex items-center justify-center border border-gold/25 text-gold-champagne hover:bg-gold/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.75} />
              </button>
              <button
                type="button"
                onClick={() => setChatOpen(o => !o)}
                aria-expanded={chatOpen}
                aria-label={chatOpen ? 'Recolher o tutorial' : 'Expandir o tutorial'}
                className="h-7 w-7 rounded-lg flex items-center justify-center border border-gold/25 text-gold-champagne hover:bg-gold/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 transition-colors"
              >
                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${chatOpen ? '' : '-rotate-90'}`} />
              </button>
            </div>
          </div>

          {progress && (
            <div className="h-0.5 w-full bg-gold/10">
              <div
                className="h-full bg-gradient-to-r from-gold/60 to-gold-light transition-all duration-500"
                style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
              />
            </div>
          )}

          {/* Transcrição */}
          <div ref={scrollRef} className={`${chatOpen ? 'min-h-[260px] max-h-[340px] md:max-h-[420px] py-4' : 'max-h-0 py-0'} overflow-y-auto px-4 space-y-3.5 scroll-smooth transition-all duration-300`}>

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
          <div className="border-t border-gold/10 px-4 sm:px-5 pt-5 pb-3 bg-[rgba(2,7,13,0.7)] space-y-6">
            <div className="space-y-3">
              <p className="font-montserrat text-[9px] uppercase tracking-[0.28em] text-text-dim/75">
                Caminhos de estudo
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => runLesson(false)}
                  className="inline-flex items-center gap-2.5 px-[18px] py-2.5 rounded-full text-[11.5px] font-montserrat font-medium tracking-[0.02em] border border-gold/35 bg-gold/[0.07] text-gold-champagne hover:bg-gold/15 hover:border-gold/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 transition-all"
                >
                  <BookOpen className="w-3.5 h-3.5" strokeWidth={1.75} />Aprender sobre o Fruto
                </button>
                <button
                  type="button"
                  onClick={runCaseStudy}
                  className="inline-flex items-center gap-2.5 px-[18px] py-2.5 rounded-full text-[11.5px] font-montserrat tracking-[0.02em] border border-blue-bright/25 bg-blue-bright/[0.06] text-text-secondary hover:text-foreground hover:border-blue-bright/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright/50 transition-all"
                >
                  <ScrollText className="w-3.5 h-3.5" strokeWidth={1.75} />Estudo de caso
                </button>
              </div>
            </div>

            {/* O que criar hoje */}
            {creationChips.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <h3 className="font-cinzel text-[13.5px] sm:text-[15px] uppercase tracking-[0.18em] text-gold-light whitespace-nowrap">O que você quer criar hoje?</h3>
                  <span className="h-px flex-1 bg-gradient-to-r from-gold/25 to-transparent" />
                </div>
                <div className="flex flex-wrap gap-2.5 sm:gap-3" aria-busy={typing}>
                  {typing
                    ? creationChips.map((s, i) => (

                        <span
                          key={`skeleton-${s}`}
                          aria-hidden="true"
                          className="h-[34px] rounded-full border border-blue-bright/15 bg-blue-bright/[0.05] animate-pulse"
                          style={{ width: `${Math.min(220, 70 + s.length * 6)}px`, animationDelay: `${i * 90}ms` }}
                        />
                      ))
                    : creationChips.map((s, i) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => { setAskMode(true); setDraft(s); inputRef.current?.focus(); }}
                          style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'backwards' }}
                          className="animate-fadeUp group inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-[11.5px] leading-none tracking-[0.02em] font-montserrat border border-blue-bright/25 bg-blue-bright/[0.05] text-text-secondary hover:text-foreground hover:border-blue-bright/55 hover:bg-blue-bright/[0.1] hover:shadow-[0_0_18px_-8px_hsl(var(--blue-bright)/0.8)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright/50 transition-all"
                        >
                          <Sparkles className="w-3 h-3 text-blue-light/60 group-hover:text-gold-champagne transition-colors" strokeWidth={1.75} />
                          {s}
                        </button>
                      ))}
                </div>
              </div>
            )}


            {/* Compositor */}
            <div>
              <p className="font-cinzel text-[10px] uppercase tracking-[0.22em] text-text-dim mb-2.5">
                {askMode ? 'Pergunta a Idriel · 1 gota' : step ? step.label : 'Escreva livremente'}
              </p>

              {step?.type === 'select' && !askMode ? (
                <select
                  value={values[step.fieldId] || ''}
                  onChange={e => { onFieldChange(step.fieldId, e.target.value); }}
                  className="w-full bg-[rgba(4,12,24,0.6)] border border-blue-bright/20 rounded-xl px-3.5 py-3 text-sm text-foreground font-merriweather focus:outline-none focus:border-blue-bright/50"
                >
                  <option value="">Selecione…</option>
                  {step.options?.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <div className="flex items-end gap-3">
                  <textarea
                    ref={inputRef}
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                    rows={2}
                    placeholder={askMode ? 'Pergunte a Idriel sobre este Fruto…' : (step?.placeholder || 'Escreva aqui…')}
                    className={`flex-1 min-w-0 resize-y rounded-xl px-4 py-3 text-[13.5px] text-foreground font-merriweather placeholder:italic placeholder:text-text-dim/70 focus:outline-none transition-colors ${
                      askMode ? 'bg-gold/[0.05] border border-gold/30 focus:border-gold/60'
                              : 'bg-[rgba(4,12,24,0.6)] border border-blue-bright/20 focus:border-blue-bright/50'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!draft.trim() || (askMode && (aiLoading || !canUseAI))}
                    aria-label={askMode ? 'Enviar pergunta a Idriel' : 'Registrar resposta'}
                    className={`shrink-0 h-11 w-11 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 ${
                      askMode ? 'gold-sweep text-[#1a0f00] shadow-[0_0_14px_hsl(var(--gold)/0.35)]'
                              : 'bg-blue-main hover:bg-blue-bright text-foreground'
                    }`}
                  >
                    <Send className="w-4 h-4" strokeWidth={2} />
                  </button>
                </div>
              )}
              <p className="mt-2 font-montserrat text-[9.5px] text-text-dim/80">
                O que você escrever aqui vira {outputsLabel}.
              </p>
            </div>

            {/* Navegação entre caminhos */}
            {questions.length > 1 && !askMode && (
              <div className="flex items-center justify-end gap-2">
                <button type="button" onClick={() => setStepIndex(i => Math.max(0, i - 1))} disabled={stepIndex === 0}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-montserrat text-text-dim border border-blue-bright/15 hover:text-foreground disabled:opacity-30 transition-colors">
                  Anterior
                </button>
                <button type="button" onClick={() => setStepIndex(i => Math.min(questions.length - 1, i + 1))} disabled={stepIndex >= questions.length - 1}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-montserrat text-text-dim border border-blue-bright/15 hover:text-foreground disabled:opacity-30 transition-colors">
                  Próximo
                </button>
              </div>
            )}

            {historySlot && <div className="pb-1">{historySlot}</div>}
          </div>

          {/* Opções especiais de IA — recolhidas, douradas e pulsando */}
          <div className="border-t border-gold/15 bg-[linear-gradient(180deg,rgba(2,7,13,0.8),rgba(20,13,2,0.55))] px-4 sm:px-5 py-4">
            <button
              type="button"
              onClick={() => setSpecialOpen(o => !o)}
              aria-expanded={specialOpen}
              aria-controls="idriel-powers-panel"
              className={`gold-sweep ${specialOpen ? '' : 'gold-breath'} w-full flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-[#1a0f00] border border-gold-light/50 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-light focus-visible:ring-offset-2 focus-visible:ring-offset-[#02070d] transition-all`}
            >
              <span className="relative flex items-center justify-center h-7 w-7 rounded-full bg-[#1a0f00]/15 border border-[#1a0f00]/25">
                <Wand2 className="relative w-4 h-4" strokeWidth={2} />
              </span>
              <span className="font-cinzel text-[12.5px] uppercase tracking-[0.18em] font-bold">
                Poderes de Idriel
              </span>
              <ChevronDown className={`ml-auto w-4 h-4 transition-transform duration-300 ${specialOpen ? 'rotate-180' : ''}`} />
            </button>
            {specialOpen && (
              <div id="idriel-powers-panel" className="pt-4 space-y-3.5 animate-fadeUp">
                {canUseAI ? (
                  <button
                    type="button"
                    onClick={() => { setAskMode(true); setDraft(''); inputRef.current?.focus(); }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-[10.5px] font-montserrat font-bold uppercase tracking-wider border border-gold/45 bg-gold/[0.08] text-gold-light hover:bg-gold/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5" strokeWidth={2} />Pedir ideias a Idriel · 1 gota
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
