import React, { useEffect, useMemo, useRef, useState, useImperativeHandle, useCallback } from 'react';
import { useEditor, EditorContent, ReactRenderer, type Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextAlign } from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { Placeholder } from '@tiptap/extension-placeholder';
import { CharacterCount } from '@tiptap/extension-character-count';
import { Mention } from '@tiptap/extension-mention';
import { Image } from '@tiptap/extension-image';
import { SpellcheckExtension } from './SpellcheckExtension';
import tippy, { type Instance } from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Heading1, Heading2, Heading3,
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight, AlignJustify, Indent, Outdent,
  Palette, Highlighter, AtSign, Undo, Redo, Pilcrow, Eraser,
  Check, Loader2, CircleAlert, HelpCircle, Maximize2, Minimize2, X,
  Minus, Plus, GripVertical,
} from 'lucide-react';
import type { CodexEntry } from '@/hooks/useCodexEntries';
import './editor.css';

/* ----- Image extension with width + align attrs (resize / align controls) ----- */
const ResizableImage = Image.extend({
  // Enable native ProseMirror drag handle so users can reorder images by dragging.
  draggable: true,
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).style.width || (el as HTMLElement).getAttribute('width') || null,
        renderHTML: (attrs) => (attrs.width ? { style: `width: ${attrs.width}` } : {}),
      },
      align: {
        default: 'center',
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-align') || 'center',
        renderHTML: (attrs) => ({ 'data-align': attrs.align || 'center' }),
      },
    };
  },
});

/** Parse a width string ("60%", "320px", null) into a percent number (10-100). */
function parseWidthPercent(w: string | null | undefined): number {
  if (!w) return 100;
  const m = /([\d.]+)\s*%/.exec(w);
  if (m) return Math.round(Number(m[1]));
  return 100;
}
function clampPct(n: number) { return Math.max(10, Math.min(100, Math.round(n))); }

export interface RichTextEditorRef {
  focus: () => void;
  getHTML: () => string;
  insertText: (text: string) => void;
}

interface Props {
  value: string;
  onChange: (next: string) => void;
  entries?: CodexEntry[];
  placeholder?: string;
  spellCheck?: boolean;
  lang?: string;
  autoFocus?: boolean;
  className?: string;
  minHeight?: string;
  /** Hide the full top toolbar (still keeps bubble menu + mobile floating bar) */
  compact?: boolean;
  /** Optional ID used for scrolling/find */
  editorId?: string;
  /** External save state shown as a small indicator in the editor. */
  saveStatus?: 'idle' | 'saving' | 'saved' | 'error';
  /** When true (default), the top toolbar stays fixed while the text scrolls.
   *  When false (e.g. focus/zen mode), the toolbar scrolls along with the content. */
  stickyToolbar?: boolean;
}

const TEXT_COLORS = ['#FFFFFF', '#FFD27A', '#FFB870', '#FF8FA3', '#FF6B6B', '#7FFFC2', '#7AC8FF', '#B58BFF', '#8C8C8C'];
const HIGHLIGHT_COLORS = ['transparent', '#3A2E12', '#1F2F3A', '#2F1F2F', '#1F3A2C', '#3A1F1F'];

/* ----------------------------- Mention suggestion ----------------------------- */
function createMentionSuggestion(getEntries: () => CodexEntry[]) {
  return {
    items: ({ query }: { query: string }) => {
      const q = query.toLowerCase().trim();
      return getEntries()
        .filter(e => !q || e.title.toLowerCase().includes(q))
        .slice(0, 8);
    },
    render: () => {
      let component: ReactRenderer<MentionListHandle, MentionListProps> | null = null;
      let popup: Instance[] = [];
      return {
        onStart: (props: any) => {
          component = new ReactRenderer(MentionList, { props, editor: props.editor });
          if (!props.clientRect) return;
          popup = tippy('body', {
            getReferenceClientRect: props.clientRect as any,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'bottom-start',
            theme: 'arvore-mention',
            arrow: false,
            offset: [0, 6],
          });
        },
        onUpdate(props: any) {
          component?.updateProps(props);
          if (!props.clientRect) return;
          popup[0]?.setProps({ getReferenceClientRect: props.clientRect as any });
        },
        onKeyDown(props: any) {
          if (props.event.key === 'Escape') { popup[0]?.hide(); return true; }
          return component?.ref?.onKeyDown(props) ?? false;
        },
        onExit() { popup[0]?.destroy(); component?.destroy(); },
      };
    },
  };
}

interface MentionListProps { items: CodexEntry[]; command: (item: { id: string; label: string }) => void; }
interface MentionListHandle { onKeyDown: (props: { event: KeyboardEvent }) => boolean }

const MentionList = React.forwardRef<MentionListHandle, MentionListProps>((props, ref) => {
  const [selected, setSelected] = useState(0);
  useEffect(() => setSelected(0), [props.items]);
  const select = (idx: number) => {
    const item = props.items[idx];
    if (item) props.command({ id: item.id, label: item.title });
  };
  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowDown') { setSelected(s => (s + 1) % Math.max(1, props.items.length)); return true; }
      if (event.key === 'ArrowUp') { setSelected(s => (s - 1 + props.items.length) % Math.max(1, props.items.length)); return true; }
      if (event.key === 'Enter') { select(selected); return true; }
      return false;
    },
  }));
  return (
    <div className="rich-mention-list">
      {props.items.length === 0 ? (
        <div className="rich-mention-empty">Nenhuma entrada</div>
      ) : props.items.map((item, i) => (
        <button
          key={item.id}
          type="button"
          onMouseDown={e => { e.preventDefault(); select(i); }}
          className={`rich-mention-item ${i === selected ? 'is-active' : ''}`}
        >
          <span className={item.entry_type === 'ficha' ? 'rich-mention-ficha' : 'rich-mention-artigo'}>{item.title}</span>
          <span className="rich-mention-kind">{item.entry_type}</span>
        </button>
      ))}
    </div>
  );
});
MentionList.displayName = 'MentionList';

/* ------------------------------- Helpers ------------------------------- */
function plainTextToHtml(value: string): string {
  const trimmed = (value || '').trim();
  if (!trimmed) return '';
  // Already HTML
  if (/^\s*<(p|div|h[1-6]|ul|ol|blockquote|pre|span|strong|em)[\s>]/i.test(trimmed)) return value;
  // Convert plain text: paragraphs by blank lines; preserve single \n as <br/>
  const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return value
    .split(/\n\s*\n/)
    .map(p => `<p>${escape(p).replace(/\n/g, '<br/>')}</p>`)
    .join('');
}

/* ------------------------------- Toolbar ------------------------------- */
const ToolBtn: React.FC<{ active?: boolean; disabled?: boolean; onClick: () => void; title: string; children: React.ReactNode }> = ({ active, disabled, onClick, title, children }) => (
  <button
    type="button"
    onMouseDown={e => { e.preventDefault(); }}
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`rich-toolbtn ${active ? 'is-active' : ''}`}
  >{children}</button>
);

const Toolbar: React.FC<{ editor: Editor; mobile?: boolean }> = ({ editor, mobile }) => {
  const [colorOpen, setColorOpen] = useState(false);
  const [hlOpen, setHlOpen] = useState(false);
  const colorWrapRef = useRef<HTMLDivElement>(null);
  const hlWrapRef = useRef<HTMLDivElement>(null);
  const can = editor;

  // Force re-render on editor transactions so active/disabled states stay in sync.
  const [, force] = useState(0);
  useEffect(() => {
    const handler = () => force(n => n + 1);
    editor.on('transaction', handler);
    editor.on('selectionUpdate', handler);
    return () => {
      editor.off('transaction', handler);
      editor.off('selectionUpdate', handler);
    };
  }, [editor]);
  useEffect(() => {
    if (!colorOpen && !hlOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (colorOpen && colorWrapRef.current && !colorWrapRef.current.contains(t)) setColorOpen(false);
      if (hlOpen && hlWrapRef.current && !hlWrapRef.current.contains(t)) setHlOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setColorOpen(false); setHlOpen(false); }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [colorOpen, hlOpen]);

  return (
    <div className={`rich-toolbar ${mobile ? 'is-mobile' : ''}`}>
      <div className="rich-group">
        <ToolBtn title="Desfazer (Ctrl+Z)" disabled={!can.can().undo()} onClick={() => can.chain().focus().undo().run()}><Undo className="w-4 h-4" /></ToolBtn>
        <ToolBtn title="Refazer (Ctrl+Shift+Z)" disabled={!can.can().redo()} onClick={() => can.chain().focus().redo().run()}><Redo className="w-4 h-4" /></ToolBtn>
      </div>
      <div className="rich-group">
        <ToolBtn title="Parágrafo" active={can.isActive('paragraph')} onClick={() => can.chain().focus().setParagraph().run()}><Pilcrow className="w-4 h-4" /></ToolBtn>
        <ToolBtn title="Título 1" active={can.isActive('heading', { level: 1 })} onClick={() => can.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 className="w-4 h-4" /></ToolBtn>
        <ToolBtn title="Título 2" active={can.isActive('heading', { level: 2 })} onClick={() => can.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="w-4 h-4" /></ToolBtn>
        <ToolBtn title="Título 3" active={can.isActive('heading', { level: 3 })} onClick={() => can.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className="w-4 h-4" /></ToolBtn>
      </div>
      <div className="rich-group">
        <ToolBtn title="Negrito (Ctrl+B)" active={can.isActive('bold')} onClick={() => can.chain().focus().toggleBold().run()}><Bold className="w-4 h-4" /></ToolBtn>
        <ToolBtn title="Itálico (Ctrl+I)" active={can.isActive('italic')} onClick={() => can.chain().focus().toggleItalic().run()}><Italic className="w-4 h-4" /></ToolBtn>
        <ToolBtn title="Sublinhado (Ctrl+U)" active={can.isActive('underline')} onClick={() => can.chain().focus().toggleUnderline().run()}><UnderlineIcon className="w-4 h-4" /></ToolBtn>
        <ToolBtn title="Tachado" active={can.isActive('strike')} onClick={() => can.chain().focus().toggleStrike().run()}><Strikethrough className="w-4 h-4" /></ToolBtn>
      </div>
      <div className="rich-group rich-color-group">
        <div className="rich-color-wrap" ref={colorWrapRef}>
          <ToolBtn title="Cor do texto" onClick={() => { setColorOpen(o => !o); setHlOpen(false); }}><Palette className="w-4 h-4" /></ToolBtn>
          {colorOpen && (
            <div className="rich-popover" onMouseDown={e => e.preventDefault()}>
              {TEXT_COLORS.map(c => (
                <button key={c} className="rich-swatch" style={{ background: c }}
                  onClick={() => { can.chain().focus().setColor(c).run(); setColorOpen(false); }} />
              ))}
              <button className="rich-clear" onClick={() => { can.chain().focus().unsetColor().run(); setColorOpen(false); }}>
                <Eraser className="w-3 h-3" /> Limpar
              </button>
            </div>
          )}
        </div>
        <div className="rich-color-wrap" ref={hlWrapRef}>
          <ToolBtn title="Realce" onClick={() => { setHlOpen(o => !o); setColorOpen(false); }}><Highlighter className="w-4 h-4" /></ToolBtn>
          {hlOpen && (
            <div className="rich-popover" onMouseDown={e => e.preventDefault()}>
              {HIGHLIGHT_COLORS.map(c => (
                <button key={c} className="rich-swatch" style={{ background: c === 'transparent' ? 'transparent' : c, border: c === 'transparent' ? '1px dashed #fff5' : undefined }}
                  onClick={() => {
                    if (c === 'transparent') can.chain().focus().unsetHighlight().run();
                    else can.chain().focus().toggleHighlight({ color: c }).run();
                    setHlOpen(false);
                  }} />
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="rich-group">
        <ToolBtn title="Alinhar à esquerda" active={can.isActive({ textAlign: 'left' })} onClick={() => can.chain().focus().setTextAlign('left').run()}><AlignLeft className="w-4 h-4" /></ToolBtn>
        <ToolBtn title="Centralizar" active={can.isActive({ textAlign: 'center' })} onClick={() => can.chain().focus().setTextAlign('center').run()}><AlignCenter className="w-4 h-4" /></ToolBtn>
        <ToolBtn title="Alinhar à direita" active={can.isActive({ textAlign: 'right' })} onClick={() => can.chain().focus().setTextAlign('right').run()}><AlignRight className="w-4 h-4" /></ToolBtn>
        <ToolBtn title="Justificar" active={can.isActive({ textAlign: 'justify' })} onClick={() => can.chain().focus().setTextAlign('justify').run()}><AlignJustify className="w-4 h-4" /></ToolBtn>
      </div>
      <div className="rich-group">
        <ToolBtn title="Lista" active={can.isActive('bulletList')} onClick={() => can.chain().focus().toggleBulletList().run()}><List className="w-4 h-4" /></ToolBtn>
        <ToolBtn title="Lista numerada" active={can.isActive('orderedList')} onClick={() => can.chain().focus().toggleOrderedList().run()}><ListOrdered className="w-4 h-4" /></ToolBtn>
        <ToolBtn title="Aumentar recuo (Tab)" onClick={() => can.chain().focus().sinkListItem('listItem').run()}><Indent className="w-4 h-4" /></ToolBtn>
        <ToolBtn title="Diminuir recuo (Shift+Tab)" onClick={() => can.chain().focus().liftListItem('listItem').run()}><Outdent className="w-4 h-4" /></ToolBtn>
      </div>
      <div className="rich-group">
        <ToolBtn title="Mencionar Codex (@) — Ctrl+L foca o editor com segurança e abre o seletor" onClick={() => can.chain().focus().insertContent('@').run()}><AtSign className="w-4 h-4" /></ToolBtn>
      </div>
    </div>
  );
};

/* ---------------------------- Image controls ---------------------------- */
const ImageControls: React.FC<{ editor: Editor }> = ({ editor }) => {
  // Re-render on any editor transaction so width/align reflect current node attrs.
  const [, force] = useState(0);
  useEffect(() => {
    const handler = () => force(n => n + 1);
    editor.on('selectionUpdate', handler);
    editor.on('transaction', handler);
    return () => {
      editor.off('selectionUpdate', handler);
      editor.off('transaction', handler);
    };
  }, [editor]);

  const attrs = editor.getAttributes('image') as { width?: string | null; align?: string };
  const currentPct = parseWidthPercent(attrs.width);
  const currentAlign = (attrs.align as 'left' | 'center' | 'right') || 'center';

  const setSize = (w: string | null) => editor.chain().focus().updateAttributes('image', { width: w }).run();
  const setPct = (pct: number) => setSize(`${clampPct(pct)}%`);
  const stepPct = (delta: number) => setPct(currentPct + delta);
  const setAlign = (a: 'left' | 'center' | 'right') =>
    editor.chain().focus().updateAttributes('image', { align: a }).run();
  const remove = () => editor.chain().focus().deleteSelection().run();

  const canUndo = editor.can().undo();
  const canRedo = editor.can().redo();

  return (
    <>
      <ToolBtn title="Desfazer (Ctrl+Z)" disabled={!canUndo} onClick={() => editor.chain().focus().undo().run()}><Undo className="w-3.5 h-3.5" /></ToolBtn>
      <ToolBtn title="Refazer (Ctrl+Shift+Z)" disabled={!canRedo} onClick={() => editor.chain().focus().redo().run()}><Redo className="w-3.5 h-3.5" /></ToolBtn>
      <span className="rich-bubble-sep" />
      <span className="rich-image-drag-hint" title="Arraste a imagem pelo corpo do parágrafo para reordenar">
        <GripVertical className="w-3.5 h-3.5" />
      </span>
      <span className="rich-bubble-sep" />
      <ToolBtn title="Pequena (25%)" active={currentPct === 25} onClick={() => setPct(25)}><Minimize2 className="w-3.5 h-3.5" /></ToolBtn>
      <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => setPct(50)} title="Média (50%)" className={`rich-toolbtn ${currentPct === 50 ? 'is-active' : ''}`} style={{ fontSize: 10, width: 30 }}>50%</button>
      <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => setPct(75)} title="Grande (75%)" className={`rich-toolbtn ${currentPct === 75 ? 'is-active' : ''}`} style={{ fontSize: 10, width: 30 }}>75%</button>
      <ToolBtn title="Tamanho original (100%)" active={currentPct === 100 && !attrs.width} onClick={() => setSize(null)}><Maximize2 className="w-3.5 h-3.5" /></ToolBtn>
      <span className="rich-bubble-sep" />
      <ToolBtn title="Diminuir 5%" disabled={currentPct <= 10} onClick={() => stepPct(-5)}><Minus className="w-3.5 h-3.5" /></ToolBtn>
      <span className="rich-image-pct" title="Largura atual">{currentPct}%</span>
      <ToolBtn title="Aumentar 5%" disabled={currentPct >= 100} onClick={() => stepPct(5)}><Plus className="w-3.5 h-3.5" /></ToolBtn>
      <input
        type="range"
        min={10}
        max={100}
        step={5}
        value={currentPct}
        onMouseDown={e => e.stopPropagation()}
        onChange={e => setPct(Number(e.target.value))}
        className="rich-image-range"
        title="Ajuste fino de largura"
        aria-label="Largura da imagem"
      />
      <span className="rich-bubble-sep" />
      <ToolBtn title="Alinhar à esquerda" active={currentAlign === 'left'} onClick={() => setAlign('left')}><AlignLeft className="w-3.5 h-3.5" /></ToolBtn>
      <ToolBtn title="Centralizar" active={currentAlign === 'center'} onClick={() => setAlign('center')}><AlignCenter className="w-3.5 h-3.5" /></ToolBtn>
      <ToolBtn title="Alinhar à direita" active={currentAlign === 'right'} onClick={() => setAlign('right')}><AlignRight className="w-3.5 h-3.5" /></ToolBtn>
      <span className="rich-bubble-sep" />
      <ToolBtn title="Remover imagem" onClick={remove}><X className="w-3.5 h-3.5" /></ToolBtn>
    </>
  );
};

/* ------------------------------- Editor ------------------------------- */
export const RichTextEditor = React.forwardRef<RichTextEditorRef, Props>(({
  value, onChange, entries = [], placeholder, spellCheck = true, lang = 'pt-BR',
  autoFocus, className, minHeight, compact, editorId, saveStatus, stickyToolbar = true,
}, ref) => {
  const entriesRef = useRef<CodexEntry[]>(entries);
  useEffect(() => { entriesRef.current = entries; }, [entries]);
  const [focused, setFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const isTypingRef = useRef(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 768px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const initialHTML = useMemo(() => plainTextToHtml(value), []); // eslint-disable-line

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: {
          openOnClick: false,
          autolink: true,
          linkOnPaste: true,
          protocols: ['http', 'https', 'mailto'],
          HTMLAttributes: { class: 'rich-link', rel: 'noopener noreferrer nofollow', target: '_blank' },
        },
      }),
      TextStyle,
      Color,
      Underline,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: placeholder || 'Comece a escrever…' }),
      CharacterCount,
      ResizableImage.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: { class: 'rich-image' },
      }),


      Mention.configure({
        HTMLAttributes: { class: 'rich-mention' },
        renderText: ({ node }) => `@${node.attrs.label ?? node.attrs.id}`,
        renderHTML: ({ node, options }) => [
          'span',
          { ...options.HTMLAttributes, 'data-id': node.attrs.id, 'data-label': node.attrs.label },
          `@${node.attrs.label ?? node.attrs.id}`,
        ],
        suggestion: { char: '@', ...createMentionSuggestion(() => entriesRef.current) },
      }),
      SpellcheckExtension.configure({ enabled: spellCheck !== false }),
    ],
    content: initialHTML,
    autofocus: autoFocus,
    editorProps: {
      attributes: {
        class: `rich-content ${className || ''}`,
        // Native browser spellcheck is disabled because PT-BR is rarely
        // installed on user devices. Underlines are rendered by our own
        // `SpellcheckExtension` using the bundled nspell PT-BR dictionary.
        spellcheck: 'false',
        lang,
        translate: 'no',
        autocorrect: 'off',
        autocapitalize: 'sentences',
        ...(minHeight ? { style: `min-height:${minHeight}` } : {}),
      },
      handleKeyDown(_view, event) {
        if ((event.ctrlKey || event.metaKey) && (event.key === 'l' || event.key === 'L')) {
          event.preventDefault();
          editorRef.current?.chain().focus().insertContent('@').run();
          return true;
        }
        return false;
      },
      // Handle pasted images (from clipboard or screenshot) as inline base64.
      handlePaste(_view, event) {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of Array.from(items)) {
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (!file) continue;
            event.preventDefault();
            const reader = new FileReader();
            reader.onload = () => {
              const src = reader.result as string;
              editorRef.current?.chain().focus().setImage({ src, alt: file.name || 'imagem' }).run();
            };
            reader.readAsDataURL(file);
            return true;
          }
        }
        return false;
      },
      // Allow drag & drop of image files.
      handleDrop(_view, event) {
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;
        const imgs = Array.from(files).filter(f => f.type.startsWith('image/'));
        if (imgs.length === 0) return false;
        event.preventDefault();
        imgs.forEach(file => {
          const reader = new FileReader();
          reader.onload = () => {
            const src = reader.result as string;
            editorRef.current?.chain().focus().setImage({ src, alt: file.name || 'imagem' }).run();
          };
          reader.readAsDataURL(file);
        });
        return true;
      },
    },
    onUpdate: ({ editor }) => {
      // Flag local typing so external sync doesn't fight the cursor.
      isTypingRef.current = true;
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => { isTypingRef.current = false; }, 600);
      onChange(editor.getHTML());
    },
    onFocus: () => setFocused(true),
    onBlur: () => {
      setTimeout(() => {
        const active = document.activeElement;
        if (!containerRef.current || !active || !containerRef.current.contains(active)) {
          setFocused(false);
        }
      }, 120);
    },
  });

  // Keep editor ref always pointing at latest instance.
  useEffect(() => { editorRef.current = editor; }, [editor]);

  // External value sync (e.g. switching chapters/entries).
  // Only apply when not actively typing and HTML really differs — prevents
  // cursor jumps during autosave roundtrips.
  useEffect(() => {
    if (!editor) return;
    if (isTypingRef.current) return;
    const current = editor.getHTML();
    const next = plainTextToHtml(value);
    if (next === current) return;
    // Preserve selection where possible.
    const { from, to } = editor.state.selection;
    editor.commands.setContent(next || '<p></p>', { emitUpdate: false });
    try {
      const size = editor.state.doc.content.size;
      const safeFrom = Math.min(from, size);
      const safeTo = Math.min(to, size);
      editor.commands.setTextSelection({ from: safeFrom, to: safeTo });
    } catch { /* ignore */ }
  }, [value, editor]);

  /* Spellcheck: nativo do navegador (PT-BR) + menu global de sugestões via
     SpellcheckProvider. Não há mais ciclo de vida específico aqui. */


  useImperativeHandle(ref, () => ({
    focus: () => editorRef.current?.commands.focus(),
    getHTML: () => editorRef.current?.getHTML() || '',
    insertText: (t: string) => editorRef.current?.chain().focus().insertContent(t).run(),
  }), [editor]);

  if (!editor) return null;

  return (
    <div
      className={`rich-editor ${isMobile && focused ? 'has-mobile-floating' : ''} ${stickyToolbar ? 'is-sticky-toolbar' : 'is-flowing-toolbar'}`}
      id={editorId}
      ref={containerRef}
      lang={lang}
      style={{ '--rich-editor-min-height': minHeight || '220px' } as React.CSSProperties}
    >
      <div className="rich-scroll">
        {!compact && <Toolbar editor={editor} />}
        <EditorContent editor={editor} />
      </div>
      <BubbleMenu
        editor={editor}
        pluginKey="rich-text-bubble"
        className="rich-bubble"
        shouldShow={({ editor, from, to }) => from !== to && !editor.isActive('image')}
      >
        <ToolBtn title="Negrito" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="w-3.5 h-3.5" /></ToolBtn>
        <ToolBtn title="Itálico" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="w-3.5 h-3.5" /></ToolBtn>
        <ToolBtn title="Sublinhado" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon className="w-3.5 h-3.5" /></ToolBtn>
        <ToolBtn title="Realce" active={editor.isActive('highlight')} onClick={() => editor.chain().focus().toggleHighlight({ color: '#3A2E12' }).run()}><Highlighter className="w-3.5 h-3.5" /></ToolBtn>
        <ToolBtn title="Mencionar" onClick={() => editor.chain().focus().insertContent('@').run()}><AtSign className="w-3.5 h-3.5" /></ToolBtn>
      </BubbleMenu>
      <BubbleMenu
        editor={editor}
        pluginKey="rich-image-bubble"
        className="rich-bubble rich-image-bubble"
        shouldShow={({ editor }) => editor.isActive('image')}
      >
        <ImageControls editor={editor} />
      </BubbleMenu>
      {saveStatus && saveStatus !== 'idle' && <SaveIndicator status={saveStatus} />}

      {isMobile && focused && (
        <div className="rich-mobile-floating">
          <Toolbar editor={editor} mobile />
        </div>
      )}
    </div>
  );
});
RichTextEditor.displayName = 'RichTextEditor';

/* ---------------------------- Save indicator ---------------------------- */
const SaveIndicator: React.FC<{ status: 'saving' | 'saved' | 'error' }> = ({ status }) => {
  const map = {
    saving: { icon: <Loader2 className="w-3 h-3 animate-spin" />, label: 'Salvando…', cls: 'rich-save-saving' },
    saved:  { icon: <Check className="w-3 h-3" />,                label: 'Salvo',     cls: 'rich-save-saved'  },
    error:  { icon: <CircleAlert className="w-3 h-3" />,          label: 'Erro ao salvar', cls: 'rich-save-error' },
  } as const;
  const cfg = map[status];
  return (
    <div className={`rich-save-indicator ${cfg.cls}`} role="status" aria-live="polite">
      {cfg.icon}<span>{cfg.label}</span>
    </div>
  );
};

/** Plain HTML viewer for saved content (read-only) */
export const RichTextView: React.FC<{ value: string; className?: string }> = ({ value, className }) => {
  const html = useMemo(() => plainTextToHtml(value || ''), [value]);
  return <div className={`rich-content ${className || ''}`} dangerouslySetInnerHTML={{ __html: html }} />;
};
