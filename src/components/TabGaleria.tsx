import React, { useState, useRef } from 'react';
import { CATEGORIES, GALLERY_CATEGORIES, FRUIT_CATEGORIES, GalleryImage } from '@/lib/data';
import { ImageLightbox } from '@/components/ImageLightbox';

interface Props {
  gallery: GalleryImage[];
  setGallery: (g: GalleryImage[]) => void;
}

export const TabGaleria: React.FC<Props> = ({ gallery, setGallery }) => {
  const [filter, setFilter] = useState('Todos');
  const [uploadQueue, setUploadQueue] = useState<{ file: File; name: string; cat: string }[]>([]);
  const [currentUpload, setCurrentUpload] = useState<{ file: File; name: string; cat: string; preview: string } | null>(null);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = filter === 'Todos' ? gallery : gallery.filter(img => img.cat === filter);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const items = Array.from(files).filter(f => /image\/(png|jpe?g|webp)/.test(f.type));
    if (items.length === 0) return;
    const queue = items.map(f => ({
      file: f,
      name: f.name.replace(/\.[^.]+$/, ''),
      cat: 'Geral',
    }));
    processQueue(queue);
  };

  const processQueue = (queue: { file: File; name: string; cat: string }[]) => {
    if (queue.length === 0) { setCurrentUpload(null); return; }
    const item = queue[0];
    const remaining = queue.slice(1);
    setUploadQueue(remaining);
    const preview = URL.createObjectURL(item.file);
    setCurrentUpload({ ...item, preview });
  };

  const saveUpload = () => {
    if (!currentUpload) return;
    const newImg: GalleryImage = {
      id: Date.now().toString(),
      src: currentUpload.preview,
      name: currentUpload.name,
      cat: currentUpload.cat,
    };
    setGallery([...gallery, newImg]);
    processQueue(uploadQueue);
  };

  const removeImage = (id: string) => setGallery(gallery.filter(img => img.id !== id));

  return (
    <div className="animate-fadeUp mx-auto max-w-[1060px] px-3 sm:px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="font-cinzel font-bold text-xl sm:text-2xl text-foreground mb-1">🖼 Galeria de Referências</h1>
          <p className="font-merriweather italic text-text-dim text-sm">Imagens de referência para o seu mundo</p>
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          className="px-4 py-2 bg-amber hover:bg-amber-bright text-background rounded-md text-xs font-montserrat font-bold uppercase tracking-wider transition-colors"
        >
          + Adicionar
        </button>
      </div>

      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />

      {/* Upload zone */}
      <div
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-gold/20 rounded-lg p-6 sm:p-8 text-center mb-5 cursor-pointer hover:border-gold/40 transition-colors"
      >
        <span className="text-3xl mb-2 block">🖼</span>
        <p className="text-sm text-text-secondary font-montserrat">Clique para adicionar imagens</p>
        <p className="text-xs text-text-dim">PNG, JPG, WEBP — múltiplos arquivos</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-none">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-montserrat whitespace-nowrap transition-all ${
              filter === cat
                ? 'border border-gold text-gold-light bg-gold/[0.07]'
                : 'border border-gold/15 text-text-dim hover:text-text-secondary'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="text-center text-text-dim text-sm py-10">Nenhuma imagem na galeria ainda.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
          {filtered.map(img => (
            <div
              key={img.id}
              className="group relative rounded-lg overflow-hidden border border-gold/10 hover:border-gold/30 hover:-translate-y-0.5 hover:shadow-lg transition-all"
            >
              <img
                src={img.src}
                alt={img.name}
                className="w-full h-[100px] sm:h-[136px] object-cover cursor-zoom-in"
                onClick={() => setLightbox({ src: img.src, alt: img.name })}
              />
              <div className="p-2">
                <p className="text-xs text-foreground font-montserrat truncate">{img.name}</p>
                <p className="text-[10px] text-text-dim">{img.cat}</p>
              </div>
              <button
                onClick={() => removeImage(img.id)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-alert/80 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && <ImageLightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />}

      {/* Upload modal */}
      {currentUpload && (
        <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-3 sm:p-4">
          <div className="card-glass rounded-lg w-full max-w-sm sm:max-w-md p-4 sm:p-5 animate-fadeUp">
            <h3 className="font-cinzel font-bold text-foreground mb-3">Salvar Imagem</h3>
            <img src={currentUpload.preview} alt="Preview" className="w-full h-[120px] sm:h-[155px] object-cover rounded-md mb-3" />
            <input
              type="text"
              value={currentUpload.name}
              onChange={e => setCurrentUpload({ ...currentUpload, name: e.target.value })}
              placeholder="Nome da imagem"
              className="w-full bg-background/60 border border-gold/15 rounded-md px-3 py-2 text-sm text-foreground mb-3 focus:outline-none focus:border-gold/40"
            />
            <select
              value={currentUpload.cat}
              onChange={e => setCurrentUpload({ ...currentUpload, cat: e.target.value })}
              className="w-full bg-background/60 border border-gold/15 rounded-md px-3 py-2 text-sm text-foreground mb-4 focus:outline-none focus:border-gold/40"
            >
              <optgroup label="Categorias">
                {GALLERY_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </optgroup>
              <optgroup label="Vincular a Fruto">
                {FRUIT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </optgroup>
            </select>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setCurrentUpload(null); setUploadQueue([]); }}
                className="px-4 py-2 rounded-md text-xs font-montserrat text-text-dim border border-gold/15 hover:text-foreground transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveUpload}
                className="px-4 py-2 bg-amber hover:bg-amber-bright text-background rounded-md text-xs font-montserrat font-bold transition-colors"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
