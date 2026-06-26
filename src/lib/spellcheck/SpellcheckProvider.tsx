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
import { Loader2, Plus, X, SpellCheck2, CheckCircle2, Sparkles } from "lucide-react";
import { wordAtPoint, type WordHit } from "./wordAtPoint";
import { addCustomWord, isCustomWord } from "./customDictionary";
import {
  addWordToWorker,
  useSpellSuggestions,
  type SpellLookupResult,
} from "./useSpellSuggestions";
import { isSpellcheckEnabled } from "./spellcheckSettings";

interface PopoverState {
  hit: WordHit;
  x: number;
  y: number;
  /** Preencher quando vier de uma decoração da IA (multi-palavra). */
  prefilled?: SpellLookupResult & { kind: "ai-warning" | "ai-spelling" };
}

const HOVER_DELAY_MS = 350;

/** Constrói um WordHit a partir de um elemento .spell-warning/.spell-error com data-ai-* */
function hitFromAIElement(el: HTMLElement): WordHit | null {
  const text = el.textContent ?? "";
  if (!text.trim()) return null;
  const rect = el.getBoundingClientRect();
  const replace = (next: string) => {
    // Localiza o textNode dentro do elemento e substitui o conteúdo completo.
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const first = walker.nextNode() as Text | null;
    if (first) {
      // Junta todo o texto em um nó só e substitui.
      const parent = first.parentNode!;
      // Remove demais nós de texto.
      let n = walker.nextNode();
      while (n) {
        const next = walker.nextNode();
        n.parentNode?.removeChild(n);
        n = next;
      }
      first.textContent = next;
      parent.dispatchEvent(new InputEvent("input", { bubbles: true }));
    }
  };
  return { word: text, before: "", after: "", replace, rect };
}

export const SpellcheckProvider: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  const [pop, setPop] = useState<PopoverState | null>(null);
  const [result, setResult] = useState<SpellLookupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const { lookup } = useSpellSuggestions();
  const requestIdRef = useRef(0);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverTargetRef = useRef<HTMLElement | null>(null);

  const openFor = useCallback(
    (hit: WordHit, x: number, y: number, prefilled?: PopoverState["prefilled"]) => {
      setPop({ hit, x, y, prefilled });
      if (prefilled) {
        setResult(prefilled);
        setLoading(false);
        return;
      }
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
    },
    [lookup],
  );

  /** Tenta extrair issue da IA do elemento sob o cursor. */
  const aiHitFor = useCallback((el: HTMLElement | null) => {
    if (!el) return null;
    const target = el.closest(".spell-warning, .spell-ai") as HTMLElement | null;
    if (!target) return null;
    const hit = hitFromAIElement(target);
    if (!hit) return null;
    let suggestions: string[] = [];
    try {
      const raw = target.getAttribute("data-ai-suggestions") || "[]";
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) suggestions = arr.filter((s) => typeof s === "string");
    } catch { /* noop */ }
    const reason = target.getAttribute("data-ai-reason") || "";
    const type = target.getAttribute("data-ai-type") || "grammar";
    return {
      hit,
      target,
      prefilled: {
        correct: false,
        suggestions,
        reason,
        kind: type === "spelling" ? ("ai-spelling" as const) : ("ai-warning" as const),
      } satisfies PopoverState["prefilled"],
    };
  }, []);


  // Right-click handler — captured to win over Radix/Tiptap menus.
  useEffect(() => {
    const onContext = (e: MouseEvent) => {
      if (!isSpellcheckEnabled()) return;
      if (e.shiftKey) return;
      const target = e.target as HTMLElement | null;

      // Caso 1: clique sobre uma marcação da IA (gramática/estilo, amarelo).
      const ai = aiHitFor(target);
      if (ai) {
        e.preventDefault();
        e.stopPropagation();
        const rect = ai.target.getBoundingClientRect();
        openFor(ai.hit, rect.left, rect.bottom + 4, ai.prefilled);
        return;
      }

      // Caso 2: palavra normal (dicionário/contexto).
      const hit = wordAtPoint(e);
      if (!hit) return;
      if (isCustomWord(hit.word)) return;
      e.preventDefault();
      e.stopPropagation();
      openFor(hit, e.clientX, e.clientY);
    };
    document.addEventListener("contextmenu", onContext, true);
    return () =>
      document.removeEventListener("contextmenu", onContext, true);
  }, [openFor, aiHitFor]);

  // Left-click em qualquer decoração de erro → abre popover.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!isSpellcheckEnabled()) return;
      if (e.button !== 0) return;
      const target = e.target as HTMLElement | null;

      const ai = aiHitFor(target);
      if (ai) {
        e.preventDefault();
        e.stopPropagation();
        const rect = ai.target.getBoundingClientRect();
        openFor(ai.hit, rect.left, rect.bottom + 4, ai.prefilled);
        return;
      }

      const errEl = target?.closest?.(".spell-error") as HTMLElement | null;
      if (!errEl) return;
      const hit = wordAtPoint(e);
      if (!hit) return;
      e.preventDefault();
      e.stopPropagation();
      const rect = errEl.getBoundingClientRect();
      openFor(hit, rect.left, rect.bottom + 4);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [openFor, aiHitFor]);

  // Hover → abre após delay.
  useEffect(() => {
    const cancelHover = () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
      hoverTargetRef.current = null;
    };
    const onOver = (e: MouseEvent) => {
      if (!isSpellcheckEnabled()) return;
      const target = e.target as HTMLElement | null;
      const errEl = target?.closest?.(".spell-error, .spell-warning") as HTMLElement | null;
      if (!errEl) return;
      if (hoverTargetRef.current === errEl) return;
      cancelHover();
      hoverTargetRef.current = errEl;
      const x = e.clientX;
      const y = e.clientY;
      hoverTimerRef.current = setTimeout(() => {
        const ai = aiHitFor(errEl);
        if (ai) {
          const rect = ai.target.getBoundingClientRect();
          openFor(ai.hit, rect.left, rect.bottom + 4, ai.prefilled);
          return;
        }
        const fakeEvent = { target: errEl, clientX: x, clientY: y } as unknown as MouseEvent;
        const hit = wordAtPoint(fakeEvent);
        if (!hit) return;
        const rect = errEl.getBoundingClientRect();
        openFor(hit, rect.left, rect.bottom + 4);
      }, HOVER_DELAY_MS);
    };
    const onOut = (e: MouseEvent) => {
      const related = e.relatedTarget as HTMLElement | null;
      if (related?.closest?.("[data-spellcheck-popover]")) return;
      if (!hoverTargetRef.current) return;
      if (hoverTargetRef.current.contains(related as Node)) return;
      cancelHover();
    };
    document.addEventListener("mouseover", onOver);
    document.addEventListener("mouseout", onOut);
    return () => {
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onOut);
      cancelHover();
    };
  }, [openFor, aiHitFor]);


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
    addWordToWorker(pop.hit.word);
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
          {result.reason && (
            <div className="px-3 py-1.5 text-[11px] leading-snug text-amber-200/90 bg-amber-500/[0.06] border-b border-amber-500/15">
              {result.reason}
            </div>
          )}
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
