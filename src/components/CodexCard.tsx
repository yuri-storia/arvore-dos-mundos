import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { FRUITS, type GalleryImage } from '@/lib/data';
import type { CodexEntry } from '@/hooks/useCodexEntries';
import { callAIImage, callAIImageConsistent, friendlyAIError } from '@/lib/helpers';
import { exportSingleEntry } from '@/lib/codexPdfExport';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ImageRepositioner } from '@/components/ImageRepositioner';

interface Props {
  entry: CodexEntry;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (id: string, updates: Partial<Pick<CodexEntry, 'title' | 'content' | 'image_url' | 'entry_type' | 'fruit_id' | 'image_position'>>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onImageUpload: (file: File) => Promise<string | null>;
  onLightbox: (v: { src: string; alt: string }) => void;
  gallery: GalleryImage[];
}

export const CodexCard: React.FC<Props> = ({ entry, expanded, onToggle, onUpdate, onDelete, onImageUpload, onLightbox, gallery }) => {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(entry.title);
  const [content, setContent] = useState(entry.content);
  const [editFruit, setEditFruit] = useState<number | null>(entry.fruit_id);
  const [uploading, setUploading] = useState(false);
  const [showImageMenu, setShowImageMenu] = useState(false);
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [generatingAi, setGeneratingAi] = useState(false);
  const [consistent, setConsistent] = useState(true);
  const [showRepositioner, setShowRepositioner] = useState(false);
  const [imgPos, setImgPos] = useState<{ x: number; y: number }>(entry.image_position || { x: 50, y: 50 });
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setImgPos(entry.image_position || { x: 50, y: 50 });
  }, [entry.id, entry.image_position]);

  const fruitInfo = entry.fruit_id !== null ? FRUITS.find(f => f.id === entry.fruit_id) : null;

  const handleSave = async () => {
    await onUpdate(entry.id, { title, content, fruit_id: editFruit });
    setEditing(false);
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    const url = await onImageUpload(file);
    if (url) {
      const defaultPosition = { x: 50, y: 50 };
      setImgPos(defaultPosition);
      await onUpdate(entry.id, { image_url: url, image_position: defaultPosition });
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

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setGeneratingAi(true);
    try {
      let url: string;
      if (consistent) {
        // Build references from same-fruit Codex entries with images (excluding self), up to 5.
        const sameFruitWithImage = gallery
          .filter(g => g.src && g.src !== entry.image_url)
          .slice(0, 5)
          .map(g => g.src);
        const refText = `Entrada atual: "${entry.title}" (${entry.entry_type}). Conteúdo:\n${(entry.content || '').slice(0, 2000)}`;
        url = await callAIImageConsistent(aiPrompt, sameFruitWithImage, refText);
      } else {
        url = await callAIImage(aiPrompt);
      }
      if (url) {
        const defaultPosition = { x: 50, y: 50 };
        setImgPos(defaultPosition);
        await onUpdate(entry.id, { image_url: url, image_position: defaultPosition });
        toast.success(consistent ? 'Imagem gerada com consistência do Codex!' : 'Imagem gerada com sucesso!');
      }
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : 'Erro ao gerar imagem';
      const f = friendlyAIError(raw);
      toast.error(f.title, { description: f.hint });
    } finally {
      setGeneratingAi(false);
      setShowImageMenu(false);
      setAiPrompt('');
    }
  };

  const handleRemoveImage = async () => {
    setImgPos({ x: 50, y: 50 });
    await onUpdate(entry.id, { image_url: null as any, image_position: { x: 50, y: 50 } });
    setShowImageMenu(false);
  };

  const isArticle = entry.entry_type === 'artigo';

  // Filter out __magictype__ marker from displayed content
  const displayContent = entry.content?.replace(/^__magictype__\n?/, '').trim() || '';

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
          className="rounded-lg overflow-hidden cursor-pointer group transition-all card-glass-gold hover:border-gold/40"
        >
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2 border-b border-accent/20 pb-2">
              {fruitInfo && (
                <span className="px-1.5 py-0.5 rounded-full bg-accent/20 text-accent-foreground text-[9px] font-montserrat font-bold">
                  {fruitInfo.icon} {fruitInfo.name}
                </span>
              )}
              <span className="px-1.5 py-0.5 rounded-full bg-accent/10 text-accent text-[9px] font-montserrat font-bold uppercase">
                📝 Artigo
              </span>
            </div>
            <h3 className="font-cinzel font-bold text-base text-foreground mb-2">{entry.title}</h3>
            {displayContent && (
              <p className="font-merriweather text-xs text-foreground/85 line-clamp-4 whitespace-pre-wrap leading-relaxed">{displayContent}</p>
            )}
          </div>
        </div>
      );
    }

    // Ficha: standard card with image
    return (
      <div
        onClick={onToggle}
        className="rounded-lg overflow-hidden cursor-pointer group transition-all card-glass hover:border-ring/30"
      >
        <div className="relative h-[140px] bg-secondary/30">
          {entry.image_url ? (
              <img src={entry.image_url} alt={entry.title} className="w-full h-full object-cover" style={{ objectPosition: `${imgPos.x}% ${imgPos.y}%` }} />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-5xl opacity-20">{fruitInfo?.icon || '📄'}</span>
            </div>
          )}
          {fruitInfo && (
            <div className="absolute top-2 left-2">
              <span className="px-1.5 py-0.5 rounded-full bg-accent/20 text-accent-foreground text-[9px] font-montserrat font-bold">
                {fruitInfo.icon} {fruitInfo.name}
              </span>
            </div>
          )}
        </div>
        <div className="p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="px-1.5 py-0.5 rounded-full bg-secondary/50 text-text-dim text-[9px] font-montserrat font-bold uppercase">
              📋 Ficha
            </span>
          </div>
          <h3 className="font-cinzel font-bold text-sm text-foreground mb-1">{entry.title}</h3>
          {displayContent && (
            <p className="font-merriweather text-xs text-foreground/85 line-clamp-3 whitespace-pre-wrap">{displayContent}</p>
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
              <h2 onClick={e => { e.stopPropagation(); setEditing(true); }} className="font-cinzel font-bold text-xl text-foreground cursor-text hover:text-accent transition-colors" title="Clique para editar">{entry.title}</h2>
            )}
            <button
              onClick={e => { e.stopPropagation(); onToggle(); }}
              className="ml-3 w-7 h-7 rounded-full bg-secondary hover:bg-secondary/80 text-foreground text-xs flex items-center justify-center flex-shrink-0 transition-colors"
            >
              ✕
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
              📝 Artigo
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
                    {FRUITS.map(f => <option key={f.id} value={f.id}><f.Icon className="inline-block w-3.5 h-3.5 align-[-0.15em] text-gold-champagne" strokeWidth={1.75} /> {f.name}</option>)}
                  </select>
                </div>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  rows={12}
                  className="w-full bg-[rgba(4,12,24,0.6)] border border-accent/20 rounded-md px-3 py-2 text-sm text-foreground font-merriweather mb-3 focus:outline-none focus:border-accent/50 resize-y"
                  onClick={e => e.stopPropagation()}
                />
              </>
            ) : (
              <div className="flex gap-5">
                {/* Wiki TOC sidebar */}
                {hasToc && (
                  <nav className="hidden sm:block w-[180px] flex-shrink-0 sticky top-0 self-start">
                    <div className="border border-accent/20 rounded-md bg-accent/5 p-3">
                      <h4 className="font-montserrat font-bold text-[9px] uppercase tracking-wider text-accent mb-2 pb-1.5 border-b border-accent/15">
                        📑 Índice
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
                <div ref={contentRef} className="flex-1 pr-2 cursor-text" onClick={e => { e.stopPropagation(); setEditing(true); }} title="Clique para editar">
                  {sections.length > 0 ? (
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
                                h1: ({ children }) => <h1 className="font-cinzel font-bold text-lg text-foreground mt-4 mb-2">{children}</h1>,
                                h2: ({ children }) => <h2 className="font-cinzel font-bold text-base text-foreground mt-3 mb-2">{children}</h2>,
                                h3: ({ children }) => <h3 className="font-cinzel font-bold text-sm text-foreground mt-2 mb-1">{children}</h3>,
                                p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                                strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
                                em: ({ children }) => <em className="italic text-accent/80">{children}</em>,
                                ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
                                li: ({ children }) => <li>{children}</li>,
                                blockquote: ({ children }) => <blockquote className="border-l-2 border-accent/30 pl-3 italic text-accent/70 my-3">{children}</blockquote>,
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
                    <p className="font-merriweather text-sm text-text-dim italic cursor-text" onClick={e => { e.stopPropagation(); setEditing(true); }}>Sem conteúdo ainda. Clique para adicionar.</p>
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
                <button onClick={() => { setEditing(false); setTitle(entry.title); setContent(entry.content); setEditFruit(entry.fruit_id); }} className="px-4 py-1.5 bg-secondary text-foreground rounded-md text-[10px] font-montserrat font-bold uppercase transition-colors">
                  Cancelar
                </button>
              </>
            )}
            <button
              onClick={e => { e.stopPropagation(); exportSingleEntry(entry); }}
              className="px-4 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground rounded-md text-[10px] font-montserrat font-bold uppercase transition-colors"
            >
              📄 Exportar PDF
            </button>
            <ConfirmDialog
              trigger={
                <button onClick={e => e.stopPropagation()} className="ml-auto px-4 py-1.5 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-md text-[10px] font-montserrat font-bold uppercase transition-colors">
                  🗑 Excluir
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
              style={{ objectPosition: `${imgPos.x}% ${imgPos.y}%` }}
              onClick={e => { e.stopPropagation(); onLightbox({ src: entry.image_url!, alt: entry.title }); }}
              draggable={false}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-6xl opacity-15">{fruitInfo?.icon || '📄'}</span>
            </div>
          )}
          {entry.image_url && (
            <button
              onClick={e => { e.stopPropagation(); setShowRepositioner(true); }}
              className="absolute top-2 right-2 px-2 py-1 bg-card/80 hover:bg-card text-foreground rounded-md text-[9px] font-montserrat font-bold uppercase tracking-wider border border-border transition-colors backdrop-blur-sm"
              title="Ajustar a prévia da ficha"
            >
              ↕ Ajustar prévia
            </button>
          )}
          <button
            onClick={e => { e.stopPropagation(); setShowImageMenu(!showImageMenu); }}
            className="absolute bottom-3 right-3 px-3 py-1.5 bg-card/80 hover:bg-card text-foreground rounded-md text-[10px] font-montserrat font-bold uppercase tracking-wider border border-border transition-colors backdrop-blur-sm"
          >
            {entry.image_url ? '🖼 Alterar' : '🖼 Adicionar'}
          </button>
          {fruitInfo && (
            <div className="absolute top-2 left-2">
              <span className="px-1.5 py-0.5 rounded-full bg-accent/20 text-accent-foreground text-[9px] font-montserrat font-bold backdrop-blur-sm">
                {fruitInfo.icon} {fruitInfo.name}
              </span>
            </div>
          )}
        </div>

        {/* Repositioner modal */}
        {showRepositioner && entry.image_url && (
          <ImageRepositioner
            src={entry.image_url}
            alt={entry.title}
            initialPosition={imgPos}
            onSave={async (pos) => {
              setImgPos(pos);
              setShowRepositioner(false);
              await onUpdate(entry.id, { image_position: pos });
              toast.success('Prévia ajustada!');
            }}
            onCancel={() => setShowRepositioner(false)}
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
              <h2 onClick={e => { e.stopPropagation(); setEditing(true); }} className="font-cinzel font-bold text-lg text-foreground cursor-text hover:text-blue-light transition-colors" title="Clique para editar">{entry.title}</h2>
            )}
            <button
              onClick={e => { e.stopPropagation(); onToggle(); }}
              className="ml-3 w-7 h-7 rounded-full bg-secondary hover:bg-secondary/80 text-foreground text-xs flex items-center justify-center flex-shrink-0 transition-colors"
            >
              ✕
            </button>
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
                    className="w-full bg-[rgba(4,12,24,0.6)] border border-blue-bright/15 rounded-md px-3 py-1.5 text-sm text-foreground font-merriweather focus:outline-none focus:border-ring/50"
                  >
                    <option value="">Nenhum</option>
                    {FRUITS.map(f => <option key={f.id} value={f.id}><f.Icon className="inline-block w-3.5 h-3.5 align-[-0.15em] text-gold-champagne" strokeWidth={1.75} /> {f.name}</option>)}
                  </select>
                </div>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  rows={8}
                  className="w-full bg-[rgba(4,12,24,0.6)] border border-blue-bright/15 rounded-md px-3 py-2 text-sm text-foreground font-merriweather mb-3 focus:outline-none focus:border-ring/50 resize-y"
                  onClick={e => e.stopPropagation()}
                />
              </>
            ) : (
              <div className="cursor-text" onClick={e => { e.stopPropagation(); setEditing(true); }} title="Clique para editar">
                {displayContent ? (
                  <p className="font-merriweather text-[15px] text-foreground/95 whitespace-pre-wrap leading-[1.8]">{displayContent}</p>
                ) : (
                  <p className="font-merriweather text-sm text-text-dim italic">Sem conteúdo ainda. Clique para adicionar.</p>
                )}
              </div>
            )}
          </div>

          {/* Actions — fixed at bottom */}
          <div className="flex flex-wrap gap-2 pt-3 border-t border-border mt-3 flex-shrink-0">
            {editing && (
              <>
                <button onClick={handleSave} className="px-4 py-1.5 bg-primary hover:bg-ring text-foreground rounded-md text-[10px] font-montserrat font-bold uppercase transition-colors">
                  Salvar
                </button>
                <button onClick={() => { setEditing(false); setTitle(entry.title); setContent(entry.content); setEditFruit(entry.fruit_id); }} className="px-4 py-1.5 bg-secondary text-foreground rounded-md text-[10px] font-montserrat font-bold uppercase transition-colors">
                  Cancelar
                </button>
              </>
            )}
            <button
              onClick={e => { e.stopPropagation(); exportSingleEntry(entry); }}
              className="px-4 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground rounded-md text-[10px] font-montserrat font-bold uppercase transition-colors"
            >
              📄 Exportar PDF
            </button>
            <ConfirmDialog
              trigger={
                <button onClick={e => e.stopPropagation()} className="ml-auto px-4 py-1.5 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-md text-[10px] font-montserrat font-bold uppercase transition-colors">
                  🗑 Excluir
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
                <button onClick={() => setShowGalleryPicker(false)} className="text-[10px] text-text-dim font-montserrat hover:text-foreground">← Voltar</button>
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
                  {uploading ? '⏳ Enviando…' : '📁 Upload do computador'}
                </button>
                <button
                  onClick={() => setShowGalleryPicker(true)}
                  className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground rounded-md text-[10px] font-montserrat font-bold uppercase tracking-wider transition-colors"
                >
                  🖼 Da galeria do app
                </button>
                {entry.image_url && (
                  <button
                    onClick={handleRemoveImage}
                    className="px-4 py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-md text-[10px] font-montserrat font-bold uppercase tracking-wider transition-colors"
                  >
                    🗑 Remover imagem
                  </button>
                )}
              </div>


              <div className="border-t border-border pt-3 mt-1">
                <label className="block text-[10px] uppercase tracking-wider text-text-dim font-montserrat mb-1.5 inline-flex items-center gap-1.5"><Sparkles className="w-3 h-3 text-gold-champagne" strokeWidth={1.75} />Gerar imagem com IA</label>
                <div className="flex gap-2">
                  <input
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                    placeholder={`Descreva a imagem para "${entry.title}"…`}
                    className="flex-1 bg-[rgba(4,12,24,0.6)] border border-blue-bright/15 rounded-md px-3 py-2 text-xs text-foreground font-merriweather placeholder:italic placeholder:text-text-dim/70 focus:outline-none focus:border-ring/50"
                  />
                  <button
                    onClick={handleAiGenerate}
                    disabled={!aiPrompt.trim() || generatingAi}
                    className="px-4 py-2 bg-accent/80 hover:bg-accent text-accent-foreground rounded-md text-[10px] font-montserrat font-bold uppercase tracking-wider transition-colors disabled:opacity-40"
                  >
                    <>{generatingAi ? <><Loader2 className="inline-block w-3.5 h-3.5 mr-1.5 animate-spin align-[-0.15em]" strokeWidth={2} />Gerando…</> : <><Sparkles className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />Gerar</>}</>
                  </button>
                </div>
                <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={consistent}
                    onChange={e => setConsistent(e.target.checked)}
                    className="accent-gold"
                  />
                  <span className="text-[10px] text-foreground/80 font-merriweather">
                    🔗 Manter consistência com o Codex (usa imagens da galeria como referência visual)
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
