import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  LayoutGrid, ChevronRight, ChevronDown, X, Upload,
} from 'lucide-react';
import { ImportManuscriptDialog } from '@/components/ImportManuscriptDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { FRUITS } from '@/lib/data';
import type { WorldRecord } from '@/hooks/useWorlds';
import { MuralMode } from '@/components/escritor/MuralMode';
import { DebouncedTextarea } from '@/components/escritor/DebouncedTextarea';
import { ChapterEditor } from '@/components/escritor/ChapterEditor';
import { RichTextView } from '@/components/editor/RichTextEditor';
import { PomodoroTimer } from '@/components/PomodoroTimer';
import { ManuscriptExportMenu } from '@/components/ManuscriptExportMenu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

// ── Main Component ──
export const TabEscrever: React.FC<Props> = ({ worldId, worlds }) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const {
    manuscripts, activeManuscript, setActiveManuscript,
    chapters, scenes, totalWordCount,
    createManuscript, updateManuscript, deleteManuscript,
    createChapter, updateChapter, deleteChapter,
    refetch: refetchManuscripts,
  } = useManuscript(worldId);
  const { entries, fetchEntryContent, isContentHydrated } = useCodexEntries(worldId);

  const [writeMode, setWriteMode] = useState<WriteMode>('manuscrito');
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  // Default closed: keeps the editor DOM lean and snappy on first paint.
  const [showRefPanel, setShowRefPanel] = useState(false);
  const [showNotes, setShowNotes] = useState<string | null>(null);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [newManuscriptName, setNewManuscriptName] = useState('');
  const [zenMode, setZenMode] = useState(false);
  // Selected reference (when a chip is clicked) — shows in the right panel as a card.
  const [previewEntry, setPreviewEntry] = useState<CodexEntry | null>(null);
  const titleSaveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeChapter = useMemo(() => chapters.find(c => c.id === activeChapterId), [chapters, activeChapterId]);

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

  useEffect(() => () => {
    if (titleSaveTimerRef.current) clearTimeout(titleSaveTimerRef.current);
  }, []);

  const handleManuscriptTitleChange = (next: string) => {
    setManuscriptTitleLocal(next);
    if (!activeManuscript) return;
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
      <div className={`flex items-center gap-3 mb-4 flex-wrap transition-opacity duration-300 ${zenMode ? 'opacity-0 hover:opacity-100 h-0 overflow-hidden hover:h-auto hover:overflow-visible' : ''}`}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <PenLine className="w-4 h-4 text-blue-light shrink-0" />
          {/* Manuscript title (editável) + switcher */}
          <input
            value={manuscriptTitleLocal}
            onChange={e => handleManuscriptTitleChange(e.target.value)}
            aria-label="Nome do manuscrito"
            className="bg-transparent font-cinzel font-bold text-lg text-foreground border-none focus:outline-none focus:ring-1 focus:ring-blue-bright/40 rounded px-1 min-w-0 max-w-[260px] cursor-text"
            placeholder="Título do manuscrito"
          />
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Trocar manuscrito"
              className="group inline-flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-md bg-blue-bright/10 hover:bg-blue-bright/20 border border-blue-bright/30 hover:border-blue-bright/50 text-blue-light hover:text-blue-bright transition-all shrink-0 shadow-sm"
              title="Trocar manuscrito"
            >
              <span className="text-[10px] font-montserrat font-bold uppercase tracking-wider">Trocar</span>
              <ChevronDown className="w-3.5 h-3.5 transition-transform group-data-[state=open]:rotate-180" />
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

        {/* Dialog: criar novo manuscrito (precisa estar montado também quando já há um ativo) */}
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

        <div className="flex items-center gap-1 shrink-0">
          {/* Mode switcher */}
          <div data-tour="write-modes" className="flex items-center bg-white/[0.03] rounded-md border border-blue-bright/10 p-0.5">
            {(Object.entries(WRITE_MODE_INFO) as [WriteMode, typeof WRITE_MODE_INFO[WriteMode]][]).map(([key, m]) => (
              <div key={key} className="relative group">
                <button onClick={() => setWriteMode(key)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-[11px] font-montserrat font-bold uppercase tracking-wider transition-all ${
                    writeMode === key ? 'bg-blue-bright/20 text-blue-light' : 'text-text-dim hover:text-foreground'
                  }`}>
                  <m.icon className="w-3.5 h-3.5" />
                  {!isMobile && m.label}
                </button>
                {/* Tooltip */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 p-3 rounded-lg bg-[hsl(var(--bg-deep))] border border-blue-bright/20 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                  <p className="font-montserrat font-bold text-xs text-blue-light mb-1">{m.label}</p>
                  <p className="font-merriweather text-[11px] text-text-secondary leading-relaxed">{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <PomodoroTimer className="ml-2" />
          <span className="text-[10px] font-mono text-text-dim bg-white/[0.03] px-2 py-1 rounded border border-blue-bright/10 ml-1">
            {totalWordCount.toLocaleString()} palavras
          </span>
          <ImportManuscriptDialog
            worldId={worldId}
            onImported={async ({ id }) => {
              await refetchManuscripts();
              // Try to activate the newly imported manuscript once list refreshes.
              const { data } = await supabase.from('manuscripts').select('*').eq('id', id).maybeSingle();
              if (data) setActiveManuscript(data as typeof activeManuscript);
            }}
            trigger={
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-[11px] font-montserrat font-bold uppercase tracking-wider border-emerald-400/40 text-emerald-300 hover:text-emerald-200 hover:bg-emerald-500/10 hover:border-emerald-400/60"
                title="Importar manuscrito de PDF, DOCX, TXT ou EPUB"
              >
                <Upload className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Importar</span>
              </Button>
            }
          />
          <ManuscriptExportMenu manuscript={activeManuscript} chapters={chapters} scenes={scenes} />
        </div>
      </div>

      {/* ── STORYLINE / MURAL MODE (lazy) ── */}
      {writeMode === 'mural' && <MuralMode worldId={worldId} manuscripts={manuscripts} />}

      {/* ── MANUSCRIPT MODE ── */}
      {writeMode === 'manuscrito' && (
        <div className={`flex gap-3 min-h-[400px] transition-all duration-300 ${zenMode ? 'h-[calc(100vh-100px)]' : 'h-[calc(100vh-220px)]'}`}>
          {/* LEFT: Chapter list */}
          {!zenMode && (
          <div className={`${isMobile ? 'w-full' : 'w-[220px]'} shrink-0 flex flex-col bg-white/[0.02] rounded-lg border border-blue-bright/10 ${isMobile && activeChapterId ? 'hidden' : ''}`}>
            <div className="p-2 border-b border-blue-bright/10 flex items-center justify-between">
              <span className="text-[10px] font-montserrat uppercase tracking-widest text-text-dim">Capítulos</span>
              <button onClick={async () => { const ch = await createChapter(); if (ch) setActiveChapterId(ch.id); }}
                className="p-1 rounded hover:bg-blue-bright/10 text-blue-light" title="Novo capítulo">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-1.5 space-y-0.5">
                {chapters.map((ch) => (
                  <div key={ch.id} className="flex items-center group">
                    <button onClick={() => setActiveChapterId(ch.id)}
                      className={`flex-1 min-w-0 text-left px-2 py-1.5 rounded text-xs font-montserrat font-bold truncate transition-colors ${
                        activeChapterId === ch.id ? 'bg-blue-bright/15 text-blue-light' : 'text-foreground/80 hover:text-foreground hover:bg-white/[0.03]'
                      }`}>
                      <FileText className="w-3 h-3 inline mr-1.5 opacity-50" />{ch.title}
                    </button>
                    <span className="text-[9px] text-text-dim/50 mr-1">{ch.word_count || 0}</span>
                    <button onClick={() => setShowNotes(showNotes === ch.id ? null : ch.id)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-text-dim hover:text-gold-light transition-all" title="Notas">
                      <StickyNote className="w-3 h-3" />
                    </button>
                    <ConfirmDialog
                      trigger={
                        <button aria-label="Excluir capítulo" className="opacity-0 group-hover:opacity-100 p-0.5 text-text-dim hover:text-red-alert transition-all" title="Excluir capítulo">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      }
                      title="Excluir capítulo"
                      description={`Tem certeza que deseja excluir "${ch.title}"? O conteúdo será perdido permanentemente.`}
                      confirmLabel="Excluir"
                      onConfirm={() => { deleteChapter(ch.id); if (activeChapterId === ch.id) setActiveChapterId(null); }}
                    />
                  </div>
                ))}
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
    </div>
  );
};
