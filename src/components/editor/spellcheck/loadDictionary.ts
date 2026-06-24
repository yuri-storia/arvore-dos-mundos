/**
 * Spellchecker bootstrap. Loads the Hunspell PT-BR dictionary, parses it inside
 * a Web Worker (so the main thread stays responsive), and exposes a thin async
 * API to the rest of the app.
 *
 * Two-layer cache:
 *   1. IndexedDB caches the raw `.aff`/`.dic` text → avoids re-downloading ~5MB.
 *   2. In-memory `goodCache`/`badCache` Sets → avoid re-roundtripping every
 *      keystroke; the extension feeds them as it checks words.
 */
import { getCustomWords } from './customDictionary';
import { getCachedDict, putCachedDict } from './dictCache';

const AFF_URL = '/dictionaries/pt/index.aff';
const DIC_URL = '/dictionaries/pt/index.dic';

export interface SpellChecker {
  /** Returns the subset of `words` the checker considers misspelled. */
  checkBatch: (words: string[]) => Promise<string[]>;
  suggest: (word: string) => Promise<string[]>;
  add: (word: string) => Promise<void>;
}

export type SpellLoadStatus = 'idle' | 'loading' | 'ready' | 'error';

let worker: Worker | null = null;
let nextReqId = 1;
const pending = new Map<number, { resolve: (v: any) => void; reject: (e: any) => void }>();
let cached: SpellChecker | null = null;
let loadingPromise: Promise<SpellChecker> | null = null;
let lastError: Error | null = null;

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
export function getSpellChecker(): SpellChecker | null { return cached; }

/** In-memory caches shared with the extension — keep them on this module so
 *  toggling the feature off/on inside the same session is instant. */
export const goodCache = new Set<string>();
export const badCache = new Set<string>();

function request<T>(type: string, payload: any): Promise<T> {
  if (!worker) return Promise.reject(new Error('worker-not-ready'));
  const id = nextReqId++;
  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    worker!.postMessage({ id, type, payload });
  });
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load dictionary asset: ${url}`);
  const buf = await res.arrayBuffer();
  return new TextDecoder('utf-8').decode(buf);
}

async function loadDictFiles(): Promise<{ aff: string; dic: string }> {
  const cachedDict = await getCachedDict();
  if (cachedDict && cachedDict.aff && cachedDict.dic) {
    return { aff: cachedDict.aff, dic: cachedDict.dic };
  }
  const [aff, dic] = await Promise.all([fetchText(AFF_URL), fetchText(DIC_URL)]);
  // Fire-and-forget; failure to cache is fine.
  void putCachedDict({ aff, dic, savedAt: Date.now() });
  return { aff, dic };
}

export async function loadSpellChecker(): Promise<SpellChecker> {
  if (cached) return cached;
  if (loadingPromise) return loadingPromise;
  setStatus('loading');
  loadingPromise = (async () => {
    try {
      // Spawn worker (Vite resolves the URL at build time).
      worker = new Worker(new URL('./spellWorker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = (e: MessageEvent<any>) => {
        const { id, ok, result, error } = e.data || {};
        const slot = pending.get(id);
        if (!slot) return;
        pending.delete(id);
        if (ok) slot.resolve(result);
        else slot.reject(new Error(error || 'worker-error'));
      };
      worker.onerror = (e) => {
        lastError = new Error(e.message || 'worker-error');
        setStatus('error');
      };

      const { aff, dic } = await loadDictFiles();
      await request<void>('init', { aff, dic, custom: getCustomWords() });

      const checker: SpellChecker = {
        checkBatch: async (words: string[]) => {
          if (words.length === 0) return [];
          try { return await request<string[]>('check', { words }); }
          catch { return []; }
        },
        suggest: async (word: string) => {
          try { return await request<string[]>('suggest', { word }); }
          catch { return []; }
        },
        add: async (word: string) => {
          goodCache.add(word);
          badCache.delete(word);
          try { await request<void>('add', { word }); } catch { /* ignore */ }
        },
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
