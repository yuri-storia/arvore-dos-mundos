import React, { useState } from 'react';
import { Bug } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface Props {
  /** Texto pré-preenchido (ex: mensagem de erro técnica que disparou o relato) */
  initialContext?: string;
  /** Aparência do botão gatilho. Se omitido, usa o botão padrão. */
  trigger?: React.ReactNode;
}

export const BugReportDialog: React.FC<Props> = ({ initialContext = '', trigger }) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const handleOpenChange = (next: boolean) => {
    if (next) setMessage('');
    setOpen(next);
  };

  const handleSubmit = async () => {
    const text = message.trim();
    if (text.length < 5) {
      toast.error('Conte um pouco mais sobre o problema (mín. 5 caracteres).');
      return;
    }
    if (text.length > 4000) {
      toast.error('Mensagem longa demais. Resuma em até 4000 caracteres.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('bug_reports').insert({
        user_id: user?.id ?? null,
        user_email: user?.email ?? null,
        message: text,
        context: initialContext || null,
        route: typeof window !== 'undefined' ? window.location.pathname : null,
      });
      if (error) throw error;
      toast.success('Relato enviado! Obrigado por ajudar a melhorar A Árvore dos Mundos.');
      setOpen(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro desconhecido';
      toast.error(`Não foi possível enviar agora: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  const defaultTrigger = (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-montserrat font-bold uppercase tracking-wider border border-red-alert/40 text-red-alert hover:bg-red-alert/10 transition-colors"
    >
      <Bug className="w-3 h-3" />
      Reportar problema
    </button>
  );

  return (
    <>
      <span onClick={() => setOpen(true)} className="inline-flex">
        {trigger ?? defaultTrigger}
      </span>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="sm:max-w-md border-gold-bronze/40"
          style={{
            background: 'linear-gradient(135deg, hsl(214 60% 5%) 0%, hsl(214 65% 7%) 100%)',
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-cinzel text-foreground">
              <Bug className="w-5 h-5 text-gold-champagne" strokeWidth={1.75} />
              Reportar problema
            </DialogTitle>
            <DialogDescription className="font-amiri text-text-secondary">
              Conte o que aconteceu — quanto mais detalhes (o que tentou fazer, em qual aba, o que apareceu na tela), mais rápido conseguimos resolver.
            </DialogDescription>
          </DialogHeader>

          {initialContext && (
            <div className="rounded-md bg-red-alert/5 border border-red-alert/20 p-2.5">
              <span className="block text-[10px] font-montserrat uppercase tracking-wider text-red-alert/80 mb-1">
                Contexto técnico anexado
              </span>
              <code className="block text-[11px] text-text-secondary font-mono whitespace-pre-wrap break-words max-h-24 overflow-auto">
                {initialContext}
              </code>
            </div>
          )}

          <div className="space-y-1">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ex: Tentei gerar uma imagem na aba Galeria e apareceu uma mensagem de erro. Estava usando o Chrome no notebook."
              rows={5}
              maxLength={4000}
              className="bg-[hsl(214_70%_3%)] border-gold-bronze/30 text-foreground font-amiri placeholder:italic placeholder:text-text-dim/70 focus-visible:ring-gold-champagne/40 resize-y"
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-text-dim font-montserrat">{message.length}/4000</span>
              {!user && (
                <span className="text-[10px] text-gold-champagne/80 font-montserrat italic">
                  Faça login para que possamos responder você.
                </span>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-border text-text-secondary hover:text-foreground"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="text-[#1a0f00] font-montserrat font-bold uppercase tracking-wider text-xs hover:-translate-y-0.5 transition-transform disabled:translate-y-0"
              style={{
                background:
                  'linear-gradient(135deg, hsl(42 55% 90%) 0%, hsl(40 50% 78%) 35%, hsl(34 42% 58%) 100%)',
                boxShadow:
                  '0 6px 22px hsl(34 42% 35% / 0.45), inset 0 1px 0 hsl(42 60% 96% / 0.6)',
              }}
            >
              {saving ? 'Enviando…' : 'Enviar relato'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
