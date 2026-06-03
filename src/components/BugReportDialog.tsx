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
        <div
          className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-sm flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="my-auto w-full max-w-md rounded-xl p-5 animate-fadeUp relative shadow-gold-glow-strong"
            style={{
              background: 'linear-gradient(135deg, hsl(214 60% 5%) 0%, hsl(214 65% 7%) 100%)',
              border: '1px solid hsl(34 42% 58% / 0.45)',
            }}
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 text-text-dim hover:text-foreground"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <Bug className="w-5 h-5 text-gold-champagne" strokeWidth={1.75} />
              <h3 className="font-cinzel font-bold text-foreground text-lg">Reportar problema</h3>
            </div>
            <p className="font-amiri text-sm text-text-secondary mb-4 leading-relaxed">
              Conte o que aconteceu — quanto mais detalhes (o que tentou fazer, em qual aba, o que apareceu na tela), mais rápido conseguimos resolver.
            </p>

            {initialContext && (
              <div className="mb-3 rounded-md bg-red-alert/5 border border-red-alert/20 p-2.5">
                <span className="block text-[10px] font-montserrat uppercase tracking-wider text-red-alert/80 mb-1">
                  Contexto técnico anexado
                </span>
                <code className="block text-[11px] text-text-secondary font-mono whitespace-pre-wrap break-words max-h-24 overflow-auto">
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
              className="w-full bg-[hsl(214_70%_3%)] border border-gold-bronze/30 rounded-md px-3 py-2 text-sm text-foreground font-amiri placeholder:italic placeholder:text-text-dim/70 focus:outline-none focus:border-gold-champagne/60 resize-y"
            />
            <div className="flex items-center justify-between mt-1 mb-4">
              <span className="text-[10px] text-text-dim font-montserrat">{message.length}/4000</span>
              {!user && (
                <span className="text-[10px] text-gold-champagne/80 font-montserrat italic">
                  Faça login para que possamos responder você.
                </span>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-md text-xs font-montserrat text-text-secondary border border-border hover:text-foreground hover:bg-white/[0.04] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-5 py-2 rounded-md text-xs font-montserrat font-bold uppercase tracking-wider text-[#1a0f00] transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0"
                style={{
                  background: 'linear-gradient(135deg, hsl(42 55% 90%) 0%, hsl(40 50% 78%) 35%, hsl(34 42% 58%) 100%)',
                  boxShadow: '0 6px 22px hsl(34 42% 35% / 0.45), inset 0 1px 0 hsl(42 60% 96% / 0.6)',
                }}
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
