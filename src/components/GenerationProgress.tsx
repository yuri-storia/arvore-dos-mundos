import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Loader2, AlertTriangle, Droplet } from 'lucide-react';
import idrielAvatar from '@/assets/idriel-avatar.webp';

/**
 * Progresso detalhado da geração visual (Visões e Mapas).
 *
 * A chamada ao servidor é única, então os estágios "prompt/gerando/convertendo"
 * avançam por estimativa de tempo; "salvando" e "cobrando gotas" são marcados
 * explicitamente pelo chamador quando as etapas reais acontecem no cliente.
 */

export type GenStageId = 'prompt' | 'generating' | 'converting' | 'saving' | 'charging';

interface StageDef {
  id: GenStageId;
  label: string;
  hint: string;
  /** Duração estimada em segundos (usada para o avanço sintético da barra). */
  est: number;
}

const STAGES: StageDef[] = [
  { id: 'prompt',     label: 'Compilando o prompt',   hint: 'Idriel traduz sua descrição com o contexto do mundo', est: 10 },
  { id: 'generating', label: 'Gerando a imagem',      hint: 'O modelo desenha em alta resolução',                  est: 60 },
  { id: 'converting', label: 'Convertendo o arquivo', hint: 'Preparando o PNG final',                              est: 6 },
  { id: 'saving',     label: 'Salvando no acervo',    hint: 'Enviando para o armazenamento seguro',                est: 5 },
  { id: 'charging',   label: 'Cobrando as gotas',     hint: 'Atualizando seu saldo de Elixir',                     est: 2 },
];

const TOTAL_EST = STAGES.reduce((s, st) => s + st.est, 0);
const indexOf = (id: GenStageId) => STAGES.findIndex(s => s.id === id);
const baseFor = (i: number) => STAGES.slice(0, i).reduce((s, st) => s + st.est, 0) / TOTAL_EST;

export interface GenerationProgressState {
  active: boolean;
  status: 'running' | 'done' | 'failed';
  stage: GenStageId;
  stageIndex: number;
  pct: number;
  elapsed: number;
  error?: string;
}

export interface GenerationProgressController extends GenerationProgressState {
  start: () => void;
  setStage: (id: GenStageId) => void;
  succeed: () => void;
  fail: (message?: string) => void;
  reset: () => void;
}

export function useGenerationProgress(): GenerationProgressController {
  const [state, setState] = useState<{
    active: boolean;
    status: 'running' | 'done' | 'failed';
    stage: GenStageId;
    startedAt: number;
    stageStartedAt: number;
    error?: string;
  }>({ active: false, status: 'running', stage: 'prompt', startedAt: 0, stageStartedAt: 0 });

  const [now, setNow] = useState(() => Date.now());
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (state.active && state.status === 'running') {
      timer.current = window.setInterval(() => setNow(Date.now()), 150);
      return () => { if (timer.current) window.clearInterval(timer.current); };
    }
    if (timer.current) window.clearInterval(timer.current);
  }, [state.active, state.status]);

  const start = useCallback(() => {
    const t = Date.now();
    setNow(t);
    setState({ active: true, status: 'running', stage: 'prompt', startedAt: t, stageStartedAt: t, error: undefined });
  }, []);

  const setStage = useCallback((id: GenStageId) => {
    setState(prev => prev.active && prev.status === 'running' && prev.stage !== id
      ? { ...prev, stage: id, stageStartedAt: Date.now() }
      : prev);
  }, []);

  const succeed = useCallback(() => {
    setState(prev => prev.active ? { ...prev, status: 'done', stage: 'charging' } : prev);
  }, []);

  const fail = useCallback((message?: string) => {
    setState(prev => prev.active ? { ...prev, status: 'failed', error: message } : prev);
  }, []);

  const reset = useCallback(() => {
    setState({ active: false, status: 'running', stage: 'prompt', startedAt: 0, stageStartedAt: 0 });
  }, []);

  // Avanço automático de "gerando" → "convertendo" quando a estimativa estoura.
  const stageIndex = indexOf(state.stage);
  useEffect(() => {
    if (!state.active || state.status !== 'running' || state.stage !== 'generating') return;
    const over = (now - state.stageStartedAt) / 1000 > STAGES[indexOf('generating')].est;
    if (over) setStage('converting');
  }, [now, state.active, state.status, state.stage, state.stageStartedAt, setStage]);

  const { pct, elapsed } = useMemo(() => {
    if (!state.active) return { pct: 0, elapsed: 0 };
    const el = Math.max(0, (now - state.startedAt) / 1000);
    if (state.status === 'done') return { pct: 100, elapsed: el };
    const def = STAGES[stageIndex];
    const inStage = Math.max(0, (now - state.stageStartedAt) / 1000);
    const frac = Math.min(inStage / def.est, 0.97);
    const raw = (baseFor(stageIndex) + (def.est / TOTAL_EST) * frac) * 100;
    return { pct: Math.min(Math.round(raw), 98), elapsed: el };
  }, [now, state, stageIndex]);

  return {
    active: state.active,
    status: state.status,
    stage: state.stage,
    stageIndex,
    pct: state.status === 'failed' ? pct : pct,
    elapsed,
    error: state.error,
    start, setStage, succeed, fail, reset,
  };
}

const fmt = (s: number) => {
  const t = Math.floor(s);
  return t < 60 ? `${t}s` : `${Math.floor(t / 60)}min ${String(t % 60).padStart(2, '0')}s`;
};

interface Props {
  state: GenerationProgressState;
  /** Rótulo do custo, ex.: "16 gotas". */
  cost?: string;
  /** Versão enxuta para linhas de histórico. */
  compact?: boolean;
  title?: string;
  className?: string;
}

export const GenerationProgress: React.FC<Props> = ({ state, cost, compact, title, className }) => {
  if (!state.active) return null;
  const { status, stageIndex, pct, elapsed, error } = state;
  const barColor = status === 'failed'
    ? 'bg-red-alert/70'
    : status === 'done'
      ? 'bg-emerald-500/70'
      : 'bg-gradient-to-r from-gold/60 via-gold to-gold/60';
  const current = STAGES[stageIndex];

  if (compact) {
    const label = status === 'failed'
      ? `Falhou · ${error || 'erro'}`
      : status === 'done' ? 'Concluído' : `${current.label}…`;
    return (
      <div className={`w-full ${className || ''}`}>
        <div className="flex items-center justify-between mb-1">
          <span className={`text-[9px] font-montserrat ${status === 'failed' ? 'text-red-alert' : status === 'done' ? 'text-emerald-400' : 'text-gold-light/85'}`}>
            {label}
          </span>
          <span className="text-[9px] font-montserrat text-text-dim/70">{status === 'done' ? '100' : pct}% · {fmt(elapsed)}</span>
        </div>
        <div className="h-1 rounded-full bg-gold/10 overflow-hidden">
          <div className={`h-full ${barColor} transition-all duration-300`} style={{ width: `${status === 'done' ? 100 : pct}%` }} />
        </div>
      </div>
    );
  }

  return (
    <div className={`animate-fadeUp card-glass rounded-xl border border-gold/20 p-4 ${className || ''}`} aria-live="polite">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gold/60 shadow-[0_0_16px_rgba(218,165,32,0.4)] shrink-0">
          <img src={idrielAvatar} alt="Idriel" className="w-full h-full object-cover object-top" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-cinzel text-xs text-gold-light truncate">
            {title || (status === 'failed' ? 'A canalização falhou' : status === 'done' ? 'Pronto!' : 'Idriel está trabalhando…')}
          </p>
          <p className="font-merriweather italic text-[10px] text-text-dim truncate">
            {status === 'failed' ? (error || 'Tente novamente em instantes.') : current.hint}
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="font-montserrat text-xs font-bold text-gold-light">{status === 'done' ? 100 : pct}%</div>
          <div className="font-montserrat text-[9px] text-text-dim/70">{fmt(elapsed)}</div>
        </div>
      </div>

      <div className="h-1.5 rounded-full bg-gold/10 overflow-hidden mb-3">
        <div className={`h-full rounded-full ${barColor} transition-all duration-300`} style={{ width: `${status === 'done' ? 100 : pct}%` }} />
      </div>

      <ul className="space-y-1.5">
        {STAGES.map((st, i) => {
          const done = status === 'done' || i < stageIndex;
          const isCurrent = status === 'running' && i === stageIndex;
          const isFailed = status === 'failed' && i === stageIndex;
          return (
            <li key={st.id} className="flex items-center gap-2">
              <span className="w-4 h-4 flex items-center justify-center shrink-0">
                {isFailed ? <AlertTriangle className="w-3.5 h-3.5 text-red-alert" strokeWidth={2} />
                  : done ? <Check className="w-3.5 h-3.5 text-emerald-400" strokeWidth={2.5} />
                  : isCurrent ? <Loader2 className="w-3.5 h-3.5 text-gold animate-spin" strokeWidth={2} />
                  : <span className="w-1.5 h-1.5 rounded-full bg-gold/25" />}
              </span>
              <span className={`font-montserrat text-[11px] ${isFailed ? 'text-red-alert' : done ? 'text-emerald-400/80' : isCurrent ? 'text-gold-light' : 'text-text-dim/60'}`}>
                {st.label}
              </span>
            </li>
          );
        })}
      </ul>

      {cost && status !== 'failed' && (
        <p className="mt-3 pt-2 border-t border-gold/10 inline-flex items-center gap-1 font-montserrat text-[10px] text-gold-champagne">
          <Droplet className="w-3 h-3" strokeWidth={1.75} />
          {status === 'done' ? `${cost} debitadas` : `${cost} serão debitadas ao concluir`}
        </p>
      )}
    </div>
  );
};
