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

        {/* =============== O QUE VOCÊ GANHA =============== */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7 }}
          className="mb-20"
        >
          <div className="text-center mb-10">
            <p className="font-montserrat uppercase tracking-[0.35em] text-[10px] text-gold-light/80 mb-3">
              Tudo num só lugar
            </p>
            <h2 className="font-cinzel font-bold text-3xl sm:text-4xl text-foreground mb-3">
              O que você consegue fazer na <span className="text-gold-light">Árvore dos Mundos</span>
            </h2>
            <p className="font-merriweather italic text-text-dim max-w-2xl mx-auto">
              Tudo o que um autor de fantasia, ficção científica ou romance precisa —
              sem precisar pular entre cinco ferramentas diferentes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Library, title: 'Codex ilimitado', desc: 'Crie Fichas (personagens, lugares, objetos) e Artigos (lore, religiões, magia) sem teto. Imagens, descrições e ligações entre verbetes.' },
              { icon: Layers, title: '11 Frutos de Worldbuilding', desc: 'Roteiro guiado para construir mundos do topo (cosmologia) à base (cultura cotidiana). Top-down ou bottom-up.' },
              { icon: BookOpen, title: 'Manuscrito por capítulos', desc: 'Escreva direto em capítulos, com contador de palavras, autosave e foco total. Sem hierarquia de cenas confusa.' },
              { icon: Wand2, title: 'Mural de Arcos', desc: 'Visualize sua história em colunas estilo storyboard. Arraste, reorganize e enxergue o ritmo da narrativa.' },
              { icon: Sparkles, title: 'Idriel — sua IA elfa em pt-BR', desc: 'Brainstorm de mundo, expansão de cenas, análise de coerência. Gemini 2.5 Pro alimentada pelo seu Codex inteiro.' },
              { icon: ImageIcon, title: 'Geração de imagens IA', desc: 'Visões de Idriel — retratos de personagens, lugares e objetos com consistência visual em Gemini 3 Pro.' },
              { icon: Map, title: 'Mapas cartográficos', desc: 'Gere o mapa do seu mundo em 6 estilos diferentes — do pergaminho clássico ao satélite moderno.' },
              { icon: Brain, title: 'Análise de mundo (6 dimensões)', desc: 'A Idriel lê o seu mundo e devolve notas de 1 a 5 estrelas em coerência, originalidade e profundidade.' },
              { icon: FileDown, title: 'Exportação completa', desc: 'Baixe seu Codex e seu Manuscrito em PDF, Word ou Kindle, prontos para publicação.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md p-5 hover:border-gold/40 transition-all hover:-translate-y-1">
                <div className="w-10 h-10 rounded-lg bg-gold/10 border border-gold/30 flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-gold-light" />
                </div>
                <h3 className="font-cinzel font-bold text-base text-foreground mb-1.5">{title}</h3>
                <p className="font-montserrat text-xs text-text-dim leading-relaxed">{desc}</p>
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
          className="mb-20 rounded-3xl border border-gold/30 p-8 sm:p-10 backdrop-blur-md"
          style={{ background: 'linear-gradient(135deg, hsl(38 70% 35% / 0.12) 0%, hsl(214 60% 4% / 0.92) 100%)' }}
        >
          <div className="text-center mb-8">
            <p className="font-montserrat uppercase tracking-[0.35em] text-[10px] text-gold-light/80 mb-3">Faça as contas</p>
            <h2 className="font-cinzel font-bold text-3xl sm:text-4xl text-foreground mb-3">
              Quanto custaria <span className="text-gold-light">fazer tudo isso separado?</span>
            </h2>
            <p className="font-merriweather italic text-text-dim max-w-2xl mx-auto">
              Compare o que você gastaria assinando cada ferramenta especializada — e em inglês.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="space-y-2.5">
              {[
                { name: 'ChatGPT Plus (IA texto)', price: 'R$ 104/mês' },
                { name: 'Midjourney (IA imagens)', price: 'R$ 55/mês' },
                { name: 'World Anvil Author', price: 'R$ 115/mês' },
                { name: 'Scrivener (manuscrito)', price: 'R$ 290 vitalício' },
                { name: 'Notion AI (organização)', price: 'R$ 55/mês' },
              ].map((c) => (
                <div key={c.name} className="flex items-center justify-between rounded-lg border border-border/60 bg-card/40 px-4 py-3">
                  <span className="font-montserrat text-sm text-foreground/85">{c.name}</span>
                  <span className="font-montserrat font-bold text-sm text-text-dim line-through">{c.price}</span>
                </div>
              ))}
              <div className="flex items-center justify-between rounded-lg border-2 border-red-500/40 bg-red-500/[0.06] px-4 py-3 mt-2">
                <span className="font-cinzel font-bold text-sm text-red-300">Total mensal</span>
                <span className="font-cinzel font-bold text-xl text-red-300">R$ 329+/mês</span>
              </div>
            </div>

            <div
              className="relative rounded-2xl border-2 border-gold/60 p-7 text-center"
              style={{
                background: 'radial-gradient(ellipse at top, hsl(38 70% 35% / 0.25) 0%, hsl(214 60% 4% / 0.9) 80%)',
                boxShadow: '0 0 60px hsl(var(--gold) / 0.25)',
              }}
            >
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--idriel-light))] text-[10px] font-montserrat font-bold uppercase tracking-widest text-[#1a0f00] whitespace-nowrap">
                ✨ Tudo num plano só
              </span>
              <div className="text-5xl mb-2">✨</div>
              <h3 className="font-cinzel font-bold text-2xl text-gold-light mb-1">Idriel Anual</h3>
              <p className="font-merriweather italic text-text-dim text-sm mb-4">
                Worldbuilding + Escrita + IA + Exportação
              </p>
              <div className="flex items-baseline justify-center gap-1.5 mb-1">
                <span className="font-cinzel font-bold text-5xl text-gold-light">R$ 33</span>
                <span className="font-montserrat text-text-dim">/mês</span>
              </div>
              <p className="font-montserrat text-[11px] text-text-dim/80 mb-5">
                R$ 397/ano · cobrança única · 2 meses grátis
              </p>
              <div className="inline-block px-4 py-2 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-montserrat font-bold text-xs uppercase tracking-wider">
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
          className="mb-20"
        >
          <div className="text-center mb-8">
            <h2 className="font-cinzel font-bold text-3xl sm:text-4xl text-foreground mb-3">
              Por que <span className="text-gold-light">a Árvore dos Mundos?</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Heart, title: '100% em português', desc: 'Pensada para o autor brasileiro — termos, exemplos e suporte em pt-BR.' },
              { icon: ShieldCheck, title: 'Seus mundos são seus', desc: 'Nunca usamos seu conteúdo para treinar IA. Exporte tudo quando quiser.' },
              { icon: Clock, title: 'Cancele quando quiser', desc: 'Sem fidelidade. Um clique e fim — seus dados permanecem disponíveis.' },
              { icon: InfinityIcon, title: 'Atualizações contínuas', desc: 'Recursos novos toda semana. Sem cobrar a mais por isso.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-xl border border-border/60 bg-card/40 backdrop-blur-md p-5 text-center hover:border-gold/40 transition-all">
                <Icon className="w-7 h-7 text-gold-light mx-auto mb-3" />
                <h3 className="font-cinzel font-bold text-sm text-foreground mb-1.5">{title}</h3>
                <p className="font-montserrat text-[11px] text-text-dim leading-relaxed">{desc}</p>
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
          className="mb-20 max-w-3xl mx-auto"
        >
          <div className="text-center mb-8">
            <h2 className="font-cinzel font-bold text-3xl sm:text-4xl text-foreground mb-3">
              Perguntas <span className="text-gold-light">comuns</span>
            </h2>
          </div>

          <div className="space-y-3">
            {[
              { q: 'Posso testar antes de assinar?', a: 'Sim — crie sua conta sem cartão e explore a interface. Para usar Codex, Manuscrito, IA e Exportação você precisa assinar Raiz ou Idriel. Cancele a qualquer momento se não for para você.' },
              { q: 'Qual a diferença entre Raiz e Idriel?', a: 'Raiz te dá worldbuilding e escrita ilimitados, com exportação. Idriel acrescenta toda a parte de IA: assistente Idriel, geração de imagens, mapas e análise de mundo. Comece pelo Raiz e suba para Idriel quando quiser turbinar com IA.' },
              { q: 'O que são as "gotas de Seiva Dourada"?', a: 'São os créditos de IA. O plano Idriel já vem com 100 gotas renovadas por mês — suficiente para a maioria dos autores. Se quiser mais, recarregue avulso a partir de R$ 4,90 sem mexer na assinatura.' },
              { q: 'Meus mundos ficam salvos? Posso exportar tudo?', a: 'Sim. Tudo é salvo automaticamente na nuvem. Exporte seu Codex e Manuscrito em PDF, Word ou Kindle a qualquer momento — o conteúdo é seu, para sempre.' },
              { q: 'A IA é boa mesmo? Que modelo vocês usam?', a: 'Idriel roda em Gemini 2.5 Pro para texto e Gemini 3 Pro para imagens — os modelos de ponta do Google, com prompts cuidadosamente adaptados em pt-BR e alimentados pelo seu Codex.' },
              { q: 'Como funciona o pagamento?', a: 'Cartão de crédito ou Pix via Eduzz. No anual, cobrança única com 2 meses grátis. No mensal, cobrança recorrente. Sem fidelidade — cancele a qualquer momento.' },
            ].map((item, i) => (
              <details key={i} className="group rounded-xl border border-border/60 bg-card/40 backdrop-blur-md overflow-hidden hover:border-gold/30 transition-colors">
                <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between gap-4">
                  <span className="font-cinzel font-bold text-sm sm:text-base text-foreground">{item.q}</span>
                  <span className="text-gold-light text-xl transition-transform group-open:rotate-45 shrink-0">+</span>
                </summary>
                <div className="px-5 pb-4 font-montserrat text-sm text-text-dim leading-relaxed">{item.a}</div>
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
          className="mb-20 text-center rounded-3xl border border-gold/40 p-10 sm:p-14 backdrop-blur-md"
          style={{
            background: 'radial-gradient(ellipse at center, hsl(38 70% 35% / 0.18) 0%, hsl(214 60% 4% / 0.92) 75%)',
            boxShadow: '0 0 80px hsl(var(--gold) / 0.18)',
          }}
        >
          <Sparkles className="w-10 h-10 text-gold-light mx-auto mb-4" />
          <h2 className="font-cinzel font-bold text-3xl sm:text-4xl text-foreground mb-3">
            Sua história merece <span className="text-gold-light">um lugar à altura</span>
          </h2>
          <p className="font-merriweather italic text-text-secondary max-w-2xl mx-auto mb-7">
            Pare de espalhar seu universo em cadernos, docs avulsos e abas perdidas.
            Plante sua Árvore hoje e veja seu mundo crescer com você.
          </p>
          <button
            onClick={() => handleCheckout(idrielPriceId)}
            disabled={!!loading}
            className="px-8 py-4 rounded-xl bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--idriel-light))] text-[#1a0f00] font-montserrat font-bold uppercase tracking-wider text-sm hover:shadow-[0_0_40px_hsl(var(--gold)/0.6)] transition-all"
          >
            ✨ Começar com Idriel Anual
          </button>
          <p className="mt-4 font-montserrat text-[11px] text-text-dim/80">
            R$ 397/ano · 2 meses grátis · cancele a qualquer momento
          </p>
        </motion.section>



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
