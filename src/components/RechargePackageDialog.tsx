import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, X, Droplet } from 'lucide-react';
import { RECHARGE_PACKAGES, openCheckout } from '@/hooks/useSubscription';

interface RechargePackageDialogProps {
  open: boolean;
  onClose: () => void;
}

export const RechargePackageDialog: React.FC<RechargePackageDialogProps> = ({ open, onClose }) => {
  const [loading, setLoading] = useState<string | null>(null);

  if (!open) return null;

  const handleSelect = async (id: string) => {
    setLoading(id);
    try {
      await openCheckout(id);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(2, 7, 13, 0.85)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-gold/30 p-6 sm:p-8"
        style={{
          background: 'linear-gradient(180deg, rgba(20, 14, 4, 0.98) 0%, rgba(2, 7, 13, 0.98) 100%)',
          boxShadow: '0 0 60px rgba(218, 165, 32, 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-2 rounded-full text-text-dim hover:text-foreground hover:bg-white/5 transition-colors"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gold/10 border border-gold/30 mb-3">
            <Droplet className="w-6 h-6 text-gold-light" />
          </div>
          <h2 className="font-cinzel font-bold text-2xl text-gold-light mb-1">
            Recarregar Seiva Dourada
          </h2>
          <p className="font-merriweather italic text-text-dim text-sm max-w-md mx-auto">
            Escolha quantas gotas a Árvore deve devolver à sua Seiva. Quanto mais, mais barato fica cada gota.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {RECHARGE_PACKAGES.map((pkg) => {
            const isPopular = pkg.badge === 'Mais popular';
            const isBest = pkg.badge === 'Melhor custo-benefício';
            const highlighted = isPopular || isBest;

            return (
              <button
                key={pkg.id}
                onClick={() => handleSelect(pkg.id)}
                disabled={!!loading}
                className={`relative flex flex-col items-center text-center rounded-xl border p-4 transition-all hover:-translate-y-1 ${
                  highlighted
                    ? 'border-gold/50 bg-gold/[0.08] hover:bg-gold/[0.14]'
                    : 'border-border/60 bg-card/40 hover:border-gold/30 hover:bg-gold/[0.04]'
                } ${loading === pkg.id ? 'opacity-60' : ''}`}
              >
                {pkg.badge && (
                  <span
                    className={`absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-full text-[8px] font-montserrat font-bold uppercase tracking-wider ${
                      isPopular
                        ? 'bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--idriel-light))] text-[#1a0f00]'
                        : 'bg-emerald-500 text-white'
                    }`}
                  >
                    {pkg.badge}
                  </span>
                )}

                <Droplet className="w-6 h-6 mb-1 text-gold-champagne" strokeWidth={1.75} />
                <span className="font-cinzel font-bold text-lg text-gold-light">
                  {pkg.drops}
                </span>
                <span className="font-montserrat text-[10px] text-text-dim uppercase tracking-wider mb-2">
                  gotas
                </span>
                <span className="font-montserrat font-bold text-sm text-foreground">
                  {pkg.priceLabel}
                </span>
                <span className="font-montserrat text-[10px] text-text-dim mt-1">
                  R$ {pkg.pricePerDrop.toFixed(2).replace('.', ',')}/gota
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-6 text-center">
          <p className="font-merriweather italic text-text-dim text-[11px]">
            <Sparkles className="w-3 h-3 inline mr-1 text-gold-light" />
            Compras avulsas — não renovam automaticamente. As gotas são acumuladas à sua Seiva atual.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
};
