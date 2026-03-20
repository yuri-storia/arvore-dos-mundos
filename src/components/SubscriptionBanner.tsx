import React, { useState } from 'react';
import { useSubscription, openCheckout, STRIPE_PLANS, openCustomerPortal } from '@/hooks/useSubscription';
import { Progress } from '@/components/ui/progress';
import { Lock, Sparkles, CreditCard } from 'lucide-react';

export const SubscriptionBanner: React.FC = () => {
  const sub = useSubscription();
  const [loading, setLoading] = useState<string | null>(null);

  if (sub.loading) return null;

  const handleCheckout = async (plan: keyof typeof STRIPE_PLANS, mode: 'subscription' | 'payment' = 'subscription') => {
    setLoading(plan);
    try {
      await openCheckout(STRIPE_PLANS[plan].price_id, mode);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
    }
  };

  // Not subscribed at all
  if (!sub.subscribed) {
    return (
      <div className="mx-auto max-w-[1060px] px-4 mb-4">
        <div className="card-glass rounded-lg p-4 border border-gold/30">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🌳</span>
              <div>
                <span className="font-montserrat font-bold text-sm text-foreground">Bem-vindo à Árvore dos Mundos</span>
                <span className="block text-xs text-text-dim">Escolha seu caminho para começar a criar mundos</span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Template Annual */}
              <button
                onClick={() => handleCheckout('template_anual')}
                disabled={!!loading}
                className="flex flex-col items-start gap-1.5 p-3 rounded-lg border border-blue-bright/20 bg-blue-bright/[0.06] hover:bg-blue-bright/[0.12] transition-all text-left"
              >
                <span className="font-montserrat font-bold text-xs text-blue-light">🗺 Template de Worldbuilding</span>
                <span className="text-[10px] text-text-dim">11 frutos, exportação PDF, galeria de referências</span>
                <span className="font-montserrat font-bold text-sm text-blue-light">R$ 97/ano</span>
              </button>
              {/* Idriel Monthly */}
              <button
                onClick={() => handleCheckout('idriel_mensal')}
                disabled={!!loading}
                className="flex flex-col items-start gap-1.5 p-3 rounded-lg border border-gold/30 hover:border-gold/50 transition-all text-left"
                style={{ background: 'linear-gradient(135deg, rgba(200,146,42,0.10) 0%, rgba(200,146,42,0.04) 100%)' }}
              >
                <span className="font-montserrat font-bold text-xs text-gold-light">✨ Template + Idriel (IA)</span>
                <span className="text-[10px] text-text-dim">Tudo do template + assistente de IA + geração de imagens</span>
                <span className="font-montserrat font-bold text-sm text-gold-light">R$ 29,90/mês</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Template-only user: show upgrade CTA
  if (sub.plan === 'template' && !sub.hasIdriel) {
    return (
      <div className="mx-auto max-w-[1060px] px-4 mb-4">
        <div className="rounded-lg p-3 border border-blue-bright/20 bg-blue-bright/[0.06]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-lg">🗺</span>
              <div className="min-w-0">
                <span className="font-montserrat font-bold text-sm text-blue-light block">Plano Template Ativo</span>
                <span className="block text-[10px] text-text-dim">Acesso completo ao worldbuilding. Desbloqueie Idriel para potencializar sua criação!</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCheckout('idriel_mensal')}
                disabled={!!loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-montserrat font-bold uppercase tracking-wider border border-gold/40 text-gold-light hover:bg-gold/[0.12] transition-all"
              >
                <Sparkles className="w-3 h-3" />
                Desbloquear Idriel — R$ 29,90/mês
              </button>
              <button
                onClick={async () => { try { await openCustomerPortal(); } catch {} }}
                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-full text-[10px] font-montserrat font-bold uppercase tracking-wider border border-white/10 text-text-dim hover:text-foreground transition-colors"
              >
                <CreditCard className="w-3 h-3" />
                <span className="hidden sm:inline">Gerenciar</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Idriel user: show credits (Seiva Dourada)
  if (sub.hasIdriel) {
    const creditsLeft = sub.creditLimit - sub.creditsUsed;
    const pct = sub.creditLimit > 0 ? (sub.creditsUsed / sub.creditLimit) * 100 : 0;
    const isLow = creditsLeft > 0 && creditsLeft <= 10;
    const isEmpty = creditsLeft <= 0;

    const normalBg = 'linear-gradient(135deg, #DFBD69 0%, #926F34 100%)';
    const lowBg = 'linear-gradient(135deg, rgba(220,120,20,0.18) 0%, rgba(220,80,20,0.10) 100%)';
    const emptyBg = 'linear-gradient(135deg, rgba(220,38,38,0.18) 0%, rgba(220,38,38,0.10) 100%)';

    const statusLabel = isEmpty
      ? '🥀 A Seiva secou…'
      : isLow
        ? '🍂 Poucas gotas restam…'
        : '✨ Seiva Dourada de Idriel';

    const statusDesc = isEmpty
      ? 'Recarregue para continuar criando com Idriel'
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

            <div className="flex items-center gap-3">
              {(isEmpty || isLow) && (
                <button
                  onClick={() => handleCheckout('recarga_seiva', 'payment')}
                  disabled={!!loading}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-montserrat font-bold uppercase tracking-wider border border-gold/40 text-gold-light bg-gold/[0.08] hover:bg-gold/[0.18] transition-all"
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  +100 gotas — R$20
                </button>
              )}
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
              <button
                onClick={async () => { try { await openCustomerPortal(); } catch {} }}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-montserrat font-bold uppercase tracking-wider border transition-colors ${isEmpty || isLow ? 'border-white/10 text-text-dim hover:text-foreground' : 'border-[#5A4020]/40 hover:bg-[#5A4020]/20'}`}
                style={!isEmpty && !isLow ? { color: '#3D2800' } : undefined}
              >
                <CreditCard className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
