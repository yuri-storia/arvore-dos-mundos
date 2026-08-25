import React from 'react';
import { createPortal } from 'react-dom';
import { Check, X } from 'lucide-react';
import type { CodexEntry } from '@/hooks/useCodexEntries';
import { RichTextEditor } from '@/components/editor/RichTextEditor';

interface Props {
  open: boolean;
  title: string;
  onTitleChange: (v: string) => void;
  content: string;
  onContentChange: (v: string) => void;
  entries: CodexEntry[];
  wordCount: number;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  onDone: () => void;
  onCancel: () => void;
}

/**
 * Escrita em tela cheia (mobile): o capítulo ocupa toda a altura útil,
 * sem competir com a lista de capítulos nem com o teclado virtual.
 */
export const MobileWritingSheet: React.FC<Props> = ({
  open, title, onTitleChange, content, onContentChange,
  entries, wordCount, saveStatus, onDone, onCancel,
}) => {
  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[400] flex flex-col bg-[#02070d]"
      style={{ height: '100dvh' }}
      onClick={e => e.stopPropagation()}
    >
      {/* Barra superior */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-blue-bright/15 bg-[#040c18]">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-secondary text-foreground text-[10px] font-montserrat font-bold uppercase"
        >
          <X className="w-3.5 h-3.5" strokeWidth={2} /> Cancelar
        </button>
        <span className="flex-1 text-center text-[10px] font-montserrat uppercase tracking-widest text-text-dim">
          {saveStatus === 'saving' ? 'Salvando…' : saveStatus === 'saved' ? 'Salvo' : 'Capítulo'}
        </span>
        <button
          type="button"
          onClick={onDone}
          className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-primary text-foreground text-[10px] font-montserrat font-bold uppercase"
        >
          <Check className="w-3.5 h-3.5" strokeWidth={2} /> Concluir
        </button>
      </div>

      {/* Título + contador */}
      <div className="px-3 py-2 flex items-center gap-2 border-b border-blue-bright/15 flex-shrink-0">
        <input
          value={title}
          onChange={e => onTitleChange(e.target.value)}
          placeholder="Título do capítulo"
          lang="pt-BR"
          className="flex-1 min-w-0 bg-[rgba(4,12,24,0.6)] border border-blue-bright/15 rounded-md px-3 py-2 text-base font-montserrat font-bold text-foreground focus:outline-none"
        />
        <span className="text-[10px] font-mono text-blue-light/80 bg-blue-bright/[0.08] border border-blue-bright/20 px-2 py-1 rounded shrink-0">
          {wordCount}
        </span>
      </div>

      {/* Editor ocupando toda a altura restante */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <RichTextEditor
          entries={entries}
          value={content}
          onChange={onContentChange}
          placeholder="Escreva seu capítulo… Use @ para inserir referências do Codex."
          lang="pt-BR"
          minHeight="100%"
          compact
        />
      </div>
    </div>,
    document.body,
  );
};
