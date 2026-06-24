/**
 * Personal dictionary: words the user has explicitly accepted.
 * Persisted in localStorage so it survives reloads. Keyed by language.
 */
const KEY = 'adm-spell-custom-pt-br';

export function getCustomWords(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((w) => typeof w === 'string') : [];
  } catch {
    return [];
  }
}

export function addCustomWord(word: string): string[] {
  const cur = new Set(getCustomWords());
  cur.add(word);
  const arr = [...cur];
  try { localStorage.setItem(KEY, JSON.stringify(arr)); } catch { /* ignore */ }
  return arr;
}

export function removeCustomWord(word: string): string[] {
  const arr = getCustomWords().filter((w) => w !== word);
  try { localStorage.setItem(KEY, JSON.stringify(arr)); } catch { /* ignore */ }
  return arr;
}

/** Ignore list: words ignored just for this session (not persisted). */
const sessionIgnored = new Set<string>();
export function ignoreWordForSession(word: string) { sessionIgnored.add(word); }
export function isIgnoredForSession(word: string) { return sessionIgnored.has(word); }
