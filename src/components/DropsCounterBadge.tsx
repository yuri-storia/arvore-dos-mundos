import React, { useState } from 'react';
import { Droplet, Crown, Infinity as InfinityIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { RechargePackageDialog } from '@/components/RechargePackageDialog';
import { UpgradeIdrielDialog } from '@/components/UpgradeIdrielDialog';

// Rounded progress-bar badge with a countdown of remaining gotas
const DropsBar: React.FC<{
  available: number;
  total: number;
  infinite?: boolean;
  title?: string;
}> = ({ available, total, infinite, title }) => {
  const pct = infinite ? 100 : total > 0 ? Math.max(0, Math.min(100, (available / total) * 100)) : 0;
  const isLow = !infinite && available > 0 && pct <= 20;
  const isEmpty = !infinite && available <= 0;

  const fillBg = isEmpty
    ? 'linear-gradient(90deg, hsl(0 70% 45%), hsl(0 70% 35%))'
    : isLow
      ? 'linear-gradient(90deg, hsl(28 90% 55%), hsl(20 80% 45%))'
      : 'linear-gradient(90deg, hsl(45 90% 65%), hsl(38 70% 50%))';

  return (
    <div
      className="relative flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-full border border-gold/30 bg-gold/[0.06] overflow-hidden min-w-[120px]"
      title={title}
    >
      {/* Progress fill */}
      <div
        className="absolute inset-y-0 left-0 transition-all duration-500 opacity-30"
        style={{ width: `${pct}%`, background: fillBg }}
        aria-hidden="true"
      />
      {/* Content above fill */}
      <Droplet className="relative w-3.5 h-3.5 text-gold-light shrink-0" strokeWidth={2} />
      <span className="relative font-montserrat font-bold text-[11px] text-gold-light tabular-nums leading-none">
        {infinite ? <InfinityIcon className="inline-block w-3.5 h-3.5" strokeWidth={2.5} /> : available}
      </span>
      <span className="relative font-montserrat text-[9px] text-text-dim uppercase tracking-wider hidden sm:inline leading-none">
        gotas
      </span>
    </div>
  );
};

export const DropsCounterBadge: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const sub = useSubscription();
  const [showRecharge, setShowRecharge] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  if (!user || sub.loading) return null;

  // Admin: ilimitado, mas mostra barra (cheia) e permite recarga avulsa
  if (isAdmin) {
    const totalCapacity = Math.max(1, sub.creditLimit + sub.bonusDrops);
    return (
      <>
        <div className="flex items-center gap-1.5">
          <DropsBar
            available={totalCapacity}
            total={totalCapacity}
            infinite
            title={`Admin · ilimitado${sub.bonusDrops ? ` (+ ${sub.bonusDrops} bônus)` : ''}`}
          />
          <button
            onClick={() => setShowRecharge(true)}
            className="px-2.5 py-1 rounded-full border border-gold/40 bg-gradient-to-r from-gold/15 via-gold-warm/15 to-gold-deep/15 hover:from-gold/30 hover:via-gold-warm/30 hover:to-gold-deep/30 transition-all font-montserrat font-bold text-[10px] uppercase tracking-wider text-gold-light whitespace-nowrap"
          >
            + Elixir
          </button>
        </div>
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
        <div className="flex items-center gap-1.5">
          <DropsBar
            available={totalAvailable}
            total={totalCapacity}
            title={`${remainingMonth} do mês + ${sub.bonusDrops} bônus`}
          />
          <button
            onClick={() => setShowRecharge(true)}
            className="px-2.5 py-1 rounded-full border border-gold/40 bg-gradient-to-r from-gold/15 via-gold-warm/15 to-gold-deep/15 hover:from-gold/30 hover:via-gold-warm/30 hover:to-gold-deep/30 transition-all font-montserrat font-bold text-[10px] uppercase tracking-wider text-gold-light whitespace-nowrap"
          >
            + Elixir
          </button>
        </div>
        <RechargePackageDialog open={showRecharge} onClose={() => setShowRecharge(false)} />
      </>
    );
  }

  // Sem Idriel
  return (
    <>
      <button
        onClick={() => setShowUpgrade(true)}
        className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-gold via-gold-warm to-gold-deep hover:from-gold-light hover:via-gold hover:to-gold-warm text-[#1a0f00] font-montserrat font-bold text-[10px] uppercase tracking-wider transition-all shadow-[0_0_10px_hsl(var(--gold)/0.3)] whitespace-nowrap"
        title="Acesse a Idriel: imagens, análises e mapas"
      >
        <Crown className="w-3.5 h-3.5" strokeWidth={2.25} />
        <span>Upgrade Idriel</span>
      </button>
      <UpgradeIdrielDialog open={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </>
  );
};
