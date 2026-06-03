import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Check, X, ArrowLeft, Zap, Sparkles, BookOpen, Map, Library, Image as ImageIcon,
  Wand2, FileDown, Layers, Brain, Infinity as InfinityIcon, ShieldCheck, Clock, Heart,
} from 'lucide-react';
import { openCheckout, PLANS } from '@/hooks/useSubscription';
import heroVideo from '@/assets/arvore-hero-bg.mp4.asset.json';
import heroPoster from '@/assets/arvore-mundos-hero.png.asset.json';

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

  // 197 / 19.90 ≈ 9.9 → 2 meses grátis | 397 / 39.90 ≈ 9.95 → 2 meses grátis
  const tiers = [
    {
      id: 'raiz',
      name: 'Raiz',
      symbol: '🌿',
      tagline: 'Worldbuilding e escrita sem limites',
      price: billingCycle === 'mensal' ? 'R$ 19,90' : 'R$ 197',
      priceDetail: billingCycle === 'mensal' ? '/mês' : '/ano',
      savings: billingCycle === 'anual' ? '2 meses grátis nesse plano' : null,
      cta: 'Assinar Raiz',
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
      tagline: 'Tudo do Raiz + a Idriel ao seu lado',
      price: billingCycle === 'mensal' ? 'R$ 39,90' : 'R$ 397',
      priceDetail: billingCycle === 'mensal' ? '/mês' : '/ano',
      savings: billingCycle === 'anual' ? '2 meses grátis nesse plano' : null,
      cta: 'Assinar Idriel',
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
    <div className="min-h-screen relative" style={{ background: '#02070d' }}>
      {/* ---------------- HERO ---------------- */}
      <section className="relative w-full overflow-hidden" style={{ minHeight: '88vh' }}>
        {/* Vídeo de fundo + poster de reserva */}
        <video
          className="absolute inset-0 w-full h-full object-cover"
          src={heroVideo.url}
          poster={heroPoster.url}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
        />
        {/* Fallback estático caso o vídeo não carregue */}
        <img
          src={heroPoster.url}
          alt=""
          className="absolute inset-0 w-full h-full object-cover -z-10"
          aria-hidden="true"
        />
        {/* Véu sutil para contraste do texto */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at center, hsl(214 80% 3% / 0.25) 0%, hsl(214 80% 3% / 0.55) 100%)',
          }}
        />
        {/* Transição fluida para o fundo da página */}
        <div
          className="absolute inset-x-0 bottom-0 h-48 pointer-events-none"
          style={{
            background:
              'linear-gradient(to bottom, transparent 0%, rgba(2,7,13,0.5) 45%, #02070d 100%)',
          }}
        />

        {/* Conteúdo da hero */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 pt-8 pb-32">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 text-text-dim hover:text-foreground transition-colors mb-16 font-montserrat text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9 }}
            className="text-center pt-8"
          >
            <p className="font-montserrat uppercase tracking-[0.4em] text-xs text-gold-light/80 mb-5">
              Planos da Árvore dos Mundos
            </p>
            <h1 className="font-cinzel font-bold text-4xl sm:text-5xl md:text-6xl text-foreground mb-6 leading-tight drop-shadow-[0_2px_20px_rgba(0,0,0,0.6)]">
              Escolha o seu <span className="text-gold-light">plano</span>
            </h1>
            <p className="font-merriweather italic text-text-secondary text-base sm:text-lg max-w-2xl mx-auto leading-relaxed drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)]">
              Worldbuilding, escrita e IA num só lugar — pensado para autores brasileiros.
              Assine mensal ou anual e cancele quando quiser.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ---------------- CONTEÚDO ---------------- */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 -mt-16 pb-20">
        {/* Billing toggle */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="flex items-center justify-center gap-2 mb-12"
        >
          <div className="inline-flex p-1 rounded-full border border-gold/20 bg-card/60 backdrop-blur-md">
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
                2 meses grátis
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
                  ? 'linear-gradient(180deg, hsl(38 70% 35% / 0.12) 0%, hsl(214 60% 4% / 0.9) 100%)'
                  : 'linear-gradient(180deg, hsl(211 76% 30% / 0.08) 0%, hsl(214 60% 4% / 0.9) 100%)',
              }}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--idriel-light))] text-[10px] font-montserrat font-bold uppercase tracking-widest text-[#1a0f00] shadow-[0_0_20px_hsl(var(--gold)/0.5)]">
                  ✨ Mais escolhido
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
          className="rounded-2xl border border-gold/25 p-7 mb-16 backdrop-blur-md"
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
              Acabaram suas gotas? Compre recarga avulsa sem mexer na assinatura.
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
        <div className="text-center pb-8">
          <p className="font-montserrat text-[10px] uppercase tracking-[0.3em] text-text-dim/60">
            Universo STORIA · Todos os direitos reservados
          </p>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
