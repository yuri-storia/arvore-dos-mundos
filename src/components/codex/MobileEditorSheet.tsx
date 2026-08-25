import React from 'react';
import { createPortal } from 'react-dom';
import { Check, X } from 'lucide-react';
import { FRUITS } from '@/lib/data';
import type { CodexEntry } from '@/hooks/useCodexEntries';
import { RichTextEditor } from '@/components/editor/RichTextEditor';

interface Props {
  open: boolean;
  isArticle: boolean;
  title: string;
  onTitleChange: (v: string) => void;
  content: string;
  onContentChange: (v: string) => void;
  fruitId: number | null;
  onFruitChange: (v: number | null) => void;
  siblings: CodexEntry[];
  saveState: 'idle' | 'dirty' | 'saving' | 'saved';
  onSave: () => void;
  onCancel: () => void;
}

/**
 * Edição em tela cheia (mobile): o texto ganha toda a altura útil,
 * sem competir com imagem, cabeçalho ou teclado virtual.
 */
export const MobileEditorSheet: React.FC<Props> = ({
  open, isArticle, title, onTitleChange, content, onContentChange,
  fruitId, onFruitChange, siblings, saveState, onSave, onCancel,
}) => {
  if (!open) return null;

  const accent = isArticle ? 'text-gold-light' : 'text-blue-light';
  const border = isArticle ? 'border-accent/20' : 'border-blue-bright/15';

  return createPortal(
    <div
      className="fixed inset-0 z-[400] flex flex-col bg-[#02070d]"
      style={{ height: '100dvh' }}
      onClick={e => e.stopPropagation()}
    >
      {/* Barra superior */}
      <div className={`flex items-center gap-2 px-3 py-2.5 border-b ${border} bg-[#040c18]`}>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-secondary text-foreground text-[10px] font-montserrat font-bold uppercase"
        >
          <X className="w-3.5 h-3.5" strokeWidth={2} /> Cancelar
        </button>
        <span className="flex-1 text-center text-[10px] font-montserrat uppercase tracking-widest text-text-dim">
          {saveState === 'saving' ? 'Salvando…' : saveState === 'dirty' ? 'Não salvo' : saveState === 'saved' ? 'Salvo' : isArticle ? 'Artigo' : 'Ficha'}
        </span>
        <button
          type="button"
          onClick={onSave}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-[10px] font-montserrat font-bold uppercase ${
            isArticle ? 'bg-accent/80 text-accent-foreground' : 'bg-primary text-foreground'
          }`}
        >
          <Check className="w-3.5 h-3.5" strokeWidth={2} /> Concluir
        </button>
      </div>

      {/* Título + Fruto */}
      <div className={`px-3 py-2 space-y-2 border-b ${border} flex-shrink-0`}>
        <input
          value={title}
          onChange={e => onTitleChange(e.target.value)}
          placeholder="Título"
          className={`w-full bg-[rgba(4,12,24,0.6)] border ${border} rounded-md px-3 py-2 text-base font-cinzel font-bold ${accent} focus:outline-none`}
        />
        <select
          value={fruitId ?? ''}
          onChange={e => onFruitChange(e.target.value ? Number(e.target.value) : null)}
          className={`w-full bg-[rgba(4,12,24,0.6)] border ${border} rounded-md px-3 py-2 text-sm text-foreground font-merriweather focus:outline-none`}
        >
          <option value="">Nenhum Fruto</option>
          {FRUITS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </div>

      {/* Editor ocupando toda a altura restante */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <RichTextEditor
          entries={siblings}
          value={content}
          onChange={onContentChange}
          placeholder={isArticle ? 'Escreva o conteúdo do artigo… Use @ para mencionar.' : 'Descreva esta ficha… Use @ para mencionar.'}
          minHeight="100%"
          compact
        />
      </div>
    </div>,
    document.body,
  );
};
