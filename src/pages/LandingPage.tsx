import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, Sparkles, Crown, Leaf, Sprout, ArrowRight, BookOpen, Map, Palette, PenTool, Brain, Layers, Zap } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';
import idrielAvatar from '@/assets/idriel-avatar.png';
import treeWallpaper from '@/assets/tree-wallpaper.webp';

const ease = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: (i: number = 0) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, delay: i * 0.1, ease },
  }),
};

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState<'mensal' | 'anual'>('anual');
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 600], [0, 200]);
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0.3]);

  const features = [
    { icon: <Layers className="w-6 h-6" />, title: '11 Frutos de Worldbuilding', desc: 'Sistema estruturado com 11 pilares — da cosmologia aos personagens — para criar universos profundos e coerentes.' },
    { icon: <BookOpen className="w-6 h-6" />, title: 'Codex Enciclopédico', desc: 'Fichas detalhadas e artigos wiki para documentar cada aspecto do seu mundo em um só lugar.' },
    { icon: <PenTool className="w-6 h-6" />, title: 'Manuscrito Integrado', desc: 'Escreva seu livro dentro do mesmo espaço: capítulos, cenas, kanban visual e rascunhos livres.' },
    { icon: <Map className="w-6 h-6" />, title: 'Mapas Gerados por IA', desc: 'Crie mapas cartográficos únicos do seu mundo com diferentes estilos artísticos.' },
    { icon: <Palette className="w-6 h-6" />, title: 'Galeria & Imagens IA', desc: 'Organize referências visuais e gere concept arts dos seus personagens, cenários e criaturas.' },
    { icon: <Brain className="w-6 h-6" />, title: 'Idriel — IA Criativa', desc: 'Assistente de IA especializada em worldbuilding que entende seu mundo e sugere ideias contextuais.' },
  ];

  const tiers = [
    {
      id: 'semente', name: '🌱 Semente', tagline: 'Plante sua primeira semente', price: 'Grátis', priceDetail: 'Para sempre',
      accent: 'border-emerald-500/30', accentBg: 'bg-emerald-500/[0.06]', accentText: 'text-emerald-400',
      cta: 'Começar Grátis', ctaClass: 'bg-emerald-600 hover:bg-emerald-500 text-white',
      ctaAction: () => navigate('/login'), popular: false,
      highlights: ['1 mundo', '5 fichas + 1 artigo', 'Manuscrito completo', 'Galeria de referências'],
    },
    {
      id: 'raiz', name: '🌿 Raiz', tagline: 'Crie mundos sem limites', price: 'R$ 87', priceDetail: '/ano (~R$ 7,25/mês)',
      accent: 'border-blue-bright/30', accentBg: 'bg-blue-bright/[0.06]', accentText: 'text-blue-light',
      cta: 'Assinar Raiz', ctaClass: 'bg-[hsl(var(--blue-main))] hover:bg-[hsl(var(--blue-bright))] text-foreground',
      ctaAction: () => navigate('/login'), popular: false,
      highlights: ['Mundos ilimitados', 'Fichas e artigos ilimitados', 'Exportação PDF/Word/Kindle', 'Tudo do Semente'],
    },
    {
      id: 'idriel', name: '✨ Idriel', tagline: 'A Árvore responde ao seu chamado',
      price: billingCycle === 'mensal' ? 'R$ 29,90' : 'R$ 279',
      priceDetail: billingCycle === 'mensal' ? '/mês' : '/ano (2 meses grátis!)',
      accent: 'border-gold/40', accentBg: '', accentText: 'text-gold-light',
      cta: 'Assinar Idriel', ctaClass: 'bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--idriel-light))] hover:from-[hsl(var(--idriel-light))] hover:to-[hsl(var(--gold))] text-[#1a0f00] font-bold',
      ctaAction: () => navigate('/login'), popular: true,
      highlights: ['Assistente IA (Idriel)', 'Geração de imagens e mapas', '100 gotas de Seiva/mês', 'Análise de mundo IA', 'Tudo do Raiz'],
    },
  ];

  const competitors = [
    { name: 'ChatGPT Plus', price: 'R$ 104/mês', icon: '🤖', has: ['Texto IA'], missing: ['Worldbuilding', 'Geração de imagens', 'Organização'] },
    { name: 'Midjourney', price: 'R$ 55/mês', icon: '🎨', has: ['Imagens IA'], missing: ['Texto IA', 'Worldbuilding', 'Manuscritos'] },
    { name: 'World Anvil', price: 'R$ 115/mês', icon: '🗺️', has: ['Worldbuilding'], missing: ['IA de texto', 'IA de imagens', 'Em português'] },
    { name: 'Notion AI', price: 'R$ 55/mês', icon: '📝', has: ['Notas + IA'], missing: ['Worldbuilding', 'Imagens', 'Específico'] },
  ];

  const featureComparison = [
    { label: 'Mundos', semente: '1', raiz: 'Ilimitados', idriel: 'Ilimitados' },
    { label: 'Fichas no Codex', semente: '5', raiz: 'Ilimitadas', idriel: 'Ilimitadas' },
    { label: 'Artigos no Codex', semente: '1', raiz: 'Ilimitados', idriel: 'Ilimitados' },
    { label: 'Manuscrito & Cenas', semente: true, raiz: true, idriel: true },
    { label: 'Escrita Livre', semente: true, raiz: true, idriel: true },
    { label: 'Kanban de Cenas', semente: true, raiz: true, idriel: true },
    { label: '11 Frutos de Worldbuilding', semente: true, raiz: true, idriel: true },
    { label: 'Galeria de Referências', semente: true, raiz: true, idriel: true },
    { label: 'Timer Pomodoro', semente: true, raiz: true, idriel: true },
    { label: 'Exportação PDF', semente: false, raiz: true, idriel: true },
    { label: 'Exportação Word (.docx)', semente: false, raiz: true, idriel: true },
    { label: 'Exportação Kindle/E-book', semente: false, raiz: true, idriel: true },
    { label: 'Assistente IA (Idriel)', semente: false, raiz: false, idriel: true },
    { label: 'Geração de Imagens IA', semente: false, raiz: false, idriel: true },
    { label: 'Geração de Mapas IA', semente: false, raiz: false, idriel: true },
    { label: 'Análise de Mundo IA', semente: false, raiz: false, idriel: true },
    { label: '100 gotas de Seiva/mês', semente: false, raiz: false, idriel: true },
  ];

  const renderCellValue = (val: boolean | string) => {
    if (typeof val === 'string') return <span className="font-montserrat font-bold text-xs">{val}</span>;
    return val
      ? <Check className="w-4 h-4 text-emerald-400 mx-auto" />
      : <X className="w-4 h-4 text-muted-foreground/30 mx-auto" />;
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none z-0" style={{ background: '#02070d' }} />

      {/* Navigation */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-20 border-b border-border/50"
      >
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <span className="font-cinzel font-bold text-lg text-foreground">
            🌳 A Árvore <span className="text-blue-light">dos Mundos</span>
          </span>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/login')} className="px-4 py-2 text-xs font-montserrat font-bold text-text-secondary hover:text-foreground transition-colors">
              Entrar
            </button>
            <button onClick={() => navigate('/login')} className="px-5 py-2 rounded-lg bg-primary/80 hover:bg-primary text-primary-foreground text-xs font-montserrat font-bold transition-colors">
              Criar Conta Grátis
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Hero with Parallax */}
      <section className="relative z-10 overflow-hidden">
        <motion.div className="absolute inset-0 z-0" style={{ y: heroY, opacity: heroOpacity }}>
          <img src={treeWallpaper} alt="" className="w-full h-full object-cover opacity-30 scale-110" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
        </motion.div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 pt-20 pb-24 text-center">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}
            className="inline-block mb-6 px-4 py-1.5 rounded-full border border-gold/20 bg-gold/[0.06]">
            <span className="font-cinzel text-xs tracking-[0.15em] text-gold-light">✦ Universo STORIA ✦</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="font-cinzel font-bold text-4xl sm:text-5xl md:text-6xl text-foreground mb-4 leading-tight"
          >
            Construa mundos<br />
            <span className="text-blue-light">extraordinários</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="font-merriweather italic text-text-secondary text-lg sm:text-xl max-w-2xl mx-auto mb-8 leading-relaxed"
          >
            O template definitivo de worldbuilding com IA integrada.
            Crie universos complexos em horas — não meses.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(33,150,243,0.4)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/login')}
              className="px-8 py-3.5 rounded-xl bg-primary hover:bg-[hsl(var(--blue-bright))] text-primary-foreground font-montserrat font-bold text-sm uppercase tracking-wider transition-colors shadow-[0_0_30px_rgba(33,150,243,0.2)]"
            >
              <Sparkles className="w-4 h-4 inline mr-2" />
              Começar Grátis
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => document.getElementById('planos')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-6 py-3.5 rounded-xl border border-border hover:border-blue-bright/30 text-foreground font-montserrat font-bold text-sm transition-all"
            >
              Ver Planos
            </motion.button>
          </motion.div>

          {/* Stats */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="flex items-center justify-center gap-8 mt-12"
          >
            {[
              { num: '11', label: 'Pilares de criação' },
              { num: '∞', label: 'Mundos possíveis' },
              { num: '100%', label: 'Em português' },
            ].map((s, i) => (
              <motion.div key={s.label} variants={fadeUp} custom={i + 5} className="text-center">
                <span className="font-cinzel font-bold text-2xl text-blue-light block">{s.num}</span>
                <span className="font-montserrat text-[10px] text-text-dim uppercase tracking-wider">{s.label}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features — staggered cards */}
      <section className="relative z-10 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={fadeUp}
            className="text-center mb-14"
          >
            <h2 className="font-cinzel font-bold text-3xl text-foreground mb-3">
              Tudo que você precisa para <span className="text-blue-light">criar mundos</span>
            </h2>
            <p className="font-merriweather italic text-text-dim text-sm max-w-xl mx-auto">
              Um ecossistema completo de ferramentas, organizado para fluir com sua criatividade
            </p>
          </motion.div>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                variants={scaleIn}
                custom={i}
                whileHover={{ y: -6, borderColor: 'hsl(207, 90%, 61%, 0.4)', transition: { duration: 0.2 } }}
                className="rounded-xl border border-border/60 bg-card/50 p-6 transition-colors group cursor-default"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-blue-light mb-4 group-hover:bg-primary/20 transition-colors">
                  {f.icon}
                </div>
                <h3 className="font-cinzel font-bold text-sm text-foreground mb-2">{f.title}</h3>
                <p className="font-montserrat text-xs text-text-dim leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Idriel showcase */}
      <section className="relative z-10 py-20">
        <div className="max-w-4xl mx-auto px-4">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={fadeUp}
            className="rounded-2xl border-2 border-gold/30 p-8 sm:p-12 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, rgba(200,146,42,0.08) 0%, rgba(200,146,42,0.02) 100%)' }}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[300px] rounded-full" style={{ background: 'radial-gradient(ellipse at center, rgba(218,165,32,0.12) 0%, transparent 70%)', filter: 'blur(60px)' }} />
            <div className="relative text-center">
              <motion.img
                src={idrielAvatar} alt="Idriel"
                initial={{ scale: 0.6, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, type: 'spring', stiffness: 200 }}
                className="w-16 h-16 rounded-full border-2 border-gold/50 mx-auto mb-4 shadow-[0_0_30px_rgba(218,165,32,0.3)]"
              />
              <h2 className="font-cinzel font-bold text-3xl text-gold-light mb-2">Conheça Idriel</h2>
              <p className="font-merriweather italic text-text-secondary text-sm mb-8 max-w-lg mx-auto">
                A Guardiã da Árvore dos Mundos — uma IA criativa que entende worldbuilding como nenhuma outra ferramenta.
              </p>

              <motion.div
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8"
              >
                {[
                  { icon: '📝', label: 'Texto IA Premium', sub: 'Gemini 2.5 Pro' },
                  { icon: '🎨', label: 'Imagens IA HD', sub: 'Gemini 3 Pro Image' },
                  { icon: '🗺️', label: 'Mapas IA', sub: 'Cartografia única' },
                  { icon: '📖', label: 'Análise de Mundo', sub: 'Coerência narrativa' },
                ].map((item, i) => (
                  <motion.div
                    key={item.label}
                    variants={scaleIn}
                    custom={i}
                    whileHover={{ scale: 1.08, transition: { duration: 0.2 } }}
                    className="p-4 rounded-lg bg-gold/[0.06] border border-gold/15 cursor-default"
                  >
                    <span className="text-2xl block mb-2">{item.icon}</span>
                    <span className="font-montserrat font-bold text-[11px] text-gold-light block">{item.label}</span>
                    <span className="font-montserrat text-[10px] text-text-dim">{item.sub}</span>
                  </motion.div>
                ))}
              </motion.div>

              <motion.button
                whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(218,165,32,0.4)' }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/login')}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--idriel-light))] text-[#1a0f00] font-montserrat font-bold text-sm uppercase tracking-wider transition-colors"
              >
                ✨ Experimentar Idriel
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Market comparison */}
      <section className="relative z-10 py-20 bg-card/30">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={fadeUp}
            className="text-center mb-10"
          >
            <h2 className="font-cinzel font-bold text-3xl text-foreground mb-3">
              Por que Idriel é <span className="text-gold-light">imbatível</span>?
            </h2>
            <p className="font-merriweather italic text-text-dim text-sm max-w-2xl mx-auto">
              Para ter o mesmo que Idriel oferece, você precisaria de 4 ferramentas separadas — gastando até <strong className="text-destructive">R$ 329+/mês</strong>
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10"
          >
            {competitors.map((c, i) => (
              <motion.div
                key={c.name}
                variants={scaleIn}
                custom={i}
                whileHover={{
                  scale: 1.05,
                  borderColor: 'hsl(4, 82%, 56%, 0.5)',
                  boxShadow: '0 8px 30px rgba(220, 38, 38, 0.1)',
                  transition: { duration: 0.2 },
                }}
                className="rounded-xl border border-destructive/20 bg-destructive/[0.03] p-4 cursor-default"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{c.icon}</span>
                  <span className="font-montserrat font-bold text-xs text-foreground">{c.name}</span>
                </div>
                <span className="font-montserrat font-bold text-lg text-destructive block mb-3">{c.price}</span>
                <ul className="space-y-1.5">
                  {c.has.map(f => (
                    <li key={f} className="flex items-center gap-1.5 text-[11px]">
                      <Check className="w-3 h-3 text-emerald-400/60 shrink-0" />
                      <span className="font-montserrat text-foreground/70">{f}</span>
                    </li>
                  ))}
                  {c.missing.map(f => (
                    <li key={f} className="flex items-center gap-1.5 text-[11px]">
                      <X className="w-3 h-3 text-destructive/60 shrink-0" />
                      <span className="font-montserrat text-text-dim">{f}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.div>

          {/* Idriel vs all */}
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className="rounded-2xl border-2 border-gold/30 p-6 text-center"
            style={{ background: 'linear-gradient(135deg, rgba(200,146,42,0.08) 0%, rgba(200,146,42,0.02) 100%)' }}
          >
            <div className="flex items-center justify-center gap-3 mb-2">
              <img src={idrielAvatar} alt="Idriel" className="w-8 h-8 rounded-full border border-gold/50" />
              <span className="font-cinzel font-bold text-xl text-gold-light">✨ Idriel — Tudo em um</span>
            </div>
            <div className="flex items-baseline justify-center gap-2 mb-2">
              <span className="font-montserrat font-bold text-3xl text-gold-light">R$ 29,90</span>
              <span className="text-text-dim font-montserrat text-sm">/mês</span>
            </div>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 mb-4"
            >
              <span className="font-montserrat font-bold text-sm text-emerald-400">
                Economia de até R$ 300/mês
              </span>
            </motion.div>
            <p className="font-merriweather italic text-text-dim text-xs">
              Worldbuilding + IA de texto + IA de imagens + manuscrito + exportação
            </p>
          </motion.div>
        </div>
      </section>

      {/* Pricing */}
      <section id="planos" className="relative z-10 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={fadeUp}
            className="text-center mb-10"
          >
            <h2 className="font-cinzel font-bold text-3xl text-foreground mb-3">
              Escolha seu <span className="text-gold-light">Caminho</span>
            </h2>
            <p className="font-merriweather italic text-text-dim text-sm max-w-lg mx-auto">
              Da semente à Árvore plena — cada jornada começa com um passo.
            </p>
          </motion.div>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3 mb-10">
            <button
              onClick={() => setBillingCycle('mensal')}
              className={`px-4 py-2 rounded-full text-xs font-montserrat font-bold uppercase tracking-wider transition-all ${
                billingCycle === 'mensal' ? 'bg-gold/20 text-gold-light border border-gold/40' : 'text-text-dim border border-border hover:border-gold/20'
              }`}
            >Mensal</button>
            <button
              onClick={() => setBillingCycle('anual')}
              className={`px-4 py-2 rounded-full text-xs font-montserrat font-bold uppercase tracking-wider transition-all relative ${
                billingCycle === 'anual' ? 'bg-gold/20 text-gold-light border border-gold/40' : 'text-text-dim border border-border hover:border-gold/20'
              }`}
            >
              Anual
              <span className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-emerald-500 text-[8px] text-white rounded-full font-bold">-22%</span>
            </button>
          </div>

          {/* Tier cards — staggered */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-16"
          >
            {tiers.map((tier, i) => (
              <motion.div
                key={tier.id}
                variants={scaleIn}
                custom={i}
                whileHover={{ y: -8, transition: { duration: 0.2 } }}
                className={`relative rounded-2xl border p-6 transition-colors ${tier.accent} ${tier.accentBg} ${
                  tier.popular ? 'md:-mt-4 md:mb-0 md:pb-8 shadow-[0_0_40px_rgba(218,165,32,0.12)]' : ''
                }`}
                style={tier.popular ? { background: 'linear-gradient(180deg, rgba(200,146,42,0.08) 0%, rgba(200,146,42,0.02) 100%)' } : {}}
              >
                {tier.popular && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4, type: 'spring', stiffness: 400 }}
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--idriel-light))] text-[10px] font-montserrat font-bold uppercase tracking-widest text-[#1a0f00]"
                  >
                    ✨ Mais Popular
                  </motion.div>
                )}

                <div className="text-center mb-6">
                  <h3 className={`font-cinzel font-bold text-xl mb-1 ${tier.accentText}`}>{tier.name}</h3>
                  <p className="font-merriweather italic text-text-dim text-xs mb-4">{tier.tagline}</p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className={`font-montserrat font-bold text-3xl ${tier.accentText}`}>{tier.price}</span>
                    <span className="text-text-dim text-xs font-montserrat">{tier.priceDetail}</span>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={tier.ctaAction}
                  className={`w-full py-3 rounded-xl text-sm font-montserrat font-bold uppercase tracking-wider transition-colors mb-6 ${tier.ctaClass}`}
                >
                  {tier.cta}
                </motion.button>

                <ul className="space-y-2.5">
                  {tier.highlights.map(h => (
                    <li key={h} className="flex items-center gap-2 text-xs">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="text-foreground/80 font-montserrat">{h}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.div>

          {/* Recharge */}
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className="rounded-2xl border border-gold/20 p-5 mb-16 text-center"
            style={{ background: 'linear-gradient(135deg, rgba(200,146,42,0.06) 0%, rgba(200,146,42,0.02) 100%)' }}
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-gold-light" />
              <span className="font-cinzel font-bold text-lg text-gold-light">Recarga de Seiva Dourada</span>
            </div>
            <p className="font-merriweather italic text-text-dim text-sm">
              Acabou a Seiva? Recarregue +100 gotas por apenas <strong className="text-gold-light">R$ 15,00</strong> — sem assinar nada.
            </p>
          </motion.div>

          {/* Feature comparison table */}
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }} variants={fadeUp}
            className="mb-16"
          >
            <h3 className="font-cinzel font-bold text-2xl text-center text-foreground mb-2">Comparação Completa</h3>
            <p className="font-merriweather italic text-text-dim text-sm text-center mb-8">Todas as funcionalidades, lado a lado</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-montserrat font-bold text-[10px] uppercase tracking-wider text-text-dim w-1/4">Funcionalidade</th>
                    <th className="text-center py-3 px-3 font-montserrat font-bold text-[10px] uppercase tracking-wider text-emerald-400 w-1/4">🌱 Semente</th>
                    <th className="text-center py-3 px-3 font-montserrat font-bold text-[10px] uppercase tracking-wider text-blue-light w-1/4">🌿 Raiz</th>
                    <th className="text-center py-3 px-3 font-montserrat font-bold text-[10px] uppercase tracking-wider text-gold-light w-1/4">✨ Idriel</th>
                  </tr>
                </thead>
                <tbody>
                  {featureComparison.map((f, i) => (
                    <tr key={f.label} className={`border-b border-border/50 ${i % 2 === 0 ? 'bg-white/[0.01]' : ''}`}>
                      <td className="py-2.5 px-4 font-montserrat text-xs text-foreground/80">{f.label}</td>
                      <td className="py-2.5 px-3 text-center">{renderCellValue(f.semente)}</td>
                      <td className="py-2.5 px-3 text-center">{renderCellValue(f.raiz)}</td>
                      <td className="py-2.5 px-3 text-center">{renderCellValue(f.idriel)}</td>
                    </tr>
                  ))}
                  <tr className="border-b border-border/50">
                    <td className="py-2.5 px-4 font-montserrat text-xs font-bold text-foreground">Preço</td>
                    <td className="py-2.5 px-3 text-center font-montserrat font-bold text-xs text-emerald-400">Grátis</td>
                    <td className="py-2.5 px-3 text-center font-montserrat font-bold text-xs text-blue-light">R$ 87/ano</td>
                    <td className="py-2.5 px-3 text-center font-montserrat font-bold text-xs text-gold-light">
                      R$ 29,90/mês<br /><span className="text-[10px] text-text-dim">ou R$ 279/ano</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA final */}
      <section className="relative z-10 py-20 text-center">
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
          className="max-w-2xl mx-auto px-4"
        >
          <h2 className="font-cinzel font-bold text-3xl text-foreground mb-4">
            Sua história merece um <span className="text-blue-light">mundo extraordinário</span>
          </h2>
          <p className="font-merriweather italic text-text-dim text-sm mb-8">
            Comece grátis, evolua quando quiser. A Árvore dos Mundos aguarda seu primeiro fruto.
          </p>
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(33,150,243,0.4)' }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/login')}
            className="px-10 py-4 rounded-xl bg-primary hover:bg-[hsl(var(--blue-bright))] text-primary-foreground font-montserrat font-bold text-sm uppercase tracking-wider transition-colors shadow-[0_0_30px_rgba(33,150,243,0.2)]"
          >
            <ArrowRight className="w-4 h-4 inline mr-2" />
            Começar a Criar — Grátis
          </motion.button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/30 py-8 text-center">
        <p className="font-montserrat text-[11px] text-text-dim">
          © {new Date().getFullYear()} Universo STORIA · A Árvore dos Mundos
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;
