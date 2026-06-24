import React, { useEffect, useMemo, useRef, useState, useImperativeHandle, useCallback } from 'react';
import { useEditor, EditorContent, ReactRenderer, type Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { TextAlign } from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { Placeholder } from '@tiptap/extension-placeholder';
import { CharacterCount } from '@tiptap/extension-character-count';
import { Mention } from '@tiptap/extension-mention';
import { Link } from '@tiptap/extension-link';
import { Image } from '@tiptap/extension-image';
import tippy, { type Instance } from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Heading1, Heading2, Heading3,
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight, AlignJustify, Indent, Outdent,
  Palette, Highlighter, AtSign, Undo, Redo, Pilcrow, Eraser,
  Check, Loader2, CircleAlert,
} from 'lucide-react';
import type { CodexEntry } from '@/hooks/useCodexEntries';
import './editor.css';

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

  // Close popovers on outside click / Escape
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
        <ToolBtn title="Desfazer (Ctrl+Z)" onClick={() => can.chain().focus().undo().run()}><Undo className="w-4 h-4" /></ToolBtn>
        <ToolBtn title="Refazer (Ctrl+Shift+Z)" onClick={() => can.chain().focus().redo().run()}><Redo className="w-4 h-4" /></ToolBtn>
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
        <ToolBtn title="Mencionar Codex (@ ou Ctrl+L)" onClick={() => can.chain().focus().insertContent('@').run()}><AtSign className="w-4 h-4" /></ToolBtn>
      </div>
    </div>
  );
};

/* ------------------------------- Editor ------------------------------- */
export const RichTextEditor = React.forwardRef<RichTextEditorRef, Props>(({
  value, onChange, entries = [], placeholder, spellCheck = true, lang = 'pt-BR',
  autoFocus, className, minHeight, compact, editorId,
}, ref) => {
  const entriesRef = useRef<CodexEntry[]>(entries);
  useEffect(() => { entriesRef.current = entries; }, [entries]);
  const [focused, setFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
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
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: placeholder || 'Comece a escrever…' }),
      CharacterCount,
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
    ],
    content: initialHTML,
    autofocus: autoFocus,
    editorProps: {
      attributes: {
        class: `rich-content ${className || ''}`,
        spellcheck: spellCheck ? 'true' : 'false',
        lang,
        ...(minHeight ? { style: `min-height:${minHeight}` } : {}),
      },
      handleKeyDown(view, event) {
        if ((event.ctrlKey || event.metaKey) && (event.key === 'l' || event.key === 'L')) {
          event.preventDefault();
          editor?.chain().focus().insertContent('@').run();
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onFocus: () => setFocused(true),
    onBlur: () => {
      // Defer to allow focus to land on a toolbar button. If focus moved
      // somewhere outside the editor container, hide the floating bar.
      setTimeout(() => {
        const active = document.activeElement;
        if (!containerRef.current || !active || !containerRef.current.contains(active)) {
          setFocused(false);
        }
      }, 120);
    },
  });

  // External value sync (e.g. switching chapters/entries)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const next = plainTextToHtml(value);
    if (next !== current) editor.commands.setContent(next || '<p></p>', { emitUpdate: false });
  }, [value, editor]);

  useImperativeHandle(ref, () => ({
    focus: () => editor?.commands.focus(),
    getHTML: () => editor?.getHTML() || '',
    insertText: (t: string) => editor?.chain().focus().insertContent(t).run(),
  }), [editor]);

  if (!editor) return null;

  return (
    <div className={`rich-editor ${isMobile && focused ? 'has-mobile-floating' : ''}`} id={editorId} ref={containerRef}>
      {!compact && <Toolbar editor={editor} />}
      <BubbleMenu editor={editor} className="rich-bubble">
        <ToolBtn title="Negrito" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="w-3.5 h-3.5" /></ToolBtn>
        <ToolBtn title="Itálico" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="w-3.5 h-3.5" /></ToolBtn>
        <ToolBtn title="Sublinhado" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon className="w-3.5 h-3.5" /></ToolBtn>
        <ToolBtn title="Realce" active={editor.isActive('highlight')} onClick={() => editor.chain().focus().toggleHighlight({ color: '#3A2E12' }).run()}><Highlighter className="w-3.5 h-3.5" /></ToolBtn>
        <ToolBtn title="Mencionar" onClick={() => editor.chain().focus().insertContent('@').run()}><AtSign className="w-3.5 h-3.5" /></ToolBtn>
      </BubbleMenu>
      <EditorContent editor={editor} />
      {isMobile && focused && (
        <div className="rich-mobile-floating">
          <Toolbar editor={editor} mobile />
        </div>
      )}
    </div>
  );
});
RichTextEditor.displayName = 'RichTextEditor';

/** Plain HTML viewer for saved content (read-only) */
export const RichTextView: React.FC<{ value: string; className?: string }> = ({ value, className }) => {
  const html = useMemo(() => plainTextToHtml(value || ''), [value]);
  return <div className={`rich-content ${className || ''}`} dangerouslySetInnerHTML={{ __html: html }} />;
};
