import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, Wand2, X, Check, RefreshCw, ArrowLeft } from 'lucide-react';
import { STYLE_META, IMAGE_TYPE_META, TONE_META } from '@/lib/data';
import { StyleCarousel } from '@/components/StyleCarousel';
import { QualitySelector } from '@/components/QualitySelector';
import { GenerationProgress, useGenerationProgress } from '@/components/GenerationProgress';
import { qualityCost, type QualityTier } from '@/lib/imageQuality';
import { callAIText, callAIImageConsistent, friendlyAIError } from '@/lib/helpers';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Título da ficha/artigo — usado como ponto de partida da descrição. */
  entryTitle: string;
  /** Texto canônico da entrada (contexto para manter consistência). */
  entryText?: string;
  /** URLs de imagens do Codex/Galeria usadas como referência visual. */
  referenceImageUrls?: string[];
  /** Salva a imagem gerada na ficha. */
  onSave: (url: string) => Promise<void> | void;
  canUseAI: boolean;
}

type Phase = 'form' | 'working' | 'result';

/**
 * Estúdio de imagem da ficha — mesma jornada da aba Galeria, porém em modal
 * e com retorno direto para a ficha: gerar → revisar → salvar (ou gerar outra).
 */
export const CodexImageStudio: React.FC<Props> = ({
  open, onClose, entryTitle, entryText, referenceImageUrls = [], onSave, canUseAI,
}) => {
  const [desc, setDesc] = useState('');
  const [style, setStyle] = useState(STYLE_META[0].label);
  const [imgType, setImgType] = useState(IMAGE_TYPE_META[0].label);
  const [tone, setTone] = useState(TONE_META[0].label);
  const [quality, setQuality] = useState<QualityTier>('essencial');
  const [phase, setPhase] = useState<Phase>('form');
  const [image, setImage] = useState('');
  const [saving, setSaving] = useState(false);
  const prog = useGenerationProgress();

  const cost = qualityCost('gallery', quality);
  const styleMeta = useMemo(() => STYLE_META.find(s => s.label === style) || STYLE_META[0], [style]);

  // Reabre sempre limpo, com a descrição semeada pelo título da ficha.
  useEffect(() => {
    if (!open) return;
    setPhase('form');
    setImage('');
    setSaving(false);
    prog.reset();
    setDesc(prev => prev || entryTitle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && phase !== 'working') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, phase, onClose]);

  if (!open) return null;

  const generate = async () => {
    if (!canUseAI) { toast.error('A geração de imagens com Idriel está disponível no plano Idriel.'); return; }
    if (!desc.trim()) { toast.error('Descreva a imagem que deseja materializar.'); return; }
    setPhase('working');
    setImage('');
    prog.start();
    try {
      const canon = `Entrada do Codex: "${entryTitle}".\n${(entryText || '').slice(0, 2000)}`;
      const systemPrompt = 'You are an expert at writing image generation prompts. Respond ONLY with the prompt in English. Honor the canonical Codex description provided (appearance, role, atmosphere) instead of inventing new traits. Be specific about visual details, lighting, composition and artistic style.';
      const userMsg = `Codex canon:\n${canon}\n\nDescription: ${desc}\nVisual style: ${style} (${styleMeta.promptHint})\nImage type: ${imgType}\nTone/Lighting: ${tone}`;
      const refined = (await callAIText([{ role: 'user', content: userMsg }], systemPrompt))?.trim();
      prog.setStage('generating');
      const url = await callAIImageConsistent(
        refined || `${desc}. Style: ${style} (${styleMeta.promptHint}). Type: ${imgType}. Tone: ${tone}.`,
        referenceImageUrls.slice(0, 3),
        canon,
        [],
        quality,
        prog.setStage,
      );
      prog.succeed();
      setImage(url);
      setPhase('result');
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Erro ao gerar imagem';
      const f = friendlyAIError(raw);
      prog.fail(f.title);
      toast.error(f.title, { description: f.hint });
      setPhase('form');
    }
  };

  const save = async () => {
    if (!image) return;
    setSaving(true);
    try {
      await onSave(image);
      toast.success('Imagem salva na ficha!');
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[260] flex items-start justify-center overflow-y-auto bg-background/85 backdrop-blur-sm p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Gerar imagem com Idriel"
      onMouseDown={(e) => { if (e.target === e.currentTarget && phase !== 'working') onClose(); }}
    >
      <div className="w-full max-w-[820px] my-auto rounded-2xl border border-gold/25 bg-[rgba(3,9,18,0.96)] shadow-[0_30px_90px_-30px_rgba(0,0,0,0.95)] animate-fadeUp">
        {/* Cabeçalho */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gold/20 bg-gradient-to-r from-gold/20 via-gold/10 to-transparent rounded-t-2xl">
          <Sparkles className="w-4 h-4 text-gold-light shrink-0" strokeWidth={1.75} />
          <div className="min-w-0">
            <h3 className="font-cinzel text-[13.5px] sm:text-[15px] uppercase tracking-[0.14em] text-gold-light truncate">
              Gerar Imagem com Idriel
            </h3>
            <p className="font-merriweather italic text-[11px] text-text-dim truncate">Para a ficha “{entryTitle}”</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={phase === 'working'}
            aria-label="Fechar"
            className="ml-auto w-8 h-8 rounded-full border border-gold/25 text-gold-light/80 hover:text-gold-light hover:border-gold/50 flex items-center justify-center transition-colors disabled:opacity-30"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {phase === 'form' && (
            <>
              <div>
                <label className="block font-montserrat text-[10px] uppercase tracking-wider text-text-dim mb-1.5">Descrição da visão</label>
                <textarea
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  rows={3}
                  placeholder={`Descreva a imagem para “${entryTitle}”…`}
                  className="w-full bg-[rgba(4,12,24,0.6)] border border-blue-bright/15 rounded-lg px-3 py-2.5 text-[13px] text-foreground font-merriweather placeholder:italic placeholder:text-text-dim/70 focus:outline-none focus:border-gold/50 resize-y"
                />
                <p className="font-merriweather italic text-[10.5px] text-text-dim mt-1.5">
                  Idriel usa o conteúdo desta entrada como cânone para manter a consistência.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-cinzel text-xs text-gold-light">Estilo visual</span>
                  <span className="font-montserrat text-[10px] uppercase tracking-wider text-text-dim">{style}</span>
                </div>
                <StyleCarousel items={STYLE_META.map(s => ({ id: s.label, label: s.label, description: s.description, image: s.image }))} selectedId={style} onSelect={setStyle} size="sm" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="block font-cinzel text-xs text-gold-light mb-2">Tipo de imagem</span>
                  <select
                    value={imgType}
                    onChange={e => setImgType(e.target.value)}
                    className="w-full bg-[rgba(4,12,24,0.6)] border border-blue-bright/15 rounded-lg px-3 py-2 text-[12.5px] text-foreground font-montserrat focus:outline-none focus:border-gold/50"
                  >
                    {IMAGE_TYPE_META.map(o => <option key={o.label} value={o.label}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <span className="block font-cinzel text-xs text-gold-light mb-2">Tom / Iluminação</span>
                  <select
                    value={tone}
                    onChange={e => setTone(e.target.value)}
                    className="w-full bg-[rgba(4,12,24,0.6)] border border-blue-bright/15 rounded-lg px-3 py-2 text-[12.5px] text-foreground font-montserrat focus:outline-none focus:border-gold/50"
                  >
                    {TONE_META.map(o => <option key={o.label} value={o.label}>{o.label}</option>)}
                  </select>
                </div>
              </div>

              <QualitySelector surface="gallery" value={quality} onChange={setQuality} />

              <div className="flex flex-col items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={generate}
                  disabled={!desc.trim()}
                  className="group relative inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full font-cinzel text-sm font-bold uppercase tracking-wider text-background bg-gradient-to-r from-gold-bronze via-gold-warm to-gold-champagne hover:from-gold-warm hover:via-gold-champagne hover:to-gold-cream shadow-[0_0_28px_rgba(218,165,32,0.45)] hover:shadow-[0_0_40px_rgba(218,165,32,0.65)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="pointer-events-none absolute inset-0 rounded-full bg-gold/40 blur-xl opacity-70 animate-soft-pulse -z-10" aria-hidden="true" />
                  <Wand2 className="w-4 h-4" strokeWidth={2} />
                  Gerar Imagem com Idriel
                </button>
                <p className="font-merriweather italic text-[11px] text-text-dim text-center">
                  Custo: {cost} gotas · você escolhe se salva na ficha depois de ver o resultado.
                </p>
              </div>
            </>
          )}

          {phase === 'working' && (
            <GenerationProgress state={prog} cost={`${cost} gotas`} title="Idriel materializa sua visão…" />
          )}

          {phase === 'result' && image && (
            <div className="space-y-4">
              <img src={image} alt={`Visão gerada para ${entryTitle}`} className="w-full max-w-[560px] mx-auto rounded-xl border border-gold/20" />
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-cinzel text-[12px] font-bold uppercase tracking-wider text-background bg-gradient-to-r from-gold-bronze via-gold-warm to-gold-champagne shadow-[0_0_22px_rgba(218,165,32,0.4)] hover:shadow-[0_0_32px_rgba(218,165,32,0.6)] transition-all disabled:opacity-50"
                >
                  <Check className="w-4 h-4" strokeWidth={2} />
                  {saving ? 'Salvando…' : 'Usar nesta ficha'}
                </button>
                <button
                  type="button"
                  onClick={generate}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-gold/30 bg-gold/[0.06] font-montserrat text-[11px] tracking-[0.06em] text-gold-champagne hover:bg-gold/15 hover:text-gold-light transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.75} />
                  Gerar outra ({cost} gotas)
                </button>
                <button
                  type="button"
                  onClick={() => { setImage(''); setPhase('form'); prog.reset(); }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-blue-bright/25 font-montserrat text-[11px] tracking-[0.06em] text-text-secondary hover:text-foreground hover:border-blue-bright/50 transition-all"
                >
                  <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
                  Ajustar descrição
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};
