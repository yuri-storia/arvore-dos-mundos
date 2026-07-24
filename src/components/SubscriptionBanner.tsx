import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSubscription, openCheckout, STRIPE_PLANS, openCustomerPortal } from '@/hooks/useSubscription';
import { useAuth } from '@/contexts/AuthContext';
import { Lock, Sparkles, CreditCard, X, Leaf, Droplet, Droplets, ArrowRight, Clock } from 'lucide-react';
import { RechargePackageDialog } from '@/components/RechargePackageDialog';

const DISMISS_KEY = 'adm_sub_banner_dismissed';

export const SubscriptionBanner: React.FC = () => {
  const sub = useSubscription();
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
  });

  if (sub.loading) return null;
  if (isAdmin) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch {}
  };

  // Expiration warning for manual / paid plans expiring soon or already expired.
  const endIso = sub.subscriptionEnd;
  const daysToEnd = endIso ? Math.ceil((new Date(endIso).getTime() - Date.now()) / 86_400_000) : null;
  const isExpiringSoon = daysToEnd !== null && daysToEnd <= 7 && daysToEnd >= 0;
  const justExpired = daysToEnd !== null && daysToEnd < 0 && daysToEnd >= -14;

  if (!dismissed && sub.subscribed && (isExpiringSoon || justExpired)) {
    const expired = justExpired;
    return (
      <div className="mx-auto max-w-[1060px] px-4 mb-4">
        <div className={`rounded-lg p-4 border ${expired ? 'border-red-alert/50 bg-red-alert/[0.07]' : 'border-gold/40 bg-gold/[0.06]'}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <Clock className={`w-5 h-5 mt-0.5 ${expired ? 'text-red-alert' : 'text-gold-light'}`} strokeWidth={1.75} />
              <div className="min-w-0">
                <span className={`font-cinzel font-bold text-sm block ${expired ? 'text-red-alert' : 'text-gold-light'}`}>
                  {expired ? 'Seu acesso expirou' : `Seu acesso termina em ${daysToEnd} ${daysToEnd === 1 ? 'dia' : 'dias'}`}
                </span>
                <span className="block text-[11px] text-text-secondary mt-1 font-merriweather">
                  {expired
                    ? 'Para continuar usando a Árvore dos Mundos, renove escolhendo um plano. A cobrança só acontece quando você confirma o pagamento.'
                    : 'Quando o período acabar, você pode renovar escolhendo um plano. A cobrança só acontece quando você confirmar — nada é debitado automaticamente.'}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/planos" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-montserrat font-bold uppercase tracking-wider bg-gradient-to-r from-gold via-gold-warm to-gold-deep text-background hover:opacity-90 transition-opacity">
                <Sparkles className="w-3 h-3" /> Ver planos
              </Link>
              <button onClick={handleDismiss} className="inline-flex items-center gap-1 px-2 py-1.5 rounded-full text-[10px] font-montserrat font-bold uppercase tracking-wider border border-white/10 text-text-dim hover:text-foreground transition-colors">
                Lembrar depois
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleCheckout = async (plan: keyof typeof STRIPE_PLANS) => {
    setLoading(plan);
    try {
      await openCheckout(STRIPE_PLANS[plan].price_id);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
    }
  };

  // Not subscribed — no free tier
  if (!sub.subscribed) {
    if (dismissed) return null;
    return (
      <div className="mx-auto max-w-[1060px] px-4 mb-4">
        <div className="card-glass rounded-lg p-4 border border-gold/30 relative">
          <button onClick={handleDismiss} aria-label="Fechar aviso" className="absolute top-2 right-2 p-1 text-text-dim/50 hover:text-foreground transition-colors z-10" title="Fechar">
            <X className="w-3.5 h-3.5" />
          </button>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Leaf className="w-5 h-5 text-emerald-400" strokeWidth={1.75} />
              <div>
                <span className="font-montserrat font-bold text-sm text-foreground">Sem plano ativo</span>
                <span className="block text-xs text-text-dim">Escolha Criador ou Idriel para liberar a Árvore dos Mundos</span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Criador Annual */}
              <button
                onClick={() => handleCheckout('template_anual')}
                disabled={!!loading}
                className="flex flex-col items-start gap-1.5 p-3 rounded-lg border border-blue-bright/20 bg-blue-bright/[0.06] hover:bg-blue-bright/[0.12] transition-all text-left"
              >
                <span className="font-montserrat font-bold text-xs text-blue-light"><><Leaf className="inline-block w-3.5 h-3.5 mr-1 align-[-0.15em] text-blue-light" strokeWidth={1.75} />Criador — Worldbuilding Completo</></span>
                <span className="text-[10px] text-text-dim">Até 3 mundos, 20 entradas no Codex, 3 manuscritos, exportação em PDF</span>
                <span className="font-montserrat font-bold text-sm text-blue-light">R$ 197,90/ano</span>
              </button>
              {/* Idriel Monthly */}
              <button
                onClick={() => handleCheckout('idriel_mensal')}
                disabled={!!loading}
                className="flex flex-col items-start gap-1.5 p-3 rounded-lg border border-gold/30 hover:border-gold/50 transition-all text-left"
                style={{ background: 'linear-gradient(135deg, rgba(200,146,42,0.10) 0%, rgba(200,146,42,0.04) 100%)' }}
              >
                <span className="font-montserrat font-bold text-xs text-gold-light"><><Sparkles className="inline-block w-3.5 h-3.5 mr-1 align-[-0.15em] text-gold-champagne" strokeWidth={1.75} />Idriel — Tudo + IA Suprema</></span>
                <span className="text-[10px] text-text-dim">Tudo do Raiz + IA + imagens em qualidade máxima (Gemini 3 Pro Image)</span>
                <span className="font-montserrat font-bold text-sm text-gold-light">R$ 39,90/mês</span>
              </button>
            </div>
            <Link to="/planos" className="block text-center mt-3 text-[10px] font-montserrat font-bold text-text-dim hover:text-foreground transition-colors uppercase tracking-wider">
              <>Comparar todos os planos <ArrowRight className="inline-block w-3 h-3 ml-1 align-[-0.1em]" strokeWidth={2} /></>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Plano Criador ativo — indicação de plano/upgrade agora vive em Configurações e no menu da Idriel.
  // Removido daqui para eliminar redundância no topo do app.
  if (sub.plan === 'template' && !sub.hasIdriel) {
    return null;
  }

  // Idriel user: show credits (Elixir dos Mundos)
  if (sub.hasIdriel) {
    const remainingMonth = Math.max(0, sub.creditLimit - sub.creditsUsed);
    const creditsLeft = remainingMonth + sub.bonusDrops;
    const totalCapacity = sub.creditLimit + sub.bonusDrops;
    const pct = totalCapacity > 0 ? (creditsLeft / totalCapacity) * 100 : 0;
    const isLow = creditsLeft > 0 && creditsLeft <= 10;
    const isEmpty = creditsLeft <= 0;

    const normalBg = 'linear-gradient(135deg, #DFBD69 0%, #926F34 100%)';
    const lowBg = 'linear-gradient(135deg, rgba(220,120,20,0.18) 0%, rgba(220,80,20,0.10) 100%)';
    const emptyBg = 'linear-gradient(135deg, rgba(220,38,38,0.18) 0%, rgba(220,38,38,0.10) 100%)';

    const statusLabel = isEmpty
      ? 'O Elixir secou…'
      : isLow
        ? 'Poucas gotas restam…'
        : 'Elixir dos Mundos de Idriel';

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
              <span className="shrink-0">{isEmpty ? <Droplets className="w-5 h-5 text-red-alert opacity-70" strokeWidth={1.75} /> : isLow ? <Leaf className="w-5 h-5 text-orange-400 opacity-80" strokeWidth={1.75} /> : <Droplet className="w-5 h-5" style={{ color: '#1E1000' }} strokeWidth={1.75} />}</span>
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
              <button
                onClick={() => setRechargeOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-montserrat font-bold uppercase tracking-wider border border-gold/40 bg-gold/10 text-gold-light hover:bg-gold/20 transition-all"
              >
                <Sparkles className="w-3 h-3" /> Recarga
              </button>
              <button
                onClick={async () => { try { await openCustomerPortal(); } catch {} }}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-montserrat font-bold uppercase tracking-wider border border-white/10 text-text-dim hover:text-foreground transition-colors"
              >
                <CreditCard className="w-3 h-3" />
                <span className="hidden sm:inline">Gerenciar</span>
              </button>
            </div>
          </div>
        </div>
        <RechargePackageDialog open={rechargeOpen} onClose={() => setRechargeOpen(false)} />
      </div>
    );
  }

  return null;
};
