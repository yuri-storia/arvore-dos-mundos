import React, { useState, useRef } from 'react';
import { FRUITS, STYLE_OPTIONS, IMAGE_TYPE_OPTIONS, TONE_OPTIONS, GalleryImage } from '@/lib/data';
import { ImageLightbox } from '@/components/ImageLightbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { callAIText, callAIImage } from '@/lib/helpers';
import { useSubscription } from '@/hooks/useSubscription';
import idrielAvatar from '@/assets/idriel-avatar.png';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Lock, ChevronDown, ChevronUp } from 'lucide-react';
import type { AppState } from '@/lib/data';

interface Props {
  gallery: GalleryImage[];
  setGallery: (g: GalleryImage[]) => void;
  state: AppState;
  setGeneratedPrompt: (p: string) => void;
  addToGallery: (img: GalleryImage) => void;
}

export const TabGaleria: React.FC<Props> = ({ gallery, setGallery, state, setGeneratedPrompt, addToGallery }) => {
  const { user } = useAuth();
  const sub = useSubscription();
  const [filter, setFilter] = useState('Todos');
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = filter === 'Todos' ? gallery : gallery.filter(img => img.cat === filter);

  const [batchCat, setBatchCat] = useState(FRUITS[0].name);
  const [batchUploading, setBatchUploading] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ done: 0, total: 0 });

  // Image generation state
  const [showGenerator, setShowGenerator] = useState(true);
  const { worldName, db, generatedPrompt } = state;
  const [desc, setDesc] = useState('');
  const [style, setStyle] = useState(STYLE_OPTIONS[0]);
  const [imgType, setImgType] = useState(IMAGE_TYPE_OPTIONS[0]);
  const [tone, setTone] = useState(TONE_OPTIONS[0]);
  const [extras, setExtras] = useState('');
  const [loading1, setLoading1] = useState(false);
  const [loading2, setLoading2] = useState(false);
  const [generatedImage, setGeneratedImage] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveCat, setSaveCat] = useState('Todos');

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

  // --- Image generation logic ---
  const buildContext = () => {
    const parts: string[] = [];
    if (worldName) parts.push(`World: ${worldName}`);
    FRUITS.slice(0, 6).forEach(f => {
      const data = db[f.id];
      if (!data) return;
      const vals = f.fields.map(ff => data[ff.id]).filter(Boolean);
      if (vals.length > 0) parts.push(`${f.name}: ${vals.join('; ')}`);
    });
    return parts.join('\n');
  };

  const handleCreatePrompt = async () => {
    if (!sub.hasIdriel) return;
    if (!desc.trim()) { setError('Descreva a visão que deseja materializar.'); return; }
    setError('');
    setLoading1(true);
    try {
      const ctx = buildContext();
      const systemPrompt = 'You are an expert at writing image generation prompts. Respond ONLY with the prompt in English. Be specific about visual details, lighting, composition, and artistic style.';
      const userMsg = `World context:\n${ctx}\n\nDescription: ${desc}\nVisual style: ${style}\nImage type: ${imgType}\nTone/Lighting: ${tone}\n${extras ? `Extra details: ${extras}` : ''}`;
      const result = await callAIText([{ role: 'user', content: userMsg }], systemPrompt);
      setGeneratedPrompt(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading1(false);
    }
  };

  const handleGenerate = async () => {
    if (!sub.hasIdriel || !generatedPrompt) return;
    setError('');
    setLoading2(true);
    try {
      const url = await callAIImage(generatedPrompt);
      setGeneratedImage(url);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading2(false);
    }
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(generatedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const confirmSave = () => {
    if (!generatedImage) return;
    addToGallery({
      id: Date.now().toString(),
      src: generatedImage,
      name: desc.slice(0, 40) || 'Visão de Idriel',
      cat: saveCat === 'Todos' ? 'Geral' : saveCat,
    });
    setShowSaveModal(false);
  };

  return (
    <div className="animate-fadeUp mx-auto max-w-[1060px] px-3 sm:px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-gold/50 shadow-[0_0_12px_rgba(218,165,32,0.3)] shrink-0">
            <img src={idrielAvatar} alt="Idriel" className="w-full h-full object-cover object-top" />
          </div>
          <div>
            <h1 className="font-cinzel font-bold text-xl sm:text-2xl text-foreground mb-0.5">🎨 Galeria de Visões</h1>
            <p className="font-merriweather italic text-gold-light/70 text-sm">Referências visuais e visões materializadas por Idriel</p>
          </div>
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          className="px-4 py-2 bg-gold hover:bg-gold-light text-background rounded-md text-xs font-montserrat font-bold uppercase tracking-wider transition-colors"
        >
          + Adicionar Imagem
        </button>
      </div>

      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />

      {/* Upload zone */}
      <div data-tour="gallery-upload" className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-5">
        <div
          onClick={() => !batchUploading && fileRef.current?.click()}
          className={`flex-1 border-2 border-dashed border-gold/20 rounded-lg p-5 text-center cursor-pointer hover:border-gold/40 transition-colors ${batchUploading ? 'opacity-50 pointer-events-none' : ''}`}
        >
          <span className="text-2xl mb-1 block">🖼️</span>
          <p className="text-sm text-gold-light font-montserrat">
            {batchUploading ? `Enviando ${batchProgress.done}/${batchProgress.total}…` : 'Clique ou arraste para adicionar imagens'}
          </p>
          <p className="text-xs text-text-dim font-merriweather italic">PNG, JPG, WEBP — múltiplos arquivos</p>
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

      {/* Filters */}
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
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gold/10 flex items-center justify-center">
            <span className="text-3xl">🖼️</span>
          </div>
          <h3 className="font-cinzel font-bold text-lg text-foreground mb-2">
            {gallery.length === 0 ? 'Sua galeria está vazia' : 'Nenhuma visão nesta categoria'}
          </h3>
          <p className="font-merriweather text-sm text-text-dim mb-4 max-w-md mx-auto">
            {gallery.length === 0
              ? 'Faça upload de referências visuais ou gere imagens com Idriel abaixo.'
              : 'Tente um filtro diferente ou adicione novas imagens.'}
          </p>
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

      {/* ====== DIVIDER: Visões de Idriel ====== */}
      <div className="mt-10 mb-6">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
          <button
            onClick={() => setShowGenerator(!showGenerator)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-gold/30 bg-gold/[0.06] hover:bg-gold/[0.12] transition-all group"
          >
            <Sparkles className="w-4 h-4 text-gold-light" />
            <span className="font-cinzel text-sm text-gold-light font-bold">Visões de Idriel</span>
            {showGenerator ? <ChevronUp className="w-4 h-4 text-gold-light/60" /> : <ChevronDown className="w-4 h-4 text-gold-light/60" />}
          </button>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
        </div>
        <p className="text-center font-merriweather italic text-text-dim text-xs mt-2">
          Idriel canaliza a Seiva Dourada para materializar as visões do seu mundo
        </p>
      </div>

      {showGenerator && (
        <div className="animate-fadeUp">
          {/* Idriel lock CTA — Fruto Dourado Trancado */}
          {!sub.hasIdriel ? (
            <div className="relative rounded-xl overflow-hidden border border-gold/20 mb-6">
              {/* Blurred preview background */}
              <div className="absolute inset-0 bg-gradient-to-br from-gold/[0.04] via-background/80 to-gold/[0.02]" />
              <div className="relative p-6 sm:p-8 text-center">
                {/* Golden Fruit icon */}
                <div className="relative w-20 h-20 mx-auto mb-4">
                  <div className="absolute inset-0 rounded-full bg-gold/10 animate-pulse" />
                  <div className="relative w-full h-full rounded-full bg-gradient-to-br from-gold/20 to-gold/5 border-2 border-gold/30 flex items-center justify-center shadow-[0_0_30px_rgba(218,165,32,0.15)]">
                    <div className="relative">
                      <span className="text-4xl">🍊</span>
                      <Lock className="absolute -bottom-1 -right-1 w-5 h-5 text-gold-light drop-shadow-lg" />
                    </div>
                  </div>
                </div>

                <h3 className="font-cinzel font-bold text-lg text-gold-light mb-2">
                  O Fruto Dourado aguarda…
                </h3>
                <div className="max-w-md mx-auto mb-5">
                  <div className="flex items-start gap-3 text-left bg-gold/[0.04] rounded-lg p-3 border border-gold/10">
                    <img src={idrielAvatar} alt="Idriel" className="w-8 h-8 rounded-full border border-gold/30 shrink-0 mt-0.5" />
                    <p className="font-merriweather text-sm text-text-secondary leading-relaxed italic">
                      "Querido criador, a Seiva Dourada flui dentro deste Fruto. Com ela, posso materializar as visões do seu mundo em imagens, analisar sua criação e guiá-lo com toda minha sabedoria. Basta colher o Fruto."
                    </p>
                  </div>
                </div>

                {/* Powers preview */}
                <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto mb-5">
                  {[
                    { icon: '🎨', label: 'Gerar imagens', cost: '5 gotas' },
                    { icon: '📊', label: 'Análise do mundo', cost: '2 gotas' },
                    { icon: '🌿', label: 'Consultar Idriel', cost: '1 gota' },
                  ].map(p => (
                    <div key={p.label} className="rounded-lg p-2.5 bg-gold/[0.04] border border-gold/10 opacity-70">
                      <span className="text-xl block mb-1">{p.icon}</span>
                      <p className="text-[10px] font-montserrat font-bold text-gold-light/80">{p.label}</p>
                      <p className="text-[9px] text-text-dim">{p.cost}</p>
                    </div>
                  ))}
                </div>

                <button
                  onClick={async () => { const { openCheckout, STRIPE_PLANS } = await import('@/hooks/useSubscription'); openCheckout(STRIPE_PLANS.idriel_mensal.price_id); }}
                  className="px-6 py-3 rounded-full text-sm font-montserrat font-bold uppercase tracking-wider bg-gradient-to-r from-gold to-gold-light text-background hover:shadow-[0_0_24px_rgba(218,165,32,0.3)] transition-all"
                >
                  ✨ Colher o Fruto Dourado — R$ 29,90/mês
                </button>
                <p className="text-[10px] text-text-dim mt-2 font-montserrat">100 gotas de Seiva Dourada por mês</p>
              </div>
            </div>
          ) : (
            /* Image generation form */
            <div className="card-glass rounded-lg p-5 mb-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-gold-light font-montserrat font-bold mb-1.5">Descreva sua visão em português</label>
                  <textarea
                    value={desc}
                    onChange={e => setDesc(e.target.value)}
                    placeholder="Ex: A capital do meu reino élfico ao entardecer, com torres de cristal brilhando sob a luz dourada…"
                    rows={3}
                    className="w-full bg-[rgba(4,12,24,0.6)] border border-gold/15 border-b-gold/30 rounded-md px-3 py-2 text-sm text-foreground font-merriweather placeholder:italic placeholder:text-text-dim/70 focus:outline-none focus:border-gold/50 resize-y"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-gold-light font-montserrat font-bold mb-1.5">Estilo Visual</label>
                    <select value={style} onChange={e => setStyle(e.target.value)} className="w-full bg-[rgba(4,12,24,0.6)] border border-gold/15 border-b-gold/30 rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-gold/50">
                      {STYLE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-gold-light font-montserrat font-bold mb-1.5">Tipo de Imagem</label>
                    <select value={imgType} onChange={e => setImgType(e.target.value)} className="w-full bg-[rgba(4,12,24,0.6)] border border-gold/15 border-b-gold/30 rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-gold/50">
                      {IMAGE_TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-gold-light font-montserrat font-bold mb-1.5">Tom / Iluminação</label>
                    <select value={tone} onChange={e => setTone(e.target.value)} className="w-full bg-[rgba(4,12,24,0.6)] border border-gold/15 border-b-gold/30 rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-gold/50">
                      {TONE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-gold-light font-montserrat font-bold mb-1.5">Detalhes extras (opcional)</label>
                  <input
                    type="text"
                    value={extras}
                    onChange={e => setExtras(e.target.value)}
                    placeholder="Cores, elementos obrigatórios, atmosfera…"
                    className="w-full bg-[rgba(4,12,24,0.6)] border border-gold/15 border-b-gold/30 rounded-md px-3 py-2 text-sm text-foreground font-merriweather placeholder:italic placeholder:text-text-dim/70 focus:outline-none focus:border-gold/50"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-5">
                <button
                  onClick={handleCreatePrompt}
                  disabled={loading1}
                  className="px-4 py-2 rounded-md text-xs font-montserrat font-bold uppercase tracking-wider border border-gold text-gold-light hover:bg-gold/10 disabled:opacity-40 transition-all"
                >
                  {loading1 ? '🌿 Idriel está tecendo…' : '🌿 1. Pedir Visão a Idriel'}
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={loading2 || !generatedPrompt}
                  className="px-4 py-2 rounded-md text-xs font-montserrat font-bold uppercase tracking-wider bg-gold hover:bg-gold-light text-background disabled:opacity-40 transition-all"
                >
                  {loading2 ? '✨ Materializando…' : '✨ 2. Materializar Visão'}
                </button>
              </div>

              {error && <p className="text-red-alert text-sm mt-3">{error}</p>}

              {(loading1 || loading2) && (
                <div className="mt-4 animate-fadeUp">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gold/60 shadow-[0_0_16px_rgba(218,165,32,0.4)]">
                        <img src={idrielAvatar} alt="Idriel" className="w-full h-full object-cover object-top" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <span className="font-merriweather italic text-xs text-gold-light">
                        {loading1 ? 'Idriel está tecendo a essência da sua visão…' : 'A Seiva Dourada flui… sua visão está tomando forma…'}
                      </span>
                      <div className="w-full h-1.5 bg-gold/10 rounded-full overflow-hidden mt-1.5">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-gold/60 via-gold to-gold/60 animate-[shimmer_2s_ease-in-out_infinite]"
                          style={{ width: loading1 ? '60%' : '80%', transition: 'width 3s ease-out', backgroundSize: '200% 100%' }}
                        />
                      </div>
                      <p className="text-[9px] text-text-dim/50 mt-1 font-montserrat">
                        {loading1 ? 'Etapa 1/2 — Criando prompt' : 'Etapa 2/2 — Gerando imagem (até 30s)'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Generated prompt */}
          {generatedPrompt && !loading1 && sub.hasIdriel && (
            <div className="animate-fadeUp card-glass rounded-lg p-5 mb-5 border border-gold/20">
              <span className="font-cinzel text-[10px] text-gold-light block mb-2">🌿 Visão tecida por Idriel</span>
              <p className="font-merriweather text-sm text-foreground whitespace-pre-wrap leading-relaxed mb-4">{generatedPrompt}</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={copyPrompt} className="px-3 py-1.5 rounded-md text-xs font-montserrat border border-gold/30 text-text-secondary hover:text-foreground transition-colors">
                  {copied ? '✓ Copiado!' : '📋 Copiar para Midjourney / Leonardo'}
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={loading2}
                  className="px-3 py-1.5 rounded-md text-xs font-montserrat bg-gold hover:bg-gold-light text-background disabled:opacity-40 transition-colors"
                >
                  ✨ Materializar Visão
                </button>
              </div>
            </div>
          )}

          {/* Generated image */}
          {generatedImage && !loading2 && (
            <div className="animate-fadeUp card-glass rounded-lg p-5 border border-gold/20">
              <span className="font-cinzel text-[10px] text-gold-light block mb-3">✨ Visão materializada pela Seiva Dourada</span>
              <img src={generatedImage} alt="Visão de Idriel" className="w-full max-w-[512px] mx-auto rounded-lg mb-4" />
              <div className="flex flex-wrap gap-2 justify-center">
                <button onClick={() => { setSaveCat('Todos'); setShowSaveModal(true); }} className="px-4 py-2 bg-gold hover:bg-gold-light text-background rounded-md text-xs font-montserrat font-bold transition-colors">
                  💾 Guardar na Galeria
                </button>
                <a href={generatedImage} download target="_blank" rel="noopener" className="px-4 py-2 rounded-md text-xs font-montserrat border border-gold/30 text-text-secondary hover:text-foreground transition-colors">
                  ⬇ Baixar
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Save to gallery modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-3 sm:p-4">
          <div className="card-glass rounded-lg w-full max-w-sm p-5 animate-fadeUp border border-gold/20">
            <h3 className="font-cinzel font-bold text-foreground mb-1">Guardar Visão na Galeria</h3>
            <p className="font-merriweather text-xs text-text-dim italic mb-4">Em qual categoria deseja guardar esta visão?</p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              <button onClick={() => setSaveCat('Todos')} className={`px-2.5 py-1 rounded-full text-[10px] font-montserrat font-bold uppercase transition-colors ${saveCat === 'Todos' ? 'bg-gold/20 text-gold-light border border-gold/40' : 'text-text-dim border border-transparent hover:border-gold/20'}`}>Geral</button>
              {FRUITS.map(f => (
                <button key={f.id} onClick={() => setSaveCat(f.name)} className={`px-2.5 py-1 rounded-full text-[10px] font-montserrat font-bold uppercase transition-colors ${saveCat === f.name ? 'bg-gold/20 text-gold-light border border-gold/40' : 'text-text-dim border border-transparent hover:border-gold/20'}`}>
                  {f.icon} {f.name}
                </button>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowSaveModal(false)} className="px-4 py-2 rounded-md text-xs font-montserrat text-text-dim border border-border hover:text-foreground transition-colors">Cancelar</button>
              <button onClick={confirmSave} className="px-4 py-2 bg-gold hover:bg-gold-light text-background rounded-md text-xs font-montserrat font-bold transition-colors">💾 Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && <ImageLightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />}
    </div>
  );
};
