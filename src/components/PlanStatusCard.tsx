import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Crown, Leaf, Sparkles, CreditCard, Check, ArrowRight } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/contexts/AuthContext';
import { UpgradeIdrielDialog } from '@/components/UpgradeIdrielDialog';

/**
 * Cartão compacto de plano ativo — reutilizado em Configurações e no menu da Idriel.
 * Mostra: nome do plano, principais benefícios, CTA de upgrade (se aplicável)
 * e botão para gerenciar assinatura.
 */
interface PlanStatusCardProps {
  variant?: 'settings' | 'help';
  onUpgradeRequest?: () => void;
}

const CRIADOR_FEATURES = [
  'Até 3 Mundos',
  'Até 20 entradas no Codex',
  'Até 3 Manuscritos',
  '11 Frutos de Worldbuilding',
  'Galeria de Referências',
  'Exportação PDF de Manuscritos, Fichas e Artigos',
  'Corretor textual AI Powered',
  '5 gotas de Elixir no 1º mês',
  'Recargas avulsas a partir de R$ 4,90',
];

const IDRIEL_FEATURES = [
  'Até 10 Mundos',
  'Até 50 entradas no Codex',
  'Até 10 Manuscritos',
  '11 Frutos de Worldbuilding',
  'Suporte de Idriel para criação de ideias',
  'Análise completa de Worldbuilding',
  'Geração de Imagens com Idriel',
  'Exportação PDF e E-pub/Kindle',
  'Identificação automática de fichas/artigos',
  'Corretor textual AI Powered',
  '100 gotas de Elixir por mês',
  'Recargas avulsas a partir de R$ 4,90',
];

const FUNDADOR_FEATURES = [
  'Todos os benefícios do plano Idriel',
  'R$ 19,90/mês nos 3 primeiros meses',
  'Depois R$ 39,90/mês',
  '100 gotas de Elixir por mês',
];

export const PlanStatusCard: React.FC<PlanStatusCardProps> = ({ variant = 'settings', onUpgradeRequest }) => {
  const sub = useSubscription();
  const { isAdmin } = useAuth();
  const [showUpgrade, setShowUpgrade] = useState(false);

  if (sub.loading) return null;

  const isFundador = sub.plan_code === 'fundador_mensal';
  const isIdriel = sub.hasIdriel && !isFundador;
  const isCriador = sub.hasTemplate && !sub.hasIdriel;
  const isNone = !sub.subscribed && !isAdmin;

  const planName = isAdmin
    ? 'Admin'
    : isFundador
      ? 'Membro Fundador'
      : isIdriel
        ? 'Idriel'
        : isCriador
          ? 'Criador'
          : 'Sem plano';

  const planIcon = isAdmin || isIdriel || isFundador ? Crown : Leaf;
  const Icon = planIcon;

  const features = isFundador
    ? FUNDADOR_FEATURES
    : isIdriel || isAdmin
      ? IDRIEL_FEATURES
      : isCriador
        ? CRIADOR_FEATURES
        : [];

  const accent = isIdriel || isFundador || isAdmin ? 'gold' : isCriador ? 'blue' : 'muted';
  const accentBorder = accent === 'gold' ? 'border-gold/35' : accent === 'blue' ? 'border-blue-bright/25' : 'border-white/10';
  const accentText = accent === 'gold' ? 'text-gold-light' : accent === 'blue' ? 'text-blue-light' : 'text-text-dim';
  const accentBg = accent === 'gold'
    ? 'linear-gradient(135deg, rgba(200,146,42,0.12) 0%, rgba(200,146,42,0.04) 100%)'
    : accent === 'blue'
      ? 'rgba(59, 130, 246, 0.06)'
      : 'rgba(255,255,255,0.02)';

  const handleUpgradeRequest = () => {
    if (onUpgradeRequest) {
      onUpgradeRequest();
      return;
    }
    setShowUpgrade(true);
  };

  return (
    <>
      <div className={`rounded-lg border ${accentBorder} p-4`} style={{ background: accentBg }}>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <Icon className={`w-4 h-4 shrink-0 ${accentText}`} strokeWidth={2} />
            <div className="min-w-0">
              <p className="font-montserrat font-bold text-[10px] uppercase tracking-wider text-text-dim">Plano ativo</p>
              <p className={`font-cinzel font-bold text-base leading-tight ${accentText}`}>{planName}</p>
            </div>
          </div>
          {sub.subscribed && !isAdmin && (
            <Link
              to="/minha-conta"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-montserrat font-bold uppercase tracking-wider border border-gold/30 bg-gold/5 text-gold-light hover:bg-gold/10 hover:border-gold/50 transition-colors shrink-0"
              title="Gerenciar minha conta"
            >
              <CreditCard className="w-3 h-3" />
              <span className="hidden sm:inline">Gerenciar conta</span>
            </Link>
          )}
        </div>

        {features.length > 0 && (
          <ul className="space-y-1.5 mb-3">
            {features.slice(0, variant === 'help' ? 4 : features.length).map((f) => (
              <li key={f} className="flex items-start gap-2 text-[11.5px] text-text-secondary font-merriweather leading-snug">
                <Check className={`w-3 h-3 mt-0.5 shrink-0 ${accentText}`} strokeWidth={2.5} />
                <span>{f}</span>
              </li>
            ))}
            {variant === 'help' && features.length > 4 && (
              <li className="text-[10px] font-montserrat italic text-text-dim pl-5">
                +{features.length - 4} outros benefícios
              </li>
            )}
          </ul>
        )}

        {/* CTAs de upgrade */}
        {!isAdmin && (isNone || isCriador) && (
          <div className="flex flex-col sm:flex-row gap-2 mt-2">
            {isCriador && (
              <button
                onClick={handleUpgradeRequest}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-[10px] font-montserrat font-bold uppercase tracking-wider bg-gradient-to-r from-gold via-gold-warm to-gold-deep text-[#1a0f00] hover:opacity-90 transition-opacity"
              >
                <Sparkles className="w-3 h-3" />
                Fazer upgrade para Idriel
              </button>
            )}
            <Link
              to="/planos"
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-[10px] font-montserrat font-bold uppercase tracking-wider border border-gold/40 text-gold-light hover:bg-gold/10 transition-colors"
            >
              Ver todos os planos <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        )}
      </div>
      {!onUpgradeRequest && <UpgradeIdrielDialog open={showUpgrade} onClose={() => setShowUpgrade(false)} />}
    </>
  );
};
