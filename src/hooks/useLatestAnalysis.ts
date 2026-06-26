import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FRUITS } from '@/lib/data';

export interface FruitScoreDetail {
  score: number;
  justification?: string;
  evidence?: string[];
}

export type FruitScores = Record<string, number | FruitScoreDetail>;

export interface LatestAnalysis {
  id: string;
  created_at: string;
  analysis_text: string;
  fruit_scores: FruitScores;
}

/** Helper: extrai o número de uma entrada (legado: number; novo: { score }). */
export function getFruitScore(scores: FruitScores | undefined, fruitId: number | string): number {
  if (!scores) return 0;
  const v = scores[String(fruitId)];
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  return typeof v.score === 'number' ? v.score : 0;
}

export function getFruitDetail(scores: FruitScores | undefined, fruitId: number | string): FruitScoreDetail | null {
  if (!scores) return null;
  const v = scores[String(fruitId)];
  if (v == null) return null;
  if (typeof v === 'number') return { score: v };
  return v;
}

/**
 * Parses fruit scores out of the markdown analysis text.
 * Aceita ambos os formatos:
 *  - Legado: "- **Nome**: 3/5 — comentário"
 *  - Novo:   "- **Nome**: 3/5 — justificativa breve. (Entrada A, Entrada B)"
 */
export function parseFruitScoresFromAnalysis(text: string): FruitScores {
  const out: FruitScores = {};
  if (!text) return out;
  const lines = text.split(/\r?\n/);
  for (const fruit of FRUITS) {
    const escaped = fruit.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(
      `(?:^|\\b)\\*{0,2}\\s*${escaped}\\s*\\*{0,2}\\s*:?\\s*([0-5])\\s*/\\s*5\\s*[—\\-–:]?\\s*([^\\n]*)`,
      'i'
    );
    for (const line of lines) {
      const m = line.match(re);
      if (!m) continue;
      const score = Number(m[1]);
      const tail = (m[2] || '').trim();
      // Extrai entradas mencionadas entre parênteses no final.
      let justification = tail;
      let evidence: string[] | undefined;
      const evMatch = tail.match(/\(([^()]+)\)\s*$/);
      if (evMatch) {
        evidence = evMatch[1].split(/[,;]/).map(s => s.trim()).filter(Boolean);
        justification = tail.slice(0, evMatch.index).trim().replace(/[.;,—–-]+$/, '').trim();
      }
      out[String(fruit.id)] = justification || evidence
        ? { score, justification: justification || undefined, evidence }
        : { score };
      break;
    }
  }
  return out;
}

export function useLatestAnalysis(worldId?: string | null) {
  const [data, setData] = useState<LatestAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!worldId) { setData(null); return; }
    setLoading(true);
    const { data: row } = await supabase
      .from('world_analyses')
      .select('id, created_at, analysis_text, fruit_scores')
      .eq('world_id', worldId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (row) {
      let scores = (row.fruit_scores as FruitScores) || {};
      if (!scores || Object.keys(scores).length === 0) {
        scores = parseFruitScoresFromAnalysis(row.analysis_text);
      }
      setData({
        id: row.id,
        created_at: row.created_at,
        analysis_text: row.analysis_text,
        fruit_scores: scores,
      });
    } else {
      setData(null);
    }
    setLoading(false);
  }, [worldId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { data, loading, refresh };
}

