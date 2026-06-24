/**
 * Lazy loader for the Hunspell PT (Brazilian) dictionary + nspell instance.
 *
 * The dictionary files (~5MB total) are imported as Vite asset URLs so they
 * are code-split and only fetched the first time the user enables the
 * spell checker. After the first call, the parsed nspell instance is cached
 * in module scope.
 */
// @ts-ignore - nspell ships no TypeScript types
import nspell from 'nspell';
// Vite: import the binary asset URLs (will be served as static files).
import affUrl from 'dictionary-pt/index.aff?url';
import dicUrl from 'dictionary-pt/index.dic?url';
import { getCustomWords } from './customDictionary';

export interface SpellChecker {
  correct: (word: string) => boolean;
  suggest: (word: string) => string[];
  add: (word: string) => void;
}

let cached: SpellChecker | null = null;
let loadingPromise: Promise<SpellChecker> | null = null;

async function fetchBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load dictionary asset: ${url}`);
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}

export function getSpellChecker(): SpellChecker | null {
  return cached;
}

export async function loadSpellChecker(): Promise<SpellChecker> {
  if (cached) return cached;
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    const [aff, dic] = await Promise.all([fetchBytes(affUrl), fetchBytes(dicUrl)]);
    const instance = nspell({ aff, dic });
    // Seed the user's personal dictionary.
    for (const w of getCustomWords()) {
      try { instance.add(w); } catch { /* ignore */ }
    }
    const checker: SpellChecker = {
      correct: (w: string) => {
        try { return instance.correct(w); } catch { return true; }
      },
      suggest: (w: string) => {
        try { return instance.suggest(w) as string[]; } catch { return []; }
      },
      add: (w: string) => {
        try { instance.add(w); } catch { /* ignore */ }
      },
    };
    cached = checker;
    loadingPromise = null;
    return checker;
  })();
  return loadingPromise;
}
