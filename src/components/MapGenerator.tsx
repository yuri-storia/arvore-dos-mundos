import React, { useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Map, Sparkles, Lock, Droplet, ArrowDown, RefreshCw, Wand2, Check, X, FolderOpen, Save, ScrollText, ChevronDown, ChevronUp, Trash2, Loader2 } from 'lucide-react';
import { callAIText, callAIImage, friendlyAIError } from '@/lib/helpers';
import { FRUITS, type GalleryImage } from '@/lib/data';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { useMapHistory } from '@/hooks/useMapHistory';
import idrielAvatar from '@/assets/idriel-avatar.webp';
import mapPolitical from '@/assets/style-thumbs/map-political.jpg';
import mapGeographic from '@/assets/style-thumbs/map-geographic.jpg';
import mapNautical from '@/assets/style-thumbs/map-nautical.jpg';
import mapExplorer from '@/assets/style-thumbs/map-explorer.jpg';
import mapCity from '@/assets/style-thumbs/map-city.jpg';
import { createPortal } from 'react-dom';
import { StyleCarousel } from '@/components/StyleCarousel';
import { toast } from 'sonner';

const FOLDER_FRUITS = FRUITS.filter(f => f.id !== 10);

interface MapStyle {
  id: string;
  label: string;
  desc: string;
  prompt: string;
  image?: string;
  custom?: boolean;
}

const MAP_STYLES: MapStyle[] = [
  { id: 'political',  label: 'Político',      desc: 'Fronteiras coloridas de reinos e territórios.', image: mapPolitical,  prompt: 'political map style, colored territories, labeled borders, kingdoms and regions' },
  { id: 'geographic', label: 'Geográfico',    desc: 'Relevo, rios, montanhas e biomas.',              image: mapGeographic, prompt: 'geographic topographic map, mountains, rivers, forests, deserts, elevation shading' },
  { id: 'nautical',   label: 'Náutico',       desc: 'Cartas marítimas com rotas e criaturas.',        image: mapNautical,   prompt: 'nautical sea chart, compass rose, sea routes, port cities, sea monsters, vintage cartography' },
  { id: 'explorer',   label: 'Explorador',    desc: 'Pergaminho antigo com anotações à mão.',         image: mapExplorer,   prompt: 'hand-drawn explorer map on aged parchment, ink annotations, compass rose, dotted travel routes' },
  { id: 'city',       label: 'Cidade',        desc: 'Planta urbana com distritos e marcos.',          image: mapCity,       prompt: 'fantasy city map, bird eye view, districts, walls, castle, market, docks, labeled landmarks' },
  { id: 'custom',     label: 'Personalizado', desc: 'Descreva exatamente o mapa que imagina.',        prompt: '', custom: true },
];

interface Props {
  worldName: string;
  worldId?: string;
  db: Record<number, Record<string, string>>;
  addToGallery?: (img: GalleryImage) => void;
}

type Phase = 'idle' | 'prompt' | 'image';

export const MapGenerator: React.FC<Props> = ({ worldName, worldId, db, addToGallery }) => {
  const planLimits = usePlanLimits();
  const [selectedStyle, setSelectedStyle] = useState<string>('explorer');
  const [customDesc, setCustomDesc] = useState('');
  const [generatedImage, setGeneratedImage] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState('');
  const [showReview, setShowReview] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveCat, setSaveCat] = useState<string>(FOLDER_FRUITS[0].name);

  const { history, addMap, deleteMap } = useMapHistory(worldId);
  const [showHistory, setShowHistory] = useState(false);

  const previewRef = React.useRef<HTMLDivElement>(null);
  const reopen = (url: string) => {
    setGeneratedImage(url);
    setError('');
    setTimeout(() => previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const styleObj = MAP_STYLES.find(s => s.id === selectedStyle)!;
  const isBusy = phase !== 'idle';

  const buildWorldContext = () => {
    const parts: string[] = [];
    if (worldName) parts.push(`World: ${worldName}`);
    const mapData = db[0];
    if (mapData) {
      FRUITS[0].fields.forEach(f => { if (mapData[f.id]?.trim()) parts.push(`${f.label}: ${mapData[f.id]}`); });
    }
    [1, 6].forEach(fId => {
      const data = db[fId]; if (!data) return;
      const fruit = FRUITS[fId];
      const vals = fruit.fields.map(f => data[f.id]).filter(Boolean);
      if (vals.length) parts.push(`${fruit.name}: ${vals.join('; ')}`);
    });
    return parts.join('\n');
  };

  const openReview = () => {
    setError('');
    if (!planLimits.canUseAI) { setError('Idriel precisa do plano ativo para canalizar o Elixir dos Mundos.'); return; }
    if (styleObj.custom && !customDesc.trim()) { setError('Descreva o mapa que imagina.'); return; }
    setShowReview(true);
  };

  const runGeneration = async () => {
    setShowReview(false);
    setError('');
    setGeneratedImage('');
    try {
      setPhase('prompt');
      const ctx = buildWorldContext();
      const stylePrompt = styleObj.custom ? customDesc : `${styleObj.label}: ${styleObj.desc}. Style keywords: ${styleObj.prompt}`;
      const systemPrompt = 'You are an expert at writing detailed image generation prompts for fantasy world maps. Respond ONLY with the prompt in English. Be very specific about visual details, cartographic elements, labels, terrain features, colors, and artistic style.';
      const userMsg = `Generate a detailed map image prompt for this fantasy world.\n\nWorld context:\n${ctx}\n\nMap style requested: ${stylePrompt}\n${customDesc && !styleObj.custom ? `Additional details: ${customDesc}` : ''}`;
      const prompt = await callAIText([{ role: 'user', content: userMsg }], systemPrompt);

      setPhase('image');
      const url = await callAIImage(prompt);
      setGeneratedImage(url);
      await addMap({ image_url: url, style: styleObj.id, style_label: styleObj.label, description: customDesc });
    } catch (e: any) {
      const f = friendlyAIError(e?.message || '');
      setError(`${f.title} ${f.hint}`);
    } finally {
      setPhase('idle');
    }
  };

  return (
    <div className="border-t border-gold-warm/20 pt-6">
      <div className="flex items-center gap-2 mb-1">
        <Map className="w-4 h-4 text-gold-champagne" />
        <span className="font-cinzel font-bold text-sm text-gradient-gold">Forjar Mapa do Mundo</span>
      </div>
      <p className="font-merriweather italic text-[11px] text-text-dim mb-1">
        Escolha um estilo cartográfico · Idriel usa o contexto dos Frutos para desenhar seu mapa.
      </p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-4">
        <span className="inline-flex items-center gap-1 text-[10px] font-montserrat font-semibold text-gold-champagne">
          <Droplet className="w-3.5 h-3.5" strokeWidth={1.75} />Custo: 5 gotas por mapa
        </span>
      </div>

      {!planLimits.canUseAI ? (
        <div className="relative rounded-xl overflow-hidden border border-gold/20 mb-4">
          <div className="absolute inset-0 bg-gradient-to-br from-gold/[0.04] via-background/80 to-gold/[0.02]" />
          <div className="relative p-5 text-center">
            <div className="relative w-16 h-16 mx-auto mb-3">
              <div className="absolute inset-0 rounded-full bg-gold/10 animate-pulse" />
              <div className="relative w-full h-full rounded-full bg-gradient-to-br from-gold/20 to-gold/5 border-2 border-gold/30 flex items-center justify-center shadow-[0_0_24px_rgba(218,165,32,0.15)]">
                <Map className="w-8 h-8 text-gold-champagne" strokeWidth={1.5} />
                <Lock className="absolute bottom-3 right-3 w-4 h-4 text-gold-light drop-shadow-lg" />
              </div>
            </div>
            <h3 className="font-cinzel font-bold text-base text-gold-light mb-2">O Mapa aguarda o Elixir</h3>
            <button
              onClick={async () => { const { openCheckout, STRIPE_PLANS } = await import('@/hooks/useSubscription'); openCheckout(STRIPE_PLANS.idriel_mensal.price_id); }}
              className="px-5 py-2.5 rounded-full text-xs font-montserrat font-bold uppercase tracking-wider bg-gradient-to-r from-gold to-gold-light text-background hover:shadow-[0_0_20px_rgba(218,165,32,0.3)] transition-all"
            >
              <Sparkles className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />Colher o Fruto Dourado — R$ 39,90/mês
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Carrossel de estilos */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-cinzel text-xs text-gold-light inline-flex items-center gap-2">
                <span className="w-1 h-3.5 bg-gradient-to-b from-gold to-transparent rounded-full" />
                Estilo cartográfico
              </span>
              <span className="text-[10px] font-montserrat uppercase tracking-wider text-text-dim">{styleObj.label}</span>
            </div>
            <StyleCarousel
              items={MAP_STYLES.map(s => ({ id: s.id, label: s.label, description: s.desc, image: s.image }))}
              selectedId={selectedStyle}
              onSelect={setSelectedStyle}
              size="sm"
            />
          </div>


          <textarea
            value={customDesc}
            onChange={e => setCustomDesc(e.target.value)}
            placeholder={styleObj.custom
              ? 'Descreva o mapa que imagina em detalhes: regiões, elementos, atmosfera…'
              : 'Detalhes adicionais (opcional): "incluir um vulcão ao norte", "mar congelado ao sul"…'}
            rows={2}
            className="w-full bg-[rgba(4,12,24,0.6)] border border-gold/15 rounded-md px-3 py-2 text-sm text-foreground font-merriweather placeholder:italic placeholder:text-text-dim/70 focus:outline-none focus:border-gold/50 resize-y mb-4"
          />

          <div className="flex flex-col items-center gap-2">
            <button
              onClick={openReview}
              disabled={isBusy || (styleObj.custom && !customDesc.trim())}
              className="group relative inline-flex items-center gap-2.5 px-7 py-3 rounded-full font-cinzel text-sm font-bold uppercase tracking-wider text-background bg-gradient-to-r from-gold-bronze via-gold-warm to-gold-champagne hover:from-gold-warm hover:via-gold-champagne hover:to-gold-cream shadow-[0_0_24px_rgba(218,165,32,0.4)] hover:shadow-[0_0_36px_rgba(218,165,32,0.6)] transition-all disabled:opacity-40"
            >
              <span className="pointer-events-none absolute inset-0 rounded-full bg-gold/40 blur-xl opacity-70 animate-pulse -z-10" aria-hidden="true" />
              <Wand2 className="w-4 h-4" strokeWidth={2} />
              {isBusy ? 'Idriel está desenhando…' : 'Gerar Mapa com Idriel'}
            </button>
            <p className="font-merriweather italic text-[10px] text-text-dim">Você poderá revisar antes de confirmar as 5 gotas.</p>
          </div>
        </>
      )}

      {error && (
        <div className="text-red-alert text-xs font-montserrat mt-4 p-2 rounded border border-red-alert/20 bg-red-alert/5">{error}</div>
      )}

      {isBusy && (
        <div className="flex items-center gap-3 mt-4 p-3 rounded-lg card-glass">
          <img src={idrielAvatar} alt="Idriel" className="w-8 h-8 rounded-full border border-gold/40" />
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-gold dot-bounce" />
            <span className="w-1.5 h-1.5 rounded-full bg-gold dot-bounce-2" />
            <span className="w-1.5 h-1.5 rounded-full bg-gold dot-bounce-3" />
          </div>
          <span className="font-merriweather italic text-xs text-gold-light">
            {phase === 'prompt' ? 'Traçando as linhas do firmamento…' : 'O Elixir molda o território…'}
          </span>
        </div>
      )}

      {generatedImage && !isBusy && (
        <div ref={previewRef} className="animate-fadeUp mt-4 card-glass rounded-lg p-4 border border-gold/20 relative scroll-mt-24">
          <button
            onClick={() => setGeneratedImage('')}
            aria-label="Fechar mapa gerado"
            className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-background/60 hover:bg-background/90 border border-gold/25 hover:border-gold/50 text-gold-light/80 hover:text-gold-light flex items-center justify-center transition-all shadow-[0_0_12px_rgba(218,165,32,0.15)] hover:shadow-[0_0_16px_rgba(218,165,32,0.3)] z-10"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
          <span className="font-cinzel text-[10px] text-gold-light mb-3 inline-flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" strokeWidth={1.75} />Mapa materializado
          </span>
          <div className="rounded-lg overflow-hidden border border-gold/20 mb-3">
            <img src={generatedImage} alt="Mapa gerado" className="w-full" />
          </div>
          <div className="flex flex-wrap gap-2">
            {addToGallery && (
              <button
                onClick={() => { setSaveCat(FRUITS[0].name); setShowSaveModal(true); }}
                className="group relative overflow-hidden px-4 py-1.5 rounded-md text-[10px] font-montserrat font-bold uppercase tracking-wider text-background bg-gradient-to-r from-gold-bronze via-gold-warm to-gold-champagne hover:shadow-[0_0_20px_rgba(218,165,32,0.5)] transition-all"
              >
                <FolderOpen className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={2} />
                Guardar em uma pasta
              </button>
            )}
            <a href={generatedImage} download={`mapa-${worldName || 'mundo'}.png`} className="px-3 py-1.5 border border-gold/30 text-gold-light text-[10px] font-montserrat font-bold uppercase rounded hover:bg-gold/10 transition-colors">
              <ArrowDown className="inline-block w-3.5 h-3.5 mr-1 align-[-0.15em]" strokeWidth={2} />Download
            </a>
            <button onClick={() => { setGeneratedImage(''); setCustomDesc(''); }} className="px-3 py-1.5 border border-gold/20 text-text-dim text-[10px] font-montserrat font-bold uppercase rounded hover:text-foreground transition-colors">
              <RefreshCw className="inline-block w-3.5 h-3.5 mr-1 align-[-0.15em]" strokeWidth={2} />Gerar Outro
            </button>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-6 rounded-lg border border-gold/15 bg-gradient-to-br from-gold/[0.04] via-transparent to-gold/[0.02] p-4">
          <button
            onClick={() => setShowHistory(s => !s)}
            aria-expanded={showHistory}
            className="group w-full flex items-center justify-between gap-3 px-3 py-2.5 -mx-1 -mt-1 mb-3 rounded-md bg-gradient-to-r from-gold/[0.06] via-gold/[0.10] to-gold/[0.06] hover:from-gold/[0.10] hover:via-gold/[0.16] hover:to-gold/[0.10] border border-gold/20 hover:border-gold/40 shadow-[inset_0_1px_0_rgba(255,220,150,0.08)] hover:shadow-[0_2px_16px_-4px_rgba(218,165,32,0.35),inset_0_1px_0_rgba(255,220,150,0.15)] transition-all cursor-pointer"
          >
            <span className="flex items-center gap-2 min-w-0">
              <span className="font-cinzel text-sm font-bold bg-gradient-to-r from-gold-cream via-gold-light to-gold bg-clip-text text-transparent inline-flex items-center gap-2">
                <ScrollText className="w-4 h-4 text-gold-light" strokeWidth={1.75} />Mapas traçados por Idriel
              </span>
              <span className="text-[10px] text-gold-light/60 font-montserrat">({history.length})</span>
            </span>
            {showHistory
              ? <ChevronUp className="w-4 h-4 text-gold-light/80 group-hover:text-gold-light transition-colors shrink-0" />
              : <ChevronDown className="w-4 h-4 text-gold-light/80 group-hover:text-gold-light transition-colors shrink-0" />}
          </button>
          {showHistory && (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {history.map(h => (
                <div key={h.id} className="flex gap-3 rounded-md border border-gold/10 bg-background/40 p-3">
                  <img
                    src={h.image_url}
                    alt={h.style_label}
                    loading="lazy"
                    className="w-20 h-20 object-cover rounded cursor-pointer flex-shrink-0"
                    onClick={() => reopen(h.image_url)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-cinzel text-gold-light">{h.style_label}</p>
                    <p className="text-[10px] text-text-dim font-merriweather italic line-clamp-2">{h.description || 'Sem descrição adicional'}</p>
                    <p className="text-[9px] text-text-dim/70 font-montserrat mt-0.5">{new Date(h.created_at).toLocaleString('pt-BR')}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <button onClick={() => reopen(h.image_url)}
                        className="text-[9px] font-montserrat px-1.5 py-0.5 rounded border border-gold/20 text-gold-light/80 hover:bg-gold/10 transition-colors">
                        <Sparkles className="inline-block w-3 h-3 mr-1 align-[-0.1em]" strokeWidth={1.75} />Reabrir
                      </button>
                      {addToGallery && (
                        <button onClick={() => { addToGallery({ id: Date.now().toString(), src: h.image_url, name: `Mapa — ${h.style_label}`, cat: FRUITS[0].name, status: 'kept' }); toast.success('Mapa guardado na Galeria'); }}
                          className="text-[9px] font-montserrat px-1.5 py-0.5 rounded border border-gold/20 text-gold-light/80 hover:bg-gold/10 transition-colors">
                          <Save className="inline-block w-3 h-3 mr-1 align-[-0.1em]" strokeWidth={1.75} />P/ Galeria
                        </button>
                      )}
                      <a href={h.image_url} download={`mapa-${worldName || 'mundo'}.png`}
                        className="text-[9px] font-montserrat px-1.5 py-0.5 rounded border border-gold/20 text-gold-light/80 hover:bg-gold/10 transition-colors">
                        <ArrowDown className="inline-block w-3 h-3 mr-1 align-[-0.1em]" strokeWidth={1.75} />Baixar
                      </a>
                      <button onClick={() => { if (confirm('Remover este mapa do histórico?')) deleteMap(h.id); }}
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

      {showReview && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="card-glass rounded-xl w-full max-w-md p-6 animate-fadeUp border border-gold/30 shadow-[0_0_36px_rgba(218,165,32,0.25)]">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-cinzel font-bold text-lg text-gold-light">Confirmar mapa</h3>
                <p className="font-merriweather italic text-xs text-text-dim mt-0.5">Revise o estilo antes de gastar gotas.</p>
              </div>
              <button onClick={() => setShowReview(false)} className="p-1.5 rounded-full text-text-dim hover:text-foreground hover:bg-white/5 transition-colors" aria-label="Fechar"><X className="w-4 h-4" /></button>
            </div>

            <div className="flex gap-3 mb-4">
              {styleObj.image ? (
                <img src={styleObj.image} alt={styleObj.label} className="w-20 h-20 rounded-lg object-cover border border-gold/30 shrink-0" />
              ) : (
                <div className="w-20 h-20 rounded-lg border border-gold/30 flex items-center justify-center bg-gold/[0.05] shrink-0">
                  <Sparkles className="w-8 h-8 text-gold-champagne" strokeWidth={1.5} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-cinzel text-sm text-foreground">{styleObj.label}</div>
                <div className="font-merriweather text-[11px] text-text-dim leading-snug">{styleObj.desc}</div>
                {customDesc && <div className="mt-1 font-merriweather italic text-[11px] text-gold-light/80 line-clamp-2">"{customDesc}"</div>}
              </div>
            </div>

            <div className="rounded-lg border border-gold/20 bg-gold/[0.05] p-3 mb-4 flex items-center justify-between">
              <div>
                <div className="font-cinzel text-xs text-gold-light">Custo</div>
                <div className="font-merriweather text-[10px] text-text-dim">Tempo estimado ~30s</div>
              </div>
              <div className="font-montserrat font-bold text-sm text-gold inline-flex items-center gap-1"><Droplet className="w-3.5 h-3.5" />5 gotas</div>
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

      {showSaveModal && addToGallery && generatedImage && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="card-glass rounded-xl w-full max-w-md p-6 animate-fadeUp border border-gold/30 shadow-[0_0_36px_rgba(218,165,32,0.25)]">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-cinzel font-bold text-lg text-gold-light inline-flex items-center gap-2">
                  <FolderOpen className="w-4 h-4" />Guardar mapa em uma pasta
                </h3>
                <p className="font-merriweather italic text-xs text-text-dim mt-0.5">Escolha o Fruto onde deseja arquivar este mapa.</p>
              </div>
              <button onClick={() => setShowSaveModal(false)} className="p-1.5 rounded-full text-text-dim hover:text-foreground hover:bg-white/5 transition-colors" aria-label="Fechar"><X className="w-4 h-4" /></button>
            </div>

            <div className="rounded-lg overflow-hidden border border-gold/20 mb-4">
              <img src={generatedImage} alt="Prévia do mapa" className="w-full max-h-48 object-cover" />
            </div>

            <label className="block font-cinzel text-xs text-gold-light mb-2">Pasta</label>
            <select
              value={saveCat}
              onChange={e => setSaveCat(e.target.value)}
              className="w-full bg-[rgba(4,12,24,0.6)] border border-gold/20 rounded-md px-3 py-2 text-sm text-foreground font-merriweather focus:outline-none focus:border-gold/50 mb-4"
            >
              {FOLDER_FRUITS.map(f => (
                <option key={f.id} value={f.name}>{f.name}</option>
              ))}
            </select>

            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowSaveModal(false)} className="px-4 py-2 rounded-md text-xs font-montserrat text-text-dim border border-border hover:text-foreground transition-colors">Cancelar</button>
              <button
                onClick={() => {
                  addToGallery({
                    id: Date.now().toString(),
                    src: generatedImage,
                    name: `Mapa — ${worldName || 'Mundo'}`,
                    cat: saveCat,
                    status: 'kept',
                  });
                  setShowSaveModal(false);
                  toast.success(`Mapa guardado em "${saveCat}"`);
                }}
                className="px-5 py-2 rounded-md text-xs font-cinzel font-bold uppercase tracking-wider bg-gradient-to-r from-gold-bronze via-gold-warm to-gold-champagne text-background hover:shadow-[0_0_20px_rgba(218,165,32,0.5)] transition-all"
              >
                <Save className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={2} />Guardar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
