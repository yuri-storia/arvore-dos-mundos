import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, X, ArrowLeft, Crown, Leaf, Zap, Sparkles } from 'lucide-react';
import { openCheckout, PLANS } from '@/hooks/useSubscription';
import idrielAvatar from '@/assets/idriel-avatar.png';

/* ----------------------------- Background FX ----------------------------- */

const RisingParticles: React.FC = () => {
  const particles = useMemo(
    () =>
      Array.from({ length: 36 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 2 + Math.random() * 3,
        duration: 14 + Math.random() * 18,
        delay: Math.random() * 20,
        hue: Math.random() > 0.5 ? 'gold' : 'blue',
      })),
    [],
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {particles.map((p) => (
        <span
          key={p.id}
          style={{
            position: 'absolute',
            bottom: '-10px',
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background:
              p.hue === 'gold'
                ? 'hsl(var(--gold-light))'
                : 'hsl(var(--blue-glow))',
            boxShadow:
              p.hue === 'gold'
                ? '0 0 8px hsl(var(--gold) / 0.7)'
                : '0 0 8px hsl(var(--blue-bright) / 0.6)',
            opacity: 0,
            animation: `riseParticle ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
};

const FlyingLeaves: React.FC = () => {
  const leaves = useMemo(
    () =>
      Array.from({ length: 14 }).map((_, i) => ({
        id: i,
        top: Math.random() * 80,
        size: 16 + Math.random() * 20,
        duration: 24 + Math.random() * 22,
        delay: Math.random() * 25,
        rotate: Math.random() * 360,
        drift: 40 + Math.random() * 80,
      })),
    [],
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {leaves.map((l) => (
        <span
          key={l.id}
          style={{
            position: 'absolute',
            top: `${l.top}%`,
            left: '-60px',
            width: l.size,
            height: l.size,
            color: 'hsl(var(--gold-light))',
            opacity: 0,
            transform: `rotate(${l.rotate}deg)`,
            animation: `flyLeaf ${l.duration}s linear ${l.delay}s infinite`,
            filter: 'drop-shadow(0 0 6px hsl(var(--gold) / 0.4))',
            // pass drift via CSS var
            ['--drift' as never]: `${l.drift}vh`,
          }}
        >
          <svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor">
            <path d="M12 2C7 6 4 10 4 14a8 8 0 0 0 16 0c0-4-3-8-8-12zm0 4.5c3 3 5 6 5 8.5a5 5 0 0 1-10 0c0-2.5 2-5.5 5-8.5z" />
          </svg>
        </span>
      ))}
    </div>
  );
};

const TreeSilhouette: React.FC = () => (
  <div className="pointer-events-none fixed inset-x-0 bottom-0 z-0 flex justify-center opacity-[0.18]">
    <svg
      viewBox="0 0 800 600"
      className="w-[1400px] max-w-[140%] h-auto"
      fill="none"
    >
      <defs>
        <radialGradient id="treeGlow" cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor="hsl(38 80% 55%)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="hsl(214 60% 3%)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="trunk" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="hsl(38 50% 35%)" />
          <stop offset="100%" stopColor="hsl(214 60% 5%)" />
        </linearGradient>
      </defs>
      <ellipse cx="400" cy="240" rx="360" ry="180" fill="url(#treeGlow)" />
      <path
        d="M390 600 L390 360 Q370 320 340 290 Q310 260 330 240 M410 600 L410 340 Q430 310 460 280 Q490 250 470 230 M400 600 L400 200 Q380 150 360 130 M400 380 Q420 350 450 340 M400 320 Q380 290 350 280 M400 260 Q420 230 450 220"
        stroke="url(#trunk)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <circle cx="360" cy="220" r="70" fill="hsl(38 70% 45% / 0.35)" />
      <circle cx="430" cy="200" r="80" fill="hsl(38 70% 50% / 0.3)" />
      <circle cx="400" cy="150" r="90" fill="hsl(42 75% 55% / 0.25)" />
      <circle cx="320" cy="260" r="55" fill="hsl(38 70% 45% / 0.3)" />
      <circle cx="470" cy="260" r="55" fill="hsl(38 70% 45% / 0.3)" />
    </svg>
  </div>
);

/* ------------------------------- Page ------------------------------- */

const PricingPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'mensal' | 'anual'>('anual');

  const handleCheckout = async (plan: string) => {
    setLoading(plan);
    try {
      await openCheckout(plan);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
    }
  };

  const raizPriceId = billingCycle === 'mensal' ? PLANS.raiz_mensal.id : PLANS.raiz_anual.id;
  const idrielPriceId = billingCycle === 'mensal' ? PLANS.idriel_mensal.id : PLANS.idriel_anual.id;

  const tiers = [
    {
      id: 'raiz',
      name: 'Raiz',
      symbol: '🌿',
      tagline: 'Crie mundos sem limites',
      price: billingCycle === 'mensal' ? 'R$ 19,90' : 'R$ 197',
      priceDetail: billingCycle === 'mensal' ? '/mês' : '/ano',
      savings: billingCycle === 'anual' ? 'Economize R$ 41,80' : null,
      icon: Leaf,
      cta: 'Despertar a Raiz',
      ctaAction: () => handleCheckout(raizPriceId),
      popular: false,
      borderClass: 'border-blue-bright/30 hover:border-blue-bright/60',
      glowClass: 'hover:shadow-[0_0_50px_hsl(var(--blue-bright)/0.25)]',
      accentText: 'text-blue-light',
      ctaClass:
        'bg-gradient-to-r from-[hsl(var(--blue-main))] to-[hsl(var(--blue-bright))] text-foreground hover:shadow-[0_0_30px_hsl(var(--blue-bright)/0.5)]',
      features: [
        'Mundos ilimitados',
        'Codex ilimitado (fichas e artigos)',
        'Manuscrito, Cenas e Mural de Arcos',
        '11 Frutos de Worldbuilding',
        'Galeria de Referências',
        'Exportação PDF, Word e Kindle',
        'Importar entre mundos',
      ],
      missing: ['Idriel (IA de texto e imagens)', 'Mapas IA e análise de mundo'],
    },
    {
      id: 'idriel',
      name: 'Idriel',
      symbol: '✨',
      tagline: 'A Árvore responde ao seu chamado',
      price: billingCycle === 'mensal' ? 'R$ 39,90' : 'R$ 397',
      priceDetail: billingCycle === 'mensal' ? '/mês' : '/ano',
      savings: billingCycle === 'anual' ? 'Economize R$ 81,80' : null,
      icon: Crown,
      cta: 'Invocar Idriel',
      ctaAction: () => handleCheckout(idrielPriceId),
      popular: true,
      borderClass: 'border-gold/50 hover:border-gold/80',
      glowClass: 'shadow-[0_0_50px_hsl(var(--gold)/0.2)] hover:shadow-[0_0_70px_hsl(var(--gold)/0.4)]',
      accentText: 'text-gold-light',
      ctaClass:
        'bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--idriel-light))] text-[#1a0f00] font-bold hover:shadow-[0_0_40px_hsl(var(--gold)/0.6)]',
      features: [
        'Tudo do plano Raiz',
        'Idriel — assistente IA (Gemini 2.5 Pro)',
        'Geração de imagens IA (Gemini 3 Pro)',
        'Geração de mapas cartográficos',
        'Análise de mundo com 6 dimensões',
        'Importação de texto com Idriel',
        '100 gotas de Seiva Dourada/mês',
        'Recargas avulsas a partir de R$ 4,90',
      ],
      missing: [],
    },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: '#02070d' }}>
      {/* Keyframes injetadas */}
      <style>{`
        @keyframes riseParticle {
          0%   { transform: translateY(0) translateX(0) scale(1); opacity: 0; }
          10%  { opacity: 0.7; }
          50%  { opacity: 0.4; }
          100% { transform: translateY(-110vh) translateX(40px) scale(0.4); opacity: 0; }
        }
        @keyframes flyLeaf {
          0%   { transform: translate(0, 0) rotate(0deg); opacity: 0; }
          10%  { opacity: 0.65; }
          90%  { opacity: 0.5; }
          100% { transform: translate(110vw, var(--drift)) rotate(720deg); opacity: 0; }
        }
        @keyframes auroraPulse {
          0%, 100% { opacity: 0.35; transform: translate(-50%, 0) scale(1); }
          50%      { opacity: 0.55; transform: translate(-50%, -10px) scale(1.05); }
        }
      `}</style>

      {/* Camadas de fundo */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 0%, hsl(38 70% 35% / 0.18) 0%, transparent 60%), radial-gradient(ellipse 70% 50% at 50% 100%, hsl(211 76% 30% / 0.25) 0%, transparent 60%)',
        }}
      />
      <div
        className="fixed top-[-80px] left-1/2 -translate-x-1/2 w-[120vw] h-[500px] z-0 pointer-events-none rounded-full"
        style={{
          background:
            'radial-gradient(ellipse at center, hsl(38 80% 50% / 0.18) 0%, transparent 70%)',
          filter: 'blur(80px)',
          animation: 'auroraPulse 12s ease-in-out infinite',
        }}
      />
      <TreeSilhouette />
      <RisingParticles />
      <FlyingLeaves />

      {/* Conteúdo */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-10">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-text-dim hover:text-foreground transition-colors mb-10 font-montserrat text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar à Árvore
        </button>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center justify-center gap-3 mb-6">
            <div className="relative">
              <img
                src={idrielAvatar}
                alt="Idriel"
                className="w-16 h-16 rounded-full border-2 border-gold/50 shadow-[0_0_30px_hsl(var(--gold)/0.5)]"
              />
              <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-gold-light animate-pulse" />
            </div>
          </div>
          <p className="font-montserrat uppercase tracking-[0.4em] text-xs text-gold-light/80 mb-4">
            A Árvore dos Mundos
          </p>
          <h1 className="font-cinzel font-bold text-4xl sm:text-5xl md:text-6xl text-foreground mb-5 leading-tight">
            Escolha seu <span className="text-gold-light">Caminho</span>
          </h1>
          <p className="font-merriweather italic text-text-secondary text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Cada autor é uma semente que busca a luz. A Árvore acolhe todos —
            mas só revela seus mistérios mais profundos a quem ousa percorrer suas raízes.
          </p>
        </motion.div>

        {/* Billing toggle */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="flex items-center justify-center gap-2 mb-12"
        >
          <div className="inline-flex p-1 rounded-full border border-gold/20 bg-card/40 backdrop-blur-md">
            <button
              onClick={() => setBillingCycle('mensal')}
              className={`px-6 py-2.5 rounded-full text-xs font-montserrat font-bold uppercase tracking-wider transition-all ${
                billingCycle === 'mensal'
                  ? 'bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--idriel-light))] text-[#1a0f00]'
                  : 'text-text-dim hover:text-foreground'
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setBillingCycle('anual')}
              className={`relative px-6 py-2.5 rounded-full text-xs font-montserrat font-bold uppercase tracking-wider transition-all ${
                billingCycle === 'anual'
                  ? 'bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--idriel-light))] text-[#1a0f00]'
                  : 'text-text-dim hover:text-foreground'
              }`}
            >
              Anual
              <span className="absolute -top-2 -right-3 px-1.5 py-0.5 bg-emerald-500 text-[8px] text-white rounded-full font-bold">
                -17%
              </span>
            </button>
          </div>
        </motion.div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20 max-w-4xl mx-auto">
          {tiers.map((tier, i) => (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.15, duration: 0.7 }}
              className={`relative rounded-2xl border p-7 sm:p-8 transition-all duration-500 backdrop-blur-md ${tier.borderClass} ${tier.glowClass} ${
                tier.popular ? 'md:-mt-4 md:pb-10' : ''
              }`}
              style={{
                background: tier.popular
                  ? 'linear-gradient(180deg, hsl(38 70% 35% / 0.12) 0%, hsl(214 60% 4% / 0.85) 100%)'
                  : 'linear-gradient(180deg, hsl(211 76% 30% / 0.08) 0%, hsl(214 60% 4% / 0.85) 100%)',
              }}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--idriel-light))] text-[10px] font-montserrat font-bold uppercase tracking-widest text-[#1a0f00] shadow-[0_0_20px_hsl(var(--gold)/0.5)]">
                  ✨ Recomendado
                </div>
              )}

              <div className="text-center mb-7">
                <div className="text-4xl mb-3">{tier.symbol}</div>
                <h3 className={`font-cinzel font-bold text-2xl mb-1.5 ${tier.accentText}`}>{tier.name}</h3>
                <p className="font-merriweather italic text-text-dim text-sm mb-5">{tier.tagline}</p>
                <div className="flex items-baseline justify-center gap-1.5">
                  <span className={`font-cinzel font-bold text-4xl sm:text-5xl ${tier.accentText}`}>{tier.price}</span>
                  <span className="text-text-dim text-sm font-montserrat">{tier.priceDetail}</span>
                </div>
                {tier.savings && (
                  <p className="mt-2 text-[11px] font-montserrat font-bold uppercase tracking-wider text-emerald-400">
                    {tier.savings}
                  </p>
                )}
              </div>

              <button
                onClick={tier.ctaAction}
                disabled={!!loading}
                className={`w-full py-3.5 rounded-xl text-sm font-montserrat font-bold uppercase tracking-wider transition-all mb-7 ${tier.ctaClass}`}
              >
                {tier.cta}
              </button>

              <ul className="space-y-2.5">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className={`w-4 h-4 mt-0.5 shrink-0 ${tier.accentText}`} />
                    <span className="text-foreground/85 font-montserrat">{f}</span>
                  </li>
                ))}
                {tier.missing.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm opacity-40">
                    <X className="w-4 h-4 mt-0.5 shrink-0" />
                    <span className="font-montserrat line-through">{f}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Recharge packages */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.7 }}
          className="rounded-2xl border border-gold/25 p-7 mb-20 backdrop-blur-md"
          style={{
            background: 'linear-gradient(135deg, hsl(38 70% 35% / 0.1) 0%, hsl(214 60% 4% / 0.85) 100%)',
          }}
        >
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-gold-light" />
              <span className="font-cinzel font-bold text-xl text-gold-light">
                Recargas de Seiva Dourada
              </span>
            </div>
            <p className="font-merriweather italic text-text-dim text-sm max-w-xl mx-auto">
              Esgotaram suas gotas? Recarregue avulso, sem mexer na assinatura.
              Quanto mais gotas, mais barata cada uma.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { drops: 15, price: 'R$ 4,90', perDrop: '0,33', id: 'recarga_15', badge: null },
              { drops: 25, price: 'R$ 7,90', perDrop: '0,32', id: 'recarga_25', badge: null },
              { drops: 50, price: 'R$ 14,90', perDrop: '0,30', id: 'recarga_50', badge: null },
              { drops: 100, price: 'R$ 27,90', perDrop: '0,28', id: 'recarga_100', badge: 'Popular' },
              { drops: 200, price: 'R$ 54,90', perDrop: '0,27', id: 'recarga_200', badge: 'Melhor valor' },
            ].map((pkg) => {
              const highlighted = !!pkg.badge;
              return (
                <button
                  key={pkg.id}
                  onClick={() => handleCheckout(pkg.id)}
                  disabled={!!loading}
                  className={`relative flex flex-col items-center text-center rounded-xl border p-4 transition-all hover:-translate-y-1 ${
                    highlighted
                      ? 'border-gold/50 bg-gold/[0.08] hover:bg-gold/[0.14]'
                      : 'border-border/60 bg-card/40 hover:border-gold/30'
                  }`}
                >
                  {pkg.badge && (
                    <span
                      className={`absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-full text-[8px] font-montserrat font-bold uppercase tracking-wider ${
                        pkg.badge === 'Popular'
                          ? 'bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--idriel-light))] text-[#1a0f00]'
                          : 'bg-emerald-500 text-white'
                      }`}
                    >
                      {pkg.badge}
                    </span>
                  )}
                  <span className="text-2xl mb-1">🧪</span>
                  <span className="font-cinzel font-bold text-2xl text-gold-light">{pkg.drops}</span>
                  <span className="font-montserrat text-[10px] text-text-dim uppercase tracking-wider mb-2">gotas</span>
                  <span className="font-montserrat font-bold text-sm text-foreground">{pkg.price}</span>
                  <span className="font-montserrat text-[10px] text-text-dim mt-1">R$ {pkg.perDrop}/gota</span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Closing */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center pb-16"
        >
          <div className="gold-divider mx-auto max-w-xs mb-6" style={{ height: 1, background: 'linear-gradient(90deg, transparent 0%, hsl(var(--gold) / 0.7) 50%, transparent 100%)' }} />
          <p className="font-merriweather italic text-text-secondary text-base mb-3 max-w-2xl mx-auto">
            "A Árvore dos Mundos é a única ferramenta brasileira que une
            worldbuilding, escrita e IA em um só lugar."
          </p>
          <p className="font-montserrat text-[10px] uppercase tracking-[0.3em] text-text-dim/60">
            Universo STORIA · Todos os direitos reservados
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default PricingPage;
