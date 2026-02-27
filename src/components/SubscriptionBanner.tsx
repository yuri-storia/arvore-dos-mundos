import React from 'react';
import { useSubscription } from '@/hooks/useSubscription';

export const SubscriptionBanner: React.FC = () => {
  const sub = useSubscription();

  if (sub.loading) return null;

  if (!sub.active) {
    return (
      <div className="mx-auto max-w-[1060px] px-4 mb-4">
        <div className="card-glass rounded-lg p-3 border-l-[3px] border-l-gold">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            <div>
              <span className="font-montserrat font-bold text-sm text-foreground">Sem plano ativo</span>
              <span className="block text-xs text-text-dim">Assine um plano para usar os recursos de IA.</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const creditsLeft = sub.creditLimit - sub.creditsUsed;
  const creditColor = creditsLeft <= 0 ? 'text-red-alert' : creditsLeft <= 10 ? 'text-red-alert' : 'text-amber-400';

  const isLow = creditsLeft > 0 && creditsLeft <= 10;
  const isEmpty = creditsLeft <= 0;

  return (
    <div className="mx-auto max-w-[1060px] px-4 mb-4">
      <div className={`rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 border ${isEmpty ? 'border-destructive/40' : isLow ? 'border-destructive/30' : 'border-yellow-600/30'}`} style={{ background: isEmpty ? 'linear-gradient(135deg, rgba(220,38,38,0.18) 0%, rgba(220,38,38,0.10) 100%)' : isLow ? 'linear-gradient(135deg, rgba(220,120,20,0.18) 0%, rgba(220,80,20,0.10) 100%)' : 'linear-gradient(135deg, rgba(180,130,20,0.18) 0%, rgba(218,165,32,0.12) 40%, rgba(255,215,0,0.08) 100%)', backdropFilter: 'blur(20px)', boxShadow: isEmpty ? '0 0 20px rgba(220,38,38,0.15)' : isLow ? '0 0 20px rgba(220,120,20,0.15)' : '0 0 20px rgba(218,165,32,0.15), inset 0 1px 0 rgba(255,215,0,0.15)' }}>
        <div className="flex items-center gap-2">
          <span className="text-lg">{isEmpty ? '🚫' : isLow ? '⚠️' : '👑'}</span>
          <div>
            <span className={`font-montserrat font-bold text-sm ${isEmpty ? 'text-destructive' : isLow ? 'text-orange-400' : 'text-amber-400'}`} style={{ textShadow: 'none' }}>
              {isEmpty ? 'Créditos esgotados' : isLow ? 'Créditos acabando!' : 'Créditos de IA'}
            </span>
            <span className={`block text-xs ${isEmpty ? 'text-destructive/70' : isLow ? 'text-orange-400/70' : 'text-amber-400/70'}`}>
              {isEmpty ? 'Aguarde o próximo mês para renovar' : isLow ? `Restam apenas ${creditsLeft} créditos` : 'Uso mensal'}
            </span>
          </div>
        </div>
        <div className="text-center">
          <span className={`font-montserrat font-bold text-sm ${creditColor}`}>{creditsLeft}/{sub.creditLimit}</span>
          <span className="block text-[10px] text-amber-400/60">restantes</span>
        </div>
      </div>
    </div>
  );
};
