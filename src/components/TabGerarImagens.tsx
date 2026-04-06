import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { STYLE_OPTIONS, IMAGE_TYPE_OPTIONS, TONE_OPTIONS, FRUITS, GalleryImage } from '@/lib/data';
import { callAIText, callAIImage } from '@/lib/helpers';
import { useSubscription } from '@/hooks/useSubscription';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import type { AppState } from '@/lib/data';
import idrielAvatar from '@/assets/idriel-avatar.png';

interface Props {
  state: AppState;
  setGeneratedPrompt: (p: string) => void;
  addToGallery: (img: GalleryImage) => void;
}

export const TabGerarImagens: React.FC<Props> = ({ state, setGeneratedPrompt, addToGallery }) => {
  const { worldName, db, generatedPrompt } = state;
  const sub = useSubscription();
  const planLimits = usePlanLimits();
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

  const creditsLeft = sub.creditLimit - sub.creditsUsed;

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
    if (!planLimits.canUseAI) { setError('🌿 Idriel precisa do plano mensal para canalizar a Seiva Dourada. Faça o upgrade!'); return; }
    if (!desc.trim()) { setError('Descreva a visão que deseja materializar.'); return; }
    setError('');
    setLoading1(true);
    try {
      const ctx = buildContext();
      const systemPrompt = 'You are an expert at writing image generation prompts. Respond ONLY with the prompt in English. Be specific about visual details, lighting, composition, and artistic style.';
      const userMsg = `World context:\n${ctx}\n\nDescription: ${desc}\nVisual style: ${style}\nImage type: ${imgType}\nTone/Lighting: ${tone}\n${extras ? `Extra details: ${extras}` : ''}`;
      const result = await callAIText(
        [{ role: 'user', content: userMsg }],
        systemPrompt
      );
      setGeneratedPrompt(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading1(false);
    }
  };

  const handleGenerate = async () => {
    if (!planLimits.canUseAI) { setError('🌿 Idriel precisa do plano mensal para materializar visões. Faça o upgrade!'); return; }
    if (!generatedPrompt) return;
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

  const openSaveModal = () => {
    if (!generatedImage) return;
    setSaveCat('Todos');
    setShowSaveModal(true);
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
    <div className="animate-fadeUp mx-auto max-w-[1060px] px-4 py-6">
      <h1 className="font-cinzel font-bold text-2xl text-foreground mb-1">🌿 Visões de Idriel</h1>
      <p className="font-merriweather italic text-text-dim text-sm mb-5">
        Idriel canaliza a Seiva Dourada da Árvore para materializar as visões do seu mundo · Descreva e ela dará forma
      </p>

      {!sub.hasIdriel && (
        <div className="card-glass rounded-lg p-4 mb-5 border-l-[3px] border-l-gold/60">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-4 h-4 text-gold-light" />
            <span className="text-sm text-gold-light font-montserrat font-bold">Recurso exclusivo do plano Idriel</span>
          </div>
          <span className="text-xs text-text-dim font-merriweather block mb-2">
            A geração de imagens e assistência de IA requerem o plano mensal com Seiva Dourada.
          </span>
          <button
            onClick={async () => { const { openCheckout, STRIPE_PLANS } = await import('@/hooks/useSubscription'); openCheckout(STRIPE_PLANS.idriel_mensal.price_id); }}
            className="px-3 py-1.5 rounded-full text-[10px] font-montserrat font-bold uppercase tracking-wider border border-gold/40 text-gold-light hover:bg-gold/[0.12] transition-all"
          >
            ✨ Desbloquear Idriel — R$ 29,90/mês
          </button>
        </div>
      )}

      {/* Form */}
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

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-3 mt-5">
          <button
            onClick={handleCreatePrompt}
            disabled={loading1 || !sub.hasIdriel}
            className="px-4 py-2 rounded-md text-xs font-montserrat font-bold uppercase tracking-wider border border-gold text-gold-light hover:bg-gold/10 disabled:opacity-40 transition-all"
          >
            {loading1 ? '🌿 Idriel está tecendo…' : '🌿 1. Pedir Visão a Idriel'}
          </button>
          <button
            onClick={handleGenerate}
            disabled={loading2 || !generatedPrompt || !sub.hasIdriel}
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
                {[...Array(8)].map((_, i) => (
                  <span
                    key={i}
                    className="absolute w-1.5 h-1.5 rounded-full bg-gold animate-[riseParticle_2s_ease-in-out_infinite]"
                    style={{
                      top: '50%', left: '50%',
                      animationDelay: `${i * 0.25}s`,
                      transform: `rotate(${i * 45}deg) translateY(-18px)`,
                      opacity: 0.7, filter: 'blur(0.5px)',
                      boxShadow: '0 0 6px hsl(var(--gold))',
                    }}
                  />
                ))}
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gold/60 shadow-[0_0_16px_rgba(218,165,32,0.4)]">
                  <img src={idrielAvatar} alt="Idriel" className="w-full h-full object-cover object-top" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1 mb-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold dot-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-gold dot-bounce-2" />
                  <span className="w-1.5 h-1.5 rounded-full bg-gold dot-bounce-3" />
                  <span className="ml-2 font-merriweather italic text-xs text-gold-light">
                    {loading1 ? 'Idriel está tecendo a essência da sua visão…' : 'A Seiva Dourada flui… sua visão está tomando forma…'}
                  </span>
                </div>
                {/* Animated progress bar */}
                <div className="w-full h-1.5 bg-gold/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-gold/60 via-gold to-gold/60 animate-[shimmer_2s_ease-in-out_infinite]"
                    style={{
                      width: loading1 ? '60%' : '80%',
                      transition: 'width 3s ease-out',
                      backgroundSize: '200% 100%',
                    }}
                  />
                </div>
                <p className="text-[9px] text-text-dim/50 mt-1 font-montserrat">
                  {loading1 ? 'Etapa 1/2 — Criando prompt otimizado' : 'Etapa 2/2 — Gerando imagem (pode levar até 30s)'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Generated prompt */}
      {generatedPrompt && !loading1 && (
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
            <button onClick={openSaveModal} className="px-4 py-2 bg-gold hover:bg-gold-light text-background rounded-md text-xs font-montserrat font-bold transition-colors">
              💾 Guardar na Galeria
            </button>
            <a href={generatedImage} download target="_blank" rel="noopener" className="px-4 py-2 rounded-md text-xs font-montserrat border border-gold/30 text-text-secondary hover:text-foreground transition-colors">
              ⬇ Baixar
            </a>
          </div>
        </div>
      )}

      {/* Save to gallery modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-3 sm:p-4">
          <div className="card-glass rounded-lg w-full max-w-sm p-5 animate-fadeUp border border-gold/20">
            <h3 className="font-cinzel font-bold text-foreground mb-1">Guardar Visão na Galeria</h3>
            <p className="font-merriweather text-xs text-text-dim italic mb-4">Em qual parte da galeria deseja guardar esta visão de Idriel?</p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              <button
                onClick={() => setSaveCat('Todos')}
                className={`px-2.5 py-1 rounded-full text-[10px] font-montserrat font-bold uppercase transition-colors ${
                  saveCat === 'Todos'
                    ? 'bg-gold/20 text-gold-light border border-gold/40'
                    : 'text-text-dim border border-transparent hover:border-gold/20'
                }`}
              >
                Geral
              </button>
              {FRUITS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setSaveCat(f.name)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-montserrat font-bold uppercase transition-colors ${
                    saveCat === f.name
                      ? 'bg-gold/20 text-gold-light border border-gold/40'
                      : 'text-text-dim border border-transparent hover:border-gold/20'
                  }`}
                >
                  {f.icon} {f.name}
                </button>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowSaveModal(false)} className="px-4 py-2 rounded-md text-xs font-montserrat text-text-dim border border-border hover:text-foreground transition-colors">
                Cancelar
              </button>
              <button onClick={confirmSave} className="px-4 py-2 bg-gold hover:bg-gold-light text-background rounded-md text-xs font-montserrat font-bold transition-colors">
                💾 Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
