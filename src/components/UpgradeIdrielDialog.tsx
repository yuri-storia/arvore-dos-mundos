import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Crown, TrendingUp, CheckCircle2 } from 'lucide-react';
import { PLANS } from '@/hooks/useSubscription';
import { openCheckout } from '@/hooks/useSubscription';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';

interface UpgradeIdrielDialogProps {
  open: boolean;
  onClose: () => void;
}

type UpgradeOption = {
  code: string;
  badge: string;
  title: string;
  bullets: string[];
  highlight?: string;
  priceLine: string;
  subLine: string;
};

export const UpgradeIdrielDialog: React.FC<UpgradeIdrielDialogProps> = ({ open, onClose }) => {
  const sub = useSubscription();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);

  if (!open) return null;

  const planCode = sub.plan_code;

  // Se sem plano nenhum: redireciona para /planos
  if (!sub.hasTemplate && !sub.hasIdriel) {
    return createPortal(
      <Backdrop onClose={onClose}>
        <Panel onClose={onClose}>
          <Header
            title="Idriel ainda não está disponível"
            subtitle="Você precisa de uma assinatura ativa para acessar a Idriel."
          />
          <div className="text-center mt-6">
            <button
              onClick={() => { onClose(); navigate('/planos'); }}
              className="px-6 py-3 rounded-lg bg-gradient-to-r from-gold via-gold-warm to-gold-deep text-[#1a0f00] font-montserrat font-bold text-sm uppercase tracking-wider hover:from-gold-light transition-all"
            >
              Ver planos disponíveis
            </button>
          </div>
        </Panel>
      </Backdrop>,
      document.body,
    );
  }

  // Detecta variante Raiz (mensal/anual) — heurística por código se disponível
  const isAnnual = planCode === 'raiz_anual';
  const isMonthly = planCode === 'raiz_mensal' || (!isAnnual && !sub.hasIdriel);

  const options: UpgradeOption[] = [];

  if (isMonthly) {
    options.push({
      code: 'upgrade_raiz_m_to_idriel_m',
      badge: 'Mais simples',
      title: 'Idriel Mensal',
      bullets: [
        'Acesso completo à Idriel',
        'Apenas a diferença no 1º mês',
        'A partir do 2º mês: R$ 39,90/mês',
      ],
      highlight: 'R$ 20,00 só agora',
      priceLine: 'R$ 20,00',
      subLine: 'no 1º mês · depois R$ 39,90/mês',
    });
    options.push({
      code: 'upgrade_raiz_m_to_idriel_a',
      badge: 'Melhor custo-benefício',
      title: 'Idriel Anual',
      bullets: [
        '1 ano inteiro de Idriel',
        'Promoção de upgrade exclusiva',
        'Equivale a R$ 27,42/mês',
      ],
      highlight: 'R$ 329,00 à vista',
      priceLine: 'R$ 329,00',
      subLine: '1 ano de acesso · economize R$ 150',
    });
  } else if (isAnnual) {
    options.push({
      code: 'upgrade_raiz_a_to_idriel_a',
      badge: 'Apenas a diferença',
      title: 'Idriel Anual',
      bullets: [
        'Você paga só a diferença (R$ 397 − R$ 197)',
        '1 ano completo de Idriel',
        'Renovação automática só ao fim do ciclo',
      ],
      highlight: 'R$ 200,00 à vista',
      priceLine: 'R$ 200,00',
      subLine: 'diferença do seu Raiz Anual atual',
    });
  }

  const handleSelect = async (code: string) => {
    setLoading(code);
    try {
      await openCheckout(code);
    } finally {
      setLoading(null);
    }
  };

  return createPortal(
    <Backdrop onClose={onClose}>
      <Panel onClose={onClose}>
        <Header
          title="Subir para o plano Idriel"
          subtitle="Libere geração de imagens, análises, mapas e a hostess Idriel completa."
        />
        <div className={`mt-6 grid gap-4 ${options.length > 1 ? 'sm:grid-cols-2' : ''}`}>
          {options.map((opt) => (
            <button
              key={opt.code}
              onClick={() => handleSelect(opt.code)}
              disabled={!!loading}
              className={`relative text-left rounded-xl border border-gold/30 bg-gold/[0.05] p-5 hover:bg-gold/[0.12] hover:border-gold/60 transition-all hover:-translate-y-0.5 ${loading === opt.code ? 'opacity-60' : ''}`}
            >
              <span className="absolute -top-2 left-4 px-2 py-0.5 rounded-full text-[9px] font-montserrat font-bold uppercase tracking-wider bg-gradient-to-r from-gold via-gold-warm to-gold-deep text-[#1a0f00]">
                {opt.badge}
              </span>
              <div className="flex items-center gap-2 mb-2">
                {opt.code.endsWith('_a') ? <Crown className="w-5 h-5 text-gold-light" /> : <TrendingUp className="w-5 h-5 text-gold-light" />}
                <h3 className="font-cinzel font-bold text-lg text-gold-light">{opt.title}</h3>
              </div>
              <div className="mb-3">
                <div className="font-cinzel font-bold text-2xl text-foreground">{opt.priceLine}</div>
                <div className="text-[11px] font-montserrat text-text-dim mt-0.5">{opt.subLine}</div>
              </div>
              <ul className="space-y-1.5">
                {opt.bullets.map((b, i) => (
                  <li key={i} className="text-xs text-text-secondary font-merriweather flex items-start gap-2">
                    <Sparkles className="w-3 h-3 text-gold-light mt-0.5 shrink-0" /> {b}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>
        <p className="mt-5 text-center text-[10px] font-merriweather italic text-text-dim">
          Sua assinatura Raiz será substituída pela Idriel ao confirmar o pagamento.
        </p>
      </Panel>
    </Backdrop>,
    document.body,
  );
};

const Backdrop: React.FC<{ onClose: () => void; children: React.ReactNode }> = ({ onClose, children }) => (
  <div
    className="fixed inset-0 z-[100] flex items-center justify-center p-4"
    style={{ background: 'rgba(2, 7, 13, 0.85)', backdropFilter: 'blur(8px)' }}
    onClick={onClose}
  >
    {children}
  </div>
);

const Panel: React.FC<{ onClose: () => void; children: React.ReactNode }> = ({ onClose, children }) => (
  <div
    className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-gold/30 p-6 sm:p-8"
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
    {children}
  </div>
);

const Header: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => (
  <div className="text-center">
    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gold/10 border border-gold/30 mb-3">
      <Crown className="w-6 h-6 text-gold-light" />
    </div>
    <h2 className="font-cinzel font-bold text-2xl text-gold-light mb-1">{title}</h2>
    <p className="font-merriweather italic text-text-dim text-sm max-w-md mx-auto">{subtitle}</p>
  </div>
);
