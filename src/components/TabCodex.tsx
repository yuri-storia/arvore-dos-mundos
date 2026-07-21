import React, { useCallback, useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FRUITS, type GalleryImage } from '@/lib/data';
import { useCodexEntries, type CodexEntry } from '@/hooks/useCodexEntries';
import { useAuth } from '@/contexts/AuthContext';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { ImageLightbox } from '@/components/ImageLightbox';
import { CodexCard } from '@/components/CodexCard';
import { exportSingleEntry, exportFruitEntries, exportSelectedFruits, exportAllEntries } from '@/lib/codexPdfExport';
import { CodexAnalysis } from '@/components/CodexAnalysis';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { WorldRecord } from '@/hooks/useWorlds';
import { Lock, BookOpen, Search, FileDown, ClipboardList, PencilLine, Inbox, Library, X, Globe, Check, Apple, Loader2, FolderUp, Trees, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { IdrielImportDialog } from '@/components/IdrielImportDialog';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { ExpandedCodexOverlay } from '@/components/codex/ExpandedCodexOverlay';
import { AnimatePresence, motion } from 'framer-motion';
import { TimelineView } from '@/components/timeline/TimelineView';
import idrielAvatar from '@/assets/idriel-avatar.webp';


const FRUIT_ALL = -1;
const FRUIT_NONE = -2; // sentinel for "no fruit" filter
const EXPANDED_ENTRY_STORAGE = (worldId: string) => `adm_codex_expanded:${worldId}`;
const CREATE_DRAFT_STORAGE = (worldId: string) => `adm_codex_create_draft:${worldId}`;
const CODEX_MODE_STORAGE = (worldId: string) => `adm_codex_mode:${worldId}`;
type CodexMode = 'encyclopedia' | 'timeline';

type EntryKind = 'ficha' | 'artigo';

interface CreateDraft {
  kind: EntryKind | null;
  title: string;
  content: string;
  fruit: number | null;
  imageUrl: string;
}

interface Props {
  gallery: GalleryImage[];
  worldId: string;
  worlds: WorldRecord[];
}

export const TabCodex: React.FC<Props> = ({ gallery, worldId, worlds }) => {
  const { user } = useAuth();
  const planLimits = usePlanLimits();
  const { entries, loading, createEntry, updateEntry, deleteEntry, uploadImage, fetchEntriesFromWorld, importEntries, fetchEntryContent, isContentHydrated } = useCodexEntries(worldId || undefined);
  
  const [filterFruits, setFilterFruits] = useState<number[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [mode, setMode] = useState<CodexMode>(() => {
    if (typeof window === 'undefined' || !worldId) return 'encyclopedia';
    return (sessionStorage.getItem(CODEX_MODE_STORAGE(worldId)) as CodexMode) || 'encyclopedia';
  });
  useEffect(() => {
    if (!worldId) return;
    try { sessionStorage.setItem(CODEX_MODE_STORAGE(worldId), mode); } catch {}
  }, [mode, worldId]);
  const [showCreate, setShowCreate] = useState(false);
  const [createKind, setCreateKind] = useState<EntryKind | null>(null);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [exportSelectedFruitIds, setExportSelectedFruitIds] = useState<number[]>([]);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importWorldId, setImportWorldId] = useState<string>('');
  const [importEntryList, setImportEntryList] = useState<CodexEntry[]>([]);
  const [importSelectedIds, setImportSelectedIds] = useState<string[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [showIdrielImport, setShowIdrielImport] = useState(false);

  // Create form state
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newFruit, setNewFruit] = useState<number | null>(null);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const expandedEntry = entries.find(e => e.id === expandedId) || null;

  // Lazy-load do `content` quando uma ficha é expandida.
  // A listagem do Codex agora vem enxuta (sem `content`) para reduzir o
  // payload em milhares de KB; aqui pedimos o texto completo sob demanda.
  useEffect(() => {
    if (!expandedId) return;
    const entry = entries.find(e => e.id === expandedId);
    if (!entry) return;
    if (entry.content && entry.content.length > 0) return; // já carregado
    fetchEntryContent(expandedId).catch(() => { /* já loga */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedId]);

  const setPersistedExpandedId = useCallback((id: string | null) => {
    setExpandedId(id);
    if (!worldId) return;
    try {
      if (id) localStorage.setItem(EXPANDED_ENTRY_STORAGE(worldId), id);
      else localStorage.removeItem(EXPANDED_ENTRY_STORAGE(worldId));
    } catch {
      // Local storage may be unavailable in restricted browser modes.
    }
  }, [worldId]);

  useEffect(() => {
    if (!worldId || loading) return;
    try {
      const storedId = localStorage.getItem(EXPANDED_ENTRY_STORAGE(worldId));
      if (!expandedId && storedId && entries.some(e => e.id === storedId)) {
        setExpandedId(storedId);
      }
      if (expandedId && !entries.some(e => e.id === expandedId)) {
        localStorage.removeItem(EXPANDED_ENTRY_STORAGE(worldId));
        setExpandedId(null);
      }
    } catch {
      // Local storage may be unavailable in restricted browser modes.
    }
  }, [worldId, loading, entries, expandedId]);

  // Ordered list of entries used for prev/next nav inside the expanded overlay.
  // Matches visual order: fichas first, then artigos.
  const navList = React.useMemo(() => {
    const visible = entries.filter(e => filterFruits.length === 0 || filterFruits.includes(e.fruit_id ?? FRUIT_NONE));
    const fichas = visible.filter(e => e.entry_type === 'ficha');
    const artigos = visible.filter(e => e.entry_type === 'artigo');
    return [...fichas, ...artigos];
  }, [entries, filterFruits]);

  const navIndex = expandedId ? navList.findIndex(e => e.id === expandedId) : -1;
  // Circular navigation: wrap around at the ends so o usuário nunca fica "preso".
  const prevEntry = navIndex >= 0 && navList.length > 1
    ? navList[(navIndex - 1 + navList.length) % navList.length]
    : null;
  const nextEntry = navIndex >= 0 && navList.length > 1
    ? navList[(navIndex + 1) % navList.length]
    : null;

  useEffect(() => {
    if (!expandedId) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const isTypingInField = () => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setPersistedExpandedId(null); return; }
      if (isTypingInField()) return;
      if (event.key === 'ArrowLeft' && prevEntry) {
        event.preventDefault();
        setPersistedExpandedId(prevEntry.id);
      } else if (event.key === 'ArrowRight' && nextEntry) {
        event.preventDefault();
        setPersistedExpandedId(nextEntry.id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [expandedId, setPersistedExpandedId, prevEntry, nextEntry]);

  // Restore create-draft from localStorage when world changes
  useEffect(() => {
    if (!worldId) return;
    try {
      const raw = localStorage.getItem(CREATE_DRAFT_STORAGE(worldId));
      if (!raw) return;
      const draft = JSON.parse(raw) as CreateDraft;
      if (draft.kind || draft.title || draft.content || draft.imageUrl || draft.fruit !== null) {
        setCreateKind(draft.kind);
        setNewTitle(draft.title || '');
        setNewContent(draft.content || '');
        setNewFruit(draft.fruit ?? null);
        setNewImageUrl(draft.imageUrl || '');
        setShowCreate(true);
      }
    } catch {
      // Local storage may be unavailable in restricted browser modes.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worldId]);

  // Persist create-draft whenever the user types
  const createDraftRef = useRef<CreateDraft & { showCreate: boolean }>({
    kind: null, title: '', content: '', fruit: null, imageUrl: '', showCreate: false,
  });
  useEffect(() => {
    createDraftRef.current = {
      kind: createKind,
      title: newTitle,
      content: newContent,
      fruit: newFruit,
      imageUrl: newImageUrl,
      showCreate,
    };
    if (!worldId) return;
    const hasContent = !!(createKind || newTitle || newContent || newImageUrl || newFruit !== null);
    try {
      if (hasContent && showCreate) {
        const draft: CreateDraft = {
          kind: createKind,
          title: newTitle,
          content: newContent,
          fruit: newFruit,
          imageUrl: newImageUrl,
        };
        localStorage.setItem(CREATE_DRAFT_STORAGE(worldId), JSON.stringify(draft));
      } else {
        localStorage.removeItem(CREATE_DRAFT_STORAGE(worldId));
      }
    } catch {
      // Local storage may be unavailable in restricted browser modes.
    }
  }, [worldId, showCreate, createKind, newTitle, newContent, newFruit, newImageUrl]);

  // Synchronous flush on tab hide / refresh / close so nothing is lost
  useEffect(() => {
    if (!worldId) return;
    const flush = () => {
      const d = createDraftRef.current;
      const hasContent = !!(d.kind || d.title || d.content || d.imageUrl || d.fruit !== null);
      try {
        if (hasContent && d.showCreate) {
          const draft: CreateDraft = {
            kind: d.kind, title: d.title, content: d.content, fruit: d.fruit, imageUrl: d.imageUrl,
          };
          localStorage.setItem(CREATE_DRAFT_STORAGE(worldId), JSON.stringify(draft));
        }
      } catch {
        // Local storage may be unavailable in restricted browser modes.
      }
    };
    const onVisibility = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [worldId]);

  if (!user) {
    return (
      <div className="animate-fadeUp mx-auto max-w-[1060px] px-3 sm:px-4 py-12 text-center">
        <p className="font-merriweather text-text-dim">Faça login para acessar seu Codex.</p>
      </div>
    );
  }

  if (!worldId) {
    return (
      <div className="animate-fadeUp mx-auto max-w-[1060px] px-3 sm:px-4 py-12 text-center">
        <p className="font-merriweather text-text-dim">Crie ou selecione um Mundo para acessar seu Codex.</p>
      </div>
    );
  }

  const filtered = entries.filter(e => {
    if (filterFruits.length === 0) return true;
    return filterFruits.includes(e.fruit_id ?? FRUIT_NONE);
  });

  const handleImageUpload = async (file: File, onUrl: (url: string) => void) => {
    setUploading(true);
    const url = await uploadImage(file);
    if (url) onUrl(url);
    setUploading(false);
  };

  const handleCreate = async () => {
    if (!newTitle.trim() || newFruit === null) return;
    
    // Check plan limits
    const fichaCount = entries.filter(e => e.entry_type !== 'artigo').length;
    const artigoCount = entries.filter(e => e.entry_type === 'artigo').length;
    const isFicha = createKind !== 'artigo';
    
    if (isFicha && fichaCount >= planLimits.maxFichas) {
      toast.error(`O plano ${planLimits.planLabel} permite apenas ${planLimits.maxFichas} fichas. Faça upgrade para criar mais!`);
      return;
    }
    if (!isFicha && artigoCount >= planLimits.maxArtigos) {
      toast.error(`O plano ${planLimits.planLabel} permite apenas ${planLimits.maxArtigos} artigo. Faça upgrade para criar mais!`);
      return;
    }
    
    await createEntry({
      title: newTitle,
      content: newContent,
      image_url: createKind === 'ficha' ? (newImageUrl || undefined) : undefined,
      entry_type: createKind || 'geral',
      fruit_id: newFruit,
    });
    resetCreate();
  };

  const resetCreate = () => {
    setShowCreate(false);
    setCreateKind(null);
    setNewTitle(''); setNewContent(''); setNewImageUrl(''); setNewFruit(null);
    setShowImport(false);
    setImportWorldId('');
    setImportEntryList([]);
    setImportSelectedIds([]);
  };

  const handleSelectImportWorld = async (wId: string) => {
    setImportWorldId(wId);
    setImportLoading(true);
    const items = await fetchEntriesFromWorld(wId);
    setImportEntryList(items);
    setImportLoading(false);
  };

  const handleImport = async () => {
    const selected = importEntryList.filter(e => importSelectedIds.includes(e.id));
    if (selected.length === 0) return;

    // Respeitar limites do plano também na importação
    const fichaCount = entries.filter(e => e.entry_type !== 'artigo').length;
    const artigoCount = entries.filter(e => e.entry_type === 'artigo').length;
    const incomingFichas = selected.filter(e => e.entry_type !== 'artigo').length;
    const incomingArtigos = selected.filter(e => e.entry_type === 'artigo').length;

    if (fichaCount + incomingFichas > planLimits.maxFichas) {
      toast.error(`Importação excede o limite de ${planLimits.maxFichas} fichas do plano ${planLimits.planLabel}.`);
      return;
    }
    if (artigoCount + incomingArtigos > planLimits.maxArtigos) {
      toast.error(`Importação excede o limite de ${planLimits.maxArtigos} artigos do plano ${planLimits.planLabel}.`);
      return;
    }

    await importEntries(selected);
    resetCreate();
  };

  const openCreate = (kind: EntryKind) => {
    setCreateKind(kind);
    setShowCreate(true);
  };

  return (
    <div className="animate-fadeUp mx-auto max-w-[1060px] px-3 sm:px-4 py-6">
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-cinzel font-bold text-xl sm:text-2xl md:text-3xl text-foreground inline-flex items-center gap-2.5"><BookOpen className="w-7 h-7 text-gold-champagne" strokeWidth={1.75} />Codex</h1>
        <div className="flex gap-1.5 sm:gap-2 shrink-0">
          {entries.length > 0 && planLimits.canExport && (
              <button
                onClick={() => { setShowExport(!showExport); setExportSelectedFruitIds([]); }}
                aria-label="Exportar PDF"
                className="px-2.5 sm:px-3 py-2 bg-idriel-dim hover:bg-idriel text-foreground rounded-md text-[10px] sm:text-xs font-montserrat font-bold uppercase tracking-wider transition-all shadow-[0_0_16px_hsl(var(--idriel)/0.4)] hover:shadow-[0_0_24px_hsl(var(--idriel)/0.6)] inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <FileDown className="w-3.5 h-3.5" strokeWidth={1.75} />
                <span className="hidden sm:inline">Exportar PDF</span>
                <span className="sm:hidden">PDF</span>
              </button>
          )}
          {entries.length > 0 && !planLimits.canExport && (
              <button
                disabled
                className="px-2.5 sm:px-3 py-2 bg-muted/30 text-muted-foreground rounded-md text-[10px] sm:text-xs font-montserrat font-bold uppercase tracking-wider transition-all cursor-not-allowed inline-flex items-center gap-1.5 whitespace-nowrap"
                title="Exportação disponível a partir do plano Raiz"
              >
                <Lock className="w-3 h-3" />
                <span className="hidden sm:inline">Exportar PDF</span>
                <span className="sm:hidden">PDF</span>
              </button>
          )}
          {/* Nova Entrada dropdown */}
          <div data-tour="codex-new-entry" className="relative">
            <button
              onClick={() => setShowCreate(!showCreate)}
              aria-label="Nova Entrada"
              className="px-2.5 sm:px-4 py-2 bg-gradient-to-r from-gold via-gold-warm to-gold-deep hover:from-gold-light hover:via-gold hover:to-gold-warm text-[#1a0f00] rounded-md text-[10px] sm:text-xs font-montserrat font-bold uppercase tracking-wider transition-all shadow-[0_0_12px_hsl(var(--gold)/0.35)] whitespace-nowrap"
            >
              <span className="hidden sm:inline">+ Nova Entrada</span>
              <span className="sm:hidden">+ Nova</span>
            </button>
            {showCreate && !createKind && !showImport && (
              <div
                className="absolute right-0 top-full mt-1 z-50 w-[240px] rounded-lg p-3 shadow-2xl border border-blue-bright/40 animate-fadeUp"
                style={{ background: 'hsl(var(--bg-deep) / 0.98)', backdropFilter: 'blur(16px)' }}
              >
                <h4 className="font-montserrat font-bold text-[10px] uppercase tracking-wider text-blue-light mb-2">Tipo de entrada</h4>
                {(() => {
                  const fichaCount = entries.filter(e => e.entry_type !== 'artigo').length;
                  const artigoCount = entries.filter(e => e.entry_type === 'artigo').length;
                  const fichaLimitReached = fichaCount >= planLimits.maxFichas;
                  const artigoLimitReached = artigoCount >= planLimits.maxArtigos;
                  return (
                    <>
                      <button
                        onClick={() => !fichaLimitReached && openCreate('ficha')}
                        disabled={fichaLimitReached}
                        className={`w-full text-left px-3 py-2 rounded-md transition-colors mb-1 ${fichaLimitReached ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-bright/10'}`}
                      >
                        <span className="font-montserrat font-bold text-xs text-foreground flex items-center gap-1.5"><ClipboardList className="w-3.5 h-3.5 text-gold-champagne" strokeWidth={1.75} />Ficha</span>
                        <span className="block mt-0.5 text-[10px] text-text-dim font-merriweather leading-snug">
                          {fichaLimitReached 
                            ? `Limite atingido (${fichaCount}/${planLimits.maxFichas}) — faça upgrade` 
                            : planLimits.maxFichas < Infinity 
                              ? `Com imagem, estruturada (${fichaCount}/${planLimits.maxFichas})`
                              : 'Com imagem, estruturada'}
                        </span>
                      </button>
                      <button
                        onClick={() => !artigoLimitReached && openCreate('artigo')}
                        disabled={artigoLimitReached}
                        className={`w-full text-left px-3 py-2 rounded-md transition-colors mb-1 ${artigoLimitReached ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-bright/10'}`}
                      >
                        <span className="font-montserrat font-bold text-xs text-foreground flex items-center gap-1.5"><PencilLine className="w-3.5 h-3.5 text-gold-champagne" strokeWidth={1.75} />Artigo</span>
                        <span className="block mt-0.5 text-[10px] text-text-dim font-merriweather leading-snug">
                          {artigoLimitReached 
                            ? `Limite atingido (${artigoCount}/${planLimits.maxArtigos}) — faça upgrade` 
                            : planLimits.maxArtigos < Infinity 
                              ? `Texto livre, explicativo (${artigoCount}/${planLimits.maxArtigos})`
                              : 'Texto livre, explicativo'}
                        </span>
                      </button>
                    </>
                  );
                })()}
                {worlds.filter(w => w.id !== worldId).length > 0 && (
                  <>
                    <div className="border-t border-blue-bright/15 my-2" />
                    <button
                      onClick={() => { setShowImport(true); }}
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-blue-bright/10 transition-colors"
                    >
                      <span className="font-montserrat font-bold text-xs text-foreground flex items-center gap-1.5"><Inbox className="w-3.5 h-3.5 text-gold-champagne" strokeWidth={1.75} />Importar de outro Mundo</span>
                      <span className="block mt-0.5 text-[10px] text-text-dim font-merriweather leading-snug">Copiar fichas ou artigos</span>
                    </button>
                  </>
                )}
                <div className="border-t border-blue-bright/15 my-2" />
                <button
                  onClick={() => { setShowIdrielImport(true); setShowCreate(false); }}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-blue-bright/10 transition-colors"
                >
                  <span className="font-montserrat font-bold text-xs text-foreground flex items-center gap-1.5"><Library className="w-3.5 h-3.5 text-gold-champagne" strokeWidth={1.75} />Importar com Idriel</span>
                  <span className="block mt-0.5 text-[10px] text-text-dim font-merriweather leading-snug">Extrair fichas/artigos de um PDF, DOCX ou texto (1 gota)</span>
                </button>
                <button onClick={resetCreate} className="absolute top-1 right-1 w-5 h-5 rounded-full text-text-dim hover:text-foreground flex items-center justify-center" aria-label="Fechar"><X className="w-3.5 h-3.5" strokeWidth={2} /></button>
              </div>
            )}
          </div>
        </div>
      </div>
      <p className="font-merriweather italic text-text-dim text-sm mb-4">Suas fichas, artigos e anotações organizados por fruto</p>

      {/* Toggle: Enciclopédia | Linha do Tempo */}
      <div className="mb-5 inline-flex rounded-full border border-gold/25 bg-[hsl(var(--background)/0.55)] backdrop-blur-md p-1">
        {([
          { key: 'encyclopedia', label: 'Enciclopédia', Icon: BookOpen },
          { key: 'timeline',     label: 'Linha do Tempo', Icon: Trees   },
        ] as const).map(opt => {
          const active = mode === opt.key;
          const Icon = opt.Icon;
          return (
            <button
              key={opt.key}
              onClick={() => setMode(opt.key)}
              className={`px-3 sm:px-4 py-1.5 rounded-full text-[11px] sm:text-xs font-montserrat font-bold uppercase tracking-wider transition-all inline-flex items-center gap-1.5 ${
                active
                  ? 'bg-gradient-to-r from-gold-deep via-gold-warm to-gold text-[#1a0f00] shadow-[0_0_14px_hsl(var(--gold)/0.45)]'
                  : 'text-text-dim hover:text-gold-champagne'
              }`}
            >
              <Icon className="w-3.5 h-3.5" strokeWidth={1.85} />{opt.label}
            </button>
          );
        })}
      </div>

      {mode === 'timeline' ? (
        <TimelineView worldId={worldId} codexEntries={entries} onOpenEntry={setPersistedExpandedId} />
      ) : (<>


      {/* Import panel */}
      {showImport && (
        <div className="card-glass rounded-lg p-4 sm:p-5 mb-6 animate-fadeUp border border-blue-bright/20">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-cinzel font-bold text-sm text-blue-light inline-flex items-center gap-2"><Inbox className="w-4 h-4" strokeWidth={1.75} />Importar de outro Mundo</h3>
            <button onClick={resetCreate} className="inline-flex items-center gap-1 text-[10px] text-text-dim font-montserrat hover:text-foreground"><X className="w-3 h-3" strokeWidth={2} />Fechar</button>
          </div>

          <div className="mb-4">
            <label className="block text-[10px] uppercase tracking-wider text-text-dim font-montserrat mb-1">Selecione o Mundo de origem</label>
            <Select value={importWorldId} onValueChange={handleSelectImportWorld}>
              <SelectTrigger className="w-full bg-background/60 border-blue-bright/20 text-sm font-merriweather">
                <SelectValue placeholder="Escolha um mundo…" />
              </SelectTrigger>
              <SelectContent>
                {worlds.filter(w => w.id !== worldId).map(w => (
                  <SelectItem key={w.id} value={w.id}><Globe className="inline-block w-3 h-3 mr-1.5 align-[-0.1em]" strokeWidth={1.75} />{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {importLoading && (
            <div className="text-center py-4">
              <div className="flex items-center justify-center gap-1">
                <span className="w-2 h-2 rounded-full bg-ring dot-bounce" />
                <span className="w-2 h-2 rounded-full bg-ring dot-bounce-2" />
                <span className="w-2 h-2 rounded-full bg-ring dot-bounce-3" />
              </div>
            </div>
          )}

          {importWorldId && !importLoading && importEntryList.length === 0 && (
            <p className="font-merriweather text-sm text-text-dim italic text-center py-4">Nenhuma entrada encontrada nesse mundo.</p>
          )}

          {importEntryList.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-wider text-text-dim font-montserrat font-bold">
                  {importEntryList.length} entrada(s) disponíveis
                </span>
                <button
                  onClick={() => setImportSelectedIds(importSelectedIds.length === importEntryList.length ? [] : importEntryList.map(e => e.id))}
                  className="text-[10px] text-blue-light font-montserrat font-bold hover:underline"
                >
                  {importSelectedIds.length === importEntryList.length ? 'Desmarcar tudo' : 'Selecionar tudo'}
                </button>
              </div>
              <div className="max-h-[250px] overflow-y-auto space-y-1.5 mb-4 pr-1">
                {importEntryList.map(e => {
                  const fruit = e.fruit_id !== null ? FRUITS.find(f => f.id === e.fruit_id) : null;
                  const selected = importSelectedIds.includes(e.id);
                  return (
                    <button
                      key={e.id}
                      onClick={() => setImportSelectedIds(prev => selected ? prev.filter(id => id !== e.id) : [...prev, e.id])}
                      className={`w-full text-left px-3 py-2 rounded-md border transition-colors flex items-center gap-2 ${
                        selected
                          ? 'border-ring/40 bg-primary/10'
                          : 'border-border hover:border-blue-bright/20'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center text-[10px] ${
                        selected ? 'bg-primary border-ring text-foreground' : 'border-border'
                      }`}>
                        {selected && <Check className="w-3 h-3" strokeWidth={2.5} />}
                      </span>
                      <span className="text-[10px] font-montserrat font-bold uppercase text-text-dim">
                        {e.entry_type === 'ficha' ? <ClipboardList className="w-3.5 h-3.5" strokeWidth={1.75} /> : <PencilLine className="w-3.5 h-3.5" strokeWidth={1.75} />}
                      </span>
                      {fruit && <span className="text-[10px]"><fruit.Icon className="inline-block w-3.5 h-3.5 align-[-0.15em] text-gold-champagne" strokeWidth={1.75} /></span>}
                      <span className="font-merriweather text-sm text-foreground truncate">{e.title}</span>
                    </button>
                  );
                })}
              </div>
              {importSelectedIds.length > 0 && (
                <button
                  onClick={handleImport}
                  className="px-4 py-2 bg-primary hover:bg-ring text-foreground rounded-md text-xs font-montserrat font-bold uppercase tracking-wider transition-colors"
                >
                  <><Inbox className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />Importar {importSelectedIds.length} entrada(s)</>
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Export panel */}
      {showExport && (
        <div className="card-glass-idriel rounded-lg p-4 mb-5 animate-fadeUp">
          <h3 className="font-cinzel font-bold text-sm mb-3 text-idriel-light inline-flex items-center gap-2"><FileDown className="w-4 h-4" strokeWidth={1.75} />Exportar Entradas em PDF</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
            <button
              onClick={() => { exportAllEntries(entries); setShowExport(false); }}
              className="px-4 py-2.5 bg-primary/20 hover:bg-primary/30 text-blue-light rounded-md text-[11px] font-montserrat font-bold uppercase tracking-wider transition-colors border border-ring/20 text-left"
            >
              <><Library className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />Exportar todas as entradas ({entries.length})</>
            </button>
            {filterFruits.length === 1 && (
              <button
                onClick={() => { exportFruitEntries(filterFruits[0], entries); setShowExport(false); }}
                className="px-4 py-2.5 bg-accent/15 hover:bg-accent/25 text-accent-foreground rounded-md text-[11px] font-montserrat font-bold uppercase tracking-wider transition-colors border border-accent/20 text-left"
              >
                <><Apple className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />Exportar de "{FRUITS.find(f => f.id === filterFruits[0])?.name}" ({entries.filter(e => e.fruit_id === filterFruits[0]).length})</>
              </button>
            )}
          </div>

          <div className="border-t border-border pt-3">
            <p className="text-[10px] uppercase tracking-wider text-text-dim font-montserrat font-bold mb-2">Selecionar frutos para exportar:</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {FRUITS.map(f => {
                const count = entries.filter(e => e.fruit_id === f.id).length;
                if (count === 0) return null;
                const selected = exportSelectedFruitIds.includes(f.id);
                return (
                  <button
                    key={f.id}
                    onClick={() => setExportSelectedFruitIds(prev => selected ? prev.filter(id => id !== f.id) : [...prev, f.id])}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-montserrat font-bold uppercase transition-colors ${
                      selected
                        ? 'bg-accent/20 text-accent-foreground border border-accent/40'
                        : 'text-text-dim border border-border hover:border-accent/20'
                    }`}
                  >
                    <f.Icon className="inline-block w-3.5 h-3.5 align-[-0.15em] text-gold-champagne" strokeWidth={1.75} /> {f.name} ({count})
                  </button>
                );
              })}
            </div>
            {exportSelectedFruitIds.length > 0 && (
              <button
                onClick={() => { exportSelectedFruits(exportSelectedFruitIds, entries); setShowExport(false); }}
                className="px-4 py-2 bg-accent/80 hover:bg-accent text-accent-foreground rounded-md text-[10px] font-montserrat font-bold uppercase tracking-wider transition-colors"
              >
                <><FileDown className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />Exportar {exportSelectedFruitIds.length} fruto(s) selecionado(s)</>
              </button>
            )}
          </div>

          <div className="flex justify-end mt-3">
            <button onClick={() => setShowExport(false)} className="text-[10px] text-text-dim font-montserrat hover:text-foreground transition-colors">Fechar</button>
          </div>
        </div>
      )}

      {/* Filters by fruit — retractable menu (popover desktop / sheet mobile) */}
      <FruitFilterMenu
        entries={entries}
        filterFruits={filterFruits}
        setFilterFruits={setFilterFruits}
      />

      {/* Create form (after choosing kind) */}
      {showCreate && createKind && (
        <div className="card-glass rounded-lg p-4 sm:p-5 mb-6 animate-fadeUp">
          <h3 className="font-cinzel font-bold text-sm text-blue-light mb-3">
            <>{createKind === 'ficha' ? <><ClipboardList className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />Nova Ficha</> : <><PencilLine className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />Novo Artigo</>}</>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-text-dim font-montserrat mb-1">Título</label>
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder={createKind === 'ficha' ? 'Nome da ficha…' : 'Título do artigo…'} className="w-full bg-[rgba(4,12,24,0.6)] border border-blue-bright/15 rounded-md px-3 py-2 text-sm text-foreground font-merriweather placeholder:italic placeholder:text-text-dim/70 focus:outline-none focus:border-ring/50" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-text-dim font-montserrat mb-1">Fruto</label>
              <select value={newFruit ?? ''} onChange={e => setNewFruit(e.target.value ? Number(e.target.value) : null)} className={`w-full bg-[rgba(4,12,24,0.6)] border rounded-md px-3 py-2 text-sm text-foreground font-merriweather focus:outline-none focus:border-ring/50 ${newFruit === null ? 'border-destructive/40' : 'border-blue-bright/15'}`}>
                <option value="">Selecione um fruto…</option>
                {FRUITS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          </div>

          {/* Image — only for ficha */}
          {createKind === 'ficha' && (
            <div className="mb-3">
              <label className="block text-[10px] uppercase tracking-wider text-text-dim font-montserrat mb-1">Imagem</label>
              {newImageUrl ? (
                <div className="relative w-full max-w-[300px] rounded-lg overflow-hidden border border-blue-bright/20">
                  <img src={newImageUrl} alt="" className="w-full h-[180px] object-cover" />
                  <button onClick={() => setNewImageUrl('')} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-foreground flex items-center justify-center hover:bg-destructive/80" aria-label="Remover"><X className="w-3.5 h-3.5" strokeWidth={2} /></button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input type="file" ref={fileRef} accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, setNewImageUrl); }} />
                  <button onClick={() => fileRef.current?.click()} disabled={uploading} className="px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground rounded-md text-[10px] font-montserrat font-bold uppercase tracking-wider disabled:opacity-40 transition-colors">
                    <>{uploading ? <><Loader2 className="inline-block w-3.5 h-3.5 mr-1.5 animate-spin align-[-0.15em]" strokeWidth={2} />Enviando…</> : <><FolderUp className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />Upload</>}</>
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="mb-3">
            <label className="block text-[10px] uppercase tracking-wider text-text-dim font-montserrat mb-1">Conteúdo</label>
            <div className="border border-blue-bright/15 rounded-md overflow-hidden bg-[rgba(4,12,24,0.6)]">
              <RichTextEditor
                entries={entries}
                value={newContent}
                onChange={setNewContent}
                placeholder={createKind === 'artigo' ? 'Escreva livremente seu artigo… Use @ para mencionar entradas.' : 'Descreva livremente… Use @ para mencionar entradas.'}
                minHeight={createKind === 'artigo' ? '260px' : '180px'}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={!newTitle.trim() || newFruit === null} className="px-4 py-2 bg-primary hover:bg-ring text-foreground rounded-md text-xs font-montserrat font-bold uppercase tracking-wider disabled:opacity-40 transition-colors">
              {createKind === 'ficha' ? 'Criar Ficha' : 'Criar Artigo'}
            </button>
            <button onClick={resetCreate} className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground rounded-md text-xs font-montserrat font-bold uppercase tracking-wider transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Entries grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="flex items-center justify-center gap-1">
            <span className="w-2 h-2 rounded-full bg-ring dot-bounce" />
            <span className="w-2 h-2 rounded-full bg-ring dot-bounce-2" />
            <span className="w-2 h-2 rounded-full bg-ring dot-bounce-3" />
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-bright/10 flex items-center justify-center">
            <span className="inline-flex">{entries.length === 0 ? <BookOpen className="w-8 h-8 text-gold-champagne opacity-60" strokeWidth={1.5} /> : <Search className="w-8 h-8 text-gold-champagne opacity-60" strokeWidth={1.5} />}</span>
          </div>
          {entries.length === 0 ? (
            <>
              <h3 className="font-cinzel font-bold text-lg text-foreground mb-2">Seu Codex está vazio</h3>
              <p className="font-merriweather text-sm text-text-dim mb-4 max-w-md mx-auto">
                Crie fichas de personagens, locais e artefatos, ou artigos de lore e história do seu mundo.
              </p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => openCreate('ficha')}
                  className="px-4 py-2 rounded-md text-xs font-montserrat font-bold uppercase tracking-wider border border-blue-bright/30 text-blue-light bg-blue-bright/[0.08] hover:bg-blue-bright/[0.18] transition-all">
                  <><ClipboardList className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />Criar primeira Ficha</>
                </button>
                <button onClick={() => openCreate('artigo')}
                  className="px-4 py-2 rounded-md text-xs font-montserrat font-bold uppercase tracking-wider border border-gold/30 text-gold-light bg-gold/[0.08] hover:bg-gold/[0.18] transition-all">
                  <><PencilLine className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />Criar primeiro Artigo</>
                </button>
              </div>
            </>
          ) : (
            <>
              <h3 className="font-cinzel font-bold text-lg text-foreground mb-2">Nenhuma entrada encontrada</h3>
              <p className="font-merriweather text-sm text-text-dim">Tente ajustar o filtro ou crie uma nova entrada.</p>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Fichas section */}
          {filtered.some(e => e.entry_type === 'ficha') && (
            <div className="mb-8">
              <h2 className="font-cinzel font-bold text-base text-blue-light mb-3 flex items-center gap-2">
                <span className="w-8 h-[2px] bg-gradient-to-r from-ring to-transparent" />
                <ClipboardList className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />Fichas
                <span className="text-[10px] font-montserrat font-bold text-text-dim uppercase">({filtered.filter(e => e.entry_type === 'ficha').length})</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.filter(e => e.entry_type === 'ficha').map(entry => (
                  <CodexCard
                    key={entry.id}
                    entry={entry}
                    expanded={false}
                    onToggle={() => setPersistedExpandedId(entry.id)}
                    onUpdate={updateEntry}
                    onDelete={deleteEntry}
                    onImageUpload={uploadImage}
                    onLightbox={setLightbox}
                    gallery={gallery}
                    siblings={entries}
                    onOpenEntry={setPersistedExpandedId}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Artigos section */}
          {filtered.some(e => e.entry_type === 'artigo') && (
            <div className="mb-8">
              <h2 className="font-cinzel font-bold text-base text-gold mb-3 flex items-center gap-2">
                <span className="w-8 h-[2px] bg-gradient-to-r from-gold to-transparent" />
                <PencilLine className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />Artigos
                <span className="text-[10px] font-montserrat font-bold text-text-dim uppercase">({filtered.filter(e => e.entry_type === 'artigo').length})</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.filter(e => e.entry_type === 'artigo').map(entry => (
                  <CodexCard
                    key={entry.id}
                    entry={entry}
                    expanded={false}
                    onToggle={() => setPersistedExpandedId(entry.id)}
                    onUpdate={updateEntry}
                    onDelete={deleteEntry}
                    onImageUpload={uploadImage}
                    onLightbox={setLightbox}
                    gallery={gallery}
                    siblings={entries}
                    onOpenEntry={setPersistedExpandedId}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Expanded card — custom isolated layer so drag/click events never reach the page behind it */}
          {expandedEntry && createPortal(
            <ExpandedCodexOverlay
              entry={expandedEntry}
              prevEntry={prevEntry}
              nextEntry={nextEntry}
              navIndex={navIndex}
              navTotal={navList.length}
              onClose={() => setPersistedExpandedId(null)}
              onGoPrev={prevEntry ? () => setPersistedExpandedId(prevEntry.id) : undefined}
              onGoNext={nextEntry ? () => setPersistedExpandedId(nextEntry.id) : undefined}
              onUpdate={updateEntry}
              onDelete={async (id) => { await deleteEntry(id); setPersistedExpandedId(null); }}
              onImageUpload={uploadImage}
              onLightbox={setLightbox}
              gallery={gallery}
              siblings={entries}
              onOpenEntry={setPersistedExpandedId}
              contentHydrated={isContentHydrated(expandedEntry.id)}
            />,
            document.body
          )}
        </>
      )}

      {/* Analyze World — bottom CTA */}
      {entries.length > 0 && (
        <div className="mt-10 mb-4">
          {!showAnalysis ? (
            <button
              onClick={() => setShowAnalysis(true)}
              className="consult-idriel-cta group relative w-full rounded-2xl px-6 py-6 sm:px-8 sm:py-7 flex items-center gap-5 text-left"
            >
              {/* Avatar with pulsing halo */}
              <div className="relative shrink-0">
                <div className="absolute inset-0 -m-2 rounded-full bg-gold-warm/30 blur-xl opacity-60 group-hover:opacity-100 transition-opacity animate-idriel-pulse" />
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 border-gold-warm/50 shadow-[0_0_24px_hsl(var(--gold-warm)/0.35)]">
                  <img src={idrielAvatar} alt="Idriel" className="w-full h-full object-cover object-top" />
                </div>
              </div>

              {/* Copy */}
              <div className="relative flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Trees className="w-3.5 h-3.5 text-gold-champagne" strokeWidth={1.75} />
                  <span className="text-[10px] font-montserrat font-bold uppercase tracking-[0.22em] text-gold-champagne/80">
                    Ritual da Guardiã
                  </span>
                </div>
                <h3 className="font-cinzel font-bold text-lg sm:text-xl leading-tight bg-gradient-to-r from-gold-champagne via-gold-light to-gold-champagne bg-clip-text text-transparent">
                  Consultar Idriel
                </h3>
                <p className="mt-1.5 font-merriweather italic text-xs sm:text-[13px] text-foreground/75 leading-relaxed max-w-xl">
                  Peça à sábia guardiã para avaliar suas entradas e iluminar os próximos passos da sua criação.
                </p>
              </div>

              {/* Trailing arrow chevron */}
              <div className="hidden sm:flex relative shrink-0 w-10 h-10 rounded-full border border-gold-warm/40 items-center justify-center text-gold-champagne group-hover:border-gold-champagne/70 group-hover:text-gold-light group-hover:translate-x-0.5 transition-all">
                <ChevronRight className="w-4 h-4" strokeWidth={2} />
              </div>
            </button>
          ) : (
            <CodexAnalysis entries={entries} worldId={worldId} onClose={() => setShowAnalysis(false)} />
          )}
        </div>
      )}

      {lightbox && <ImageLightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />}

      <IdrielImportDialog
        open={showIdrielImport}
        onOpenChange={setShowIdrielImport}
        worldId={worldId}
        existingEntries={entries.map(e => ({ id: e.id, title: e.title, fruit_id: e.fruit_id ?? null }))}
        remaining={(() => {
          const fichaCount = entries.filter(e => e.entry_type !== 'artigo').length;
          const artigoCount = entries.filter(e => e.entry_type === 'artigo').length;
          const fichaSlots = Math.max(0, planLimits.maxFichas - fichaCount);
          const artigoSlots = Math.max(0, planLimits.maxArtigos - artigoCount);
          const total = fichaSlots + artigoSlots;
          return Number.isFinite(total) ? total : 999;
        })()}
        canCreateMore={() => {
          const fichaCount = entries.filter(e => e.entry_type !== 'artigo').length;
          const artigoCount = entries.filter(e => e.entry_type === 'artigo').length;
          return fichaCount < planLimits.maxFichas || artigoCount < planLimits.maxArtigos;
        }}
        onCreate={async (items) => {
          const created: Array<{ id: string; title: string; fruit_id?: number | null }> = [];
          for (const it of items) {
            const res = await createEntry({
              title: it.title,
              content: it.content,
              entry_type: it.entry_type,
              fruit_id: it.fruit_id,
            });
            if (res) created.push({ id: res.id, title: res.title, fruit_id: res.fruit_id });
          }
          return created;
        }}
      />

    </div>
  );
};

// ---------- Fruit Filter Menu (retractable) ----------
type FruitFilterMenuProps = {
  entries: CodexEntry[];
  filterFruits: number[];
  setFilterFruits: React.Dispatch<React.SetStateAction<number[]>>;
};

const FruitFilterMenu: React.FC<FruitFilterMenuProps> = ({ entries, filterFruits, setFilterFruits }) => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const toggle = (id: number) =>
    setFilterFruits(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const activeCount = filterFruits.length;

  const Trigger = (
    <button
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-montserrat font-bold uppercase tracking-wider border transition-all ${
        activeCount > 0
          ? 'bg-primary/15 text-blue-light border-ring/40 shadow-[0_0_18px_-8px_hsl(var(--ring)/0.6)]'
          : 'text-text-dim border-border hover:border-ring/25 hover:text-foreground'
      }`}
    >
      <SlidersHorizontal className="w-3.5 h-3.5" strokeWidth={1.75} />
      Filtrar
      {activeCount > 0 && (
        <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-ring/25 text-blue-light text-[10px] font-bold">
          {activeCount}
        </span>
      )}
    </button>
  );

  const Grid = (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {FRUITS.map(f => {
        const count = entries.filter(e => e.fruit_id === f.id).length;
        const active = filterFruits.includes(f.id);
        return (
          <button
            key={f.id}
            onClick={() => toggle(f.id)}
            className={`group flex items-center gap-2 px-3 py-2 rounded-lg text-left text-[11px] font-montserrat font-bold border transition-all ${
              active
                ? 'bg-primary/15 text-blue-light border-ring/40 shadow-[0_0_18px_-10px_hsl(var(--ring)/0.7)]'
                : 'bg-[rgba(4,12,24,0.4)] text-text-dim border-border hover:border-ring/25 hover:text-foreground'
            }`}
          >
            <f.Icon className={`w-4 h-4 shrink-0 ${active ? 'text-gold-light' : 'text-gold-champagne'}`} strokeWidth={1.75} />
            <span className="truncate flex-1">{f.name}</span>
            <span className={`text-[10px] tabular-nums ${active ? 'text-blue-light/80' : 'text-text-dim/70'}`}>{count}</span>
            {active && <Check className="w-3 h-3 text-blue-light" strokeWidth={2.5} />}
          </button>
        );
      })}
    </div>
  );

  const Footer = (
    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/60">
      <span className="text-[10px] uppercase tracking-wider text-text-dim font-montserrat">
        {activeCount === 0 ? 'Nenhum filtro' : `${activeCount} fruto${activeCount > 1 ? 's' : ''} ativo${activeCount > 1 ? 's' : ''}`}
      </span>
      <div className="flex gap-2">
        {activeCount > 0 && (
          <button
            onClick={() => setFilterFruits([])}
            className="px-3 py-1.5 rounded-md text-[10px] font-montserrat font-bold uppercase tracking-wider text-text-dim hover:text-foreground border border-border hover:border-ring/25 transition-colors"
          >
            <X className="inline-block w-3 h-3 mr-1 align-[-0.1em]" strokeWidth={2} />Limpar
          </button>
        )}
        <button
          onClick={() => setOpen(false)}
          className="px-3 py-1.5 rounded-md text-[10px] font-montserrat font-bold uppercase tracking-wider bg-primary/80 hover:bg-primary text-foreground transition-colors"
        >
          Aplicar
        </button>
      </div>
    </div>
  );

  const ActiveChips = (
    <AnimatePresence initial={false}>
      {activeCount > 0 && (
        <motion.div
          key="active-chips"
          initial={{ opacity: 0, y: -4, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -4, height: 0 }}
          transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
          className="overflow-hidden"
        >
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <AnimatePresence initial={false}>
              {filterFruits.map(id => {
                const f = FRUITS.find(x => x.id === id);
                if (!f) return null;
                return (
                  <motion.button
                    key={id}
                    layout
                    initial={{ opacity: 0, scale: 0.85, y: -2 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.85, y: -2 }}
                    transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
                    onClick={() => toggle(id)}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-montserrat font-bold bg-primary/15 text-blue-light border border-ring/40 hover:bg-primary/25 transition-colors"
                  >
                    <f.Icon className="w-3 h-3 text-gold-light" strokeWidth={1.75} />
                    {f.name}
                    <X className="w-3 h-3 opacity-70" strokeWidth={2} />
                  </motion.button>
                );
              })}
            </AnimatePresence>
            <motion.button
              layout
              onClick={() => setFilterFruits([])}
              className="text-[10px] text-text-dim hover:text-foreground font-montserrat underline underline-offset-2 ml-1"
            >
              limpar tudo
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );


  return (
    <div className="mb-6">
      {isMobile ? (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>{Trigger}</SheetTrigger>
          <SheetContent
            side="bottom"
            className="border-t border-border/60 rounded-t-2xl max-h-[85vh] overflow-y-auto bg-[hsl(214_60%_5%/0.95)] backdrop-blur-xl"
          >
            <SheetHeader>
              <SheetTitle className="font-cinzel text-base text-blue-light">Filtrar por Fruto</SheetTitle>
            </SheetHeader>
            <div className="mt-4">{Grid}</div>
            {Footer}
          </SheetContent>
        </Sheet>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>{Trigger}</PopoverTrigger>
          <PopoverContent
            align="start"
            sideOffset={8}
            className="w-[min(560px,90vw)] p-4 border-border/60 rounded-xl bg-[hsl(214_60%_5%/0.95)] backdrop-blur-xl"
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-cinzel font-bold text-sm text-blue-light">Filtrar por Fruto</h4>
              <span className="text-[10px] uppercase tracking-wider text-text-dim font-montserrat">
                {FRUITS.length} frutos
              </span>
            </div>
            {Grid}
            {Footer}
          </PopoverContent>
        </Popover>
      )}
      {ActiveChips}
    </div>
  );
};


