import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Check, X, Sparkles, BookOpen, Map, Library, Image as ImageIcon,
  Wand2, FileDown, Layers, Brain, Infinity as InfinityIcon, ShieldCheck, Clock, Heart,
  Leaf, Feather, Star, Plus, Droplet, Trees, Crown, Compass, LogIn,
} from 'lucide-react';
import { openCheckout, PLANS } from '@/hooks/useSubscription';
import { useAuth } from '@/contexts/AuthContext';
import heroVideo from '@/assets/arvore-hero-bg.mp4.asset.json';
import heroPoster from '@/assets/arvore-mundos-hero.png.asset.json';
import idrielVideo from '@/assets/idriel-animated.mp4.asset.json';
import idrielPoster from '@/assets/idriel-avatar.png';

const PricingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
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

  // 197 / 19.90 ≈ 9.9 meses → 2 meses grátis | 397 / 39.90 ≈ 9.95 meses → 2 meses grátis
  const tiers = [
    {
      id: 'raiz',
      name: 'Raiz',
      Icon: Leaf,
      tagline: 'Worldbuilding e escrita sem limites',
      price: billingCycle === 'mensal' ? 'R$ 19,90' : 'R$ 197',
      priceDetail: billingCycle === 'mensal' ? '/mês' : '/ano',
      savings: billingCycle === 'anual' ? '2 meses grátis nesse plano' : null,
      cta: 'Assinar Raiz',
      ctaAction: () => handleCheckout(raizPriceId),
      popular: false,
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
      Icon: Crown,
      tagline: 'Tudo do Raiz mais a Idriel ao seu lado',
      price: billingCycle === 'mensal' ? 'R$ 39,90' : 'R$ 397',
      priceDetail: billingCycle === 'mensal' ? '/mês' : '/ano',
      savings: billingCycle === 'anual' ? '2 meses grátis nesse plano' : null,
      cta: 'Assinar Idriel',
      ctaAction: () => handleCheckout(idrielPriceId),
      popular: true,
      features: [
        'Tudo do plano Raiz',
        'Idriel — assistente IA (Gemini 2.5 Pro)',
        'Geração de imagens IA (Gemini 3 Pro)',
        'Geração de mapas cartográficos',
        'Análise de mundo com 6 dimensões',
        'Importação de texto com Idriel',
        '100 gotas de Elixir dos Mundos por mês',
        'Recargas avulsas a partir de R$ 4,90',
      ],
      missing: [],
    },
  ];

  return (
    <div className="min-h-screen relative font-amiri" style={{ background: '#02070d' }}>
      {/* ---------------- HERO ---------------- */}
      <section className="relative w-full overflow-hidden" style={{ minHeight: '92vh' }}>
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
        <img
          src={heroPoster.url}
          alt=""
          className="absolute inset-0 w-full h-full object-cover -z-10"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at center, hsl(214 80% 3% / 0.3) 0%, hsl(214 80% 3% / 0.65) 100%)',
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-56 pointer-events-none"
          style={{
            background:
              'linear-gradient(to bottom, transparent 0%, rgba(2,7,13,0.55) 45%, #02070d 100%)',
          }}
        />

        <div className="relative z-10 max-w-5xl mx-auto px-5 pt-8 pb-32">
          <div className="flex items-center justify-center sm:justify-end mb-20">
            <button
              onClick={() => navigate(user ? '/' : '/login')}
              className="group relative inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-montserrat font-bold uppercase tracking-[0.22em] text-[11px] text-[#1a0f00] transition-all hover:-translate-y-0.5"
              style={{
                background: 'linear-gradient(135deg, hsl(42 55% 90%) 0%, hsl(40 50% 78%) 30%, hsl(34 42% 58%) 65%, hsl(30 30% 42%) 100%)',
                boxShadow: '0 8px 28px hsl(30 30% 30% / 0.5), inset 0 1px 0 hsl(42 60% 96% / 0.7), inset 0 -2px 0 hsl(28 32% 22% / 0.4)',
                border: '1px solid hsl(34 42% 50% / 0.7)',
              }}
            >
              <LogIn className="w-4 h-4" strokeWidth={2.25} />
              {user ? 'Voltar ao App' : 'Entrar na conta'}
            </button>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="text-center pt-10"
          >
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 mb-8 rounded-full border border-gold-warm/30 bg-gold-deep/10 backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 text-gold-champagne" />
              <span className="font-montserrat uppercase tracking-[0.32em] text-[10px] text-gold-champagne">
                A Árvore dos Mundos
              </span>
            </div>

            <h1 className="font-cinzel font-bold text-[clamp(2.2rem,6vw,4.6rem)] text-foreground mb-7 leading-[1.05] drop-shadow-[0_2px_30px_rgba(0,0,0,0.7)]">
              Dê Vida aos seus<br />
              <span className="text-gradient-gold">Mundos e Histórias</span>
            </h1>

            <p className="font-amiri text-text-secondary text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed drop-shadow-[0_2px_12px_rgba(0,0,0,0.7)]">
              O santuário definitivo para autores de fantasia e ficção. Construa universos
              vivos, escreva sem fricção e veja sua narrativa florescer — tudo em um só lugar.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ---------------- CONTEÚDO ---------------- */}
      <div className="relative z-10 max-w-6xl mx-auto px-5 -mt-20 pb-20">
        {/* Billing toggle */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="flex items-center justify-center mb-14"
        >
          <div className="inline-flex p-1 rounded-full border border-gold-bronze/40 bg-card/60 backdrop-blur-md">
            <button
              onClick={() => setBillingCycle('mensal')}
              className={`px-7 py-2.5 rounded-full text-[11px] font-montserrat font-bold uppercase tracking-[0.18em] transition-all ${
                billingCycle === 'mensal'
                  ? 'bg-gradient-gold-premium text-[#1a0f00] shadow-[0_4px_20px_rgba(0,0,0,0.4)]'
                  : 'text-text-secondary hover:text-foreground'
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setBillingCycle('anual')}
              className={`relative px-7 py-2.5 rounded-full text-[11px] font-montserrat font-bold uppercase tracking-[0.18em] transition-all ${
                billingCycle === 'anual'
                  ? 'bg-gradient-gold-premium text-[#1a0f00] shadow-[0_4px_20px_rgba(0,0,0,0.4)]'
                  : 'text-text-secondary hover:text-foreground'
              }`}
            >
              Anual
              <span className="absolute -top-2.5 -right-4 px-2 py-0.5 bg-gold-champagne text-[8px] text-[#1a0f00] rounded-full font-bold tracking-wider">
                2 MESES GRÁTIS
              </span>
            </button>
          </div>
        </motion.div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-7 mb-24 max-w-4xl mx-auto">
          {tiers.map((tier, i) => {
            const Icon = tier.Icon;
            return (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.15, duration: 0.7 }}
                className={`group relative rounded-[1.25rem] p-[1px] transition-all duration-500 ${
                  tier.popular ? 'md:-mt-4 shadow-gold-glow hover:shadow-gold-glow-strong' : ''
                }`}
                style={{
                  background: tier.popular
                    ? 'linear-gradient(140deg, hsl(var(--gold-bronze)) 0%, hsl(var(--gold-champagne)) 35%, hsl(var(--gold-deep)) 70%, hsl(var(--gold-warm)) 100%)'
                    : 'linear-gradient(140deg, hsl(var(--blue-main) / 0.6) 0%, hsl(var(--blue-bright) / 0.3) 50%, hsl(var(--blue-main) / 0.5) 100%)',
                }}
              >
                <div
                  className={`relative rounded-[1.18rem] p-8 sm:p-10 backdrop-blur-md transition-all duration-500 ${
                    tier.popular ? 'md:pb-12' : ''
                  }`}
                  style={{
                    background: tier.popular
                      ? 'radial-gradient(ellipse at top, hsl(34 38% 30% / 0.22) 0%, hsl(214 60% 4% / 0.97) 70%)'
                      : 'radial-gradient(ellipse at top, hsl(211 76% 30% / 0.14) 0%, hsl(214 60% 4% / 0.97) 70%)',
                  }}
                >
                  {tier.popular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-gradient-gold-premium text-[10px] font-montserrat font-bold uppercase tracking-[0.22em] text-[#1a0f00] shadow-[0_6px_28px_hsl(var(--gold-warm)/0.55)] flex items-center gap-1.5 whitespace-nowrap">
                      <Star className="w-3 h-3 fill-current" />
                      Mais escolhido
                    </div>
                  )}

                  <div className="text-center mb-8">
                    <div
                      className={`mx-auto mb-6 w-16 h-16 rounded-full flex items-center justify-center ${
                        tier.popular
                          ? 'bg-gradient-gold-premium shadow-[0_6px_28px_hsl(var(--gold-bronze)/0.55),inset_0_1px_0_hsl(var(--gold-cream)/0.4)]'
                          : 'bg-gradient-to-br from-[hsl(var(--blue-main))]/40 to-[hsl(var(--blue-bright))]/10 border border-blue-bright/40 shadow-[0_4px_22px_hsl(var(--blue-bright)/0.3)]'
                      }`}
                    >
                      <Icon
                        className={`w-7 h-7 ${tier.popular ? 'text-[#1a0f00]' : 'text-blue-light'}`}
                        strokeWidth={1.75}
                      />
                    </div>
                    <h3
                      className={`font-cinzel font-bold text-[1.75rem] tracking-[0.04em] mb-2 ${
                        tier.popular ? 'text-gradient-gold' : 'text-blue-light'
                      }`}
                    >
                      {tier.name}
                    </h3>
                    <p className="font-amiri italic text-text-secondary text-[1.05rem] mb-6 leading-relaxed">
                      {tier.tagline}
                    </p>
                    <div className="flex items-baseline justify-center gap-1.5">
                      <span
                        className={`font-cinzel font-bold text-[3.5rem] sm:text-[4rem] leading-none ${
                          tier.popular ? 'text-gradient-gold' : 'text-blue-light'
                        }`}
                      >
                        {tier.price}
                      </span>
                      <span className="text-text-secondary text-base font-montserrat">
                        {tier.priceDetail}
                      </span>
                    </div>
                    {tier.savings && (
                      <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-gold-warm/40 bg-gold-deep/15">
                        <Sparkles className="w-3 h-3 text-gold-champagne" strokeWidth={2} />
                        <span className="text-[10px] font-montserrat font-bold uppercase tracking-[0.18em] text-gold-champagne">
                          {tier.savings}
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={tier.ctaAction}
                    disabled={!!loading}
                    className={`w-full py-4 rounded-xl text-[11px] font-montserrat font-bold uppercase tracking-[0.24em] transition-all mb-8 ${
                      tier.popular
                        ? 'bg-gradient-gold-premium text-[#1a0f00] shadow-[0_6px_24px_hsl(var(--gold-bronze)/0.4),inset_0_1px_0_hsl(var(--gold-cream)/0.35)] hover:shadow-[0_10px_42px_hsl(var(--gold-warm)/0.6),inset_0_1px_0_hsl(var(--gold-cream)/0.45)] hover:-translate-y-0.5'
                        : 'bg-gradient-to-r from-[hsl(var(--blue-main))] to-[hsl(var(--blue-bright))] text-foreground shadow-[0_4px_20px_hsl(var(--blue-bright)/0.3)] hover:shadow-[0_8px_32px_hsl(var(--blue-bright)/0.5)] hover:-translate-y-0.5'
                    }`}
                  >
                    {tier.cta}
                  </button>

                  <ul className="space-y-3">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-3 text-[15px]">
                        <Check
                          className={`w-4 h-4 mt-1 shrink-0 ${tier.popular ? 'text-gold-champagne' : 'text-blue-light'}`}
                          strokeWidth={2.5}
                        />
                        <span className="text-foreground/90 font-amiri leading-snug">{f}</span>
                      </li>
                    ))}
                    {tier.missing.map((f) => (
                      <li key={f} className="flex items-start gap-3 text-[15px] opacity-40">
                        <X className="w-4 h-4 mt-1 shrink-0" />
                        <span className="font-amiri line-through leading-snug">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* =============== QUEM É IDRIEL =============== */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8 }}
          className="mb-24"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            {/* Visual */}
            <div className="relative order-2 lg:order-1">
              <div
                className="relative rounded-[1.5rem] overflow-hidden border border-gold-warm/40"
                style={{
                  boxShadow:
                    '0 30px 90px hsl(214 90% 2% / 0.7), 0 0 0 1px hsl(var(--gold-bronze) / 0.25), inset 0 1px 0 hsl(var(--gold-cream) / 0.15)',
                }}
              >
                <video
                  className="block w-full h-auto"
                  src={idrielVideo.url}
                  poster={idrielPoster}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  aria-label="Idriel, a anfitriã élfica da Árvore dos Mundos"
                />
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      'radial-gradient(ellipse at center, transparent 55%, hsl(214 90% 2% / 0.55) 100%)',
                  }}
                />
                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-28"
                  style={{
                    background:
                      'linear-gradient(to bottom, transparent 0%, hsl(214 90% 2% / 0.75) 100%)',
                  }}
                />
                <div className="absolute bottom-5 left-5 right-5 flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-gold-champagne" strokeWidth={2} />
                  <span className="font-cinzel font-bold text-sm tracking-[0.18em] text-gradient-gold">
                    Idriel
                  </span>
                  <span className="font-amiri italic text-xs text-text-secondary">
                    — guardiã da Árvore
                  </span>
                </div>
              </div>
            </div>

            {/* Texto */}
            <div className="order-1 lg:order-2">
              <p className="font-montserrat uppercase tracking-[0.35em] text-[10px] text-gold-champagne mb-4">
                Conheça a anfitriã
              </p>
              <h2 className="font-cinzel font-bold text-[clamp(1.9rem,4.2vw,3rem)] text-foreground mb-6 leading-[1.1]">
                Quem é <span className="text-gradient-gold">Idriel?</span>
              </h2>
              <div className="space-y-5 font-amiri text-[1.05rem] sm:text-[1.1rem] leading-[1.75] text-text-secondary">
                <p>
                  Idriel é uma <em className="text-gold-cream">élfica imortal</em>, guardiã da Árvore
                  dos Mundos. Há eras ela caminha entre cosmologias, ouvindo o sussurro de civilizações,
                  deuses e mitos — e agora oferece esse conhecimento a você.
                </p>
                <p>
                  Mais que uma IA, ela é a sua <span className="text-gold-champagne font-bold">parceira de criação</span>:
                  alimentada pelo Codex do seu mundo, ela brainstormeia povos e religiões,
                  expande cenas, gera retratos consistentes e desenha mapas — sempre em pt-BR,
                  sempre com a voz de uma sábia que conhece o ofício.
                </p>
                <p>
                  Quando você assina o plano <span className="text-gradient-gold font-bold">Idriel</span>,
                  ela passa a habitar o seu santuário criativo — pronta para co-criar mundos
                  que respiram.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-8">
                {[
                  { Icon: Feather, label: 'Texto em Gemini 2.5 Pro' },
                  { Icon: ImageIcon, label: 'Imagens em Gemini 3 Pro' },
                  { Icon: Map, label: 'Mapas cartográficos' },
                  { Icon: Brain, label: 'Análise de mundo' },
                ].map(({ Icon, label }) => (
                  <div
                    key={label}
                    className="flex items-center gap-2.5 rounded-lg border border-gold-bronze/30 bg-card/40 backdrop-blur-md px-3.5 py-2.5"
                  >
                    <Icon className="w-4 h-4 text-gold-champagne shrink-0" strokeWidth={1.75} />
                    <span className="font-amiri text-[13.5px] text-foreground/85 leading-tight">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>


        {/* =============== O QUE VOCÊ GANHA =============== */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7 }}
          className="mb-24"
        >
          <div className="text-center mb-12">
            <p className="font-montserrat uppercase tracking-[0.35em] text-[10px] text-gold-champagne mb-4">
              Tudo num só lugar
            </p>
            <h2 className="font-cinzel font-bold text-[clamp(1.8rem,4vw,2.8rem)] text-foreground mb-4 leading-tight">
              O ofício do autor, <span className="text-gradient-gold">enfim reunido</span>
            </h2>
            <p className="font-amiri italic text-text-secondary text-lg max-w-2xl mx-auto leading-relaxed">
              Tudo o que um autor de fantasia, ficção científica ou romance precisa —
              sem pular entre cinco ferramentas diferentes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { Icon: Library, title: 'Codex ilimitado', desc: 'Crie Fichas (personagens, lugares, objetos) e Artigos (lore, religiões, magia) sem teto, com imagens e ligações entre verbetes.' },
              { Icon: Trees, title: '11 Frutos de Worldbuilding', desc: 'Roteiro guiado para construir mundos do topo (cosmologia) à base (cultura cotidiana). Top-down ou bottom-up.' },
              { Icon: BookOpen, title: 'Manuscrito por capítulos', desc: 'Escreva direto em capítulos, com contador de palavras, autosave e foco total. Sem hierarquia confusa de cenas.' },
              { Icon: Wand2, title: 'Mural de Arcos', desc: 'Visualize sua história em colunas estilo storyboard. Arraste, reorganize e enxergue o ritmo da narrativa.' },
              { Icon: Feather, title: 'Idriel — IA elfa em pt-BR', desc: 'Brainstorm de mundo, expansão de cenas, análise de coerência. Gemini 2.5 Pro alimentada pelo seu Codex inteiro.' },
              { Icon: ImageIcon, title: 'Visões de Idriel', desc: 'Retratos de personagens, lugares e objetos com consistência visual gerados em Gemini 3 Pro.' },
              { Icon: Map, title: 'Mapas cartográficos', desc: 'Gere o mapa do seu mundo em 6 estilos diferentes — do pergaminho clássico ao satélite moderno.' },
              { Icon: Brain, title: 'Análise de mundo (6 dimensões)', desc: 'A Idriel lê seu mundo e devolve notas de 1 a 5 estrelas em coerência, originalidade e profundidade.' },
              { Icon: FileDown, title: 'Exportação completa', desc: 'Baixe seu Codex e seu Manuscrito em PDF, Word ou Kindle, prontos para publicação.' },
            ].map(({ Icon, title, desc }) => (
              <div key={title} className="rounded-2xl border border-gold-bronze/25 bg-card/40 backdrop-blur-md p-6 hover:border-gold-warm/50 hover:bg-card/55 transition-all hover:-translate-y-1">
                <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-gold-deep/40 to-gold-bronze/20 border border-gold-bronze/40 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-gold-champagne" strokeWidth={1.75} />
                </div>
                <h3 className="font-cinzel font-bold text-lg text-foreground mb-2 tracking-wide">{title}</h3>
                <p className="font-amiri text-[15px] text-text-secondary leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* =============== COMPARATIVO DE CUSTO =============== */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7 }}
          className="mb-24 rounded-3xl border border-gold-bronze/40 p-8 sm:p-12 backdrop-blur-md"
          style={{ background: 'linear-gradient(135deg, hsl(34 38% 30% / 0.14) 0%, hsl(214 60% 4% / 0.94) 100%)' }}
        >
          <div className="text-center mb-10">
            <p className="font-montserrat uppercase tracking-[0.35em] text-[10px] text-gold-champagne mb-4">
              Faça as contas
            </p>
            <h2 className="font-cinzel font-bold text-[clamp(1.8rem,4vw,2.8rem)] text-foreground mb-4 leading-tight">
              Quanto custaria <span className="text-gradient-gold">fazer tudo isso separado?</span>
            </h2>
            <p className="font-amiri italic text-text-secondary text-lg max-w-2xl mx-auto leading-relaxed">
              Compare o que você gastaria assinando cada ferramenta especializada — e em inglês.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-3">
              {[
                { name: 'ChatGPT Plus (IA texto)', price: 'R$ 104/mês' },
                { name: 'Midjourney (IA imagens)', price: 'R$ 55/mês' },
                { name: 'World Anvil Author', price: 'R$ 115/mês' },
                { name: 'Scrivener (manuscrito)', price: 'R$ 290 vitalício' },
                { name: 'Notion AI (organização)', price: 'R$ 55/mês' },
              ].map((c) => (
                <div key={c.name} className="flex items-center justify-between rounded-lg border border-border/60 bg-card/40 px-5 py-3.5">
                  <span className="font-amiri text-[15px] text-foreground/85">{c.name}</span>
                  <span className="font-montserrat font-bold text-sm text-text-secondary line-through">{c.price}</span>
                </div>
              ))}
              <div className="flex items-center justify-between rounded-lg border-2 border-red-alert/40 bg-red-alert/[0.06] px-5 py-4 mt-3">
                <span className="font-cinzel font-bold text-base text-red-300">Total mensal</span>
                <span className="font-cinzel font-bold text-2xl text-red-300">R$ 329+/mês</span>
              </div>
            </div>

            <div
              className="relative rounded-2xl border-2 border-gold-warm/60 p-8 text-center"
              style={{
                background: 'radial-gradient(ellipse at top, hsl(34 38% 30% / 0.28) 0%, hsl(214 60% 4% / 0.94) 80%)',
                boxShadow: '0 0 70px hsl(var(--gold-bronze) / 0.3)',
              }}
            >
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-gradient-gold-premium text-[10px] font-montserrat font-bold uppercase tracking-[0.22em] text-[#1a0f00] whitespace-nowrap flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                Tudo num plano só
              </span>
              <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-gradient-gold-premium flex items-center justify-center shadow-[0_4px_24px_hsl(var(--gold-warm)/0.5)]">
                <Crown className="w-6 h-6 text-[#1a0f00]" strokeWidth={1.75} />
              </div>
              <h3 className="font-cinzel font-bold text-2xl text-gradient-gold mb-1.5">Idriel Anual</h3>
              <p className="font-amiri italic text-text-secondary text-base mb-5">
                Worldbuilding + Escrita + IA + Exportação
              </p>
              <div className="flex items-baseline justify-center gap-1.5 mb-1.5">
                <span className="font-cinzel font-bold text-6xl text-gradient-gold">R$ 33</span>
                <span className="font-montserrat text-text-secondary">/mês</span>
              </div>
              <p className="font-montserrat text-[11px] text-text-secondary mb-6 tracking-wider">
                R$ 397/ano · cobrança única · 2 meses grátis
              </p>
              <div className="inline-block px-4 py-2 rounded-full bg-gold-champagne/15 border border-gold-champagne/40 text-gold-champagne font-montserrat font-bold text-xs uppercase tracking-[0.18em]">
                Economia de ~R$ 296/mês
              </div>
            </div>
          </div>
        </motion.section>

        {/* =============== POR QUE ESCOLHER =============== */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7 }}
          className="mb-24"
        >
          <div className="text-center mb-10">
            <h2 className="font-cinzel font-bold text-[clamp(1.8rem,4vw,2.8rem)] text-foreground mb-3 leading-tight">
              Por que <span className="text-gradient-gold">a Árvore dos Mundos?</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {[
              { Icon: Heart, title: '100% em português', desc: 'Pensada para o autor brasileiro — termos, exemplos e suporte em pt-BR.' },
              { Icon: ShieldCheck, title: 'Seus mundos são seus', desc: 'Nunca usamos seu conteúdo para treinar IA. Exporte tudo quando quiser.' },
              { Icon: Clock, title: 'Cancele quando quiser', desc: 'Sem fidelidade. Um clique e fim — seus dados permanecem disponíveis.' },
              { Icon: InfinityIcon, title: 'Atualizações contínuas', desc: 'Recursos novos toda semana. Sem cobrar a mais por isso.' },
            ].map(({ Icon, title, desc }) => (
              <div key={title} className="rounded-xl border border-gold-bronze/25 bg-card/40 backdrop-blur-md p-6 text-center hover:border-gold-warm/50 transition-all">
                <Icon className="w-7 h-7 text-gold-champagne mx-auto mb-3" strokeWidth={1.5} />
                <h3 className="font-cinzel font-bold text-base text-foreground mb-2 tracking-wide">{title}</h3>
                <p className="font-amiri text-[14px] text-text-secondary leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* =============== FAQ =============== */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7 }}
          className="mb-24 max-w-3xl mx-auto"
        >
          <div className="text-center mb-10">
            <h2 className="font-cinzel font-bold text-[clamp(1.8rem,4vw,2.8rem)] text-foreground mb-3 leading-tight">
              Perguntas <span className="text-gradient-gold">comuns</span>
            </h2>
          </div>

          <div className="space-y-3">
            {[
              { q: 'Como começo?', a: 'Escolha Raiz ou Idriel, finalize o checkout e sua Árvore é plantada na hora. Não há versão gratuita: cada plano dá acesso completo às funcionalidades do seu nível desde o primeiro minuto.' },
              { q: 'Qual a diferença entre Raiz e Idriel?', a: 'Raiz te dá worldbuilding e escrita ilimitados, com exportação. Idriel acrescenta toda a parte de IA: assistente Idriel, geração de imagens, mapas e análise de mundo. Comece pelo Raiz e suba para Idriel quando quiser turbinar com IA.' },
              { q: 'O que é o Elixir dos Mundos?', a: 'É a poção que Idriel destila a partir da Seiva Lendária da Árvore dos Mundos — a essência que alimenta toda a magia da plataforma. Cada gota é um pedaço dessa Seiva: texto, consulta a Idriel, análise de mundo e import de documentos custam 1 gota; imagens vão de 2 gotas (Rascunho) a 5 (Padrão) ou 15 (Qualidade Máxima cinematográfica). O plano Idriel inclui 100 gotas renovadas por mês, e você pode recarregar avulso a partir de R$ 4,90 sem mexer na assinatura.' },
              { q: 'Meus mundos ficam salvos? Posso exportar tudo?', a: 'Sim. Tudo é salvo automaticamente na nuvem. Exporte seu Codex e Manuscrito em PDF, Word ou Kindle a qualquer momento — o conteúdo é seu, para sempre.' },
              { q: 'A IA é boa mesmo? Que modelo vocês usam?', a: 'Idriel roda nos modelos mais recentes do mercado: Gemini 3 Flash Preview para texto e análises, Nano Banana Pro (Gemini 3 Pro Image) para imagens padrão com canon do Codex, e GPT Image 2 da OpenAI no nível Qualidade Máxima — todos com prompts adaptados em pt-BR.' },
              { q: 'Como funciona o pagamento?', a: 'Cartão de crédito, boleto ou Pix processados via Asaas (instituição de pagamento brasileira regulamentada pelo Banco Central). No anual, cobrança única com 2 meses grátis. No mensal, cobrança recorrente. Sem fidelidade — cancele a qualquer momento.' },
            ].map((item, i) => (
              <details key={i} className="group rounded-xl border border-gold-bronze/25 bg-card/40 backdrop-blur-md overflow-hidden hover:border-gold-warm/40 transition-colors">
                <summary className="cursor-pointer list-none px-6 py-5 flex items-center justify-between gap-4">
                  <span className="font-cinzel font-bold text-base sm:text-lg text-foreground tracking-wide">{item.q}</span>
                  <Plus className="w-5 h-5 text-gold-champagne transition-transform group-open:rotate-45 shrink-0" strokeWidth={1.75} />
                </summary>
                <div className="px-6 pb-5 font-amiri text-[15px] text-text-secondary leading-relaxed">{item.a}</div>
              </details>
            ))}
          </div>
        </motion.section>

        {/* =============== CTA FINAL =============== */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7 }}
          className="mb-20 text-center rounded-3xl border border-gold-warm/40 p-10 sm:p-16 backdrop-blur-md"
          style={{
            background: 'radial-gradient(ellipse at center, hsl(34 38% 30% / 0.22) 0%, hsl(214 60% 4% / 0.94) 75%)',
            boxShadow: '0 0 90px hsl(var(--gold-bronze) / 0.22)',
          }}
        >
          <div className="mx-auto mb-6 w-14 h-14 rounded-full bg-gradient-gold-premium flex items-center justify-center shadow-[0_6px_30px_hsl(var(--gold-warm)/0.5)]">
            <Sparkles className="w-6 h-6 text-[#1a0f00]" strokeWidth={1.75} />
          </div>
          <h2 className="font-cinzel font-bold text-[clamp(1.8rem,4vw,2.8rem)] text-foreground mb-4 leading-tight">
            Sua história merece <span className="text-gradient-gold">um lugar à altura</span>
          </h2>
          <p className="font-amiri italic text-text-secondary text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
            Pare de espalhar seu universo em cadernos, docs avulsos e abas perdidas.
            Plante sua Árvore hoje e veja seu mundo florescer com você.
          </p>
          <button
            onClick={() => handleCheckout(idrielPriceId)}
            disabled={!!loading}
            className="inline-flex items-center gap-2.5 px-9 py-4 rounded-xl bg-gradient-gold-premium text-[#1a0f00] font-montserrat font-bold uppercase tracking-[0.22em] text-xs hover:shadow-[0_10px_42px_hsl(var(--gold-warm)/0.6)] hover:-translate-y-0.5 transition-all"
          >
            <Crown className="w-4 h-4" strokeWidth={2} />
            Começar com Idriel Anual
          </button>
          <p className="mt-5 font-montserrat text-[11px] text-text-secondary tracking-wider">
            R$ 397/ano · 2 meses grátis · cancele a qualquer momento
          </p>
        </motion.section>

        {/* Recharge packages */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.7 }}
          className="rounded-2xl border border-gold-bronze/30 p-8 mb-16 backdrop-blur-md"
          style={{
            background: 'linear-gradient(135deg, hsl(34 38% 30% / 0.12) 0%, hsl(214 60% 4% / 0.88) 100%)',
          }}
        >
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center gap-2.5 mb-3">
              <Droplet className="w-5 h-5 text-gold-champagne" strokeWidth={1.75} />
              <span className="font-cinzel font-bold text-xl text-gradient-gold tracking-wide">
                Recargas de Elixir dos Mundos
              </span>
            </div>
            <p className="font-amiri italic text-text-secondary text-base max-w-xl mx-auto leading-relaxed">
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
                  className={`relative flex flex-col items-center text-center rounded-xl border p-5 transition-all hover:-translate-y-1 ${
                    highlighted
                      ? 'border-gold-warm/50 bg-gold-deep/10 hover:bg-gold-deep/20'
                      : 'border-gold-bronze/25 bg-card/40 hover:border-gold-warm/40'
                  }`}
                >
                  {pkg.badge && (
                    <span
                      className={`absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-full text-[8px] font-montserrat font-bold uppercase tracking-wider ${
                        pkg.badge === 'Popular'
                          ? 'bg-gradient-gold-premium text-[#1a0f00]'
                          : 'bg-gold-champagne text-[#1a0f00]'
                      }`}
                    >
                      {pkg.badge}
                    </span>
                  )}
                  <Droplet className="w-6 h-6 text-gold-champagne mb-2" strokeWidth={1.5} />
                  <span className="font-cinzel font-bold text-2xl text-gradient-gold">{pkg.drops}</span>
                  <span className="font-montserrat text-[10px] text-text-secondary uppercase tracking-wider mb-2">gotas</span>
                  <span className="font-montserrat font-bold text-sm text-foreground">{pkg.price}</span>
                  <span className="font-montserrat text-[10px] text-text-secondary mt-1">R$ {pkg.perDrop}/gota</span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Closing */}
        <div className="text-center pb-8 space-y-3">
          <a
            href="/seguranca"
            className="inline-block font-montserrat text-[10px] uppercase tracking-[0.3em] text-gold-champagne/80 hover:text-gold-champagne transition-colors"
          >
            Segurança & Privacidade
          </a>
          <p className="font-montserrat text-[10px] uppercase tracking-[0.3em] text-text-secondary/60">
            Universo STORIA · Todos os direitos reservados
          </p>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
