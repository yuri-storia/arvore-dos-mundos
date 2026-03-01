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

  const normalBg = 'linear-gradient(135deg, #DFBD69 0%, #926F34 100%)';
  const lowBg = 'linear-gradient(135deg, rgba(220,120,20,0.18) 0%, rgba(220,80,20,0.10) 100%)';
  const emptyBg = 'linear-gradient(135deg, rgba(220,38,38,0.18) 0%, rgba(220,38,38,0.10) 100%)';

  return (
    <div className="mx-auto max-w-[1060px] px-4 mb-4">
      <div
        className={`rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 border ${isEmpty ? 'border-destructive/40' : isLow ? 'border-destructive/30' : 'border-transparent'}`}
        style={{
          background: isEmpty ? emptyBg : isLow ? lowBg : normalBg,
          backdropFilter: 'blur(20px)',
          boxShadow: isEmpty ? '0 0 20px rgba(220,38,38,0.15)' : isLow ? '0 0 20px rgba(220,120,20,0.15)' : '0 4px 16px rgba(146,111,52,0.35)',
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{isEmpty ? '🚫' : isLow ? '⚠️' : '👑'}</span>
          <div>
            <span
              className={`font-montserrat font-bold text-sm ${isEmpty ? 'text-destructive' : isLow ? 'text-orange-400' : ''}`}
              style={!isEmpty && !isLow ? { color: '#2A1A00', textShadow: 'none' } : { textShadow: 'none' }}
            >
              {isEmpty ? 'Créditos esgotados' : isLow ? 'Créditos acabando!' : 'Créditos de IA'}
            </span>
            <span
              className={`block text-xs ${isEmpty ? 'text-destructive/70' : isLow ? 'text-orange-400/70' : ''}`}
              style={!isEmpty && !isLow ? { color: '#3D2800' } : undefined}
            >
              {isEmpty ? 'Aguarde o próximo mês para renovar' : isLow ? `Restam apenas ${creditsLeft} créditos` : 'Uso mensal'}
            </span>
          </div>
        </div>
        <div className="text-center">
          <span
            className={`font-montserrat font-bold text-sm ${isEmpty ? 'text-destructive' : isLow ? 'text-orange-400' : ''}`}
            style={!isEmpty && !isLow ? { color: '#1E1000' } : undefined}
          >
            {creditsLeft}/{sub.creditLimit}
          </span>
          <span
            className={`block text-[10px] ${isEmpty ? 'text-destructive/60' : isLow ? 'text-orange-400/60' : ''}`}
            style={!isEmpty && !isLow ? { color: '#3D2800' } : undefined}
          >
            restantes
          </span>
        </div>
      </div>
    </div>
  );
};
