import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { Chapter } from '@/hooks/useManuscript';
import type { CodexEntry } from '@/hooks/useCodexEntries';
import {
  Edit3, Eye, Maximize, Minimize, PanelRightOpen, PanelRightClose, ChevronRight,
} from 'lucide-react';
import { buildEntriesByName, renderInlineMentions } from './MentionChip';
import { MentionTextarea } from './MentionTextarea';

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

/**
 * Isolated editor for a single chapter. Keeps content state local so typing
 * never re-renders the parent (TabEscrever) tree — vital for editor perf.
 */
export const ChapterEditor: React.FC<Props> = React.memo(({
  chapter, entries, isMobile, zenMode, setZenMode,
  showRefPanel, setShowRefPanel, onBack,
  onTitleSave, onContentSave, onPreviewEntry,
}) => {
  const [content, setContent] = useState(chapter.content || '');
  const [title, setTitle] = useState(chapter.title);
  const [previewMode, setPreviewMode] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync when chapter changes (switching chapters)
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

  const previewParts = useMemo(
    () => previewMode ? tokenizeMentions(content, byName) : [],
    [previewMode, content, byName],
  );

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
          className="bg-transparent font-montserrat font-bold text-sm text-foreground border-none focus:outline-none flex-1"
          placeholder="Título do capítulo"
        />
        <span className="text-[11px] font-mono text-text-dim bg-white/[0.04] px-2 py-0.5 rounded">{wordCount} palavras</span>
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

      {/* Editor body */}
      <div className="flex-1 relative">
        {previewMode ? (
          <div className="w-full h-full overflow-y-auto p-4 font-merriweather text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
            {previewParts.map((p, i) =>
              p.type === 'text'
                ? <span key={i}>{p.value}</span>
                : <MentionChip key={i} name={p.value} entry={p.entry} onClick={p.entry ? () => onPreviewEntry(p.entry!) : undefined} />,
            )}
            {previewParts.length === 0 && <span className="text-text-dim/40 italic">Nada escrito ainda.</span>}
          </div>
        ) : (
          <MentionTextarea
            entries={entries}
            value={content}
            onChange={handleContentChange}
            placeholder="Comece a escrever seu capítulo aqui…&#10;&#10;Use @NomeDoPersonagem para inserir referências do Codex. Ou selecione uma palavra e clique com o botão direito para vincular."
            className="w-full h-full resize-none bg-transparent text-foreground/90 font-merriweather text-sm leading-relaxed p-4 focus:outline-none placeholder:text-text-dim/30"
            wrapperClassName="relative w-full h-full"
          />
        )}
      </div>
    </>
  );
});
ChapterEditor.displayName = 'ChapterEditor';
