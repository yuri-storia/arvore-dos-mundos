import React, { useState, useRef } from 'react';
import { FRUITS, GalleryImage } from '@/lib/data';
import { ImageLightbox } from '@/components/ImageLightbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import idrielAvatar from '@/assets/idriel-avatar.png';

interface Props {
  gallery: GalleryImage[];
  setGallery: (g: GalleryImage[]) => void;
}

export const TabGaleria: React.FC<Props> = ({ gallery, setGallery }) => {
  const { user } = useAuth();
  const [filter, setFilter] = useState('Todos');
  const [uploadQueue, setUploadQueue] = useState<{ file: File; name: string; cat: string }[]>([]);
  const [currentUpload, setCurrentUpload] = useState<{ file: File; name: string; cat: string; preview: string } | null>(null);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = filter === 'Todos' ? gallery : gallery.filter(img => img.cat === filter);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const items = Array.from(files).filter(f => /image\/(png|jpe?g|webp)/.test(f.type));
    if (items.length === 0) return;
    const queue = items.map(f => ({
      file: f,
      name: f.name.replace(/\.[^.]+$/, ''),
      cat: FRUITS[0].name,
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

  const saveUpload = async () => {
    if (!currentUpload || !user) return;
    setSaving(true);
    try {
      // Upload file to storage
      const ext = currentUpload.file.name.split('.').pop() || 'webp';
      const path = `${user.id}/gallery-${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('codex-images').upload(path, currentUpload.file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('codex-images').getPublicUrl(path);

      const newImg: GalleryImage = {
        id: Date.now().toString(),
        src: publicUrl,
        name: currentUpload.name,
        cat: currentUpload.cat,
      };
      URL.revokeObjectURL(currentUpload.preview);
      setGallery([...gallery, newImg]);
      processQueue(uploadQueue);
    } catch (err: any) {
      toast.error('Erro ao enviar imagem: ' + (err.message || 'Tente novamente'));
    } finally {
      setSaving(false);
    }
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
          className="px-4 py-2 bg-blue-main hover:bg-blue-bright text-foreground rounded-md text-xs font-montserrat font-bold uppercase tracking-wider transition-colors"
        >
          + Adicionar
        </button>
      </div>

      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />

      {/* Upload zone */}
      <div
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-blue-bright/25 rounded-lg p-6 sm:p-8 text-center mb-5 cursor-pointer hover:border-blue-bright/50 transition-colors"
      >
        <span className="text-3xl mb-2 block">🖼</span>
        <p className="text-sm text-text-secondary font-montserrat">Clique para adicionar imagens</p>
        <p className="text-xs text-text-dim">PNG, JPG, WEBP — múltiplos arquivos</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        <button
          onClick={() => setFilter('Todos')}
          className={`px-2.5 py-1 rounded-full text-[10px] font-montserrat font-bold uppercase transition-colors ${
            filter === 'Todos'
              ? 'bg-accent/20 text-accent-foreground border border-accent/40'
              : 'text-text-dim border border-transparent hover:border-accent/20'
          }`}
        >
          Todos
        </button>
        {FRUITS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.name)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-montserrat font-bold uppercase transition-colors ${
              filter === f.name
                ? 'bg-accent/20 text-accent-foreground border border-accent/40'
                : 'text-text-dim border border-transparent hover:border-accent/20'
            }`}
          >
            {f.icon} {f.name}
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
              className="group relative rounded-lg overflow-hidden border border-blue-bright/15 hover:border-blue-bright/40 hover:-translate-y-0.5 hover:shadow-lg transition-all"
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
              className="w-full bg-background/60 border border-blue-bright/20 rounded-md px-3 py-2 text-sm text-foreground mb-3 focus:outline-none focus:border-blue-bright/50"
            />
            <select
              value={currentUpload.cat}
              onChange={e => setCurrentUpload({ ...currentUpload, cat: e.target.value })}
              className="w-full bg-background/60 border border-blue-bright/20 rounded-md px-3 py-2 text-sm text-foreground mb-4 focus:outline-none focus:border-blue-bright/50"
            >
              {FRUITS.map(f => <option key={f.id} value={f.name}>{f.icon} {f.name}</option>)}
            </select>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setCurrentUpload(null); setUploadQueue([]); }}
                className="px-4 py-2 rounded-md text-xs font-montserrat text-text-dim border border-blue-bright/15 hover:text-foreground transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveUpload}
                disabled={saving}
                className="px-4 py-2 bg-blue-main hover:bg-blue-bright text-foreground rounded-md text-xs font-montserrat font-bold transition-colors disabled:opacity-50"
              >
                {saving ? '⏳ Enviando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
