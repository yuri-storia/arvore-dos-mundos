/**
 * Tiptap / ProseMirror extension that decorates misspelled PT-BR words.
 *
 * Architecture:
 *  - Pure decorations (no doc mutation). They disappear the instant the user
 *    disables the feature.
 *  - The actual Hunspell check happens inside a Web Worker (see
 *    `loadDictionary.ts` → `spellWorker.ts`). The extension keeps an in-memory
 *    word→verdict cache so steady-state typing stays cheap.
 *  - Recomputation is debounced (250ms) so heavy chapters don't lag.
 *  - We skip code marks, code blocks, links, mentions and URL-shaped tokens.
 */
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { EditorState, Transaction } from '@tiptap/pm/state';
import type { Node as PMNode } from '@tiptap/pm/model';
import { getSpellChecker, goodCache, badCache } from './loadDictionary';
import { isIgnoredForSession } from './customDictionary';

export const spellcheckPluginKey = new PluginKey('spellcheckPtBr');

// Letters (incl. accents) + apostrophe + hyphen.
const WORD_REGEX = /[\p{L}][\p{L}\p{M}'\u2019-]*/gu;
const URL_LIKE = /(^https?:\/\/)|(^www\.)|([\w-]+\.[\w-]+\/)/i;

interface PluginState {
  enabled: boolean;
  decorations: DecorationSet;
  version: number;
}

function shouldSkipWord(word: string): boolean {
  if (word.length < 2) return true;
  if (/\d/.test(word)) return true;
  if (word === word.toUpperCase() && word.length <= 6) return true;
  if (URL_LIKE.test(word)) return true;
  if (isIgnoredForSession(word.toLowerCase())) return true;
  return false;
}

interface Candidate { word: string; from: number; to: number; }

function collectCandidates(doc: PMNode): Candidate[] {
  const out: Candidate[] = [];
  doc.descendants((node, pos, parent) => {
    if (!node.isText || !node.text) return;
    // Skip text inside code blocks.
    if (parent && parent.type.name === 'codeBlock') return;
    // Skip text that carries the `code` or `link` mark.
    if (node.marks.some(m => m.type.name === 'code' || m.type.name === 'link')) return;
    const text = node.text;
    let match: RegExpExecArray | null;
    WORD_REGEX.lastIndex = 0;
    while ((match = WORD_REGEX.exec(text)) !== null) {
      const word = match[0];
      if (shouldSkipWord(word)) continue;
      out.push({ word, from: pos + match.index, to: pos + match.index + word.length });
    }
  });
  return out;
}

/**
 * Build the DecorationSet using only the in-memory caches.
 * Words that are still unknown to the cache are returned as `unknownWords` so
 * the async layer can ask the worker about them and then re-render.
 */
function buildFromCache(candidates: Candidate[]): { decorations: Decoration[]; unknownWords: string[] } {
  const decorations: Decoration[] = [];
  const unknown = new Set<string>();
  for (const c of candidates) {
    if (goodCache.has(c.word)) continue;
    const lower = c.word.toLowerCase();
    if (lower !== c.word && goodCache.has(lower)) continue;

    if (badCache.has(c.word) && !(lower !== c.word && goodCache.has(lower))) {
      decorations.push(Decoration.inline(c.from, c.to, { class: 'spell-error', 'data-word': c.word }));
      continue;
    }
    unknown.add(c.word);
    if (lower !== c.word) unknown.add(lower);
  }
  return { decorations, unknownWords: [...unknown] };
}

export interface SpellcheckOptions {
  enabled: boolean;
}

export const SpellcheckPtBr = Extension.create<SpellcheckOptions>({
  name: 'spellcheckPtBr',

  addOptions() {
    return { enabled: false };
  },

  addStorage() {
    return { enabled: false };
  },

  onCreate() {
    this.storage.enabled = this.options.enabled;
  },

  addCommands() {
    return {
      setSpellcheckEnabled:
        (value: boolean) =>
        ({ editor, dispatch }: { editor: any; dispatch?: any }) => {
          editor.extensionStorage.spellcheckPtBr.enabled = value;
          if (dispatch) {
            const tr = editor.state.tr.setMeta(spellcheckPluginKey, {
              type: 'set-enabled',
              enabled: value,
            });
            dispatch(tr);
          }
          return true;
        },
      refreshSpellcheck:
        () =>
        ({ editor, dispatch }: { editor: any; dispatch?: any }) => {
          if (dispatch) {
            const tr = editor.state.tr.setMeta(spellcheckPluginKey, { type: 'refresh' });
            dispatch(tr);
          }
          return true;
        },
    } as any;
  },

  addProseMirrorPlugins() {
    const extension = this;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let pendingCheck: number = 0;

    const recompute = (view: any) => {
      const pluginState = spellcheckPluginKey.getState(view.state);
      if (!pluginState?.enabled) return;
      const candidates = collectCandidates(view.state.doc);
      const { decorations, unknownWords } = buildFromCache(candidates);

      const apply = (decos: Decoration[]) => {
        if (view.isDestroyed) return;
        const set = DecorationSet.create(view.state.doc, decos);
        view.dispatch(view.state.tr.setMeta(spellcheckPluginKey, {
          type: 'apply-decorations',
          decorations: set,
        }));
      };
      apply(decorations);

      if (unknownWords.length === 0) return;
      const checker = getSpellChecker();
      if (!checker) return;
      const myToken = ++pendingCheck;
      checker.checkBatch(unknownWords).then((bad) => {
        if (myToken !== pendingCheck) return; // stale
        const badSet = new Set(bad);
        for (const w of unknownWords) {
          if (badSet.has(w)) badCache.add(w);
          else goodCache.add(w);
        }
        // Re-collect from the now-current doc and rebuild decorations.
        if (view.isDestroyed) return;
        const fresh = collectCandidates(view.state.doc);
        const { decorations: full } = buildFromCache(fresh);
        apply(full);
      }).catch(() => { /* ignore */ });
    };

    return [
      new Plugin<PluginState>({
        key: spellcheckPluginKey,
        state: {
          init: (): PluginState => ({
            enabled: extension.options.enabled,
            decorations: DecorationSet.empty,
            version: 0,
          }),
          apply(tr: Transaction, prev: PluginState, _old: EditorState, _newState: EditorState): PluginState {
            const meta = tr.getMeta(spellcheckPluginKey);
            let enabled = prev.enabled;
            let version = prev.version;
            let decorations = prev.decorations;

            if (meta?.type === 'set-enabled') {
              enabled = !!meta.enabled;
              if (!enabled) return { enabled: false, decorations: DecorationSet.empty, version };
              return { enabled, decorations, version: version + 1 };
            }
            if (meta?.type === 'refresh') {
              if (!enabled) return prev;
              return { enabled, decorations, version: version + 1 };
            }
            if (meta?.type === 'apply-decorations') {
              if (!enabled) return prev;
              return { enabled, decorations: meta.decorations as DecorationSet, version: version + 1 };
            }

            if (!enabled) return prev;
            if (tr.docChanged) {
              decorations = decorations.map(tr.mapping, tr.doc);
              return { enabled, decorations, version };
            }
            return prev;
          },
        },
        props: {
          decorations(state) {
            return spellcheckPluginKey.getState(state)?.decorations || null;
          },
        },
        view(editorView) {
          const schedule = () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => recompute(editorView), 250);
          };
          return {
            update(view, prevState) {
              const pluginState = spellcheckPluginKey.getState(view.state);
              if (!pluginState?.enabled) return;
              const prevPlugin = spellcheckPluginKey.getState(prevState);
              const docChanged = !view.state.doc.eq(prevState.doc);
              const versionBumped = prevPlugin && pluginState.version !== prevPlugin.version;
              if (docChanged || versionBumped) schedule();
            },
            destroy() {
              if (debounceTimer) clearTimeout(debounceTimer);
            },
          };
        },
      }),
    ];
  },
});

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    spellcheckPtBr: {
      setSpellcheckEnabled: (value: boolean) => ReturnType;
      refreshSpellcheck: () => ReturnType;
    };
  }
}
