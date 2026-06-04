import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Trees, X, ScrollText, Trash2, Droplet, Droplets, Leaf, Sparkles, RefreshCw, Check } from 'lucide-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { FRUITS } from '@/lib/data';
import { callAIText, friendlyAIError } from '@/lib/helpers';
import type { CodexEntry } from '@/hooks/useCodexEntries';
import { useSubscription } from '@/hooks/useSubscription';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

import ReactMarkdown from 'react-markdown';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import idrielAvatar from '@/assets/idriel-avatar.png';

interface Props {
  entries: CodexEntry[];
  worldId: string;
  onClose: () => void;
}

interface AnalysisRecord {
  id: string;
  analysis_text: string;
  entry_count: number;
  ficha_count: number;
  artigo_count: number;
  covered_fruits: number;
  created_at: string;
}

const ANALYSIS_COST = 1;

const IDRIEL_NAME = 'Idriel';
const IDRIEL_TITLE = 'Guardiã da Árvore dos Mundos';

const LOADING_STEPS = [
  { message: 'Abrindo os galhos da Árvore para enxergar seu mundo…', delay: 0 },
  { message: 'Analisando suas fichas de personagens, criaturas e lugares…', delay: 3000 },
  { message: 'Agora, vou percorrer seus artigos e anotações…', delay: 7000 },
  { message: 'Verificando a cobertura de cada Fruto do worldbuilding…', delay: 11000 },
  { message: 'Quase lá… estou reunindo minhas considerações finais…', delay: 16000 },
  { message: 'Tecendo a sabedoria dos Frutos em minha avaliação…', delay: 21000 },
];

export const CodexAnalysis: React.FC<Props> = ({ entries, worldId, onClose }) => {
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [history, setHistory] = useState<AnalysisRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [viewingHistoryId, setViewingHistoryId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [revealedChars, setRevealedChars] = useState(0);
  const [isRevealing, setIsRevealing] = useState(false);
  const revealTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sub = useSubscription();
  const planLimits = usePlanLimits();
  const { user } = useAuth();

  const creditsRemaining = sub.creditLimit - sub.creditsUsed;
  const canAnalyze = planLimits.canUseAI && creditsRemaining >= ANALYSIS_COST;

  // Fetch history on mount (escopado ao mundo ativo)
  const fetchHistory = useCallback(async () => {
    if (!user || !worldId) { setHistoryLoading(false); return; }
    const { data, error: err } = await supabase
      .from('world_analyses')
      .select('*')
      .eq('user_id', user.id)
      .eq('world_id', worldId)
      .order('created_at', { ascending: false });
    if (!err && data) setHistory(data as AnalysisRecord[]);
    setHistoryLoading(false);
  }, [user, worldId]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // Animated loading steps
  useEffect(() => {
    if (!loading) { setCurrentStep(0); return; }
    const timers = LOADING_STEPS.map((step, i) =>
      setTimeout(() => setCurrentStep(i), step.delay)
    );
    return () => timers.forEach(clearTimeout);
  }, [loading]);

  // Typewriter reveal effect
  useEffect(() => {
    if (!isRevealing || !analysis) return;
    const totalLen = analysis.length;
    const charsPerTick = Math.max(3, Math.ceil(totalLen / 300)); // reveal in ~300 ticks (~6s)
    revealTimerRef.current = setInterval(() => {
      setRevealedChars(prev => {
        const next = prev + charsPerTick;
        if (next >= totalLen) {
          if (revealTimerRef.current) clearInterval(revealTimerRef.current);
          setIsRevealing(false);
          return totalLen;
        }
        return next;
      });
    }, 20);
    return () => { if (revealTimerRef.current) clearInterval(revealTimerRef.current); };
  }, [isRevealing, analysis]);

  // Compute visible text (snap to last complete line to avoid broken markdown)
  const displayedAnalysis = useMemo(() => {
    if (!analysis) return '';
    if (!isRevealing && revealedChars >= analysis.length) return analysis;
    if (viewingHistoryId) return analysis; // history = instant
    const slice = analysis.slice(0, revealedChars);
    const lastNewline = slice.lastIndexOf('\n');
    return lastNewline > 0 ? slice.slice(0, lastNewline) : slice;
  }, [analysis, revealedChars, isRevealing, viewingHistoryId]);

  const buildPrompt = () => {
    const lines: string[] = [];
    FRUITS.forEach(fruit => {
      const fruitEntries = entries.filter(e => e.fruit_id === fruit.id);
      if (fruitEntries.length === 0) {
        lines.push(`## ${fruit.name}\nNenhuma entrada criada.\n`);
        return;
      }
      lines.push(`## ${fruit.name} (${fruitEntries.length} entradas)`);
      fruitEntries.forEach(e => {
        const typeLabel = e.entry_type === 'ficha' ? 'Ficha' : 'Artigo';
        const contentPreview = (e.content || '').slice(0, 600);
        lines.push(`### ${typeLabel}: ${e.title}`);
        lines.push(contentPreview || '(sem conteúdo)');
        lines.push('');
      });
    });
    const orphans = entries.filter(e => e.fruit_id === null);
    if (orphans.length > 0) {
      lines.push(`## Sem fruto associado (${orphans.length})`);
      orphans.forEach(e => {
        lines.push(`- ${e.title}: ${(e.content || '').slice(0, 200)}`);
      });
    }
    return lines.join('\n');
  };

  const handleAnalyze = async () => {
    if (entries.length === 0 || !canAnalyze || !user) return;
    setLoading(true);
    setError('');
    setAnalysis('');
    setViewingHistoryId(null);
    setShowHistory(false);

    const systemPrompt = `Você é ${IDRIEL_NAME}, a ${IDRIEL_TITLE} — uma sábia ancestral élfica que observa mundos florescerem. Fale com elegância, sofisticação e sabedoria contida. Seja objetiva, concisa e premium. Trate o usuário como "viajante".

REGRAS DE ESTILO INVIOLÁVEIS:
- NÃO use emojis em nenhuma circunstância (sem 🌟, ⭐, ✨, 🌿, 🌳, etc.). A estética é editorial e refinada, não infantil.
- NÃO use ícones decorativos, hashtags soltas, exclamações exageradas ou linguagem coloquial.
- Use APENAS texto e Markdown sóbrio (cabeçalhos ##, listas com -, **negrito**, *itálico*).
- Para avaliações com estrelas, escreva sempre "3/5" em texto puro — NUNCA caracteres ★ ou ✰.

A metodologia "Árvore dos Mundos" usa 11 pilares ("Frutos"):
${FRUITS.map(f => `- ${f.name}`).join('\n')}

Analise as entradas do Codex e responda em português brasileiro. NÃO repita saudações. Use EXATAMENTE estas seções, nesta ordem:

## Saudação
Uma ÚNICA frase poética de boas-vindas (máximo 2 linhas, sem emojis).

## Avaliação dos Frutos
Para CADA um dos 11 Frutos, dê uma nota de 1 a 5 e um comentário de UMA linha. Formato exato:
- **${FRUITS.map(f => `${f.name}**: 3/5 — [comentário breve, sem emojis]`).join('\n- **')}
Se o fruto não tem entradas, dê 1 e diga que precisa ser desenvolvido.

## Furos de Enredo
Identifique contradições, lacunas lógicas ou informações que se contradizem entre fichas/artigos. Se não houver, diga brevemente.

## Inconsistências de Worldbuilding
Aponte elementos que não fazem sentido dentro da lógica interna do mundo (ex.: tecnologia incompatível com a era, geografia contraditória, sistemas de magia sem regras claras).

## Oportunidades de Expansão
Sugira 3-5 áreas promissoras onde o mundo pode crescer, referenciando entradas específicas do criador.

## Pontos Fortes
Destaque o que está bem construído. Cite entradas específicas.

## Por Onde Continuar
Liste 3 ações concretas e prioritárias, ordenadas por importância. Priorize os frutos com notas mais baixas.

Seja construtiva, honesta e SUCINTA. Assine ao final apenas com "— Idriel, ${IDRIEL_TITLE}".`;

    try {
      const content = await callAIText(
        [{ role: 'user', content: `Aqui estão todas as entradas do meu Codex:\n\n${buildPrompt()}` }],
        systemPrompt
      );

      // Save to history
      const fichas = entries.filter(e => e.entry_type === 'ficha').length;
      const artigos = entries.filter(e => e.entry_type === 'artigo').length;
      const coveredFruits = FRUITS.filter(f => entries.some(e => e.fruit_id === f.id)).length;

      await supabase.from('world_analyses').insert({
        user_id: user.id,
        world_id: worldId,
        analysis_text: content,
        entry_count: entries.length,
        ficha_count: fichas,
        artigo_count: artigos,
        covered_fruits: coveredFruits,
      });

      setAnalysis(content);
      setRevealedChars(0);
      setIsRevealing(true);
      fetchHistory();
    } catch (e: any) {
      const f = friendlyAIError(e?.message || '');
      setError(`${f.title} ${f.hint}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAnalysis = async (id: string) => {
    await supabase.from('world_analyses').delete().eq('id', id);
    setHistory(prev => prev.filter(a => a.id !== id));
    if (viewingHistoryId === id) {
      setViewingHistoryId(null);
      setAnalysis('');
    }
  };

  const viewHistoryItem = (item: AnalysisRecord) => {
    setAnalysis(item.analysis_text);
    setViewingHistoryId(item.id);
    setShowHistory(false);
    setError('');
  };

  const fichas = entries.filter(e => e.entry_type === 'ficha').length;
  const artigos = entries.filter(e => e.entry_type === 'artigo').length;
  const coveredFruits = FRUITS.filter(f => entries.some(e => e.fruit_id === f.id)).length;

  const creditPct = sub.creditLimit > 0 ? (sub.creditsUsed / sub.creditLimit) * 100 : 0;
  const isLow = creditsRemaining <= 10;
  const isOut = creditsRemaining < ANALYSIS_COST;

  

  return (
    <div
      className="rounded-2xl p-4 sm:p-6 mb-6 animate-fadeUp border border-gold/25 relative overflow-hidden"
      style={{
        background:
          'linear-gradient(135deg, rgba(20,14,4,0.92) 0%, rgba(10,8,2,0.95) 50%, rgba(8,5,10,0.92) 100%)',
        backdropFilter: 'blur(20px)',
        boxShadow:
          '0 18px 60px rgba(0,0,0,0.55), 0 0 80px hsl(var(--gold-warm)/0.10), inset 0 1px 0 hsl(var(--gold-champagne)/0.12)',
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{ background: 'radial-gradient(ellipse 60% 60% at 0% 0%, hsl(var(--gold-warm)/0.10) 0%, transparent 70%)' }}
      />
      <div className="relative">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-cinzel font-bold text-base sm:text-lg text-gold-light">
            <><Trees className="inline-block w-4 h-4 mr-2 align-[-0.2em] text-gold-champagne" strokeWidth={1.5} />{IDRIEL_NAME} — {IDRIEL_TITLE}</>
          </h3>
          <p className="font-merriweather italic text-text-dim text-xs mt-1">
            A sábia guardiã irá avaliar suas entradas e iluminar o caminho a seguir
          </p>
        </div>
        <button onClick={onClose} className="w-6 h-6 rounded-full text-text-dim hover:text-foreground flex items-center justify-center transition-colors" aria-label="Fechar"><X className="w-3.5 h-3.5" strokeWidth={2} /></button>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="rounded-md px-3 py-2 border border-border bg-background/40 text-center">
          <p className="text-lg font-bold text-foreground">{fichas}</p>
          <p className="text-[9px] uppercase tracking-wider text-text-dim font-montserrat">Fichas</p>
        </div>
        <div className="rounded-md px-3 py-2 border border-border bg-background/40 text-center">
          <p className="text-lg font-bold text-foreground">{artigos}</p>
          <p className="text-[9px] uppercase tracking-wider text-text-dim font-montserrat">Artigos</p>
        </div>
        <div className="rounded-md px-3 py-2 border border-border bg-background/40 text-center">
          <p className="text-lg font-bold text-foreground">{coveredFruits}/11</p>
          <p className="text-[9px] uppercase tracking-wider text-text-dim font-montserrat">Frutos</p>
        </div>
      </div>

      {/* Coverage bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[9px] uppercase tracking-wider text-text-dim font-montserrat">Cobertura dos frutos</span>
          <span className="text-[10px] text-text-dim font-montserrat">{Math.round((coveredFruits / 11) * 100)}%</span>
        </div>
        <Progress value={(coveredFruits / 11) * 100} className="h-1.5 bg-border" />
      </div>

      {/* History button */}
      {!historyLoading && history.length > 0 && (
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full mb-4 px-3 py-2 rounded-md border border-accent/20 bg-accent/5 hover:bg-accent/10 transition-colors text-left flex items-center justify-between"
        >
          <span className="text-[10px] uppercase tracking-wider font-montserrat font-bold text-accent-foreground">
            <><ScrollText className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />Histórico de Análises ({history.length})</>
          </span>
          <span className="text-text-dim text-xs">{showHistory ? '▲' : '▼'}</span>
        </button>
      )}

      {/* History list */}
      {showHistory && (
        <div className="mb-4 animate-fadeUp">
          <ScrollArea className="max-h-[240px]">
            <div className="space-y-2 pr-2">
              {history.map(item => (
                <div
                  key={item.id}
                  className={`rounded-md p-3 border transition-colors cursor-pointer group ${
                    viewingHistoryId === item.id
                      ? 'border-accent/40 bg-accent/10'
                      : 'border-border bg-background/30 hover:border-accent/20 hover:bg-accent/5'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => viewHistoryItem(item)}
                      className="flex-1 text-left"
                    >
                      <p className="text-xs font-montserrat font-bold text-foreground">
                        {new Date(item.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                        <span className="text-text-dim font-normal ml-2">
                          {new Date(item.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </p>
                      <p className="text-[10px] text-text-dim font-montserrat mt-0.5">
                        {item.ficha_count} fichas · {item.artigo_count} artigos · {item.covered_fruits}/11 frutos
                      </p>
                    </button>
                    <ConfirmDialog
                      trigger={
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-full text-destructive hover:bg-destructive/10 text-xs flex items-center justify-center transition-all"
                          title="Excluir análise"
                        >
                          <Trash2 className="w-3 h-3" strokeWidth={1.75} />
                        </button>
                      }
                      title="Excluir análise"
                      description="Tem certeza que deseja excluir esta análise? Ela não poderá ser recuperada."
                      confirmLabel="Excluir"
                      onConfirm={() => handleDeleteAnalysis(item.id)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Credit info — Elixir dos Mundos */}
      {!sub.loading && planLimits.canUseAI && (
        <div
          className={`rounded-md px-3 py-2 mb-4 border ${isOut ? 'border-destructive/30' : isLow ? 'border-orange-500/30' : 'border-transparent'}`}
          style={{
            background: isOut
              ? 'linear-gradient(135deg, rgba(220,38,38,0.18) 0%, rgba(220,38,38,0.10) 100%)'
              : isLow
                ? 'linear-gradient(135deg, rgba(220,120,20,0.18) 0%, rgba(220,80,20,0.10) 100%)'
                : 'linear-gradient(135deg, #DFBD69 0%, #926F34 100%)',
          }}
        >
          <div className="flex items-center justify-between mb-1">
            <span
              className={`text-[9px] uppercase tracking-wider font-montserrat font-bold ${isOut ? 'text-destructive' : isLow ? 'text-orange-400' : ''}`}
              style={!isOut && !isLow ? { color: '#2A1A00' } : undefined}
            >
              <>{isOut ? <><Droplets className="inline-block w-3.5 h-3.5 mr-1 align-[-0.15em]" strokeWidth={1.75} />Elixir esgotado</> : isLow ? <><Leaf className="inline-block w-3.5 h-3.5 mr-1 align-[-0.15em]" strokeWidth={1.75} />Poucas gotas</> : <><Sparkles className="inline-block w-3.5 h-3.5 mr-1 align-[-0.15em]" strokeWidth={1.75} />Elixir dos Mundos</>}</>
            </span>
            <span
              className={`text-[10px] font-montserrat font-bold ${isOut ? 'text-destructive' : isLow ? 'text-orange-400' : ''}`}
              style={!isOut && !isLow ? { color: '#1E1000' } : undefined}
            >
              {creditsRemaining} gotas
            </span>
          </div>
          <Progress
            value={creditPct}
            className={`h-1 ${isOut ? 'bg-destructive/20' : isLow ? 'bg-amber-500/20' : 'bg-[#7A5A20]/30'}`}
          />
          {isOut && (
            <p className="text-[10px] text-destructive font-merriweather mt-1">Idriel aguarda a próxima lua nova para renovar sua energia.</p>
          )}
          {isLow && !isOut && (
            <p className="text-[10px] text-orange-400 font-merriweather mt-1">A Árvore sente suas raízes enfraquecerem…</p>
          )}
        </div>
      )}

      {!sub.loading && !planLimits.canUseAI && (
        <div className="rounded-md px-3 py-2 mb-4 border border-destructive/30 bg-destructive/5">
          <p className="text-[10px] text-destructive font-merriweather">
            <><Droplets className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />Idriel precisa de Elixir dos Mundos para novas análises. Mas você ainda pode revisitar análises anteriores no histórico!</>
          </p>
        </div>
      )}

      {!displayedAnalysis && !loading && (
        <div className="text-center">
          {entries.length === 0 ? (
            <p className="text-text-dim font-merriweather italic text-sm py-4">
              Crie pelo menos uma entrada no Codex antes de consultar {IDRIEL_NAME}.
            </p>
          ) : (
            <button
              onClick={handleAnalyze}
              disabled={!canAnalyze || sub.loading}
              className="px-5 py-2.5 bg-idriel-dim hover:bg-idriel text-foreground rounded-md text-xs font-montserrat font-bold uppercase tracking-wider transition-all shadow-[0_0_20px_hsl(var(--idriel)/0.3)] hover:shadow-[0_0_30px_hsl(var(--idriel)/0.5)] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            >
              <><Trees className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />Consultar {IDRIEL_NAME} sobre {entries.length} entrada{entries.length !== 1 ? 's' : ''}</>
            </button>
          )}
          <p className="text-[10px] text-text-dim mt-2 font-montserrat">
            <Droplet className="inline-block w-3 h-3 mr-1 align-[-0.1em]" strokeWidth={1.75} />Custo: <span className="font-bold text-idriel-light">{ANALYSIS_COST} gota</span> de Elixir · Você tem <span className="font-bold text-idriel-light">{creditsRemaining} gotas</span> · Análises anteriores são gratuitas
          </p>
        </div>
      )}

      {/* Loading with animated steps */}
      {loading && (
        <div className="py-6">
          <div className="flex flex-col items-center gap-4 mb-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-idriel/40 shadow-[0_0_30px_hsl(var(--idriel-glow)/0.3)] animate-pulse">
                <img src={idrielAvatar} alt="Idriel" className="w-full h-full object-cover object-top" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-idriel/30 border border-idriel-light/50 flex items-center justify-center animate-pulse"><Trees className="w-3 h-3 text-gold-champagne" strokeWidth={1.75} /></div>
            </div>
            <div className="text-center">
              <p className="font-cinzel font-bold text-sm text-foreground">{IDRIEL_NAME}</p>
              <p className="text-[10px] text-idriel-light/80 font-montserrat italic">está analisando seu mundo…</p>
            </div>
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            {LOADING_STEPS.map((step, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 transition-all duration-500 ${
                  i <= currentStep ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                }`}
              >
                <span className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] flex-shrink-0 transition-colors duration-300 ${
                  i < currentStep
                    ? 'bg-idriel/30 text-idriel-light'
                    : i === currentStep
                      ? 'bg-violet-500/30 text-violet-400 animate-pulse'
                      : 'bg-border text-text-dim'
                }`}>
                  {i < currentStep ? <Check className="w-3 h-3" strokeWidth={2.5} /> : <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                </span>
                <p className={`font-merriweather italic text-sm transition-colors duration-300 ${
                  i === currentStep ? 'text-foreground' : 'text-text-dim'
                }`}>
                  {step.message}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-md p-3 bg-destructive/10 border border-destructive/30 text-destructive text-sm font-merriweather">
          {error}
        </div>
      )}

      {displayedAnalysis && !loading && (
        <div className="mt-4 animate-fade-in">
          {viewingHistoryId && (
            <div className="mb-3 px-3 py-1.5 rounded-md bg-accent/10 border border-accent/20 flex items-center gap-2">
              <span className="text-[10px] text-accent-foreground font-montserrat inline-flex items-center gap-1.5"><ScrollText className="w-3 h-3" strokeWidth={1.75} />Visualizando análise do histórico</span>
              <button
                onClick={() => { setViewingHistoryId(null); setAnalysis(''); setRevealedChars(0); }}
                className="text-[10px] text-text-dim hover:text-foreground font-montserrat underline ml-auto"
              >
                Voltar
              </button>
            </div>
          )}

          <div className="rounded-lg p-4 sm:p-5 border border-accent/15 bg-background/30 relative" style={{ backdropFilter: 'blur(10px)' }}>
            {isRevealing && (
              <div className="absolute bottom-3 right-3 flex items-center gap-1.5 text-idriel-light/60">
                <span className="w-1.5 h-1.5 rounded-full bg-idriel animate-pulse" />
                <span className="text-[9px] font-montserrat italic">Idriel escrevendo…</span>
              </div>
            )}
            <div className="prose prose-sm prose-invert max-w-none
              [&_h2]:font-cinzel [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-idriel-light
              [&_h3]:font-montserrat [&_h3]:text-sm [&_h3]:font-bold [&_h3]:mt-3 [&_h3]:mb-1 [&_h3]:text-foreground
              [&_p]:font-merriweather [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-foreground/85
              [&_ul]:font-merriweather [&_ul]:text-sm [&_ul]:text-foreground/85
              [&_ol]:font-merriweather [&_ol]:text-sm [&_ol]:text-foreground/85
              [&_li]:mb-1
              [&_strong]:text-idriel-light [&_strong]:font-bold
              [&_blockquote]:border-l-2 [&_blockquote]:border-idriel/40 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-text-dim
              [&_em]:text-accent-foreground/90
            ">
              <ReactMarkdown
                components={{
                  h2: ({ children, ...props }) => {
                    const text = String(children);
                    let colorClass = 'text-idriel-light';
                    if (text.includes('Furos')) colorClass = 'text-destructive';
                    else if (text.includes('Inconsistências')) colorClass = 'text-orange-400';
                    else if (text.includes('Expansão')) colorClass = 'text-emerald-400';
                    else if (text.includes('Fortes')) colorClass = 'text-idriel-light';
                    else if (text.includes('Continuar')) colorClass = 'text-blue-light';
                    else if (text.includes('Avaliação')) colorClass = 'text-idriel-light';
                    return <h2 className={`font-cinzel text-base font-bold mt-5 mb-2 ${colorClass}`} {...props}>{children}</h2>;
                  }
                }}
              >
                {displayedAnalysis}
              </ReactMarkdown>
            </div>
          </div>

          <div className="flex gap-2 mt-3 justify-end">
            {!viewingHistoryId && (
              <button
                onClick={handleAnalyze}
                disabled={!canAnalyze}
                className="px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground rounded-md text-[10px] font-montserrat font-bold uppercase tracking-wider transition-colors disabled:opacity-40"
              >
                <><RefreshCw className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />Nova análise</>
              </button>
            )}
            <button
              onClick={() => {
                if (viewingHistoryId) { setViewingHistoryId(null); setAnalysis(''); }
                else onClose();
              }}
              className="px-3 py-1.5 text-text-dim hover:text-foreground text-[10px] font-montserrat uppercase tracking-wider transition-colors"
            >
              {viewingHistoryId ? 'Voltar' : 'Fechar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
