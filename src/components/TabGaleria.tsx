import React, { useState, useRef } from 'react';
import { FRUITS, GalleryImage } from '@/lib/data';
import { ImageLightbox } from '@/components/ImageLightbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import idrielAvatar from '@/assets/idriel-avatar.png';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Props {
  gallery: GalleryImage[];
  setGallery: (g: GalleryImage[]) => void;
}

export const TabGaleria: React.FC<Props> = ({ gallery, setGallery }) => {
  const { user } = useAuth();
  const [filter, setFilter] = useState('Todos');
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = filter === 'Todos' ? gallery : gallery.filter(img => img.cat === filter);

  const [batchCat, setBatchCat] = useState(FRUITS[0].name);
  const [batchUploading, setBatchUploading] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ done: 0, total: 0 });

  const handleFiles = async (files: FileList | null) => {
    if (!files || !user) return;
    const items = Array.from(files).filter(f => /image\/(png|jpe?g|webp)/.test(f.type));
    if (items.length === 0) return;

    setBatchUploading(true);
    setBatchProgress({ done: 0, total: items.length });
    const newImages: GalleryImage[] = [];

    for (let i = 0; i < items.length; i++) {
      const file = items[i];
      try {
        const ext = file.name.split('.').pop() || 'webp';
        const path = `${user.id}/gallery-${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from('codex-images').upload(path, file);
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('codex-images').getPublicUrl(path);
        newImages.push({
          id: `${Date.now()}-${i}`,
          src: publicUrl,
          name: file.name.replace(/\.[^.]+$/, ''),
          cat: batchCat,
        });
      } catch (err: any) {
        toast.error(`Erro em "${file.name}": ${err.message || 'falha'}`);
      }
      setBatchProgress({ done: i + 1, total: items.length });
    }

    if (newImages.length > 0) {
      setGallery([...gallery, ...newImages]);
      toast.success(`${newImages.length} visão(ões) adicionada(s)!`);
    }
    setBatchUploading(false);
  };

  const removeImage = (id: string) => setGallery(gallery.filter(img => img.id !== id));

  return (
    <div className="animate-fadeUp mx-auto max-w-[1060px] px-3 sm:px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-gold/50 shadow-[0_0_12px_rgba(218,165,32,0.3)] shrink-0">
            <img src={idrielAvatar} alt="Idriel" className="w-full h-full object-cover object-top" />
          </div>
          <div>
            <h1 className="font-cinzel font-bold text-xl sm:text-2xl text-foreground mb-0.5">🌿 Galeria de Visões</h1>
            <p className="font-merriweather italic text-gold-light/70 text-sm">Visões materializadas por Idriel através da Seiva Dourada</p>
          </div>
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          className="px-4 py-2 bg-gold hover:bg-gold-light text-background rounded-md text-xs font-montserrat font-bold uppercase tracking-wider transition-colors"
        >
          + Adicionar Visão
        </button>
      </div>

      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />

      {/* Upload zone with batch category selector */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-5">
        <div
          onClick={() => !batchUploading && fileRef.current?.click()}
          className={`flex-1 border-2 border-dashed border-gold/20 rounded-lg p-5 text-center cursor-pointer hover:border-gold/40 transition-colors ${batchUploading ? 'opacity-50 pointer-events-none' : ''}`}
        >
          <span className="text-2xl mb-1 block">🌿</span>
          <p className="text-sm text-gold-light font-montserrat">
            {batchUploading ? `Enviando ${batchProgress.done}/${batchProgress.total}…` : 'Clique ou arraste para adicionar visões'}
          </p>
          <p className="text-xs text-text-dim font-merriweather italic">PNG, JPG, WEBP — múltiplos arquivos (upload direto)</p>
        </div>
        <div className="sm:w-[180px]">
          <label className="block text-[10px] uppercase tracking-wider text-text-dim font-montserrat font-bold mb-1">Categoria do upload</label>
          <Select value={batchCat} onValueChange={setBatchCat}>
            <SelectTrigger className="bg-background/60 border-gold/20 text-sm font-merriweather">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FRUITS.map(f => (
                <SelectItem key={f.id} value={f.name}>{f.icon} {f.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Filters — dropdown */}
      <div className="flex items-center gap-3 mb-5">
        <span className="text-[10px] uppercase tracking-wider text-text-dim font-montserrat font-bold">Filtrar:</span>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px] bg-background/60 border-gold/20 text-sm font-merriweather">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Todos">🌳 Todos</SelectItem>
            {FRUITS.map(f => (
              <SelectItem key={f.id} value={f.name}>{f.icon} {f.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filter !== 'Todos' && (
          <button onClick={() => setFilter('Todos')} className="text-[10px] text-text-dim hover:text-foreground font-montserrat transition-colors">✕ Limpar</button>
        )}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gold/10 flex items-center justify-center">
            <span className="text-3xl">🖼️</span>
          </div>
          <h3 className="font-cinzel font-bold text-lg text-foreground mb-2">
            {gallery.length === 0 ? 'Sua galeria está vazia' : 'Nenhuma visão nesta categoria'}
          </h3>
          <p className="font-merriweather text-sm text-text-dim mb-4 max-w-md mx-auto">
            {gallery.length === 0
              ? 'Adicione referências visuais do seu mundo ou gere imagens com Idriel na aba "Gerar Imagens".'
              : 'Tente um filtro diferente ou adicione novas imagens.'}
          </p>
          {gallery.length === 0 && (
            <button onClick={() => fileRef.current?.click()}
              className="px-4 py-2 rounded-md text-xs font-montserrat font-bold uppercase tracking-wider border border-gold/30 text-gold-light bg-gold/[0.08] hover:bg-gold/[0.18] transition-all">
              🌿 Adicionar primeira visão
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
          {filtered.map(img => (
            <div
              key={img.id}
              className="group relative rounded-lg overflow-hidden border border-gold/15 hover:border-gold/40 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(218,165,32,0.15)] transition-all"
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

    </div>
  );
};
