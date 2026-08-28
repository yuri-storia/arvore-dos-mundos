import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { type Storyline, type StorylineColumn } from '@/hooks/useStorylines';
import { useStorylineCards, type StorylineCard } from '@/hooks/useStorylineCards';
import type { Manuscript } from '@/hooks/useManuscript';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GripVertical, Plus, X, Pencil, Check, Link2, Palette } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor, KeyboardSensor,
  closestCorners, useSensor, useSensors,
  type DragStartEvent, type DragOverEvent, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, arrayMove, useSortable,
  horizontalListSortingStrategy, verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const COLOR_PRESETS: Record<string, { wrap: string; head: string; dot: string; label: string }> = {
  gray: { wrap: 'border-white/10 bg-white/[0.03]', head: 'bg-white/[0.04]', dot: 'bg-white/40', label: 'Neutro' },
  blue: { wrap: 'border-blue-bright/30 bg-blue-bright/[0.06]', head: 'bg-blue-bright/10', dot: 'bg-blue-bright', label: 'Azul' },
  gold: { wrap: 'border-gold/30 bg-gold/[0.06]', head: 'bg-gold/10', dot: 'bg-gold', label: 'Dourado' },
  green: { wrap: 'border-green-500/30 bg-green-500/[0.06]', head: 'bg-green-500/10', dot: 'bg-green-500', label: 'Verde' },
  purple: { wrap: 'border-purple-500/30 bg-purple-500/[0.06]', head: 'bg-purple-500/10', dot: 'bg-purple-500', label: 'Roxo' },
  pink: { wrap: 'border-pink-500/30 bg-pink-500/[0.06]', head: 'bg-pink-500/10', dot: 'bg-pink-500', label: 'Rosa' },
  orange: { wrap: 'border-orange-500/30 bg-orange-500/[0.06]', head: 'bg-orange-500/10', dot: 'bg-orange-500', label: 'Laranja' },
  yellow: { wrap: 'border-yellow-500/30 bg-yellow-500/[0.06]', head: 'bg-yellow-500/10', dot: 'bg-yellow-500', label: 'Amarelo' },
  red: { wrap: 'border-red-500/30 bg-red-500/[0.06]', head: 'bg-red-500/10', dot: 'bg-red-500', label: 'Vermelho' },
};
const tone = (c: string | null) => COLOR_PRESETS[c || 'gray'] || COLOR_PRESETS.gray;

const COLUMN_WIDTH = 280;

interface Props {
  storylines: Storyline[];
  activeStoryline: Storyline | null;
  setActiveStoryline: (s: Storyline) => void;
  columns: StorylineColumn[];
  onCreateStoryline: () => void;
  onRenameStoryline: (id: string, name: string) => void;
  onDeleteStoryline: (id: string) => void;
  onCreateColumn: () => void;
  onUpdateColumn: (id: string, updates: Partial<Pick<StorylineColumn, 'title' | 'color' | 'sort_order'>>) => void;
  onDeleteColumn: (id: string) => void;
  onLinkManuscript: (storylineId: string, manuscriptId: string | null) => void;
  manuscripts: Manuscript[];
}

// ── Card ──────────────────────────────────────────────────────────────────
// Toque curto = expande/recolhe. Segurar (~220ms) = arrasta para qualquer
// coluna ou posição.
const KanbanCard: React.FC<{
  card: StorylineCard;
  onUpdate: (id: string, updates: Partial<Pick<StorylineCard, 'title' | 'content' | 'storyline_column_id' | 'sort_order'>>) => void;
  onDelete: (id: string) => void;
}> = ({ card, onUpdate, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'card', columnId: card.storyline_column_id },
  });
  const [title, setTitle] = useState(card.title);
  const [content, setContent] = useState(card.content);
  const [expanded, setExpanded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setTitle(card.title); }, [card.title]);
  useEffect(() => { setContent(card.content); }, [card.content]);

  const debouncedSave = (patch: Partial<Pick<StorylineCard, 'title' | 'content'>>) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => onUpdate(card.id, patch), 600);
  };
  const flush = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    onUpdate(card.id, { title, content });
  };

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`rounded-md border border-white/10 bg-white/[0.04] transition-colors group ${
        isDragging ? 'opacity-40' : 'hover:bg-white/[0.07]'
      }`}
    >
      {!expanded ? (
        <div
          {...attributes}
          {...listeners}
          onClick={() => setExpanded(true)}
          role="button"
          tabIndex={0}
          className="p-2.5 flex items-start gap-1.5 cursor-grab active:cursor-grabbing touch-none select-none"
          title="Toque para abrir · segure para arrastar"
        >
          <GripVertical className="w-3 h-3 text-text-dim/40 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-montserrat font-semibold text-foreground truncate">
              {card.title || <span className="text-text-dim/50 italic font-normal">Sem título</span>}
            </p>
            {card.content && (
              <p className="text-[12px] text-text-dim/80 mt-1 line-clamp-2 font-merriweather leading-relaxed">
                {card.content}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="p-2.5">
          <div className="flex items-start gap-1.5">
            <input
              value={title}
              onChange={e => { setTitle(e.target.value); debouncedSave({ title: e.target.value }); }}
              placeholder="Título do card"
              autoFocus
              className="flex-1 min-w-0 bg-transparent text-sm font-montserrat font-semibold text-foreground border-none focus:outline-none placeholder:text-text-dim/40"
            />
            <ConfirmDialog
              trigger={
                <button aria-label="Excluir card" className="p-0.5 text-text-dim hover:text-red-alert transition-colors" title="Excluir card">
                  <X className="w-3.5 h-3.5" />
                </button>
              }
              title="Excluir card"
              description="Esta ação não pode ser desfeita."
              confirmLabel="Excluir"
              onConfirm={() => onDelete(card.id)}
            />
          </div>
          <textarea
            value={content}
            onChange={e => { setContent(e.target.value); debouncedSave({ content: e.target.value }); }}
            placeholder="Escreva livremente…"
            rows={5}
            className="w-full mt-1.5 bg-white/[0.03] rounded p-2 text-[13px] font-merriweather text-foreground/90 border border-white/5 focus:border-blue-bright/30 focus:outline-none resize-y placeholder:text-text-dim/40 leading-relaxed"
          />
          <button
            onClick={() => { flush(); setExpanded(false); }}
            className="mt-1.5 w-full py-1 rounded text-[11px] font-montserrat font-bold uppercase tracking-wider text-blue-light border border-blue-bright/25 hover:bg-blue-bright/10 transition-colors"
          >
            Concluir
          </button>
        </div>
      )}
    </div>
  );
};

// ── Coluna ────────────────────────────────────────────────────────────────
const KanbanColumn: React.FC<{
  col: StorylineColumn;
  cards: StorylineCard[];
  canDelete: boolean;
  onUpdateColumn: Props['onUpdateColumn'];
  onDeleteColumn: Props['onDeleteColumn'];
  onCreateCard: (colId: string) => void;
  onUpdateCard: (id: string, updates: Partial<Pick<StorylineCard, 'title' | 'content' | 'storyline_column_id' | 'sort_order'>>) => void;
  onDeleteCard: (id: string) => void;
}> = ({ col, cards, canDelete, onUpdateColumn, onDeleteColumn, onCreateCard, onUpdateCard, onDeleteCard }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: col.id,
    data: { type: 'column' },
  });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(col.title);
  const [showColors, setShowColors] = useState(false);
  const t = tone(col.color);

  useEffect(() => { setDraft(col.title); }, [col.title]);

  const save = () => { if (draft.trim()) onUpdateColumn(col.id, { title: draft.trim() }); setEditing(false); };

  return (
    <div
      ref={setNodeRef}
      style={{
        width: COLUMN_WIDTH, minWidth: COLUMN_WIDTH, maxWidth: COLUMN_WIDTH,
        transform: CSS.Translate.toString(transform), transition,
      }}
      className={`shrink-0 rounded-lg border ${t.wrap} flex flex-col ${isDragging ? 'opacity-50' : ''}`}
    >
      <div
        {...attributes}
        {...listeners}
        title="Segure em uma área livre para mover a coluna"
        className={`p-2.5 border-b border-white/5 flex items-center gap-1 rounded-t-lg touch-none cursor-grab active:cursor-grabbing ${t.head}`}
      >
        <span className="p-0.5 text-text-dim/60 shrink-0">
          <GripVertical className="w-3.5 h-3.5" />
        </span>
        {editing ? (
          <div className="flex items-center gap-1 flex-1" onPointerDown={e => e.stopPropagation()}>
            <input
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
              className="flex-1 min-w-0 h-6 px-1.5 text-xs bg-white/[0.06] border border-white/15 rounded focus:outline-none"
              autoFocus
            />
            <button onClick={save} aria-label="Salvar coluna" className="p-0.5 text-green-400"><Check className="w-3 h-3" /></button>
          </div>
        ) : (
          <>
            <button
              onPointerDown={e => e.stopPropagation()}
              onClick={() => setEditing(true)}
              className="text-xs font-montserrat font-bold truncate text-left max-w-[55%] hover:text-blue-light transition-colors cursor-text"
              title="Toque para renomear"
            >
              {col.title}
            </button>
            {/* espaço livre = área de arraste */}
            <div className="flex-1 self-stretch min-w-[16px]" aria-hidden />
          </>
        )}

        <span className="text-[10px] text-text-dim bg-white/[0.06] px-1.5 py-0.5 rounded-full shrink-0">{cards.length}</span>


        <div className="relative shrink-0" onPointerDown={e => e.stopPropagation()}>
          <button
            onClick={() => setShowColors(v => !v)}
            aria-label="Cor da coluna"
            title="Cor da coluna"
            className="p-0.5 text-text-dim hover:text-foreground transition-colors"
          >
            <Palette className="w-3.5 h-3.5" />
          </button>
          {showColors && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowColors(false)} />
              <div className="absolute right-0 top-6 z-50 p-2 rounded-lg border border-white/15 bg-[#040c18] shadow-xl grid grid-cols-3 gap-1.5 w-[124px]">
                {Object.entries(COLOR_PRESETS).map(([key, v]) => (
                  <button
                    key={key}
                    onClick={() => { onUpdateColumn(col.id, { color: key }); setShowColors(false); }}
                    title={v.label}
                    aria-label={`Cor ${v.label}`}
                    className={`w-8 h-8 rounded-md border flex items-center justify-center ${
                      (col.color || 'gray') === key ? 'border-white/60' : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full ${v.dot}`} />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {canDelete && (
          <ConfirmDialog
            trigger={
              <button onPointerDown={e => e.stopPropagation()} aria-label="Excluir coluna" className="p-0.5 text-text-dim hover:text-red-alert shrink-0" title="Excluir coluna">
                <X className="w-3 h-3" />
              </button>
            }

            title="Excluir coluna"
            description={`Excluir "${col.title}"? Os cards desta coluna serão removidos.`}
            confirmLabel="Excluir"
            onConfirm={() => onDeleteColumn(col.id)}
          />
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2 min-h-[120px]">
          <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
            {cards.map(card => (
              <KanbanCard key={card.id} card={card} onUpdate={onUpdateCard} onDelete={onDeleteCard} />
            ))}
          </SortableContext>
          {cards.length === 0 && (
            <div className="text-center py-6 text-[10px] text-text-dim/30">
              Arraste cards aqui ou crie um novo
            </div>
          )}
          <button
            onClick={() => onCreateCard(col.id)}
            className="w-full text-[11px] py-1.5 rounded border border-dashed border-white/10 text-text-dim hover:text-blue-light hover:border-blue-bright/30 transition-colors"
          >
            + Card
          </button>
        </div>
      </ScrollArea>
    </div>
  );
};

export const KanbanBoard: React.FC<Props> = ({
  storylines, activeStoryline, setActiveStoryline, columns,
  onCreateStoryline, onRenameStoryline, onDeleteStoryline,
  onCreateColumn, onUpdateColumn, onDeleteColumn,
  onLinkManuscript, manuscripts,
}) => {
  const columnIds = useMemo(() => columns.map(c => c.id), [columns]);
  const { cards, createCard, updateCard, deleteCard } = useStorylineCards(columnIds);

  const [editingStorylineName, setEditingStorylineName] = useState(false);
  const [storylineNameDraft, setStorylineNameDraft] = useState('');

  // Estado local do quadro (ordem otimista durante o arraste)
  const [colOrder, setColOrder] = useState<string[]>(columnIds);
  const [board, setBoard] = useState<Record<string, string[]>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const draggingRef = useRef(false);

  useEffect(() => {
    if (draggingRef.current) return;
    setColOrder(columns.slice().sort((a, b) => a.sort_order - b.sort_order).map(c => c.id));
  }, [columns]);

  useEffect(() => {
    if (draggingRef.current) return;
    const next: Record<string, string[]> = {};
    columns.forEach(c => { next[c.id] = []; });
    cards.slice().sort((a, b) => a.sort_order - b.sort_order).forEach(c => {
      if (next[c.storyline_column_id]) next[c.storyline_column_id].push(c.id);
    });
    setBoard(next);
  }, [columns, cards]);

  const cardById = useMemo(() => new Map(cards.map(c => [c.id, c])), [cards]);
  const colById = useMemo(() => new Map(columns.map(c => [c.id, c])), [columns]);

  // ---- Barra de rolagem horizontal customizada (área de toque ampliada) ----
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [thumb, setThumb] = useState({ width: 0, left: 0, visible: false });

  const syncThumb = useCallback(() => {
    const el = scrollRef.current;
    const track = trackRef.current;
    if (!el || !track) return;
    const ratio = el.clientWidth / Math.max(el.scrollWidth, 1);
    if (ratio >= 0.999) { setThumb(t => ({ ...t, visible: false })); return; }
    const trackW = track.clientWidth;
    const width = Math.max(48, trackW * ratio);
    const maxScroll = el.scrollWidth - el.clientWidth;
    const left = maxScroll > 0 ? (el.scrollLeft / maxScroll) * (trackW - width) : 0;
    setThumb({ width, left, visible: true });
  }, []);

  useEffect(() => {
    syncThumb();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', syncThumb, { passive: true });
    window.addEventListener('resize', syncThumb);
    return () => { el.removeEventListener('scroll', syncThumb); window.removeEventListener('resize', syncThumb); };
  }, [syncThumb, colOrder.length, cards.length]);

  const dragScrollRef = useRef<{ startX: number; startLeft: number } | null>(null);

  const onThumbPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const el = scrollRef.current;
    if (!el) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragScrollRef.current = { startX: e.clientX, startLeft: el.scrollLeft };
  };

  const onThumbPointerMove = (e: React.PointerEvent) => {
    const el = scrollRef.current;
    const track = trackRef.current;
    const st = dragScrollRef.current;
    if (!el || !track || !st) return;
    const trackW = track.clientWidth;
    const maxScroll = el.scrollWidth - el.clientWidth;
    const usable = Math.max(trackW - thumb.width, 1);
    el.scrollLeft = st.startLeft + ((e.clientX - st.startX) / usable) * maxScroll;
  };

  const onThumbPointerUp = (e: React.PointerEvent) => {
    dragScrollRef.current = null;
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* noop */ }
  };

  const onTrackPointerDown = (e: React.PointerEvent) => {
    const el = scrollRef.current;
    const track = trackRef.current;
    if (!el || !track) return;
    const rect = track.getBoundingClientRect();
    const target = e.clientX - rect.left - thumb.width / 2;
    const usable = Math.max(rect.width - thumb.width, 1);
    el.scrollTo({ left: (target / usable) * (el.scrollWidth - el.clientWidth), behavior: 'smooth' });
  };

  // ---- Swipe horizontal (iOS/Android): desliza entre colunas sem arrastar cards ----
  // O dnd-kit aplica `touch-action: none` nos elementos arrastáveis, o que bloqueia a
  // rolagem nativa quando o toque começa em cima de um card. Reimplementamos o gesto.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let startX = 0, startY = 0, lastX = 0, lastT = 0, vx = 0;
    let axis: 'none' | 'x' | 'y' = 'none';
    let raf = 0;

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      cancelAnimationFrame(raf);
      const t = e.touches[0];
      startX = lastX = t.clientX; startY = t.clientY;
      lastT = performance.now(); vx = 0; axis = 'none';
    };

    const onMove = (e: TouchEvent) => {
      if (draggingRef.current || e.touches.length !== 1) return;
      const t = e.touches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (axis === 'none') {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      }
      if (axis !== 'x') return;
      const now = performance.now();
      const delta = t.clientX - lastX;
      if (now > lastT) vx = delta / (now - lastT);
      lastX = t.clientX; lastT = now;
      el.scrollLeft -= delta;
      if (e.cancelable) e.preventDefault();
    };

    const onEnd = () => {
      if (axis !== 'x' || Math.abs(vx) < 0.25) { axis = 'none'; return; }
      // Inércia leve, mais próxima do comportamento nativo
      let v = vx * 16;
      const step = () => {
        el.scrollLeft -= v;
        v *= 0.92;
        if (Math.abs(v) > 0.5) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
      axis = 'none';
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd, { passive: true });
    el.addEventListener('touchcancel', onEnd, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove as EventListener);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, []);

  // ---- Dica visual inicial (uma vez por usuário) ----
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  useEffect(() => {
    if (!thumb.visible) return;
    try {
      if (localStorage.getItem('adm_kanban_swipe_hint') === '1') return;
    } catch { /* storage indisponível */ }
    setShowSwipeHint(true);
    const t = setTimeout(() => {
      setShowSwipeHint(false);
      try { localStorage.setItem('adm_kanban_swipe_hint', '1'); } catch { /* noop */ }
    }, 6000);
    return () => clearTimeout(t);
  }, [thumb.visible]);

  const dismissHint = useCallback(() => {
    setShowSwipeHint(false);
    try { localStorage.setItem('adm_kanban_swipe_hint', '1'); } catch { /* noop */ }
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );


  const findColumnOf = (cardId: string) =>
    Object.keys(board).find(colId => board[colId]?.includes(cardId));

  const handleDragStart = (e: DragStartEvent) => {
    draggingRef.current = true;
    setActiveId(String(e.active.id));
  };

  const handleDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) return;
    if (active.data.current?.type !== 'card') return;
    const activeCol = findColumnOf(String(active.id));
    const overId = String(over.id);
    const overCol = over.data.current?.type === 'card' ? findColumnOf(overId) : (colById.has(overId) ? overId : undefined);
    if (!activeCol || !overCol || activeCol === overCol) return;
    setBoard(prev => {
      const from = prev[activeCol].filter(id => id !== String(active.id));
      const to = prev[overCol].slice();
      const idx = over.data.current?.type === 'card' ? to.indexOf(overId) : to.length;
      to.splice(idx < 0 ? to.length : idx, 0, String(active.id));
      return { ...prev, [activeCol]: from, [overCol]: to };
    });
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    draggingRef.current = false;
    setActiveId(null);
    if (!over) return;

    // Colunas
    if (active.data.current?.type === 'column') {
      const oldIndex = colOrder.indexOf(String(active.id));
      const newIndex = colOrder.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
      const next = arrayMove(colOrder, oldIndex, newIndex);
      setColOrder(next);
      next.forEach((id, i) => {
        if (colById.get(id)?.sort_order !== i) onUpdateColumn(id, { sort_order: i });
      });
      return;
    }

    // Cards
    const activeCol = findColumnOf(String(active.id));
    if (!activeCol) return;
    const overId = String(over.id);
    const overCol = over.data.current?.type === 'card' ? findColumnOf(overId) : (colById.has(overId) ? overId : activeCol);
    if (!overCol) return;

    let nextBoard = board;
    if (activeCol === overCol) {
      const list = board[activeCol];
      const oldIndex = list.indexOf(String(active.id));
      const newIndex = over.data.current?.type === 'card' ? list.indexOf(overId) : list.length - 1;
      if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) {
        nextBoard = { ...board, [activeCol]: arrayMove(list, oldIndex, newIndex) };
        setBoard(nextBoard);
      }
    }

    // Persiste posições das colunas afetadas
    [activeCol, overCol].filter((v, i, a) => a.indexOf(v) === i).forEach(colId => {
      (nextBoard[colId] || []).forEach((cardId, i) => {
        const c = cardById.get(cardId);
        if (!c) return;
        if (c.sort_order !== i || c.storyline_column_id !== colId) {
          updateCard(cardId, { sort_order: i, storyline_column_id: colId });
        }
      });
    });
  };

  const orderedColumns = colOrder.map(id => colById.get(id)).filter(Boolean) as StorylineColumn[];
  const activeCard = activeId ? cardById.get(activeId) : null;

  const startEditStoryline = () => {
    if (!activeStoryline) return;
    setStorylineNameDraft(activeStoryline.name);
    setEditingStorylineName(true);
  };
  const saveStorylineName = () => {
    if (activeStoryline && storylineNameDraft.trim()) {
      onRenameStoryline(activeStoryline.id, storylineNameDraft.trim());
    }
    setEditingStorylineName(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="p-3 border-b border-blue-bright/10 flex items-center gap-2 flex-wrap">
        <Select value={activeStoryline?.id || ''} onValueChange={id => {
          const sl = storylines.find(s => s.id === id);
          if (sl) setActiveStoryline(sl);
        }}>
          <SelectTrigger className="h-7 w-[200px] text-xs bg-white/[0.03] border-blue-bright/10">
            <SelectValue placeholder="Selecionar storyline" />
          </SelectTrigger>
          <SelectContent>
            {storylines.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <button onClick={onCreateStoryline} aria-label="Nova storyline" className="p-1 rounded text-blue-light hover:bg-blue-bright/10" title="Nova storyline">
          <Plus className="w-3.5 h-3.5" />
        </button>

        {activeStoryline && (
          editingStorylineName ? (
            <div className="flex items-center gap-1">
              <input
                value={storylineNameDraft}
                onChange={e => setStorylineNameDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveStorylineName(); if (e.key === 'Escape') setEditingStorylineName(false); }}
                className="h-7 px-2 text-xs bg-white/[0.05] border border-blue-bright/20 rounded focus:outline-none"
                autoFocus
              />
              <button onClick={saveStorylineName} aria-label="Salvar nome da storyline" className="p-1 text-green-400 hover:text-green-300"><Check className="w-3.5 h-3.5" /></button>
            </div>
          ) : (
            <button onClick={startEditStoryline} aria-label="Renomear storyline" className="p-1 rounded text-text-dim hover:text-foreground" title="Renomear storyline">
              <Pencil className="w-3 h-3" />
            </button>
          )
        )}

        {activeStoryline && (
          <div className="flex items-center gap-1.5 ml-2">
            <Link2 className="w-3 h-3 text-text-dim" />
            <Select
              value={activeStoryline.manuscript_id || 'none'}
              onValueChange={v => onLinkManuscript(activeStoryline.id, v === 'none' ? null : v)}
            >
              <SelectTrigger className="h-7 w-[180px] text-xs bg-white/[0.03] border-blue-bright/10">
                <SelectValue placeholder="Vincular a manuscrito" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Sem vínculo —</SelectItem>
                {manuscripts.map(m => <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        {activeStoryline && storylines.length > 1 && (
          <ConfirmDialog
            trigger={
              <button aria-label="Excluir storyline" className="p-1 text-text-dim hover:text-red-alert ml-1" title="Excluir storyline">
                <X className="w-3.5 h-3.5" />
              </button>
            }
            title="Excluir storyline"
            description={`Excluir "${activeStoryline.name}"? Todas as colunas e cards serão removidos.`}
            confirmLabel="Excluir"
            onConfirm={() => onDeleteStoryline(activeStoryline.id)}
          />
        )}

        <button onClick={onCreateColumn} className="ml-auto px-2 py-1 rounded text-[11px] font-montserrat text-blue-light border border-blue-bright/20 hover:bg-blue-bright/10 transition-colors">
          + Coluna
        </button>
      </div>

      <p className="px-3 pt-2 text-[10px] text-text-dim/60 font-montserrat">
        Toque no card para abrir · segure para arrastar entre colunas · deslize o dedo para navegar entre colunas
      </p>

      {/* Colunas */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-x-auto kanban-scroll"
        style={{ WebkitOverflowScrolling: 'touch', overscrollBehaviorX: 'contain' }}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={() => { draggingRef.current = false; setActiveId(null); }}
        >
          <div className="flex gap-3 p-3 h-full" style={{ minWidth: Math.max(orderedColumns.length, 1) * (COLUMN_WIDTH + 12) }}>
            {orderedColumns.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-text-dim text-xs">
                Esta storyline ainda não tem colunas. Clique em "+ Coluna" para criar.
              </div>
            ) : (
              <SortableContext items={colOrder} strategy={horizontalListSortingStrategy}>
                {orderedColumns.map(col => (
                  <KanbanColumn
                    key={col.id}
                    col={col}
                    cards={(board[col.id] || []).map(id => cardById.get(id)).filter(Boolean) as StorylineCard[]}
                    canDelete={orderedColumns.length > 1}
                    onUpdateColumn={onUpdateColumn}
                    onDeleteColumn={onDeleteColumn}
                    onCreateCard={createCard}
                    onUpdateCard={updateCard}
                    onDeleteCard={deleteCard}
                  />
                ))}
              </SortableContext>
            )}
          </div>

          <DragOverlay>
            {activeCard ? (
              <div className="p-2.5 rounded-md border border-blue-bright/40 bg-[#071426] shadow-2xl w-[264px]">
                <p className="text-sm font-montserrat font-semibold text-foreground truncate">{activeCard.title || 'Sem título'}</p>
                {activeCard.content && (
                  <p className="text-[12px] text-text-dim/80 mt-1 line-clamp-2 font-merriweather">{activeCard.content}</p>
                )}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Barra de rolagem horizontal com área de toque ampliada */}
      {thumb.visible && (
        <div className="relative shrink-0">
          {showSwipeHint && (
            <div
              onPointerDown={dismissHint}
              className="absolute -top-9 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 rounded-full border border-gold/30 bg-[#071426]/95 shadow-lg backdrop-blur-sm animate-fadeUp cursor-pointer"
            >
              <span className="text-[10.5px] font-montserrat text-gold-light whitespace-nowrap">
                <span className="inline-block animate-pulse mr-1">↔</span>
                Deslize para ver mais colunas · ou arraste esta barra
              </span>
            </div>
          )}
          <div
            ref={trackRef}
            onPointerDown={(e) => { dismissHint(); onTrackPointerDown(e); }}
            className="relative mx-3 mb-2 h-9 flex items-center cursor-pointer touch-none select-none"
          >
            <div className="absolute inset-x-0 h-2 rounded-full bg-blue-bright/10" />
            <div
              onPointerDown={onThumbPointerDown}
              onPointerMove={onThumbPointerMove}
              onPointerUp={onThumbPointerUp}
              onPointerCancel={onThumbPointerUp}
              className="absolute h-9 flex items-center touch-none cursor-grab active:cursor-grabbing"
              style={{ width: thumb.width, transform: `translateX(${thumb.left}px)` }}
            >
              <div className="w-full h-3 rounded-full bg-blue-bright/50 hover:bg-blue-bright/70 transition-colors" />
            </div>
          </div>
        </div>
      )}
    </div>

  );
};
