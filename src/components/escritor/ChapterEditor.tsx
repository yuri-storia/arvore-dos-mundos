import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { Chapter } from '@/hooks/useManuscript';
import type { CodexEntry } from '@/hooks/useCodexEntries';
import {
  Edit3, Eye, Maximize, Minimize, PanelRightOpen, PanelRightClose, ChevronRight,
  SpellCheck2,
} from 'lucide-react';
import { buildEntriesByName, renderInlineMentions } from './MentionChip';
import { RichTextEditor, RichTextView } from '@/components/editor/RichTextEditor';

const isHTML = (s: string) => /^\s*<(p|div|h[1-6]|ul|ol|blockquote)[\s>]/i.test(s || '');
const stripHTML = (s: string) => (s || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

interface Props {
  chapter: Chapter;
  entries: CodexEntry[];
  isMobile: boolean;
  zenMode: boolean;
  setZenMode: (v: boolean) => void;
  showRefPanel: boolean;
  setShowRefPanel: (v: boolean) => void;
  onBack?: () => void;
  onTitleSave: (title: string) => void;
  onContentSave: (content: string) => void;
  onPreviewEntry: (entry: CodexEntry) => void;
}

export const ChapterEditor: React.FC<Props> = React.memo(({
  chapter, entries, isMobile, zenMode, setZenMode,
  showRefPanel, setShowRefPanel, onBack,
  onTitleSave, onContentSave, onPreviewEntry,
}) => {
  const [content, setContent] = useState(chapter.content || '');
  const [title, setTitle] = useState(chapter.title);
  const [previewMode, setPreviewMode] = useState(false);
  const [spellcheckOn, setSpellcheckOn] = useState(true);
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const findInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setContent(chapter.content || '');
    setTitle(chapter.title);
  }, [chapter.id]); // eslint-disable-line

  useEffect(() => () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); }, []);

  const debouncedSave = useCallback((value: string) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => onContentSave(value), 1500);
  }, [onContentSave]);

  const handleContentChange = useCallback((value: string) => {
    setContent(value);
    debouncedSave(value);
  }, [debouncedSave]);

  const wordCount = useMemo(
    () => (content.trim() ? content.trim().split(/\s+/).length : 0),
    [content],
  );

  const handleTitleBlur = () => {
    if (title.trim() && title !== chapter.title) onTitleSave(title.trim());
  };

  const byName = useMemo(() => buildEntriesByName(entries), [entries]);

  const previewNodes = useMemo(
    () => previewMode ? renderInlineMentions(content, byName, {
      allEntries: entries,
      onOpenEntry: (id) => { const e = entries.find(x => x.id === id); if (e) onPreviewEntry(e); },
      onSave: (next) => handleContentChange(next),
    }) : null,
    [previewMode, content, byName, entries, onPreviewEntry, handleContentChange],
  );

  // ---- Find (Ctrl+F) ----
  const findNext = useCallback((dir: 1 | -1 = 1) => {
    const q = findQuery;
    if (!q) return;
    const ta = textareaRef.current;
    if (!ta) return;
    const hay = content.toLowerCase();
    const needle = q.toLowerCase();
    if (dir === 1) {
      const from = ta.selectionEnd ?? 0;
      let idx = hay.indexOf(needle, from);
      if (idx === -1) idx = hay.indexOf(needle, 0);
      if (idx === -1) return;
      ta.focus();
      ta.setSelectionRange(idx, idx + needle.length);
    } else {
      const from = (ta.selectionStart ?? 0) - 1;
      let idx = from >= 0 ? hay.lastIndexOf(needle, from) : -1;
      if (idx === -1) idx = hay.lastIndexOf(needle);
      if (idx === -1) return;
      ta.focus();
      ta.setSelectionRange(idx, idx + needle.length);
    }
  }, [findQuery, content]);

  const matchCount = useMemo(() => {
    if (!findQuery) return 0;
    const hay = content.toLowerCase();
    const n = findQuery.toLowerCase();
    if (!n) return 0;
    let i = 0, c = 0;
    while ((i = hay.indexOf(n, i)) !== -1) { c++; i += n.length; }
    return c;
  }, [findQuery, content]);

  const handleEditorKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
      e.preventDefault();
      setFindOpen(true);
      setTimeout(() => findInputRef.current?.focus(), 0);
    }
  }, []);

  return (
    <>
      {/* Header */}
      <div className="p-3 border-b border-blue-bright/10 flex items-center gap-2">
        {isMobile && onBack && (
          <button onClick={onBack} className="p-1 text-text-dim hover:text-foreground">
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
        )}
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          className="bg-transparent font-montserrat font-bold text-sm text-foreground border-none focus:outline-none flex-1 min-w-0"
          placeholder="Título do capítulo"
        />
        <span className="text-[11px] font-mono text-text-dim bg-white/[0.04] px-2 py-0.5 rounded">{wordCount} palavras</span>

        {/* Spellcheck toggle — premium metallic green when on */}
        <button
          onClick={() => setSpellcheckOn(v => !v)}
          title={spellcheckOn ? 'Corretor ortográfico (PT-BR) ativo — clique para desativar' : 'Corretor desativado — clique para ativar'}
          className={`p-1.5 rounded transition-all border ${
            spellcheckOn
              ? 'border-emerald-400/40 text-emerald-300 bg-gradient-to-b from-emerald-400/20 via-emerald-500/10 to-emerald-700/20 shadow-[0_0_12px_-2px_rgba(52,211,153,0.55),inset_0_1px_0_rgba(255,255,255,0.08)] hover:from-emerald-400/30 hover:to-emerald-700/30'
              : 'border-white/10 text-text-dim hover:text-foreground hover:bg-white/[0.05]'
          }`}
        >
          <SpellCheck2 className="w-4 h-4" />
        </button>

        {/* Find toggle */}
        <button
          onClick={() => {
            setFindOpen(v => !v);
            if (!findOpen) setTimeout(() => findInputRef.current?.focus(), 0);
          }}
          title="Buscar no capítulo (Ctrl+F)"
          className={`p-1.5 rounded transition-colors ${
            findOpen ? 'bg-blue-bright/20 text-blue-light' : 'text-text-dim hover:text-foreground hover:bg-white/[0.05]'
          }`}
        >
          <Search className="w-4 h-4" />
        </button>

        <div className="flex items-center bg-white/[0.03] rounded border border-blue-bright/10 p-0.5">
          <button onClick={() => setPreviewMode(false)}
            className={`px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1 transition-colors ${!previewMode ? 'bg-blue-bright/20 text-blue-light' : 'text-text-dim hover:text-foreground'}`}
            title="Editar">
            <Edit3 className="w-3 h-3" />
          </button>
          <button onClick={() => setPreviewMode(true)}
            className={`px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1 transition-colors ${previewMode ? 'bg-blue-bright/20 text-blue-light' : 'text-text-dim hover:text-foreground'}`}
            title="Pré-visualizar com chips">
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

      {/* Find bar */}
      {findOpen && (
        <div className="px-3 py-2 border-b border-blue-bright/10 bg-white/[0.02] flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-text-dim shrink-0" />
          <input
            ref={findInputRef}
            value={findQuery}
            onChange={e => setFindQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); findNext(e.shiftKey ? -1 : 1); }
              if (e.key === 'Escape') { e.preventDefault(); setFindOpen(false); textareaRef.current?.focus(); }
            }}
            placeholder="Buscar no capítulo…"
            className="flex-1 bg-transparent text-xs text-foreground focus:outline-none placeholder:text-text-dim/40"
          />
          <span className="text-[10px] font-mono text-text-dim min-w-[3rem] text-right">
            {findQuery ? `${matchCount} ${matchCount === 1 ? 'ocorr.' : 'ocorrs.'}` : ''}
          </span>
          <button onClick={() => findNext(-1)} disabled={!matchCount}
            title="Anterior (Shift+Enter)"
            className="p-1 rounded text-text-dim hover:text-foreground hover:bg-white/[0.05] disabled:opacity-30">
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => findNext(1)} disabled={!matchCount}
            title="Próximo (Enter)"
            className="p-1 rounded text-text-dim hover:text-foreground hover:bg-white/[0.05] disabled:opacity-30">
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => { setFindOpen(false); textareaRef.current?.focus(); }}
            title="Fechar (Esc)"
            className="p-1 rounded text-text-dim hover:text-foreground hover:bg-white/[0.05]">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Editor body */}
      <div className="flex-1 relative">
        {previewMode ? (
          <div className="w-full h-full overflow-y-auto p-4 font-merriweather text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
            {previewNodes && previewNodes.length > 0
              ? previewNodes
              : <span className="text-text-dim/40 italic">Nada escrito ainda.</span>}
          </div>
        ) : (
          <MentionTextarea
            ref={textareaRef}
            entries={entries}
            value={content}
            onChange={handleContentChange}
            onKeyDown={handleEditorKeyDown}
            placeholder="Comece a escrever seu capítulo aqui…&#10;&#10;Use @NomeDoPersonagem para inserir referências do Codex. Selecione e Ctrl+L para vincular. Ctrl+F para buscar."
            className="w-full h-full resize-none bg-transparent text-foreground/90 font-merriweather text-sm leading-relaxed p-4 focus:outline-none placeholder:text-text-dim/30"
            wrapperClassName="relative w-full h-full"
            spellCheck={spellcheckOn}
            lang="pt-BR"
          />
        )}
      </div>
    </>
  );
});
ChapterEditor.displayName = 'ChapterEditor';
