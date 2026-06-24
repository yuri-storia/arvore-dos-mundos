/**
 * Tiptap / ProseMirror extension that decorates misspelled PT-BR words.
 *
 * Design notes:
 *  - We never modify the document. We only render Decorations (inline spans
 *    with the `.spell-error` class). This keeps the model clean and the
 *    decorations vanish the moment the extension is disabled.
 *  - The dictionary is loaded lazily by the consumer (RichTextEditor calls
 *    `loadSpellChecker()` when the user toggles the feature on). Until the
 *    checker is ready, this plugin renders nothing — the editor still works.
 *  - Recomputation is debounced (250ms) so heavy chapters don't lag while
 *    the user is typing.
 */
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { EditorState, Transaction } from '@tiptap/pm/state';
import type { Node as PMNode } from '@tiptap/pm/model';
import { getSpellChecker } from './loadDictionary';
import { isIgnoredForSession } from './customDictionary';

export const spellcheckPluginKey = new PluginKey('spellcheckPtBr');

// Letters (incl. accents) + apostrophe + hyphen.
const WORD_REGEX = /[\p{L}][\p{L}\p{M}'\u2019-]*/gu;

interface PluginState {
  enabled: boolean;
  decorations: DecorationSet;
  /** Marker used to detect when we should recompute (doc change, enable, version bump). */
  version: number;
}

function shouldSkipWord(word: string): boolean {
  if (word.length < 2) return true;
  // Skip numbers and tokens that contain digits.
  if (/\d/.test(word)) return true;
  // Skip ALL CAPS abbreviations (USA, RPG, etc).
  if (word === word.toUpperCase() && word.length <= 6) return true;
  if (isIgnoredForSession(word.toLowerCase())) return true;
  return false;
}

function computeDecorations(doc: PMNode): DecorationSet {
  const checker = getSpellChecker();
  if (!checker) return DecorationSet.empty;

  const decos: Decoration[] = [];
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    // Don't check inside mentions, code, or links — the parent node is not text,
    // so descendants() already skips them.
    const text = node.text;
    let match: RegExpExecArray | null;
    WORD_REGEX.lastIndex = 0;
    while ((match = WORD_REGEX.exec(text)) !== null) {
      const word = match[0];
      if (shouldSkipWord(word)) continue;
      if (checker.correct(word)) continue;
      // Accept capitalised forms whose lowercase variant is in the dictionary
      // (e.g. sentence-initial "Casa"). This prevents flagging valid words that
      // happen to start a sentence, while still catching real typos like "Cassa".
      const lower = word.toLowerCase();
      if (lower !== word && checker.correct(lower)) continue;
      const from = pos + match.index;
      const to = from + word.length;
      decos.push(
        Decoration.inline(from, to, {
          class: 'spell-error',
          'data-word': word,
        }),
      );
    }
  });
  return DecorationSet.create(doc, decos);
}

export interface SpellcheckOptions {
  /** Whether the plugin is initially enabled. */
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

    return [
      new Plugin<PluginState>({
        key: spellcheckPluginKey,
        state: {
          init: (_cfg, _state): PluginState => ({
            enabled: extension.options.enabled,
            decorations: DecorationSet.empty,
            version: 0,
          }),
          apply(tr: Transaction, prev: PluginState, _old: EditorState, newState: EditorState): PluginState {
            const meta = tr.getMeta(spellcheckPluginKey);
            let enabled = prev.enabled;
            let version = prev.version;
            let decorations = prev.decorations;

            if (meta?.type === 'set-enabled') {
              enabled = !!meta.enabled;
              if (!enabled) {
                return { enabled: false, decorations: DecorationSet.empty, version };
              }
              // When toggling on, compute synchronously if the checker is ready.
              decorations = computeDecorations(newState.doc);
              version += 1;
              return { enabled, decorations, version };
            }
            if (meta?.type === 'refresh') {
              if (!enabled) return prev;
              decorations = computeDecorations(newState.doc);
              version += 1;
              return { enabled, decorations, version };
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
          const scheduleRecompute = () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
              const pluginState = spellcheckPluginKey.getState(editorView.state);
              if (!pluginState?.enabled) return;
              const decorations = computeDecorations(editorView.state.doc);
              editorView.dispatch(
                editorView.state.tr.setMeta(spellcheckPluginKey, {
                  type: 'apply-decorations',
                  decorations,
                }),
              );
            }, 250);
          };
          return {
            update(view, prevState) {
              const pluginState = spellcheckPluginKey.getState(view.state);
              if (!pluginState?.enabled) return;
              if (!view.state.doc.eq(prevState.doc)) {
                scheduleRecompute();
              }
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
