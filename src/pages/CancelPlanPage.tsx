import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Check, Loader2, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { useQueryClient } from '@tanstack/react-query';

/**
 * /cancelar-plano — Fluxo de cancelamento em 2 etapas.
 * Após confirmar: conta permanece ativa, mas usuário fica somente em modo
 * leitura + exportação PDF (ver usePlanLimits → EXPIRED_LIMITS).
 */
const CancelPlanPage: React.FC = () => {
  const navigate = useNavigate();
  const sub = useSubscription();
  const qc = useQueryClient();
  const [step, setStep] = useState<1 | 2>(1);
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const planName = sub.hasIdriel ? 'Idriel' : sub.hasTemplate ? 'Criador' : 'Sem plano';
  const canCancel = sub.subscribed;

  const handleCancel = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('cancel-subscription');
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ['subscription'] });
      toast.success('Assinatura cancelada. Seu acesso continua em modo leitura.');
      setDone(true);
    } catch (e: any) {
      toast.error('Não foi possível cancelar: ' + (e?.message || 'erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <button
          onClick={() => navigate('/settings')}
          className="inline-flex items-center gap-1.5 text-text-dim hover:text-foreground text-xs font-montserrat uppercase tracking-wider mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar
        </button>

        <h1 className="font-cinzel font-bold text-2xl text-foreground mb-1">Cancelar assinatura</h1>
        <p className="font-merriweather italic text-text-dim text-sm mb-6">
          Plano atual: <span className="text-gold-light">{planName}</span>
        </p>

        {done ? (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-6 space-y-3">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-emerald-400" />
              <h2 className="font-cinzel font-bold text-lg text-emerald-300">Cancelamento concluído</h2>
            </div>
            <p className="text-sm text-text-secondary font-merriweather leading-relaxed">
              Sua assinatura foi cancelada. <strong className="text-foreground">Você mantém acesso à sua conta</strong>,
              mas em modo somente leitura: pode consultar mundos, fichas, artigos e manuscritos e
              exportar em PDF. Novas edições e criações ficam bloqueadas até você reativar um plano.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Link to="/planos" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-gradient-to-r from-gold via-gold-warm to-gold-deep text-[#1a0f00] text-xs font-montserrat font-bold uppercase tracking-wider">
                Ver planos
              </Link>
              <Link to="/app" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md border border-white/10 text-text-dim hover:text-foreground text-xs font-montserrat font-bold uppercase tracking-wider transition-colors">
                Voltar para o app
              </Link>
            </div>
          </div>
        ) : !canCancel ? (
          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-6 text-sm text-text-secondary">
            Você não tem uma assinatura ativa para cancelar.
            <div className="mt-4">
              <Link to="/planos" className="text-gold-light hover:underline text-xs font-montserrat uppercase tracking-wider">
                Ver planos disponíveis →
              </Link>
            </div>
          </div>
        ) : step === 1 ? (
          <div className="rounded-lg border border-red-alert/30 bg-red-alert/[0.05] p-6 space-y-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-alert mt-0.5 shrink-0" />
              <div>
                <h2 className="font-cinzel font-bold text-lg text-red-alert leading-tight">O que acontece ao cancelar</h2>
                <p className="text-xs text-text-dim mt-1">Confirmação em duas etapas. Nenhuma ação é feita ainda.</p>
              </div>
            </div>
            <ul className="space-y-2 text-sm text-text-secondary font-merriweather">
              <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" /> Sua conta e todos os seus mundos, fichas, artigos e manuscritos permanecem preservados.</li>
              <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" /> Você continua podendo exportar Manuscritos, Fichas e Artigos em PDF.</li>
              <li className="flex gap-2"><ShieldOff className="w-4 h-4 text-red-alert mt-0.5 shrink-0" /> Você não poderá mais editar, criar ou usar recursos com Idriel até reativar um plano.</li>
              <li className="flex gap-2"><ShieldOff className="w-4 h-4 text-red-alert mt-0.5 shrink-0" /> O acesso a novas gerações de imagem, mapas e análises fica desativado.</li>
            </ul>
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-red-alert/90 hover:bg-red-alert text-white text-xs font-montserrat font-bold uppercase tracking-wider transition-colors"
              >
                Continuar cancelamento
              </button>
              <button
                onClick={() => navigate('/settings')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md border border-white/10 text-text-dim hover:text-foreground text-xs font-montserrat font-bold uppercase tracking-wider transition-colors"
              >
                Voltar sem cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-red-alert/40 bg-red-alert/[0.07] p-6 space-y-4">
            <h2 className="font-cinzel font-bold text-lg text-red-alert">Etapa 2 de 2 — Confirmação final</h2>
            <p className="text-sm text-text-secondary font-merriweather leading-relaxed">
              Para confirmar, digite <span className="font-bold text-foreground">CANCELAR</span> no
              campo abaixo. Essa ação encerra sua assinatura imediatamente.
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder="Digite CANCELAR"
              autoFocus
              className="w-full bg-secondary/50 border border-red-alert/30 rounded-md px-3 py-2 text-sm text-foreground font-montserrat placeholder:text-text-dim/40 focus:outline-none focus:border-red-alert transition-colors"
            />
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleCancel}
                disabled={confirmText.trim().toUpperCase() !== 'CANCELAR' || loading}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-red-alert hover:bg-red-alert/90 text-white text-xs font-montserrat font-bold uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldOff className="w-3.5 h-3.5" />}
                Cancelar assinatura definitivamente
              </button>
              <button
                onClick={() => { setStep(1); setConfirmText(''); }}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md border border-white/10 text-text-dim hover:text-foreground text-xs font-montserrat font-bold uppercase tracking-wider transition-colors"
              >
                Voltar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CancelPlanPage;
