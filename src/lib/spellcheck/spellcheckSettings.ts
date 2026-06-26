// Global, persistent on/off switch for the in-app PT-BR spellchecker.
// Persisted in localStorage so the user's choice survives reloads.
//
// Emits a `spellcheck:enabled-changed` window event whenever the value
// changes so the editor extension and the suggestions provider can react.

const STORAGE_KEY = "spellcheck:enabled";
const EVT = "spellcheck:enabled-changed";

export function isSpellcheckEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === null) return true; // default ON
    return v === "1" || v === "true";
  } catch {
    return true;
  }
}

export function setSpellcheckEnabled(enabled: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    /* noop */
  }
  window.dispatchEvent(
    new CustomEvent(EVT, { detail: { enabled } }),
  );
}

export function onSpellcheckEnabledChange(
  cb: (enabled: boolean) => void,
): () => void {
  const handler = (e: Event) => {
    const detail = (e as CustomEvent<{ enabled: boolean }>).detail;
    cb(!!detail?.enabled);
  };
  window.addEventListener(EVT, handler);
  return () => window.removeEventListener(EVT, handler);
}

import { useEffect, useState } from "react";

export function useSpellcheckEnabled(): [boolean, (v: boolean) => void] {
  const [enabled, setEnabled] = useState<boolean>(() => isSpellcheckEnabled());
  useEffect(() => onSpellcheckEnabledChange(setEnabled), []);
  return [
    enabled,
    (v: boolean) => {
      setEnabled(v);
      setSpellcheckEnabled(v);
    },
  ];
}
