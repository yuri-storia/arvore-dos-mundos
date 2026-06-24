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
// Dictionary files live in `public/dictionaries/pt/` so the browser can fetch
// them as plain static assets (no bundler import map gymnastics required).
const AFF_URL = '/dictionaries/pt/index.aff';
const DIC_URL = '/dictionaries/pt/index.dic';
import { getCustomWords } from './customDictionary';

export interface SpellChecker {
  correct: (word: string) => boolean;
  suggest: (word: string) => string[];
  add: (word: string) => void;
}

let cached: SpellChecker | null = null;
let loadingPromise: Promise<SpellChecker> | null = null;

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load dictionary asset: ${url}`);
  // The Hunspell PT files declare `SET UTF-8`. We must decode them as text
  // before handing them to nspell — passing a Uint8Array makes nspell call
  // `.toString()` on it, which in the browser yields "171,187,..." instead
  // of UTF-8 characters and silently destroys the dictionary.
  const buf = await res.arrayBuffer();
  return new TextDecoder('utf-8').decode(buf);
}

export function getSpellChecker(): SpellChecker | null {
  return cached;
}

export async function loadSpellChecker(): Promise<SpellChecker> {
  if (cached) return cached;
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    const [aff, dic] = await Promise.all([fetchText(AFF_URL), fetchText(DIC_URL)]);
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
