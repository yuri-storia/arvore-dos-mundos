import React, { useState } from 'react';
import { FRUITS } from '@/lib/data';
import { callAIText } from '@/lib/helpers';
import type { CodexEntry } from '@/hooks/useCodexEntries';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';
import { Progress } from '@/components/ui/progress';

interface Props {
  entries: CodexEntry[];
  onClose: () => void;
}

const ANALYSIS_COST = 2;

export const CodexAnalysis: React.FC<Props> = ({ entries, onClose }) => {
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const sub = useSubscription();

  const creditsRemaining = sub.creditLimit - sub.creditsUsed;
  const canAnalyze = sub.active && creditsRemaining >= ANALYSIS_COST;

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
    if (entries.length === 0 || !canAnalyze) return;
    setLoading(true);
    setError('');
    setAnalysis('');

    const systemPrompt = `Você é um consultor de worldbuilding especializado na metodologia "Árvore dos Mundos", que organiza a construção de mundos fictícios em 11 pilares (chamados "Frutos"):
${FRUITS.map(f => `- ${f.icon} ${f.name}: ${f.desc}`).join('\n')}

O criador vai te enviar todas as entradas do Codex dele. Analise e responda em português brasileiro, usando Markdown, com as seguintes seções:

## 🔍 Visão Geral
Um resumo rápido do estado do mundo (quantos frutos cobertos, impressão geral).

## 📋 Análise das Fichas
As fichas (personagens, criaturas, itens, mapas) estão com informações suficientes para enriquecer uma história? Quais fichas precisam de mais detalhes? Dê sugestões específicas.

## 📝 Análise dos Artigos
Os artigos estão ricos e bem desenvolvidos? Quais temas precisam ser aprofundados?

## 🌳 Cobertura dos Frutos
Quais frutos estão bem definidos? Quais estão fracos ou ausentes? Liste cada fruto e dê uma nota de 1 a 5 (⭐).

## 💡 Recomendações
Liste 3 a 5 ações prioritárias que o criador deveria fazer a seguir para fortalecer o mundo.

Seja construtivo, encorajador mas honesto. Use exemplos concretos das entradas quando possível.`;

    try {
      const userId = user?.id || '';

      const content = await callAIText(
        [{ role: 'user', content: `Aqui estão todas as entradas do meu Codex:\n\n${buildPrompt()}` }],
        systemPrompt
      );
      // ai-text already increments 1 credit; add 1 more for total cost of 2
      await supabase.rpc('increment_ai_usage', { _user_id: userId, _type: 'text' });
      setAnalysis(content);
    } catch (e: any) {
      setError(e.message || 'Erro ao analisar.');
    } finally {
      setLoading(false);
    }
  };

  const fichas = entries.filter(e => e.entry_type === 'ficha').length;
  const artigos = entries.filter(e => e.entry_type === 'artigo').length;
  const coveredFruits = FRUITS.filter(f => entries.some(e => e.fruit_id === f.id)).length;

  const creditPct = sub.creditLimit > 0 ? (sub.creditsUsed / sub.creditLimit) * 100 : 0;
  const isLow = creditsRemaining <= 10;
  const isOut = creditsRemaining < ANALYSIS_COST;

  return (
    <div className="rounded-lg p-4 sm:p-5 mb-6 animate-fadeUp border border-accent/20" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.10) 0%, rgba(59,130,246,0.10) 50%, rgba(16,185,129,0.08) 100%)', backdropFilter: 'blur(20px)' }}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-cinzel font-bold text-base sm:text-lg bg-gradient-to-r from-violet-400 via-blue-400 to-emerald-400 bg-clip-text text-transparent">
            🔮 Analisar meu Mundo
          </h3>
          <p className="font-merriweather italic text-text-dim text-xs mt-1">
            A IA vai avaliar todas as suas entradas e sugerir melhorias
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

      {/* Credit info */}
      {!sub.loading && sub.active && (
        <div className={`rounded-md px-3 py-2 mb-4 border ${isOut ? 'border-destructive/30 bg-destructive/5' : isLow ? 'border-amber-500/30 bg-amber-500/5' : 'border-border bg-background/30'}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] uppercase tracking-wider font-montserrat font-bold text-text-dim">
              {isOut ? '🚫' : isLow ? '⚠️' : '✨'} Créditos de IA
            </span>
            <span className={`text-[10px] font-montserrat font-bold ${isOut ? 'text-destructive' : isLow ? 'text-amber-400' : 'text-foreground'}`}>
              {creditsRemaining}/{sub.creditLimit}
            </span>
          </div>
          <Progress
            value={creditPct}
            className={`h-1 ${isOut ? 'bg-destructive/20' : isLow ? 'bg-amber-500/20' : 'bg-border'}`}
          />
          {isOut && (
            <p className="text-[10px] text-destructive font-merriweather mt-1">Créditos esgotados. Aguarde o próximo mês.</p>
          )}
          {isLow && !isOut && (
            <p className="text-[10px] text-amber-400 font-merriweather mt-1">Poucos créditos restantes.</p>
          )}
        </div>
      )}

      {!sub.loading && !sub.active && (
        <div className="rounded-md px-3 py-2 mb-4 border border-destructive/30 bg-destructive/5">
          <p className="text-[10px] text-destructive font-merriweather">
            🚫 Você precisa de um plano ativo para usar a IA.
          </p>
        </div>
      )}

      {!analysis && !loading && (
        <div className="text-center">
          {entries.length === 0 ? (
            <p className="text-text-dim font-merriweather italic text-sm py-4">
              Crie pelo menos uma entrada no Codex antes de analisar.
            </p>
          ) : (
            <button
              onClick={handleAnalyze}
              disabled={!canAnalyze || sub.loading}
              className="px-5 py-2.5 bg-gradient-to-r from-violet-600 via-blue-500 to-emerald-500 hover:from-violet-500 hover:via-blue-400 hover:to-emerald-400 text-white rounded-md text-xs font-montserrat font-bold uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            >
              🔮 Analisar {entries.length} entrada{entries.length !== 1 ? 's' : ''}
            </button>
          )}
          <p className="text-[10px] text-text-dim mt-2 font-montserrat">
            Consome {ANALYSIS_COST} créditos de IA
          </p>
        </div>
      )}

      {loading && (
        <div className="text-center py-8">
          <div className="flex items-center justify-center gap-1 mb-3">
            <span className="w-2 h-2 rounded-full bg-violet-400 dot-bounce" />
            <span className="w-2 h-2 rounded-full bg-blue-400 dot-bounce-2" />
            <span className="w-2 h-2 rounded-full bg-emerald-400 dot-bounce-3" />
          </div>
          <p className="font-merriweather italic text-text-dim text-sm">Analisando seu mundo…</p>
        </div>
      )}

      {error && (
        <div className="rounded-md p-3 bg-destructive/10 border border-destructive/30 text-destructive text-sm font-merriweather">
          {error}
        </div>
      )}

      {analysis && (
        <div className="mt-4">
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
              <ReactMarkdown>{analysis}</ReactMarkdown>
            </div>
          </div>

          <div className="flex gap-2 mt-3 justify-end">
            <button
              onClick={handleAnalyze}
              disabled={!canAnalyze}
              className="px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground rounded-md text-[10px] font-montserrat font-bold uppercase tracking-wider transition-colors disabled:opacity-40"
            >
              🔄 Analisar novamente
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-text-dim hover:text-foreground text-[10px] font-montserrat uppercase tracking-wider transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
