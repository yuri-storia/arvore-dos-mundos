import { useEffect, useState, useCallback } from 'react';

export type FontSizePref = 'comfortable' | 'default' | 'compact';

const STORAGE_KEY = 'arvore.fontSize';
const CLASSES: Record<FontSizePref, string> = {
  comfortable: 'font-size-comfortable',
  default: 'font-size-default',
  compact: 'font-size-compact',
};

function apply(pref: FontSizePref | null) {
  const html = document.documentElement;
  Object.values(CLASSES).forEach((c) => html.classList.remove(c));
  if (pref) html.classList.add(CLASSES[pref]);
}

export function useFontSize(): [FontSizePref, (p: FontSizePref) => void] {
  const [pref, setPref] = useState<FontSizePref>(() => {
    if (typeof window === 'undefined') return 'default';
    return (localStorage.getItem(STORAGE_KEY) as FontSizePref) || 'default';
  });

  useEffect(() => {
    apply(pref);
  }, [pref]);

  const update = useCallback((p: FontSizePref) => {
    localStorage.setItem(STORAGE_KEY, p);
    setPref(p);
  }, []);

  return [pref, update];
}

/** Apply saved preference on app boot (call once in main.tsx). */
export function bootFontSize() {
  if (typeof window === 'undefined') return;
  const saved = localStorage.getItem(STORAGE_KEY) as FontSizePref | null;
  if (saved && saved in CLASSES) apply(saved);
}
