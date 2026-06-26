// Global spellcheck UX. Mounted once near the top of the React tree.
//
// What it does:
//   1. Captures right-click anywhere on the app.
//   2. Resolves the word under the cursor across <input>, <textarea>, and
//      contenteditable surfaces.
//   3. Asks the `ai-spellcheck` edge function for correctness + suggestions.
//   4. Shows a small grimoire-styled popover with sugestões clicáveis,
//      "Adicionar ao dicionário" and "Ignorar".
//
// The browser's native red underline is enabled via `lang="pt-BR"` and the
// global `spellcheck="true"` attribute on body — this provider only replaces
// the right-click menu so users get one consistent suggestion experience.

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Loader2, Plus, X, SpellCheck2, CheckCircle2 } from "lucide-react";
import { wordAtPoint, type WordHit } from "./wordAtPoint";
import { addCustomWord, isCustomWord } from "./customDictionary";
import {
  useSpellSuggestions,
  type SpellLookupResult,
} from "./useSpellSuggestions";

interface PopoverState {
  hit: WordHit;
  // Where to position the popover on screen.
  x: number;
  y: number;
}

export const SpellcheckProvider: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  const [pop, setPop] = useState<PopoverState | null>(null);
  const [result, setResult] = useState<SpellLookupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const { lookup } = useSpellSuggestions();
  const requestIdRef = useRef(0);

  // Right-click handler — captured to win over Radix/Tiptap menus.
  useEffect(() => {
    const onContext = (e: MouseEvent) => {
      // Allow Shift+RightClick to fall through to the native browser menu —
      // power-user escape hatch for "Inspect", "Copy link", etc.
      if (e.shiftKey) return;
      const hit = wordAtPoint(e);
      if (!hit) return;
      // Skip words already in the user's personal dictionary.
      if (isCustomWord(hit.word)) return;

      e.preventDefault();
      e.stopPropagation();
      setPop({ hit, x: e.clientX, y: e.clientY });
      setResult(null);
      setLoading(true);

      const reqId = ++requestIdRef.current;
      lookup(hit.word, hit.before, hit.after)
        .then((res) => {
          if (reqId !== requestIdRef.current) return;
          setResult(res);
        })
        .finally(() => {
          if (reqId === requestIdRef.current) setLoading(false);
        });
    };
    document.addEventListener("contextmenu", onContext, true);
    return () =>
      document.removeEventListener("contextmenu", onContext, true);
  }, [lookup]);

  // Close on click / Escape / scroll.
  useEffect(() => {
    if (!pop) return;
    const close = () => setPop(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest("[data-spellcheck-popover]")) return;
      close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [pop]);

  const apply = useCallback(
    (suggestion: string) => {
      if (!pop) return;
      pop.hit.replace(suggestion);
      setPop(null);
    },
    [pop],
  );

  const addToDict = useCallback(() => {
    if (!pop) return;
    addCustomWord(pop.hit.word);
    setPop(null);
  }, [pop]);

  return (
    <>
      {children}
      {pop && (
        <SpellPopover
          x={pop.x}
          y={pop.y}
          word={pop.hit.word}
          loading={loading}
          result={result}
          onApply={apply}
          onAddToDict={addToDict}
          onClose={() => setPop(null)}
        />
      )}
    </>
  );
};

interface PopoverProps {
  x: number;
  y: number;
  word: string;
  loading: boolean;
  result: SpellLookupResult | null;
  onApply: (s: string) => void;
  onAddToDict: () => void;
  onClose: () => void;
}

const SpellPopover: React.FC<PopoverProps> = ({
  x,
  y,
  word,
  loading,
  result,
  onApply,
  onAddToDict,
  onClose,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number }>({
    left: x,
    top: y,
  });

  // Clamp to viewport after first paint.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pad = 8;
    let left = x;
    let top = y;
    if (left + rect.width + pad > window.innerWidth) {
      left = window.innerWidth - rect.width - pad;
    }
    if (top + rect.height + pad > window.innerHeight) {
      top = y - rect.height - 4; // flip above the click point
    }
    setPos({ left: Math.max(pad, left), top: Math.max(pad, top) });
  }, [x, y, result, loading]);

  const node = (
    <div
      ref={ref}
      data-spellcheck-popover
      role="menu"
      aria-label={`Sugestões para "${word}"`}
      style={{ position: "fixed", left: pos.left, top: pos.top, zIndex: 9999 }}
      className="min-w-[220px] max-w-[300px] rounded-md border border-[hsl(var(--gold))]/40 bg-[#0a1018]/95 backdrop-blur-sm shadow-[0_8px_30px_rgba(0,0,0,0.6)] text-[13px] text-foreground py-1.5 animate-in fade-in zoom-in-95 duration-100"
    >
      <div className="px-3 py-1.5 flex items-center gap-2 border-b border-white/5">
        <SpellCheck2 className="w-3.5 h-3.5 text-[hsl(var(--gold))]" />
        <span className="font-mono text-xs truncate flex-1" title={word}>
          {word}
        </span>
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="p-0.5 rounded hover:bg-white/10 text-text-dim"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {loading && (
        <div className="px-3 py-3 flex items-center gap-2 text-text-dim">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Consultando corretor…</span>
        </div>
      )}

      {!loading && result && result.correct && (
        <div className="px-3 py-2.5 flex items-center gap-2 text-emerald-300/90 text-[12px]">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Palavra grafada corretamente.</span>
        </div>
      )}

      {!loading && result && !result.correct && (
        <>
          {result.suggestions.length === 0 ? (
            <div className="px-3 py-2 text-text-dim text-[12px]">
              Sem sugestões disponíveis.
            </div>
          ) : (
            <ul className="py-0.5 max-h-[240px] overflow-y-auto">
              {result.suggestions.map((s, i) => (
                <li key={`${s}-${i}`}>
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onApply(s);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-[hsl(var(--gold))]/10 hover:text-[hsl(var(--gold))] transition-colors font-merriweather"
                    role="menuitem"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {result.reason && (
            <div
              className="px-3 pt-1 pb-1.5 text-[11px] text-text-dim/80 italic border-t border-white/5 mt-0.5"
              title={result.reason}
            >
              {result.reason}
            </div>
          )}
        </>
      )}

      <div className="border-t border-white/5 mt-0.5 pt-0.5">
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            onAddToDict();
          }}
          className="w-full text-left px-3 py-1.5 flex items-center gap-2 text-[12px] text-text-dim hover:text-foreground hover:bg-white/[0.05] transition-colors"
          role="menuitem"
        >
          <Plus className="w-3 h-3" />
          Adicionar ao meu dicionário
        </button>
      </div>
    </div>
  );

  return createPortal(node, document.body);
};

export default SpellcheckProvider;
