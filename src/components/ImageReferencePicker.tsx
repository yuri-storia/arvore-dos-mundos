import React, { useRef, useState } from 'react';
import { ImagePlus, X, Upload, Library, Image as ImageIcon, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { optimizeImage } from '@/lib/imageOptimizer';
import { toast } from 'sonner';
import type { GalleryImage } from '@/lib/data';
import type { CodexEntry } from '@/hooks/useCodexEntries';

export type RefIntent = 'estilo' | 'composicao' | 'ambientacao' | 'personagem' | 'paleta';

export interface PickedReference {
  id: string;
  url: string;
  intent: RefIntent;
  label: string;
}

interface Props {
  value: PickedReference[];
  onChange: (refs: PickedReference[]) => void;
  gallery: GalleryImage[];
  codexEntries: CodexEntry[];
  max?: number;
}

export const INTENT_LABELS: Record<RefIntent, string> = {
  estilo: 'Estilo',
  composicao: 'Composição',
  ambientacao: 'Ambientação',
  personagem: 'Personagem',
  paleta: 'Paleta de cores',
};

const INTENT_HINTS: Record<RefIntent, string> = {
  estilo: 'Copiar técnica artística, pincelada e tratamento de cor',
  composicao: 'Copiar enquadramento, ângulo e perspectiva',
  ambientacao: 'Copiar iluminação, clima e atmosfera',
  personagem: 'Manter aparência do personagem/sujeito',
  paleta: 'Extrair e aplicar as cores dominantes',
};

const INTENT_ORDER: RefIntent[] = ['estilo', 'composicao', 'ambientacao', 'personagem', 'paleta'];

export const ImageReferencePicker: React.FC<Props> = ({ value, onChange, gallery, codexEntries, max = 3 }) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'galeria' | 'codex' | 'enviar'>('galeria');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const codexWithImages = codexEntries.filter(e => !!e.image_url);
  const sortedGallery = gallery.filter(g => g.status !== 'unsorted');

  const canAdd = value.length < max;

  const addRef = (url: string, label: string) => {
    if (!canAdd) { toast.error(`Máximo de ${max} referências`); return; }
    if (value.some(r => r.url === url)) { toast.message('Esta imagem já foi adicionada'); return; }
    onChange([...value, { id: crypto.randomUUID(), url, label, intent: 'estilo' }]);
    setOpen(false);
  };

  const removeRef = (id: string) => onChange(value.filter(r => r.id !== id));

  const setIntent = (id: string, intent: RefIntent) =>
    onChange(value.map(r => (r.id === id ? { ...r, intent } : r)));

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !user) return;
    const file = files[0];
    if (!/image\/(png|jpe?g|webp)/.test(file.type)) { toast.error('Use PNG, JPG ou WEBP'); return; }
    setUploading(true);
    try {
      const opt = await optimizeImage(file);
      const ext = opt.name.split('.').pop() || 'webp';
      const path = `${user.id}/ref-${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('codex-images').upload(path, opt, {
        cacheControl: '31536000',
        contentType: opt.type || 'image/webp',
      });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('codex-images').getPublicUrl(path);
      addRef(publicUrl, file.name.replace(/\.[^.]+$/, '').slice(0, 30) || 'Referência');
    } catch (e: any) {
      toast.error(e.message || 'Falha ao enviar imagem');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-[11px] uppercase tracking-wider text-gold-light font-montserrat font-bold">
          Referências visuais <span className="text-text-dim/70 normal-case font-normal">(opcional · até {max})</span>
        </label>
        {value.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-[10px] font-montserrat text-text-dim hover:text-red-alert transition-colors"
          >
            Limpar
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {value.map(r => (
          <div
            key={r.id}
            className="relative w-[110px] sm:w-[120px] rounded-md overflow-hidden border border-gold/25 bg-background/60"
          >
            <img src={r.url} alt={r.label} className="w-full h-[80px] sm:h-[88px] object-cover" />
            <button
              type="button"
              onClick={() => removeRef(r.id)}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-alert/90 text-white flex items-center justify-center"
              aria-label="Remover referência"
            >
              <X className="w-3 h-3" strokeWidth={2.5} />
            </button>
            <select
              value={r.intent}
              onChange={e => setIntent(r.id, e.target.value as RefIntent)}
              title={INTENT_HINTS[r.intent]}
              className="w-full bg-[rgba(2,7,13,0.95)] border-t border-gold/20 px-1.5 py-1 text-[10px] text-gold-light font-montserrat font-bold focus:outline-none"
            >
              {INTENT_ORDER.map(i => (
                <option key={i} value={i}>{INTENT_LABELS[i]}</option>
              ))}
            </select>
          </div>
        ))}

        {canAdd && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="w-[110px] sm:w-[120px] h-[108px] sm:h-[116px] rounded-md border-2 border-dashed border-gold/25 hover:border-gold/50 hover:bg-gold/[0.04] transition-all flex flex-col items-center justify-center gap-1 text-gold-light/80"
          >
            <ImagePlus className="w-5 h-5" strokeWidth={1.75} />
            <span className="text-[10px] font-montserrat font-bold uppercase tracking-wider">Adicionar</span>
          </button>
        )}
      </div>

      {value.length > 0 && (
        <p className="text-[10px] font-merriweather italic text-text-dim/80 leading-snug">
          Idriel usará cada referência apenas para o que você marcar (estilo, composição, ambientação, personagem ou paleta).
        </p>
      )}

      {/* Picker modal */}
      {open && (
        <div className="fixed inset-0 z-[120] bg-black/70 flex items-center justify-center p-3 sm:p-4" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-2xl rounded-lg border border-gold/30 shadow-2xl animate-fadeUp"
            style={{ background: 'hsl(var(--bg-deep) / 0.98)', backdropFilter: 'blur(16px)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gold/15">
              <h3 className="font-cinzel font-bold text-sm text-gold-light inline-flex items-center gap-2">
                <Sparkles className="w-4 h-4" strokeWidth={1.75} />Adicionar referência
              </h3>
              <button onClick={() => setOpen(false)} className="text-text-dim hover:text-foreground p-1" aria-label="Fechar">
                <X className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>

            <div className="flex border-b border-gold/15">
              {([
                { id: 'galeria', label: 'Galeria', Icon: ImageIcon },
                { id: 'codex', label: 'Codex', Icon: Library },
                { id: 'enviar', label: 'Enviar nova', Icon: Upload },
              ] as const).map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 px-3 py-2.5 text-[11px] font-montserrat font-bold uppercase tracking-wider inline-flex items-center justify-center gap-1.5 transition-colors ${
                    tab === t.id
                      ? 'text-gold-light border-b-2 border-gold bg-gold/[0.06]'
                      : 'text-text-dim hover:text-foreground'
                  }`}
                >
                  <t.Icon className="w-3.5 h-3.5" strokeWidth={1.75} />{t.label}
                </button>
              ))}
            </div>

            <div className="p-4 max-h-[60vh] overflow-y-auto">
              {tab === 'galeria' && (
                sortedGallery.length === 0 ? (
                  <p className="text-center py-8 text-sm text-text-dim font-merriweather italic">Sua galeria está vazia. Envie imagens primeiro ou use a aba "Enviar nova".</p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {sortedGallery.map(img => (
                      <button
                        key={img.id}
                        onClick={() => addRef(img.src, img.name)}
                        className="group relative rounded overflow-hidden border border-gold/20 hover:border-gold/60 transition-all"
                      >
                        <img src={img.src} alt={img.name} className="w-full h-[80px] object-cover" />
                        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 py-1 text-[9px] text-foreground font-montserrat truncate text-left">
                          {img.name}
                        </span>
                      </button>
                    ))}
                  </div>
                )
              )}

              {tab === 'codex' && (
                codexWithImages.length === 0 ? (
                  <p className="text-center py-8 text-sm text-text-dim font-merriweather italic">Nenhuma ficha do Codex tem imagem ainda.</p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {codexWithImages.map(e => (
                      <button
                        key={e.id}
                        onClick={() => addRef(e.image_url!, e.title)}
                        className="group relative rounded overflow-hidden border border-gold/20 hover:border-gold/60 transition-all"
                      >
                        <img src={e.image_url!} alt={e.title} className="w-full h-[80px] object-cover" />
                        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 py-1 text-[9px] text-foreground font-montserrat truncate text-left">
                          {e.title}
                        </span>
                      </button>
                    ))}
                  </div>
                )
              )}

              {tab === 'enviar' && (
                <div className="py-4">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={e => handleUpload(e.target.files)}
                  />
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => fileRef.current?.click()}
                    className="w-full border-2 border-dashed border-gold/30 rounded-lg p-8 text-center hover:border-gold/60 transition-colors disabled:opacity-50"
                  >
                    <Upload className="w-7 h-7 mx-auto mb-2 text-gold-champagne" strokeWidth={1.75} />
                    <p className="text-sm text-gold-light font-montserrat font-bold">
                      {uploading ? 'Enviando…' : 'Clique para enviar uma imagem'}
                    </p>
                    <p className="text-xs text-text-dim font-merriweather italic mt-1">PNG, JPG ou WEBP</p>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
