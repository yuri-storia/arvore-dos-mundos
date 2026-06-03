import React, { useState } from 'react';
import { Droplet, Crown, Infinity as InfinityIcon, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { RechargePackageDialog } from '@/components/RechargePackageDialog';
import { UpgradeIdrielDialog } from '@/components/UpgradeIdrielDialog';

/**
 * Painel horizontal de Elixir dos Mundos:
 * [ Droplet  Elixir dos Mundos · 42 gotas  ░░░░▓▓▓▓▓▓▓▓ ]  [ + Adquirir Elixir ]
 *
 * Renderizado logo abaixo do AppHeader, centralizado.
 */
const ElixirBar: React.FC<{
  available: number;
  total: number;
  infinite?: boolean;
  subtitle?: string;
}> = ({ available, total, infinite, subtitle }) => {
  const pct = infinite ? 100 : total > 0 ? Math.max(0, Math.min(100, (available / total) * 100)) : 0;
  const isLow = !infinite && available > 0 && pct <= 20;
  const isEmpty = !infinite && available <= 0;

  const fillBg = isEmpty
    ? 'linear-gradient(90deg, hsl(0 70% 45%), hsl(0 70% 30%))'
    : isLow
      ? 'linear-gradient(90deg, hsl(28 90% 55%), hsl(20 80% 42%))'
      : 'linear-gradient(90deg, hsl(45 92% 62%) 0%, hsl(38 80% 50%) 60%, hsl(32 70% 42%) 100%)';

  return (
    <div
      className="relative flex items-center gap-3 h-9 px-3 rounded-full border border-gold/30 bg-gold/[0.05] overflow-hidden flex-1 min-w-[200px] max-w-[420px]"
      title={subtitle}
    >
      {/* fill */}
      <div
        className="absolute inset-y-0 left-0 transition-all duration-500"
        style={{
          width: `${pct}%`,
          background: fillBg,
          opacity: 0.35,
          boxShadow: 'inset 0 0 12px rgba(218,165,32,0.25)',
        }}
        aria-hidden="true"
      />
      <Droplet className="relative w-4 h-4 text-gold-light shrink-0" strokeWidth={2} />
      <div className="relative flex items-baseline gap-1.5 leading-none">
        <span className="font-cinzel font-bold text-[12px] text-gold-light tracking-wide">
          Elixir
        </span>
        <span className="font-montserrat text-[10px] text-text-dim uppercase tracking-wider hidden sm:inline">
          ·
        </span>
        <span className="font-montserrat font-bold text-[12px] text-foreground tabular-nums">
          {infinite ? (
            <InfinityIcon className="inline-block w-4 h-4 align-[-0.15em]" strokeWidth={2.5} />
          ) : (
            available
          )}
        </span>
        <span className="font-montserrat text-[9px] text-text-dim uppercase tracking-wider hidden sm:inline">
          gotas
        </span>
      </div>
    </div>
  );
};

export const DropsCounterBadge: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const sub = useSubscription();
  const [showRecharge, setShowRecharge] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  if (!user || sub.loading) return null;

  const BuyButton = (
    <button
      onClick={() => setShowRecharge(true)}
      className="group relative flex items-center gap-1.5 h-9 px-3.5 rounded-full border border-gold/45 bg-gradient-to-r from-gold/15 via-gold-warm/15 to-gold-deep/15 hover:from-gold/35 hover:via-gold-warm/35 hover:to-gold-deep/35 transition-all font-montserrat font-bold text-[10px] uppercase tracking-wider text-gold-light whitespace-nowrap shadow-[0_0_12px_rgba(218,165,32,0.12)] hover:shadow-[0_0_16px_rgba(218,165,32,0.28)]"
    >
      <Sparkles className="w-3.5 h-3.5" strokeWidth={2} />
      <span>Adquirir Elixir</span>
    </button>
  );

  // wrapper centralizado, abaixo do header
  const wrap = (inner: React.ReactNode) => (
    <div className="w-full flex justify-center px-4 mt-1 mb-3">
      <div className="flex items-center gap-2 w-full max-w-2xl">{inner}</div>
    </div>
  );

  if (isAdmin) {
    const totalCapacity = Math.max(1, sub.creditLimit + sub.bonusDrops);
    return (
      <>
        {wrap(
          <>
            <ElixirBar
              available={totalCapacity}
              total={totalCapacity}
              infinite
              subtitle={`Admin · ilimitado${sub.bonusDrops ? ` (+ ${sub.bonusDrops} bônus)` : ''}`}
            />
            {BuyButton}
          </>,
        )}
        <RechargePackageDialog open={showRecharge} onClose={() => setShowRecharge(false)} />
      </>
    );
  }

  if (sub.hasIdriel) {
    const remainingMonth = Math.max(0, sub.creditLimit - sub.creditsUsed);
    const totalAvailable = remainingMonth + sub.bonusDrops;
    const totalCapacity = sub.creditLimit + sub.bonusDrops;
    return (
      <>
        {wrap(
          <>
            <ElixirBar
              available={totalAvailable}
              total={totalCapacity}
              subtitle={`${remainingMonth} do mês + ${sub.bonusDrops} bônus`}
            />
            {BuyButton}
          </>,
        )}
        <RechargePackageDialog open={showRecharge} onClose={() => setShowRecharge(false)} />
      </>
    );
  }

  // Sem Idriel
  return (
    <>
      {wrap(
        <button
          onClick={() => setShowUpgrade(true)}
          className="flex items-center justify-center gap-1.5 h-9 px-4 mx-auto rounded-full bg-gradient-to-r from-gold via-gold-warm to-gold-deep hover:from-gold-light hover:via-gold hover:to-gold-warm text-[#1a0f00] font-montserrat font-bold text-[11px] uppercase tracking-wider transition-all shadow-[0_0_12px_hsl(var(--gold)/0.3)]"
          title="Acesse a Idriel: imagens, análises e mapas"
        >
          <Crown className="w-4 h-4" strokeWidth={2.25} />
          <span>Desbloquear Elixir dos Mundos · Idriel</span>
        </button>,
      )}
      <UpgradeIdrielDialog open={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </>
  );
};
