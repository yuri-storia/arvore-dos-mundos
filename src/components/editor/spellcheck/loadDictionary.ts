/**
 * Lazy loader for the Hunspell PT-BR dictionary.
 *
 * The first implementation used `nspell`, but the PT dictionary used by the app
 * takes too long to parse with it in the browser and the checker never became
 * usable for real users. `typo-js` supports the same Hunspell files and was
 * verified against the current dictionary with valid/invalid PT-BR words.
 */
// @ts-ignore - typo-js ships no TypeScript declarations.
import Typo from 'typo-js';
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
let lastError: Error | null = null;

export type SpellLoadStatus = 'idle' | 'loading' | 'ready' | 'error';
const listeners = new Set<(s: SpellLoadStatus) => void>();
let status: SpellLoadStatus = 'idle';
function setStatus(s: SpellLoadStatus) {
  status = s;
  listeners.forEach(l => { try { l(s); } catch { /* ignore */ } });
}
export function getSpellStatus(): SpellLoadStatus { return status; }
export function onSpellStatusChange(fn: (s: SpellLoadStatus) => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
export function getSpellLoadError(): Error | null { return lastError; }

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load dictionary asset: ${url}`);
  // The Hunspell PT files declare `SET UTF-8`. Decode as text before handing
  // them to typo-js — passing a Uint8Array makes it call `.toString()` on it,
  // which in the browser yields "171,187,..." and destroys the dictionary.
  const buf = await res.arrayBuffer();
  return new TextDecoder('utf-8').decode(buf);
}

export function getSpellChecker(): SpellChecker | null {
  return cached;
}

export async function loadSpellChecker(): Promise<SpellChecker> {
  if (cached) return cached;
  if (loadingPromise) return loadingPromise;
  setStatus('loading');
  loadingPromise = (async () => {
    try {
      const [aff, dic] = await Promise.all([fetchText(AFF_URL), fetchText(DIC_URL)]);
      const instance = new Typo('pt_BR', aff, dic, { platform: 'any' });
      for (const w of getCustomWords()) {
        try { instance.dictionaryTable.set(w, null); } catch { /* ignore */ }
      }
      const checker: SpellChecker = {
        correct: (w: string) => { try { return instance.check(w); } catch { return true; } },
        suggest: (w: string) => { try { return instance.suggest(w, 5) as string[]; } catch { return []; } },
        add: (w: string) => { try { instance.dictionaryTable.set(w, null); } catch { /* ignore */ } },
      };
      cached = checker;
      loadingPromise = null;
      lastError = null;
      setStatus('ready');
      return checker;
    } catch (e) {
      loadingPromise = null;
      lastError = e instanceof Error ? e : new Error(String(e));
      setStatus('error');
      throw lastError;
    }
  })();
  return loadingPromise;
}
