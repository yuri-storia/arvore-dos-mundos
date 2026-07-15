// Tiptap Mark that wraps arbitrary selected text with a link to a Codex entry.
// Renders as `<span class="codex-link" data-id="..." data-label="...">text</span>`
// so the visible text can be any word (e.g. "homúnculo") while the link points
// to the canonical entry ("Homúnculos"). RichTextView renders these as
// interactive MentionChips.

import { Mark, mergeAttributes } from '@tiptap/core';

export interface CodexLinkAttributes {
  id: string;
  label: string;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    codexLink: {
      setCodexLink: (attrs: CodexLinkAttributes) => ReturnType;
      unsetCodexLink: () => ReturnType;
    };
  }
}

export const CodexLinkMark = Mark.create({
  name: 'codexLink',
  inclusive: false,
  exitable: true,
  spanning: false,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-id'),
        renderHTML: (attrs) => (attrs.id ? { 'data-id': attrs.id } : {}),
      },
      label: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-label'),
        renderHTML: (attrs) => (attrs.label ? { 'data-label': attrs.label } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span.codex-link' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes({ class: 'codex-link' }, HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setCodexLink:
        (attrs) =>
        ({ commands }) =>
          commands.setMark(this.name, attrs),
      unsetCodexLink:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },
});

export default CodexLinkMark;
