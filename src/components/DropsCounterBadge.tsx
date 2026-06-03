import React, { useState } from 'react';
import { Droplet, Crown, Infinity as InfinityIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { RechargePackageDialog } from '@/components/RechargePackageDialog';
import { UpgradeIdrielDialog } from '@/components/UpgradeIdrielDialog';

export const DropsCounterBadge: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const sub = useSubscription();
  const [showRecharge, setShowRecharge] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  if (!user || sub.loading) return null;

  // Admin: ilimitado, mas mostra o contador (com gotas bônus) e permite recarga avulsa
  if (isAdmin) {
    return (
      <>
        <div className="flex items-center gap-1.5">
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-gold/30 bg-gold/[0.08]"
            title={`Admin · ilimitado${sub.bonusDrops ? ` (+ ${sub.bonusDrops} bônus)` : ''}`}
          >
            <Droplet className="w-3.5 h-3.5 text-gold-light" strokeWidth={2} />
            <InfinityIcon className="w-3.5 h-3.5 text-gold-light" strokeWidth={2.5} />
            {sub.bonusDrops > 0 && (
              <span className="font-montserrat font-bold text-[11px] text-gold-light tabular-nums">
                +{sub.bonusDrops}
              </span>
            )}
            <span className="font-montserrat text-[9px] text-text-dim uppercase tracking-wider hidden sm:inline">
              gotas
            </span>
          </div>
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

  // Idriel: mostra gotas + botão "Adquirir Elixir"
  if (sub.hasIdriel) {
    const remainingMonth = Math.max(0, sub.creditLimit - sub.creditsUsed);
    const totalAvailable = remainingMonth + sub.bonusDrops;
    return (
      <>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-gold/30 bg-gold/[0.08]" title={`${remainingMonth} do mês + ${sub.bonusDrops} bônus`}>
            <Droplet className="w-3.5 h-3.5 text-gold-light" strokeWidth={2} />
            <span className="font-montserrat font-bold text-[11px] text-gold-light tabular-nums">
              {totalAvailable}
            </span>
            <span className="font-montserrat text-[9px] text-text-dim uppercase tracking-wider hidden sm:inline">
              gotas
            </span>
          </div>
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

  // Sem Idriel (Semente ou Raiz): botão de upgrade
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
