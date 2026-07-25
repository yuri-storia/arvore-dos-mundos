import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Crown, Leaf, Sparkles, Droplet, CreditCard, ShieldOff, Clock,
  ArrowUpRight, RefreshCw, ScrollText, TrendingUp, TrendingDown,
} from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/contexts/AuthContext';
import { useElixirBalance, type ElixirLedgerEntry } from '@/hooks/useElixirBalance';
import { RechargePackageDialog } from '@/components/RechargePackageDialog';
import { UpgradeIdrielDialog } from '@/components/UpgradeIdrielDialog';

/**
 * /minha-conta — Painel único para gerenciar assinatura, limites, saldo
 * de Elixir e histórico de recargas e consumos. Substitui o antigo
 * atalho direto para "/cancelar-plano".
 */
const ManageAccountPage: React.FC = () => {
  const navigate = useNavigate();
  const sub = useSubscription();
  const { user, isAdmin } = useAuth();
  const { bonusDrops, ledger, loading: ledgerLoading, refetch } = useElixirBalance();
  const [rechargeOpen, setRechargeOpen] = React.useState(false);
  const [upgradeOpen, setUpgradeOpen] = React.useState(false);

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
  const totalDrops = remainingMonth + bonusDrops;
  const monthPct = sub.creditLimit > 0 ? Math.min(100, (sub.creditsUsed / sub.creditLimit) * 100) : 0;

  const endLabel = useMemo(() => {
    if (!sub.subscriptionEnd) return null;
    try {
      return new Date(sub.subscriptionEnd).toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'long', year: 'numeric',
      });
    } catch { return null; }
  }, [sub.subscriptionEnd]);

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/app')}
          className="inline-flex items-center gap-1.5 text-text-dim hover:text-foreground text-xs font-montserrat uppercase tracking-wider mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao app
        </button>

        <header className="mb-8">
          <h1 className="font-cinzel font-bold text-3xl text-foreground mb-1">Minha conta</h1>
          <p className="font-merriweather italic text-text-dim text-sm">
            Gerencie seu plano, veja seus limites e acompanhe seu Elixir dos Mundos.
          </p>
        </header>

        {/* Cabeçalho de plano */}
        <section
          className={`rounded-2xl border p-5 sm:p-6 mb-5 ${
            isIdriel || isFundador || isAdmin
              ? 'border-gold/40'
              : isCriador ? 'border-blue-bright/25' : 'border-white/10'
          }`}
          style={{
            background: (isIdriel || isFundador || isAdmin)
              ? 'linear-gradient(135deg, rgba(200,146,42,0.14) 0%, rgba(200,146,42,0.04) 100%)'
              : isCriador
                ? 'rgba(59,130,246,0.06)'
                : 'rgba(255,255,255,0.02)',
          }}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center border ${
                isIdriel || isFundador || isAdmin ? 'border-gold/40 bg-gold/10' : 'border-blue-bright/30 bg-blue-main/10'
              }`}>
                {isIdriel || isFundador || isAdmin
                  ? <Crown className="w-6 h-6 text-gold-light" />
                  : <Leaf className="w-6 h-6 text-blue-light" />}
              </div>
              <div className="min-w-0">
                <p className="font-montserrat font-bold text-[10px] uppercase tracking-wider text-text-dim">Plano ativo</p>
                <p className={`font-cinzel font-bold text-2xl leading-tight ${
                  isIdriel || isFundador || isAdmin ? 'text-gold-light' : isCriador ? 'text-blue-light' : 'text-text-dim'
                }`}>{planName}</p>
                {endLabel && sub.subscribed && (
                  <p className="text-[11px] text-text-dim mt-1 flex items-center gap-1.5 font-merriweather">
                    <Clock className="w-3 h-3" /> Renovação/expiração: <span className="text-foreground">{endLabel}</span>
                  </p>
                )}
                {isNone && (
                  <p className="text-[11px] text-text-dim mt-1 font-merriweather">
                    Sem plano ativo — modo somente leitura. Reative um plano para voltar a criar e editar.
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {(isNone || isCriador) && (
                <button
                  onClick={() => isCriador ? setUpgradeOpen(true) : navigate('/planos')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-montserrat font-bold uppercase tracking-wider bg-gradient-to-r from-gold via-gold-warm to-gold-deep text-[#1a0f00] hover:opacity-90 transition-opacity"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {isCriador ? 'Upgrade para Idriel' : 'Escolher plano'}
                </button>
              )}
              {sub.hasIdriel && (
                <button
                  onClick={() => setRechargeOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-montserrat font-bold uppercase tracking-wider border border-gold/40 bg-gold/10 text-gold-light hover:bg-gold/20 transition-all"
                >
                  <Droplet className="w-3.5 h-3.5" /> Recarregar Elixir
                </button>
              )}
              <Link
                to="/planos"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-montserrat font-bold uppercase tracking-wider border border-white/10 text-text-dim hover:text-foreground hover:border-white/20 transition-colors"
              >
                <ArrowUpRight className="w-3.5 h-3.5" /> Trocar de plano
              </Link>
              {sub.subscribed && !isAdmin && (
                <Link
                  to="/cancelar-plano"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-montserrat font-bold uppercase tracking-wider border border-red-alert/40 text-red-alert hover:bg-red-alert/10 transition-all"
                >
                  <ShieldOff className="w-3.5 h-3.5" /> Cancelar
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* Uso e limites */}
        {sub.hasIdriel && (
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            <MetricCard
              label="Gotas do mês"
              value={`${remainingMonth}/${sub.creditLimit}`}
              hint={`Usado: ${sub.creditsUsed}`}
              tone="gold"
              progress={monthPct}
            />
            <MetricCard
              label="Recarga (bônus)"
              value={String(bonusDrops)}
              hint="Não expiram"
              tone="blue"
            />
            <MetricCard
              label="Total disponível"
              value={String(totalDrops)}
              hint="Elixir dos Mundos"
              tone="gold-strong"
            />
          </section>
        )}

        {/* Histórico do Elixir */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <ScrollText className="w-4 h-4 text-gold-light" />
              <h2 className="font-cinzel font-bold text-base text-foreground">Histórico do Elixir</h2>
            </div>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-1 text-[10px] font-montserrat uppercase tracking-wider text-text-dim hover:text-foreground transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Atualizar
            </button>
          </div>

          {ledgerLoading ? (
            <p className="text-xs text-text-dim font-merriweather italic">Carregando movimentos…</p>
          ) : ledger.length === 0 ? (
            <p className="text-xs text-text-dim font-merriweather italic">
              Nenhum movimento ainda. Recargas, consumos e bônus aparecem aqui.
            </p>
          ) : (
            <ul className="divide-y divide-white/5">
              {ledger.map((entry) => (
                <LedgerRow key={entry.id} entry={entry} />
              ))}
            </ul>
          )}
        </section>

        <p className="text-[11px] text-text-dim font-merriweather italic text-center mt-6">
          Dúvidas sobre cobrança? Escreva para <a className="text-gold-light hover:underline" href="mailto:arvoredosmundos.app@gmail.com">arvoredosmundos.app@gmail.com</a>.
        </p>
      </div>

      <RechargePackageDialog open={rechargeOpen} onClose={() => setRechargeOpen(false)} />
      <UpgradeIdrielDialog open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </div>
  );
};

const MetricCard: React.FC<{
  label: string;
  value: string;
  hint?: string;
  tone: 'gold' | 'gold-strong' | 'blue';
  progress?: number;
}> = ({ label, value, hint, tone, progress }) => {
  const color = tone === 'blue' ? 'text-blue-light' : 'text-gold-light';
  const border = tone === 'blue' ? 'border-blue-bright/25' : 'border-gold/30';
  const bg = tone === 'gold-strong'
    ? 'linear-gradient(135deg, rgba(200,146,42,0.14), rgba(200,146,42,0.04))'
    : tone === 'gold'
      ? 'rgba(200,146,42,0.06)'
      : 'rgba(59,130,246,0.05)';
  return (
    <div className={`rounded-xl border ${border} p-4`} style={{ background: bg }}>
      <p className="text-[10px] font-montserrat font-bold uppercase tracking-wider text-text-dim mb-1">{label}</p>
      <p className={`font-cinzel font-bold text-2xl ${color} leading-none`}>{value}</p>
      {hint && <p className="text-[11px] text-text-dim mt-1 font-merriweather">{hint}</p>}
      {typeof progress === 'number' && (
        <div className="mt-3 h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-gold via-gold-warm to-gold-deep" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
};

const KIND_LABEL: Record<string, { label: string; positive: boolean; icon: React.ReactNode }> = {
  recharge:            { label: 'Recarga',           positive: true,  icon: <Droplet className="w-3.5 h-3.5" /> },
  bonus:               { label: 'Bônus',             positive: true,  icon: <Sparkles className="w-3.5 h-3.5" /> },
  adjustment:          { label: 'Ajuste',            positive: true,  icon: <TrendingUp className="w-3.5 h-3.5" /> },
  consume_text:        { label: 'Consulta a Idriel', positive: false, icon: <TrendingDown className="w-3.5 h-3.5" /> },
  consume_image:       { label: 'Visão gerada',      positive: false, icon: <TrendingDown className="w-3.5 h-3.5" /> },
  consume_image_draft: { label: 'Rascunho de visão', positive: false, icon: <TrendingDown className="w-3.5 h-3.5" /> },
  consume_image_premium:{label: 'Visão premium',     positive: false, icon: <TrendingDown className="w-3.5 h-3.5" /> },
};

const LedgerRow: React.FC<{ entry: ElixirLedgerEntry }> = ({ entry }) => {
  const meta = KIND_LABEL[entry.kind] || { label: entry.kind, positive: entry.delta >= 0, icon: <TrendingUp className="w-3.5 h-3.5" /> };
  const positive = entry.delta >= 0;
  const when = new Date(entry.created_at).toLocaleString('pt-BR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
  return (
    <li className="py-2.5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
          positive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-alert/10 text-red-alert'
        }`}>
          {meta.icon}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-montserrat font-bold text-foreground truncate">{meta.label}</p>
          <p className="text-[10px] text-text-dim font-merriweather">
            {when}{entry.reason ? ` · ${entry.reason}` : ''}
          </p>
        </div>
      </div>
      <span className={`font-cinzel font-bold text-sm ${positive ? 'text-emerald-400' : 'text-red-alert'}`}>
        {positive ? '+' : ''}{entry.delta}
      </span>
    </li>
  );
};

export default ManageAccountPage;
