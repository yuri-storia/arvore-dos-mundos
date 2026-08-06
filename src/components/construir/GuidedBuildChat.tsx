import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, BookOpen, ChevronDown, Leaf, PenLine, RotateCcw, Save, ScrollText, Send, Sparkles, Wand2 } from 'lucide-react';
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
  const [chatOpen, setChatOpen] = useState(false);
  const [pathChoice, setPathChoice] = useState(true);
  const [progress, setProgress] = useState<{ label: string; done: number; total: number } | null>(null);

  const [visualState, setVisualState] = useState<IdrielState>(OPENING_STATES[fruitId % OPENING_STATES.length]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const timers = useRef<number[]>([]);

  const step = questions[stepIndex];
  /** Campo alvo da escrita livre — se o passo atual for um select, usa o primeiro campo de texto. */
  const freeStep = step?.type === 'select' ? (questions.find(q => q.type !== 'select') ?? step) : step;
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
    setChatOpen(false);
    setPathChoice(true);

    const firstUnanswered = questions.findIndex(q => !(values[q.fieldId] || '').trim());
    setStepIndex(firstUnanswered === -1 ? 0 : firstUnanswered);
    setVisualState(OPENING_STATES[fruitId % OPENING_STATES.length]);
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fruitId]);

  /** Alterna o Tutorial do Fruto — as falas de Idriel só começam na primeira abertura. */
  const toggleChat = useCallback(() => {
    setChatOpen(open => {
      const next = !open;
      if (next) {
        setLog(prev => {
          if (prev.length === 0) {
            streamIdriel([
              { text: config.intro },
              { text: 'Podemos começar de dois jeitos: aprender sobre este Fruto, ou criar algo agora mesmo.' },
            ]);
          }
          return prev;
        });
      } else {
        clearTimers();
        setTyping(false);
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, streamIdriel]);


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
    setPathChoice(false);
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
    setPathChoice(false);
    pushUser('Mostre um estudo de caso.');
    streamIdriel([
      { text: 'Veja como isto se sustenta em um mundo já formado:' },
      { text: config.caseStudy, kind: 'case' },
      { text: 'Quer tentar algo parecido no seu mundo? Comece por um dos caminhos abaixo.' },
    ], stateForEvent('lore_reveal'), 'Estudo de caso');
  };

  /** Sai do modo "pergunta a Idriel" sem precisar trocar de Fruto. */
  const cancelAsk = () => {
    setAskMode(false);
    setDraft('');
    setVisualState(OPENING_STATES[fruitId % OPENING_STATES.length]);
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
    if (!freeStep) return;
    pushUser(text);
    onFieldChange(freeStep.fieldId, text);
    const last = stepIndex >= questions.length - 1;
    streamIdriel([{
      text: last
        ? `Registrado em ${freeStep.label}. Você percorreu todos os caminhos deste Fruto — agora podemos transformar isso em ${outputsLabel}.`
        : `Registrado em ${freeStep.label}. Seguimos.`,
    }], stateForEvent(last ? 'celebrate' : 'saved'));
    setDraft('');
    if (!last) setStepIndex(stepIndex + 1);
  };

  const creationChips = step?.suggestions ?? [];

  return (
    <div className="blue-panel relative overflow-hidden rounded-[26px] border border-idriel/25 shadow-[0_26px_74px_-26px_rgba(0,0,0,0.9)] lg:min-h-[780px]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-idriel/60 to-transparent" />

      {/* Nicho escuro atrás da Idriel — funde melhor o recorte */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-0 hidden lg:block w-[700px]"
        style={{
          background:
            'radial-gradient(74% 68% at 30% 50%, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.88) 46%, rgba(0,0,0,0.48) 74%, transparent 100%)',
        }}
      />

      {/* Idriel — apenas desktop, tamanho fixo e centralizada verticalmente */}
      <div className="pointer-events-none absolute lg:left-[-48px] xl:left-[8px] top-1/2 -translate-y-1/2 z-0 hidden lg:block w-[540px] h-[820px]">
        <IdrielStateSprite state={visualState} heightClass="h-[820px]" className="w-[540px]" objectClass="object-contain object-center" />
      </div>


      <div className="relative z-10 p-4 sm:p-5 md:p-6 lg:pl-[420px] xl:pl-[500px] lg:flex lg:flex-col lg:justify-center">

        <div className="mb-5 flex items-start gap-3">
          {/* Idriel em miniatura — só onde o retrato completo não cabe */}
          <span className="lg:hidden shrink-0 mt-0.5 h-12 w-12 rounded-full overflow-hidden border border-gold/40 bg-[radial-gradient(circle_at_50%_30%,rgba(0,0,0,0.6),rgba(2,7,13,0.95))] shadow-[0_0_18px_-6px_hsl(var(--gold)/0.8)]">
            <IdrielStateSprite state={visualState} heightClass="h-12" className="w-12" objectClass="object-cover object-top scale-[1.6] origin-top" fadeBottom={false} />
          </span>
          <div className="min-w-0">
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
        </div>


        {/* Card de chat */}
        <div className="rounded-2xl border border-gold/15 bg-[rgba(3,9,18,0.86)] backdrop-blur-md overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.55)]">
          <div
            role="button"
            tabIndex={0}
            aria-expanded={chatOpen}
            aria-label={chatOpen ? 'Recolher o Tutorial do Fruto' : 'Expandir o Tutorial do Fruto'}
            onClick={toggleChat}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleChat(); } }}
            className="flex items-center gap-2.5 px-4 py-3 border-b border-gold/25 cursor-pointer select-none bg-gradient-to-r from-gold/25 via-gold/15 to-gold/5 hover:from-gold/35 hover:via-gold/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
          >
            <span className="lg:hidden shrink-0 h-8 w-8 rounded-full overflow-hidden border border-gold/40 bg-[rgba(2,7,13,0.9)]">
              <IdrielStateSprite state={visualState} heightClass="h-8" className="w-8" objectClass="object-cover object-top scale-[1.6] origin-top" fadeBottom={false} />
            </span>
            <span className="relative hidden lg:flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-gold-champagne opacity-70 animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gold-champagne" />
            </span>
            <h3 className="font-cinzel text-[13.5px] sm:text-[15px] uppercase tracking-[0.16em] text-gold-light animate-pulse">Tutorial do Fruto</h3>

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
                onClick={(e) => { e.stopPropagation(); runLesson(true); }}
                aria-label="Reiniciar o tutorial animado"
                title="Reiniciar tutorial"
                className="h-7 w-7 rounded-lg flex items-center justify-center border border-gold/25 text-gold-champagne hover:bg-gold/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.75} />
              </button>
              <span
                aria-hidden
                className="h-7 w-7 rounded-lg flex items-center justify-center border border-gold/25 text-gold-champagne"
              >
                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${chatOpen ? '' : '-rotate-90'}`} />
              </span>
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

            {/* Decisão dentro do diálogo — caminhos de estudo (grátis) */}
            {pathChoice && !typing && log.length > 0 && (
              <div className="animate-fadeUp pl-6">
                <p className="font-montserrat text-[9px] uppercase tracking-[0.28em] text-text-dim/75 mb-2.5">
                  Sua decisão · sem custo de elixir
                </p>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={() => runLesson(false)}
                    className="inline-flex items-center gap-2.5 px-[18px] py-2.5 rounded-full text-[11.5px] font-montserrat tracking-[0.02em] border border-blue-bright/30 bg-blue-bright/[0.06] text-text-secondary hover:text-foreground hover:border-blue-bright/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright/50 transition-all"
                  >
                    <BookOpen className="w-3.5 h-3.5" strokeWidth={1.75} />Aprender sobre o Fruto
                  </button>
                  <button
                    type="button"
                    onClick={runCaseStudy}
                    className="inline-flex items-center gap-2.5 px-[18px] py-2.5 rounded-full text-[11.5px] font-montserrat tracking-[0.02em] border border-blue-bright/30 bg-blue-bright/[0.06] text-text-secondary hover:text-foreground hover:border-blue-bright/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright/50 transition-all"
                  >
                    <ScrollText className="w-3.5 h-3.5" strokeWidth={1.75} />Estudo de caso
                  </button>
                </div>
              </div>
            )}



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

          {/* Ações */}
          <div className="border-t border-gold/10 px-4 sm:px-5 pt-5 pb-4 bg-[rgba(2,7,13,0.7)] space-y-7">

            {/* 1 · Espaço livre de escrita — sem custo, salvável no Codex */}
            <div className={askMode ? 'rounded-2xl border border-gold/30 bg-gold/[0.04] p-3.5 -mx-1' : undefined}>
              <div className="flex flex-wrap items-center gap-2 mb-2.5">
                {askMode ? (
                  <>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/[0.1] px-2.5 py-1 font-cinzel text-[9.5px] uppercase tracking-[0.18em] text-gold-light">
                      <Wand2 className="w-3 h-3" strokeWidth={2} />Função de Idriel · 1 gota
                    </span>
                    <button
                      type="button"
                      onClick={cancelAsk}
                      className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-blue-bright/25 px-3 py-1 font-montserrat text-[9.5px] uppercase tracking-[0.14em] text-text-dim hover:text-foreground hover:border-blue-bright/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright/50 transition-colors"
                    >
                      <ArrowLeft className="w-3 h-3" strokeWidth={2} />Voltar
                    </button>
                  </>
                ) : (
                  <>
                    <h3 className="font-cinzel text-[13px] sm:text-[14.5px] uppercase tracking-[0.16em] text-blue-light">
                      {freeStep ? freeStep.label : 'Escreva livremente'}
                    </h3>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-bright/30 bg-blue-bright/[0.07] px-2.5 py-1 font-montserrat text-[9px] uppercase tracking-[0.16em] text-blue-light">
                      <PenLine className="w-3 h-3" strokeWidth={2} />Brainstorming livre · sem custo
                    </span>
                    <span className="h-px flex-1 min-w-[24px] bg-gradient-to-r from-blue-bright/25 to-transparent" />
                  </>
                )}
              </div>

              {step?.type === 'select' && !askMode && (
                <select
                  value={values[step.fieldId] || ''}
                  onChange={e => { onFieldChange(step.fieldId, e.target.value); }}
                  aria-label={step.label}
                  className="w-full mb-3 bg-[rgba(4,12,24,0.6)] border border-blue-bright/20 rounded-xl px-3.5 py-3 text-sm text-foreground font-merriweather focus:outline-none focus:border-blue-bright/50"
                >
                  <option value="">{step.label} — selecione…</option>
                  {step.options?.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              )}

              <div className="relative">
                <textarea
                  ref={inputRef}
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                  rows={3}
                  placeholder={askMode ? 'Pergunte a Idriel sobre este Fruto…' : (freeStep?.placeholder || 'Escreva livremente as suas ideias…')}
                  className={`w-full resize-y rounded-xl pl-4 pr-16 py-3 text-[13.5px] text-foreground font-merriweather placeholder:italic placeholder:text-text-dim/70 focus:outline-none transition-colors ${
                    askMode ? 'bg-gold/[0.05] border border-gold/30 focus:border-gold/60'
                            : 'bg-[rgba(4,12,24,0.6)] border border-blue-bright/20 focus:border-blue-bright/50'
                  }`}
                />
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!draft.trim() || (askMode && (aiLoading || !canUseAI))}
                  aria-label={askMode ? 'Enviar pergunta a Idriel' : 'Registrar anotação'}
                  className={`absolute right-2.5 bottom-3 h-9 w-9 rounded-lg flex items-center justify-center transition-all disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 ${
                    askMode ? 'gold-sweep text-[#1a0f00] shadow-[0_0_14px_hsl(var(--gold)/0.35)]'
                            : 'bg-blue-main hover:bg-blue-bright text-foreground'
                  }`}
                >
                  <Send className="w-4 h-4" strokeWidth={2} />
                </button>
              </div>
              <p className="mt-2 font-montserrat text-[9.5px] leading-relaxed text-text-dim/85">
                {askMode
                  ? 'Idriel responderá com base no seu Codex — esta ação consome 1 gota de elixir.'
                  : `Espaço de brainstorming: escreva sem custo e sem chamar Idriel. Tudo o que ficar aqui pode ser salvo no Codex como ${outputsLabel}.`}
              </p>
            </div>

            {/* Navegação entre caminhos */}
            {questions.length > 1 && !askMode && (
              <div className="flex items-center justify-end gap-2 -mt-3">
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

            {/* 2 · Peça ajuda a Idriel — funções douradas (1 gota) */}
            <div className="space-y-3.5 rounded-2xl border border-gold/20 bg-[linear-gradient(180deg,rgba(20,13,2,0.35),rgba(2,7,13,0.35))] p-4">
              <div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <h3 className="font-cinzel text-[14px] sm:text-[15.5px] uppercase tracking-[0.18em] text-gold-light">Peça ajuda a Idriel</h3>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/35 bg-gold/[0.08] px-2.5 py-1 font-montserrat text-[9px] uppercase tracking-[0.16em] text-gold-champagne">
                    <Wand2 className="w-3 h-3" strokeWidth={2} />1 gota por pedido
                  </span>
                  <span className="h-px flex-1 min-w-[24px] bg-gradient-to-r from-gold/25 to-transparent" />
                </div>
                <p className="mt-1.5 font-merriweather text-[12px] leading-relaxed text-text-dim">
                  Idriel estuda o seu Codex e dá ideias complementares a tudo o que você já criou até aqui.
                </p>
              </div>

              {canUseAI ? (
                <div className="flex flex-wrap gap-2.5 sm:gap-3" aria-busy={typing}>
                  {typing
                    ? creationChips.map((s, i) => (
                        <span
                          key={`skeleton-${s}`}
                          aria-hidden="true"
                          className="h-[36px] rounded-full border border-gold/15 bg-gold/[0.05] animate-pulse"
                          style={{ width: `${Math.min(220, 70 + s.length * 6)}px`, animationDelay: `${i * 90}ms` }}
                        />
                      ))
                    : creationChips.map((s, i) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => { setAskMode(true); setDraft(s); inputRef.current?.focus(); }}
                          aria-label={`${s} — pedir ideias a Idriel, custa 1 gota de elixir`}
                          style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'backwards' }}
                          className="animate-fadeUp gold-sweep inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-[11.5px] leading-none tracking-[0.02em] font-montserrat font-semibold text-[#1a0f00] border border-gold-light/50 hover:brightness-110 hover:shadow-[0_0_20px_-6px_hsl(var(--gold)/0.9)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-light transition-all"
                        >
                          <Sparkles className="w-3 h-3" strokeWidth={2} />
                          {s}
                          <span className="ml-1 rounded-full bg-[#1a0f00]/15 border border-[#1a0f00]/25 px-1.5 py-0.5 text-[8.5px] uppercase tracking-[0.12em]">1 gota</span>
                        </button>
                      ))}
                  <button
                    type="button"
                    onClick={() => { setAskMode(true); setDraft(''); inputRef.current?.focus(); }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-[11.5px] font-montserrat tracking-[0.02em] border border-gold/40 bg-gold/[0.08] text-gold-light hover:bg-gold/[0.18] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5" strokeWidth={2} />Escrever meu próprio pedido
                  </button>
                </div>
              ) : upgradeSlot}
            </div>

            {historySlot && <div className="pb-1">{historySlot}</div>}
          </div>

          {/* Crie Mapas com Idriel — exclusivo do Fruto "Mapa do Mundo" */}
          {config.special === 'map' && specialSlot && (
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
                  Crie Mapas com Idriel
                </span>
                <ChevronDown className={`ml-auto w-4 h-4 transition-transform duration-300 ${specialOpen ? 'rotate-180' : ''}`} />
              </button>
              {specialOpen && (
                <div id="idriel-powers-panel" className="pt-4 animate-fadeUp">
                  <div className="rounded-2xl border border-gold/15 bg-[rgba(3,9,18,0.6)] p-4">{specialSlot}</div>
                </div>
              )}
            </div>
          )}


        </div>
      </div>
    </div>
  );
};
