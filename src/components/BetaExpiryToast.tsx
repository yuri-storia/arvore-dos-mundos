import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Clock, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useBetaStatus } from '@/hooks/useBetaStatus';
import { openCheckout } from '@/hooks/useSubscription';

/**
 * Toast persistente (sonner) disparado UMA vez por dia enquanto a janela
 * promocional de 7 dias estiver ativa. Reforça o aviso do BetaPromoDialog
 * sem ser invasivo. Responsivo: o sonner já adapta para mobile/tablet/desktop.
 */
export const BetaExpiryToast: React.FC = () => {
  const { user } = useAuth();
  const beta = useBetaStatus();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    if (beta.loading || !user || !beta.hasBeta) return;
    if (!beta.raizExpired || !beta.promoStillValid) return;

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const key = `adm_beta_expiry_toast_${user.id}_${today}`;
    try {
      if (localStorage.getItem(key) === '1') {
        fired.current = true;
        return;
      }
    } catch {}

    fired.current = true;
    try { localStorage.setItem(key, '1'); } catch {}

    const daysMsg = beta.promoDaysLeft > 0
      ? `${beta.promoDaysLeft} ${beta.promoDaysLeft === 1 ? 'dia restante' : 'dias restantes'}`
      : 'Última chance — expira hoje';

    toast.custom(
      (t) => (
        <div
          className="w-full max-w-[380px] rounded-xl border border-gold/45 overflow-hidden shadow-[0_18px_50px_-18px_rgba(218,165,32,0.55)]"
          style={{
            background:
              'radial-gradient(120% 100% at 50% 0%, rgba(218,165,32,0.20) 0%, rgba(2,7,13,0.96) 70%), #02070d',
          }}
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-70 pointer-events-none" />
          <div className="p-3.5 sm:p-4 flex flex-col gap-2.5">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-gold/30 to-gold/5 border border-gold/40 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-gold-champagne" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-cinzel font-bold text-[13px] sm:text-sm text-gold-light leading-tight">
                  Seu beta terminou — oferta ativa
                </p>
                <p className="text-[11px] sm:text-xs text-text-secondary mt-1 font-merriweather leading-snug break-words">
                  Garanta <strong className="text-gold-light">3 meses de Idriel por R$ 19,90/mês</strong> (em vez de R$ 39,90).
                </p>
                <p className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-montserrat font-bold uppercase tracking-wider text-red-alert">
                  <Clock className="w-3 h-3 shrink-0" />
                  <span className="truncate">{daysMsg}</span>
                </p>
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:items-center sm:justify-end">
              <button
                onClick={() => toast.dismiss(t)}
                className="px-3 py-1.5 rounded-full text-[10px] font-montserrat font-bold uppercase tracking-wider border border-white/10 text-text-dim hover:text-foreground transition-colors w-full sm:w-auto"
              >
                Mais tarde
              </button>
              <button
                onClick={() => { openCheckout('beta_idriel_avulso'); toast.dismiss(t); }}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full text-[10px] font-montserrat font-bold uppercase tracking-wider bg-gradient-to-r from-gold via-gold-warm to-gold-deep text-background hover:shadow-[0_0_20px_rgba(218,165,32,0.45)] transition-all whitespace-nowrap w-full sm:w-auto"
              >
                <Sparkles className="w-3 h-3 shrink-0" />
                Garantir R$ 19,90/mês
              </button>
            </div>
          </div>
        </div>
      ),
      { duration: 18000, position: 'top-center' },
    );
  }, [beta, user]);

  return null;
};
