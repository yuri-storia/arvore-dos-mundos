import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { EVENT_TYPES } from './TimelineNode';
import type { TimelineEvent, TimelineEventType } from '@/hooks/useTimelineEvents';
import type { CodexEntry } from '@/hooks/useCodexEntries';
import { Save, Link2, Sparkles } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Partial<TimelineEvent> | null;
  codexEntries: CodexEntry[];
  onSubmit: (payload: {
    title: string;
    description: string;
    era_label: string;
    event_type: TimelineEventType;
    codex_entry_id: string | null;
  }) => Promise<void> | void;
}

const OrnamentalDivider: React.FC = () => (
  <div className="flex items-center gap-3 my-1" aria-hidden>
    <span className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
    <svg width="14" height="14" viewBox="0 0 14 14" className="text-gold-champagne">
      <path d="M7 1 L8.5 5.5 L13 7 L8.5 8.5 L7 13 L5.5 8.5 L1 7 L5.5 5.5 Z" fill="currentColor" opacity="0.75" />
    </svg>
    <span className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
  </div>
);

export const TimelineEventDialog: React.FC<Props> = ({ open, onOpenChange, initial, codexEntries, onSubmit }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [era, setEra] = useState('');
  const [type, setType] = useState<TimelineEventType>('fato');
  const [linkId, setLinkId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(initial?.title ?? '');
    setDescription(initial?.description ?? '');
    setEra(initial?.era_label ?? '');
    setType((initial?.event_type as TimelineEventType) ?? 'fato');
    setLinkId(initial?.codex_entry_id ?? '');
    setSaving(false);
  }, [open, initial]);

  const isEdit = !!initial?.id;

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        era_label: era.trim(),
        event_type: type,
        codex_entry_id: linkId || null,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const labelCls = "text-[10px] uppercase tracking-[0.25em] text-gold-champagne/85 font-montserrat block mb-1.5";
  const fieldCls = "bg-[hsl(220_40%_5%/0.7)] border-gold/20 focus:border-gold/60 focus-visible:ring-gold/40 font-merriweather placeholder:text-text-dim/50";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-xl border-transparent p-0 overflow-hidden bg-transparent shadow-none"
      >
        {/* Moldura ornamental com degradê azul→dourado */}
        <div className="relative rounded-xl p-[1.5px] bg-[conic-gradient(from_140deg,hsl(210_90%_65%/0.55),hsl(46_85%_60%/0.9),hsl(210_90%_65%/0.55))]">
          <div className="relative rounded-[10px] bg-[hsl(220_45%_4%/0.98)] backdrop-blur-xl overflow-hidden">
            {/* halos internos */}
            <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[520px] h-[220px] rounded-full"
                 style={{ background: 'radial-gradient(closest-side, hsl(210 90% 70% / 0.22), transparent 70%)' }} />
            <div className="pointer-events-none absolute -bottom-24 left-1/2 -translate-x-1/2 w-[520px] h-[220px] rounded-full"
                 style={{ background: 'radial-gradient(closest-side, hsl(46 90% 60% / 0.20), transparent 70%)' }} />

            <div className="relative px-6 sm:px-8 pt-6 pb-5">
              <DialogHeader className="text-center space-y-2">
                <div className="flex justify-center">
                  <div className="relative w-11 h-11 rounded-full flex items-center justify-center border border-gold/40 bg-gradient-to-br from-blue-bright/25 via-transparent to-gold/25">
                    <Sparkles className="w-5 h-5 text-gold-champagne" strokeWidth={1.5} />
                    <span className="absolute inset-0 rounded-full ring-1 ring-gold/40 animate-pulse" style={{ animationDuration: '2.6s' }} />
                  </div>
                </div>
                <DialogTitle className="font-cinzel text-lg sm:text-xl bg-gradient-to-r from-blue-light via-gold-champagne to-gold bg-clip-text text-transparent">
                  {isEdit ? 'Reescrever este marco' : 'Novo marco na Linha do Tempo'}
                </DialogTitle>
                <DialogDescription className="font-merriweather italic text-text-dim text-xs sm:text-[13px] max-w-sm mx-auto">
                  Grave um acontecimento que ainda ecoa no presente do seu mundo.
                </DialogDescription>
                <div className="pt-1"><OrnamentalDivider /></div>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                <div>
                  <label className={labelCls}>Título</label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} maxLength={200}
                         placeholder="Fundação da Ordem dos Selos" className={fieldCls} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Era / data narrativa</label>
                    <Input value={era} onChange={e => setEra(e.target.value)} maxLength={120}
                           placeholder="Era das Sombras · 342 AF" className={fieldCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Tipo</label>
                    <select
                      value={type}
                      onChange={e => setType(e.target.value as TimelineEventType)}
                      className="w-full h-10 rounded-md bg-[hsl(220_40%_5%/0.7)] border border-gold/20 px-3 text-sm font-merriweather text-foreground focus:outline-none focus:border-gold/60"
                    >
                      {EVENT_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Descrição</label>
                  <Textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    maxLength={10000}
                    rows={5}
                    placeholder="O que aconteceu, quem estava envolvido, o que mudou a partir desse marco."
                    className={fieldCls}
                  />
                </div>

                <div>
                  <label className={`${labelCls} inline-flex items-center gap-1.5`}>
                    <Link2 className="w-3 h-3" /> Vincular a uma ficha / artigo (opcional)
                  </label>
                  <select
                    value={linkId}
                    onChange={e => setLinkId(e.target.value)}
                    className="w-full h-10 rounded-md bg-[hsl(220_40%_5%/0.7)] border border-blue-bright/25 px-3 text-sm font-merriweather text-foreground focus:outline-none focus:border-blue-bright/60"
                  >
                    <option value="">— nenhum —</option>
                    {codexEntries.map(e => (
                      <option key={e.id} value={e.id}>{e.entry_type === 'artigo' ? '📜 ' : '🪬 '}{e.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-5"><OrnamentalDivider /></div>

              <DialogFooter className="mt-4 gap-2 sm:gap-3">
                <Button variant="ghost" onClick={() => onOpenChange(false)}
                        className="text-text-dim hover:text-foreground hover:bg-white/5">
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving || !title.trim()}
                  className="relative overflow-hidden bg-gradient-to-r from-gold-deep via-gold-warm to-gold text-[#1a0f00] hover:from-gold-warm hover:via-gold hover:to-gold-light font-montserrat font-bold uppercase text-xs tracking-[0.15em] shadow-[0_0_18px_hsl(var(--gold)/0.4)] hover:shadow-[0_0_26px_hsl(var(--gold)/0.65)]"
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" /> {isEdit ? 'Salvar alterações' : 'Gravar marco'}
                </Button>
              </DialogFooter>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TimelineEventDialog;
