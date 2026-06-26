// Tiptap extension that renders PT-BR misspellings with a red wavy underline
// (orthography, via local Hunspell worker) and AI-detected grammar/style
// issues with a yellow wavy underline.
//
// Three passes are merged into one DecorationSet:
//   1. Dicionário local (rápido, off-line)      → .spell-error            (vermelho)
//   2. Regras contextuais determinísticas       → .spell-error.spell-context (vermelho)
//   3. Revisor IA por parágrafo (Gemini Flash)  → .spell-error (spelling) +
//                                                 .spell-warning (grammar/style)
//
// Right-click / left-click / hover suggestions are handled by the global
// SpellcheckProvider via wordAtPoint.ts; this extension is purely visual.

import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import type { Node as PMNode } from "@tiptap/pm/model";
import { checkManyWords } from "@/lib/spellcheck/useSpellSuggestions";
import { isCustomWord } from "@/lib/spellcheck/customDictionary";
import { isSpellcheckEnabled } from "@/lib/spellcheck/spellcheckSettings";
import { findContextIssues } from "@/lib/spellcheck/contextRules";
import {
  getCachedIssues,
  reviewParagraph,
  type AIIssue,
} from "@/lib/spellcheck/aiReviewer";


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
  version: number;
}

const key = new PluginKey<PluginState>("spellcheck-decorations");

const MIN_WORD_LEN = 2;

function shouldSkip(word: string): boolean {
  if (word.length < MIN_WORD_LEN) return true;
  if (/^\d/.test(word)) return true;
  if (/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ]{2,}$/.test(word)) return true;
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

// Coleta blocos de parágrafo para revisão por IA. Concatena nós de texto
// do mesmo bloco e guarda a posição inicial do bloco (start) para mapear
// offsets de volta ao documento.
interface ParaBlock {
  text: string;
  start: number; // posição (PM) do primeiro caractere de texto do bloco
  textNodes: Array<{ pos: number; text: string }>;
}

function collectParagraphs(doc: PMNode): ParaBlock[] {
  const blocks: ParaBlock[] = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return undefined;
    if (node.childCount === 0) return false;
    const textNodes: Array<{ pos: number; text: string }> = [];
    let combined = "";
    let firstPos = -1;
    node.descendants((child, offset) => {
      if (child.isText && child.text) {
        const absPos = pos + 1 + offset;
        if (firstPos < 0) firstPos = absPos;
        textNodes.push({ pos: absPos, text: child.text });
        combined += child.text;
      }
    });
    if (combined.trim().length >= 4 && firstPos >= 0) {
      blocks.push({ text: combined, start: firstPos, textNodes });
    }
    return false; // não desça mais — textblock é folha lógica para nós
  });
  return blocks;
}

// Mapeia um offset (relativo ao texto concatenado do bloco) para a posição
// absoluta no doc, atravessando múltiplos nós de texto.
function offsetToDocPos(block: ParaBlock, offset: number): number {
  let remaining = offset;
  for (const n of block.textNodes) {
    if (remaining <= n.text.length) return n.pos + remaining;
    remaining -= n.text.length;
  }
  // Fim do último nó.
  const last = block.textNodes[block.textNodes.length - 1];
  return last ? last.pos + last.text.length : block.start;
}

function buildDecorations(
  doc: PMNode,
  cache: Map<string, boolean>,
): DecorationSet {
  if (!isSpellcheckEnabled()) return DecorationSet.empty;
  const decos: Decoration[] = [];

  // Pass 1: dicionário (palavras inexistentes).
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

  // Pass 2: regras contextuais determinísticas.
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    const issues = findContextIssues(node.text);
    for (const i of issues) {
      decos.push(
        Decoration.inline(pos + i.from, pos + i.to, {
          class: "spell-error spell-context",
          spellcheck: "false",
          "data-context-suggestion": i.suggestion,
          "data-context-reason": i.reason,
          "data-context-rule": i.ruleId,
        }),
      );
    }
  });

  // Pass 3: issues da IA, lidas do cache (não dispara rede aqui — quem
  // dispara é o scheduler em scheduleCheck()).
  const blocks = collectParagraphs(doc);
  for (const b of blocks) {
    const issues = getCachedIssues(b.text);
    if (!issues || issues.length === 0) continue;
    for (const it of issues) {
      const from = offsetToDocPos(b, it.offset);
      const to = offsetToDocPos(b, it.offset + it.length);
      if (to <= from) continue;
      const cls = it.type === "spelling"
        ? "spell-error spell-ai"
        : `spell-warning spell-${it.type}`;
      decos.push(
        Decoration.inline(from, to, {
          class: cls,
          spellcheck: "false",
          "data-ai-suggestions": JSON.stringify(it.suggestions || []),
          "data-ai-reason": it.reason || "",
          "data-ai-type": it.type,
        }),
      );
    }
  }

  return DecorationSet.create(doc, decos);
}


export interface SpellcheckExtensionOptions {
  debounceMs?: number;
  enabled?: boolean;
  /** Habilita a camada de revisão por IA (gramática/estilo). */
  aiReview?: boolean;
  /** Debounce extra antes de chamar a IA (espera o usuário pausar). */
  aiDebounceMs?: number;
}

export const SpellcheckExtension = Extension.create<SpellcheckExtensionOptions>({
  name: "ptBrSpellcheck",

  addOptions() {
    return {
      debounceMs: 120,
      enabled: true,
      aiReview: true,
      aiDebounceMs: 1500,
    };
  },

  addProseMirrorPlugins() {
    if (!this.options.enabled) return [];
    const debounceMs = this.options.debounceMs ?? 120;
    const aiDebounceMs = this.options.aiDebounceMs ?? 1500;
    const aiEnabled = this.options.aiReview !== false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let aiTimer: ReturnType<typeof setTimeout> | null = null;
    let inflight = false;

    const scheduleAI = (view: { state: EditorState; dispatch: (tr: Transaction) => void }) => {
      if (!aiEnabled) return;
      if (aiTimer) clearTimeout(aiTimer);
      aiTimer = setTimeout(async () => {
        if (!isSpellcheckEnabled()) return;
        const blocks = collectParagraphs(view.state.doc);
        // Limita revisão a parágrafos sem cache para não saturar a API.
        const targets = blocks.filter((b) => getCachedIssues(b.text) === null)
          .slice(0, 6);
        if (targets.length === 0) return;
        // Disparos em paralelo (cap 3).
        const chunks: ParaBlock[][] = [];
        for (let i = 0; i < targets.length; i += 3) {
          chunks.push(targets.slice(i, i + 3));
        }
        for (const chunk of chunks) {
          await Promise.all(chunk.map((b) => reviewParagraph(b.text)));
          // Rebuild incremental após cada lote para feedback rápido.
          const tr = view.state.tr.setMeta(key, { recompute: true });
          view.dispatch(tr);
        }
      }, aiDebounceMs);
    };

    const scheduleCheck = (view: { state: EditorState; dispatch: (tr: Transaction) => void }) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        if (!isSpellcheckEnabled()) {
          const tr = view.state.tr.setMeta(key, { recompute: true });
          view.dispatch(tr);
          return;
        }
        if (inflight) {
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
          const tr = view.state.tr.setMeta(key, { recompute: true });
          view.dispatch(tr);
          scheduleAI(view);
          return;
        }
        inflight = true;
        try {
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
        scheduleAI(view);
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
              return {
                decorations: buildDecorations(newState.doc, verdictCache),
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
          scheduleCheck(view);
          const onDictChanged = () => scheduleCheck(view);
          const onToggleChanged = () => scheduleCheck(view);
          window.addEventListener("spellcheck:custom-dict-changed", onDictChanged);
          window.addEventListener("spellcheck:enabled-changed", onToggleChanged);
          return {
            update(v, prevState) {
              if (!v.state.doc.eq(prevState.doc)) {
                scheduleCheck(v);
              }
            },
            destroy() {
              if (timer) clearTimeout(timer);
              if (aiTimer) clearTimeout(aiTimer);
              window.removeEventListener("spellcheck:custom-dict-changed", onDictChanged);
              window.removeEventListener("spellcheck:enabled-changed", onToggleChanged);
            },
          };
        },
      }),
    ];
  },
});

export default SpellcheckExtension;
