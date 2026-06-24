/// <reference lib="webworker" />
/**
 * Dedicated Web Worker for PT-BR spell checking.
 * Runs typo-js off the main thread so the editor never freezes during the
 * heavy `.dic` parse (~5 MB → ~1–2 s on mid-range hardware).
 *
 * Protocol: `{ id, type, payload }` request → `{ id, ok, result?, error? }` reply.
 */
// @ts-ignore typo-js has no types
import Typo from 'typo-js';

let typo: any = null;

type Req =
  | { id: number; type: 'init'; payload: { aff: string; dic: string; custom: string[] } }
  | { id: number; type: 'check'; payload: { words: string[] } }
  | { id: number; type: 'suggest'; payload: { word: string } }
  | { id: number; type: 'add'; payload: { word: string } };

self.onmessage = (e: MessageEvent<Req>) => {
  const { id, type, payload } = e.data;
  try {
    if (type === 'init') {
      typo = new Typo('pt_BR', payload.aff, payload.dic, { platform: 'any' });
      for (const w of payload.custom) {
        try { typo.dictionaryTable.set(w, null); } catch { /* ignore */ }
      }
      (self as any).postMessage({ id, ok: true });
      return;
    }
    if (!typo) throw new Error('not-initialized');
    if (type === 'check') {
      const bad: string[] = [];
      for (const w of payload.words) {
        if (!typo.check(w)) bad.push(w);
      }
      (self as any).postMessage({ id, ok: true, result: bad });
    } else if (type === 'suggest') {
      const r = typo.suggest(payload.word, 5) as string[];
      (self as any).postMessage({ id, ok: true, result: r });
    } else if (type === 'add') {
      typo.dictionaryTable.set(payload.word, null);
      (self as any).postMessage({ id, ok: true });
    }
  } catch (err: any) {
    (self as any).postMessage({ id, ok: false, error: String(err?.message || err) });
  }
};
