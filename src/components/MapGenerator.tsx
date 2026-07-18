import React, { useState } from 'react';
import { Map, Compass, Mountain, Anchor, Building2, Globe, Sparkles, Lock, Droplet, Loader2, Leaf, ArrowDown, RefreshCw } from 'lucide-react';
import { callAIText, callAIImage, friendlyAIError } from '@/lib/helpers';
import { FRUITS, GalleryImage, GALLERY_CATEGORIES } from '@/lib/data';
import { useSubscription } from '@/hooks/useSubscription';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import idrielAvatar from '@/assets/idriel-avatar.webp';

const MAP_STYLES = [
  { id: 'political', label: 'Político', icon: Globe, desc: 'Fronteiras, reinos e territórios com cores distintas', prompt: 'political map style, colored territories, labeled borders, kingdoms and regions' },
  { id: 'geographic', label: 'Geográfico', icon: Mountain, desc: 'Relevo, rios, montanhas e biomas naturais', prompt: 'geographic topographic map, mountains, rivers, forests, deserts, elevation shading' },
  { id: 'nautical', label: 'Náutico', icon: Anchor, desc: 'Rotas marítimas, portos e monstros nos mares', prompt: 'nautical sea chart, compass rose, sea routes, port cities, sea monsters, vintage cartography' },
  { id: 'explorer', label: 'Explorador', icon: Compass, desc: 'Pergaminho antigo com anotações à mão', prompt: 'hand-drawn explorer map on aged parchment, ink annotations, compass rose, dotted travel routes' },
  { id: 'city', label: 'Cidade', icon: Building2, desc: 'Planta urbana com distritos e pontos de interesse', prompt: 'fantasy city map, bird eye view, districts, walls, castle, market, docks, labeled landmarks' },
  { id: 'custom', label: 'Personalizado', icon: Sparkles, desc: 'Descreva exatamente o que imagina', prompt: '' },
] as const;

interface Props {
  worldName: string;
  db: Record<number, Record<string, string>>;
}

export const MapGenerator: React.FC<Props> = ({ worldName, db }) => {
  const sub = useSubscription();
  const planLimits = usePlanLimits();
  const [selectedStyle, setSelectedStyle] = useState<string>('explorer');
  const [customDesc, setCustomDesc] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState('');
  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [loadingImage, setLoadingImage] = useState(false);
  const [error, setError] = useState('');

  const styleObj = MAP_STYLES.find(s => s.id === selectedStyle)!;

  const buildWorldContext = () => {
    const parts: string[] = [];
    if (worldName) parts.push(`World: ${worldName}`);
    // Pull map-specific data from fruit 0
    const mapData = db[0];
    if (mapData) {
      const mapFruit = FRUITS[0];
      mapFruit.fields.forEach(f => {
        if (mapData[f.id]?.trim()) parts.push(`${f.label}: ${mapData[f.id]}`);
      });
    }
    // Also pull geography-relevant data from other fruits
    [1, 6].forEach(fId => {
      const data = db[fId];
      if (!data) return;
      const fruit = FRUITS[fId];
      const vals = fruit.fields.map(f => data[f.id]).filter(Boolean);
      if (vals.length) parts.push(`${fruit.name}: ${vals.join('; ')}`);
    });
    return parts.join('\n');
  };

  const handleGeneratePrompt = async () => {
    if (!planLimits.canUseAI) { setError('Idriel precisa do plano ativo para canalizar o Elixir dos Mundos.'); return; }
    setError('');
    setLoadingPrompt(true);
    setGeneratedPrompt('');
    setGeneratedImage('');
    try {
      const ctx = buildWorldContext();
      const stylePrompt = styleObj.id === 'custom' ? customDesc : `${styleObj.label}: ${styleObj.desc}. Style keywords: ${styleObj.prompt}`;
      const systemPrompt = 'You are an expert at writing detailed image generation prompts for fantasy world maps. Respond ONLY with the prompt in English. Be very specific about visual details, cartographic elements, labels, terrain features, colors, and artistic style. The map should look professional and immersive.';
      const userMsg = `Generate a detailed map image prompt for this fantasy world.\n\nWorld context:\n${ctx}\n\nMap style requested: ${stylePrompt}\n${customDesc && styleObj.id !== 'custom' ? `Additional details: ${customDesc}` : ''}`;
      const result = await callAIText(
        [{ role: 'user', content: userMsg }],
        systemPrompt
      );
      setGeneratedPrompt(result);
    } catch (e: any) {
      const f = friendlyAIError(e?.message || '');
      setError(`${f.title} ${f.hint}`);
    } finally {
      setLoadingPrompt(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!generatedPrompt) return;
    setError('');
    setLoadingImage(true);
    try {
      const imageUrl = await callAIImage(generatedPrompt);
      setGeneratedImage(imageUrl);
    } catch (e: any) {
      const f = friendlyAIError(e?.message || '');
      setError(`${f.title} ${f.hint}`);
    } finally {
      setLoadingImage(false);
    }
  };

  return (
    <div className="border-t border-gold-warm/20 pt-6">
      <div className="flex items-center gap-2 mb-1">
        <Map className="w-4 h-4 text-gold-champagne" />
        <span className="font-cinzel font-bold text-sm text-gradient-gold inline-flex items-center gap-2"><Map className="w-4 h-4" strokeWidth={1.75} />Forjar Mapa do Mundo</span>
      </div>
      <p className="font-merriweather italic text-[11px] text-text-dim mb-1">
        Idriel materializa o mapa do seu mundo usando o Elixir dos Mundos e o contexto dos seus Frutos.
      </p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-4">
        <span className="inline-flex items-center gap-1 text-[10px] font-montserrat font-semibold text-gold-champagne">
          <><Droplet className="inline-block w-3.5 h-3.5 mr-1 align-[-0.15em]" strokeWidth={1.75} />Custo: 5 gotas por mapa</>
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] font-montserrat text-gold-light/80">
          <><Sparkles className="inline-block w-3 h-3 mr-1 align-[-0.1em]" strokeWidth={1.75} />Fruto Dourado = 100 gotas/mês</>
        </span>
      </div>

      {/* Fruto Dourado lock for map generation */}
      {!planLimits.canUseAI ? (
        <div className="relative rounded-xl overflow-hidden border border-gold/20 mb-4">
          <div className="absolute inset-0 bg-gradient-to-br from-gold/[0.04] via-background/80 to-gold/[0.02]" />
          <div className="relative p-5 text-center">
            <div className="relative w-16 h-16 mx-auto mb-3">
              <div className="absolute inset-0 rounded-full bg-gold/10 animate-pulse" />
              <div className="relative w-full h-full rounded-full bg-gradient-to-br from-gold/20 to-gold/5 border-2 border-gold/30 flex items-center justify-center shadow-[0_0_24px_rgba(218,165,32,0.15)]">
                <div className="relative">
                  <Map className="w-8 h-8 text-gold-champagne" strokeWidth={1.5} />
                  <Lock className="absolute -bottom-1 -right-1 w-4 h-4 text-gold-light drop-shadow-lg" />
                </div>
              </div>
            </div>
            <h3 className="font-cinzel font-bold text-base text-gold-light mb-2">O Mapa aguarda o Elixir dos Mundos</h3>
            <div className="flex items-start gap-2.5 text-left bg-gold/[0.04] rounded-lg p-2.5 border border-gold/10 max-w-sm mx-auto mb-4">
              <img src={idrielAvatar} alt="Idriel" className="w-7 h-7 rounded-full border border-gold/30 shrink-0 mt-0.5" />
              <p className="font-merriweather text-xs text-text-secondary leading-relaxed italic">
                "Para traçar as linhas do seu mundo, preciso canalizar o Elixir dos Mundos. Colha o Fruto Dourado e juntos daremos forma ao seu mapa."
              </p>
            </div>
            <button
              onClick={async () => { const { openCheckout, STRIPE_PLANS } = await import('@/hooks/useSubscription'); openCheckout(STRIPE_PLANS.idriel_mensal.price_id); }}
              className="px-5 py-2.5 rounded-full text-xs font-montserrat font-bold uppercase tracking-wider bg-gradient-to-r from-gold to-gold-light text-background hover:shadow-[0_0_20px_rgba(218,165,32,0.3)] transition-all"
            >
              <><Sparkles className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />Colher o Fruto Dourado — R$ 39,90/mês</>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Style grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
            {MAP_STYLES.map(s => {
              const Icon = s.icon;
              const isActive = selectedStyle === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedStyle(s.id)}
                  className={`flex items-start gap-2 p-3 rounded-lg text-left transition-all ${
                    isActive
                      ? 'border border-gold-warm/60 bg-gradient-to-br from-gold-bronze/15 to-gold-deep/10 shadow-[0_0_20px_-4px_hsl(var(--gold-warm)/0.35)]'
                      : 'border border-blue-bright/10 bg-blue-bright/[0.02] hover:border-gold-bronze/25'
                  }`}
                >
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isActive ? 'text-gold-champagne' : 'text-text-dim'}`} />
                  <div>
                    <span className={`font-montserrat font-bold text-[11px] uppercase block ${isActive ? 'text-gold-champagne' : 'text-text-secondary'}`}>
                      {s.label}
                    </span>
                    <span className={`font-merriweather text-[10px] leading-tight block ${isActive ? 'text-gold-light/80' : 'text-text-dim'}`}>{s.desc}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Custom description / additional notes */}
          <textarea
            value={customDesc}
            onChange={e => setCustomDesc(e.target.value)}
            placeholder={styleObj.id === 'custom'
              ? 'Descreva o mapa que imagina em detalhes: regiões, elementos, atmosfera…'
              : 'Detalhes adicionais (opcional): "incluir um vulcão ao norte", "mar congelado ao sul"…'}
            rows={2}
            className="w-full bg-idriel/[0.04] border border-idriel/15 rounded-md px-3 py-2 text-sm text-foreground font-merriweather placeholder:italic placeholder:text-text-dim/70 focus:outline-none focus:border-idriel/50 resize-y mb-3"
          />

          {/* Generate prompt button */}
          <button
            onClick={handleGeneratePrompt}
            disabled={loadingPrompt || (styleObj.id === 'custom' && !customDesc.trim())}
            className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-gold-bronze via-gold-warm to-gold-champagne hover:from-gold-warm hover:via-gold-champagne hover:to-gold-cream text-[#1a0f00] rounded-md text-xs font-montserrat font-bold uppercase tracking-wider disabled:opacity-40 transition-all shadow-[0_0_16px_hsl(var(--gold-warm)/0.35)] hover:shadow-[0_0_24px_hsl(var(--gold-champagne)/0.55)] mb-4"
          >
            <>{loadingPrompt ? <><Loader2 className="inline-block w-3.5 h-3.5 mr-1.5 animate-spin align-[-0.15em]" strokeWidth={2} />Canalizando a visão…</> : <><Map className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />Gerar Visão do Mapa</>}</>
          </button>
        </>
      )}

      {loadingPrompt && (
        <div className="flex items-center gap-2 text-text-dim text-sm mb-4">
          <img src={idrielAvatar} alt="Idriel" className="w-6 h-6 rounded-full border border-idriel/30" />
          <span className="w-1.5 h-1.5 rounded-full bg-idriel-light dot-bounce" />
          <span className="w-1.5 h-1.5 rounded-full bg-idriel-light dot-bounce-2" />
          <span className="w-1.5 h-1.5 rounded-full bg-idriel-light dot-bounce-3" />
          <span className="font-merriweather italic text-xs">Idriel traça as linhas do firmamento…</span>
        </div>
      )}

      {error && (
        <div className="text-red-alert text-xs font-montserrat mb-3 p-2 rounded border border-red-alert/20 bg-red-alert/5">
          {error}
        </div>
      )}

      {/* Generated prompt */}
      {generatedPrompt && !loadingPrompt && (
        <div className="animate-fadeUp mb-4">
          <div className="border-l-[3px] border-idriel-light pl-4 py-3 bg-idriel/[0.04] rounded-r-md">
            <span className="font-cinzel text-[10px] text-idriel-light mb-2 inline-flex items-center gap-1.5"><Leaf className="w-3 h-3" strokeWidth={1.75} />Visão de Idriel — Prompt do Mapa</span>
            <p className="font-merriweather text-xs text-text-secondary leading-relaxed mb-3">{generatedPrompt}</p>
            <button
              onClick={handleGenerateImage}
              disabled={loadingImage}
              className="px-4 py-2 bg-gradient-to-r from-gold-bronze via-gold-warm to-gold-champagne hover:from-gold-warm hover:via-gold-champagne hover:to-gold-cream text-[#1a0f00] rounded-md text-xs font-montserrat font-bold uppercase tracking-wider disabled:opacity-40 transition-all shadow-[0_0_14px_hsl(var(--gold-warm)/0.35)]"
            >
              <>{loadingImage ? <><Loader2 className="inline-block w-3.5 h-3.5 mr-1.5 animate-spin align-[-0.15em]" strokeWidth={2} />Materializando…</> : <><Sparkles className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />Materializar Mapa (5 gotas)</>}</>
            </button>
          </div>
        </div>
      )}

      {loadingImage && (
        <div className="flex flex-col items-center gap-3 py-8">
          <img src={idrielAvatar} alt="Idriel" className="w-12 h-12 rounded-full border-2 border-gold/40 animate-pulse" />
          <span className="font-merriweather italic text-sm text-gold-light">O Elixir dos Mundos molda o território…</span>
          <div className="flex gap-1">
            <span className="w-2 h-2 rounded-full bg-gold dot-bounce" />
            <span className="w-2 h-2 rounded-full bg-gold dot-bounce-2" />
            <span className="w-2 h-2 rounded-full bg-gold dot-bounce-3" />
          </div>
        </div>
      )}

      {/* Generated map */}
      {generatedImage && !loadingImage && (
        <div className="animate-fadeUp">
          <div className="rounded-lg overflow-hidden border border-gold/20 mb-3">
            <img src={generatedImage} alt="Mapa gerado" className="w-full" />
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={generatedImage}
              download={`mapa-${worldName || 'mundo'}.png`}
              className="px-3 py-1.5 border border-blue-bright/20 text-blue-light text-[10px] font-montserrat font-bold uppercase rounded hover:bg-blue-bright/10 transition-colors"
            >
              <><ArrowDown className="inline-block w-3.5 h-3.5 mr-1 align-[-0.15em]" strokeWidth={2} />Download</>
            </a>
            <button
              onClick={() => { setGeneratedPrompt(''); setGeneratedImage(''); setCustomDesc(''); }}
              className="px-3 py-1.5 border border-blue-bright/20 text-text-dim text-[10px] font-montserrat font-bold uppercase rounded hover:text-foreground transition-colors"
            >
              <><RefreshCw className="inline-block w-3.5 h-3.5 mr-1 align-[-0.15em]" strokeWidth={2} />Gerar Outro</>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
