import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Crown, Leaf, Droplet, CreditCard, ReceiptText, ExternalLink, RefreshCw,
  CheckCircle2, AlertTriangle, Clock, Sparkles, ShieldOff, Loader2,
  ArrowUpRight, ArrowDownRight, CalendarClock, Undo2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useSubscription,
  useRefreshSubscription,
  reactivateSubscription,
  cancelScheduledChange,
} from '@/hooks/useSubscription';
import { PlanChangeDialog } from '@/components/PlanChangeDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useElixirBalance } from '@/hooks/useElixirBalance';
import { useBillingHistory, openBillingPortal, type BillingCharge } from '@/hooks/useBillingHistory';
import { RechargePackageDialog } from '@/components/RechargePackageDialog';
import { UpgradeIdrielDialog } from '@/components/UpgradeIdrielDialog';

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const STATUS_META: Record<string, { label: string; tone: 'ok' | 'warn' | 'bad' }> = {
  CONFIRMED: { label: 'Pago', tone: 'ok' },
  RECEIVED: { label: 'Pago', tone: 'ok' },
  PAID: { label: 'Pago', tone: 'ok' },
  CHECKOUT_CREATED: { label: 'Aguardando pagamento', tone: 'warn' },
  PENDING: { label: 'Pendente', tone: 'warn' },
  OVERDUE: { label: 'Vencido', tone: 'bad' },
  FAILED: { label: 'Falhou', tone: 'bad' },
  REFUNDED: { label: 'Reembolsado', tone: 'warn' },
  CANCELLED: { label: 'Cancelado', tone: 'bad' },
};

const PLAN_LABEL: Record<string, string> = {
  raiz_mensal: 'Criador · mensal',
  raiz_anual: 'Criador · anual',
  idriel_mensal: 'Idriel · mensal',
  idriel_anual: 'Idriel · anual',
  fundador_mensal: 'Membro Fundador',
};

/**
 * Painel de conta e cobrança em Configurações:
 * plano atual, status da assinatura, gotas disponíveis e histórico de cobranças.
 */
export const AccountBillingPanel: React.FC = () => {
  const sub = useSubscription();
  const { isAdmin } = useAuth();
  const { bonusDrops, loading: balLoading, refetch: refetchBalance } = useElixirBalance();
  const { charges, loading: chargesLoading, refetch: refetchCharges } = useBillingHistory();
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [changeTarget, setChangeTarget] = useState<string | null>(null);
  const [changeOpen, setChangeOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const refreshSub = useRefreshSubscription();

  const openChange = (code: string) => { setChangeTarget(code); setChangeOpen(true); };

  const isYearly = sub.billingCycle === 'yearly';
  const canManage = sub.subscribed && sub.canChangePlan && !isAdmin;

  const handleReactivate = async () => {
    setBusy('reactivate');
    const res = await reactivateSubscription();
    setBusy(null);
    if (res?.error) toast.error('Não foi possível reativar', { description: res.error });
    else { refreshSub(); toast.success('Renovação automática reativada.'); }
  };

  const handleUndoScheduled = async () => {
    setBusy('undo');
    const res = await cancelScheduledChange();
    setBusy(null);
    if (res?.error) toast.error('Não foi possível desfazer', { description: res.error });
    else { refreshSub(); toast.success('Mudança agendada desfeita.'); }
  };

  const isFundador = sub.plan_code === 'fundador_mensal';
  const isIdriel = sub.hasIdriel && !isFundador;
  const isCriador = sub.hasTemplate && !sub.hasIdriel;
  const isNone = !sub.subscribed && !isAdmin;

  const planName = isAdmin ? 'Admin'
    : isFundador ? 'Membro Fundador'
    : isIdriel ? 'Idriel'
    : isCriador ? 'Criador'
    : 'Sem plano ativo';

  const remainingMonth = Math.max(0, sub.creditLimit - sub.creditsUsed);
  const monthDrops = sub.hasIdriel || isAdmin ? remainingMonth : 0;
  const totalDrops = monthDrops + bonusDrops;
  const monthPct = sub.creditLimit > 0 ? Math.min(100, (sub.creditsUsed / sub.creditLimit) * 100) : 0;

  const endLabel = useMemo(() => {
    if (!sub.subscriptionEnd) return null;
    try {
      return new Date(sub.subscriptionEnd).toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'long', year: 'numeric',
      });
    } catch { return null; }
  }, [sub.subscriptionEnd]);

  const expired = !sub.subscribed && !!sub.plan_code && !isAdmin;
  const statusTone: 'ok' | 'warn' | 'bad' = isAdmin || sub.subscribed ? 'ok' : expired ? 'bad' : 'warn';
  const statusLabel = isAdmin ? 'Acesso administrativo'
    : sub.subscribed ? 'Assinatura ativa'
    : expired ? 'Assinatura inativa · modo somente leitura'
    : 'Nenhuma assinatura';

  const handlePortal = async () => {
    setPortalLoading(true);
    const url = await openBillingPortal();
    setPortalLoading(false);
    if (!url) {
      toast.error('Não foi possível abrir o portal de cobrança', {
        description: 'Se você acabou de assinar, tente novamente em alguns minutos ou escreva para arvoredosmundos.app@gmail.com.',
      });
      return;
    }
    window.location.href = url;
  };

  const accentGold = isIdriel || isFundador || isAdmin;

  if (sub.loading) {
    return <p className="text-xs text-text-dim font-merriweather italic">Carregando dados da conta…</p>;
  }

  return (
    <div className="space-y-4">
      {/* Plano + status */}
      <div
        className={`rounded-lg border p-4 ${accentGold ? 'border-gold/35' : isCriador ? 'border-blue-bright/25' : 'border-white/10'}`}
        style={{
          background: accentGold
            ? 'linear-gradient(135deg, rgba(200,146,42,0.12) 0%, rgba(200,146,42,0.04) 100%)'
            : isCriador ? 'rgba(59,130,246,0.06)' : 'rgba(255,255,255,0.02)',
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {accentGold
              ? <Crown className="w-5 h-5 text-gold-light shrink-0" strokeWidth={2} />
              : <Leaf className="w-5 h-5 text-blue-light shrink-0" strokeWidth={2} />}
            <div className="min-w-0">
              <p className="font-montserrat font-bold text-[10px] uppercase tracking-wider text-text-dim">Plano atual</p>
              <p className={`font-cinzel font-bold text-lg leading-tight ${accentGold ? 'text-gold-light' : isCriador ? 'text-blue-light' : 'text-text-dim'}`}>
                {planName}
              </p>
              <p className={`text-[11px] mt-1 inline-flex items-center gap-1.5 font-merriweather ${
                statusTone === 'ok' ? 'text-emerald-400' : statusTone === 'warn' ? 'text-gold-light' : 'text-red-alert'
              }`}>
                {statusTone === 'ok'
                  ? <CheckCircle2 className="w-3.5 h-3.5" />
                  : <AlertTriangle className="w-3.5 h-3.5" />}
                {statusLabel}
              </p>
              {endLabel && (
                <p className="text-[11px] text-text-dim mt-1 flex items-center gap-1.5 font-merriweather">
                  <Clock className="w-3 h-3" />
                  {sub.subscribed ? 'Próxima renovação:' : 'Expirou em:'}{' '}
                  <span className="text-foreground">{endLabel}</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {isCriador && (
              <button
                onClick={() => (canManage ? openChange(isYearly ? 'idriel_anual' : 'idriel_mensal') : setUpgradeOpen(true))}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-montserrat font-bold uppercase tracking-wider bg-gradient-to-r from-gold via-gold-warm to-gold-deep text-[#1a0f00] hover:opacity-90 transition-opacity"
              >
                <Sparkles className="w-3 h-3" /> Upgrade para Idriel
              </button>
            )}
            {isNone && (
              <Link
                to="/planos"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-montserrat font-bold uppercase tracking-wider bg-gradient-to-r from-gold via-gold-warm to-gold-deep text-[#1a0f00] hover:opacity-90 transition-opacity"
              >
                <Sparkles className="w-3 h-3" /> Escolher plano
              </Link>
            )}

            {sub.hasIdriel && (
              <button
                onClick={() => setRechargeOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-montserrat font-bold uppercase tracking-wider border border-gold/40 bg-gold/10 text-gold-light hover:bg-gold/20 transition-all"
              >
                <Droplet className="w-3 h-3" /> Recarregar Elixir
              </button>
            )}
            {canManage && !isYearly && (
              <button
                onClick={() => openChange(sub.hasIdriel ? 'idriel_anual' : 'raiz_anual')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-montserrat font-bold uppercase tracking-wider border border-gold/40 bg-gold/10 text-gold-light hover:bg-gold/20 transition-all"
                title="Economize 2 meses pagando anualmente"
              >
                <ArrowUpRight className="w-3 h-3" /> Mudar para anual
              </button>
            )}
            {canManage && sub.hasIdriel && !isFundador && (
              <button
                onClick={() => openChange(isYearly ? 'raiz_anual' : 'raiz_mensal')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-montserrat font-bold uppercase tracking-wider border border-white/12 text-text-dim hover:text-foreground hover:border-white/25 transition-colors"
                title="Downgrade — passa a valer no fim do ciclo já pago"
              >
                <ArrowDownRight className="w-3 h-3" /> Mudar para Criador
              </button>
            )}
            <button
              onClick={handlePortal}
              disabled={portalLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-montserrat font-bold uppercase tracking-wider border border-blue-bright/30 text-blue-light hover:bg-blue-main/20 transition-colors disabled:opacity-50"
              title="Atualizar cartão, dados de cobrança e ver faturas"
            >
              {portalLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CreditCard className="w-3 h-3" />}
              Forma de pagamento
            </button>
            <Link
              to="/planos"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-montserrat font-bold uppercase tracking-wider border border-white/10 text-text-dim hover:text-foreground hover:border-white/20 transition-colors"
            >
              <ExternalLink className="w-3 h-3" /> Ver planos
            </Link>
            {sub.subscribed && !isAdmin && (
              <Link
                to="/cancelar-plano"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-montserrat font-bold uppercase tracking-wider border border-red-alert/40 text-red-alert hover:bg-red-alert/10 transition-all"
              >
                <ShieldOff className="w-3 h-3" /> Cancelar
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Avisos de ciclo: cancelamento pendente / mudança agendada */}
      {canManage && sub.cancelAtPeriodEnd && (
        <div className="rounded-lg border border-red-alert/35 bg-red-alert/[0.07] p-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[12px] font-merriweather text-foreground/85 flex items-start gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 text-red-alert shrink-0 mt-0.5" />
            <span>
              Sua assinatura está <strong>cancelada</strong> e não será renovada.
              {endLabel ? <> O acesso completo continua até <strong>{endLabel}</strong>.</> : null}{' '}
              Depois disso, seus mundos continuam salvos em modo somente leitura, com exportação em PDF e Word liberadas.
            </span>
          </p>
          <button
            onClick={handleReactivate}
            disabled={busy === 'reactivate'}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-montserrat font-bold uppercase tracking-wider bg-gradient-to-r from-gold via-gold-warm to-gold-deep text-[#1a0f00] hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {busy === 'reactivate' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Undo2 className="w-3 h-3" />}
            Reativar assinatura
          </button>
        </div>
      )}

      {canManage && sub.scheduledPlanCode && (
        <div className="rounded-lg border border-gold/30 bg-gold/[0.07] p-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[12px] font-merriweather text-foreground/85 flex items-start gap-2 min-w-0">
            <CalendarClock className="w-4 h-4 text-gold-light shrink-0 mt-0.5" />
            <span>
              Mudança agendada para <strong>{PLAN_LABEL[sub.scheduledPlanCode] ?? sub.scheduledPlanCode}</strong>
              {sub.scheduledAt ? <> em <strong>{new Date(sub.scheduledAt).toLocaleDateString('pt-BR')}</strong></> : null}.
              Até lá, nada muda no seu plano atual.
            </span>
          </p>
          <button
            onClick={handleUndoScheduled}
            disabled={busy === 'undo'}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-montserrat font-bold uppercase tracking-wider border border-white/15 text-text-dim hover:text-foreground transition-colors disabled:opacity-50"
          >
            {busy === 'undo' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Undo2 className="w-3 h-3" />}
            Desfazer
          </button>
        </div>
      )}

      {/* Gotas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <DropCard
          label="Gotas do mês"
          value={sub.hasIdriel || isAdmin ? `${monthDrops}/${sub.creditLimit}` : '—'}
          hint={sub.hasIdriel || isAdmin ? `Usadas: ${sub.creditsUsed}` : 'Exclusivo do plano Idriel'}
          tone="gold"
          progress={sub.hasIdriel || isAdmin ? monthPct : undefined}
        />
        <DropCard
          label="Gotas de recarga"
          value={balLoading ? '…' : String(bonusDrops)}
          hint="Não expiram"
          tone="blue"
        />
        <DropCard
          label="Total disponível"
          value={balLoading ? '…' : String(totalDrops)}
          hint="Elixir dos Mundos"
          tone="gold-strong"
        />
      </div>

      {/* Histórico de cobranças */}
      <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <ReceiptText className="w-4 h-4 text-gold-light" />
            <h3 className="font-cinzel font-bold text-sm text-foreground">Histórico de cobranças</h3>
          </div>
          <button
            onClick={() => { refetchCharges(); refetchBalance(); }}
            className="inline-flex items-center gap-1 text-[10px] font-montserrat uppercase tracking-wider text-text-dim hover:text-foreground transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Atualizar
          </button>
        </div>

        {chargesLoading ? (
          <p className="text-xs text-text-dim font-merriweather italic">Carregando cobranças…</p>
        ) : charges.length === 0 ? (
          <p className="text-xs text-text-dim font-merriweather italic">
            Nenhuma cobrança registrada até agora.
          </p>
        ) : (
          <ul className="divide-y divide-white/5">
            {charges.map((c) => <ChargeRow key={c.id} charge={c} />)}
          </ul>
        )}

        <p className="text-[10px] text-text-dim font-merriweather italic mt-3">
          Recibos, faturas e troca de cartão ficam no portal seguro da Stripe (botão “Forma de pagamento”).
          Dúvidas: <a className="text-gold-light hover:underline" href="mailto:arvoredosmundos.app@gmail.com">arvoredosmundos.app@gmail.com</a>.
        </p>
      </div>

      <RechargePackageDialog open={rechargeOpen} onClose={() => setRechargeOpen(false)} />
      <UpgradeIdrielDialog open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </div>
  );
};

const DropCard: React.FC<{
  label: string; value: string; hint?: string;
  tone: 'gold' | 'gold-strong' | 'blue'; progress?: number;
}> = ({ label, value, hint, tone, progress }) => {
  const color = tone === 'blue' ? 'text-blue-light' : 'text-gold-light';
  const border = tone === 'blue' ? 'border-blue-bright/25' : 'border-gold/30';
  const bg = tone === 'gold-strong'
    ? 'linear-gradient(135deg, rgba(200,146,42,0.14), rgba(200,146,42,0.04))'
    : tone === 'gold' ? 'rgba(200,146,42,0.06)' : 'rgba(59,130,246,0.05)';
  return (
    <div className={`rounded-lg border ${border} p-3.5`} style={{ background: bg }}>
      <p className="text-[10px] font-montserrat font-bold uppercase tracking-wider text-text-dim mb-1">{label}</p>
      <p className={`font-cinzel font-bold text-xl ${color} leading-none`}>{value}</p>
      {hint && <p className="text-[10px] text-text-dim mt-1 font-merriweather">{hint}</p>}
      {typeof progress === 'number' && (
        <div className="mt-2.5 h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-gold via-gold-warm to-gold-deep" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
};

const ChargeRow: React.FC<{ charge: BillingCharge }> = ({ charge }) => {
  const meta = STATUS_META[charge.status?.toUpperCase()] || { label: charge.status, tone: 'warn' as const };
  const when = new Date(charge.paid_at || charge.created_at).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
  const title = charge.kind === 'recharge'
    ? `Recarga de Elixir${charge.drops ? ` · ${charge.drops} gotas` : ''}`
    : PLAN_LABEL[charge.plan_code] || charge.plan_code;

  return (
    <li className="py-2.5 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-montserrat font-bold text-foreground truncate">{title}</p>
        <p className="text-[10px] text-text-dim font-merriweather">
          {when} ·{' '}
          <span className={
            meta.tone === 'ok' ? 'text-emerald-400' : meta.tone === 'bad' ? 'text-red-alert' : 'text-gold-light'
          }>{meta.label}</span>
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="font-cinzel font-bold text-sm text-foreground">{brl(Number(charge.amount) || 0)}</span>
        {charge.invoice_url && meta.tone !== 'ok' && (
          <a
            href={charge.invoice_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-montserrat uppercase tracking-wider text-blue-light hover:underline inline-flex items-center gap-1"
          >
            Pagar <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </li>
  );
};

export default AccountBillingPanel;
