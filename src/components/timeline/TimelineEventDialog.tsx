import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { EVENT_TYPES } from './TimelineNode';
import type { TimelineEvent, TimelineEventType } from '@/hooks/useTimelineEvents';
import type { CodexEntry } from '@/hooks/useCodexEntries';
import { Trees, Save, Link2 } from 'lucide-react';

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-gold/30 bg-[hsl(var(--background)/0.98)] backdrop-blur-md">
        <DialogHeader>
          <DialogTitle className="font-cinzel text-gold-light inline-flex items-center gap-2">
            <Trees className="w-4 h-4 text-gold-champagne" />
            {isEdit ? 'Editar marco' : 'Novo marco na Linha do Tempo'}
          </DialogTitle>
          <DialogDescription className="font-merriweather italic text-text-dim text-xs">
            Grave um acontecimento que ainda ecoa no presente do seu mundo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-gold-champagne font-montserrat block mb-1">Título</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} maxLength={200} placeholder="Fundação da Ordem dos Selos" className="bg-background/60 border-gold/20" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-gold-champagne font-montserrat block mb-1">Era / data narrativa</label>
              <Input value={era} onChange={e => setEra(e.target.value)} maxLength={120} placeholder="Era das Sombras · 342 AF" className="bg-background/60 border-gold/20" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-gold-champagne font-montserrat block mb-1">Tipo</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as TimelineEventType)}
                className="w-full h-10 rounded-md bg-background/60 border border-gold/20 px-3 text-sm font-merriweather text-foreground focus:outline-none focus:border-gold/50"
              >
                {EVENT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-gold-champagne font-montserrat block mb-1">Descrição</label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={10000}
              rows={5}
              placeholder="O que aconteceu, quem estava envolvido, o que mudou a partir desse marco."
              className="bg-background/60 border-gold/20 font-merriweather"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-gold-champagne font-montserrat block mb-1 inline-flex items-center gap-1.5">
              <Link2 className="w-3 h-3" /> Vincular a uma ficha / artigo (opcional)
            </label>
            <select
              value={linkId}
              onChange={e => setLinkId(e.target.value)}
              className="w-full h-10 rounded-md bg-background/60 border border-blue-bright/20 px-3 text-sm font-merriweather text-foreground focus:outline-none focus:border-blue-bright/50"
            >
              <option value="">— nenhum —</option>
              {codexEntries.map(e => (
                <option key={e.id} value={e.id}>{e.entry_type === 'artigo' ? '📜 ' : '🪬 '}{e.title}</option>
              ))}
            </select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="bg-gradient-to-r from-gold-deep via-gold-warm to-gold text-[#1a0f00] hover:from-gold-warm hover:via-gold hover:to-gold-light font-montserrat font-bold uppercase text-xs tracking-wider"
          >
            <Save className="w-3.5 h-3.5 mr-1.5" /> {isEdit ? 'Salvar alterações' : 'Gravar marco'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TimelineEventDialog;
