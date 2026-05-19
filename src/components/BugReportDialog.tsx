import React, { useState } from 'react';
import { Bug, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Props {
  /** Texto pré-preenchido (ex: mensagem de erro técnica que disparou o relato) */
  initialContext?: string;
  /** Aparência do botão gatilho. Se omitido, usa o ícone padrão. */
  trigger?: React.ReactNode;
}

export const BugReportDialog: React.FC<Props> = ({ initialContext = '', trigger }) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const handleOpen = () => {
    setMessage('');
    setOpen(true);
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

  return (
    <>
      {trigger ? (
        <span onClick={handleOpen} className="inline-flex">{trigger}</span>
      ) : (
        <button
          onClick={handleOpen}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-montserrat font-bold uppercase tracking-wider border border-red-alert/40 text-red-alert hover:bg-red-alert/10 transition-colors"
        >
          <Bug className="w-3 h-3" />
          Reportar problema
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-[120] bg-black/70 flex items-center justify-center p-3 sm:p-4">
          <div className="card-glass rounded-lg w-full max-w-md p-5 animate-fadeUp border border-gold/20 relative">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 text-text-dim hover:text-foreground"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <Bug className="w-4 h-4 text-gold-light" />
              <h3 className="font-cinzel font-bold text-foreground">Reportar problema</h3>
            </div>
            <p className="font-merriweather italic text-xs text-text-dim mb-4">
              Conte o que aconteceu — quanto mais detalhes (o que tentou fazer, em qual aba, o que apareceu na tela), mais rápido conseguimos resolver.
            </p>

            {initialContext && (
              <div className="mb-3 rounded-md bg-red-alert/5 border border-red-alert/20 p-2.5">
                <span className="block text-[9px] font-montserrat uppercase tracking-wider text-red-alert/80 mb-1">
                  Contexto técnico anexado
                </span>
                <code className="block text-[10px] text-text-secondary font-mono whitespace-pre-wrap break-words max-h-24 overflow-auto">
                  {initialContext}
                </code>
              </div>
            )}

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ex: Tentei gerar uma imagem na aba Galeria e apareceu uma mensagem de erro. Estava usando o Chrome no notebook."
              rows={5}
              maxLength={4000}
              className="w-full bg-[rgba(4,12,24,0.6)] border border-gold/15 border-b-gold/30 rounded-md px-3 py-2 text-sm text-foreground font-merriweather placeholder:italic placeholder:text-text-dim/70 focus:outline-none focus:border-gold/50 resize-y"
            />
            <div className="flex items-center justify-between mt-1 mb-4">
              <span className="text-[9px] text-text-dim font-montserrat">{message.length}/4000</span>
              {!user && (
                <span className="text-[9px] text-gold-light/70 font-montserrat italic">
                  Faça login para que possamos responder você.
                </span>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-md text-xs font-montserrat text-text-dim border border-border hover:text-foreground transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-4 py-2 bg-gold hover:bg-gold-light text-background rounded-md text-xs font-montserrat font-bold transition-colors disabled:opacity-50"
              >
                {saving ? 'Enviando…' : 'Enviar relato'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
