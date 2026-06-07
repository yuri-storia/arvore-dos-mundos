import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBetaStatus } from '@/hooks/useBetaStatus';
import { openCheckout } from '@/hooks/useSubscription';
import { Sparkles, X, Leaf, Crown, Clock } from 'lucide-react';

/**
 * Two popups for beta-code users:
 *  1) "info"    — shown once during the 30-day Raiz period, anuncia condição especial Idriel.
 *  2) "expired" — shown the first time the user logs in after Raiz beta zerar, convidando a resgatar Idriel promocional.
 */
export const BetaPromoDialog: React.FC = () => {
  const { user } = useAuth();
  const beta = useBetaStatus();
  const [variant, setVariant] = useState<'info' | 'expired' | null>(null);

  useEffect(() => {
    if (beta.loading || !beta.hasBeta || !user) return;

    const infoKey = `adm_beta_promo_info_seen_${user.id}`;
    // Janela de resgate: lembramos UMA vez por sessão para não ser repetitivo,
    // mas reaparece em sessões novas até o usuário resgatar ou perder o prazo.
    const expiredKey = `adm_beta_promo_expired_seen_${user.id}`;

    if (beta.raizExpired && beta.promoStillValid) {
      try {
        if (sessionStorage.getItem(expiredKey) !== '1') {
          setVariant('expired');
          return;
        }
      } catch {}
    }

    if (!beta.raizExpired && beta.daysLeft > 0) {
      try {
        if (localStorage.getItem(infoKey) !== '1') {
          setVariant('info');
        }
      } catch {}
    }
  }, [beta, user]);

  if (!variant || !user) return null;

  const close = () => {
    if (variant === 'info' && user) {
      try { localStorage.setItem(`adm_beta_promo_info_seen_${user.id}`, '1'); } catch {}
    } else if (variant === 'expired' && user) {
      try { sessionStorage.setItem(`adm_beta_promo_expired_seen_${user.id}`, '1'); } catch {}
    }
    setVariant(null);
  };

  const claim = async () => {
    try { await openCheckout('beta_idriel_avulso'); } catch (e) { console.error(e); }
    close();
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-background/70 backdrop-blur-[4px] p-4"
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[460px] rounded-2xl border border-gold/40 p-7 text-center overflow-hidden"
        style={{
          background:
            'radial-gradient(120% 100% at 50% 0%, rgba(218,165,32,0.18) 0%, rgba(2,7,13,0.92) 70%), #02070d',
          boxShadow: '0 30px 80px -20px rgba(218,165,32,0.45), 0 0 0 1px rgba(218,165,32,0.12) inset',
        }}
      >
        {/* shimmer accent */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-60" />

        <button
          onClick={close}
          className="absolute top-3 right-3 p-1.5 text-text-dim/70 hover:text-foreground transition-colors"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        {variant === 'info' ? (
          <>
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-gold/30 to-gold/5 border border-gold/40 mb-4">
              <Leaf className="w-7 h-7 text-emerald-300" strokeWidth={1.5} />
            </div>
            <h2 className="font-cinzel font-bold text-2xl text-gradient-gold mb-2">
              Sua Raiz floresceu!
            </h2>
            <p className="font-merriweather italic text-sm text-text-secondary mb-5 leading-relaxed">
              Você está no Beta da Comunidade. Tem <strong className="text-gold-light">{beta.daysLeft} dia{beta.daysLeft === 1 ? '' : 's'}</strong> de plano Raiz gratuito pela frente.
            </p>

            <div className="rounded-xl border border-gold/25 bg-gold/[0.06] p-4 mb-5 text-left">
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-gold-champagne shrink-0 mt-0.5" />
                <div>
                  <p className="font-montserrat font-bold text-[11px] uppercase tracking-wider text-gold-light mb-1">
                    Condição especial Idriel
                  </p>
                  <p className="font-merriweather text-xs text-text-secondary leading-relaxed">
                    Ao fim dos 30 dias, você terá <strong className="text-gold-light">7 dias</strong> para garantir <strong className="text-gold-light">3 meses de Idriel por R$ 19,90/mês</strong> (em vez de R$ 39,90). Depois desse prazo, a oferta expira e o plano fica pausado — seu conteúdo permanece salvo.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={close}
              className="w-full px-5 py-2.5 rounded-full bg-gradient-to-r from-gold to-gold-light text-background text-xs font-montserrat font-bold uppercase tracking-wider hover:shadow-[0_0_24px_rgba(218,165,32,0.35)] transition-all"
            >
              Continuar criando
            </button>
            <p className="mt-3 text-[10px] text-text-dim font-montserrat uppercase tracking-wider flex items-center justify-center gap-1.5">
              <Clock className="w-3 h-3" />
              Acompanhe o contador no topo da Árvore
            </p>
          </>
        ) : (
          <>
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-gold to-gold-light/60 border border-gold/60 mb-4 shadow-[0_0_30px_rgba(218,165,32,0.4)]">
              <Crown className="w-7 h-7 text-background" strokeWidth={1.75} />
            </div>
            <h2 className="font-cinzel font-bold text-2xl text-gradient-gold mb-2">
              Idriel aguarda você
            </h2>
            <p className="font-merriweather italic text-sm text-text-secondary mb-4 leading-relaxed">
              Seu período beta do plano Raiz terminou — mas guardei uma promessa para você.
            </p>

            <div className="rounded-xl border border-red-alert/40 bg-red-alert/[0.08] p-3 mb-4 flex items-center justify-center gap-2">
              <Clock className="w-4 h-4 text-red-alert" />
              <p className="font-montserrat font-bold text-[11px] uppercase tracking-wider text-red-alert">
                {beta.promoDaysLeft > 0
                  ? <>Você tem <span className="tabular-nums">{beta.promoDaysLeft}</span> {beta.promoDaysLeft === 1 ? 'dia' : 'dias'} para garantir</>
                  : 'Última chance — oferta expira hoje'}
              </p>
            </div>

            <div className="rounded-xl border border-gold/40 bg-gradient-to-br from-gold/15 to-gold/[0.04] p-4 mb-5">
              <p className="font-cinzel text-sm text-gold-light mb-1">Sua condição especial</p>
              <p className="font-montserrat font-bold text-3xl text-gradient-gold mb-0">R$ 19,90<span className="text-base text-gold-light/80">/mês</span></p>
              <p className="text-[11px] text-text-dim font-montserrat uppercase tracking-wider line-through opacity-70">de R$ 39,90/mês</p>
              <p className="text-[11px] text-gold-light/90 font-montserrat uppercase tracking-wider mt-2">
                3 meses de Idriel · {beta.idrielChargesLeft} de 3 disponíveis
              </p>
            </div>

            <button
              onClick={claim}
              className="w-full px-5 py-3 rounded-full bg-gradient-to-r from-gold to-gold-light text-background text-xs font-montserrat font-bold uppercase tracking-wider hover:shadow-[0_0_28px_rgba(218,165,32,0.5)] transition-all mb-2"
            >
              <Sparkles className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" />
              Garantir Idriel por R$ 19,90/mês
            </button>
            <button
              onClick={close}
              className="w-full px-5 py-2 rounded-full text-[10px] font-montserrat font-bold uppercase tracking-wider text-text-dim hover:text-foreground transition-colors"
            >
              Mais tarde
            </button>
          </>
        )}
      </div>
    </div>
  );
};
