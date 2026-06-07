import React, { useState } from 'react';
import { Droplet, Crown, Infinity as InfinityIcon, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useBetaStatus } from '@/hooks/useBetaStatus';
import { RechargePackageDialog } from '@/components/RechargePackageDialog';
import { UpgradeIdrielDialog } from '@/components/UpgradeIdrielDialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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

  // Dourado premium (champagne → ouro → âmbar profundo) com brilho lustroso
  const premiumGold =
    'linear-gradient(90deg, hsl(46 95% 78%) 0%, hsl(44 92% 62%) 35%, hsl(40 88% 52%) 65%, hsl(32 78% 42%) 100%)';
  const lowGold =
    'linear-gradient(90deg, hsl(38 92% 62%) 0%, hsl(28 88% 52%) 60%, hsl(20 82% 42%) 100%)';
  const emptyRed = 'linear-gradient(90deg, hsl(0 75% 50%), hsl(0 70% 32%))';

  const fillBg = isEmpty ? emptyRed : isLow ? lowGold : premiumGold;

  return (
    <div
      className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0 max-w-[460px]"
      title={subtitle}
    >
      {/* Icon */}
      <div className="relative shrink-0 w-7 h-7 rounded-full flex items-center justify-center border border-gold/40 bg-gradient-to-br from-gold/25 to-gold-deep/10 shadow-[0_0_8px_hsl(var(--gold)/0.25)]">
        <Droplet className="w-3.5 h-3.5 text-gold-light" strokeWidth={2.25} />
      </div>

      {/* Label + Track stacked */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2 mb-1 leading-none">
          <span className="font-cinzel font-bold text-[10px] uppercase tracking-[0.16em] text-gold-light truncate">
            <span className="hidden sm:inline">Elixir dos Mundos</span>
            <span className="sm:hidden">Elixir</span>
          </span>
          <span className="font-montserrat font-bold text-[10px] tabular-nums text-gold-light/90">
            {infinite ? (
              <>
                <InfinityIcon className="inline-block w-3.5 h-3.5 align-[-0.15em]" strokeWidth={2.5} />
                <span className="ml-1 text-[9px] text-text-dim uppercase tracking-wider">gotas</span>
              </>
            ) : (
              <>
                {available}
                <span className="text-text-dim/70"> / {total}</span>
                <span className="ml-1 text-[9px] text-text-dim uppercase tracking-wider">gotas</span>
              </>
            )}
          </span>
        </div>

        {/* Loading-bar track */}
        <div
          className="relative h-2.5 w-full rounded-full overflow-hidden border border-gold/25"
          style={{
            background:
              'linear-gradient(180deg, hsl(220 50% 4%) 0%, hsl(220 40% 7%) 100%)',
            boxShadow:
              'inset 0 1px 2px rgba(0,0,0,0.7), inset 0 -1px 1px rgba(218,165,32,0.08)',
          }}
        >
          {/* Fill */}
          <div
            className="relative h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${pct}%`,
              background: fillBg,
              boxShadow:
                '0 0 10px hsl(var(--gold) / 0.55), inset 0 1px 0 rgba(255, 240, 200, 0.55), inset 0 -1px 0 rgba(0,0,0,0.25)',
            }}
          >
            {/* Glossy highlight */}
            <div
              className="absolute inset-x-0 top-0 h-1/2 rounded-t-full pointer-events-none"
              style={{
                background:
                  'linear-gradient(180deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 100%)',
              }}
            />
            {/* Shimmer */}
            <div
              className="absolute inset-y-0 w-1/3 pointer-events-none animate-[elixir-shimmer_2.6s_linear_infinite]"
              style={{
                background:
                  'linear-gradient(90deg, transparent 0%, rgba(255,250,220,0.55) 50%, transparent 100%)',
                mixBlendMode: 'screen',
              }}
            />
            {/* Leading marker */}
            {pct > 4 && pct < 100 && (
              <div
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-1.5 h-3 rounded-full"
                style={{
                  background:
                    'radial-gradient(circle, hsl(48 100% 88%) 0%, hsl(45 95% 68%) 60%, transparent 100%)',
                  boxShadow: '0 0 8px hsl(48 100% 75% / 0.9)',
                }}
              />
            )}
          </div>
        </div>
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

  // Detect low/empty state for the buy button blink
  const remainingMonthForState = sub.hasIdriel ? Math.max(0, sub.creditLimit - sub.creditsUsed) : 0;
  const totalAvail = remainingMonthForState + sub.bonusDrops;
  const totalCap = sub.creditLimit + sub.bonusDrops;
  const isEmptyDrops = sub.hasIdriel && !isAdmin && totalAvail <= 0;
  const isLowDrops = sub.hasIdriel && !isAdmin && !isEmptyDrops && totalCap > 0 && (totalAvail / totalCap) <= 0.20;

  const BuyButton = (
    <button
      onClick={() => setShowRecharge(true)}
      aria-label="Adquirir Elixir"
      className={`group relative flex items-center justify-center gap-1.5 h-9 px-2.5 sm:px-3.5 rounded-full border whitespace-nowrap shrink-0 transition-all font-montserrat font-bold text-[10px] uppercase tracking-wider ${
        isEmptyDrops
          ? 'border-gold-champagne/80 bg-gradient-to-r from-gold-warm via-gold-champagne to-gold-cream text-[#1a0f00] animate-gold-blink'
          : isLowDrops
            ? 'border-gold-warm/60 bg-gradient-to-r from-gold-warm/30 via-gold-champagne/25 to-gold-warm/30 text-gold-cream shadow-[0_0_14px_hsl(var(--gold-warm)/0.35)]'
            : 'border-gold/45 bg-gradient-to-r from-gold/15 via-gold-warm/15 to-gold-deep/15 hover:from-gold/35 hover:via-gold-warm/35 hover:to-gold-deep/35 text-gold-light shadow-[0_0_12px_rgba(218,165,32,0.12)] hover:shadow-[0_0_16px_rgba(218,165,32,0.28)]'
      }`}
    >
      <Sparkles className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
      <span className="hidden sm:inline">{isEmptyDrops ? 'Recarregar Elixir' : 'Adquirir Elixir'}</span>
      <span className="sm:hidden">+ Elixir</span>
    </button>
  );

  // wrapper centralizado, abaixo do header
  const wrap = (inner: React.ReactNode) => (
    <div className="w-full flex justify-center px-3 sm:px-4 mt-1 mb-3">
      <div className="flex items-center gap-2 w-full max-w-2xl min-w-0">{inner}</div>
    </div>
  );


  // Tooltip content with breakdown
  const renderTooltip = (
    remainingMonth: number | null,
    bonus: number,
    totalAvailable: number,
    totalCapacity: number,
    infinite: boolean,
  ) => (
    <div className="font-montserrat text-[11px] text-foreground space-y-1 min-w-[200px]">
      <div className="font-cinzel font-bold text-gold-light text-[12px] tracking-wide mb-1.5 border-b border-gold/20 pb-1">
        Elixir dos Mundos
      </div>
      {infinite ? (
        <>
          <div className="flex justify-between gap-3">
            <span className="text-text-dim">Acesso</span>
            <span className="text-gold-light font-bold">Ilimitado (Admin)</span>
          </div>
          {bonus > 0 && (
            <div className="flex justify-between gap-3">
              <span className="text-text-dim">Bônus avulso</span>
              <span className="tabular-nums">+{bonus} gotas</span>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex justify-between gap-3">
            <span className="text-text-dim">Gotas do mês</span>
            <span className="tabular-nums">{remainingMonth} restantes</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-text-dim">Bônus avulso</span>
            <span className="tabular-nums">+{bonus} gotas</span>
          </div>
          <div className="flex justify-between gap-3 border-t border-gold/15 pt-1 mt-1">
            <span className="text-gold-light font-bold">Disponível agora</span>
            <span className="text-gold-light font-bold tabular-nums">{totalAvailable} gotas</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-text-dim">Capacidade total</span>
            <span className="tabular-nums">{totalCapacity} gotas</span>
          </div>
        </>
      )}
    </div>
  );

  if (isAdmin) {
    const totalCapacity = Math.max(1, sub.creditLimit + sub.bonusDrops);
    return (
      <TooltipProvider delayDuration={150}>
        {wrap(
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex-1 min-w-0 cursor-help">
                  <ElixirBar available={totalCapacity} total={totalCapacity} infinite />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="border-gold/40 bg-[#0a0d14]/95 backdrop-blur-md p-3 shadow-[0_0_20px_hsl(var(--gold)/0.15)]">
                {renderTooltip(null, sub.bonusDrops, totalCapacity, totalCapacity, true)}
              </TooltipContent>
            </Tooltip>
            {BuyButton}
          </>,
        )}
        <RechargePackageDialog open={showRecharge} onClose={() => setShowRecharge(false)} />
      </TooltipProvider>
    );
  }

  if (sub.hasIdriel) {
    const remainingMonth = Math.max(0, sub.creditLimit - sub.creditsUsed);
    const totalAvailable = remainingMonth + sub.bonusDrops;
    const totalCapacity = sub.creditLimit + sub.bonusDrops;
    return (
      <TooltipProvider delayDuration={150}>
        {wrap(
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex-1 min-w-0 cursor-help">
                  <ElixirBar available={totalAvailable} total={totalCapacity} />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="border-gold/40 bg-[#0a0d14]/95 backdrop-blur-md p-3 shadow-[0_0_20px_hsl(var(--gold)/0.15)]">
                {renderTooltip(remainingMonth, sub.bonusDrops, totalAvailable, totalCapacity, false)}
              </TooltipContent>
            </Tooltip>
            {BuyButton}
          </>,
        )}
        <RechargePackageDialog open={showRecharge} onClose={() => setShowRecharge(false)} />
      </TooltipProvider>
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
