import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Editor } from '@tiptap/react';
import { Check, Plus, EyeOff } from 'lucide-react';
import { getSpellChecker } from './loadDictionary';
import { addCustomWord, ignoreWordForSession } from './customDictionary';

export interface SpellSuggestionTarget {
  word: string;
  from: number;
  to: number;
  /** Screen coords where the popup should anchor (right-click position). */
  x: number;
  y: number;
}

interface Props {
  editor: Editor;
  target: SpellSuggestionTarget;
  onClose: () => void;
}

export const SpellSuggestionsMenu: React.FC<Props> = ({ editor, target, onClose }) => {
  const ref = useRef<HTMLDivElement>(null);
  const checker = getSpellChecker();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(!!checker);

  useEffect(() => {
    let alive = true;
    if (!checker) { setLoading(false); return; }
    setLoading(true);
    checker.suggest(target.word).then((r) => {
      if (!alive) return;
      setSuggestions(r.slice(0, 5));
      setLoading(false);
    }).catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [checker, target.word]);

  // Close on outside click / Escape.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    // Defer so the right-click that opened us doesn't immediately close.
    const t = setTimeout(() => {
      document.addEventListener('mousedown', handler);
      document.addEventListener('keydown', onKey);
    }, 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  // Keep popover inside the viewport.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pad = 8;
    let left = target.x;
    let top = target.y;
    if (left + rect.width > window.innerWidth - pad) left = window.innerWidth - rect.width - pad;
    if (top + rect.height > window.innerHeight - pad) top = target.y - rect.height - 4;
    el.style.left = `${Math.max(pad, left)}px`;
    el.style.top = `${Math.max(pad, top)}px`;
  }, [target.x, target.y]);

  const applySuggestion = (suggestion: string) => {
    editor
      .chain()
      .focus()
      .insertContentAt({ from: target.from, to: target.to }, suggestion)
      .run();
    editor.commands.refreshSpellcheck();
    onClose();
  };

  const addToDictionary = () => {
    addCustomWord(target.word);
    checker?.add(target.word);
    editor.commands.refreshSpellcheck();
    onClose();
  };

  const ignoreForSession = () => {
    ignoreWordForSession(target.word.toLowerCase());
    editor.commands.refreshSpellcheck();
    onClose();
  };

  return createPortal(
    <div
      ref={ref}
      role="menu"
      className="spell-menu"
      style={{ position: 'fixed', left: target.x, top: target.y }}
    >
      <div className="spell-menu-header">
        <span className="spell-menu-word">{target.word}</span>
      </div>
      {!checker && (
        <div className="spell-menu-empty">Carregando dicionário…</div>
      )}
      {checker && loading && (
        <div className="spell-menu-empty">Buscando sugestões…</div>
      )}
      {checker && !loading && suggestions.length === 0 && (
        <div className="spell-menu-empty">Sem sugestões.</div>
      )}
      {suggestions.map((s) => (
        <button
          key={s}
          type="button"
          className="spell-menu-item"
          onClick={() => applySuggestion(s)}
        >
          <Check className="w-3 h-3 opacity-70" />
          <span>{s}</span>
        </button>
      ))}
      <div className="spell-menu-sep" />
      <button type="button" className="spell-menu-item subtle" onClick={addToDictionary}>
        <Plus className="w-3 h-3" /><span>Adicionar ao meu dicionário</span>
      </button>
      <button type="button" className="spell-menu-item subtle" onClick={ignoreForSession}>
        <EyeOff className="w-3 h-3" /><span>Ignorar nesta sessão</span>
      </button>
    </div>,
    document.body,
  );
};
