import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { Sparkles, Loader2, X, FileText, BookText, FileDown, Trash2, Move, Image as ImageIcon, ArrowLeft, FolderUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { FRUITS, type GalleryImage } from '@/lib/data';
import type { CodexEntry } from '@/hooks/useCodexEntries';
import { callAIImage, callAIImageConsistent, friendlyAIError } from '@/lib/helpers';
import { exportSingleEntry } from '@/lib/codexPdfExport';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ImageRepositioner } from '@/components/ImageRepositioner';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { useGalleryImages } from '@/hooks/useGalleryImages';
import { buildEntriesByName, renderMentionChildren, renderInlineMentions } from '@/components/escritor/MentionChip';
import { RichTextEditor, RichTextView } from '@/components/editor/RichTextEditor';
import { htmlToPlainText } from '@/lib/htmlToText';
import { useIsMobile } from '@/hooks/use-mobile';
import { CodexImageStudio } from '@/components/codex/CodexImageStudio';

/**
 * Ao subir uma imagem manualmente para uma ficha, arquivamos uma cópia
 * automática na pasta da Galeria que combina com o Fruto da ficha. Assim,
 * ao inserir a foto do "Phillip Hewitt" (Personagens), ela reaparece na
 * pasta Personagens sem ação extra do usuário.
 */
const FRUIT_TO_GALLERY_FOLDER: Record<number, string> = {
  0: 'Mapa do Mundo',
  1: 'Geral',
  2: 'Geral',
  3: 'Cultura',
  4: 'Artefatos',
  5: 'Criaturas',
  6: 'Geral',
  7: 'Cultura',
  8: 'Cultura',
  9: 'Personagens',
  10: 'Geral',
};

const isHTMLContent = (s: string) => /^\s*<(p|div|h[1-6]|ul|ol|blockquote|pre|span|strong|em)[\s>]/i.test(s || '');

interface Props {
  entry: CodexEntry;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (id: string, updates: Partial<Pick<CodexEntry, 'title' | 'content' | 'image_url' | 'entry_type' | 'fruit_id' | 'image_position'>>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onImageUpload: (file: File) => Promise<string | null>;
  onLightbox: (v: { src: string; alt: string }) => void;
  gallery: GalleryImage[];
  /** All other entries in the world — used to resolve @mentions in content. */
  siblings?: CodexEntry[];
  /** Open another entry (used when an @mention chip is clicked). */
  onOpenEntry?: (id: string) => void;
  /** True quando o `content` completo já foi carregado do banco. Enquanto
   * for false, bloqueamos edição para não sobrescrever o texto real com
   * string vazia (bug crítico de perda de dados). */
  contentHydrated?: boolean;
}

const DRAFT_KEY = (id: string) => `codex-draft:${id}`;
type Draft = { title: string; content: string; fruit_id: number | null; ts: number };

export const CodexCard: React.FC<Props> = ({ entry, expanded, onToggle, onUpdate, onDelete, onImageUpload, onLightbox, gallery, siblings, onOpenEntry, contentHydrated }) => {
  const planLimits = usePlanLimits();
  const { addOne: addToGallery } = useGalleryImages(entry.world_id || undefined);
  const isMobile = useIsMobile();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(entry.title);
  const [content, setContent] = useState(entry.content);
  const [editFruit, setEditFruit] = useState<number | null>(entry.fruit_id);
  const [saveState, setSaveState] = useState<'idle' | 'dirty' | 'saving' | 'saved'>('idle');
  const [uploading, setUploading] = useState(false);
  const [showImageMenu, setShowImageMenu] = useState(false);
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const [showAiStudio, setShowAiStudio] = useState(false);
  const [showRepositioner, setShowRepositioner] = useState<null | 'collapsed' | 'expanded' | 'expandedMobile'>(null);
  // Prévia interna (card aberto) é agora sensível ao dispositivo:
  // - Desktop/tablet exibe recorte vertical (~300×600) → slot `expanded` (expandedX/Y)
  // - Mobile exibe recorte horizontal (full×200) → slot `expandedMobile` (expandedMobileX/Y)
  // Assim, ajustar num dispositivo não estraga o enquadramento no outro.
  const readCollapsedPos = (raw: any) => ({
    x: typeof raw?.x === 'number' ? raw.x : 50,
    y: typeof raw?.y === 'number' ? raw.y : 50,
  });
  const readExpandedPos = (raw: any) => ({
    x: typeof raw?.expandedX === 'number' ? raw.expandedX : (typeof raw?.x === 'number' ? raw.x : 50),
    y: typeof raw?.expandedY === 'number' ? raw.expandedY : (typeof raw?.y === 'number' ? raw.y : 50),
  });
  const readExpandedMobilePos = (raw: any) => ({
    // Só o eixo Y importa (arraste vertical); X trava em 50 para centralizar.
    x: 50,
    y: typeof raw?.expandedMobileY === 'number'
      ? raw.expandedMobileY
      : (typeof raw?.y === 'number' ? raw.y : 50),
  });
  const [imgPos, setImgPos] = useState<{ x: number; y: number }>(readCollapsedPos(entry.image_position));
  const [imgPosExpanded, setImgPosExpanded] = useState<{ x: number; y: number }>(readExpandedPos(entry.image_position));
  const [imgPosExpandedMobile, setImgPosExpandedMobile] = useState<{ x: number; y: number }>(readExpandedMobilePos(entry.image_position));
  const fileRef = useRef<HTMLInputElement>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef({ title: entry.title, content: entry.content, fruit_id: entry.fruit_id });

  useEffect(() => {
    setImgPos(readCollapsedPos(entry.image_position));
    setImgPosExpanded(readExpandedPos(entry.image_position));
    setImgPosExpandedMobile(readExpandedMobilePos(entry.image_position));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.id, entry.image_position]);

  // Ressincroniza o state local sempre que o `entry` mudar (hidratação
  // tardia do `content`, refetch, atualização vinda de outro lugar) — desde
  // que o usuário NÃO esteja no meio de uma edição. Sem isso, o `content`
  // inicializado como '' (antes da hidratação) sobrescreve o texto real ao
  // salvar → bug crítico de perda de dados relatado pelos usuários.
  useEffect(() => {
    if (editing) return;
    setTitle(entry.title);
    setContent(entry.content);
    setEditFruit(entry.fruit_id);
    lastSavedRef.current = { title: entry.title, content: entry.content, fruit_id: entry.fruit_id };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.id, entry.title, entry.content, entry.fruit_id, entry.updated_at]);

  // Restore unsaved draft (e.g., after tab refresh / accidental collapse)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY(entry.id));
      if (!raw) return;
      const d: Draft = JSON.parse(raw);
      const entryTs = new Date(entry.updated_at).getTime();
      const hasDiff = d.title !== entry.title || d.content !== entry.content || d.fruit_id !== entry.fruit_id;
      if (hasDiff && d.ts > entryTs) {
        setTitle(d.title);
        setContent(d.content);
        setEditFruit(d.fruit_id);
        setEditing(true);
        setSaveState('dirty');
        toast.info('Rascunho não salvo recuperado.');
      } else {
        localStorage.removeItem(DRAFT_KEY(entry.id));
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.id]);

  // Persist draft + debounced autosave while editing
  useEffect(() => {
    if (!editing) return;
    const dirty = title !== lastSavedRef.current.title
      || content !== lastSavedRef.current.content
      || editFruit !== lastSavedRef.current.fruit_id;
    if (!dirty) return;
    setSaveState('dirty');
    try {
      const d: Draft = { title, content, fruit_id: editFruit, ts: Date.now() };
      localStorage.setItem(DRAFT_KEY(entry.id), JSON.stringify(d));
    } catch { /* quota */ }
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(async () => {
      setSaveState('saving');
      try {
        await onUpdate(entry.id, { title, content, fruit_id: editFruit });
        lastSavedRef.current = { title, content, fruit_id: editFruit };
        localStorage.removeItem(DRAFT_KEY(entry.id));
        setSaveState('saved');
        setTimeout(() => setSaveState(s => (s === 'saved' ? 'idle' : s)), 1500);
      } catch {
        setSaveState('dirty');
      }
    }, 1200);
    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current); };
  }, [editing, title, content, editFruit, entry.id, onUpdate]);

  // Persist draft locally on tab hide / page unload (no network calls, no
  // browser confirmation prompts — we just snapshot to localStorage so the
  // editor can rehydrate exactly where the user left off).
  useEffect(() => {
    if (!editing) return;
    const snapshot = () => {
      const dirty = title !== lastSavedRef.current.title
        || content !== lastSavedRef.current.content
        || editFruit !== lastSavedRef.current.fruit_id;
      if (!dirty) return;
      try {
        const d: Draft = { title, content, fruit_id: editFruit, ts: Date.now() };
        localStorage.setItem(DRAFT_KEY(entry.id), JSON.stringify(d));
      } catch { /* ignore */ }
    };
    const onVisibility = () => { if (document.visibilityState === 'hidden') snapshot(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', snapshot);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', snapshot);
    };
  }, [editing, title, content, editFruit, entry.id]);

  const fruitInfo = entry.fruit_id !== null ? FRUITS.find(f => f.id === entry.fruit_id) : null;

  // Bloqueia entrar em modo edição enquanto o `content` ainda não foi hidratado.
  // Se `contentHydrated` for undefined, mantemos o comportamento antigo (usos
  // fora da tela expandida onde a lista é a fonte da verdade).
  const canEdit = contentHydrated !== false;
  const beginEditing = () => {
    if (!canEdit) {
      toast.info('Carregando conteúdo…');
      return;
    }
    setEditing(true);
  };

  const handleSave = async () => {
    if (autosaveTimer.current) { clearTimeout(autosaveTimer.current); autosaveTimer.current = null; }
    // Guarda extra: nunca sobrescreve o banco enquanto o conteúdo original
    // ainda não foi carregado — protege contra perda de dados se o botão
    // Salvar for clicado no exato instante do carregamento.
    if (!canEdit) {
      toast.error('Conteúdo ainda carregando. Tente novamente em instantes.');
      setSaveState('idle');
      return;
    }
    // Plano cancelado / expirado / sem plano — leitura + exportação apenas.
    if (!planLimits.canEdit) {
      toast.error('Sua assinatura está inativa. Reative um plano para voltar a editar.');
      setSaveState('idle');
      return;
    }
    setSaveState('saving');
    await onUpdate(entry.id, { title, content, fruit_id: editFruit });
    lastSavedRef.current = { title, content, fruit_id: editFruit };
    localStorage.removeItem(DRAFT_KEY(entry.id));
    setSaveState('idle');
    setEditing(false);
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    const url = await onImageUpload(file);
    if (url) {
      const defaultPosition = { x: 50, y: 50 };
      setImgPos(defaultPosition);
      await onUpdate(entry.id, { image_url: url, image_position: defaultPosition });
      // Arquiva automaticamente na pasta da Galeria correspondente ao Fruto.
      // Evita duplicar quando a mesma URL já existe (ex.: reupload).
      try {
        if (entry.world_id && !gallery.some(g => g.src === url)) {
          const folder = (entry.fruit_id !== null && FRUIT_TO_GALLERY_FOLDER[entry.fruit_id]) || 'Geral';
          await addToGallery({ src: url, name: entry.title || 'Sem título', cat: folder, status: 'kept' });
          toast.success(`Imagem arquivada em "${folder}".`);
        }
      } catch (err) {
        console.error('Falha ao arquivar imagem na galeria:', err);
      }
    }
    setUploading(false);
    setShowImageMenu(false);
  };

  const handleGallerySelect = async (img: GalleryImage) => {
    const defaultPosition = { x: 50, y: 50 };
    setImgPos(defaultPosition);
    await onUpdate(entry.id, { image_url: img.src, image_position: defaultPosition });
    setShowGalleryPicker(false);
    setShowImageMenu(false);
  };

  /** Salva na ficha a imagem gerada pelo Estúdio de Idriel. */
  const handleAiImageSaved = async (url: string) => {
    const defaultPosition = { x: 50, y: 50 };
    setImgPos(defaultPosition);
    await onUpdate(entry.id, { image_url: url, image_position: defaultPosition });
    try {
      if (entry.world_id && !gallery.some(g => g.src === url)) {
        const folder = (entry.fruit_id !== null && FRUIT_TO_GALLERY_FOLDER[entry.fruit_id]) || 'Geral';
        await addToGallery({ src: url, name: entry.title || 'Sem título', cat: folder, status: 'kept' });
      }
    } catch (err) {
      console.error('Falha ao arquivar imagem na galeria:', err);
    }
    setShowAiStudio(false);
    setShowImageMenu(false);
  };

  const handleRemoveImage = async () => {
    setImgPos({ x: 50, y: 50 });
    await onUpdate(entry.id, { image_url: null as any, image_position: { x: 50, y: 50 } });
    setShowImageMenu(false);
  };

  const isArticle = entry.entry_type === 'artigo';

  // Filter out __magictype__ marker from displayed content
  const displayContent = entry.content?.replace(/^__magictype__\n?/, '').trim() || '';

  // Resolve @Name mentions to other codex entries (for hover preview + jump).
  const mentionByName = useMemo(
    () => buildEntriesByName((siblings || []).filter(e => e.id !== entry.id)),
    [siblings, entry.id],
  );
  const siblingEntries = useMemo(
    () => (siblings || []).filter(e => e.id !== entry.id),
    [siblings, entry.id],
  );
  const renderMd = useCallback(
    (children: React.ReactNode) => renderMentionChildren(children, mentionByName, onOpenEntry, {
      allEntries: siblingEntries,
    }),
    [mentionByName, onOpenEntry, siblingEntries],
  );

  // Parse sections from content for wiki TOC using ## headings
  const sections = useMemo(() => {
    if (!displayContent) return [];
    // Split by ## headings
    const parts = displayContent.split(/^(##\s+.+)$/m);
    const result: { id: string; title: string; content: string }[] = [];
    let sectionIndex = 0;

    // If content starts before any ##, capture as intro
    let i = 0;
    if (parts.length > 0 && !parts[0].startsWith('## ')) {
      const intro = parts[0].trim();
      if (intro) {
        result.push({ id: `section-${sectionIndex++}`, title: '', content: intro });
      }
      i = 1;
    }

    for (; i < parts.length; i++) {
      const part = parts[i].trim();
      if (!part) continue;
      if (part.startsWith('## ')) {
        const heading = part.replace(/^##\s+/, '');
        result.push({ id: `section-${sectionIndex++}`, title: heading, content: '' });
      } else {
        if (result.length > 0) {
          result[result.length - 1].content += (result[result.length - 1].content ? '\n\n' : '') + part;
        } else {
          result.push({ id: `section-${sectionIndex++}`, title: '', content: part });
        }
      }
    }
    return result;
  }, [displayContent]);

  const contentRef = useRef<HTMLDivElement>(null);

  const scrollToSection = useCallback((sectionId: string) => {
    const el = contentRef.current?.querySelector(`[data-section="${sectionId}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const hasToc = sections.filter(s => s.title).length >= 2;

  // Collapsed card
  if (!expanded) {
    // Article: wiki-style text-only card
    if (isArticle) {
      return (
        <div
          onClick={onToggle}
          className="relative rounded-xl overflow-hidden cursor-pointer group card-glass-gold"
        >
          {/* Corner sheen */}
          <div className="pointer-events-none absolute -top-6 -right-6 w-24 h-24 rounded-full bg-gold-champagne/25 blur-2xl opacity-60 group-hover:opacity-100 transition-opacity" />
          <div className="relative p-5">
            <div className="flex items-center gap-1.5 mb-3">
              {fruitInfo && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gold-warm/15 border border-gold-warm/25 text-gold-champagne text-[9px] font-montserrat font-semibold tracking-wide">
                  <fruitInfo.Icon className="w-2.5 h-2.5" strokeWidth={2} />
                  {fruitInfo.name}
                </span>
              )}
              <span className="px-2 py-0.5 rounded-full bg-gold-warm/10 border border-gold-warm/30 text-gold-light text-[9px] font-montserrat font-bold uppercase tracking-[0.14em]">
                Artigo
              </span>
            </div>
            <h3 className="font-cinzel font-bold text-base text-gold-light mb-2 leading-snug line-clamp-2 group-hover:text-gold-champagne transition-colors">
              {entry.title}
            </h3>
            {displayContent && (
              <p className="font-merriweather text-xs text-foreground/75 line-clamp-4 whitespace-pre-wrap leading-relaxed">
                {htmlToPlainText(displayContent)}
              </p>
            )}
            {/* Delicate bottom rule */}
            <div className="mt-4 h-px w-full bg-gradient-to-r from-transparent via-gold-warm/30 to-transparent" />
          </div>
        </div>
      );
    }

    // Ficha: standard card with image
    return (
      <div
        onClick={onToggle}
        className="relative rounded-xl overflow-hidden cursor-pointer group card-glass"
      >
        {/* Corner sheen (blue) */}
        <div className="pointer-events-none absolute -top-6 -right-6 w-24 h-24 rounded-full bg-blue-glow/25 blur-2xl opacity-60 group-hover:opacity-100 transition-opacity z-[1]" />
        <div className="relative h-[150px] overflow-hidden">
          {entry.image_url ? (
            <>
              <img src={entry.image_url} alt={entry.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" style={{ objectPosition: `${imgPos.x}% ${imgPos.y}%` }} />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[hsl(214_60%_3%/0.95)] via-transparent to-transparent" />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-main/10 to-transparent">
              {fruitInfo ? <fruitInfo.Icon className="w-14 h-14 opacity-40 text-blue-light" strokeWidth={1.25} /> : <FileText className="w-14 h-14 opacity-40 text-blue-light" strokeWidth={1.25} />}
            </div>
          )}
          {fruitInfo && (
            <div className="absolute top-2.5 left-2.5 z-[2]">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[hsl(214_60%_3%/0.7)] border border-blue-bright/30 backdrop-blur-md text-blue-light text-[9px] font-montserrat font-semibold tracking-wide">
                <fruitInfo.Icon className="w-2.5 h-2.5" strokeWidth={2} />
                {fruitInfo.name}
              </span>
            </div>
          )}
        </div>
        <div className="relative p-4">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="px-2 py-0.5 rounded-full bg-blue-main/15 border border-blue-bright/25 text-blue-light text-[9px] font-montserrat font-bold uppercase tracking-[0.14em]">
              Ficha
            </span>
          </div>
          <h3 className="font-cinzel font-bold text-sm text-blue-light mb-1.5 leading-snug line-clamp-2 group-hover:text-blue-glow transition-colors">
            {entry.title}
          </h3>
          {displayContent && (
            <p className="font-merriweather text-xs text-foreground/75 line-clamp-3 whitespace-pre-wrap leading-relaxed">
              {htmlToPlainText(displayContent)}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Expanded card
  if (isArticle) {
    // Wiki-style expanded article — no images, text-focused
    return (
      <div className="rounded-lg overflow-hidden animate-fadeUp card-glass-gold">
        <div className="flex flex-col h-[70vh] max-h-[600px] p-5 sm:p-7">
          {/* Header */}
          <div className="flex items-start justify-between mb-1">
            {editing ? (
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="flex-1 bg-[rgba(4,12,24,0.6)] border border-accent/20 rounded-md px-3 py-1.5 text-xl text-foreground font-cinzel font-bold focus:outline-none focus:border-accent/50"
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <h2 onClick={e => { e.stopPropagation(); beginEditing(); }} className="font-cinzel font-bold text-xl text-foreground cursor-text hover:text-accent transition-colors" title="Clique para editar">{entry.title}</h2>
            )}
            <button
              onClick={e => { e.stopPropagation(); onToggle(); }}
              className="ml-3 w-7 h-7 rounded-full bg-secondary hover:bg-secondary/80 text-foreground text-xs flex items-center justify-center flex-shrink-0 transition-colors"
            >
              <X className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
          </div>

          {/* Wiki meta line */}
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-accent/20 flex-shrink-0">
            {fruitInfo && (
              <span className="px-1.5 py-0.5 rounded-full bg-accent/20 text-accent-foreground text-[9px] font-montserrat font-bold">
                {fruitInfo.icon} {fruitInfo.name}
              </span>
            )}
            <span className="px-1.5 py-0.5 rounded-full bg-accent/10 text-accent text-[9px] font-montserrat font-bold uppercase">
              Artigo
            </span>
            <span className="text-[9px] text-text-dim font-montserrat ml-auto">
              Atualizado: {new Date(entry.updated_at).toLocaleDateString('pt-BR')}
            </span>
          </div>

          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto min-h-0 pr-1">
            {editing ? (
              <>
                <div className="mb-3">
                  <label className="block text-[10px] uppercase tracking-wider text-text-dim font-montserrat mb-1">Fruto</label>
                  <select
                    value={editFruit ?? ''}
                    onChange={e => setEditFruit(e.target.value ? Number(e.target.value) : null)}
                    onClick={e => e.stopPropagation()}
                    className="w-full bg-[rgba(4,12,24,0.6)] border border-accent/20 rounded-md px-3 py-1.5 text-sm text-foreground font-merriweather focus:outline-none focus:border-accent/50"
                  >
                    <option value="">Nenhum</option>
                    {FRUITS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
                <div className="mb-3 border border-accent/20 rounded-md overflow-hidden bg-[rgba(4,12,24,0.6)]" onClick={e => e.stopPropagation()}>
                  <RichTextEditor
                    entries={(siblings || []).filter(e => e.id !== entry.id)}
                    value={content}
                    onChange={setContent}
                    placeholder="Escreva o conteúdo do artigo… Use @ para mencionar outras entradas."
                    minHeight="320px"
                  />
                </div>
              </>
            ) : (
              <div className="flex gap-5">
                {/* Wiki TOC sidebar */}
                {hasToc && (
                  <nav className="hidden sm:block w-[180px] flex-shrink-0 sticky top-0 self-start">
                    <div className="border border-accent/20 rounded-md bg-accent/5 p-3">
                      <h4 className="font-montserrat font-bold text-[9px] uppercase tracking-wider text-accent mb-2 pb-1.5 border-b border-accent/15">
                        <><BookText className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />Índice</>
                      </h4>
                      <ul className="space-y-1">
                        {sections.filter(s => s.title).map((s, i) => (
                          <li key={s.id}>
                            <button
                              onClick={e => { e.stopPropagation(); scrollToSection(s.id); }}
                              className="text-left w-full text-[11px] font-merriweather text-muted-foreground hover:text-accent transition-colors leading-snug py-0.5 pl-2 border-l-2 border-transparent hover:border-accent/50"
                            >
                              {i + 1}. {s.title}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </nav>
                )}

                {/* Article body with sections */}
                <div ref={contentRef} className="flex-1 pr-2 cursor-text" onClick={e => { e.stopPropagation(); beginEditing(); }} title="Clique para editar">
                  {displayContent && isHTMLContent(displayContent) ? (
                    <RichTextView value={displayContent} mentionEntries={siblingEntries} onOpenEntry={onOpenEntry} />

                  ) : sections.length > 0 ? (
                    sections.map(s => (
                      <div key={s.id} data-section={s.id} className="mb-5">
                        {s.title && (
                          <h3 className="font-cinzel font-bold text-base text-foreground mb-2 pb-1 border-b border-accent/15">
                            {s.title}
                          </h3>
                        )}
                        {s.content && (
                          <div className="codex-markdown font-merriweather text-[15px] text-foreground/95 leading-[1.85]">
                            <ReactMarkdown
                              components={{
                                h1: ({ children }) => <h1 className="font-cinzel font-bold text-lg text-foreground mt-4 mb-2">{renderMd(children)}</h1>,
                                h2: ({ children }) => <h2 className="font-cinzel font-bold text-base text-foreground mt-3 mb-2">{renderMd(children)}</h2>,
                                h3: ({ children }) => <h3 className="font-cinzel font-bold text-sm text-foreground mt-2 mb-1">{renderMd(children)}</h3>,
                                p: ({ children }) => <p className="mb-3 last:mb-0">{renderMd(children)}</p>,
                                strong: ({ children }) => <strong className="font-bold text-foreground">{renderMd(children)}</strong>,
                                em: ({ children }) => <em className="italic text-accent/80">{renderMd(children)}</em>,
                                ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
                                li: ({ children }) => <li>{renderMd(children)}</li>,
                                blockquote: ({ children }) => <blockquote className="border-l-2 border-accent/30 pl-3 italic text-accent/70 my-3">{renderMd(children)}</blockquote>,
                                hr: () => <hr className="border-accent/15 my-4" />,
                                code: ({ children, className }) => {
                                  const isBlock = className?.includes('language-');
                                  return isBlock
                                    ? <pre className="bg-secondary/50 rounded-md p-3 overflow-x-auto my-3"><code className="text-xs font-mono text-foreground">{children}</code></pre>
                                    : <code className="bg-secondary/40 rounded px-1 py-0.5 text-xs font-mono text-accent">{children}</code>;
                                },
                              }}
                            >
                              {s.content}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="font-merriweather text-sm text-text-dim italic cursor-text" onClick={e => { e.stopPropagation(); beginEditing(); }}>Sem conteúdo ainda. Clique para adicionar.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Actions — fixed at bottom */}
          <div className="flex flex-wrap gap-2 pt-3 border-t border-accent/20 mt-3 flex-shrink-0">
            {editing && (
              <>
                <button onClick={handleSave} className="px-4 py-1.5 bg-accent/80 hover:bg-accent text-accent-foreground rounded-md text-[10px] font-montserrat font-bold uppercase transition-colors">
                  Salvar
                </button>
                <button onClick={() => { localStorage.removeItem(DRAFT_KEY(entry.id)); setEditing(false); setTitle(entry.title); setContent(entry.content); setEditFruit(entry.fruit_id); lastSavedRef.current = { title: entry.title, content: entry.content, fruit_id: entry.fruit_id }; setSaveState('idle'); }} className="px-4 py-1.5 bg-secondary text-foreground rounded-md text-[10px] font-montserrat font-bold uppercase transition-colors">
                  Cancelar
                </button>
                <span className="self-center text-[10px] font-montserrat text-text-dim italic">
                  {saveState === 'saving' ? 'Salvando…' : saveState === 'dirty' ? 'Alterações não salvas' : saveState === 'saved' ? 'Salvo automaticamente' : ''}
                </span>
              </>
            )}
            <button
              onClick={e => { e.stopPropagation(); exportSingleEntry(entry); }}
              className="px-4 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground rounded-md text-[10px] font-montserrat font-bold uppercase transition-colors"
            >
              <><FileDown className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />Exportar PDF</>
            </button>
            <ConfirmDialog
              trigger={
                <button onClick={e => e.stopPropagation()} className="ml-auto px-4 py-1.5 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-md text-[10px] font-montserrat font-bold uppercase transition-colors">
                  <><Trash2 className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />Excluir</>
                </button>
              }
              title="Excluir artigo"
              description={`Tem certeza que deseja excluir "${entry.title}"? Esta ação não pode ser desfeita.`}
              confirmLabel="Excluir"
              onConfirm={() => onDelete(entry.id)}
            />
          </div>
        </div>
      </div>
    );
  }

  // Expanded ficha (with image support)
  return (
    <div className="rounded-lg overflow-hidden animate-fadeUp card-glass">
      {/* Fixed-height layout */}
      <div className="flex flex-col md:flex-row h-[70vh] max-h-[600px]">
        {/* Image section — fixed size, contained */}
        <div className="relative w-full md:w-[300px] h-[200px] md:h-full bg-secondary/30 flex-shrink-0 overflow-hidden">
          {entry.image_url ? (
            <img
              src={entry.image_url}
              alt={entry.title}
              className="w-full h-full object-cover cursor-zoom-in select-none"
              style={{
                objectPosition: isMobile
                  ? `${imgPosExpandedMobile.x}% ${imgPosExpandedMobile.y}%`
                  : `${imgPosExpanded.x}% ${imgPosExpanded.y}%`,
              }}
              onClick={e => { e.stopPropagation(); onLightbox({ src: entry.image_url!, alt: entry.title }); }}
              draggable={false}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              {fruitInfo ? <fruitInfo.Icon className="w-16 h-16 opacity-25 text-gold-champagne" strokeWidth={1.25} /> : <FileText className="w-16 h-16 opacity-25 text-gold-champagne" strokeWidth={1.25} />}
            </div>
          )}
          {entry.image_url && (
            <div className="absolute top-2 right-2">
              <button
                onClick={e => {
                  e.stopPropagation();
                  // Detecta automaticamente o dispositivo e abre o ajuste no
                  // slot correto — mobile e desktop têm posições independentes.
                  setShowRepositioner(isMobile ? 'expandedMobile' : 'expanded');
                }}
                className="px-2 py-1 bg-card/85 hover:bg-card text-foreground rounded-md text-[9px] font-montserrat font-bold uppercase tracking-wider border border-border transition-colors backdrop-blur-sm flex items-center gap-1.5"
                title={isMobile ? 'Ajustar prévia (mobile)' : 'Ajustar prévia (desktop/tablet)'}
              >
                <Move className="w-3.5 h-3.5" strokeWidth={1.75} />
                Ajustar prévia
              </button>
            </div>
          )}
          <button
            onClick={e => { e.stopPropagation(); setShowImageMenu(!showImageMenu); }}
            className="absolute bottom-3 right-3 px-3 py-1.5 bg-card/80 hover:bg-card text-foreground rounded-md text-[10px] font-montserrat font-bold uppercase tracking-wider border border-border transition-colors backdrop-blur-sm"
          >
            <><ImageIcon className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />{entry.image_url ? 'Alterar' : 'Adicionar'}</>
          </button>
          {fruitInfo && (
            <div className="absolute top-2 left-2">
              <span className="px-1.5 py-0.5 rounded-full bg-accent/20 text-accent-foreground text-[9px] font-montserrat font-bold backdrop-blur-sm">
                {fruitInfo.icon} {fruitInfo.name}
              </span>
            </div>
          )}
        </div>

        {/* Repositioner modal — device-aware persistence */}
        {showRepositioner && entry.image_url && (
          <ImageRepositioner
            src={entry.image_url}
            alt={entry.title}
            mode={showRepositioner}
            lockAxis={showRepositioner === 'expandedMobile' ? 'x' : undefined}
            initialPosition={
              showRepositioner === 'expanded'
                ? imgPosExpanded
                : showRepositioner === 'expandedMobile'
                  ? imgPosExpandedMobile
                  : imgPos
            }
            onSave={async (pos) => {
              const mode = showRepositioner;
              setShowRepositioner(null);
              const base = (entry.image_position as any) || {};
              if (mode === 'expanded') {
                setImgPosExpanded(pos);
                const merged = { ...base, x: imgPos.x, y: imgPos.y, expandedX: pos.x, expandedY: pos.y };
                await onUpdate(entry.id, { image_position: merged });
                toast.success('Prévia interna (desktop) ajustada!');
              } else if (mode === 'expandedMobile') {
                // No mobile só usamos o eixo Y (imagem em landscape).
                setImgPosExpandedMobile({ x: 50, y: pos.y });
                const merged = { ...base, x: imgPos.x, y: imgPos.y, expandedMobileX: 50, expandedMobileY: pos.y };
                await onUpdate(entry.id, { image_position: merged });
                toast.success('Prévia interna (mobile) ajustada!');
              } else {
                setImgPos(pos);
                const merged = { ...base, x: pos.x, y: pos.y };
                await onUpdate(entry.id, { image_position: merged });
                toast.success('Prévia externa ajustada!');
              }
            }}
            onCancel={() => setShowRepositioner(null)}
          />
        )}

        {/* Content section — scrollable */}
        <div className="flex-1 flex flex-col min-h-0 p-4 sm:p-5">
          {/* Header — fixed */}
          <div className="flex items-start justify-between mb-3 flex-shrink-0">
            {editing ? (
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="flex-1 bg-[rgba(4,12,24,0.6)] border border-blue-bright/15 rounded-md px-3 py-1.5 text-base text-foreground font-cinzel font-bold focus:outline-none focus:border-ring/50"
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <h2 onClick={e => { e.stopPropagation(); beginEditing(); }} className="font-cinzel font-bold text-lg text-foreground cursor-text hover:text-blue-light transition-colors" title="Clique para editar">{entry.title}</h2>
            )}
            <button
              onClick={e => { e.stopPropagation(); onToggle(); }}
              className="ml-3 w-7 h-7 rounded-full bg-secondary hover:bg-secondary/80 text-foreground text-xs flex items-center justify-center flex-shrink-0 transition-colors"
            >
              <X className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
          </div>

          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto min-h-0 pr-1">
            {editing && !isMobile ? (
              <>
                <div className="mb-3">
                  <label className="block text-[10px] uppercase tracking-wider text-text-dim font-montserrat mb-1">Fruto</label>
                  <select
                    value={editFruit ?? ''}
                    onChange={e => setEditFruit(e.target.value ? Number(e.target.value) : null)}
                    onClick={e => e.stopPropagation()}
                    className="w-full bg-[rgba(4,12,24,0.6)] border border-blue-bright/15 rounded-md px-3 py-1.5 text-sm text-foreground font-merriweather focus:outline-none focus:border-ring/50"
                  >
                    <option value="">Nenhum</option>
                    {FRUITS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
                <div className="mb-3 border border-blue-bright/15 rounded-md overflow-hidden bg-[rgba(4,12,24,0.6)]" onClick={e => e.stopPropagation()}>
                  <RichTextEditor
                    entries={(siblings || []).filter(e => e.id !== entry.id)}
                    value={content}
                    onChange={setContent}
                    placeholder="Descreva esta ficha… Use @ para mencionar outras entradas."
                    minHeight="220px"
                  />
                </div>
              </>
            ) : (
              <div className="cursor-text" onClick={e => { e.stopPropagation(); beginEditing(); }} title="Clique para editar">
                {displayContent ? (
                  isHTMLContent(displayContent) ? (
                    <RichTextView value={displayContent} mentionEntries={siblingEntries} onOpenEntry={onOpenEntry} />

                  ) : (
                    <p className="font-merriweather text-[15px] text-foreground/95 whitespace-pre-wrap leading-[1.8]">
                      {renderInlineMentions(displayContent, mentionByName, {
                        allEntries: (siblings || []).filter(e => e.id !== entry.id),
                        onOpenEntry,
                        onSave: (next) => { onUpdate(entry.id, { content: next }); },
                      })}
                    </p>
                  )
                ) : (
                  <p className="font-merriweather text-sm text-text-dim italic">Sem conteúdo ainda. Clique para adicionar.</p>
                )}
              </div>
            )}
          </div>

          {/* Actions — fixed at bottom */}
          <div className="flex flex-wrap gap-2 pt-3 border-t border-border mt-3 flex-shrink-0">
            {editing && !isMobile && (
              <>
                <button onClick={handleSave} className="px-4 py-1.5 bg-primary hover:bg-ring text-foreground rounded-md text-[10px] font-montserrat font-bold uppercase transition-colors">
                  Salvar
                </button>
                <button onClick={() => { localStorage.removeItem(DRAFT_KEY(entry.id)); setEditing(false); setTitle(entry.title); setContent(entry.content); setEditFruit(entry.fruit_id); lastSavedRef.current = { title: entry.title, content: entry.content, fruit_id: entry.fruit_id }; setSaveState('idle'); }} className="px-4 py-1.5 bg-secondary text-foreground rounded-md text-[10px] font-montserrat font-bold uppercase transition-colors">
                  Cancelar
                </button>
                <span className="self-center text-[10px] font-montserrat text-text-dim italic">
                  {saveState === 'saving' ? 'Salvando…' : saveState === 'dirty' ? 'Alterações não salvas' : saveState === 'saved' ? 'Salvo automaticamente' : ''}
                </span>
              </>
            )}
            <button
              onClick={e => { e.stopPropagation(); exportSingleEntry(entry); }}
              className="px-4 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground rounded-md text-[10px] font-montserrat font-bold uppercase transition-colors"
            >
              <><FileDown className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />Exportar PDF</>
            </button>
            <ConfirmDialog
              trigger={
                <button onClick={e => e.stopPropagation()} className="ml-auto px-4 py-1.5 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-md text-[10px] font-montserrat font-bold uppercase transition-colors">
                  <><Trash2 className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />Excluir</>
                </button>
              }
              title="Excluir ficha"
              description={`Tem certeza que deseja excluir "${entry.title}"? Esta ação não pode ser desfeita.`}
              confirmLabel="Excluir"
              onConfirm={() => onDelete(entry.id)}
            />
          </div>
        </div>
      </div>

      {showImageMenu && (
        <div className="border-t border-border p-4 bg-card/50 animate-fadeUp">
          <input type="file" ref={fileRef} accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />

          {showGalleryPicker ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-montserrat font-bold text-[10px] uppercase tracking-wider text-blue-light">Escolher da Galeria</h4>
                <button onClick={() => setShowGalleryPicker(false)} className="inline-flex items-center gap-1 text-[10px] text-text-dim font-montserrat hover:text-foreground"><ArrowLeft className="w-3 h-3" strokeWidth={2} />Voltar</button>
              </div>
              {gallery.length === 0 ? (
                <p className="font-merriweather text-xs text-text-dim italic">Nenhuma imagem na galeria. Adicione imagens na aba Galeria primeiro.</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-[200px] overflow-y-auto">
                  {gallery.map(img => (
                    <button
                      key={img.id}
                      onClick={() => handleGallerySelect(img)}
                      className="relative aspect-square rounded-md overflow-hidden border border-border hover:border-ring/50 transition-colors"
                    >
                      <img src={img.src} alt={img.name} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <h4 className="font-montserrat font-bold text-[10px] uppercase tracking-wider text-blue-light mb-3">Adicionar Imagem</h4>
              <div className="flex flex-wrap gap-2 mb-3">
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground rounded-md text-[10px] font-montserrat font-bold uppercase tracking-wider transition-colors disabled:opacity-40"
                >
                  <>{uploading ? <><Loader2 className="inline-block w-3.5 h-3.5 mr-1.5 animate-spin align-[-0.15em]" strokeWidth={2} />Enviando…</> : <><FolderUp className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />Upload do computador</>}</>
                </button>
                <button
                  onClick={() => setShowGalleryPicker(true)}
                  className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground rounded-md text-[10px] font-montserrat font-bold uppercase tracking-wider transition-colors"
                >
                  <><ImageIcon className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />Da galeria do app</>
                </button>
                {entry.image_url && (
                  <button
                    onClick={handleRemoveImage}
                    className="px-4 py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-md text-[10px] font-montserrat font-bold uppercase tracking-wider transition-colors"
                  >
                    <><Trash2 className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />Remover imagem</>
                  </button>
                )}
              </div>


              <div className="border-t border-border pt-4 mt-1 flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAiStudio(true)}
                  className="group relative inline-flex items-center gap-2.5 px-7 py-3 rounded-full font-cinzel text-[12.5px] font-bold uppercase tracking-wider text-background bg-gradient-to-r from-gold-bronze via-gold-warm to-gold-champagne hover:from-gold-warm hover:via-gold-champagne hover:to-gold-cream shadow-[0_0_26px_rgba(218,165,32,0.45)] hover:shadow-[0_0_38px_rgba(218,165,32,0.65)] transition-all"
                >
                  <span className="pointer-events-none absolute inset-0 rounded-full bg-gold/40 blur-xl opacity-70 animate-soft-pulse -z-10" aria-hidden="true" />
                  <Sparkles className="w-4 h-4" strokeWidth={2} />
                  Gerar Imagem com Idriel
                </button>
                <p className="font-merriweather italic text-[10.5px] text-text-dim text-center">
                  Estilo, tipo, tom e qualidade — como na Galeria. Você revisa antes de salvar na ficha.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <CodexImageStudio
        open={showAiStudio}
        onClose={() => setShowAiStudio(false)}
        entryTitle={entry.title}
        entryText={(entry.content || '').replace(/^__magictype__\n?/, '')}
        referenceImageUrls={gallery.filter(g => g.src && g.src !== entry.image_url).slice(0, 3).map(g => g.src)}
        onSave={handleAiImageSaved}
        canUseAI={planLimits.canUseAI}
      />
    </div>
  );
};
