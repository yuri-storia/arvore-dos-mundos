import React, { useState, useRef } from 'react';
import { FRUITS, type GalleryImage } from '@/lib/data';
import type { CodexEntry } from '@/hooks/useCodexEntries';
import { callAIImage } from '@/lib/helpers';
import { exportSingleEntry } from '@/lib/codexPdfExport';
import { toast } from 'sonner';

interface Props {
  entry: CodexEntry;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (id: string, updates: Partial<Pick<CodexEntry, 'title' | 'content' | 'image_url' | 'entry_type' | 'fruit_id'>>) => Promise<void>;
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
  const fileRef = useRef<HTMLInputElement>(null);

  const fruitInfo = entry.fruit_id !== null ? FRUITS.find(f => f.id === entry.fruit_id) : null;

  const handleSave = async () => {
    await onUpdate(entry.id, { title, content, fruit_id: editFruit });
    setEditing(false);
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    const url = await onImageUpload(file);
    if (url) await onUpdate(entry.id, { image_url: url });
    setUploading(false);
    setShowImageMenu(false);
  };

  const handleGallerySelect = async (img: GalleryImage) => {
    await onUpdate(entry.id, { image_url: img.src });
    setShowGalleryPicker(false);
    setShowImageMenu(false);
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setGeneratingAi(true);
    try {
      const url = await callAIImage(aiPrompt);
      if (url) {
        await onUpdate(entry.id, { image_url: url });
        toast.success('Imagem gerada com sucesso!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao gerar imagem');
    } finally {
      setGeneratingAi(false);
      setShowImageMenu(false);
      setAiPrompt('');
    }
  };

  const handleRemoveImage = async () => {
    await onUpdate(entry.id, { image_url: null as any });
    setShowImageMenu(false);
  };

  const isArticle = entry.entry_type === 'artigo';

  // Collapsed card
  if (!expanded) {
    return (
      <div
        onClick={onToggle}
        className="card-glass rounded-lg overflow-hidden cursor-pointer group hover:border-ring/30 transition-all"
      >
        {!isArticle && (
          <div className="relative h-[140px] bg-secondary/30">
            {entry.image_url ? (
              <img src={entry.image_url} alt={entry.title} className="w-full h-full object-cover" />
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
        )}
        <div className="p-3">
          <div className="flex items-center gap-1.5 mb-1">
            {isArticle && fruitInfo && (
              <span className="px-1.5 py-0.5 rounded-full bg-accent/20 text-accent-foreground text-[9px] font-montserrat font-bold">
                {fruitInfo.icon} {fruitInfo.name}
              </span>
            )}
            <span className="px-1.5 py-0.5 rounded-full bg-secondary/50 text-text-dim text-[9px] font-montserrat font-bold uppercase">
              {isArticle ? '📝 Artigo' : '📋 Ficha'}
            </span>
          </div>
          <h3 className="font-cinzel font-bold text-sm text-foreground mb-1">{entry.title}</h3>
          {entry.content && (
            <p className="font-merriweather text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">{entry.content}</p>
          )}
        </div>
      </div>
    );
  }

  // Expanded card
  return (
    <div className="card-glass rounded-lg overflow-hidden col-span-1 sm:col-span-2 lg:col-span-3 animate-fadeUp">
      <div className="flex flex-col md:flex-row">
        {/* Image section */}
        <div className="relative w-full md:w-[320px] h-[240px] md:h-auto bg-secondary/30 flex-shrink-0">
          {entry.image_url ? (
            <img
              src={entry.image_url}
              alt={entry.title}
              className="w-full h-full object-cover cursor-zoom-in"
              onClick={e => { e.stopPropagation(); onLightbox({ src: entry.image_url!, alt: entry.title }); }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center min-h-[200px]">
              <span className="text-6xl opacity-15">{fruitInfo?.icon || '📄'}</span>
            </div>
          )}
          {/* Image action button */}
          <button
            onClick={e => { e.stopPropagation(); setShowImageMenu(!showImageMenu); }}
            className="absolute bottom-3 right-3 px-3 py-1.5 bg-card/80 hover:bg-card text-foreground rounded-md text-[10px] font-montserrat font-bold uppercase tracking-wider border border-border transition-colors backdrop-blur-sm"
          >
            {entry.image_url ? '🖼 Alterar imagem' : '🖼 Adicionar imagem'}
          </button>

          {/* Badges */}
          {fruitInfo && (
            <div className="absolute top-2 left-2">
              <span className="px-1.5 py-0.5 rounded-full bg-accent/20 text-accent-foreground text-[9px] font-montserrat font-bold backdrop-blur-sm">
                {fruitInfo.icon} {fruitInfo.name}
              </span>
            </div>
          )}
        </div>

        {/* Content section */}
        <div className="flex-1 p-4 sm:p-5">
          <div className="flex items-start justify-between mb-3">
            {editing ? (
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="flex-1 bg-[rgba(4,12,24,0.6)] border border-blue-bright/15 rounded-md px-3 py-1.5 text-base text-foreground font-cinzel font-bold focus:outline-none focus:border-ring/50"
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <h2 className="font-cinzel font-bold text-lg text-foreground">{entry.title}</h2>
            )}
            <button
              onClick={e => { e.stopPropagation(); onToggle(); }}
              className="ml-3 w-7 h-7 rounded-full bg-secondary hover:bg-secondary/80 text-foreground text-xs flex items-center justify-center flex-shrink-0 transition-colors"
            >
              ✕
            </button>
          </div>

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
                  {FRUITS.map(f => <option key={f.id} value={f.id}>{f.icon} {f.name}</option>)}
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
            <div className="mb-4 max-h-[400px] overflow-y-auto">
              {entry.content ? (
                <p className="font-merriweather text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{entry.content}</p>
              ) : (
                <p className="font-merriweather text-sm text-text-dim italic">Sem conteúdo ainda. Clique em editar para adicionar.</p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
            {editing ? (
              <>
                <button onClick={handleSave} className="px-4 py-1.5 bg-primary hover:bg-ring text-foreground rounded-md text-[10px] font-montserrat font-bold uppercase transition-colors">
                  Salvar
                </button>
                <button onClick={() => { setEditing(false); setTitle(entry.title); setContent(entry.content); setEditFruit(entry.fruit_id); }} className="px-4 py-1.5 bg-secondary text-foreground rounded-md text-[10px] font-montserrat font-bold uppercase transition-colors">
                  Cancelar
                </button>
              </>
            ) : (
              <button onClick={e => { e.stopPropagation(); setEditing(true); }} className="px-4 py-1.5 bg-primary/20 hover:bg-primary/30 text-blue-light rounded-md text-[10px] font-montserrat font-bold uppercase transition-colors border border-ring/20">
                ✏️ Editar
              </button>
            )}
            <button
              onClick={e => { e.stopPropagation(); exportSingleEntry(entry); }}
              className="px-4 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground rounded-md text-[10px] font-montserrat font-bold uppercase transition-colors"
            >
              📄 PDF
            </button>
            <button
              onClick={e => { e.stopPropagation(); if (confirm('Excluir esta ficha?')) onDelete(entry.id); }}
              className="ml-auto px-4 py-1.5 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-md text-[10px] font-montserrat font-bold uppercase transition-colors"
            >
              🗑 Excluir
            </button>
          </div>
        </div>
      </div>

      {/* Image menu overlay */}
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

              {/* AI generate section */}
              <div className="border-t border-border pt-3 mt-1">
                <label className="block text-[10px] uppercase tracking-wider text-text-dim font-montserrat mb-1.5">✨ Gerar imagem com IA</label>
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
                    {generatingAi ? '⏳ Gerando…' : '✨ Gerar'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
