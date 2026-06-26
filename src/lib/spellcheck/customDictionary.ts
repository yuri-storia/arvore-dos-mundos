// Personal dictionary persisted in localStorage.
// Words added here are never flagged as misspelled and never trigger a
// suggestion lookup.

const KEY = "spellcheck-custom-words-v1";

function read(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.map((s) => String(s).toLowerCase()));
  } catch {
    return new Set();
  }
}

function write(set: Set<string>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(Array.from(set)));
  } catch {
    /* quota or disabled storage — ignore */
  }
}

export function isCustomWord(word: string): boolean {
  return read().has(word.toLowerCase());
}

export function addCustomWord(word: string) {
  const w = word.trim().toLowerCase();
  if (!w) return;
  const set = read();
  set.add(w);
  write(set);
  window.dispatchEvent(new CustomEvent("spellcheck:custom-dict-changed"));
}

export function removeCustomWord(word: string) {
  const set = read();
  if (set.delete(word.trim().toLowerCase())) write(set);
}

export function listCustomWords(): string[] {
  return Array.from(read()).sort();
}
