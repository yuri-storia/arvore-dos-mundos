import React from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { Progress } from '@/components/ui/progress';

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
              <span className="block text-xs text-text-dim">Idriel precisa de Seiva Dourada para te ajudar. Assine um plano!</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const creditsLeft = sub.creditLimit - sub.creditsUsed;
  const pct = sub.creditLimit > 0 ? (sub.creditsUsed / sub.creditLimit) * 100 : 0;

  const isLow = creditsLeft > 0 && creditsLeft <= 10;
  const isEmpty = creditsLeft <= 0;

  const normalBg = 'linear-gradient(135deg, #DFBD69 0%, #926F34 100%)';
  const lowBg = 'linear-gradient(135deg, rgba(220,120,20,0.18) 0%, rgba(220,80,20,0.10) 100%)';
  const emptyBg = 'linear-gradient(135deg, rgba(220,38,38,0.18) 0%, rgba(220,38,38,0.10) 100%)';

  // Gamified labels
  const statusLabel = isEmpty
    ? '🥀 A Seiva secou…'
    : isLow
      ? '🍂 Poucas gotas restam…'
      : '✨ Seiva Dourada de Idriel';

  const statusDesc = isEmpty
    ? 'Idriel aguarda a próxima lua nova para renovar sua energia'
    : isLow
      ? 'Use com sabedoria — Idriel sente a Árvore enfraquecer'
      : 'A energia da Árvore flui forte este mês';

  return (
    <div className="mx-auto max-w-[1060px] px-4 mb-4">
      <div
        className={`rounded-lg p-3 border ${isEmpty ? 'border-destructive/40' : isLow ? 'border-destructive/30' : 'border-transparent'}`}
        style={{
          background: isEmpty ? emptyBg : isLow ? lowBg : normalBg,
          backdropFilter: 'blur(20px)',
          boxShadow: isEmpty ? '0 0 20px rgba(220,38,38,0.15)' : isLow ? '0 0 20px rgba(220,120,20,0.15)' : '0 4px 16px rgba(146,111,52,0.35)',
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-lg shrink-0">{isEmpty ? '🥀' : isLow ? '🍂' : '🌿'}</span>
            <div className="min-w-0">
              <span
                className={`font-montserrat font-bold text-sm block ${isEmpty ? 'text-destructive' : isLow ? 'text-orange-400' : ''}`}
                style={!isEmpty && !isLow ? { color: '#2A1A00', textShadow: 'none' } : { textShadow: 'none' }}
              >
                {statusLabel}
              </span>
              <span
                className={`block text-[10px] ${isEmpty ? 'text-destructive/70' : isLow ? 'text-orange-400/70' : ''}`}
                style={!isEmpty && !isLow ? { color: '#3D2800' } : undefined}
              >
                {statusDesc}
              </span>
            </div>
          </div>

          {/* Gamified counter */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:block w-24">
              <Progress
                value={100 - pct}
                className={`h-1.5 ${isEmpty ? 'bg-destructive/20' : isLow ? 'bg-amber-500/20' : 'bg-[#7A5A20]/30'}`}
              />
            </div>
            <div className="text-center">
              <span
                className={`font-montserrat font-bold text-sm ${isEmpty ? 'text-destructive' : isLow ? 'text-orange-400' : ''}`}
                style={!isEmpty && !isLow ? { color: '#1E1000' } : undefined}
              >
                {creditsLeft}
              </span>
              <span
                className={`block text-[9px] uppercase tracking-wider font-montserrat font-bold ${isEmpty ? 'text-destructive/60' : isLow ? 'text-orange-400/60' : ''}`}
                style={!isEmpty && !isLow ? { color: '#3D2800' } : undefined}
              >
                gotas
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};