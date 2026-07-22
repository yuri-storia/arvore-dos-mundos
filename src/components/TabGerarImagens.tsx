import React, { useMemo, useState } from 'react';
import { Lock, Leaf, Sparkles, Bug, Check, Save, ArrowDown, Wand2, X } from 'lucide-react';
import { STYLE_META, IMAGE_TYPE_META, TONE_META, FRUITS, GalleryImage } from '@/lib/data';
import { callAIText, callAIImage, callAIImageConsistent, friendlyAIError, type ImageQuality } from '@/lib/helpers';
import { useSubscription } from '@/hooks/useSubscription';
import { useCodexEntries } from '@/hooks/useCodexEntries';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { BugReportDialog } from '@/components/BugReportDialog';
import { ImageReferencePicker, type PickedReference } from '@/components/ImageReferencePicker';
import type { AppState } from '@/lib/data';
import idrielAvatar from '@/assets/idriel-avatar.webp';
import { createPortal } from 'react-dom';

interface Props {
  state: AppState;
  setGeneratedPrompt: (p: string) => void;
  addToGallery: (img: GalleryImage) => void;
}

type Phase = 'idle' | 'prompt' | 'image';

const QUALITY_META: { id: ImageQuality; label: string; cost: string; desc: string }[] = [
  { id: 'draft',    label: 'Rascunho',          cost: '2 gotas',  desc: 'Esboço rápido (Nano Banana 2).' },
  { id: 'standard', label: 'Padrão',            cost: '5 gotas',  desc: 'Épico com canon do Codex (Pro).' },
  { id: 'premium',  label: 'Qualidade Máxima',  cost: '15 gotas', desc: 'Cinematográfico (GPT Image 2). Até ~2 min.' },
];

export const TabGerarImagens: React.FC<Props> = ({ state, setGeneratedPrompt, addToGallery }) => {
  const { worldName, db, generatedPrompt, gallery, currentSaveId } = state;
  const sub = useSubscription();
  const planLimits = usePlanLimits();
  const { entries: codexEntries } = useCodexEntries(currentSaveId);

  const [desc, setDesc] = useState('');
  const [style, setStyle] = useState(STYLE_META[0].label);
  const [imgType, setImgType] = useState(IMAGE_TYPE_META[0].label);
  const [tone, setTone] = useState(TONE_META[0].label);
  const [extras, setExtras] = useState('');
  const [pickedRefs, setPickedRefs] = useState<PickedReference[]>([]);
  const [quality, setQuality] = useState<ImageQuality>('standard');
  const [phase, setPhase] = useState<Phase>('idle');
  const [generatedImage, setGeneratedImage] = useState('');
  const [error, setError] = useState('');
  const [showReview, setShowReview] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveCat, setSaveCat] = useState('Todos');
  const [elapsed, setElapsed] = useState(0);
  const startedAtRef = React.useRef<number | null>(null);

  const estimateSeconds = quality === 'draft' ? 8 : quality === 'standard' ? 25 : 120;
  const isBusy = phase !== 'idle';

  React.useEffect(() => {
    if (phase !== 'image') { startedAtRef.current = null; setElapsed(0); return; }
    startedAtRef.current = Date.now();
    setElapsed(0);
    const id = window.setInterval(() => {
      if (startedAtRef.current) setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 500);
    return () => window.clearInterval(id);
  }, [phase]);

  const styleMeta = STYLE_META.find(s => s.label === style)!;
  const typeMeta = IMAGE_TYPE_META.find(t => t.label === imgType)!;
  const toneMeta = TONE_META.find(t => t.label === tone)!;

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

  const autoPack = useMemo(() => {
    const codexImageUrls = codexEntries.filter(e => !!e.image_url).slice(0, 5).map(e => e.image_url as string);
    const galleryImageUrls = gallery.filter(g => g.status !== 'unsorted').slice(0, 5).map(g => g.src);
    const imageUrls = Array.from(new Set([...codexImageUrls, ...galleryImageUrls])).slice(0, 5);
    const codexText = codexEntries.slice(0, 25).map(e => {
      const t = (e.entry_type === 'ficha' ? 'Ficha' : 'Artigo');
      return `- [${t}] ${e.title}: ${(e.content || '').replace(/\s+/g, ' ').slice(0, 240)}`;
    }).join('\n');
    const referenceText = [buildContext(), codexText && `Codex canon:\n${codexText}`].filter(Boolean).join('\n\n').slice(0, 4000);
    return { imageUrls, referenceText };
  }, [codexEntries, gallery, worldName, db]);

  const openReview = () => {
    setError('');
    if (!planLimits.canUseAI) { setError('Idriel precisa do plano mensal para canalizar o Elixir dos Mundos. Faça o upgrade!'); return; }
    if (!desc.trim()) { setError('Descreva a visão que deseja materializar.'); return; }
    setShowReview(true);
  };

  const runGeneration = async () => {
    setShowReview(false);
    setError('');
    setGeneratedImage('');
    try {
      // Etapa 1 — construir prompt
      setPhase('prompt');
      const ctx = buildContext();
      const systemPrompt = 'You are an expert at writing image generation prompts. Respond ONLY with the prompt in English. Be specific about visual details, lighting, composition, and artistic style.';
      const userMsg = `World context:\n${ctx}\n\nDescription: ${desc}\nVisual style: ${style} (${styleMeta.promptHint})\nImage type: ${imgType}\nTone/Lighting: ${tone}\n${extras ? `Extra details: ${extras}` : ''}`;
      const prompt = await callAIText([{ role: 'user', content: userMsg }], systemPrompt);
      setGeneratedPrompt(prompt);

      // Etapa 2 — gerar imagem
      setPhase('image');
      let url: string;
      if (quality === 'standard') {
        const structured = pickedRefs.map(r => ({ url: r.url, intent: r.intent }));
        const legacyUrls = structured.length > 0 ? [] : autoPack.imageUrls;
        url = await callAIImageConsistent(prompt, legacyUrls, autoPack.referenceText, structured);
      } else {
        url = await callAIImage(prompt, quality);
      }
      setGeneratedImage(url);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPhase('idle');
    }
  };

  const openSaveModal = () => { if (!generatedImage) return; setSaveCat('Todos'); setShowSaveModal(true); };
  const confirmSave = () => {
    if (!generatedImage) return;
    addToGallery({ id: Date.now().toString(), src: generatedImage, name: desc.slice(0, 40) || 'Visão de Idriel', cat: saveCat === 'Todos' ? 'Geral' : saveCat });
    setShowSaveModal(false);
  };

  return (
    <div className="animate-fadeUp mx-auto max-w-[1060px] px-4 py-6">
      <h1 className="font-cinzel font-bold text-2xl text-foreground mb-1 inline-flex items-center gap-2">
        <Leaf className="w-5 h-5 text-gold-champagne" strokeWidth={1.75} />Visões de Idriel
      </h1>
      <p className="font-merriweather italic text-text-dim text-sm mb-5">
        Escolha um estilo, um tipo de cena e um tom · descreva a visão · Idriel faz o resto.
      </p>

      {!planLimits.canUseAI && (
        <div className="card-glass rounded-lg p-4 mb-5 border-l-[3px] border-l-gold/60">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-4 h-4 text-gold-light" />
            <span className="text-sm text-gold-light font-montserrat font-bold">Recurso exclusivo do plano Idriel</span>
          </div>
          <span className="text-xs text-text-dim font-merriweather block mb-2">A geração de imagens requer o plano mensal com Elixir dos Mundos.</span>
          <button
            onClick={async () => { const { openCheckout, STRIPE_PLANS } = await import('@/hooks/useSubscription'); openCheckout(STRIPE_PLANS.idriel_mensal.price_id); }}
            className="px-3 py-1.5 rounded-full text-[10px] font-montserrat font-bold uppercase tracking-wider border border-gold/40 text-gold-light hover:bg-gold/[0.12] transition-all"
          >
            <Sparkles className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />Desbloquear Idriel — R$ 39,90/mês
          </button>
        </div>
      )}

      {/* Descrição */}
      <div className="card-glass rounded-lg p-5 mb-5">
        <label className="block text-[11px] uppercase tracking-wider text-gold-light font-montserrat font-bold mb-1.5">Descreva sua visão</label>
        <textarea
          value={desc}
          onChange={e => setDesc(e.target.value)}
          placeholder="Ex.: A capital do meu reino élfico ao entardecer, com torres de cristal brilhando sob a luz dourada…"
          rows={3}
          className="w-full bg-[rgba(4,12,24,0.6)] border border-gold/15 border-b-gold/30 rounded-md px-3 py-2 text-sm text-foreground font-merriweather placeholder:italic placeholder:text-text-dim/70 focus:outline-none focus:border-gold/50 resize-y"
        />
      </div>

      {/* Estilo visual — grid de imagens */}
      <section className="mb-5">
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

      {/* Tipo de imagem + Tom */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
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

      {/* Extras + referências + qualidade */}
      <div className="card-glass rounded-lg p-5 mb-5 space-y-4">
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

        <div className="pt-3 border-t border-gold/10">
          <label className="block text-[11px] uppercase tracking-wider text-gold-light font-montserrat font-bold mb-2">Nível da Visão</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {QUALITY_META.map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setQuality(opt.id)}
                aria-pressed={quality === opt.id}
                className={`text-left rounded-md border p-3 transition-all ${
                  quality === opt.id ? 'border-gold bg-gold/[0.08] shadow-[0_0_12px_rgba(218,165,32,0.25)]' : 'border-gold/15 hover:border-gold/40 bg-[rgba(4,12,24,0.4)]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-cinzel text-sm text-foreground">{opt.label}</span>
                  <span className={`text-[10px] font-montserrat font-bold uppercase tracking-wider ${quality === opt.id ? 'text-gold-light' : 'text-text-dim'}`}>{opt.cost}</span>
                </div>
                <p className="font-merriweather text-[11px] text-text-dim leading-snug">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Botão pulsante — Gerar Imagem com Idriel */}
      <div className="flex flex-col items-center gap-3 mb-6">
        <button
          onClick={openReview}
          disabled={isBusy || !planLimits.canUseAI || !desc.trim()}
          className="group relative inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full font-cinzel text-sm font-bold uppercase tracking-wider text-background bg-gradient-to-r from-gold-bronze via-gold-warm to-gold-champagne hover:from-gold-warm hover:via-gold-champagne hover:to-gold-cream shadow-[0_0_28px_rgba(218,165,32,0.45)] hover:shadow-[0_0_40px_rgba(218,165,32,0.65)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {!isBusy && !desc.trim() ? null : (
            <span className="pointer-events-none absolute inset-0 rounded-full bg-gold/40 blur-xl opacity-70 animate-pulse -z-10" aria-hidden="true" />
          )}
          <Wand2 className="w-4 h-4" strokeWidth={2} />
          {isBusy ? 'Idriel está trabalhando…' : 'Gerar Imagem com Idriel'}
        </button>
        <p className="font-merriweather italic text-[11px] text-text-dim text-center max-w-md">
          Você poderá revisar todas as escolhas antes de confirmar o gasto de gotas.
        </p>
      </div>

      {error && (() => {
        const f = friendlyAIError(error);
        const styles = f.kind === 'balance' ? 'border-l-gold/70 bg-gold/[0.06]' : f.kind === 'prompt' ? 'border-l-blue-bright/70 bg-blue-bright/[0.05]' : 'border-l-red-alert/70 bg-red-alert/[0.06]';
        return (
          <div className={`mb-5 rounded-md border-l-[3px] ${styles} p-3 animate-fadeUp`}>
            <p className="font-cinzel text-sm text-foreground mb-1">{f.title}</p>
            <p className="font-merriweather text-xs text-text-secondary mb-2 leading-relaxed">{f.hint}</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setError('')} className="px-2.5 py-1 rounded text-[10px] font-montserrat uppercase tracking-wider text-text-dim border border-border hover:text-foreground transition-colors">Fechar</button>
              <BugReportDialog
                initialContext={`Erro de IA (${f.kind}) na aba Gerar Imagens: ${error}`}
                trigger={
                  <button className="px-2.5 py-1 rounded text-[10px] font-montserrat font-bold uppercase tracking-wider border border-red-alert/40 text-red-alert hover:bg-red-alert/10 transition-colors">
                    <Bug className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />Reportar problema
                  </button>
                }
              />
            </div>
          </div>
        );
      })()}

      {/* Progresso */}
      {isBusy && (() => {
        const pct = phase === 'prompt' ? 25 : Math.min(95, 30 + Math.round((elapsed / Math.max(estimateSeconds, 1)) * 65));
        const remaining = Math.max(0, estimateSeconds - elapsed);
        const fmt = (s: number) => s >= 60 ? `${Math.floor(s/60)}m ${s%60}s` : `${s}s`;
        const phaseCopy = phase === 'prompt'
          ? 'Idriel está tecendo a essência da sua visão…'
          : quality === 'premium'
            ? 'GPT Image 2 está pintando cada detalhe — a melhor visão demora um pouco mais.'
            : quality === 'standard'
              ? 'Nano Banana Pro está canalizando o canon do seu Codex…'
              : 'Nano Banana 2 está esboçando rapidamente…';
        return (
          <div className="card-glass rounded-lg p-4 mb-5 animate-fadeUp">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gold/60 shadow-[0_0_16px_rgba(218,165,32,0.4)] shrink-0">
                <img src={idrielAvatar} alt="Idriel" className="w-full h-full object-cover object-top" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 mb-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold dot-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-gold dot-bounce-2" />
                  <span className="w-1.5 h-1.5 rounded-full bg-gold dot-bounce-3" />
                  <span className="ml-2 font-merriweather italic text-xs text-gold-light">{phaseCopy}</span>
                </div>
                <div className="w-full h-1.5 bg-gold/10 rounded-full overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full rounded-full bg-gradient-to-r from-gold/60 via-gold to-gold/60" style={{ width: `${pct}%`, transition: 'width 1s ease-out' }} />
                </div>
                <p className="text-[10px] text-text-dim font-montserrat mt-1.5">
                  {phase === 'prompt' ? 'Etapa 1/2 — construindo prompt' : `Etapa 2/2 — decorrido ${fmt(elapsed)}${remaining > 0 ? ` · ~${fmt(remaining)} restantes` : ' · finalizando…'}`}
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Imagem gerada */}
      {generatedImage && !isBusy && (
        <div className="animate-fadeUp card-glass rounded-lg p-5 border border-gold/20">
          <span className="font-cinzel text-[10px] text-gold-light mb-3 inline-flex items-center gap-1.5"><Sparkles className="w-3 h-3" strokeWidth={1.75} />Visão materializada</span>
          <img src={generatedImage} alt="Visão de Idriel" className="w-full max-w-[512px] mx-auto rounded-lg mb-4" />
          <div className="flex flex-wrap gap-2 justify-center">
            <button onClick={openSaveModal} className="px-4 py-2 bg-gold hover:bg-gold-light text-background rounded-md text-xs font-montserrat font-bold transition-colors">
              <Save className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />Guardar na Galeria
            </button>
            <a href={generatedImage} download target="_blank" rel="noopener" className="px-4 py-2 rounded-md text-xs font-montserrat border border-gold/30 text-text-secondary hover:text-foreground transition-colors">
              <ArrowDown className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={2} />Baixar
            </a>
          </div>
        </div>
      )}

      {/* Modal de revisão */}
      {showReview && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="card-glass rounded-xl w-full max-w-lg p-6 animate-fadeUp border border-gold/30 shadow-[0_0_36px_rgba(218,165,32,0.25)]">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-cinzel font-bold text-lg text-gold-light">Revise sua visão</h3>
                <p className="font-merriweather italic text-xs text-text-dim mt-0.5">Confirme para Idriel canalizar o Elixir.</p>
              </div>
              <button onClick={() => setShowReview(false)} className="p-1.5 rounded-full text-text-dim hover:text-foreground hover:bg-white/5 transition-colors" aria-label="Fechar">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-3 mb-4">
              <img src={styleMeta.image} alt={styleMeta.label} className="w-20 h-20 rounded-lg object-cover border border-gold/30 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-cinzel text-sm text-foreground truncate">{styleMeta.label}</div>
                <div className="font-merriweather text-[11px] text-text-dim leading-snug line-clamp-3">{desc}</div>
              </div>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 mb-4 text-[11px] font-montserrat">
              <div><dt className="text-text-dim uppercase tracking-wider text-[9px]">Tipo</dt><dd className="text-foreground">{typeMeta.emoji} {typeMeta.label}</dd></div>
              <div><dt className="text-text-dim uppercase tracking-wider text-[9px]">Tom</dt><dd className="text-foreground">{toneMeta.emoji} {toneMeta.label}</dd></div>
              {extras && <div className="sm:col-span-2"><dt className="text-text-dim uppercase tracking-wider text-[9px]">Pedido livre</dt><dd className="text-foreground font-merriweather italic">{extras}</dd></div>}
              {pickedRefs.length > 0 && <div className="sm:col-span-2"><dt className="text-text-dim uppercase tracking-wider text-[9px]">Referências</dt><dd className="text-foreground">{pickedRefs.length} imagem(ns) do Codex/Galeria</dd></div>}
            </dl>

            <div className="rounded-lg border border-gold/20 bg-gold/[0.05] p-3 mb-4 flex items-center justify-between">
              <div>
                <div className="font-cinzel text-xs text-gold-light">{QUALITY_META.find(q => q.id === quality)!.label}</div>
                <div className="font-merriweather text-[10px] text-text-dim">Tempo estimado ~{estimateSeconds}s</div>
              </div>
              <div className="font-montserrat font-bold text-sm text-gold">{QUALITY_META.find(q => q.id === quality)!.cost}</div>
            </div>

            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowReview(false)} className="px-4 py-2 rounded-md text-xs font-montserrat text-text-dim border border-border hover:text-foreground transition-colors">Cancelar</button>
              <button onClick={runGeneration} className="px-5 py-2 rounded-md text-xs font-cinzel font-bold uppercase tracking-wider bg-gradient-to-r from-gold-bronze via-gold-warm to-gold-champagne text-background hover:shadow-[0_0_20px_rgba(218,165,32,0.5)] transition-all">
                <Sparkles className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={2} />Confirmar e gerar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal salvar */}
      {showSaveModal && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-3 sm:p-4">
          <div className="card-glass rounded-lg w-full max-w-sm p-5 animate-fadeUp border border-gold/20">
            <h3 className="font-cinzel font-bold text-foreground mb-1">Guardar Visão na Galeria</h3>
            <p className="font-merriweather text-xs text-text-dim italic mb-4">Em qual parte da galeria deseja guardar?</p>
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
              <button onClick={confirmSave} className="px-4 py-2 bg-gold hover:bg-gold-light text-background rounded-md text-xs font-montserrat font-bold transition-colors">
                <Save className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />Guardar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
