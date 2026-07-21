import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useManuscript } from '@/hooks/useManuscript';
import { supabase } from '@/integrations/supabase/client';
import { useCodexEntries, type CodexEntry } from '@/hooks/useCodexEntries';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Plus, Trash2, FileText, BookOpen,
  PanelRightOpen, StickyNote, Search, BookMarked, PenLine,
  LayoutGrid, ChevronRight, ChevronDown, X, Upload, GripVertical,
  Feather, Target, RefreshCw,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ImportManuscriptDialog } from '@/components/ImportManuscriptDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { FRUITS } from '@/lib/data';
import type { WorldRecord } from '@/hooks/useWorlds';
import { MuralMode } from '@/components/escritor/MuralMode';
import { DebouncedTextarea } from '@/components/escritor/DebouncedTextarea';
import { ChapterEditor } from '@/components/escritor/ChapterEditor';
import { RichTextView } from '@/components/editor/RichTextEditor';
import { toast } from 'sonner';
import { PomodoroTimer } from '@/components/PomodoroTimer';
import { ManuscriptExportMenu } from '@/components/ManuscriptExportMenu';
import { FormatAllChaptersDialog } from '@/components/escritor/FormatAllChaptersDialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  DndContext, PointerSensor, TouchSensor, useSensor, useSensors, closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';


interface Props {
  worldId: string;
  worlds: WorldRecord[];
}

type WriteMode = 'manuscrito' | 'mural';

const WRITE_MODE_INFO: Record<WriteMode, { icon: typeof BookMarked; label: string; desc: string }> = {
  manuscrito: {
    icon: BookMarked,
    label: 'Manuscrito',
    desc: 'Organize sua história em capítulos. Ideal para narrativas longas e estruturadas.',
  },
  mural: {
    icon: LayoutGrid,
    label: 'Storyline',
    desc: 'Visualize seus arcos narrativos em colunas customizáveis. Crie suas próprias colunas, vincule a um manuscrito, e arraste arcos para reorganizar.',
  },
};

// ── Reference Panel (Codex sidebar) — click opens preview only ──
const ReferencePanel: React.FC<{ entries: CodexEntry[]; onPreview: (entry: CodexEntry) => void }> = React.memo(({ entries, onPreview }) => {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    if (!search.trim()) return entries;
    const q = search.toLowerCase();
    return entries.filter(e => e.title.toLowerCase().includes(q) || e.content?.toLowerCase().includes(q));
  }, [entries, search]);
  const fichas = filtered.filter(e => e.entry_type === 'ficha');
  const artigos = filtered.filter(e => e.entry_type === 'artigo');

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-blue-bright/10">
        <h3 className="font-cinzel font-bold text-xs text-blue-light uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5" /> Referências do Codex
        </h3>
        <p className="text-[10px] text-text-dim mb-2 font-merriweather italic leading-snug">
          Clique para visualizar. Use <span className="text-blue-light">@nome</span> no editor para vincular.
        </p>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-text-dim" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar fichas e artigos…" className="h-7 pl-7 text-xs bg-white/[0.03] border-blue-bright/10" />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {fichas.length > 0 && (
            <>
              <p className="text-[9px] font-montserrat uppercase tracking-widest text-text-dim px-2 pt-2">Fichas</p>
              {fichas.map(e => {
                const fruit = FRUITS.find(f => f.id === e.fruit_id);
                return (
                  <button key={e.id} onClick={() => onPreview(e)}
                    className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-blue-bright/10 transition-colors group">
                    <span className="text-blue-light group-hover:text-blue-bright">{e.title}</span>
                    {fruit && <span className="text-[9px] text-text-dim ml-1.5"><fruit.Icon className="inline-block w-3.5 h-3.5 align-[-0.15em] text-gold-champagne" strokeWidth={1.75} /></span>}
                  </button>
                );
              })}
            </>
          )}
          {artigos.length > 0 && (
            <>
              <p className="text-[9px] font-montserrat uppercase tracking-widest text-text-dim px-2 pt-2">Artigos</p>
              {artigos.map(e => (
                <button key={e.id} onClick={() => onPreview(e)}
                  className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-gold/10 transition-colors group">
                  <span className="text-gold-light group-hover:text-gold">{e.title}</span>
                </button>
              ))}
            </>
          )}
          {filtered.length === 0 && <p className="text-xs text-text-dim text-center py-6">Nenhuma entrada encontrada.</p>}
        </div>
      </ScrollArea>
    </div>
  );
});
ReferencePanel.displayName = 'ReferencePanel';


// ── Entry Preview Panel (right side, shown when a chip is clicked) ──
const EntryPreviewPanel: React.FC<{
  entry: CodexEntry;
  allEntries: CodexEntry[];
  onClose: () => void;
  onJump: (id: string) => void;
}> = React.memo(({ entry, allEntries, onClose, onJump }) => {
  const fruit = FRUITS.find(f => f.id === entry.fruit_id);
  const isFicha = entry.entry_type === 'ficha';
  const siblings = useMemo(
    () => allEntries.filter(e => e.id !== entry.id),
    [allEntries, entry.id],
  );
  const hasContent = !!(entry.content && entry.content.trim());
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-blue-bright/10 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[9px] font-montserrat uppercase tracking-widest text-text-dim mb-0.5 inline-flex items-center gap-1">
            <span>{isFicha ? 'Ficha' : 'Artigo'}</span>
            {fruit && (
              <>
                <span>·</span>
                <fruit.Icon className="inline-block w-3.5 h-3.5 align-[-0.15em] text-gold-champagne" strokeWidth={1.75} />
                <span>{fruit.name}</span>
              </>
            )}
          </p>
          <h3 className={`font-cinzel font-bold text-sm truncate ${isFicha ? 'text-blue-light' : 'text-gold-light'}`}>
            {entry.title}
          </h3>
        </div>
        <button onClick={onClose} aria-label="Fechar" className="p-1 text-text-dim hover:text-foreground" title="Fechar">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {entry.image_url && (
        <img src={entry.image_url} alt={entry.title} className="w-full h-[120px] object-cover" loading="lazy" />
      )}
      <ScrollArea className="flex-1">
        <div className="p-3 text-xs text-foreground/85 font-merriweather leading-relaxed">
          {hasContent ? (
            <RichTextView value={entry.content} mentionEntries={siblings} onOpenEntry={onJump} />
          ) : (
            <span className="italic text-text-dim">Sem conteúdo.</span>
          )}
        </div>
      </ScrollArea>
    </div>
  );
});
EntryPreviewPanel.displayName = 'EntryPreviewPanel';

// ── Sortable chapter row (draggable via long-press on touch / pointer down on desktop) ──
interface SortableChapterRowProps {
  id: string;
  title: string;
  wordCount: number;
  isActive: boolean;
  onOpen: () => void;
  onToggleNotes: () => void;
  onRequestDelete: () => void;
  onRequestRename: () => void;
  notesOpen: boolean;
}
const SortableChapterRow: React.FC<SortableChapterRowProps> = ({
  id, title, wordCount, isActive, onOpen, onToggleNotes, onRequestDelete, onRequestRename, notesOpen,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={setNodeRef}
          style={style}
          className={`flex items-center group rounded ${isDragging ? 'ring-1 ring-blue-bright/40 bg-blue-bright/[0.06]' : ''}`}
        >
          {/* Drag handle — segure e arraste para reordenar. Sempre visível para descoberta. */}
          <button
            {...attributes}
            {...listeners}
            aria-label="Arrastar para reordenar"
            title="Segure e arraste para reordenar"
            className="p-1 text-blue-light/50 hover:text-blue-bright active:text-blue-bright touch-none cursor-grab active:cursor-grabbing shrink-0"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
          {/* Título — abre em UM clique/tap. `onPointerUp` garante disparo imediato mesmo quando
              o Radix ContextMenuTrigger tenta iniciar o long-press. Trunca com "…" e mostra
              o nome completo em tooltip no hover. */}
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onPointerUp={(e) => {
                    if (e.pointerType !== 'mouse' || e.button === 0) onOpen();
                  }}
                  className={`flex-1 min-w-0 flex items-center gap-1.5 text-left px-2 py-1.5 rounded text-xs font-montserrat font-bold transition-colors ${
                    isActive ? 'bg-blue-bright/15 text-blue-light' : 'text-foreground/80 hover:text-foreground hover:bg-white/[0.03]'
                  }`}
                >
                  <FileText className="w-3 h-3 shrink-0 opacity-50" />
                  <span className="truncate block min-w-0 flex-1">{title}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" align="start" className="max-w-[280px] text-[11px] font-montserrat break-words">
                {title}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onOpen}
                  aria-label={`Abrir capítulo (${wordCount || 0} palavras)`}
                  className="text-[9px] text-text-dim/60 hover:text-blue-light mr-1 shrink-0 tabular-nums px-1 py-0.5 rounded hover:bg-blue-bright/10 transition-colors"
                >
                  {wordCount || 0}
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" className="text-[11px]">
                <span className="font-mono">{(wordCount || 0).toLocaleString('pt-BR')}</span> palavras — clique para editar
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <button
            onClick={onToggleNotes}
            className="opacity-0 group-hover:opacity-100 p-0.5 text-text-dim hover:text-gold-light transition-all shrink-0"
            title="Notas"
          >
            <StickyNote className="w-3 h-3" />
          </button>
          <button
            onClick={onRequestDelete}
            aria-label="Excluir capítulo"
            className="opacity-0 group-hover:opacity-100 p-0.5 text-text-dim hover:text-red-alert transition-all shrink-0"
            title="Excluir capítulo"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="min-w-[200px]">
        <ContextMenuItem onSelect={onOpen} className="text-xs">
          <FileText className="w-3.5 h-3.5 mr-2 opacity-60" /> Abrir capítulo
        </ContextMenuItem>
        <ContextMenuItem onSelect={onRequestRename} className="text-xs">
          <PenLine className="w-3.5 h-3.5 mr-2 opacity-60" /> Renomear
        </ContextMenuItem>
        <ContextMenuItem onSelect={onToggleNotes} className="text-xs">
          <StickyNote className="w-3.5 h-3.5 mr-2 opacity-60" /> {notesOpen ? 'Ocultar notas' : 'Notas do capítulo'}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={onRequestDelete} className="text-xs text-red-alert focus:text-red-alert">
          <Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir capítulo
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

// ── Main Component ──
export const TabEscrever: React.FC<Props> = ({ worldId, worlds }) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const {
    manuscripts, activeManuscript, setActiveManuscript,
    chapters, scenes, totalWordCount, chaptersLoading,
    createManuscript, updateManuscript, deleteManuscript,
    createChapter, updateChapter, deleteChapter, reorderChapters,
    refetch: refetchManuscripts,
  } = useManuscript(worldId);
  const { entries, fetchEntryContent, isContentHydrated } = useCodexEntries(worldId);

  // Sensors: 8px de tolerância no mouse (evita drag acidental ao clicar);
  // long-press de 220ms no toque (garante que o TAP simples continue abrindo o capítulo).
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
  );

  const handleChapterDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = chapters.findIndex(c => c.id === active.id);
    const newIndex = chapters.findIndex(c => c.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const orderedIds = arrayMove(chapters, oldIndex, newIndex).map(c => c.id);
    reorderChapters(orderedIds);
  }, [chapters, reorderChapters]);

  const [writeMode, setWriteMode] = useState<WriteMode>('manuscrito');
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  // Default closed: keeps the editor DOM lean and snappy on first paint.
  const [showRefPanel, setShowRefPanel] = useState(false);
  const [showNotes, setShowNotes] = useState<string | null>(null);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [newManuscriptName, setNewManuscriptName] = useState('');
  const [zenMode, setZenMode] = useState(false);
  // Resizable chapter-list column width — persisted in sessionStorage (per tab only).
  const CHAPTER_COL_KEY = 'adm:chaptersColWidth';
  const CHAPTER_COL_MIN = 200;
  const CHAPTER_COL_MAX = 480;
  const [chapterColWidth, setChapterColWidth] = useState<number>(() => {
    try {
      const raw = sessionStorage.getItem(CHAPTER_COL_KEY);
      const n = raw ? parseInt(raw, 10) : NaN;
      return Number.isFinite(n) ? Math.min(CHAPTER_COL_MAX, Math.max(CHAPTER_COL_MIN, n)) : 260;
    } catch { return 260; }
  });
  useEffect(() => {
    try { sessionStorage.setItem(CHAPTER_COL_KEY, String(chapterColWidth)); } catch {}
  }, [chapterColWidth]);
  const resizeStartRef = useRef<{ startX: number; startW: number } | null>(null);
  const onColResizeDown = useCallback((e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    resizeStartRef.current = { startX: e.clientX, startW: chapterColWidth };
  }, [chapterColWidth]);
  const onColResizeMove = useCallback((e: React.PointerEvent) => {
    if (!resizeStartRef.current) return;
    const dx = e.clientX - resizeStartRef.current.startX;
    const next = Math.min(CHAPTER_COL_MAX, Math.max(CHAPTER_COL_MIN, resizeStartRef.current.startW + dx));
    setChapterColWidth(next);
  }, []);
  const onColResizeUp = useCallback((e: React.PointerEvent) => {
    resizeStartRef.current = null;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  }, []);
  // Selected reference (when a chip is clicked) — shows in the right panel as a card.
  const [previewEntry, setPreviewEntry] = useState<CodexEntry | null>(null);
  const [chapterPendingDelete, setChapterPendingDelete] = useState<string | null>(null);
  const [chapterRenaming, setChapterRenaming] = useState<{ id: string; title: string } | null>(null);
  const titleSaveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeChapter = useMemo(() => chapters.find(c => c.id === activeChapterId), [chapters, activeChapterId]);

  // Live word count for the active chapter (real-time from the editor).
  const [liveActiveWords, setLiveActiveWords] = useState<number | null>(null);
  useEffect(() => { setLiveActiveWords(null); }, [activeChapterId]);
  const effectiveChapters = useMemo(() => {
    if (activeChapterId == null || liveActiveWords == null) return chapters;
    return chapters.map(c => c.id === activeChapterId ? { ...c, word_count: liveActiveWords } : c);
  }, [chapters, activeChapterId, liveActiveWords]);
  const effectiveTotal = useMemo(
    () => effectiveChapters.reduce((s, c) => s + (c.word_count || 0), 0),
    [effectiveChapters]
  );

  // Chapter word count (live from the editor when active)
  const activeChapterWords = activeChapter
    ? (activeChapterId === activeChapter.id && liveActiveWords != null ? liveActiveWords : (activeChapter.word_count || 0))
    : 0;

  // Daily writing goal — persists across sessions; resets automatically at midnight (Brazil).
  const goalKey = 'adm:dailyGoal';
  const brDateFmt = useMemo(
    () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }),
    []
  );
  const getBrDate = useCallback(() => brDateFmt.format(new Date()), [brDateFmt]);
  const [today, setToday] = useState<string>(() => getBrDate());
  // Tick every 30s to detect midnight rollover (Brazil timezone).
  useEffect(() => {
    const id = window.setInterval(() => {
      const d = getBrDate();
      setToday(prev => (prev === d ? prev : d));
    }, 30_000);
    return () => window.clearInterval(id);
  }, [getBrDate]);

  const snapKey = activeManuscript ? `adm:dailySnap:${activeManuscript.id}:${today}` : null;
  const [dailyGoal, setDailyGoal] = useState<number>(() => {
    try { return Math.max(0, parseInt(localStorage.getItem(goalKey) || '500', 10)) || 500; }
    catch { return 500; }
  });
  const [snapshot, setSnapshot] = useState<number | null>(null);
  useEffect(() => {
    if (!snapKey) { setSnapshot(null); return; }
    // Aguarda os capítulos carregarem antes de gravar a linha-base do dia.
    // Sem isso, `effectiveTotal` fica em 0 durante o load e o snapshot é
    // congelado em 0 — fazendo "Hoje" igualar o total do manuscrito.
    if (chaptersLoading) return;
    try {
      const raw = localStorage.getItem(snapKey);
      if (raw != null) setSnapshot(parseInt(raw, 10) || 0);
      else {
        localStorage.setItem(snapKey, String(effectiveTotal));
        setSnapshot(effectiveTotal);
      }
    } catch { setSnapshot(0); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapKey, chaptersLoading]);
  const wordsToday = snapshot == null ? 0 : Math.max(0, effectiveTotal - snapshot);
  const goalPct = dailyGoal > 0 ? Math.min(100, Math.round((wordsToday / dailyGoal) * 100)) : 0;
  const persistGoal = useCallback((v: number) => {
    const clean = Math.max(0, Math.min(999999, Math.round(v)));
    setDailyGoal(clean);
    try { localStorage.setItem(goalKey, String(clean)); } catch {}
  }, []);
  const resetSnapshot = useCallback(() => {
    // Realinha a data ao fuso de Brasília (garante que a chave usada é a de hoje,
    // mesmo se o tick de 30s ainda não rodou) e regrava a linha-base do dia com o
    // total atual — zerando "Hoje" sem precisar mexer no localStorage manualmente.
    const brToday = getBrDate();
    setToday(brToday);
    if (!activeManuscript) return;
    const key = `adm:dailySnap:${activeManuscript.id}:${brToday}`;
    try { localStorage.setItem(key, String(effectiveTotal)); } catch {}
    setSnapshot(effectiveTotal);
    toast.success('Contagem de "Hoje" recalculada', {
      description: `Nova linha-base: ${effectiveTotal.toLocaleString('pt-BR')} palavras · ${brToday}`,
    });
  }, [activeManuscript, effectiveTotal, getBrDate]);

  // Local manuscript title (debounced save — was firing 1 DB write per keystroke)
  const [manuscriptTitleLocal, setManuscriptTitleLocal] = useState(activeManuscript?.title ?? '');
  useEffect(() => {
    setManuscriptTitleLocal(activeManuscript?.title ?? '');
  }, [activeManuscript?.id]); // eslint-disable-line

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && zenMode) setZenMode(false); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [zenMode]);

  const pendingOpenRef = useRef<{ manuscriptId?: string; chapterId?: string } | null>(null);
  const [pendingTick, setPendingTick] = useState(0);
  // Lê pending do sessionStorage uma única vez no mount.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('adm:pending-open');
      if (raw) {
        sessionStorage.removeItem('adm:pending-open');
        pendingOpenRef.current = JSON.parse(raw);
        setPendingTick(t => t + 1);
      }
    } catch {}
    const handler = (e: Event) => {
      pendingOpenRef.current = (e as CustomEvent).detail;
      setPendingTick(t => t + 1);
    };
    window.addEventListener('adm:open-manuscript', handler as EventListener);
    return () => window.removeEventListener('adm:open-manuscript', handler as EventListener);
  }, []);

  // Aplica pending quando os manuscritos/capítulos necessários já estão carregados.
  useEffect(() => {
    const detail = pendingOpenRef.current;
    if (!detail?.manuscriptId) return;
    const target = manuscripts.find(m => m.id === detail.manuscriptId);
    if (!target) return; // aguarda manuscripts carregarem
    if (target.id !== activeManuscript?.id) {
      setActiveManuscript(target);
      // Ainda precisamos aguardar chapters do novo manuscrito.
      return;
    }
    if (detail.chapterId) {
      const ch = chapters.find(c => c.id === detail.chapterId);
      if (!ch) return; // aguarda chapters
      setActiveChapterId(ch.id);
      toast.success(`Abrindo capítulo: ${ch.title}`, { description: target.title, duration: 2200 });
    } else {
      toast.success(`Manuscrito ativo: ${target.title}`, { duration: 2200 });
    }
    pendingOpenRef.current = null;
  }, [manuscripts, chapters, activeManuscript?.id, setActiveManuscript, pendingTick]);



  useEffect(() => () => {
    if (titleSaveTimerRef.current) clearTimeout(titleSaveTimerRef.current);
  }, []);

  const handleManuscriptTitleChange = (next: string) => {
    setManuscriptTitleLocal(next);
    if (!activeManuscript) return;
    // Sync sidebar instantly (before debounced DB write).
    try {
      window.dispatchEvent(new CustomEvent('adm:manuscript-renamed', { detail: { id: activeManuscript.id, title: next } }));
    } catch {}
    if (titleSaveTimerRef.current) clearTimeout(titleSaveTimerRef.current);
    titleSaveTimerRef.current = setTimeout(() => {
      updateManuscript(activeManuscript.id, { title: next });
    }, 700);
  };

  // Stable callbacks for ChapterEditor (so React.memo can short-circuit when chapter id doesn't change)
  const handleChapterContentSave = useCallback((content: string) => {
    if (activeChapterId) updateChapter(activeChapterId, { content });
  }, [activeChapterId, updateChapter]);

  const handleChapterTitleSave = useCallback((title: string) => {
    if (activeChapterId) updateChapter(activeChapterId, { title });
  }, [activeChapterId, updateChapter]);

  const handlePreviewEntry = useCallback((entry: CodexEntry) => {
    setPreviewEntry(entry);
    setShowRefPanel(true);
    // Codex list query is lean (no `content`) — hydrate on demand so the
    // Reference panel shows real text instead of "Sem conteúdo.".
    if (!isContentHydrated(entry.id)) fetchEntryContent(entry.id);
  }, [fetchEntryContent, isContentHydrated]);

  const handleCreateManuscriptWithName = async () => {
    const name = newManuscriptName.trim() || 'Sem título';
    await createManuscript(name);
    setShowNamePrompt(false);
    setNewManuscriptName('');
  };


  if (!user) return <div className="text-center py-20 text-text-dim">Faça login para acessar.</div>;
  if (!worldId) return <div className="text-center py-20 text-text-dim">Selecione um mundo para começar a escrever.</div>;

  // No manuscript yet
  if (!activeManuscript) {
    return (
      <div className="mx-auto max-w-[650px] px-4 py-14 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-bright/10 flex items-center justify-center">
          <BookMarked className="w-8 h-8 text-blue-light/60" />
        </div>
        <h2 className="font-cinzel font-bold text-xl text-foreground mb-2">Comece seu Manuscrito</h2>
        <p className="text-sm text-text-secondary mb-6 max-w-md mx-auto leading-relaxed">
          O manuscrito é onde sua história ganha forma. Organize tudo em <strong>capítulos</strong>, como um livro de verdade.
        </p>

        <div className="flex items-center justify-center gap-2 flex-wrap">
          <Button data-tour="create-manuscript" onClick={() => setShowNamePrompt(true)} className="bg-blue-bright/20 text-blue-light border border-blue-bright/30 hover:bg-blue-bright/30">
            <Plus className="w-4 h-4 mr-1" /> Criar Manuscrito
          </Button>
          <ImportManuscriptDialog
            worldId={worldId}
            onImported={async ({ id }) => {
              await refetchManuscripts();
              const { data } = await supabase.from('manuscripts').select('*').eq('id', id).maybeSingle();
              if (data) setActiveManuscript(data as typeof activeManuscript);
            }}
            trigger={
              <Button variant="outline" className="border-emerald-400/40 text-emerald-300 hover:text-emerald-200 hover:bg-emerald-500/10 hover:border-emerald-400/60">
                <Upload className="w-4 h-4 mr-1" /> Importar Manuscrito
              </Button>
            }
          />
        </div>

        <Dialog open={showNamePrompt} onOpenChange={setShowNamePrompt}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-cinzel">Novo Manuscrito</DialogTitle>
            </DialogHeader>
            <div className="py-3">
              <label className="block text-[10px] uppercase tracking-wider text-text-dim font-montserrat mb-1.5">Nome do manuscrito</label>
              <Input value={newManuscriptName} onChange={e => setNewManuscriptName(e.target.value)}
                placeholder="Ex: Crônicas de Ellerya" autoFocus
                onKeyDown={e => e.key === 'Enter' && handleCreateManuscriptWithName()} />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowNamePrompt(false)}>Cancelar</Button>
              <Button onClick={handleCreateManuscriptWithName} className="bg-blue-bright/20 text-blue-light border border-blue-bright/30">Criar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className={`mx-auto px-2 sm:px-4 py-4 transition-all duration-300 ${zenMode ? 'max-w-[900px]' : 'max-w-[1400px]'}`}>
      {/* Top bar */}
      <div className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-4 transition-opacity duration-300 ${zenMode ? 'opacity-0 hover:opacity-100 h-0 overflow-hidden hover:h-auto hover:overflow-visible' : ''}`}>
        {/* Row 1 (mobile) / left (desktop): Title box — full width on mobile */}
        <div className="flex items-center gap-2 min-w-0 w-full sm:w-auto sm:flex-1">
          <div className="inline-flex items-stretch min-w-0 w-full sm:w-auto rounded-md border border-blue-bright/30 bg-blue-bright/5 hover:border-blue-bright/50 focus-within:border-blue-bright/60 focus-within:ring-1 focus-within:ring-blue-bright/40 transition-all shadow-sm">
            <input
              value={manuscriptTitleLocal}
              onChange={e => handleManuscriptTitleChange(e.target.value)}
              aria-label="Nome do manuscrito"
              className="bg-transparent font-cinzel font-bold text-base sm:text-lg text-foreground border-none focus:outline-none rounded-l-md px-3 py-1.5 min-w-0 flex-1 sm:max-w-[260px] cursor-text text-center sm:text-left tracking-wider"
              placeholder="Título do manuscrito"
            />
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Trocar manuscrito"
                className="group inline-flex items-center justify-center px-3 rounded-r-md border-l border-blue-bright/30 bg-blue-bright/10 hover:bg-blue-bright/20 text-blue-light hover:text-blue-bright transition-all shrink-0"
                title="Trocar manuscrito"
              >
                <ChevronDown className="w-4 h-4 transition-transform group-data-[state=open]:rotate-180" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[240px]">
                <p className="text-[9px] uppercase font-montserrat text-text-dim px-2 py-1">Manuscritos deste mundo</p>
                {manuscripts.map(m => (
                  <DropdownMenuItem
                    key={m.id}
                    onSelect={() => setActiveManuscript(m)}
                    className={`text-xs ${m.id === activeManuscript.id ? 'bg-blue-bright/10 text-blue-light' : ''}`}
                  >
                    <BookMarked className="w-3 h-3 mr-2 opacity-60" />
                    {m.title}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setShowNamePrompt(true)} className="text-xs text-blue-light">
                  <Plus className="w-3 h-3 mr-2" /> Novo manuscrito
                </DropdownMenuItem>
                <ConfirmDialog
                  trigger={
                    <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-xs text-red-alert/90">
                      <Trash2 className="w-3 h-3 mr-2" /> Excluir manuscrito atual
                    </DropdownMenuItem>
                  }
                  title="Excluir manuscrito"
                  description={`Excluir "${activeManuscript.title}"? Todos os capítulos e arcos serão perdidos.`}
                  confirmLabel="Excluir"
                  onConfirm={() => deleteManuscript(activeManuscript.id)}
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Dialog: criar novo manuscrito */}
        <Dialog open={showNamePrompt} onOpenChange={setShowNamePrompt}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-cinzel">Novo Manuscrito</DialogTitle>
            </DialogHeader>
            <div className="py-3">
              <label className="block text-[10px] uppercase tracking-wider text-text-dim font-montserrat mb-1.5">Nome do manuscrito</label>
              <Input value={newManuscriptName} onChange={e => setNewManuscriptName(e.target.value)}
                placeholder="Ex: Crônicas de Ellerya" autoFocus
                onKeyDown={e => e.key === 'Enter' && handleCreateManuscriptWithName()} />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowNamePrompt(false)}>Cancelar</Button>
              <Button onClick={handleCreateManuscriptWithName} className="bg-blue-bright/20 text-blue-light border border-blue-bright/30">Criar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Row 2 (mobile) / right (desktop): modes • pomodoro • actions */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Left: mode switcher */}
          <div data-tour="write-modes" className="flex items-center bg-white/[0.03] rounded-md border border-blue-bright/10 p-0.5 shrink-0">
            {(Object.entries(WRITE_MODE_INFO) as [WriteMode, typeof WRITE_MODE_INFO[WriteMode]][]).map(([key, m]) => (
              <div key={key} className="relative group">
                <button onClick={() => setWriteMode(key)}
                  className={`flex items-center gap-1 px-2 py-1.5 rounded text-[11px] font-montserrat font-bold uppercase tracking-wider transition-all ${
                    writeMode === key ? 'bg-blue-bright/20 text-blue-light' : 'text-text-dim hover:text-foreground'
                  }`}>
                  <m.icon className="w-3.5 h-3.5" />
                  {!isMobile && m.label}
                </button>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 p-3 rounded-lg bg-[hsl(var(--bg-deep))] border border-blue-bright/20 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                  <p className="font-montserrat font-bold text-xs text-blue-light mb-1">{m.label}</p>
                  <p className="font-merriweather text-[11px] text-text-secondary leading-relaxed">{m.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Center: pomodoro */}
          <PomodoroTimer />

          {/* Right: action buttons */}
          <div className="flex items-center gap-1 shrink-0">
            <ImportManuscriptDialog
              worldId={worldId}
              existingManuscripts={manuscripts.map(m => ({ id: m.id, title: m.title }))}
              defaultTargetId={activeManuscript?.id}
              onImported={async ({ id }) => {
                await refetchManuscripts();
                const { data } = await supabase.from('manuscripts').select('*').eq('id', id).maybeSingle();
                if (data) setActiveManuscript(data as typeof activeManuscript);
              }}
              trigger={
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-[11px] font-montserrat font-bold uppercase tracking-wider border-emerald-400/40 text-emerald-300 hover:text-emerald-200 hover:bg-emerald-500/10 hover:border-emerald-400/60 px-2"
                  title="Importar manuscrito de PDF, DOCX, TXT ou EPUB"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Importar</span>
                </Button>
              }
            />
            {chapters.length > 0 && (
              <FormatAllChaptersDialog chapters={chapters} onChapterUpdate={updateChapter} />
            )}
            <ManuscriptExportMenu manuscript={activeManuscript} chapters={chapters} scenes={scenes} />
          </div>
        </div>
      </div>

      {/* ── STORYLINE / MURAL MODE (lazy) ── */}
      {writeMode === 'mural' && <MuralMode worldId={worldId} manuscripts={manuscripts} />}

      {/* ── MANUSCRIPT MODE ── */}
      {writeMode === 'manuscrito' && (
        <div className={`flex gap-3 min-h-[400px] transition-all duration-300 ${zenMode ? 'h-[calc(100vh-100px)]' : 'h-[calc(100vh-220px)]'}`}>
          {/* LEFT: Chapter list */}
          {!zenMode && (
          <div
            className={`${isMobile ? 'w-full' : ''} shrink-0 relative flex flex-col bg-white/[0.02] rounded-lg border border-blue-bright/10 ${isMobile && activeChapterId ? 'hidden' : ''}`}
            style={isMobile ? undefined : { width: chapterColWidth }}
          >
            <div className="p-2 border-b border-blue-bright/10 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-montserrat uppercase tracking-widest text-text-dim">Capítulos</span>
                <button onClick={async () => { const ch = await createChapter(); if (ch) setActiveChapterId(ch.id); }}
                  className="p-1 rounded hover:bg-blue-bright/10 text-blue-light shrink-0" title="Novo capítulo">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Word stats card: Total / Capítulo / Hoje */}
              <div className="relative rounded-md border border-blue-bright/25 bg-gradient-to-br from-blue-bright/[0.08] via-blue-bright/[0.04] to-transparent p-2 shadow-[0_0_16px_-6px_rgba(59,130,246,0.55)]">
                <div className="flex items-start gap-1">
                  <TooltipProvider delayDuration={200}>
                    {/* Total */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex-1 min-w-0 px-1">
                          <div className="text-[8px] font-montserrat uppercase tracking-widest text-blue-light/60 flex items-center gap-1">
                            <Feather className="w-2.5 h-2.5" strokeWidth={2} /> Total
                          </div>
                          <div className="text-[13px] font-mono font-bold text-blue-light tabular-nums leading-tight truncate">
                            {effectiveTotal.toLocaleString('pt-BR')}
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-[10px]">Palavras totais do manuscrito</TooltipContent>
                    </Tooltip>

                    <div className="w-px self-stretch bg-blue-bright/15" />

                    {/* Capítulo */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex-1 min-w-0 px-1">
                          <div className="text-[8px] font-montserrat uppercase tracking-widest text-blue-light/60 flex items-center gap-1">
                            <FileText className="w-2.5 h-2.5" strokeWidth={2} /> Capítulo
                          </div>
                          <div className="text-[13px] font-mono font-bold text-foreground tabular-nums leading-tight truncate">
                            {activeChapter ? activeChapterWords.toLocaleString('pt-BR') : '—'}
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-[10px]">
                        {activeChapter ? `Palavras em "${activeChapter.title}"` : 'Abra um capítulo para ver a contagem'}
                      </TooltipContent>
                    </Tooltip>

                    <div className="w-px self-stretch bg-blue-bright/15" />

                    {/* Hoje + goal popover */}
                    <div className="flex-1 min-w-0 flex items-center gap-1">
                      <Popover>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <PopoverTrigger asChild>
                              <button className="flex-1 min-w-0 px-1 text-left rounded hover:bg-blue-bright/10 transition-colors">
                                <div className="text-[8px] font-montserrat uppercase tracking-widest text-gold/70 flex items-center gap-1">
                                  <Target className="w-2.5 h-2.5" strokeWidth={2} /> Hoje
                                </div>
                                <div className="text-[13px] font-mono font-bold text-gold-light tabular-nums leading-tight truncate">
                                  {wordsToday.toLocaleString('pt-BR')}
                                </div>
                              </button>
                            </PopoverTrigger>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-[10px]">Palavras escritas hoje (reset à meia-noite, horário de Brasília)</TooltipContent>
                        </Tooltip>
                        <PopoverContent side="right" align="start" className="w-64 p-3 space-y-2">
                          <div className="text-[10px] font-montserrat uppercase tracking-widest text-text-dim">Meta diária</div>
                          <p className="text-[10px] text-text-dim/80 leading-snug">
                            Reset automático à meia-noite (Brasília). Contagem baseada em variação de palavras totais.
                          </p>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min={0}
                              step={100}
                              value={dailyGoal}
                              onChange={e => persistGoal(parseInt(e.target.value || '0', 10))}
                              className="h-7 text-xs"
                            />
                            <span className="text-[10px] text-text-dim">palavras</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-text-dim pt-1">
                            <span>{wordsToday.toLocaleString('pt-BR')} / {dailyGoal.toLocaleString('pt-BR')} ({goalPct}%)</span>
                            <ConfirmDialog
                              trigger={
                                <button className="text-gold-light hover:underline">Recalcular</button>
                              }
                              variant="warning"
                              title='Recalcular "Hoje"?'
                              description={`Isto define a linha-base do dia como o total atual do manuscrito (${effectiveTotal.toLocaleString('pt-BR')} palavras) no fuso de Brasília. O contador "Hoje" será zerado. Total e por capítulo permanecem intactos.`}
                              confirmLabel="Recalcular"
                              onConfirm={resetSnapshot}
                            />
                          </div>
                        </PopoverContent>
                      </Popover>
                      {/* Botão dedicado com confirmação: recalcula "Hoje" no fuso de Brasília. */}
                      <ConfirmDialog
                        trigger={
                          <button
                            type="button"
                            aria-label="Recalcular contagem de hoje"
                            title='Recalcular "Hoje" (fuso de Brasília)'
                            className="shrink-0 inline-flex items-center justify-center h-6 w-6 rounded-md border border-gold/30 bg-gradient-to-br from-gold/15 via-gold/5 to-transparent text-gold-light shadow-[0_0_10px_-4px_rgba(212,175,55,0.6)] hover:border-gold/60 hover:from-gold/25 hover:to-gold/10 hover:shadow-[0_0_14px_-2px_rgba(212,175,55,0.75)] active:scale-95 transition-all"
                          >
                            <RefreshCw className="w-3 h-3" strokeWidth={2.2} />
                          </button>
                        }
                        variant="warning"
                        title='Recalcular "Hoje"?'
                        description={`Isto define a linha-base do dia como o total atual do manuscrito (${effectiveTotal.toLocaleString('pt-BR')} palavras) no fuso de Brasília. O contador "Hoje" será zerado. Total e por capítulo permanecem intactos.`}
                        confirmLabel="Recalcular"
                        onConfirm={resetSnapshot}
                      />

                    </div>
                  </TooltipProvider>
                </div>

                {/* Daily goal progress bar */}
                <div className="mt-2">
                  <div className="h-1 rounded-full bg-blue-bright/10 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-gold to-gold-light shadow-[0_0_8px_rgba(212,175,55,0.6)] transition-all duration-500"
                      style={{ width: `${goalPct}%` }}
                    />
                  </div>
                </div>
              </div>

            </div>
            <ScrollArea className="flex-1">
              <div className="p-1.5 space-y-0.5">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleChapterDragEnd}>
                  <SortableContext items={effectiveChapters.map(c => c.id)} strategy={verticalListSortingStrategy}>
                    {effectiveChapters.map((ch) => (
                      <SortableChapterRow
                        key={ch.id}
                        id={ch.id}
                        title={ch.title}
                        wordCount={ch.word_count || 0}
                        isActive={activeChapterId === ch.id}
                        notesOpen={showNotes === ch.id}
                        onOpen={() => setActiveChapterId(ch.id)}
                        onToggleNotes={() => setShowNotes(showNotes === ch.id ? null : ch.id)}
                        onRequestDelete={() => setChapterPendingDelete(ch.id)}
                        onRequestRename={() => setChapterRenaming({ id: ch.id, title: ch.title })}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
                {showNotes && (() => {
                  const ch = chapters.find(c => c.id === showNotes);
                  if (!ch) return null;
                  return (
                    <div className="px-1 mb-1">
                      <DebouncedTextarea
                        value={ch.notes || ''}
                        onSave={(notes) => updateChapter(ch.id, { notes })}
                        placeholder="Notas do capítulo…"
                        className="text-[10px] min-h-[50px] bg-gold/[0.04] border-gold/20 text-gold-light placeholder:text-gold/30 resize-none"
                      />
                    </div>
                  );
                })()}
                {chapters.length === 0 && <p className="text-xs text-text-dim text-center py-6">Crie seu primeiro capítulo.</p>}
              </div>
            </ScrollArea>
            {/* Resize handle (desktop only): drag to adjust chapter list width. */}
            {!isMobile && (
              <div
                onPointerDown={onColResizeDown}
                onPointerMove={onColResizeMove}
                onPointerUp={onColResizeUp}
                onPointerCancel={onColResizeUp}
                onDoubleClick={() => setChapterColWidth(260)}
                role="separator"
                aria-orientation="vertical"
                aria-label="Redimensionar coluna de capítulos (duplo clique para restaurar 260px)"
                title="Arraste para redimensionar · duplo clique para 260px"
                className="absolute top-0 right-0 h-full w-1.5 -mr-0.5 cursor-col-resize group z-10"
              >
                <div className="absolute inset-y-0 right-0 w-px bg-blue-bright/20 group-hover:bg-blue-bright/60 group-hover:shadow-[0_0_8px_rgba(59,130,246,0.6)] transition-all" />
              </div>
            )}
          </div>
          )}

          {/* CENTER: Editor */}
          <div className={`flex-1 min-w-0 flex flex-col rounded-lg border transition-all duration-300 ${zenMode ? 'bg-background border-transparent shadow-2xl' : 'bg-white/[0.02] border-blue-bright/10'} ${isMobile && !activeChapterId ? 'hidden' : ''}`}>
            {activeChapter ? (
              <>
                {/* Breadcrumb */}
                {!zenMode && (
                  <div className="px-3 pt-2 flex items-center gap-1 text-[10px] font-montserrat text-text-dim/60">
                    <span className="hover:text-foreground cursor-default">{activeManuscript.title}</span>
                    <ChevronRight className="w-2.5 h-2.5" />
                    <span className="text-blue-light/80">{activeChapter.title}</span>
                  </div>
                )}
                <ChapterEditor
                  key={activeChapter.id}
                  chapter={activeChapter}
                  entries={entries}
                  isMobile={isMobile}
                  zenMode={zenMode}
                  setZenMode={setZenMode}
                  showRefPanel={showRefPanel}
                  setShowRefPanel={setShowRefPanel}
                  onBack={isMobile ? () => setActiveChapterId(null) : undefined}
                  onTitleSave={handleChapterTitleSave}
                  onContentSave={handleChapterContentSave}
                  onPreviewEntry={handlePreviewEntry}
                  onLiveWordCount={setLiveActiveWords}
                />
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center p-8">
                <div>
                  <FileText className="w-10 h-10 mx-auto mb-3 text-text-dim/30" />
                  <p className="text-sm text-text-dim">Selecione um capítulo para começar a escrever.</p>
                  <p className="text-xs text-text-dim/50 mt-1">Ou crie um novo capítulo no painel à esquerda.</p>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Reference Panel (or selected entry preview) */}
          {showRefPanel && !isMobile && !zenMode && (
            <div className="w-[280px] shrink-0 bg-white/[0.02] rounded-lg border border-blue-bright/10 overflow-hidden">
              {previewEntry ? (
                <EntryPreviewPanel
                  entry={entries.find(e => e.id === previewEntry.id) ?? previewEntry}
                  allEntries={entries}
                  onClose={() => setPreviewEntry(null)}
                  onJump={(id) => { const e = entries.find(x => x.id === id); if (e) handlePreviewEntry(e); }}
                />

              ) : (
                <ReferencePanel entries={entries} onPreview={(e) => handlePreviewEntry(e)} />
              )}
            </div>
          )}
        </div>
      )}

      {/* Controlled: excluir capítulo (do menu de contexto ou botão da lista) */}
      <AlertDialog open={!!chapterPendingDelete} onOpenChange={(o) => { if (!o) setChapterPendingDelete(null); }}>
        <AlertDialogContent className="border-red-alert/30 bg-[#0a0f18] backdrop-blur-xl shadow-[0_0_60px_rgba(220,38,38,0.15)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-cinzel text-lg text-red-alert flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" strokeWidth={2} /> Excluir capítulo
            </AlertDialogTitle>
            <AlertDialogDescription className="font-montserrat text-sm text-text-secondary">
              {(() => {
                const ch = chapters.find(c => c.id === chapterPendingDelete);
                return `Tem certeza que deseja excluir "${ch?.title ?? ''}"? O conteúdo será perdido permanentemente.`;
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-montserrat text-xs font-bold uppercase tracking-wider border-blue-bright/20 text-text-secondary hover:text-foreground hover:bg-white/[0.04]">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const id = chapterPendingDelete;
                if (id) {
                  deleteChapter(id);
                  if (activeChapterId === id) setActiveChapterId(null);
                }
                setChapterPendingDelete(null);
              }}
              className="font-montserrat text-xs font-bold uppercase tracking-wider bg-red-alert/20 text-red-alert border border-red-alert/40 hover:bg-red-alert/30 hover:border-red-alert/60 transition-all"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Controlled: renomear capítulo */}
      <Dialog open={!!chapterRenaming} onOpenChange={(o) => { if (!o) setChapterRenaming(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-cinzel">Renomear capítulo</DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <label className="block text-[10px] uppercase tracking-wider text-text-dim font-montserrat mb-1.5">
              Novo título
            </label>
            <Input
              value={chapterRenaming?.title ?? ''}
              onChange={e => setChapterRenaming(prev => prev ? { ...prev, title: e.target.value } : prev)}
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter' && chapterRenaming) {
                  const t = chapterRenaming.title.trim();
                  if (t) updateChapter(chapterRenaming.id, { title: t });
                  setChapterRenaming(null);
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setChapterRenaming(null)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (chapterRenaming) {
                  const t = chapterRenaming.title.trim();
                  if (t) updateChapter(chapterRenaming.id, { title: t });
                }
                setChapterRenaming(null);
              }}
              className="bg-blue-bright/20 text-blue-light border border-blue-bright/30"
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
