import React, { useState, useEffect, useCallback } from 'react';
import { FRUITS } from '@/lib/data';
import { callAIText } from '@/lib/helpers';
import type { CodexEntry } from '@/hooks/useCodexEntries';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

import ReactMarkdown from 'react-markdown';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import idrielAvatar from '@/assets/idriel-avatar.png';

interface Props {
  entries: CodexEntry[];
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

const ANALYSIS_COST = 2;

const IDRIEL_NAME = 'Idriel';
const IDRIEL_TITLE = 'Guardiã da Árvore dos Mundos';

const LOADING_STEPS = [
  { message: '🌿 Abrindo os galhos da Árvore para enxergar seu mundo…', delay: 0 },
  { message: '📋 Analisando suas fichas de personagens, criaturas e lugares…', delay: 3000 },
  { message: '📝 Agora, vou percorrer seus artigos e anotações…', delay: 7000 },
  { message: '🍎 Verificando a cobertura de cada Fruto do worldbuilding…', delay: 11000 },
  { message: '🔮 Quase lá… estou reunindo minhas considerações finais…', delay: 16000 },
  { message: '✨ Tecendo a sabedoria dos Frutos em minha avaliação…', delay: 21000 },
];

export const CodexAnalysis: React.FC<Props> = ({ entries, onClose }) => {
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [history, setHistory] = useState<AnalysisRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [viewingHistoryId, setViewingHistoryId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const sub = useSubscription();
  const { user } = useAuth();

  const creditsRemaining = sub.creditLimit - sub.creditsUsed;
  const canAnalyze = sub.hasIdriel && creditsRemaining >= ANALYSIS_COST;

  // Fetch history on mount
  const fetchHistory = useCallback(async () => {
    if (!user) return;
    const { data, error: err } = await supabase
      .from('world_analyses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (!err && data) setHistory(data as AnalysisRecord[]);
    setHistoryLoading(false);
  }, [user]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // Animated loading steps
  useEffect(() => {
    if (!loading) { setCurrentStep(0); return; }
    const timers = LOADING_STEPS.map((step, i) =>
      setTimeout(() => setCurrentStep(i), step.delay)
    );
    return () => timers.forEach(clearTimeout);
  }, [loading]);

  const buildPrompt = () => {
    const lines: string[] = [];
    FRUITS.forEach(fruit => {
      const fruitEntries = entries.filter(e => e.fruit_id === fruit.id);
      if (fruitEntries.length === 0) {
        lines.push(`## ${fruit.icon} ${fruit.name}\nNenhuma entrada criada.\n`);
        return;
      }
      lines.push(`## ${fruit.icon} ${fruit.name} (${fruitEntries.length} entradas)`);
      fruitEntries.forEach(e => {
        const typeLabel = e.entry_type === 'ficha' ? '📋 Ficha' : '📝 Artigo';
        const contentPreview = (e.content || '').slice(0, 600);
        lines.push(`### ${typeLabel}: ${e.title}`);
        lines.push(contentPreview || '(sem conteúdo)');
        lines.push('');
      });
    });
    const orphans = entries.filter(e => e.fruit_id === null);
    if (orphans.length > 0) {
      lines.push(`## ❓ Sem fruto associado (${orphans.length})`);
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

    const systemPrompt = `Você é ${IDRIEL_NAME}, a ${IDRIEL_TITLE} — uma sábia ancestral de aparência élfica, guardiã milenar que observa os mundos florescerem através dos Frutos da criação. Você fala com elegância, sabedoria profunda e encorajamento maternal. Use uma linguagem poética mas acessível, como uma mentora élfica falaria com um jovem criador.

A metodologia "Árvore dos Mundos" organiza a construção de mundos fictícios em 11 pilares (chamados "Frutos"):
${FRUITS.map(f => `- ${f.icon} ${f.name}: ${f.desc}`).join('\n')}

O criador vai te enviar todas as entradas do Codex dele. Analise e responda em português brasileiro, usando Markdown, com as seguintes seções:

## 🌿 Saudação de Idriel
Uma breve saudação personalizada e poética, mencionando o estado geral do mundo.

## 🔍 Visão Geral
Um resumo rápido do estado do mundo (quantos frutos cobertos, impressão geral).

## 📋 Análise das Fichas
As fichas (personagens, criaturas, itens, mapas) estão com informações suficientes para enriquecer uma história? Quais fichas precisam de mais detalhes? Dê sugestões específicas.

## 📝 Análise dos Artigos
Os artigos estão ricos e bem desenvolvidos? Quais temas precisam ser aprofundados?

## 🌳 Cobertura dos Frutos
Quais frutos estão bem definidos? Quais estão fracos ou ausentes? Liste cada fruto e dê uma nota de 1 a 5 (⭐).

## 💡 Recomendações de Idriel
Liste 3 a 5 ações prioritárias que o criador deveria fazer a seguir para fortalecer o mundo. Fale como uma mentora sábia dando conselhos.

Seja construtiva, encorajadora mas honesta. Use exemplos concretos das entradas quando possível. Assine ao final com "— Idriel, ${IDRIEL_TITLE}".`;

    try {
      const content = await callAIText(
        [{ role: 'user', content: `Aqui estão todas as entradas do meu Codex:\n\n${buildPrompt()}` }],
        systemPrompt
      );
      // Second credit
      await callAIText(
        [{ role: 'user', content: 'ok' }],
        'Respond with just the word "ok".'
      );

      // Save to history
      const fichas = entries.filter(e => e.entry_type === 'ficha').length;
      const artigos = entries.filter(e => e.entry_type === 'artigo').length;
      const coveredFruits = FRUITS.filter(f => entries.some(e => e.fruit_id === f.id)).length;

      await supabase.from('world_analyses').insert({
        user_id: user.id,
        analysis_text: content,
        entry_count: entries.length,
        ficha_count: fichas,
        artigo_count: artigos,
        covered_fruits: coveredFruits,
      });

      setAnalysis(content);
      fetchHistory(); // refresh history
    } catch (e: any) {
      setError(e.message || 'Erro ao analisar.');
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

  const displayedAnalysis = analysis;

  return (
    <div className="rounded-lg p-4 sm:p-5 mb-6 animate-fadeUp border border-accent/20" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.10) 0%, rgba(59,130,246,0.10) 50%, rgba(16,185,129,0.08) 100%)', backdropFilter: 'blur(20px)' }}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-cinzel font-bold text-base sm:text-lg bg-gradient-to-r from-violet-400 via-blue-400 to-emerald-400 bg-clip-text text-transparent">
            🌳 {IDRIEL_NAME} — {IDRIEL_TITLE}
          </h3>
          <p className="font-merriweather italic text-text-dim text-xs mt-1">
            A sábia guardiã irá avaliar todas as suas entradas e sugerir melhorias
          </p>
        </div>
        <button onClick={onClose} className="w-6 h-6 rounded-full text-text-dim hover:text-foreground text-sm flex items-center justify-center transition-colors">✕</button>
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
            📜 Histórico de Análises ({history.length})
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
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteAnalysis(item.id); }}
                      className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-full text-destructive hover:bg-destructive/10 text-xs flex items-center justify-center transition-all"
                      title="Excluir análise"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Credit info — Seiva Dourada */}
      {!sub.loading && sub.hasIdriel && (
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
              {isOut ? '🥀 Seiva esgotada' : isLow ? '🍂 Poucas gotas' : '✨ Seiva Dourada'}
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

      {!sub.loading && !sub.active && (
        <div className="rounded-md px-3 py-2 mb-4 border border-destructive/30 bg-destructive/5">
          <p className="text-[10px] text-destructive font-merriweather">
            🥀 Idriel precisa de Seiva Dourada para novas análises. Mas você ainda pode revisitar análises anteriores no histórico!
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
              className="px-5 py-2.5 bg-gradient-to-r from-violet-600 via-blue-500 to-emerald-500 hover:from-violet-500 hover:via-blue-400 hover:to-emerald-400 text-white rounded-md text-xs font-montserrat font-bold uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            >
              🌳 Consultar {IDRIEL_NAME} sobre {entries.length} entrada{entries.length !== 1 ? 's' : ''}
            </button>
          )}
          <p className="text-[10px] text-text-dim mt-2 font-montserrat">
            Consome {ANALYSIS_COST} gotas de Seiva · Análises anteriores podem ser revisitadas gratuitamente
          </p>
        </div>
      )}

      {/* Loading with animated steps */}
      {loading && (
        <div className="py-6">
          <div className="flex flex-col items-center gap-4 mb-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-emerald-400/40 shadow-[0_0_30px_rgba(16,185,129,0.3)] animate-pulse">
                <img src={idrielAvatar} alt="Idriel" className="w-full h-full object-cover object-top" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500/30 border border-emerald-400/50 flex items-center justify-center text-xs animate-pulse">🌳</div>
            </div>
            <div className="text-center">
              <p className="font-cinzel font-bold text-sm text-foreground">{IDRIEL_NAME}</p>
              <p className="text-[10px] text-emerald-400/80 font-montserrat italic">está analisando seu mundo…</p>
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
                    ? 'bg-emerald-500/30 text-emerald-400'
                    : i === currentStep
                      ? 'bg-violet-500/30 text-violet-400 animate-pulse'
                      : 'bg-border text-text-dim'
                }`}>
                  {i < currentStep ? '✓' : '●'}
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
        <div className="mt-4">
          {viewingHistoryId && (
            <div className="mb-3 px-3 py-1.5 rounded-md bg-accent/10 border border-accent/20 flex items-center gap-2">
              <span className="text-[10px] text-accent-foreground font-montserrat">📜 Visualizando análise do histórico</span>
              <button
                onClick={() => { setViewingHistoryId(null); setAnalysis(''); }}
                className="text-[10px] text-text-dim hover:text-foreground font-montserrat underline ml-auto"
              >
                Voltar
              </button>
            </div>
          )}

          <div className="rounded-lg p-4 sm:p-5 border border-accent/15 bg-background/30" style={{ backdropFilter: 'blur(10px)' }}>
            <div className="prose prose-sm prose-invert max-w-none
              [&_h2]:font-cinzel [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-blue-light
              [&_h3]:font-montserrat [&_h3]:text-sm [&_h3]:font-bold [&_h3]:mt-3 [&_h3]:mb-1 [&_h3]:text-foreground
              [&_p]:font-merriweather [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-foreground/85
              [&_ul]:font-merriweather [&_ul]:text-sm [&_ul]:text-foreground/85
              [&_ol]:font-merriweather [&_ol]:text-sm [&_ol]:text-foreground/85
              [&_li]:mb-1
              [&_strong]:text-accent-foreground
              [&_blockquote]:border-l-2 [&_blockquote]:border-accent/40 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-text-dim
            ">
              <ReactMarkdown>{displayedAnalysis}</ReactMarkdown>
            </div>
          </div>

          <div className="flex gap-2 mt-3 justify-end">
            {!viewingHistoryId && (
              <button
                onClick={handleAnalyze}
                disabled={!canAnalyze}
                className="px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground rounded-md text-[10px] font-montserrat font-bold uppercase tracking-wider transition-colors disabled:opacity-40"
              >
                🔄 Nova análise
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
