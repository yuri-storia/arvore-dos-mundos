import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useManuscript, type Chapter, type Scene } from '@/hooks/useManuscript';
import { useStorylines } from '@/hooks/useStorylines';
import { useCodexEntries, type CodexEntry } from '@/hooks/useCodexEntries';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Plus, Trash2, FileText, BookOpen,
  PanelRightOpen, PanelRightClose, StickyNote, Search, BookMarked, PenLine,
  LayoutGrid, Maximize, Minimize, ChevronRight, ChevronDown, Eye, Edit3, X,
} from 'lucide-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { FRUITS } from '@/lib/data';
import type { WorldRecord } from '@/hooks/useWorlds';
import { KanbanBoard } from '@/components/escritor/KanbanBoard';
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
const ReferencePanel: React.FC<{ entries: CodexEntry[]; onPreview: (entry: CodexEntry) => void }> = ({ entries, onPreview }) => {
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
                    {fruit && <span className="text-[9px] text-text-dim ml-1.5">{fruit.icon}</span>}
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
};

// ── Mention Popup ──
const MentionPopup: React.FC<{
  entries: CodexEntry[];
  query: string;
  position: { top: number; left: number };
  onSelect: (name: string) => void;
  onClose: () => void;
}> = ({ entries, query, position, onSelect, onClose }) => {
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return entries.filter(e => e.title.toLowerCase().includes(q)).slice(0, 8);
  }, [entries, query]);
  if (filtered.length === 0) return null;

  return (
    <div className="absolute z-50 bg-[#0d1520] border border-blue-bright/20 rounded-lg shadow-xl py-1 min-w-[200px] max-w-[280px]"
      style={{ top: position.top, left: position.left }}>
      {filtered.map(e => (
        <button key={e.id} onClick={() => { onSelect(e.title); onClose(); }}
          className="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-bright/10 transition-colors flex items-center gap-2">
          <span className={e.entry_type === 'ficha' ? 'text-blue-light' : 'text-gold-light'}>{e.title}</span>
          <span className="text-[9px] text-text-dim">{e.entry_type}</span>
        </button>
      ))}
    </div>
  );
};

// ── Content Preview with clickable @reference chips ──
const ContentPreview: React.FC<{
  content: string;
  entries: CodexEntry[];
  onChipClick: (entry: CodexEntry) => void;
}> = ({ content, entries, onChipClick }) => {
  const entriesByName = useMemo(() => {
    const map = new Map<string, CodexEntry>();
    entries.forEach(e => map.set(e.title.toLowerCase(), e));
    return map;
  }, [entries]);

  // Tokenize content into text + @mentions
  const parts = useMemo(() => {
    const out: Array<{ type: 'text' | 'mention'; value: string; entry?: CodexEntry }> = [];
    const regex = /@([A-Za-zÀ-ÿ0-9_\-]+(?:\s[A-Za-zÀ-ÿ0-9_\-]+)?)/g;
    let lastIdx = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIdx) out.push({ type: 'text', value: content.slice(lastIdx, match.index) });
      const name = match[1];
      const entry = entriesByName.get(name.toLowerCase());
      out.push({ type: 'mention', value: name, entry });
      lastIdx = match.index + match[0].length;
    }
    if (lastIdx < content.length) out.push({ type: 'text', value: content.slice(lastIdx) });
    return out;
  }, [content, entriesByName]);

  return (
    <div className="w-full h-full overflow-y-auto p-4 font-merriweather text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
      {parts.map((p, i) => {
        if (p.type === 'text') return <span key={i}>{p.value}</span>;
        if (p.entry) {
          const isFicha = p.entry.entry_type === 'ficha';
          return (
            <button
              key={i}
              onClick={() => onChipClick(p.entry!)}
              className={`inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded text-[12px] font-montserrat font-bold transition-colors ${
                isFicha
                  ? 'bg-blue-bright/15 text-blue-light hover:bg-blue-bright/25'
                  : 'bg-gold/15 text-gold-light hover:bg-gold/25'
              }`}
            >
              @{p.value}
            </button>
          );
        }
        return (
          <span key={i} className="text-text-dim/60 italic" title="Referência não encontrada no Codex">
            @{p.value}
          </span>
        );
      })}
      {parts.length === 0 && <span className="text-text-dim/40 italic">Nada escrito ainda.</span>}
    </div>
  );
};

// ── Entry Preview Panel (right side, shown when a chip is clicked) ──
const EntryPreviewPanel: React.FC<{
  entry: CodexEntry;
  onClose: () => void;
}> = ({ entry, onClose }) => {
  const fruit = FRUITS.find(f => f.id === entry.fruit_id);
  const isFicha = entry.entry_type === 'ficha';
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-blue-bright/10 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[9px] font-montserrat uppercase tracking-widest text-text-dim mb-0.5">
            {isFicha ? 'Ficha' : 'Artigo'}{fruit ? ` · ${fruit.icon} ${fruit.name}` : ''}
          </p>
          <h3 className={`font-cinzel font-bold text-sm truncate ${isFicha ? 'text-blue-light' : 'text-gold-light'}`}>
            {entry.title}
          </h3>
        </div>
        <button onClick={onClose} className="p-1 text-text-dim hover:text-foreground" title="Fechar">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {entry.image_url && (
        <img src={entry.image_url} alt={entry.title} className="w-full h-[120px] object-cover" />
      )}
      <ScrollArea className="flex-1">
        <div className="p-3 text-xs text-foreground/85 font-merriweather leading-relaxed whitespace-pre-wrap">
          {entry.content || <span className="italic text-text-dim">Sem conteúdo.</span>}
        </div>
      </ScrollArea>
    </div>
  );
};

// ── Main Component ──
export const TabEscrever: React.FC<Props> = ({ worldId, worlds }) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const {
    manuscripts, activeManuscript, setActiveManuscript,
    chapters, scenes, totalWordCount,
    createManuscript, updateManuscript, deleteManuscript,
    createChapter, updateChapter, deleteChapter,
    createScene, updateScene, deleteScene,
  } = useManuscript(worldId);
  const { entries } = useCodexEntries(worldId);
  const storylineState = useStorylines(worldId);

  const [writeMode, setWriteMode] = useState<WriteMode>('manuscrito');
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [showRefPanel, setShowRefPanel] = useState(!isMobile);
  const [showNotes, setShowNotes] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [editingTitle, setEditingTitle] = useState('');
  const [mentionState, setMentionState] = useState<{ active: boolean; query: string; pos: { top: number; left: number } }>({ active: false, query: '', pos: { top: 0, left: 0 } });
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [newManuscriptName, setNewManuscriptName] = useState('');
  const [zenMode, setZenMode] = useState(false);
  // Preview-mode toggle: when true, content renders chips for @references; when false, raw textarea.
  const [previewMode, setPreviewMode] = useState(false);
  // Currently-selected reference (when a chip is clicked) — shows in the right panel as a card.
  const [previewEntry, setPreviewEntry] = useState<CodexEntry | null>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeChapter = useMemo(() => chapters.find(c => c.id === activeChapterId), [chapters, activeChapterId]);

  useEffect(() => {
    if (activeChapter) {
      setEditingContent(activeChapter.content || '');
      setEditingTitle(activeChapter.title);
    }
  }, [activeChapterId]); // eslint-disable-line

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && zenMode) setZenMode(false); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [zenMode]);

  const debouncedSave = useCallback((id: string, content: string) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => updateChapter(id, { content }), 1500);
  }, [updateChapter]);

  const handleContentChange = (value: string) => {
    setEditingContent(value);
    if (activeChapterId) debouncedSave(activeChapterId, value);
    const textarea = editorRef.current;
    if (!textarea) return;
    const cursor = textarea.selectionStart;
    const textBefore = value.substring(0, cursor);
    const atMatch = textBefore.match(/@(\w*)$/);
    if (atMatch) setMentionState({ active: true, query: atMatch[1], pos: { top: 40, left: 20 } });
    else setMentionState(prev => ({ ...prev, active: false }));
  };

  const handleMentionSelect = (name: string) => {
    if (!editorRef.current) return;
    const textarea = editorRef.current;
    const cursor = textarea.selectionStart;
    const textBefore = editingContent.substring(0, cursor);
    const atIdx = textBefore.lastIndexOf('@');
    const newContent = editingContent.substring(0, atIdx) + `@${name}` + editingContent.substring(cursor);
    setEditingContent(newContent);
    if (activeChapterId) debouncedSave(activeChapterId, newContent);
    setMentionState(prev => ({ ...prev, active: false }));
    setTimeout(() => { textarea.focus(); const newPos = atIdx + name.length + 1; textarea.setSelectionRange(newPos, newPos); }, 0);
  };

  const handleInsertMentionFromPanel = (name: string) => {
    if (!editorRef.current || !activeChapterId) return;
    const textarea = editorRef.current;
    const cursor = textarea.selectionStart;
    const newContent = editingContent.substring(0, cursor) + `@${name} ` + editingContent.substring(cursor);
    setEditingContent(newContent);
    debouncedSave(activeChapterId, newContent);
    setTimeout(() => textarea.focus(), 0);
  };

  const handleChapterTitleSave = () => {
    if (activeChapterId && editingTitle.trim()) updateChapter(activeChapterId, { title: editingTitle.trim() });
  };

  const handleCreateManuscriptWithName = async () => {
    const name = newManuscriptName.trim() || 'Sem título';
    await createManuscript(name);
    setShowNamePrompt(false);
    setNewManuscriptName('');
  };

  const chapterWordCount = editingContent.trim() ? editingContent.trim().split(/\s+/).length : 0;

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

        <Button data-tour="create-manuscript" onClick={() => setShowNamePrompt(true)} className="bg-blue-bright/20 text-blue-light border border-blue-bright/30 hover:bg-blue-bright/30">
          <Plus className="w-4 h-4 mr-1" /> Criar Manuscrito
        </Button>

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
          {/* Manuscript switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1.5 min-w-0 group">
              <input
                value={activeManuscript.title}
                onChange={e => updateManuscript(activeManuscript.id, { title: e.target.value })}
                onClick={e => e.stopPropagation()}
                className="bg-transparent font-cinzel font-bold text-lg text-foreground border-none focus:outline-none min-w-0 max-w-[260px] cursor-text"
                placeholder="Título do manuscrito"
              />
              <ChevronDown className="w-3.5 h-3.5 text-text-dim group-hover:text-foreground transition-colors shrink-0" />
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
          <ManuscriptExportMenu manuscript={activeManuscript} chapters={chapters} scenes={scenes} />
        </div>
      </div>

      {/* ── STORYLINE / MURAL MODE ── */}
      {writeMode === 'mural' && (
        <div className="h-[calc(100vh-220px)] min-h-[400px] bg-white/[0.02] rounded-lg border border-blue-bright/10">
          <KanbanBoard
            storylines={storylineState.storylines}
            activeStoryline={storylineState.activeStoryline}
            setActiveStoryline={storylineState.setActiveStoryline}
            columns={storylineState.columns}
            onCreateStoryline={() => storylineState.createStoryline('Nova storyline')}
            onRenameStoryline={(id, name) => storylineState.updateStoryline(id, { name })}
            onDeleteStoryline={storylineState.deleteStoryline}
            onCreateColumn={() => storylineState.createColumn('Nova coluna')}
            onUpdateColumn={storylineState.updateColumn}
            onDeleteColumn={storylineState.deleteColumn}
            onLinkManuscript={(id, mid) => storylineState.updateStoryline(id, { manuscript_id: mid })}
            manuscripts={manuscripts}
            chapters={chapters}
            scenes={scenes}
            onUpdateScene={updateScene}
            onSelectScene={(id) => {
              const scene = scenes.find(s => s.id === id);
              if (scene) {
                setActiveChapterId(scene.chapter_id);
                setWriteMode('manuscrito');
              }
            }}
            onCreateScene={createScene}
          />
        </div>
      )}

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
                        <button className="opacity-0 group-hover:opacity-100 p-0.5 text-text-dim hover:text-red-alert transition-all" title="Excluir capítulo">
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
                      <Textarea value={ch.notes || ''} onChange={e => updateChapter(ch.id, { notes: e.target.value })}
                        placeholder="Notas do capítulo…"
                        className="text-[10px] min-h-[50px] bg-gold/[0.04] border-gold/20 text-gold-light placeholder:text-gold/30 resize-none" />
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
                <div className="p-3 border-b border-blue-bright/10 flex items-center gap-2">
                  {isMobile && (
                    <button onClick={() => setActiveChapterId(null)} className="p-1 text-text-dim hover:text-foreground">
                      <ChevronRight className="w-4 h-4 rotate-180" />
                    </button>
                  )}
                  <input value={editingTitle} onChange={e => setEditingTitle(e.target.value)} onBlur={handleChapterTitleSave}
                    className="bg-transparent font-montserrat font-bold text-sm text-foreground border-none focus:outline-none flex-1"
                    placeholder="Título do capítulo" />
                   <span className="text-[11px] font-mono text-text-dim bg-white/[0.04] px-2 py-0.5 rounded">{chapterWordCount} palavras</span>
                  {/* Edit/Preview toggle */}
                  <div className="flex items-center bg-white/[0.03] rounded border border-blue-bright/10 p-0.5">
                    <button
                      onClick={() => setPreviewMode(false)}
                      className={`px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1 transition-colors ${!previewMode ? 'bg-blue-bright/20 text-blue-light' : 'text-text-dim hover:text-foreground'}`}
                      title="Editar"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setPreviewMode(true)}
                      className={`px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1 transition-colors ${previewMode ? 'bg-blue-bright/20 text-blue-light' : 'text-text-dim hover:text-foreground'}`}
                      title="Pré-visualizar com chips"
                    >
                      <Eye className="w-3 h-3" />
                    </button>
                  </div>
                  <button onClick={() => setZenMode(!zenMode)}
                    className={`p-1.5 rounded hover:bg-white/[0.05] transition-colors ${zenMode ? 'text-blue-light' : 'text-text-dim hover:text-foreground'}`}
                    title={zenMode ? 'Sair do modo foco' : 'Modo foco'}>
                    {zenMode ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                  </button>
                  {!zenMode && (
                  <button onClick={() => setShowRefPanel(!showRefPanel)}
                    className="p-1.5 rounded hover:bg-white/[0.05] text-text-dim hover:text-foreground transition-colors"
                    title={showRefPanel ? 'Fechar referências' : 'Abrir referências'}>
                    {showRefPanel ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
                  </button>
                  )}
                </div>
                <div className="flex-1 relative">
                  {previewMode ? (
                    <ContentPreview
                      content={editingContent}
                      entries={entries}
                      onChipClick={(entry) => { setPreviewEntry(entry); setShowRefPanel(true); }}
                    />
                  ) : (
                    <textarea ref={editorRef} value={editingContent} onChange={e => handleContentChange(e.target.value)}
                      placeholder="Comece a escrever seu capítulo aqui…&#10;&#10;Use @NomeDoPersonagem para inserir referências do Codex."
                      className="w-full h-full resize-none bg-transparent text-foreground/90 font-merriweather text-sm leading-relaxed p-4 focus:outline-none placeholder:text-text-dim/30"
                      style={{ minHeight: '100%' }} />
                  )}
                  {mentionState.active && !previewMode && (
                    <MentionPopup entries={entries} query={mentionState.query} position={mentionState.pos}
                      onSelect={handleMentionSelect} onClose={() => setMentionState(prev => ({ ...prev, active: false }))} />
                  )}
                </div>
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
                <EntryPreviewPanel entry={previewEntry} onClose={() => setPreviewEntry(null)} />
              ) : (
                <ReferencePanel entries={entries} onPreview={(e) => setPreviewEntry(e)} />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
