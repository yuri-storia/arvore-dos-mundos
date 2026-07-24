import React, { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Crown, Sparkles, Check, ArrowLeft } from 'lucide-react';
import { openCheckout } from '@/hooks/useSubscription';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Página do plano exclusivo "Membro Fundador" — só acessível via convite.
 * O convite chega por link contendo `?convite=<token>` que confere com
 * `VITE_FUNDADOR_INVITE_TOKEN`. Sem token válido, mostramos apenas um aviso.
 *
 * Regra do plano:
 *   • Mensal: R$ 19,90/mês nos 3 primeiros meses, depois R$ 39,90/mês
 *   • Anual : R$ 397,90/ano (mesmo do Idriel padrão)
 */
const FundadorInvitePage: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  const inviteToken = params.get('convite') || '';
  const expected = (import.meta.env.VITE_FUNDADOR_INVITE_TOKEN as string | undefined) || 'arvore-fundador-2026';
  const validInvite = useMemo(() => inviteToken && inviteToken === expected, [inviteToken, expected]);

  const handleCheckout = async (planId: string) => {
    if (!user) { navigate('/login?next=/fundador?convite=' + encodeURIComponent(inviteToken)); return; }
    setLoading(planId);
    try { await openCheckout(planId); } finally { setLoading(null); }
  };

  if (!validInvite) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#02070d' }}>
        <div className="max-w-md text-center">
          <Crown className="w-10 h-10 mx-auto mb-3 text-gold-light" strokeWidth={1.75} />
          <h1 className="font-cinzel font-bold text-2xl text-gold-light mb-2">Convite necessário</h1>
          <p className="font-merriweather italic text-sm text-text-secondary mb-6">
            O plano <strong>Membro Fundador</strong> só pode ser acessado por convite direto do fundador da Árvore dos Mundos.
          </p>
          <button onClick={() => navigate('/planos')} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-montserrat font-bold uppercase tracking-wider border border-gold/40 text-gold-light hover:bg-gold/10">
            <ArrowLeft className="w-3.5 h-3.5" /> Ver planos públicos
          </button>
        </div>
      </div>
    );
  }

  const benefits = [
    'Todos os benefícios do plano Idriel',
    'Até 10 Mundos, 50 entradas no Codex, 10 Manuscritos',
    'Idriel completa: ideias, análises, imagens, mapas',
    '100 gotas de Elixir por mês',
    'Recargas avulsas a partir de R$ 4,90',
  ];

  return (
    <div className="min-h-screen py-12 px-4" style={{ background: 'radial-gradient(ellipse at top, rgba(200,146,42,0.12) 0%, #02070d 60%)' }}>
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate('/')} className="inline-flex items-center gap-1.5 text-text-dim hover:text-foreground text-xs font-montserrat uppercase tracking-wider mb-6">
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar
        </button>

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-gold/50 bg-gold/10 mb-4">
            <Sparkles className="w-3 h-3 text-gold-champagne" />
            <span className="font-montserrat uppercase tracking-[0.22em] text-[10px] text-gold-champagne">Convite exclusivo</span>
          </div>
          <h1 className="font-cinzel font-bold text-3xl sm:text-4xl text-gold-light mb-3">Membro Fundador</h1>
          <p className="font-amiri italic text-text-secondary max-w-lg mx-auto">
            Um lugar entre os primeiros a plantar raízes na Árvore dos Mundos. Idriel completa,
            com condição exclusiva de fundação.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl p-6 border border-gold/40" style={{ background: 'linear-gradient(180deg, rgba(20,14,4,0.85), rgba(2,7,13,0.9))' }}>
            <p className="font-montserrat uppercase tracking-wider text-[10px] text-gold-champagne mb-1">Mensal fundador</p>
            <p className="font-cinzel font-bold text-3xl text-foreground mb-1">R$ 19,90<span className="text-sm text-text-dim">/mês</span></p>
            <p className="text-[11px] text-text-dim mb-4">nos 3 primeiros meses · depois R$ 39,90/mês</p>
            <button
              onClick={() => handleCheckout('fundador_mensal')}
              disabled={!!loading}
              className="w-full py-2.5 rounded-full bg-gradient-to-r from-gold via-gold-warm to-gold-deep text-[#1a0f00] font-montserrat font-bold text-[11px] uppercase tracking-wider hover:opacity-90 disabled:opacity-60"
            >
              {loading === 'fundador_mensal' ? 'Abrindo…' : 'Assinar mensal fundador'}
            </button>
          </div>
          <div className="rounded-2xl p-6 border border-gold/40" style={{ background: 'linear-gradient(180deg, rgba(20,14,4,0.85), rgba(2,7,13,0.9))' }}>
            <p className="font-montserrat uppercase tracking-wider text-[10px] text-gold-champagne mb-1">Anual fundador</p>
            <p className="font-cinzel font-bold text-3xl text-foreground mb-1">R$ 397,90<span className="text-sm text-text-dim">/ano</span></p>
            <p className="text-[11px] text-text-dim mb-4">equivale a R$ 33,15/mês</p>
            <button
              onClick={() => handleCheckout('fundador_anual')}
              disabled={!!loading}
              className="w-full py-2.5 rounded-full bg-gradient-to-r from-gold via-gold-warm to-gold-deep text-[#1a0f00] font-montserrat font-bold text-[11px] uppercase tracking-wider hover:opacity-90 disabled:opacity-60"
            >
              {loading === 'fundador_anual' ? 'Abrindo…' : 'Assinar anual fundador'}
            </button>
          </div>
        </div>

        <ul className="mt-8 space-y-2 max-w-md mx-auto">
          {benefits.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm text-text-secondary font-merriweather">
              <Check className="w-4 h-4 mt-0.5 text-gold-light shrink-0" strokeWidth={2.5} />
              {b}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default FundadorInvitePage;
