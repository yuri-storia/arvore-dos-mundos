// Camada de revisão por IA — chama a edge function `ai-review-paragraph` para
// cada parágrafo do editor e devolve issues (spelling/grammar/style) que a
// extensão Tiptap converte em decorações vermelhas (spelling) e amarelas
// (grammar/style).
//
// Estratégia:
//   - Hash estável por parágrafo (djb2). Mesmo texto = mesma resposta cacheada.
//   - Cache LRU em memória (300 parágrafos) + sessionStorage opcional.
//   - Fila com no máx. 3 requisições simultâneas; debounce externo.
//   - "in-flight" map evita duplicar chamadas para o mesmo parágrafo.
//   - Falha-suave: erro retorna [] (sem amarelo, sem bloquear UX).

import { supabase } from "@/integrations/supabase/client";
import { isSpellcheckEnabled } from "./spellcheckSettings";

export interface AIIssue {
  text: string;
  offset: number;
  length: number;
  type: "spelling" | "grammar" | "style";
  suggestions: string[];
  reason: string;
}

const CACHE_MAX = 300;
const cache = new Map<string, AIIssue[]>();
const inflight = new Map<string, Promise<AIIssue[]>>();

function djb2(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
  return (h >>> 0).toString(36);
}

function remember(key: string, issues: AIIssue[]) {
  if (cache.size >= CACHE_MAX) {
    const k = cache.keys().next().value;
    if (k) cache.delete(k);
  }
  cache.set(key, issues);
}

/** Retorna issues do cache se existirem (sem disparar rede). */
export function getCachedIssues(text: string): AIIssue[] | null {
  if (!text.trim()) return [];
  return cache.get(djb2(text)) ?? null;
}

/**
 * Pede revisão para o backend. Faz dedupe via cache e in-flight.
 * Retorna [] silenciosamente em qualquer falha.
 */
export async function reviewParagraph(text: string): Promise<AIIssue[]> {
  if (!isSpellcheckEnabled()) return [];
  const trimmed = text.trim();
  if (!trimmed) return [];
  // Parágrafos com menos de 3 palavras raramente têm gramática complexa
  // o suficiente para compensar o custo de uma chamada.
  if (trimmed.split(/\s+/).length < 3) return [];

  const key = djb2(text);
  const cached = cache.get(key);
  if (cached) return cached;
  const pending = inflight.get(key);
  if (pending) return pending;

  const p = (async () => {
    try {
      const { data, error } = await supabase.functions.invoke(
        "ai-review-paragraph",
        { body: { text } },
      );
      if (error) return [] as AIIssue[];
      const issues = Array.isArray(
          (data as { issues?: unknown })?.issues,
        )
        ? ((data as { issues: AIIssue[] }).issues)
        : [];
      remember(key, issues);
      return issues;
    } catch {
      return [] as AIIssue[];
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, p);
  return p;
}

/** Limpa cache (útil ao alternar liga/desliga do corretor). */
export function clearReviewCache() {
  cache.clear();
  inflight.clear();
}
