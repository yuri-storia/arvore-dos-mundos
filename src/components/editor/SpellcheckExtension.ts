// Tiptap extension that renders PT-BR misspellings with a red wavy underline
// using our own nspell-based Web Worker dictionary. Does NOT depend on the
// browser's native spellcheck (which often lacks PT-BR support).
//
// Right-click suggestions are handled by the global SpellcheckProvider via
// wordAtPoint.ts; this extension is purely responsible for the visual marker.

import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import type { Node as PMNode } from "@tiptap/pm/model";
import { checkManyWords } from "@/lib/spellcheck/useSpellSuggestions";
import { isCustomWord } from "@/lib/spellcheck/customDictionary";
import { isSpellcheckEnabled } from "@/lib/spellcheck/spellcheckSettings";

const WORD_RE = /[\p{L}\p{M}][\p{L}\p{M}'\-]*/gu;

// Process-wide cache: word (lowercased) → isCorrect. Survives editor remounts.
const verdictCache = new Map<string, boolean>();
const MAX_CACHE = 5000;

function rememberVerdict(word: string, correct: boolean) {
  if (verdictCache.size >= MAX_CACHE) {
    const k = verdictCache.keys().next().value;
    if (k) verdictCache.delete(k);
  }
  verdictCache.set(word.toLowerCase(), correct);
}

interface PluginState {
  decorations: DecorationSet;
  version: number; // increments each time we recompute
}

const key = new PluginKey<PluginState>("spellcheck-decorations");

// Skip words shorter than this to avoid false positives & noise.
const MIN_WORD_LEN = 2;

// Words that are likely proper nouns / numbers we don't want flagged.
function shouldSkip(word: string): boolean {
  if (word.length < MIN_WORD_LEN) return true;
  if (/^\d/.test(word)) return true;
  if (/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ]{2,}$/.test(word)) return true; // ALL CAPS acronyms
  if (isCustomWord(word)) return true;
  return false;
}

function collectWords(doc: PMNode): Array<{ word: string; from: number; to: number }> {
  const hits: Array<{ word: string; from: number; to: number }> = [];
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    const text = node.text;
    WORD_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = WORD_RE.exec(text)) !== null) {
      const word = m[0];
      if (shouldSkip(word)) continue;
      const from = pos + m.index;
      const to = from + word.length;
      hits.push({ word, from, to });
    }
  });
  return hits;
}

function buildDecorations(
  doc: PMNode,
  cache: Map<string, boolean>,
): DecorationSet {
  if (!isSpellcheckEnabled()) return DecorationSet.empty;
  const decos: Decoration[] = [];
  const seen = collectWords(doc);
  for (const h of seen) {
    const verdict = cache.get(h.word.toLowerCase());
    if (verdict === false) {
      decos.push(
        Decoration.inline(h.from, h.to, {
          class: "spell-error",
          spellcheck: "false",
        }),
      );
    }
  }
  return DecorationSet.create(doc, decos);
}

export interface SpellcheckExtensionOptions {
  /** Debounce window in ms before running the next dictionary lookup batch. */
  debounceMs?: number;
  /** Set to false to completely disable (e.g. for plaintext-only fields). */
  enabled?: boolean;
}

export const SpellcheckExtension = Extension.create<SpellcheckExtensionOptions>({
  name: "ptBrSpellcheck",

  addOptions() {
    return {
      debounceMs: 350,
      enabled: true,
    };
  },

  addProseMirrorPlugins() {
    if (!this.options.enabled) return [];
    const debounceMs = this.options.debounceMs ?? 350;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let inflight = false;

    const scheduleCheck = (view: { state: EditorState; dispatch: (tr: Transaction) => void }) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        // Honor runtime toggle: if disabled, just clear and bail.
        if (!isSpellcheckEnabled()) {
          const tr = view.state.tr.setMeta(key, { recompute: true });
          view.dispatch(tr);
          return;
        }
        if (inflight) {
          // Re-schedule if another batch is still running
          scheduleCheck(view);
          return;
        }
        const hits = collectWords(view.state.doc);
        const unknown = new Set<string>();
        for (const h of hits) {
          const k = h.word.toLowerCase();
          if (!verdictCache.has(k)) unknown.add(h.word);
        }
        if (unknown.size === 0) {
          // Even if no new lookups needed, re-build (custom dict may have changed)
          const tr = view.state.tr.setMeta(key, { recompute: true });
          view.dispatch(tr);
          return;
        }
        inflight = true;
        try {
          // Worker can handle a few thousand words per batch easily.
          const results = await checkManyWords(Array.from(unknown));
          for (const w of Object.keys(results)) {
            rememberVerdict(w, results[w]);
          }
        } catch {
          /* noop */
        } finally {
          inflight = false;
        }
        const tr = view.state.tr.setMeta(key, { recompute: true });
        view.dispatch(tr);
      }, debounceMs);
    };

    return [
      new Plugin<PluginState>({
        key,
        state: {
          init: (_, state) => ({
            decorations: buildDecorations(state.doc, verdictCache),
            version: 0,
          }),
          apply(tr, value, _oldState, newState) {
            const meta = tr.getMeta(key) as { recompute?: boolean } | undefined;
            if (meta?.recompute) {
              return {
                decorations: buildDecorations(newState.doc, verdictCache),
                version: value.version + 1,
              };
            }
            if (tr.docChanged) {
              // Map existing decorations forward so they don't visually lag.
              return {
                decorations: value.decorations.map(tr.mapping, tr.doc),
                version: value.version,
              };
            }
            return value;
          },
        },
        props: {
          decorations(state) {
            return key.getState(state)?.decorations ?? DecorationSet.empty;
          },
        },
        view(view) {
          // Kick off initial check + react to custom dictionary changes.
          scheduleCheck(view);
          const onDictChanged = () => scheduleCheck(view);
          window.addEventListener("spellcheck:custom-dict-changed", onDictChanged);
          return {
            update(v, prevState) {
              if (!v.state.doc.eq(prevState.doc)) {
                scheduleCheck(v);
              }
            },
            destroy() {
              if (timer) clearTimeout(timer);
              window.removeEventListener("spellcheck:custom-dict-changed", onDictChanged);
            },
          };
        },
      }),
    ];
  },
});

export default SpellcheckExtension;
