import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FRUITS } from '@/lib/data';

export interface LatestAnalysis {
  id: string;
  created_at: string;
  analysis_text: string;
  fruit_scores: Record<string, number>;
}

/**
 * Parses fruit scores out of the markdown analysis text.
 * Looks for lines like: "- **Nome do Fruto**: 3/5 — comentário".
 * Returns { [fruitId]: score(0..5) }.
 */
export function parseFruitScoresFromAnalysis(text: string): Record<string, number> {
  const out: Record<string, number> = {};
  if (!text) return out;
  const lines = text.split(/\r?\n/);
  for (const fruit of FRUITS) {
    const escaped = fruit.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Match: optional "- ", optional "**", fruit name, optional "**", ":", N/5
    const re = new RegExp(`(?:^|\\b)\\*{0,2}\\s*${escaped}\\s*\\*{0,2}\\s*:?\\s*([0-5])\\s*/\\s*5`, 'i');
    for (const line of lines) {
      const m = line.match(re);
      if (m) { out[String(fruit.id)] = Number(m[1]); break; }
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
      let scores = (row.fruit_scores as Record<string, number>) || {};
      // Backfill: if scores is empty but analysis_text exists, parse from text
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
