import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { EVENT_TYPES, styleForType } from './TimelineNode';
import type { TimelineEvent, TimelineEventType } from '@/hooks/useTimelineEvents';
import type { CodexEntry } from '@/hooks/useCodexEntries';
import { Trees, Save, Link2, ImagePlus, X, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { optimizeImage } from '@/lib/imageOptimizer';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Partial<TimelineEvent> | null;
  codexEntries: CodexEntry[];
  onSubmit: (payload: {
    title: string;
    description: string;
    year: string;
    era_label: string;
    event_type: TimelineEventType;
    codex_entry_id: string | null;
    image_url: string | null;
  }) => Promise<void> | void;
}

const FieldLabel: React.FC<React.PropsWithChildren<{ icon?: React.ReactNode }>> = ({ children, icon }) => (
  <label className="text-[10px] uppercase tracking-[0.2em] text-gold-champagne font-montserrat block mb-1.5 inline-flex items-center gap-1.5">
    {icon}
    {children}
  </label>
);

export const TimelineEventDialog: React.FC<Props> = ({ open, onOpenChange, initial, codexEntries, onSubmit }) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [year, setYear] = useState('');
  const [era, setEra] = useState('');
  const [type, setType] = useState<TimelineEventType>('fato');
  const [linkId, setLinkId] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(initial?.title ?? '');
    setDescription(initial?.description ?? '');
    setYear(initial?.year ?? '');
    setEra(initial?.era_label ?? '');
    setType((initial?.event_type as TimelineEventType) ?? 'fato');
    setLinkId(initial?.codex_entry_id ?? '');
    setImageUrl(initial?.image_url ?? null);
    setSaving(false);
  }, [open, initial]);

  const isEdit = !!initial?.id;
  const currentStyle = styleForType(type);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !user) return;
    const file = files[0];
    if (!/image\/(png|jpe?g|webp)/.test(file.type)) { toast.error('Use PNG, JPG ou WEBP'); return; }
    setUploading(true);
    try {
      const opt = await optimizeImage(file);
      const ext = opt.name.split('.').pop() || 'webp';
      const path = `${user.id}/timeline-${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('codex-images').upload(path, opt, {
        cacheControl: '31536000',
        contentType: opt.type || 'image/webp',
      });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('codex-images').getPublicUrl(path);
      setImageUrl(publicUrl);
    } catch (e: any) {
      toast.error(e.message || 'Falha ao enviar imagem');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        year: year.trim(),
        era_label: era.trim(),
        event_type: type,
        codex_entry_id: linkId || null,
        image_url: imageUrl,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[calc(100vw-2rem)] sm:max-w-2xl lg:max-w-3xl border-gold/30 bg-[hsl(var(--background)/0.98)] backdrop-blur-xl p-0 overflow-hidden max-h-[92vh] flex flex-col"
        style={{
          boxShadow:
            '0 0 0 1px hsl(var(--gold) / 0.12), 0 30px 80px -30px rgba(0,0,0,0.8), 0 0 60px -20px hsl(var(--gold) / 0.25)',
        }}
      >
        {/* Ornamento superior */}
        <div className="relative">
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-gold to-transparent" />
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-gold/[0.06] to-transparent pointer-events-none" />
          <DialogHeader className="px-6 pt-6 pb-4 relative">
            <DialogTitle className="font-cinzel text-gold-light inline-flex items-center gap-2.5 text-base">
              <span className="relative inline-flex items-center justify-center w-8 h-8 rounded-full border border-gold/30 bg-gold/10">
                <Trees className="w-4 h-4 text-gold-champagne" />
              </span>
              {isEdit ? 'Editar marco' : 'Novo marco na Linha do Tempo'}
            </DialogTitle>
            <DialogDescription className="font-merriweather italic text-text-dim text-xs pl-10">
              Grave um acontecimento que ainda ecoa no presente do seu mundo.
            </DialogDescription>
          </DialogHeader>
          {/* separador ornamental */}
          <div className="px-6">
            <div className="h-px bg-gradient-to-r from-transparent via-gold/25 to-transparent" />
          </div>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto">
          {/* Título */}
          <div>
            <FieldLabel icon={<Sparkles className="w-3 h-3" />}>Título</FieldLabel>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={200}
              placeholder="Fundação da Ordem dos Selos"
              className="bg-background/60 border-gold/20 focus-visible:border-gold/60 focus-visible:ring-gold/20 font-cinzel"
              autoFocus
            />
          </div>

          {/* Ano + Era (row) — Tipo em bloco próprio para respirar em desktop/tablet */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Ano / data</FieldLabel>
              <Input
                value={year}
                onChange={e => setYear(e.target.value)}
                maxLength={60}
                placeholder="342 AF"
                className="h-11 bg-background/60 border-gold/20 focus-visible:border-gold/60 focus-visible:ring-gold/20 font-cinzel"
              />
            </div>
            <div>
              <FieldLabel>Era / rótulo narrativo</FieldLabel>
              <Input
                value={era}
                onChange={e => setEra(e.target.value)}
                maxLength={120}
                placeholder="Era das Sombras"
                className="h-11 bg-background/60 border-gold/20 focus-visible:border-gold/60 focus-visible:ring-gold/20"
              />
            </div>
          </div>

          <div>
            <FieldLabel>Tipo</FieldLabel>
            <div className="flex flex-wrap gap-2 p-3 rounded-md border border-gold/15 bg-background/40">
              {EVENT_TYPES.map(t => {
                const s = styleForType(t.value);
                const active = t.value === type;
                const TIcon = t.Icon;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-montserrat uppercase tracking-wider transition-all border
                      ${active
                        ? `${s.chipBg} border-opacity-100 scale-105`
                        : 'border-gold/10 text-text-dim hover:text-foreground hover:border-gold/25'}`}
                    style={active ? { boxShadow: s.badgeShadow } : undefined}
                    title={t.label}
                    aria-pressed={active}
                  >
                    <TIcon className="w-3.5 h-3.5" strokeWidth={2} />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Descrição */}
          <div>
            <FieldLabel>Descrição</FieldLabel>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={10000}
              rows={5}
              placeholder="O que aconteceu, quem estava envolvido, o que mudou a partir desse marco."
              className="bg-background/60 border-gold/20 focus-visible:border-gold/60 focus-visible:ring-gold/20 font-merriweather leading-relaxed"
            />
          </div>

          {/* Imagem */}
          <div>
            <FieldLabel icon={<ImagePlus className="w-3 h-3" />}>Imagem do marco (opcional)</FieldLabel>
            {imageUrl ? (
              <div className="relative rounded-md overflow-hidden border border-gold/20 group">
                <img src={imageUrl} alt="Prévia" className="w-full h-36 object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
                <button
                  type="button"
                  onClick={() => setImageUrl(null)}
                  className="absolute top-2 right-2 inline-flex items-center justify-center w-7 h-7 rounded-full bg-background/80 border border-red-alert/40 text-red-alert hover:bg-red-alert/20 backdrop-blur"
                  aria-label="Remover imagem"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full h-24 rounded-md border border-dashed border-gold/25 bg-background/40 hover:bg-background/60 hover:border-gold/50 text-text-dim hover:text-gold-champagne text-xs font-montserrat inline-flex items-center justify-center gap-2 transition-all"
              >
                {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando…</> : <><ImagePlus className="w-4 h-4" /> Enviar imagem (PNG · JPG · WEBP)</>}
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={e => handleUpload(e.target.files)}
            />
          </div>

          {/* Vínculo com Codex */}
          <div>
            <FieldLabel icon={<Link2 className="w-3 h-3" />}>Vincular a uma ficha / artigo (opcional)</FieldLabel>
            <select
              value={linkId}
              onChange={e => setLinkId(e.target.value)}
              className="w-full h-10 rounded-md bg-background/60 border border-blue-bright/20 px-3 text-sm font-merriweather text-foreground focus:outline-none focus:border-blue-bright/60 focus:ring-2 focus:ring-blue-bright/20 transition-colors"
            >
              <option value="">— nenhum —</option>
              {codexEntries.map(e => (
                <option key={e.id} value={e.id}>{e.entry_type === 'artigo' ? '📜 ' : '🪬 '}{e.title}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Rodapé ornamental */}
        <div className="relative px-6 pt-3 pb-5 border-t border-gold/15 bg-gradient-to-b from-transparent to-gold/[0.03]">
          <DialogFooter className="gap-2 sm:gap-3">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="font-montserrat text-xs uppercase tracking-wider">
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !title.trim()}
              className="bg-gradient-to-r from-gold-deep via-gold-warm to-gold text-[#1a0f00] hover:from-gold-warm hover:via-gold hover:to-gold-light font-montserrat font-bold uppercase text-xs tracking-wider shadow-[0_0_18px_hsl(var(--gold)/0.4)] hover:shadow-[0_0_26px_hsl(var(--gold)/0.6)]"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
              {isEdit ? 'Salvar alterações' : 'Gravar marco'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TimelineEventDialog;
