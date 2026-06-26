// Detect the word under a mouse coordinate, across <input>, <textarea> and
// contenteditable / Tiptap surfaces. Returns enough info to both call the
// suggestion endpoint with context AND replace the word in place later.

export interface WordHit {
  word: string;
  before: string; // ~80 chars before the word
  after: string; // ~80 chars after the word
  replace: (next: string) => void;
  rect: DOMRect; // bounding rect of the word for popover anchoring
}

const WORD_RE = /[\p{L}\p{M}][\p{L}\p{M}'\-]*/u;
// Unicode-aware test used to walk characters left/right from the cursor.
const WORD_CHAR_RE = /[\p{L}\p{M}'\-]/u;

const CONTEXT_RADIUS = 80;

export function wordAtPoint(e: MouseEvent): WordHit | null {
  const target = e.target as HTMLElement | null;
  if (!target) return null;

  // Opt-out hook for sensitive fields.
  if (target.closest("[data-no-spellcheck]")) return null;

  // 1) <input> / <textarea>
  if (
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLInputElement && isTextualInput(target))
  ) {
    return hitFromTextField(target, e);
  }

  // 2) contenteditable (Tiptap, plain CE)
  const editable = target.closest('[contenteditable=""], [contenteditable="true"]');
  if (editable) {
    return hitFromContentEditable(editable as HTMLElement, e);
  }

  return null;
}

function isTextualInput(el: HTMLInputElement): boolean {
  const t = (el.type || "text").toLowerCase();
  return (
    t === "text" ||
    t === "search" ||
    t === "url" ||
    t === "" ||
    t === "textarea"
  );
}

function hitFromTextField(
  el: HTMLTextAreaElement | HTMLInputElement,
  e: MouseEvent,
): WordHit | null {
  const value = el.value ?? "";
  if (!value) return null;

  // Best-effort caret from coords. Browsers don't expose this for inputs,
  // so we fall back to current selection.
  const caret = caretIndexFromInput(el, e) ?? el.selectionStart ?? 0;
  const { start, end, word } = wordBoundsAt(value, caret);
  if (!word) return null;

  const before = value.slice(Math.max(0, start - CONTEXT_RADIUS), start);
  const after = value.slice(end, end + CONTEXT_RADIUS);

  const replace = (next: string) => {
    const adjusted = preserveCase(word, next);
    const newVal = value.slice(0, start) + adjusted + value.slice(end);
    setNativeValue(el, newVal);
    // Move caret to end of replacement.
    const pos = start + adjusted.length;
    try {
      el.setSelectionRange(pos, pos);
    } catch { /* ignore */ }
  };

  // Anchor popover near click point — input doesn't give per-word rects.
  const rect = new DOMRect(e.clientX, e.clientY, 0, 0);
  return { word, before, after, replace, rect };
}

function caretIndexFromInput(
  el: HTMLTextAreaElement | HTMLInputElement,
  _e: MouseEvent,
): number | null {
  // Browsers don't expose a reliable hit-test for inputs. The select event
  // that just fired (right-click usually selects/positions the caret) gives
  // us a usable approximation via selectionStart.
  return typeof el.selectionStart === "number" ? el.selectionStart : null;
}

function hitFromContentEditable(
  root: HTMLElement,
  e: MouseEvent,
): WordHit | null {
  const range = caretRangeFromPoint(e.clientX, e.clientY);
  if (!range) return null;
  const node = range.startContainer;
  if (node.nodeType !== Node.TEXT_NODE) return null;
  const text = node.textContent ?? "";
  if (!text) return null;

  const { start, end, word } = wordBoundsAt(text, range.startOffset);
  if (!word) return null;

  // Build a DOM Range covering just the word so we can grab a precise rect
  // and later replace it without disturbing surrounding marks.
  const wordRange = document.createRange();
  wordRange.setStart(node, start);
  wordRange.setEnd(node, end);
  const rect = wordRange.getBoundingClientRect();

  // Pull ~80 chars of context from the surrounding plain text of the root.
  const plain = root.textContent ?? "";
  const wordIdxInPlain = plain.indexOf(word); // rough; OK for context only
  const cBefore = wordIdxInPlain >= 0
    ? plain.slice(Math.max(0, wordIdxInPlain - CONTEXT_RADIUS), wordIdxInPlain)
    : "";
  const cAfter = wordIdxInPlain >= 0
    ? plain.slice(
      wordIdxInPlain + word.length,
      wordIdxInPlain + word.length + CONTEXT_RADIUS,
    )
    : "";

  const replace = (next: string) => {
    const adjusted = preserveCase(word, next);
    // Re-resolve the range in case the DOM moved (unlikely in popover lifetime).
    try {
      const r = document.createRange();
      r.setStart(node, start);
      r.setEnd(node, end);
      r.deleteContents();
      r.insertNode(document.createTextNode(adjusted));
      // Move caret to end of inserted text.
      const sel = window.getSelection();
      if (sel) {
        const after = document.createRange();
        after.setStart(node, start + adjusted.length);
        after.collapse(true);
        sel.removeAllRanges();
        sel.addRange(after);
      }
      // Trigger input event so frameworks (Tiptap, React) sync.
      root.dispatchEvent(new InputEvent("input", { bubbles: true }));
    } catch (err) {
      console.warn("spellcheck replace failed", err);
    }
  };

  return { word, before: cBefore, after: cAfter, replace, rect };
}

function caretRangeFromPoint(x: number, y: number): Range | null {
  // Standards: document.caretPositionFromPoint; WebKit/Blink: caretRangeFromPoint
  // deno-lint-ignore no-explicit-any
  const doc = document as any;
  if (typeof doc.caretRangeFromPoint === "function") {
    return doc.caretRangeFromPoint(x, y) as Range | null;
  }
  if (typeof doc.caretPositionFromPoint === "function") {
    const pos = doc.caretPositionFromPoint(x, y);
    if (!pos) return null;
    const r = document.createRange();
    r.setStart(pos.offsetNode, pos.offset);
    r.collapse(true);
    return r;
  }
  return null;
}

function wordBoundsAt(
  text: string,
  index: number,
): { start: number; end: number; word: string } {
  if (!text) return { start: 0, end: 0, word: "" };
  const i = Math.max(0, Math.min(index, text.length));

  // Walk left while the previous char is a word char.
  let start = i;
  while (start > 0 && WORD_CHAR_RE.test(text[start - 1])) start--;
  // Walk right while the current char is a word char.
  let end = i;
  while (end < text.length && WORD_CHAR_RE.test(text[end])) end++;

  const word = text.slice(start, end);
  if (!word || !WORD_RE.test(word)) return { start: i, end: i, word: "" };
  return { start, end, word };
}

function preserveCase(original: string, replacement: string): string {
  if (!original) return replacement;
  if (original === original.toUpperCase() && original.length > 1) {
    return replacement.toUpperCase();
  }
  if (original[0] === original[0].toUpperCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

// React (and other libs) shadow the native value setter; calling it directly
// is the canonical way to update a controlled input and dispatch a synthetic
// event that React will recognize.
function setNativeValue(
  el: HTMLInputElement | HTMLTextAreaElement,
  value: string,
) {
  const proto = Object.getPrototypeOf(el);
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (setter) setter.call(el, value);
  else el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}
