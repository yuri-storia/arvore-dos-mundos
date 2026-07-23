import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FRUITS, STYLE_META, IMAGE_TYPE_META, TONE_META, GalleryImage } from '@/lib/data';
import { ImageLightbox } from '@/components/ImageLightbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { callAIText, callAIImageConsistent, friendlyAIError } from '@/lib/helpers';
import { optimizeImage } from '@/lib/imageOptimizer';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { useCodexEntries } from '@/hooks/useCodexEntries';
import { useIdrielVisions } from '@/hooks/useIdrielVisions';
import { useIdrielJobs } from '@/contexts/IdrielJobsContext';
import idrielAvatar from '@/assets/idriel-avatar.webp';
import { GALLERY_COVER_PLACEHOLDERS } from '@/assets/galleryCovers';
import {
  Sparkles, Lock, ChevronDown, ChevronUp, Trash2, Palette, Leaf, ScrollText,
  X, Save, Apple, BarChart3, Check, ClipboardCopy, ArrowDown, RotateCw,
  Image as ImageIcon, ArrowRight, ArrowLeft, Info, Upload, ImagePlus,
  FolderOpen,
} from 'lucide-react';
import { ImageReferencePicker, type PickedReference } from '@/components/ImageReferencePicker';
import type { AppState } from '@/lib/data';

interface Props {
  gallery: GalleryImage[];
  setGallery: (g: GalleryImage[]) => void;
  state: AppState;
  setGeneratedPrompt: (p: string) => void;
  addToGallery: (img: GalleryImage) => void;
}

// Frutos válidos como pastas (excluímos o 11º — "A Sua Narrativa" não é visual).
const FOLDER_FRUITS = FRUITS.filter(f => f.id !== 10);

// Persistência local das capas customizadas por mundo.
const coverKey = (worldId: string) => `gallery:covers:${worldId}`;
function loadCovers(worldId?: string): Record<number, string> {
  if (!worldId) return {};
  try { return JSON.parse(localStorage.getItem(coverKey(worldId)) || '{}'); }
  catch { return {}; }
}
function saveCovers(worldId: string, covers: Record<number, string>) {
  localStorage.setItem(coverKey(worldId), JSON.stringify(covers));
}

export const TabGaleria: React.FC<Props> = ({ gallery, setGallery, state, setGeneratedPrompt, addToGallery }) => {
  const { user } = useAuth();
  const planLimits = usePlanLimits();
  const worldId = state.currentSaveId || undefined;
  const { entries: codexEntries } = useCodexEntries(worldId);
  const { visions, saveVision, updateVisionImage, deleteVision } = useIdrielVisions(worldId);
  const idrielJobs = useIdrielJobs();

  // --- Folder navigation state ---
  const [openFolder, setOpenFolder] = useState<number | null>(null); // fruit id
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);

  // --- Custom covers per world (localStorage) ---
  const [customCovers, setCustomCovers] = useState<Record<number, string>>(() => loadCovers(worldId));
  useEffect(() => { setCustomCovers(loadCovers(worldId)); }, [worldId]);
  const setCover = (fruitId: number, url: string | null) => {
    const next = { ...customCovers };
    if (url) next[fruitId] = url; else delete next[fruitId];
    setCustomCovers(next);
    if (worldId) saveCovers(worldId, next);
  };

  // --- Upload state ---
  const uploadRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });

  // --- Generator state (Visões de Idriel) ---
  const [showGenerator, setShowGenerator] = useState(false);
  const { worldName, db, generatedPrompt } = state;
  const [desc, setDesc] = useState('');
  const [style, setStyle] = useState(STYLE_META[0].label);
  const [imgType, setImgType] = useState(IMAGE_TYPE_META[0].label);
  const [tone, setTone] = useState(TONE_META[0].label);
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
  const [saveCat, setSaveCat] = useState<string>(FOLDER_FRUITS[0].name);
  const [showHistory, setShowHistory] = useState(false);

  const promptJob = activePromptJobId ? idrielJobs.get<string>(activePromptJobId) : undefined;
  const imageJob = activeImageJobId ? idrielJobs.get<string>(activeImageJobId) : undefined;
  const loading1 = promptJob?.status === 'running';
  const loading2 = imageJob?.status === 'running';
  const styleMeta = STYLE_META.find(s => s.label === style) || STYLE_META[0];

  useEffect(() => {
    if (promptJob?.status === 'done' && typeof promptJob.result === 'string' && promptJob.result) setGeneratedPrompt(promptJob.result);
    if (promptJob?.status === 'error') { const f = friendlyAIError(promptJob.error || ''); setError(`${f.title} ${f.hint}`); }
  }, [promptJob?.status, promptJob?.result, promptJob?.error, setGeneratedPrompt]);

  useEffect(() => {
    if (imageJob?.status === 'done' && imageJob.result) {
      setGeneratedImage(imageJob.result);
      if (activeVisionId) updateVisionImage(activeVisionId, imageJob.result);
    }
    if (imageJob?.status === 'error') { const f = friendlyAIError(imageJob.error || ''); setError(`${f.title} ${f.hint}`); }
  }, [imageJob?.status, imageJob?.result, imageJob?.error, activeVisionId, updateVisionImage]);

  useEffect(() => { if (promptJobKey) { activePromptJobId ? localStorage.setItem(promptJobKey, activePromptJobId) : localStorage.removeItem(promptJobKey); } }, [promptJobKey, activePromptJobId]);
  useEffect(() => { if (imageJobKey) { activeImageJobId ? localStorage.setItem(imageJobKey, activeImageJobId) : localStorage.removeItem(imageJobKey); } }, [imageJobKey, activeImageJobId]);
  useEffect(() => { if (visionKey) { activeVisionId ? localStorage.setItem(visionKey, activeVisionId) : localStorage.removeItem(visionKey); } }, [visionKey, activeVisionId]);

  // --- Group images per folder ---
  const imagesByFolder = useMemo(() => {
    const map = new Map<string, GalleryImage[]>();
    for (const img of gallery) {
      if (img.status === 'unsorted') continue;
      const list = map.get(img.cat) || [];
      list.push(img);
      map.set(img.cat, list);
    }
    return map;
  }, [gallery]);

  const unsorted = useMemo(() => gallery.filter(i => i.status === 'unsorted'), [gallery]);

  // --- Uploads ---
  const uploadFiles = async (files: FileList | null, folderName: string) => {
    if (!files || !user) return;
    if (!planLimits.canUploadGallery) {
      toast.error(planLimits.isExpired
        ? 'Sua assinatura expirou. Suas imagens ficam preservadas, mas para enviar novas é preciso reativar o plano.'
        : 'Adicionar imagens à Galeria requer um plano ativo. Faça upgrade para liberar.');
      return;
    }
    const items = Array.from(files).filter(f => /image\/(png|jpe?g|webp)/.test(f.type));
    if (items.length === 0) return;

    setUploading(true);
    setUploadProgress({ done: 0, total: items.length });
    const newImages: GalleryImage[] = [];
    for (let i = 0; i < items.length; i++) {
      const file = items[i];
      try {
        const optimized = await optimizeImage(file);
        const ext = optimized.name.split('.').pop() || 'webp';
        const path = `${user.id}/gallery-${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from('codex-images').upload(path, optimized, {
          cacheControl: '31536000', contentType: optimized.type || 'image/webp',
        });
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('codex-images').getPublicUrl(path);
        newImages.push({
          id: `${Date.now()}-${i}`, src: publicUrl,
          name: file.name.replace(/\.[^.]+$/, ''), cat: folderName, status: 'kept',
        });
      } catch (err: any) {
        toast.error(`Erro em "${file.name}": ${err.message || 'falha'}`);
      }
      setUploadProgress({ done: i + 1, total: items.length });
    }
    if (newImages.length > 0) {
      setGallery([...gallery, ...newImages]);
      toast.success(`${newImages.length} imagem(ns) adicionada(s) em "${folderName}"`);
    }
    setUploading(false);
  };

  const uploadCover = async (file: File | null, fruitId: number) => {
    if (!file || !user) return;
    if (!/image\/(png|jpe?g|webp)/.test(file.type)) { toast.error('Use PNG, JPG ou WEBP'); return; }
    try {
      const optimized = await optimizeImage(file, 1600, 1200, 0.8);
      const ext = optimized.name.split('.').pop() || 'webp';
      const path = `${user.id}/cover-${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('codex-images').upload(path, optimized, {
        cacheControl: '31536000', contentType: optimized.type || 'image/webp',
      });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('codex-images').getPublicUrl(path);
      setCover(fruitId, publicUrl);
      toast.success('Capa atualizada');
    } catch (e: any) {
      toast.error(e.message || 'Falha ao enviar capa');
    }
  };

  const removeImage = (id: string) => setGallery(gallery.filter(img => img.id !== id));
  const updateImage = (id: string, patch: Partial<GalleryImage>) => {
    setGallery(gallery.map(img => img.id === id ? { ...img, ...patch } : img));
  };

  // --- Codex context for Idriel (mantém a inteligência do prompt) ---
  const codexContext = useMemo(() => {
    if (!codexEntries || codexEntries.length === 0) return '';
    const mention = (raw: string) => raw && desc && new RegExp(`\\b${raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(desc);
    const mentioned = codexEntries.filter(e => mention(e.title));
    const others = codexEntries.filter(e => !mentioned.includes(e));
    const ordered = [...mentioned, ...others].slice(0, 12);
    return ordered.map(e => {
      const cleaned = (e.content || '').replace(/^__magictype__\n?/, '').replace(/\s+/g, ' ').trim().slice(0, 600);
      const fruit = e.fruit_id !== null ? FRUITS.find(f => f.id === e.fruit_id)?.name : null;
      const tag = e.entry_type === 'artigo' ? 'Artigo' : 'Ficha';
      return `- [${tag}${fruit ? ` · ${fruit}` : ''}] ${e.title}: ${cleaned}`;
    }).join('\n');
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
    const userMsg = `World context:\n${ctx}\n\nDescription: ${desc}\nVisual style: ${style} (${styleMeta.promptHint})\nImage type: ${imgType}\nTone/Lighting: ${tone}\n${extras ? `Extra details: ${extras}` : ''}`;
    const jobId = `idriel-prompt-${Date.now()}`;
    setActivePromptJobId(jobId);
    idrielJobs.run({
      id: jobId, kind: 'prompt',
      label: `Tecendo: ${desc.slice(0, 40)}`,
      task: () => callAIText([{ role: 'user', content: userMsg }], systemPrompt),
    });
  };

  const handleGenerate = async () => {
    if (!planLimits.canUseAI || !generatedPrompt) return;
    if (!worldId) { setError('Selecione um mundo antes de materializar.'); return; }
    setError(''); setGeneratedImage('');
    const vision = await saveVision({ description: desc, prompt: generatedPrompt, image_url: null, style, image_type: imgType, tone, extras });
    setActiveVisionId(vision?.id || null);
    const jobId = `idriel-image-${Date.now()}`;
    setActiveImageJobId(jobId);
    const structured = pickedRefs.map(r => ({ url: r.url, intent: r.intent }));
    const legacyUrls = structured.length > 0 ? [] : codexReferenceImageUrls;
    idrielJobs.run({
      id: jobId, kind: 'image',
      label: `Materializando: ${desc.slice(0, 40)}`,
      task: () => callAIImageConsistent(generatedPrompt, legacyUrls, codexContext, structured),
    });
  };

  const copyPrompt = () => { navigator.clipboard.writeText(generatedPrompt); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const confirmSave = () => {
    if (!generatedImage) return;
    // Save directly into the chosen folder (no "unsorted" step — fluxo mais direto)
    addToGallery({
      id: Date.now().toString(), src: generatedImage,
      name: desc.slice(0, 40) || 'Visão de Idriel',
      cat: saveCat, status: 'kept',
    });
    setShowSaveModal(false);
    toast.success(`Guardada em "${saveCat}"`);
  };

  const currentFolder = openFolder !== null ? FOLDER_FRUITS.find(f => f.id === openFolder) : null;
  const currentImages = currentFolder ? (imagesByFolder.get(currentFolder.name) || []) : [];
  const currentCover = currentFolder ? (customCovers[currentFolder.id] || GALLERY_COVER_PLACEHOLDERS[currentFolder.id]) : null;

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="animate-fadeUp mx-auto max-w-[1180px] px-3 sm:px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gold/50 shadow-[0_0_14px_rgba(218,165,32,0.3)] shrink-0">
          <img loading="lazy" decoding="async" src={idrielAvatar} alt="Idriel" className="w-full h-full object-cover object-top" />
        </div>
        <div>
          <h1 className="font-cinzel font-bold text-xl sm:text-2xl text-foreground mb-0.5 inline-flex items-center gap-2.5">
            <Palette className="w-5 h-5 sm:w-6 sm:h-6 text-gold-champagne" strokeWidth={1.75} />Galeria de Visões
          </h1>
          <p className="font-merriweather italic text-gold-light/70 text-xs sm:text-sm">
            {openFolder === null
              ? 'Uma pasta por Fruto. Envie suas referências e materialize visões com Idriel.'
              : 'Envie imagens ou guarde as visões de Idriel nesta pasta.'}
          </p>
        </div>
      </div>

      {/* ============ FOLDER GRID (biblioteca) ============ */}
      {openFolder === null && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {FOLDER_FRUITS.map(f => {
              const images = imagesByFolder.get(f.name) || [];
              const count = images.length;
              const cover = customCovers[f.id] || GALLERY_COVER_PLACEHOLDERS[f.id];
              const Icon = f.Icon;
              return (
                <button
                  key={f.id}
                  onClick={() => setOpenFolder(f.id)}
                  className="group relative aspect-[4/5] rounded-2xl overflow-hidden border border-gold/15 hover:border-gold/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_-15px_rgba(218,165,32,0.35)] text-left bg-[hsl(var(--bg-deep))]"
                >
                  <img
                    src={cover} alt={f.name} loading="lazy" decoding="async"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.08]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/10" />

                  {/* small tile of latest user image */}
                  {images[0] && (
                    <img
                      src={images[0].src} alt="" loading="lazy"
                      className="absolute top-3 right-3 w-12 h-12 rounded-md object-cover border border-white/20 shadow-lg opacity-95"
                    />
                  )}

                  <span className="absolute top-3 left-3 text-[9px] font-montserrat font-bold uppercase tracking-wider text-gold-light/90 bg-black/40 border border-gold/20 rounded-full px-2 py-0.5 backdrop-blur-sm">
                    {f.num}
                  </span>

                  <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gold/20 border border-gold/40 backdrop-blur-md">
                        <Icon className="w-3 h-3 text-gold-light" strokeWidth={1.75} />
                      </span>
                      <span className="text-[9px] font-montserrat font-bold uppercase tracking-wider text-gold-light/90">
                        {count} {count === 1 ? 'imagem' : 'imagens'}
                      </span>
                    </div>
                    <div className="flex items-end justify-between gap-2">
                      <h3 className="font-cinzel font-bold text-sm sm:text-base text-foreground drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)] leading-tight">
                        {f.name}
                      </h3>
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/[0.08] border border-white/20 backdrop-blur-md group-hover:bg-gold/25 group-hover:border-gold/60 transition-all shrink-0">
                        <ArrowRight className="w-3.5 h-3.5 text-gold-light group-hover:translate-x-0.5 transition-transform" strokeWidth={2} />
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Caixa de Visões Recentes (unsorted) — só aparece se houver */}
          {unsorted.length > 0 && (
            <div className="mt-8 rounded-xl border border-gold/30 bg-gold/[0.04] p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-cinzel font-bold text-sm text-gold-light inline-flex items-center gap-2">
                    <Sparkles className="w-4 h-4" strokeWidth={1.75} />Visões aguardando categoria
                  </h3>
                  <p className="font-merriweather italic text-[11px] text-text-dim">Escolha em qual pasta arquivar cada visão.</p>
                </div>
                <span className="text-[10px] font-montserrat text-gold-light/80 px-2 py-1 rounded-full bg-gold/10 border border-gold/20">
                  {unsorted.length}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
                {unsorted.map(img => (
                  <div key={img.id} className="rounded-lg overflow-hidden border border-gold/30 bg-background/40">
                    <img src={img.src} alt={img.name} loading="lazy"
                      className="w-full h-[100px] object-cover cursor-zoom-in"
                      onClick={() => setLightbox({ src: img.src, alt: img.name })}
                    />
                    <div className="p-2 space-y-1.5">
                      <p className="text-[10px] text-foreground font-montserrat truncate">{img.name}</p>
                      <select
                        value=""
                        onChange={e => {
                          const cat = e.target.value;
                          if (!cat) return;
                          updateImage(img.id, { status: 'kept', cat });
                          toast.success(`Arquivada em "${cat}"`);
                        }}
                        className="w-full bg-background/60 border border-gold/25 rounded px-1.5 py-1 text-[10px] text-gold-light font-montserrat focus:outline-none focus:border-gold/60"
                      >
                        <option value="">Arquivar em…</option>
                        {FOLDER_FRUITS.map(f => (
                          <option key={f.id} value={f.name}>{f.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => removeImage(img.id)}
                        className="w-full text-[9px] font-montserrat text-red-alert/80 hover:text-red-alert transition-colors inline-flex items-center justify-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" strokeWidth={1.75} />Descartar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ============ FOLDER DETAIL ============ */}
      {currentFolder && (
        <div className="animate-fadeUp">
          {/* Cover banner */}
          <div className="relative rounded-2xl overflow-hidden border border-gold/20 mb-5 aspect-[16/6] sm:aspect-[16/5]">
            <img src={currentCover!} alt={currentFolder.name} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-black/20" />

            <button
              onClick={() => setOpenFolder(null)}
              className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 border border-white/15 backdrop-blur-md text-xs text-foreground font-montserrat hover:bg-black/70 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2} />Todas as pastas
            </button>

            <div className="absolute top-3 right-3 flex gap-2">
              <input ref={coverRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                onChange={e => { uploadCover(e.target.files?.[0] || null, currentFolder.id); if (coverRef.current) coverRef.current.value = ''; }}
              />
              <button
                onClick={() => coverRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 border border-white/15 backdrop-blur-md text-xs text-foreground font-montserrat hover:bg-black/70 transition-colors"
                title="Trocar imagem de capa"
              >
                <ImagePlus className="w-3.5 h-3.5" strokeWidth={2} />Trocar capa
              </button>
              {customCovers[currentFolder.id] && (
                <button
                  onClick={() => { setCover(currentFolder.id, null); toast.success('Capa restaurada'); }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 border border-white/15 backdrop-blur-md text-xs text-foreground font-montserrat hover:bg-black/70 transition-colors"
                  title="Voltar à capa original"
                >
                  <RotateCw className="w-3.5 h-3.5" strokeWidth={2} />Padrão
                </button>
              )}
            </div>

            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
              <span className="text-[10px] font-montserrat font-bold uppercase tracking-wider text-gold-light/90">
                {currentFolder.num} · {currentImages.length} {currentImages.length === 1 ? 'imagem' : 'imagens'}
              </span>
              <h2 className="font-cinzel font-bold text-2xl sm:text-3xl text-foreground drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)] leading-tight mt-1">
                {currentFolder.name}
              </h2>
            </div>
          </div>

          {/* Upload zone inside folder */}
          <input ref={uploadRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden"
            onChange={e => { uploadFiles(e.target.files, currentFolder.name); if (uploadRef.current) uploadRef.current.value = ''; }}
          />
          <div
            onClick={() => !uploading && uploadRef.current?.click()}
            className={`border-2 border-dashed border-gold/25 rounded-xl p-6 text-center cursor-pointer hover:border-gold/50 hover:bg-gold/[0.03] transition-all mb-5 ${uploading ? 'opacity-60 pointer-events-none' : ''}`}
          >
            <Upload className="w-6 h-6 mx-auto mb-2 text-gold-champagne" strokeWidth={1.75} />
            <p className="text-sm text-gold-light font-montserrat font-bold">
              {uploading ? `Enviando ${uploadProgress.done}/${uploadProgress.total}…` : `Adicionar imagens em "${currentFolder.name}"`}
            </p>
            <p className="text-xs text-text-dim font-merriweather italic mt-0.5">PNG, JPG ou WEBP — vários arquivos</p>
          </div>

          {/* Image grid */}
          {currentImages.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gold/10 flex items-center justify-center">
                <FolderOpen className="w-8 h-8 text-gold-champagne opacity-60" strokeWidth={1.5} />
              </div>
              <p className="font-merriweather text-sm text-text-dim max-w-md mx-auto">
                Esta pasta ainda está vazia. Envie referências acima ou gere uma visão com Idriel e a arquive aqui.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
              {currentImages.map(img => (
                <div key={img.id} className="group relative rounded-lg overflow-hidden border border-gold/15 hover:border-gold/40 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(218,165,32,0.15)] transition-all">
                  <img src={img.src} alt={img.name} loading="lazy" decoding="async"
                    className="w-full h-[110px] sm:h-[140px] object-cover cursor-zoom-in"
                    onClick={() => setLightbox({ src: img.src, alt: img.name })}
                  />
                  <div className="p-2">
                    <p className="text-xs text-foreground font-montserrat truncate">{img.name}</p>
                  </div>
                  <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setCover(currentFolder.id, img.src)}
                      className="w-6 h-6 rounded-full bg-black/70 text-gold-light flex items-center justify-center hover:bg-gold/30 transition-colors"
                      title="Definir como capa da pasta"
                    >
                      <ImagePlus className="w-3 h-3" strokeWidth={2} />
                    </button>
                    <button
                      onClick={() => removeImage(img.id)}
                      className="w-6 h-6 rounded-full bg-red-alert/80 text-white flex items-center justify-center hover:bg-red-alert transition-colors"
                      title="Excluir"
                    >
                      <X className="w-3.5 h-3.5" strokeWidth={2} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============ VISÕES DE IDRIEL (generator) — sempre abaixo da biblioteca ============ */}
      {openFolder === null && (
        <div className="mt-14">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
            <button
              data-tour="visoes-idriel"
              onClick={() => setShowGenerator(s => !s)}
              aria-expanded={showGenerator}
              className="flex items-center gap-2.5 px-5 py-2.5 rounded-full border border-gold/30 bg-gradient-to-r from-gold/[0.04] via-gold/[0.10] to-gold/[0.04] hover:from-gold/[0.10] hover:to-gold/[0.10] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-all"
            >
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-gold/30 to-gold/5 border border-gold/40">
                <Sparkles className="w-3.5 h-3.5 text-gold-light" strokeWidth={2} />
              </span>
              <span className="font-cinzel text-sm text-gold-light font-bold tracking-wide">Visões de Idriel</span>
              <ChevronDown className={`w-4 h-4 text-gold-light/70 transition-transform duration-300 ${showGenerator ? 'rotate-180' : ''}`} />
            </button>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
          </div>
          <div className="max-w-xl mx-auto mt-3 px-4">
            <p className="flex items-start gap-2 text-center font-merriweather text-[13px] text-text-secondary/90 leading-relaxed">
              <Info className="w-3.5 h-3.5 text-gold-champagne/70 shrink-0 mt-0.5" strokeWidth={2} />
              <span className="text-left">
                <strong className="text-gold-light">Materializar imagens com IA.</strong> Idriel transforma descrições — inspiradas no seu Codex —
                em visões visuais coerentes com o seu mundo. Toda visão gerada pode ser categorizada e arquivada em uma das pastas acima.
                {!showGenerator && <span className="text-text-dim italic"> Clique acima para expandir.</span>}
              </span>
            </p>
          </div>

          {showGenerator && (
            <div className="animate-fadeUp mt-6">
              {!planLimits.canUseAI ? (
                <div className="relative rounded-xl overflow-hidden border border-gold/20 mb-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-gold/[0.04] via-background/80 to-gold/[0.02]" />
                  <div className="relative p-6 sm:p-8 text-center">
                    <div className="relative w-20 h-20 mx-auto mb-4">
                      <div className="absolute inset-0 rounded-full bg-gold/10 animate-pulse" />
                      <div className="relative w-full h-full rounded-full bg-gradient-to-br from-gold/20 to-gold/5 border-2 border-gold/30 flex items-center justify-center shadow-[0_0_30px_rgba(218,165,32,0.15)]">
                        <div className="relative">
                          <Apple className="w-10 h-10 text-gold-champagne" strokeWidth={1.5} />
                          <Lock className="absolute -bottom-1 -right-1 w-5 h-5 text-gold-light drop-shadow-lg" />
                        </div>
                      </div>
                    </div>
                    <h3 className="font-cinzel font-bold text-lg text-gold-light mb-2">O Fruto Dourado aguarda…</h3>
                    <div className="max-w-md mx-auto mb-5">
                      <div className="flex items-start gap-3 text-left bg-gold/[0.04] rounded-lg p-3 border border-gold/10">
                        <img src={idrielAvatar} alt="Idriel" className="w-8 h-8 rounded-full border border-gold/30 shrink-0 mt-0.5" />
                        <p className="font-merriweather text-sm text-text-secondary leading-relaxed italic">
                          "Querido criador, com o Elixir dos Mundos posso materializar as visões do seu mundo. Basta colher o Fruto."
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={async () => { const { openCheckout, STRIPE_PLANS } = await import('@/hooks/useSubscription'); openCheckout(STRIPE_PLANS.idriel_mensal.price_id); }}
                      className="px-6 py-3 rounded-full text-sm font-montserrat font-bold uppercase tracking-wider bg-gradient-to-r from-gold to-gold-light text-background hover:shadow-[0_0_24px_rgba(218,165,32,0.3)] transition-all"
                    >
                      <Sparkles className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />Colher o Fruto Dourado — R$ 39,90/mês
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="card-glass rounded-lg p-5">
                    <label className="block text-[11px] uppercase tracking-wider text-gold-light font-montserrat font-bold mb-1.5">Descreva sua visão</label>
                    <textarea
                      value={desc}
                      onChange={e => setDesc(e.target.value)}
                      placeholder="Ex.: A capital do meu reino élfico ao entardecer, com torres de cristal brilhando sob a luz dourada…"
                      rows={3}
                      className="w-full bg-[rgba(4,12,24,0.6)] border border-gold/15 border-b-gold/30 rounded-md px-3 py-2 text-sm text-foreground font-merriweather placeholder:italic placeholder:text-text-dim/70 focus:outline-none focus:border-gold/50 resize-y"
                    />
                  </div>

                  <section>
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="font-cinzel text-sm text-gold-light inline-flex items-center gap-2">
                        <span className="w-1 h-4 bg-gradient-to-b from-gold to-transparent rounded-full" />
                        Estilo visual
                      </h2>
                      <span className="text-[10px] font-montserrat uppercase tracking-wider text-text-dim">{style}</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {STYLE_META.map(s => {
                        const active = style === s.label;
                        return (
                          <button
                            key={s.label}
                            type="button"
                            onClick={() => setStyle(s.label)}
                            aria-pressed={active}
                            className={`group relative aspect-square overflow-hidden rounded-xl border transition-all ${
                              active
                                ? 'border-gold ring-2 ring-gold/50 shadow-[0_0_18px_rgba(218,165,32,0.35)]'
                                : 'border-gold/10 hover:border-gold/40'
                            }`}
                          >
                            <img src={s.image} alt={s.label} loading="lazy" width={512} height={512} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                            {active && (
                              <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-gold text-background flex items-center justify-center shadow-[0_0_12px_rgba(218,165,32,0.6)]">
                                <Check className="w-3.5 h-3.5" strokeWidth={3} />
                              </div>
                            )}
                            <div className="absolute inset-x-0 bottom-0 p-2.5 text-left">
                              <div className={`font-cinzel text-xs ${active ? 'text-gold-light' : 'text-foreground'}`}>{s.label}</div>
                              <div className="font-merriweather text-[10px] text-text-dim leading-tight line-clamp-2">{s.description}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <section>
                      <h2 className="font-cinzel text-sm text-gold-light mb-2 inline-flex items-center gap-2">
                        <span className="w-1 h-4 bg-gradient-to-b from-gold to-transparent rounded-full" />
                        Tipo de imagem
                      </h2>
                      <div className="grid grid-cols-2 gap-2">
                        {IMAGE_TYPE_META.map(o => {
                          const active = imgType === o.label;
                          return (
                            <button
                              key={o.label}
                              type="button"
                              onClick={() => setImgType(o.label)}
                              aria-pressed={active}
                              className={`flex items-center gap-2 rounded-lg border p-2.5 text-left transition-all ${
                                active ? 'border-gold bg-gold/[0.08] shadow-[0_0_10px_rgba(218,165,32,0.2)]' : 'border-gold/10 hover:border-gold/30 bg-[rgba(4,12,24,0.4)]'
                              }`}
                            >
                              <span className="text-lg leading-none">{o.emoji}</span>
                              <span className={`text-[11px] font-montserrat font-semibold leading-tight ${active ? 'text-gold-light' : 'text-foreground'}`}>{o.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </section>

                    <section>
                      <h2 className="font-cinzel text-sm text-gold-light mb-2 inline-flex items-center gap-2">
                        <span className="w-1 h-4 bg-gradient-to-b from-gold to-transparent rounded-full" />
                        Tom / Iluminação
                      </h2>
                      <div className="grid grid-cols-2 gap-2">
                        {TONE_META.map(o => {
                          const active = tone === o.label;
                          return (
                            <button
                              key={o.label}
                              type="button"
                              onClick={() => setTone(o.label)}
                              aria-pressed={active}
                              className={`flex items-center gap-2 rounded-lg border p-2.5 text-left transition-all ${
                                active ? 'border-gold bg-gold/[0.08] shadow-[0_0_10px_rgba(218,165,32,0.2)]' : 'border-gold/10 hover:border-gold/30 bg-[rgba(4,12,24,0.4)]'
                              }`}
                            >
                              <span className="text-lg leading-none">{o.emoji}</span>
                              <span className={`text-[11px] font-montserrat font-semibold leading-tight ${active ? 'text-gold-light' : 'text-foreground'}`}>{o.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  </div>

                  <div className="card-glass rounded-lg p-5 space-y-4">
                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-gold-light font-montserrat font-bold mb-1.5">Pedido livre (opcional)</label>
                      <input
                        type="text"
                        value={extras}
                        onChange={e => setExtras(e.target.value)}
                        placeholder="Cores obrigatórias, elementos específicos, atmosfera adicional…"
                        className="w-full bg-[rgba(4,12,24,0.6)] border border-gold/15 border-b-gold/30 rounded-md px-3 py-2 text-sm text-foreground font-merriweather placeholder:italic placeholder:text-text-dim/70 focus:outline-none focus:border-gold/50"
                      />
                    </div>

                    <div className="pt-2 border-t border-gold/10">
                      <ImageReferencePicker value={pickedRefs} onChange={setPickedRefs} gallery={gallery} codexEntries={codexEntries} max={3} />
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gold/10">
                      <button onClick={handleCreatePrompt} disabled={loading1}
                        className="px-4 py-2 rounded-md text-xs font-montserrat font-bold uppercase tracking-wider border border-gold text-gold-light hover:bg-gold/10 disabled:opacity-40 transition-all">
                        <Leaf className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />
                        {loading1 ? 'Idriel está tecendo…' : '1. Pedir Visão a Idriel'}
                      </button>
                      <button onClick={handleGenerate} disabled={loading2 || !generatedPrompt}
                        className="px-4 py-2 rounded-md text-xs font-montserrat font-bold uppercase tracking-wider bg-gold hover:bg-gold-light text-background disabled:opacity-40 transition-all">
                        <Sparkles className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />
                        {loading2 ? 'Materializando…' : '2. Materializar Visão'}
                      </button>
                    </div>
                  </div>


                  {error && <p className="text-red-alert text-sm mt-3">{error}</p>}

                  {(loading1 || loading2) && (
                    <div className="mt-4 animate-fadeUp">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gold/60 shadow-[0_0_16px_rgba(218,165,32,0.4)] shrink-0">
                          <img src={idrielAvatar} alt="Idriel" className="w-full h-full object-cover object-top" />
                        </div>
                        <div className="flex-1">
                          <span className="font-merriweather italic text-xs text-gold-light">
                            {loading1 ? 'Idriel está tecendo a essência da sua visão…' : 'O Elixir dos Mundos flui… sua visão está tomando forma…'}
                          </span>
                          <div className="w-full h-1.5 bg-gold/10 rounded-full overflow-hidden mt-1.5">
                            <div className="h-full rounded-full bg-gradient-to-r from-gold/60 via-gold to-gold/60"
                              style={{ width: loading1 ? '60%' : '80%', transition: 'width 3s ease-out' }}
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

              {generatedPrompt && !loading1 && planLimits.canUseAI && (
                <div className="animate-fadeUp card-glass rounded-lg p-5 mb-5 border border-gold/20">
                  <span className="font-cinzel text-[10px] text-gold-light mb-2 inline-flex items-center gap-1.5">
                    <Leaf className="w-3 h-3" strokeWidth={1.75} />Visão tecida por Idriel
                  </span>
                  <p className="font-merriweather text-sm text-foreground whitespace-pre-wrap leading-relaxed mb-4">{generatedPrompt}</p>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={copyPrompt} className="px-3 py-1.5 rounded-md text-xs font-montserrat border border-gold/30 text-text-secondary hover:text-foreground transition-colors">
                      {copied ? <><Check className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={2} />Copiado!</>
                              : <><ClipboardCopy className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />Copiar</>}
                    </button>
                    <button onClick={handleGenerate} disabled={loading2}
                      className="px-3 py-1.5 rounded-md text-xs font-montserrat bg-gold hover:bg-gold-light text-background disabled:opacity-40 transition-colors">
                      <Sparkles className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />Materializar Visão
                    </button>
                  </div>
                </div>
              )}

              {generatedImage && !loading2 && (
                <div className="animate-fadeUp card-glass rounded-lg p-5 border border-gold/20">
                  <span className="font-cinzel text-[10px] text-gold-light mb-3 inline-flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" strokeWidth={1.75} />Visão materializada
                  </span>
                  <img src={generatedImage} alt="Visão de Idriel" className="w-full max-w-[512px] mx-auto rounded-lg mb-4" />
                  <div className="flex flex-wrap gap-2 justify-center">
                    <button onClick={() => { setSaveCat(FOLDER_FRUITS[0].name); setShowSaveModal(true); }}
                      className="px-4 py-2 bg-gold hover:bg-gold-light text-background rounded-md text-xs font-montserrat font-bold transition-colors">
                      <Save className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />
                      Guardar em uma pasta
                    </button>
                    <a href={generatedImage} download target="_blank" rel="noopener"
                      className="px-4 py-2 rounded-md text-xs font-montserrat border border-gold/30 text-text-secondary hover:text-foreground transition-colors">
                      <ArrowDown className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={2} />Baixar
                    </a>
                  </div>
                </div>
              )}

              {/* Histórico */}
              {visions.length > 0 && (
                <div className="mt-6 rounded-lg border border-gold/15 bg-gold/[0.03] p-4">
                  <button onClick={() => setShowHistory(s => !s)} className="w-full flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-cinzel text-sm font-bold text-gold-light inline-flex items-center gap-2">
                        <ScrollText className="w-4 h-4" strokeWidth={1.75} />Visões tecidas por Idriel
                      </span>
                      <span className="text-[10px] text-text-dim font-montserrat">({visions.length})</span>
                    </div>
                    {showHistory ? <ChevronUp className="w-4 h-4 text-gold-light/60" /> : <ChevronDown className="w-4 h-4 text-gold-light/60" />}
                  </button>
                  {showHistory && (
                    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                      {visions.map(v => (
                        <div key={v.id} className="flex gap-3 rounded-md border border-gold/10 bg-background/40 p-3">
                          {v.image_url ? (
                            <img src={v.image_url} alt={v.description} loading="lazy"
                              className="w-20 h-20 object-cover rounded cursor-zoom-in flex-shrink-0"
                              onClick={() => v.image_url && setLightbox({ src: v.image_url, alt: v.description })}
                            />
                          ) : (
                            <div className="w-20 h-20 rounded bg-gold/5 border border-gold/10 flex items-center justify-center flex-shrink-0 text-gold-light/40 text-xs italic">(sem img)</div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-merriweather text-foreground line-clamp-2 mb-1">{v.description || 'Sem descrição'}</p>
                            <p className="text-[10px] text-text-dim font-mono line-clamp-2 whitespace-pre-wrap">{v.prompt}</p>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              <button onClick={() => { navigator.clipboard.writeText(v.prompt); toast.success('Prompt copiado'); }}
                                className="text-[9px] font-montserrat px-1.5 py-0.5 rounded border border-gold/20 text-gold-light/80 hover:bg-gold/10 transition-colors">
                                <ClipboardCopy className="inline-block w-3 h-3 mr-1 align-[-0.1em]" strokeWidth={1.75} />Copiar prompt
                              </button>
                              <button onClick={() => { setGeneratedPrompt(v.prompt); setDesc(v.description); toast.success('Prompt restaurado'); }}
                                className="text-[9px] font-montserrat px-1.5 py-0.5 rounded border border-gold/20 text-gold-light/80 hover:bg-gold/10 transition-colors">
                                <RotateCw className="inline-block w-3 h-3 mr-1 align-[-0.1em]" strokeWidth={1.75} />Reusar
                              </button>
                              {v.image_url && (
                                <button onClick={() => addToGallery({ id: Date.now().toString(), src: v.image_url!, name: v.description.slice(0, 40) || 'Visão de Idriel', cat: FOLDER_FRUITS[0].name, status: 'unsorted' })}
                                  className="text-[9px] font-montserrat px-1.5 py-0.5 rounded border border-gold/20 text-gold-light/80 hover:bg-gold/10 transition-colors">
                                  <Save className="inline-block w-3 h-3 mr-1 align-[-0.1em]" strokeWidth={1.75} />P/ Galeria
                                </button>
                              )}
                              <button onClick={() => { if (confirm('Excluir esta visão do histórico?')) deleteVision(v.id); }}
                                className="text-[9px] font-montserrat px-1.5 py-0.5 rounded border border-red-alert/30 text-red-alert/80 hover:bg-red-alert/10 transition-colors ml-auto">
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
        </div>
      )}

      {/* Save-to-folder modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-3 sm:p-4" onClick={() => setShowSaveModal(false)}>
          <div className="card-glass rounded-lg w-full max-w-md p-5 animate-fadeUp border border-gold/20" onClick={e => e.stopPropagation()}>
            <h3 className="font-cinzel font-bold text-foreground mb-1 inline-flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-gold-champagne" strokeWidth={1.75} />Categorizar visão
            </h3>
            <p className="font-merriweather text-xs text-text-dim italic mb-4">Escolha a pasta onde a visão será arquivada.</p>
            <div className="grid grid-cols-2 gap-1.5 mb-4 max-h-[300px] overflow-y-auto">
              {FOLDER_FRUITS.map(f => (
                <button key={f.id} onClick={() => setSaveCat(f.name)}
                  className={`px-2.5 py-1.5 rounded-md text-[11px] font-montserrat font-bold text-left transition-colors ${saveCat === f.name ? 'bg-gold/20 text-gold-light border border-gold/40' : 'text-text-dim border border-transparent hover:border-gold/20'}`}>
                  <f.Icon className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em] text-gold-champagne" strokeWidth={1.75} />{f.name}
                </button>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowSaveModal(false)} className="px-4 py-2 rounded-md text-xs font-montserrat text-text-dim border border-border hover:text-foreground transition-colors">Cancelar</button>
              <button onClick={confirmSave} className="px-4 py-2 bg-gold hover:bg-gold-light text-background rounded-md text-xs font-montserrat font-bold transition-colors inline-flex items-center gap-1.5">
                <Save className="w-3.5 h-3.5" strokeWidth={1.75} />Guardar em "{saveCat}"
              </button>
            </div>
          </div>
        </div>
      )}

      {lightbox && <ImageLightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />}
    </div>
  );
};
