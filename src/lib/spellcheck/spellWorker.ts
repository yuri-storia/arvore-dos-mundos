// Web Worker that runs a Hunspell-compatible PT-BR spellchecker (nspell)
// fully offline using a bundled dictionary. No AI, no network calls beyond
// fetching the static dictionary asset shipped with the app.
//
// Messages:
//   { id, type: "check",  word }                       → { id, correct }
//   { id, type: "suggest", word }                      → { id, suggestions }
//   { id, type: "lookup", word }                       → { id, correct, suggestions }
//   { id, type: "add",    word }                       → { id, ok }
//   { id, type: "ready" }                              → { id, ready }

// Dictionary files are shipped as static assets under /public/dict/.
const affUrl = "/dict/pt.aff";
const dicUrl = "/dict/pt.dic";
import NSpell from "nspell";

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
    const [aff, dic] = await Promise.all([affRes.text(), dicRes.text()]);
    spell = NSpell({ aff, dic }) as unknown as SpellInstance;
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
        try { results[w] = s.correct(w); } catch { results[w] = true; }
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
