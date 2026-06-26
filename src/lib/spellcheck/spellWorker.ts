// Web Worker that runs the real Hunspell engine for Portuguese (Brazil)
// fully offline using a bundled PT-BR dictionary. No AI, no network calls
// beyond fetching the static dictionary assets shipped with the app.
//
// Messages:
//   { id, type: "check",  word }                       → { id, correct }
//   { id, type: "suggest", word }                      → { id, suggestions }
//   { id, type: "lookup", word }                       → { id, correct, suggestions }
//   { id, type: "add",    word }                       → { id, ok }
//   { id, type: "ready" }                              → { id, ready }

import { loadModule } from "hunspell-asm";
import type { Hunspell } from "hunspell-asm";

// Dictionary files are shipped as static assets under /public/dict/.
// Use the Brazil-specific VERO dictionary instead of generic Portuguese.
const affUrl = "/dict/pt-br.aff";
const dicUrl = "/dict/pt-br.dic";

type SpellInstance = {
  correct: (w: string) => boolean;
  suggest: (w: string) => string[];
  add: (w: string) => void;
};

let spell: SpellInstance | null = null;
let bootPromise: Promise<SpellInstance> | null = null;

async function boot(): Promise<SpellInstance> {
  if (spell) return spell;
  if (bootPromise) return bootPromise;
  bootPromise = (async () => {
    const [affRes, dicRes] = await Promise.all([fetch(affUrl), fetch(dicUrl)]);
    if (!affRes.ok || !dicRes.ok) {
      throw new Error(`PT-BR dictionary failed to load (${affRes.status}/${dicRes.status})`);
    }
    const [aff, dic] = await Promise.all([affRes.arrayBuffer(), dicRes.arrayBuffer()]);
    const factory = await loadModule({ timeout: 20000 });
    const affPath = factory.mountBuffer(new Uint8Array(aff), "pt-br.aff");
    const dicPath = factory.mountBuffer(new Uint8Array(dic), "pt-br.dic");
    const hunspell: Hunspell = factory.create(affPath, dicPath);

    spell = {
      correct: (w: string) => hunspell.spell(w),
      suggest: (w: string) => hunspell.suggest(w),
      add: (w: string) => hunspell.addWord(w),
    };
    return spell;
  })();
  return bootPromise;
}

// Warm up immediately so the first user request is fast.
void boot().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[spellWorker] failed to boot", err);
});

interface InMsg {
  id: number;
  type: "check" | "checkMany" | "suggest" | "lookup" | "add" | "ready";
  word?: string;
  words?: string[];
}

self.addEventListener("message", async (ev: MessageEvent<InMsg>) => {
  const { id, type, word, words } = ev.data || ({} as InMsg);
  try {
    const s = await boot();
    if (type === "ready") {
      (self as unknown as Worker).postMessage({ id, ready: true });
      return;
    }
    if (type === "checkMany") {
      const list = Array.isArray(words) ? words : [];
      const results: Record<string, boolean> = {};
      for (const w of list) {
        if (!w) continue;
        if (results[w] !== undefined) continue;
        try { results[w] = s.correct(w); } catch { results[w] = false; }
      }
      (self as unknown as Worker).postMessage({ id, results });
      return;
    }
    if (!word) {
      (self as unknown as Worker).postMessage({ id, error: "missing word" });
      return;
    }
    if (type === "check") {
      (self as unknown as Worker).postMessage({ id, correct: s.correct(word) });
    } else if (type === "suggest") {
      (self as unknown as Worker).postMessage({
        id,
        suggestions: s.suggest(word).slice(0, 6),
      });
    } else if (type === "lookup") {
      const correct = s.correct(word);
      (self as unknown as Worker).postMessage({
        id,
        correct,
        suggestions: correct ? [] : s.suggest(word).slice(0, 6),
      });
    } else if (type === "add") {
      s.add(word);
      (self as unknown as Worker).postMessage({ id, ok: true });
    }
  } catch (err) {
    (self as unknown as Worker).postMessage({
      id,
      error: (err as Error)?.message ?? "spell error",
    });
  }
});

export {};
