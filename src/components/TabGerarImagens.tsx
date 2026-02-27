import React, { useState } from 'react';
import { STYLE_OPTIONS, IMAGE_TYPE_OPTIONS, TONE_OPTIONS, FRUITS, GalleryImage } from '@/lib/data';
import { callAIText, callAIImage } from '@/lib/helpers';
import { useSubscription } from '@/hooks/useSubscription';
import type { AppState } from '@/lib/data';

interface Props {
  state: AppState;
  setGeneratedPrompt: (p: string) => void;
  addToGallery: (img: GalleryImage) => void;
}

export const TabGerarImagens: React.FC<Props> = ({ state, setGeneratedPrompt, addToGallery }) => {
  const { worldName, db, generatedPrompt } = state;
  const sub = useSubscription();
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

  const imgsLeft = sub.imageLimit - sub.imageUsed;
  const textsLeft = sub.textLimit - sub.textUsed;

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
    if (!sub.plan) { setError('Você precisa de um plano ativo para usar a IA.'); return; }
    if (!desc.trim()) { setError('Descreva a imagem desejada.'); return; }
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
    if (!sub.plan) { setError('Você precisa de um plano ativo para gerar imagens.'); return; }
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

  const saveToGallery = () => {
    if (!generatedImage) return;
    addToGallery({
      id: Date.now().toString(),
      src: generatedImage,
      name: desc.slice(0, 40) || 'Imagem gerada',
      cat: 'Geral',
    });
  };

  return (
    <div className="animate-fadeUp mx-auto max-w-[1060px] px-4 py-6">
      <h1 className="font-cinzel font-bold text-2xl text-foreground mb-1">✨ Gerar Imagens</h1>
      <p className="font-merriweather italic text-text-dim text-sm mb-5">
        IA cria o prompt perfeito · Gera a imagem · Tudo incluso no seu plano
      </p>

      {/* Plan/usage info */}
      <div className="card-glass rounded-lg p-3 mb-5 border-l-[3px] border-l-blue-bright">
        <div className="flex items-center justify-between flex-wrap gap-2">
          {sub.plan ? (
            <>
              <span className="text-sm text-foreground font-montserrat">
                Plano <strong className="uppercase">{sub.plan}</strong> · <strong>{imgsLeft}</strong> imagens restantes · <strong>{textsLeft}</strong> textos restantes
              </span>
              <span className="text-xs text-text-dim font-merriweather italic">
                Você também pode copiar o prompt e usar no Midjourney, Leonardo AI ou Bing Image Creator.
              </span>
            </>
          ) : (
            <span className="text-sm text-gold-light font-montserrat">
              ⚠️ Você precisa de um plano ativo para usar a geração de imagens.
            </span>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="card-glass rounded-lg p-5 mb-5">
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-blue-light font-montserrat font-bold mb-1.5">Descreva em português</label>
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="Ex: A capital do meu reino élfico ao entardecer, com torres de cristal…"
              rows={3}
              className="w-full bg-[rgba(4,12,24,0.6)] border border-blue-bright/15 border-b-blue-bright/30 rounded-md px-3 py-2 text-sm text-foreground font-merriweather placeholder:italic placeholder:text-text-dim/70 focus:outline-none focus:border-blue-bright/50 resize-y"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-blue-light font-montserrat font-bold mb-1.5">Estilo Visual</label>
              <select value={style} onChange={e => setStyle(e.target.value)} className="w-full bg-[rgba(4,12,24,0.6)] border border-blue-bright/15 border-b-blue-bright/30 rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-blue-bright/50">
                {STYLE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-blue-light font-montserrat font-bold mb-1.5">Tipo de Imagem</label>
              <select value={imgType} onChange={e => setImgType(e.target.value)} className="w-full bg-[rgba(4,12,24,0.6)] border border-blue-bright/15 border-b-blue-bright/30 rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-blue-bright/50">
                {IMAGE_TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-blue-light font-montserrat font-bold mb-1.5">Tom / Iluminação</label>
              <select value={tone} onChange={e => setTone(e.target.value)} className="w-full bg-[rgba(4,12,24,0.6)] border border-blue-bright/15 border-b-blue-bright/30 rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-blue-bright/50">
                {TONE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-blue-light font-montserrat font-bold mb-1.5">Detalhes extras (opcional)</label>
            <input
              type="text"
              value={extras}
              onChange={e => setExtras(e.target.value)}
              placeholder="Cores, elementos obrigatórios…"
              className="w-full bg-[rgba(4,12,24,0.6)] border border-blue-bright/15 border-b-blue-bright/30 rounded-md px-3 py-2 text-sm text-foreground font-merriweather placeholder:italic placeholder:text-text-dim/70 focus:outline-none focus:border-blue-bright/50"
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-3 mt-5">
          <button
            onClick={handleCreatePrompt}
            disabled={loading1 || !sub.plan}
            className="px-4 py-2 rounded-md text-xs font-montserrat font-bold uppercase tracking-wider border border-blue-bright text-blue-bright hover:bg-blue-main/20 disabled:opacity-40 transition-all"
          >
            {loading1 ? '⏳ Criando…' : '✦ 1. Criar Prompt com IA'}
          </button>
          <button
            onClick={handleGenerate}
            disabled={loading2 || !generatedPrompt || !sub.plan}
            className="px-4 py-2 rounded-md text-xs font-montserrat font-bold uppercase tracking-wider bg-gold hover:bg-gold-light text-background disabled:opacity-40 transition-all"
          >
            {loading2 ? '⏳ Gerando…' : '🎨 2. Gerar Imagem'}
          </button>
        </div>

        {error && <p className="text-red-alert text-sm mt-3">{error}</p>}

        {(loading1 || loading2) && (
          <div className="flex items-center gap-1 mt-4 text-text-dim text-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-light dot-bounce" />
            <span className="w-1.5 h-1.5 rounded-full bg-blue-light dot-bounce-2" />
            <span className="w-1.5 h-1.5 rounded-full bg-blue-light dot-bounce-3" />
            <span className="ml-2 font-merriweather italic text-xs">
              {loading1 ? 'Criando prompt…' : 'Gerando imagem…'}
            </span>
          </div>
        )}
      </div>

      {/* Generated prompt */}
      {generatedPrompt && !loading1 && (
        <div className="animate-fadeUp card-glass rounded-lg p-5 mb-5">
          <span className="font-cinzel text-[10px] text-blue-light block mb-2">✦ Prompt criado pela IA</span>
          <p className="font-merriweather text-sm text-foreground whitespace-pre-wrap leading-relaxed mb-4">{generatedPrompt}</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={copyPrompt} className="px-3 py-1.5 rounded-md text-xs font-montserrat border border-blue-bright/30 text-text-secondary hover:text-foreground transition-colors">
              {copied ? '✓ Copiado!' : '📋 Copiar para Midjourney / Leonardo'}
            </button>
            <button
              onClick={handleGenerate}
              disabled={loading2}
              className="px-3 py-1.5 rounded-md text-xs font-montserrat bg-gold hover:bg-gold-light text-background disabled:opacity-40 transition-colors"
            >
              🎨 Gerar Imagem
            </button>
          </div>
        </div>
      )}

      {/* Generated image */}
      {generatedImage && !loading2 && (
        <div className="animate-fadeUp card-glass rounded-lg p-5">
          <img src={generatedImage} alt="Imagem gerada" className="w-full max-w-[512px] mx-auto rounded-lg mb-4" />
          <div className="flex flex-wrap gap-2 justify-center">
            <button onClick={saveToGallery} className="px-4 py-2 bg-blue-main hover:bg-blue-bright text-foreground rounded-md text-xs font-montserrat font-bold transition-colors">
              💾 Salvar na Galeria
            </button>
            <a href={generatedImage} download target="_blank" rel="noopener" className="px-4 py-2 rounded-md text-xs font-montserrat border border-blue-bright/30 text-text-secondary hover:text-foreground transition-colors">
              ⬇ Baixar
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
