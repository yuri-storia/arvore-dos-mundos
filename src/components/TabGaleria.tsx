import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FRUITS, STYLE_OPTIONS, IMAGE_TYPE_OPTIONS, TONE_OPTIONS, GalleryImage } from '@/lib/data';
import { ImageLightbox } from '@/components/ImageLightbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { callAIText, callAIImageConsistent, friendlyAIError } from '@/lib/helpers';
import { optimizeImage } from '@/lib/imageOptimizer';
import { useSubscription } from '@/hooks/useSubscription';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { useCodexEntries } from '@/hooks/useCodexEntries';
import { useIdrielVisions } from '@/hooks/useIdrielVisions';
import { useIdrielJobs } from '@/contexts/IdrielJobsContext';
import idrielAvatar from '@/assets/idriel-avatar.png';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Lock, ChevronDown, ChevronUp, Trash2, Palette, Leaf, ScrollText, Trees, X, Inbox, Save, Apple, BarChart3, Check, ClipboardCopy, ArrowDown, RotateCw, Image as ImageIcon } from 'lucide-react';
import { ImageReferencePicker, type PickedReference } from '@/components/ImageReferencePicker';
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
  const planLimits = usePlanLimits();
  const worldId = state.currentSaveId || undefined;
  const { entries: codexEntries } = useCodexEntries(worldId);
  const { visions, saveVision, updateVisionImage, deleteVision } = useIdrielVisions(worldId);
  const idrielJobs = useIdrielJobs();
  const [filter, setFilter] = useState('Todos');
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
  const [pickedRefs, setPickedRefs] = useState<PickedReference[]>([]);
  const [generatedImage, setGeneratedImage] = useState('');
  const promptJobKey = worldId ? `idriel:promptJob:${worldId}` : null;
  const imageJobKey = worldId ? `idriel:imageJob:${worldId}` : null;
  const visionKey = worldId ? `idriel:vision:${worldId}` : null;
  const [activePromptJobId, setActivePromptJobId] = useState<string | null>(() => promptJobKey ? localStorage.getItem(promptJobKey) : null);
  const [activeImageJobId, setActiveImageJobId] = useState<string | null>(() => imageJobKey ? localStorage.getItem(imageJobKey) : null);
  const [activeVisionId, setActiveVisionId] = useState<string | null>(() => visionKey ? localStorage.getItem(visionKey) : null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveCat, setSaveCat] = useState('Todos');
  const [showHistory, setShowHistory] = useState(true);

  // Read from persistent jobs (so switching tabs doesn't cancel)
  const promptJob = activePromptJobId ? idrielJobs.get<string>(activePromptJobId) : undefined;
  const imageJob = activeImageJobId ? idrielJobs.get<string>(activeImageJobId) : undefined;
  const loading1 = promptJob?.status === 'running';
  const loading2 = imageJob?.status === 'running';

  useEffect(() => {
    if (promptJob?.status === 'done' && typeof promptJob.result === 'string' && promptJob.result) {
      setGeneratedPrompt(promptJob.result);
    }
    if (promptJob?.status === 'error') {
      const f = friendlyAIError(promptJob.error || '');
      setError(`${f.title} ${f.hint}`);
    }
  }, [promptJob?.status, promptJob?.result, promptJob?.error, setGeneratedPrompt]);
  
  useEffect(() => {
    if (imageJob?.status === 'done' && imageJob.result) {
      setGeneratedImage(imageJob.result);
      if (activeVisionId) updateVisionImage(activeVisionId, imageJob.result);
    }
    if (imageJob?.status === 'error') {
      const f = friendlyAIError(imageJob.error || '');
      setError(`${f.title} ${f.hint}`);
    }
  }, [imageJob?.status, imageJob?.result, imageJob?.error, activeVisionId, updateVisionImage]);

  // Persist job ids per world so navigating away & back keeps the running session.
  useEffect(() => { if (promptJobKey) { activePromptJobId ? localStorage.setItem(promptJobKey, activePromptJobId) : localStorage.removeItem(promptJobKey); } }, [promptJobKey, activePromptJobId]);
  useEffect(() => { if (imageJobKey) { activeImageJobId ? localStorage.setItem(imageJobKey, activeImageJobId) : localStorage.removeItem(imageJobKey); } }, [imageJobKey, activeImageJobId]);
  useEffect(() => { if (visionKey) { activeVisionId ? localStorage.setItem(visionKey, activeVisionId) : localStorage.removeItem(visionKey); } }, [visionKey, activeVisionId]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || !user) return;
    if (!planLimits.canUploadGallery) {
      toast.error(
        planLimits.isExpired
          ? 'Sua assinatura expirou. Suas imagens ficam preservadas, mas para enviar novas é preciso reativar o plano.'
          : 'Adicionar imagens à Galeria requer um plano ativo. Faça upgrade para liberar.'
      );
      return;
    }
    const items = Array.from(files).filter(f => /image\/(png|jpe?g|webp)/.test(f.type));
    if (items.length === 0) return;

    setBatchUploading(true);
    setBatchProgress({ done: 0, total: items.length });
    const newImages: GalleryImage[] = [];

    for (let i = 0; i < items.length; i++) {
      const file = items[i];
      try {
        const optimized = await optimizeImage(file);
        const ext = optimized.name.split('.').pop() || 'webp';
        const path = `${user.id}/gallery-${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from('codex-images').upload(path, optimized, {
          cacheControl: '31536000',
          contentType: optimized.type || 'image/webp',
        });
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

  // --- Codex-aware context for Idriel ---
  // The Codex IS Idriel's brain — every name, every concept already written there
  // must inform the prompts she weaves and the images she materializes.
  const codexContext = useMemo(() => {
    if (!codexEntries || codexEntries.length === 0) return '';
    const mention = (raw: string) => raw && desc && new RegExp(`\\b${raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(desc);
    // Prioritize entries explicitly mentioned in the user's description
    const mentioned = codexEntries.filter(e => mention(e.title));
    const others = codexEntries.filter(e => !mentioned.includes(e));
    const ordered = [...mentioned, ...others].slice(0, 12);
    const lines = ordered.map(e => {
      const cleaned = (e.content || '').replace(/^__magictype__\n?/, '').replace(/\s+/g, ' ').trim().slice(0, 600);
      const fruit = e.fruit_id !== null ? FRUITS.find(f => f.id === e.fruit_id)?.name : null;
      const tag = e.entry_type === 'artigo' ? 'Artigo' : 'Ficha';
      return `- [${tag}${fruit ? ` · ${fruit}` : ''}] ${e.title}: ${cleaned}`;
    });
    return lines.join('\n');
  }, [codexEntries, desc]);

  const codexReferenceImageUrls = useMemo(() => {
    if (!codexEntries || codexEntries.length === 0) return [];
    const safeMention = (raw: string) => raw && desc && new RegExp(`\\b${raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(desc);
    const withImages = codexEntries.filter(e => e.entry_type !== 'artigo' && e.image_url);
    const mentioned = withImages.filter(e => safeMention(e.title));
    const others = withImages.filter(e => !mentioned.includes(e));
    return [...mentioned, ...others].slice(0, 5).map(e => e.image_url!);
  }, [codexEntries, desc]);

  const buildContext = () => {
    const parts: string[] = [];
    if (worldName) parts.push(`World: ${worldName}`);
    FRUITS.slice(0, 6).forEach(f => {
      const data = db[f.id];
      if (!data) return;
      const vals = f.fields.map(ff => data[ff.id]).filter(Boolean);
      if (vals.length > 0) parts.push(`${f.name}: ${vals.join('; ')}`);
    });
    if (codexContext) {
      parts.push('\n=== CODEX (canon — these names, characters and concepts already exist; honor them) ===');
      parts.push(codexContext);
    }
    return parts.join('\n');
  };

  const handleCreatePrompt = async () => {
    if (!planLimits.canUseAI) return;
    if (!desc.trim()) { setError('Descreva a visão que deseja materializar.'); return; }
    if (!worldId) { setError('Selecione um mundo antes de invocar Idriel.'); return; }
    setError('');
    const ctx = buildContext();
    const systemPrompt = 'You are an expert at writing image generation prompts. Respond ONLY with the prompt in English. The CODEX section lists canonical characters, places and concepts that already exist in this world — when the user references any of those names in their description, you MUST use the canonical descriptions provided (appearance, role, relationships) instead of inventing new ones. Be specific about visual details, lighting, composition, and artistic style.';
    const userMsg = `World context:\n${ctx}\n\nDescription: ${desc}\nVisual style: ${style}\nImage type: ${imgType}\nTone/Lighting: ${tone}\n${extras ? `Extra details: ${extras}` : ''}`;
    const jobId = `idriel-prompt-${Date.now()}`;
    setActivePromptJobId(jobId);
    idrielJobs.run({
      id: jobId,
      kind: 'prompt',
      label: `Tecendo: ${desc.slice(0, 40)}`,
      task: () => callAIText([{ role: 'user', content: userMsg }], systemPrompt),
    });
  };

  const handleGenerate = async () => {
    if (!planLimits.canUseAI || !generatedPrompt) return;
    if (!worldId) { setError('Selecione um mundo antes de materializar.'); return; }
    setError('');
    setGeneratedImage('');
    // Persist the vision row up front so it shows in history immediately
    const vision = await saveVision({
      description: desc,
      prompt: generatedPrompt,
      image_url: null,
      style,
      image_type: imgType,
      tone,
      extras,
    });
    setActiveVisionId(vision?.id || null);
    const jobId = `idriel-image-${Date.now()}`;
    setActiveImageJobId(jobId);
    const structured = pickedRefs.map(r => ({ url: r.url, intent: r.intent }));
    const legacyUrls = structured.length > 0 ? [] : codexReferenceImageUrls;
    idrielJobs.run({
      id: jobId,
      kind: 'image',
      label: `Materializando: ${desc.slice(0, 40)}`,
      task: () => callAIImageConsistent(generatedPrompt, legacyUrls, codexContext, structured),
    });
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
      status: 'unsorted',
    });
    setShowSaveModal(false);
    toast.success('Visão guardada na Caixa de Visões Recentes');
  };

  // ===== Caixa de Visões Recentes (unsorted) =====
  const unsorted = gallery.filter(img => img.status === 'unsorted');
  const sorted = gallery.filter(img => img.status !== 'unsorted');
  const filteredSorted = filter === 'Todos' ? sorted : sorted.filter(img => img.cat === filter);

  const updateImage = (id: string, patch: Partial<GalleryImage>) => {
    setGallery(gallery.map(img => img.id === id ? { ...img, ...patch } : img));
  };

  const [tagging, setTagging] = useState<GalleryImage | null>(null);
  const [tagCat, setTagCat] = useState(FRUITS[0].name);

  return (
    <div className="animate-fadeUp mx-auto max-w-[1060px] px-3 sm:px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-gold/50 shadow-[0_0_12px_rgba(218,165,32,0.3)] shrink-0">
            <img src={idrielAvatar} alt="Idriel" className="w-full h-full object-cover object-top" />
          </div>
          <div>
            <h1 className="font-cinzel font-bold text-xl sm:text-2xl text-foreground mb-0.5 inline-flex items-center gap-2.5"><Palette className="w-6 h-6 text-gold-champagne" strokeWidth={1.75} />Galeria de Visões</h1>
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
          <ImageIcon className="w-6 h-6 mb-1 text-gold-champagne" strokeWidth={1.75} />
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
                <SelectItem key={f.id} value={f.name}><f.Icon className="inline-block w-3.5 h-3.5 align-[-0.15em] text-gold-champagne" strokeWidth={1.75} /> {f.name}</SelectItem>
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
            <SelectItem value="Todos">Todos</SelectItem>
            {FRUITS.map(f => (
              <SelectItem key={f.id} value={f.name}><f.Icon className="inline-block w-3.5 h-3.5 align-[-0.15em] text-gold-champagne" strokeWidth={1.75} /> {f.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filter !== 'Todos' && (
          <button onClick={() => setFilter('Todos')} className="inline-flex items-center gap-1 text-[10px] text-text-dim hover:text-foreground font-montserrat transition-colors"><X className="w-3 h-3" strokeWidth={2} />Limpar</button>
        )}
      </div>

      {/* ===== Caixa de Visões Recentes (unsorted) ===== */}
      {unsorted.length > 0 && (
        <div className="mb-6 rounded-xl border border-gold/30 bg-gold/[0.04] p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-cinzel font-bold text-sm text-gold-light inline-flex items-center gap-2"><Inbox className="w-4 h-4" strokeWidth={1.75} />Caixa de Visões Recentes</h3>
              <p className="font-merriweather italic text-[11px] text-text-dim">Visões geradas por Idriel aguardando sua decisão.</p>
            </div>
            <span className="text-[10px] font-montserrat text-gold-light/80 px-2 py-1 rounded-full bg-gold/10 border border-gold/20">
              {unsorted.length} aguardando
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
            {unsorted.map(img => (
              <div key={img.id} className="group relative rounded-lg overflow-hidden border border-gold/30 bg-background/40">
                <img
                  src={img.src}
                  alt={img.name}
                  className="w-full h-[100px] sm:h-[120px] object-cover cursor-zoom-in"
                  onClick={() => setLightbox({ src: img.src, alt: img.name })}
                />
                <div className="p-2">
                  <p className="text-xs text-foreground font-montserrat truncate">{img.name}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <button
                      onClick={() => { setTagging(img); setTagCat(FRUITS[0].name); }}
                      className="text-[9px] font-montserrat px-1.5 py-0.5 rounded border border-gold/30 text-gold-light hover:bg-gold/15 transition-colors"
                      title="Etiquetar e arquivar"
                    >
                      <><Trees className="inline-block w-3 h-3 mr-1 align-[-0.1em]" strokeWidth={1.75} />Etiquetar</>
                    </button>
                    <button
                      onClick={() => { updateImage(img.id, { status: 'kept' }); toast.success('Mantida na galeria'); }}
                      className="text-[9px] font-montserrat px-1.5 py-0.5 rounded border border-gold/30 text-gold-light hover:bg-gold/15 transition-colors"
                      title="Mover para galeria"
                    >
                      <><Save className="inline-block w-3 h-3 mr-1 align-[-0.1em]" strokeWidth={1.75} />Manter</>
                    </button>
                    <button
                      onClick={() => removeImage(img.id)}
                      className="text-[9px] font-montserrat px-1.5 py-0.5 rounded border border-red-alert/30 text-red-alert/90 hover:bg-red-alert/15 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-3 h-3" strokeWidth={1.75} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid */}
      {filteredSorted.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gold/10 flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-gold-champagne opacity-60" strokeWidth={1.5} />
          </div>
          <h3 className="font-cinzel font-bold text-lg text-foreground mb-2">
            {sorted.length === 0 ? 'Sua galeria está vazia' : 'Nenhuma visão nesta categoria'}
          </h3>
          <p className="font-merriweather text-sm text-text-dim mb-4 max-w-md mx-auto">
            {sorted.length === 0
              ? 'Faça upload de referências visuais ou gere imagens com Idriel abaixo.'
              : 'Tente um filtro diferente ou adicione novas imagens.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
          {filteredSorted.map(img => (
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
                <X className="w-3.5 h-3.5" strokeWidth={2} />
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
            data-tour="visoes-idriel"
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
          Idriel canaliza o Elixir dos Mundos para materializar as visões do seu mundo
        </p>
      </div>

      {showGenerator && (
        <div className="animate-fadeUp">
          {/* Idriel lock CTA — Fruto Dourado Trancado */}
          {!planLimits.canUseAI ? (
            <div className="relative rounded-xl overflow-hidden border border-gold/20 mb-6">
              {/* Blurred preview background */}
              <div className="absolute inset-0 bg-gradient-to-br from-gold/[0.04] via-background/80 to-gold/[0.02]" />
              <div className="relative p-6 sm:p-8 text-center">
                {/* Golden Fruit icon */}
                <div className="relative w-20 h-20 mx-auto mb-4">
                  <div className="absolute inset-0 rounded-full bg-gold/10 animate-pulse" />
                  <div className="relative w-full h-full rounded-full bg-gradient-to-br from-gold/20 to-gold/5 border-2 border-gold/30 flex items-center justify-center shadow-[0_0_30px_rgba(218,165,32,0.15)]">
                    <div className="relative">
                      <Apple className="w-10 h-10 text-gold-champagne" strokeWidth={1.5} />
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
                      "Querido criador, o Elixir dos Mundos flui dentro deste Fruto. Com ele, posso materializar as visões do seu mundo em imagens, analisar sua criação e guiá-lo com toda minha sabedoria. Basta colher o Fruto."
                    </p>
                  </div>
                </div>

                {/* Powers preview */}
                <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto mb-5">
                  {[
                    { Icon: Palette, label: 'Gerar imagens', cost: '5 gotas' },
                    { Icon: BarChart3, label: 'Análise do mundo', cost: '2 gotas' },
                    { Icon: Leaf, label: 'Consultar Idriel', cost: '1 gota' },
                  ].map(p => (
                    <div key={p.label} className="rounded-lg p-2.5 bg-gold/[0.04] border border-gold/10 opacity-70">
                      <p.Icon className="w-5 h-5 mb-1 text-gold-light/80" strokeWidth={1.75} />
                      <p className="text-[10px] font-montserrat font-bold text-gold-light/80">{p.label}</p>
                      <p className="text-[9px] text-text-dim">{p.cost}</p>
                    </div>
                  ))}
                </div>

                <button
                  onClick={async () => { const { openCheckout, STRIPE_PLANS } = await import('@/hooks/useSubscription'); openCheckout(STRIPE_PLANS.idriel_mensal.price_id); }}
                  className="px-6 py-3 rounded-full text-sm font-montserrat font-bold uppercase tracking-wider bg-gradient-to-r from-gold to-gold-light text-background hover:shadow-[0_0_24px_rgba(218,165,32,0.3)] transition-all"
                >
                  <><Sparkles className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />Colher o Fruto Dourado — R$ 39,90/mês</>
                </button>
                <p className="text-[10px] text-text-dim mt-2 font-montserrat">100 gotas de Elixir dos Mundos por mês</p>
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
                  <><Leaf className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />{loading1 ? 'Idriel está tecendo…' : '1. Pedir Visão a Idriel'}</>
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={loading2 || !generatedPrompt}
                  className="px-4 py-2 rounded-md text-xs font-montserrat font-bold uppercase tracking-wider bg-gold hover:bg-gold-light text-background disabled:opacity-40 transition-all"
                >
                  <><Sparkles className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />{loading2 ? 'Materializando…' : '2. Materializar Visão'}</>
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
                        {loading1 ? 'Idriel está tecendo a essência da sua visão…' : 'O Elixir dos Mundos flui… sua visão está tomando forma…'}
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
          {generatedPrompt && !loading1 && planLimits.canUseAI && (
            <div className="animate-fadeUp card-glass rounded-lg p-5 mb-5 border border-gold/20">
              <span className="font-cinzel text-[10px] text-gold-light mb-2 inline-flex items-center gap-1.5"><Leaf className="w-3 h-3" strokeWidth={1.75} />Visão tecida por Idriel</span>
              <p className="font-merriweather text-sm text-foreground whitespace-pre-wrap leading-relaxed mb-4">{generatedPrompt}</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={copyPrompt} className="px-3 py-1.5 rounded-md text-xs font-montserrat border border-gold/30 text-text-secondary hover:text-foreground transition-colors">
                  <>{copied ? <><Check className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={2} />Copiado!</> : <><ClipboardCopy className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />Copiar para Midjourney / Leonardo</>}</>
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={loading2}
                  className="px-3 py-1.5 rounded-md text-xs font-montserrat bg-gold hover:bg-gold-light text-background disabled:opacity-40 transition-colors"
                >
                  <><Sparkles className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />Materializar Visão</>
                </button>
              </div>
            </div>
          )}

          {/* Generated image */}
          {generatedImage && !loading2 && (
            <div className="animate-fadeUp card-glass rounded-lg p-5 border border-gold/20">
              <span className="font-cinzel text-[10px] text-gold-light mb-3 inline-flex items-center gap-1.5"><Sparkles className="w-3 h-3" strokeWidth={1.75} />Visão materializada pelo Elixir dos Mundos</span>
              <img src={generatedImage} alt="Visão de Idriel" className="w-full max-w-[512px] mx-auto rounded-lg mb-4" />
              <div className="flex flex-wrap gap-2 justify-center">
                <button onClick={() => { setSaveCat('Todos'); setShowSaveModal(true); }} className="px-4 py-2 bg-gold hover:bg-gold-light text-background rounded-md text-xs font-montserrat font-bold transition-colors">
                  <><Save className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />Guardar na Galeria</>
                </button>
                <a href={generatedImage} download target="_blank" rel="noopener" className="px-4 py-2 rounded-md text-xs font-montserrat border border-gold/30 text-text-secondary hover:text-foreground transition-colors">
                  <><ArrowDown className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={2} />Baixar</>
                </a>
              </div>
            </div>
          )}

          {/* ===== Histórico: Visões tecidas por Idriel ===== */}
          {visions.length > 0 && (
            <div className="mt-6 rounded-lg border border-gold/15 bg-gold/[0.03] p-4">
              <button
                onClick={() => setShowHistory(s => !s)}
                className="w-full flex items-center justify-between mb-3"
              >
                <div className="flex items-center gap-2">
                  <span className="font-cinzel text-sm font-bold text-gold-light inline-flex items-center gap-2"><ScrollText className="w-4 h-4" strokeWidth={1.75} />Visões tecidas por Idriel</span>
                  <span className="text-[10px] text-text-dim font-montserrat">({visions.length})</span>
                </div>
                {showHistory ? <ChevronUp className="w-4 h-4 text-gold-light/60" /> : <ChevronDown className="w-4 h-4 text-gold-light/60" />}
              </button>
              {showHistory && (
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {visions.map(v => (
                    <div key={v.id} className="flex gap-3 rounded-md border border-gold/10 bg-background/40 p-3">
                      {v.image_url ? (
                        <img
                          src={v.image_url}
                          alt={v.description}
                          className="w-20 h-20 object-cover rounded cursor-zoom-in flex-shrink-0"
                          onClick={() => v.image_url && setLightbox({ src: v.image_url, alt: v.description })}
                        />
                      ) : (
                        <div className="w-20 h-20 rounded bg-gold/5 border border-gold/10 flex items-center justify-center flex-shrink-0 text-gold-light/40 text-xs italic">
                          (sem img)
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-merriweather text-foreground line-clamp-2 mb-1">{v.description || 'Sem descrição'}</p>
                        <p className="text-[10px] text-text-dim font-mono line-clamp-2 whitespace-pre-wrap">{v.prompt}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <button
                            onClick={() => { navigator.clipboard.writeText(v.prompt); toast.success('Prompt copiado'); }}
                            className="text-[9px] font-montserrat px-1.5 py-0.5 rounded border border-gold/20 text-gold-light/80 hover:bg-gold/10 transition-colors"
                          >
                            <><ClipboardCopy className="inline-block w-3 h-3 mr-1 align-[-0.1em]" strokeWidth={1.75} />Copiar prompt</>
                          </button>
                          <button
                            onClick={() => { setGeneratedPrompt(v.prompt); setDesc(v.description); toast.success('Prompt restaurado para edição'); }}
                            className="text-[9px] font-montserrat px-1.5 py-0.5 rounded border border-gold/20 text-gold-light/80 hover:bg-gold/10 transition-colors"
                          >
                            <><RotateCw className="inline-block w-3 h-3 mr-1 align-[-0.1em]" strokeWidth={1.75} />Reusar</>
                          </button>
                          {v.image_url && (
                            <button
                              onClick={() => addToGallery({ id: Date.now().toString(), src: v.image_url!, name: v.description.slice(0, 40) || 'Visão de Idriel', cat: 'Geral', status: 'unsorted' })}
                              className="text-[9px] font-montserrat px-1.5 py-0.5 rounded border border-gold/20 text-gold-light/80 hover:bg-gold/10 transition-colors"
                            >
                              <><Save className="inline-block w-3 h-3 mr-1 align-[-0.1em]" strokeWidth={1.75} />P/ Galeria</>
                            </button>
                          )}
                          <button
                            onClick={() => { if (confirm('Excluir esta visão do histórico?')) deleteVision(v.id); }}
                            className="text-[9px] font-montserrat px-1.5 py-0.5 rounded border border-red-alert/30 text-red-alert/80 hover:bg-red-alert/10 transition-colors ml-auto"
                          >
                            <Trash2 className="w-3 h-3 inline" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                  <f.Icon className="inline-block w-3.5 h-3.5 align-[-0.15em] text-gold-champagne" strokeWidth={1.75} /> {f.name}
                </button>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowSaveModal(false)} className="px-4 py-2 rounded-md text-xs font-montserrat text-text-dim border border-border hover:text-foreground transition-colors">Cancelar</button>
              <button onClick={confirmSave} className="px-4 py-2 bg-gold hover:bg-gold-light text-background rounded-md text-xs font-montserrat font-bold transition-colors inline-flex items-center gap-1.5"><Save className="w-3.5 h-3.5" strokeWidth={1.75} />Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Tag-and-archive modal for unsorted images */}
      {tagging && (
        <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-3 sm:p-4" onClick={() => setTagging(null)}>
          <div className="card-glass rounded-lg w-full max-w-sm p-5 animate-fadeUp border border-gold/20" onClick={e => e.stopPropagation()}>
            <h3 className="font-cinzel font-bold text-foreground mb-1 inline-flex items-center gap-2"><Trees className="w-4 h-4 text-gold-champagne" strokeWidth={1.75} />Etiquetar Visão</h3>
            <p className="font-merriweather text-xs text-text-dim italic mb-4">Escolha o Fruto/categoria onde esta visão deve ser arquivada.</p>
            <div className="flex flex-wrap gap-1.5 mb-4 max-h-[240px] overflow-y-auto">
              {FRUITS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setTagCat(f.name)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-montserrat font-bold uppercase transition-colors ${tagCat === f.name ? 'bg-gold/20 text-gold-light border border-gold/40' : 'text-text-dim border border-transparent hover:border-gold/20'}`}
                >
                  <f.Icon className="inline-block w-3.5 h-3.5 align-[-0.15em] text-gold-champagne" strokeWidth={1.75} /> {f.name}
                </button>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setTagging(null)} className="px-4 py-2 rounded-md text-xs font-montserrat text-text-dim border border-border hover:text-foreground transition-colors">Cancelar</button>
              <button
                onClick={() => {
                  updateImage(tagging.id, { status: 'kept', cat: tagCat });
                  toast.success(`Etiquetada em "${tagCat}"`);
                  setTagging(null);
                }}
                className="px-4 py-2 bg-gold hover:bg-gold-light text-background rounded-md text-xs font-montserrat font-bold transition-colors"
              >
                <><Save className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />Etiquetar</>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && <ImageLightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />}
    </div>
  );
};
