// Hook que conversa com o Web Worker do nspell (dicionário PT bundled).
// Sem chamadas de IA. Sem rede além do bundle estático do dicionário.
// Mantém um cache LRU local para respostas instantâneas em palavras repetidas.

import { useCallback, useEffect, useRef } from "react";
import { listCustomWords } from "./customDictionary";

export interface SpellLookupResult {
  correct: boolean;
  suggestions: string[];
  degraded?: boolean;
}

const CACHE_MAX = 1000;

// Singleton worker — uma instância para toda a aplicação.
let workerSingleton: Worker | null = null;
let nextId = 1;
const pending = new Map<
  number,
  (msg: { correct?: boolean; suggestions?: string[]; error?: string }) => void
>();

function getWorker(): Worker {
  if (workerSingleton) return workerSingleton;
  workerSingleton = new Worker(
    new URL("./spellWorker.ts", import.meta.url),
    { type: "module" },
  );
  workerSingleton.addEventListener("message", (ev: MessageEvent) => {
    const { id } = ev.data || {};
    const cb = pending.get(id);
    if (cb) {
      pending.delete(id);
      cb(ev.data);
    }
  });
  workerSingleton.addEventListener("error", (e) => {
    // eslint-disable-next-line no-console
    console.warn("[spellcheck] worker error", e.message);
  });
  // Sincroniza palavras do dicionário pessoal já gravadas.
  try {
    for (const w of listCustomWords()) {
      workerSingleton.postMessage({ id: nextId++, type: "add", word: w });
    }
  } catch {
    /* noop */
  }
  return workerSingleton;
}

function send(
  type: "check" | "suggest" | "lookup" | "add",
  word: string,
): Promise<{ correct?: boolean; suggestions?: string[]; error?: string }> {
  return new Promise((resolve) => {
    const id = nextId++;
    pending.set(id, resolve);
    getWorker().postMessage({ id, type, word });
    // Timeout defensivo para não vazar promises se o worker travar.
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        resolve({ error: "timeout" });
      }
    }, 4000);
  });
}

export function addWordToWorker(word: string) {
  try {
    getWorker().postMessage({ id: nextId++, type: "add", word });
  } catch {
    /* noop */
  }
}

export function useSpellSuggestions() {
  const cacheRef = useRef<Map<string, SpellLookupResult>>(new Map());

  // Pré-aquece o worker no primeiro mount.
  useEffect(() => {
    getWorker();
  }, []);

  const lookup = useCallback(
    async (
      word: string,
      _before: string,
      _after: string,
    ): Promise<SpellLookupResult> => {
      const key = word.toLowerCase();
      const cached = cacheRef.current.get(key);
      if (cached) {
        cacheRef.current.delete(key);
        cacheRef.current.set(key, cached);
        return cached;
      }

      const res = await send("lookup", word);
      if (res.error) {
        return { correct: true, suggestions: [], degraded: true };
      }
      const result: SpellLookupResult = {
        correct: res.correct !== false,
        suggestions: Array.isArray(res.suggestions) ? res.suggestions : [],
      };
      if (cacheRef.current.size >= CACHE_MAX) {
        const firstKey = cacheRef.current.keys().next().value;
        if (firstKey) cacheRef.current.delete(firstKey);
      }
      cacheRef.current.set(key, result);
      return result;
    },
    [],
  );

  return { lookup };
}
