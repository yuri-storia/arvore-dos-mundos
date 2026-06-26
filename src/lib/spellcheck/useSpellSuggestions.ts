// Hook that calls the `ai-spellcheck` edge function and caches results in a
// bounded LRU map. Returns a stable `lookup` function and a request counter
// used by callers that want to cancel stale lookups.

import { useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SpellLookupResult {
  correct: boolean;
  suggestions: string[];
  reason?: string;
  degraded?: boolean;
}

const CACHE_MAX = 500;

function makeKey(word: string, before: string, after: string) {
  // Trim context to a small window — enough to disambiguate homophones
  // without exploding cache cardinality.
  const b = before.slice(-30);
  const a = after.slice(0, 30);
  return `${word.toLowerCase()}|${b}|${a}`;
}

export function useSpellSuggestions() {
  const cacheRef = useRef<Map<string, SpellLookupResult>>(new Map());
  const inflightRef = useRef<Map<string, Promise<SpellLookupResult>>>(new Map());

  const lookup = useCallback(
    async (
      word: string,
      before: string,
      after: string,
    ): Promise<SpellLookupResult> => {
      const key = makeKey(word, before, after);
      const cached = cacheRef.current.get(key);
      if (cached) {
        // LRU touch
        cacheRef.current.delete(key);
        cacheRef.current.set(key, cached);
        return cached;
      }
      const pending = inflightRef.current.get(key);
      if (pending) return pending;

      const promise = (async () => {
        try {
          const { data, error } = await supabase.functions.invoke(
            "ai-spellcheck",
            { body: { word, before, after } },
          );
          if (error) {
            return { correct: true, suggestions: [], degraded: true };
          }
          const result: SpellLookupResult = {
            correct: data?.correct !== false,
            suggestions: Array.isArray(data?.suggestions)
              ? data.suggestions.slice(0, 5)
              : [],
            reason: data?.reason,
            degraded: !!data?.degraded,
          };
          // Cache only confident answers.
          if (!result.degraded) {
            if (cacheRef.current.size >= CACHE_MAX) {
              const firstKey = cacheRef.current.keys().next().value;
              if (firstKey) cacheRef.current.delete(firstKey);
            }
            cacheRef.current.set(key, result);
          }
          return result;
        } catch (err) {
          console.warn("spellcheck lookup failed", err);
          return { correct: true, suggestions: [], degraded: true };
        } finally {
          inflightRef.current.delete(key);
        }
      })();

      inflightRef.current.set(key, promise);
      return promise;
    },
    [],
  );

  return { lookup };
}
