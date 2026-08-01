import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Sparkles, Leaf, Crown, BookOpen, Library, Image as ImageIcon,
  Feather, ShieldCheck, ArrowRight, LogIn, Check, Play,
  FileText, Layers, Upload, Lock, Quote, Droplet,
  ChevronDown, Trees, Star, FileDown, Brain, Timer,
} from 'lucide-react';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { openCheckout, PLANS } from '@/hooks/useSubscription';
import { useAuth } from '@/contexts/AuthContext';

import hero640 from '@/assets/arvore-mundos-hero-640.webp.asset.json';
import hero960 from '@/assets/arvore-mundos-hero-960.webp.asset.json';
import hero1280 from '@/assets/arvore-mundos-hero-1280.webp.asset.json';
import hero1600 from '@/assets/arvore-mundos-hero-1600.webp.asset.json';
import heroVideo1080 from '@/assets/arvore-hero-loop-1080.mp4.asset.json';
import heroVideo720 from '@/assets/arvore-hero-loop-720.mp4.asset.json';
import heroVideo480 from '@/assets/arvore-hero-loop-480.mp4.asset.json';
import idrielVideo from '@/assets/idriel-animated.mp4.asset.json';
import idrielPoster from '@/assets/idriel-avatar.webp';
import previewConstruir from '@/assets/plataforma-preview-construir.png.asset.json';
import ebookMockup from '@/assets/ebook-mockup-devices.png.asset.json';
import { DemoVideo } from '@/components/marketing/DemoVideo';
import { Reveal } from '@/components/marketing/Reveal';
import { useSmoothScroll } from '@/components/marketing/useSmoothScroll';
import vidFichas from '@/assets/demo-fichas-frutos.mp4.asset.json';
import vidFichasPoster from '@/assets/demo-fichas-frutos.jpg.asset.json';
import vidCodex from '@/assets/demo-codex-analise.mp4.asset.json';
import vidCodexPoster from '@/assets/demo-codex-analise.jpg.asset.json';
import vidIdriel from '@/assets/demo-consultar-idriel.mp4.asset.json';
import vidIdrielPoster from '@/assets/demo-consultar-idriel.jpg.asset.json';
import vidExport from '@/assets/demo-exportar-manuscrito.mp4.asset.json';
import vidExportPoster from '@/assets/demo-exportar-manuscrito.jpg.asset.json';
import vidImagem from '@/assets/demo-gerar-imagem.mp4.asset.json';
import vidImagemPoster from '@/assets/demo-gerar-imagem.jpg.asset.json';

const heroSrcSet = `${hero640.url} 640w, ${hero960.url} 960w, ${hero1280.url} 1280w, ${hero1600.url} 1600w`;

// Feature flag: importação só aparece quando estável + testada
const SHOW_IMPORT_BLOCK = true;

/* -------------------------------------------------------------------------- */
/*  Primitivas editoriais                                                      */
/* -------------------------------------------------------------------------- */

const Shell: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`w-full max-w-[1240px] mx-auto px-5 sm:px-8 ${className}`}>{children}</div>
);

/** Seção com respiro generoso e sem cortes horizontais rígidos. */
const Band: React.FC<{
  id?: string;
  children: React.ReactNode;
  className?: string;
  tone?: 'none' | 'mist' | 'deep';
}> = ({ id, children, className = '', tone = 'none' }) => (
  <section id={id} className={`relative ${id ? 'scroll-mt-24' : ''} py-24 sm:py-32 lg:py-[150px] ${className}`}>
    {tone !== 'none' && (
      <div
        aria-hidden
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{
          background:
            tone === 'mist'
              ? 'radial-gradient(120% 60% at 50% 0%, hsl(210 70% 12% / 0.55) 0%, transparent 62%), radial-gradient(90% 50% at 50% 100%, hsl(38 55% 30% / 0.10) 0%, transparent 65%)'
              : 'radial-gradient(130% 70% at 20% 20%, hsl(214 65% 9% / 0.9) 0%, transparent 70%), radial-gradient(100% 60% at 85% 80%, hsl(38 55% 28% / 0.12) 0%, transparent 68%)',
        }}
      />
    )}
    {children}
  </section>
);

const Eyebrow: React.FC<{ children: React.ReactNode; Icon?: React.ElementType }> = ({ children, Icon }) => (
  <span className="inline-flex items-center gap-2 font-manrope font-semibold uppercase tracking-[0.32em] text-[10px] text-gold-champagne/80 mb-5">
    {Icon && <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />}
    {children}
    <span aria-hidden className="ml-1 h-px w-10 bg-gradient-to-r from-gold-champagne/50 to-transparent" />
  </span>
);

const Title: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <h2 className={`font-cinzel font-bold text-[clamp(1.6rem,3vw,2.4rem)] leading-[1.24] tracking-[-0.01em] ${className}`}>
    {children}
  </h2>
);

/** Cabeçalho de seção centralizado — mesma estrutura em toda a página. */
const SectionHead: React.FC<{
  eyebrow: string;
  Icon?: React.ElementType;
  title: React.ReactNode;
  lede?: React.ReactNode;
  className?: string;
}> = ({ eyebrow, Icon, title, lede, className = '' }) => (
  <Reveal className={`text-center max-w-[68ch] mx-auto mb-14 sm:mb-16 ${className}`}>
    <Eyebrow Icon={Icon}>{eyebrow}</Eyebrow>
    <Title>{title}</Title>
    {lede && (
      <p className="font-manrope text-[15px] sm:text-base text-text-secondary leading-[1.9] max-w-[60ch] mx-auto mt-5">
        {lede}
      </p>
    )}
  </Reveal>
);

/** Retângulo arredondado de borda discreta — dá ordem e agrupamento ao conteúdo. */
const Panel: React.FC<{ children: React.ReactNode; className?: string; soft?: boolean }> = ({
  children, className = '', soft = false,
}) => (
  <div
    className={`rounded-2xl border ${soft ? 'border-gold/[0.07] bg-[rgba(4,12,24,0.28)]' : 'border-gold/[0.11] bg-[rgba(4,12,24,0.42)]'} backdrop-blur-[2px] p-6 sm:p-8 ${className}`}
  >
    {children}
  </div>
);

const Lede: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <p className={`font-manrope text-[15px] sm:text-base text-text-secondary leading-[1.9] max-w-[62ch] ${className}`}>
    {children}
  </p>
);

const CheckList: React.FC<{ items: string[]; columns?: 1 | 2; className?: string }> = ({ items, columns = 1, className = '' }) => (
  <ul className={`${columns === 2 ? 'sm:columns-2 sm:gap-x-10' : ''} space-y-2.5 ${className}`}>
    {items.map(t => (
      <li key={t} className="flex items-start gap-2.5 font-manrope text-[14.5px] text-text-secondary leading-[1.75] break-inside-avoid">
        <Check className="w-4 h-4 text-gold-champagne/80 mt-[4px] shrink-0" strokeWidth={2} />
        <span>{t}</span>
      </li>
    ))}
  </ul>
);

/** Legenda editorial padrão sob os vídeos — mesma hierarquia em toda a página. */
const VideoCaption: React.FC<{ kicker: string; title: string; children: React.ReactNode }> = ({ kicker, title, children }) => (
  <div className="mt-5 px-1">
    <p className="font-manrope font-semibold uppercase tracking-[0.2em] text-[10px] text-gold-champagne/80 mb-2">{kicker}</p>
    <h4 className="font-cinzel font-bold text-base text-foreground mb-2">{title}</h4>
    <p className="font-manrope text-[13.5px] text-text-secondary leading-[1.85] max-w-[50ch]">{children}</p>
  </div>
);


/** Momento de respiro: uma única frase forte sobre o fundo. */
const Breather: React.FC<{ children: React.ReactNode; sub?: string }> = ({ children, sub }) => (
  <section className="relative py-20 sm:py-28 lg:py-32">
    <div
      aria-hidden
      className="absolute inset-0 -z-10 pointer-events-none opacity-70"
      style={{ background: 'radial-gradient(60% 70% at 50% 50%, hsl(38 60% 42% / 0.10) 0%, transparent 70%)' }}
    />
    <Shell>
      <Reveal className="text-center">
        <p className="font-cinzel text-[clamp(1.35rem,2.6vw,2.1rem)] leading-[1.45] text-foreground/95 max-w-[24ch] sm:max-w-[32ch] mx-auto">
          {children}
        </p>
        {sub && (
          <p className="font-manrope text-sm text-text-dim leading-[1.8] mt-5 max-w-[52ch] mx-auto">{sub}</p>
        )}
      </Reveal>
    </Shell>
  </section>
);

/* -------------------------------------------------------------------------- */

const EBOOK_TESTIMONIALS = [
  {
    name: 'Mayara',
    quote:
      'Eu amei!! Eu gosto muito de criar mundos, mas geralmente são coisas bem aleatórias e com o material eu consegui estruturar minhas ideias!! Muito obrigada por compartilhar!!',
  },
  {
    name: 'Janderson',
    quote:
      'MUITO BOM! Para um criador de mundo e história de RPG como eu, está sendo ótimo! Destravei bloqueios que eu tinha, sem falar da comunidade que você pode trocar ideia com outros criadores.',
  },
  {
    name: 'Letícia Campos',
    quote:
      'Eu comprei e adorei, me ajudou muito na escrita do meu livro 😍😍❤️',
  },
];

const EbookTestimonials: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-12">
    {EBOOK_TESTIMONIALS.map((t, i) => (
      <Reveal as="figure" key={t.name} delay={i * 0.08} className="relative flex flex-col">
        <Quote className="w-6 h-6 text-gold-champagne/40 mb-4" strokeWidth={1.25} />
        <blockquote className="font-merriweather text-[14.5px] text-text-secondary leading-[1.9] flex-1">
          “{t.quote}”
        </blockquote>
        <figcaption className="flex items-center gap-3 mt-6">
          <span className="w-9 h-9 rounded-full border border-gold/25 bg-gold/[0.06] grid place-items-center font-cinzel font-bold text-sm text-gold-champagne">
            {t.name.charAt(0)}
          </span>
          <span>
            <span className="block font-cinzel font-bold text-sm text-foreground">{t.name}</span>
            <span className="block font-manrope uppercase tracking-[0.22em] text-[9px] text-text-dim mt-0.5">
              Leitor(a) do e-book
            </span>
          </span>
        </figcaption>
      </Reveal>
    ))}
  </div>
);

const TestimonialPlaceholder: React.FC<{ kind: 'ebook' | 'beta'; count: number }> = ({ kind, count }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-10">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex flex-col opacity-60">
        <Quote className="w-6 h-6 text-gold/25 mb-4" strokeWidth={1.25} />
        <div className="space-y-2.5 mb-6 flex-1">
          <div className="h-2 w-11/12 bg-gold/10 rounded-full" />
          <div className="h-2 w-9/12 bg-gold/10 rounded-full" />
          <div className="h-2 w-10/12 bg-gold/10 rounded-full" />
          <div className="h-2 w-7/12 bg-gold/10 rounded-full" />
        </div>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gold/10 border border-gold/15" />
          <div className="space-y-1.5">
            <div className="h-2 w-20 bg-gold/15 rounded-full" />
            <div className="h-1.5 w-14 bg-gold/10 rounded-full" />
          </div>
        </div>
      </div>
    ))}
    <p className="md:col-span-3 text-center font-merriweather italic text-xs text-text-dim mt-2">
      {kind === 'ebook'
        ? 'Em curadoria — depoimentos do e-book serão adicionados após seleção (4 a 6).'
        : 'Em curadoria — depoimentos de quem já usa a plataforma chegam em breve.'}
    </p>
  </div>
);

/* -------------------------------------------------------------------------- */

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const reduced = useReducedMotion();
  const [billing, setBilling] = useState<'mensal' | 'anual'>('anual');
  const [rechargesOpen, setRechargesOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useSmoothScroll(true);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Pular para âncora quando vier de /planos → /#planos etc.
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [location.hash]);

  const handleCheckout = async (planKey: keyof typeof PLANS) => {
    try {
      setCheckoutLoading(planKey);
      await openCheckout(PLANS[planKey].id);
    } catch (e) {
      console.error(e);
    } finally {
      setCheckoutLoading(null);
    }
  };

  const raizKey = billing === 'mensal' ? 'raiz_mensal' : 'raiz_anual';
  const idrielKey = billing === 'mensal' ? 'idriel_mensal' : 'idriel_anual';

  const goldButton =
    'group inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-manrope font-bold uppercase text-[11px] tracking-[0.2em] text-[#1a0f00] transition-all duration-500 ease-out hover:-translate-y-[3px]';
  const goldButtonStyle: React.CSSProperties = {
    background:
      'linear-gradient(135deg, hsl(42 55% 90%) 0%, hsl(40 50% 78%) 30%, hsl(34 42% 58%) 65%, hsl(30 30% 42%) 100%)',
    boxShadow:
      '0 10px 32px hsl(30 30% 20% / 0.5), 0 0 44px hsl(38 60% 45% / 0.28), inset 0 1px 0 hsl(42 60% 96% / 0.7), inset 0 -2px 0 hsl(28 32% 22% / 0.4)',
    border: '1px solid hsl(34 42% 50% / 0.6)',
  };

  return (
    <div className="min-h-screen bg-[#02070d] text-foreground overflow-x-hidden antialiased">
      {/* ============================== Navbar ============================== */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ease-out ${
          scrolled
            ? 'bg-[#02070d]/70 backdrop-blur-xl border-b border-gold/[0.08] shadow-[0_10px_40px_-24px_rgba(0,0,0,0.9)]'
            : 'bg-transparent border-b border-transparent'
        }`}
      >
        <Shell className="!px-5 sm:!px-8">
          <div className="h-16 flex items-center justify-between">
            <Link to="/" className="inline-flex items-center gap-2.5 group" aria-label="Árvore dos Mundos — início">
              <Leaf className="w-5 h-5 text-gold-champagne transition-opacity duration-500 group-hover:opacity-80" strokeWidth={1.5} />
              <span className="font-cinzel font-bold tracking-[0.06em] text-[13px] sm:text-sm">Árvore dos Mundos</span>
            </Link>
            <nav className="flex items-center gap-5 sm:gap-7">
              <a href="#tour" className="hidden md:inline font-manrope text-[13px] text-text-secondary hover:text-foreground transition-colors duration-300">
                A plataforma
              </a>
              <a href="#idriel" className="hidden md:inline font-manrope text-[13px] text-text-secondary hover:text-foreground transition-colors duration-300">
                Idriel
              </a>
              <a href="#planos" className="hidden sm:inline font-manrope text-[13px] text-text-secondary hover:text-foreground transition-colors duration-300">
                Planos
              </a>
              <a href="#faq" className="hidden sm:inline font-manrope text-[13px] text-text-secondary hover:text-foreground transition-colors duration-300">
                Perguntas
              </a>
              <Link
                to={user ? '/app' : '/login'}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-manrope font-bold uppercase tracking-[0.16em] border border-gold/25 text-gold-light/90 hover:text-gold-light hover:border-gold/45 hover:bg-gold/[0.06] transition-all duration-500"
              >
                <LogIn className="w-3.5 h-3.5" strokeWidth={1.75} /> {user ? 'Abrir App' : 'Entrar'}
              </Link>
            </nav>
          </div>
        </Shell>
      </header>

      {/* ============================== 1. HERO ============================= */}
      <section className="relative overflow-hidden min-h-[100svh] flex flex-col justify-center">
        <div aria-hidden className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <img
            src={hero1280.url}
            srcSet={heroSrcSet}
            sizes="100vw"
            width={1600}
            height={900}
            alt=""
            aria-hidden="true"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover object-center scale-[1.08]"
            style={{ filter: 'brightness(1.1) contrast(1.05) saturate(1.12)' }}
          />
          <video
            className="absolute inset-0 w-full h-full object-cover scale-[1.08]"
            poster={hero1280.url}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
            style={{ filter: 'brightness(1.1) contrast(1.05) saturate(1.12)' }}
          >
            <source src={heroVideo1080.url} type="video/mp4" media="(min-width: 1280px)" />
            <source src={heroVideo720.url} type="video/mp4" media="(min-width: 640px)" />
            <source src={heroVideo480.url} type="video/mp4" />
          </video>
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse at center, hsl(214 80% 3% / 0.20) 0%, hsl(214 80% 3% / 0.58) 55%, hsl(214 80% 3% / 0.94) 100%)',
            }}
          />
          <div
            className="absolute inset-0 opacity-45"
            style={{
              background:
                'radial-gradient(ellipse 55% 40% at 50% 42%, hsl(38 60% 45% / 0.18) 0%, transparent 72%)',
            }}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-72"
            style={{
              background: 'linear-gradient(to bottom, transparent 0%, rgba(2,7,13,0.5) 40%, #02070d 100%)',
            }}
          />
        </div>

        <Shell className="relative z-10 pt-32 sm:pt-36">

          <motion.div
            initial={reduced ? undefined : { opacity: 0, y: 20 }}
            animate={reduced ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-center"
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gold-warm/30 bg-[rgba(4,12,24,0.45)] backdrop-blur-md text-[10px] font-manrope font-bold uppercase tracking-[0.28em] text-gold-champagne/90">
              <Sparkles className="w-3 h-3" strokeWidth={1.75} /> Mais de 1.500 exemplares vendidos
            </span>

            <h1
              className="font-cinzel font-bold text-[clamp(1.9rem,4vw,3.1rem)] leading-[1.16] tracking-[-0.01em] mt-10 mb-8 mx-auto max-w-[19ch]"
              style={{ textShadow: '0 2px 28px rgba(2,7,13,0.95), 0 1px 8px rgba(2,7,13,0.85)' }}
            >
              Crie Mundos Fantásticos com a{' '}
              <span className="text-gradient-gold-hero">Plataforma Definitiva</span>{' '}
              de Worldbuilding.
            </h1>

            <p
              className="font-manrope text-[16.5px] sm:text-[18px] text-foreground/90 font-medium leading-[1.85] mb-11 max-w-[56ch] mx-auto"
              style={{ textShadow: '0 2px 20px rgba(2,7,13,0.95), 0 1px 6px rgba(2,7,13,0.9)' }}
            >
              Construa universos profundos com os <strong className="text-gold-champagne font-semibold">11 Frutos</strong>,
              organize tudo em um <strong className="text-gold-champagne font-semibold">Codex vivo</strong> com linha do tempo, mapas e galeria,
              escreva seus manuscritos capítulo a capítulo e exporte em PDF, Word ou Kindle — com{' '}
              <strong className="text-gold-champagne font-semibold">Idriel</strong> ao seu lado, sem entregar sua voz,
              suas escolhas ou sua autoria à inteligência artificial.
            </p>


            <div className="flex flex-wrap gap-3 justify-center">
              <a href="#planos" className={goldButton} style={goldButtonStyle}>
                <Crown className="w-4 h-4" strokeWidth={2} />
                Começar agora
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-500 group-hover:translate-x-1" strokeWidth={2.25} />
              </a>
              <a
                href="#tour"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl border border-gold-warm/30 bg-[rgba(2,7,13,0.45)] backdrop-blur-md text-gold-champagne hover:bg-gold/[0.08] hover:border-gold-warm/50 font-manrope font-bold uppercase text-[11px] tracking-[0.2em] transition-all duration-500"
              >
                <Play className="w-3.5 h-3.5" strokeWidth={2.25} /> Ver a plataforma por dentro
              </a>
            </div>

            <div
              className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2 mt-8 text-[11px] font-manrope text-text-dim tracking-[0.04em]"
              style={{ textShadow: '0 1px 10px rgba(2,7,13,0.85)' }}
            >
              <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-gold-champagne/80" strokeWidth={2} /> Acesso completo desde o 1º minuto</span>
              <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-gold-champagne/80" strokeWidth={2} /> Cancele a qualquer momento</span>
              <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-gold-champagne/80" strokeWidth={2} /> Seus conteúdos continuam sendo seus</span>
            </div>
          </motion.div>
        </Shell>

        {/* Prévia da interface aparecendo parcialmente no limite inferior da dobra */}
        <div className="relative z-10 mt-14 sm:mt-20 -mb-1">
          <motion.div
            initial={reduced ? undefined : { opacity: 0, y: 40 }}
            animate={reduced ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 1.4, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto w-[min(1100px,92vw)]"
          >
            <div
              className="relative rounded-t-2xl overflow-hidden border border-gold-warm/15 border-b-0"
              style={{ boxShadow: '0 -20px 90px -30px hsl(38 60% 45% / 0.35), 0 -8px 60px -20px rgba(0,0,0,0.9)' }}
            >
              <img
                src={previewConstruir.url}
                alt="Prévia da plataforma: aba Construir com os Frutos do Worldbuilding"
                loading="lazy"
                decoding="async"
                className="w-full h-[28vh] sm:h-[34vh] object-cover object-top"
              />

              <div
                aria-hidden
                className="absolute inset-0"
                style={{ background: 'linear-gradient(to bottom, rgba(2,7,13,0.25) 0%, rgba(2,7,13,0.55) 55%, #02070d 100%)' }}
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================== 2. PROBLEMA ========================= */}
      <Band tone="mist">
        <Shell>
          <SectionHead
            eyebrow="O ponto de partida"
            title={<>Você não tem falta de ideias. Tem ideias demais vivendo em <span className="text-gold-champagne">lugares diferentes</span>.</>}
            lede="Um personagem em um documento. A religião de um povo em uma anotação antiga. O mapa em uma pasta. A linha do tempo em uma planilha. O mundo se expande — mas a história não avança."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-[980px] mx-auto items-stretch">
            <Reveal className="h-full">
              <Panel soft className="h-full">
                <p className="font-manrope font-semibold uppercase tracking-[0.22em] text-[10px] text-red-300/70 mb-5">Antes</p>
                <ul className="space-y-2.5">
                  {['Documentos soltos no computador', 'Notas e rascunhos perdidos', 'Imagens em pastas diferentes', 'Planilhas para linha do tempo', 'Conversas com IA que somem do histórico'].map(t => (
                    <li key={t} className="flex gap-2.5 font-manrope text-[14px] text-text-dim leading-[1.75]">
                      <span className="text-red-300/50 mt-[1px]">×</span><span>{t}</span>
                    </li>
                  ))}
                </ul>
              </Panel>
            </Reveal>
            <Reveal delay={0.08} className="h-full">
              <Panel className="h-full">
                <p className="font-manrope font-semibold uppercase tracking-[0.22em] text-[10px] text-gold-champagne mb-5">Com a Árvore dos Mundos</p>
                <CheckList items={['Mundo centralizado em um só lugar', 'Codex vivo de fichas e artigos', 'Galeria de referências e mapas', 'Manuscritos com capítulos e Storylines', 'Idriel contextual conhece o que você criou']} />
              </Panel>
            </Reveal>
          </div>

          <Reveal delay={0.1}>
            <p className="font-merriweather italic text-text-dim leading-[1.9] mt-10 max-w-[58ch] mx-auto text-center">
              A Árvore dos Mundos reúne esse processo em um único ambiente: da construção do universo à escrita do manuscrito.
            </p>
          </Reveal>
        </Shell>
      </Band>


      {/* ============================== 3. COMO FUNCIONA ==================== */}
      <Band id="tour">
        <Shell>
          <SectionHead
            eyebrow="Como funciona"
            title="Da primeira semente ao manuscrito."
            lede="A Árvore dos Mundos organiza o processo de criação em quatro movimentos."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
            {[
              { n: '01', title: 'Plante', desc: 'Crie seu mundo e registre a ideia que dará origem a ele. Você não precisa saber tudo antes de começar.', Icon: Leaf },
              { n: '02', title: 'Cultive', desc: 'Desenvolva povos, lugares, culturas, conflitos, sistemas e linguagens pelos 11 Frutos do Worldbuilding.', Icon: Trees },
              { n: '03', title: 'Organize', desc: 'Transforme descobertas em fichas e artigos dentro de um Codex vivo, criado para conectar cada parte do universo.', Icon: Library },
              { n: '04', title: 'Escreva', desc: 'Leve tudo o que foi construído para seus manuscritos, capítulos e Storylines.', Icon: Feather },
            ].map((s, i) => (
              <Reveal key={s.n} delay={i * 0.07} className="h-full">
                <Panel soft className="h-full group transition-colors duration-500 hover:border-gold/25">
                  <div className="flex items-center justify-between mb-5">
                    <s.Icon className="w-5 h-5 text-gold-champagne/75" strokeWidth={1.5} />
                    <span className="font-cinzel font-bold text-gold-champagne/30 text-2xl transition-colors duration-500 group-hover:text-gold-champagne/55">
                      {s.n}
                    </span>
                  </div>
                  <h3 className="font-cinzel font-bold text-lg mb-2.5">{s.title}</h3>
                  <p className="font-manrope text-[13.5px] text-text-secondary leading-[1.85]">{s.desc}</p>
                </Panel>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.1}>
            <p className="font-merriweather italic text-sm text-text-dim mt-12 text-center max-w-[58ch] mx-auto">
              Nas próximas seções você vê cada movimento acontecendo na tela — gravado direto da plataforma.
            </p>
          </Reveal>
        </Shell>
      </Band>

      {/* ============================== 4. 11 FRUTOS ======================== */}
      <Band tone="mist">
        <Shell>
          <SectionHead
            eyebrow="Os 11 Frutos"
            Icon={Trees}
            title="Você não precisa construir um universo diante de uma página vazia."
            lede="Muitos criadores sabem que desejam construir um mundo profundo, mas não sabem qual pergunta fazer primeiro. Os 11 Frutos organizam as grandes dimensões do worldbuilding e mostram o que ainda pode ser desenvolvido."
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-stretch">
            <Reveal className="h-full">
              <Panel className="h-full flex flex-col justify-center">
                <CheckList
                  items={[
                    'Explicações sobre cada aspecto do mundo',
                    'Perguntas guiadas e campos de construção',
                    'Orientações sobre fichas e artigos',
                    'Sugestões contextuais de Idriel',
                    'Caminhos Top-Down e Bottom-Up',
                  ]}
                />
                <p className="font-merriweather italic text-text-dim text-sm leading-[1.9] mt-7 pt-6 border-t border-gold/[0.10]">
                  Você pode começar por onde fizer mais sentido. Não existe obrigação de preencher tudo. Não existe uma ordem única.
                </p>
              </Panel>
            </Reveal>

            <Reveal delay={0.1} className="h-full">
              <Panel soft className="h-full">
                <DemoVideo
                  bare
                  src={vidFichas.url}
                  poster={vidFichasPoster.url}
                  kicker="Construir"
                  duration="45s"
                  title="Criando fichas através dos Frutos"
                  desc="Responda às perguntas de um Fruto e transforme a descoberta em ficha ou artigo do Codex."
                />
                <VideoCaption kicker="Construir · 45s" title="Criando fichas através dos Frutos">
                  Responda às perguntas de um Fruto e transforme a descoberta em ficha ou artigo do Codex sem sair do lugar — com autosave e apoio de Idriel.
                </VideoCaption>
              </Panel>
            </Reveal>
          </div>

          <Reveal delay={0.05} className="mt-20 lg:mt-24">
            <figure className="max-w-[820px] mx-auto mb-10">
              <img
                src={ebookMockup.url}
                alt="O e-book A Árvore dos Mundos exibido em celular, tablet e notebook"
                loading="lazy"
                decoding="async"
                className="w-full h-auto mx-auto"
                style={{ filter: 'drop-shadow(0 30px 70px rgba(0,0,0,0.55))' }}
              />
            </figure>
            <Panel className="max-w-[68ch] mx-auto text-center">
              <p className="font-manrope font-semibold uppercase tracking-[0.22em] text-[10px] text-gold-champagne/80 mb-4">
                Uma metodologia que já existia antes da plataforma
              </p>
              <h3 className="font-cinzel font-bold text-xl sm:text-2xl mb-4">Do e-book ao ambiente vivo</h3>
              <p className="font-manrope text-[14.5px] text-text-secondary leading-[1.9] max-w-[58ch] mx-auto">
                Os 11 Frutos nasceram no e-book <em>A Árvore dos Mundos</em>, uma metodologia de worldbuilding que já vendeu
                mais de <strong className="text-foreground font-semibold">1.500 exemplares</strong>. Agora, o método deixou de existir apenas
                nas páginas e se transformou em um ambiente vivo de criação.
              </p>
              <div className="inline-flex items-center gap-2 mt-6 text-[11px] font-manrope uppercase tracking-[0.2em] text-gold-champagne/80">
                <Star className="w-3.5 h-3.5" strokeWidth={2} /> +1.500 exemplares vendidos
              </div>
            </Panel>
          </Reveal>
        </Shell>
      </Band>


      {/* ============================== 5. CODEX ============================ */}
      <Band>
        <Shell>
          <SectionHead
            eyebrow="Codex"
            Icon={Library}
            title="Cada personagem, lugar e descoberta encontra seu lugar."
            lede="Um universo cresce por meio de relações: personagens pertencem a povos, povos ocupam territórios, religiões influenciam conflitos. O Codex reúne cada uma dessas partes dentro do mundo ao qual pertencem."
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-stretch">
            <Reveal className="h-full">
              <Panel soft className="h-full">
                <DemoVideo
                  bare
                  src={vidCodex.url}
                  poster={vidCodexPoster.url}
                  kicker="Codex"
                  duration="16s"
                  title="Análise de Mundo dentro do Codex"
                  desc="Idriel lê o que você registrou e devolve pontos fortes, lacunas e caminhos de aprofundamento."
                />
                <VideoCaption kicker="Codex · 16s" title="Análise de Mundo dentro do Codex">
                  Idriel lê tudo o que você registrou e devolve pontos fortes, lacunas, inconsistências e caminhos de aprofundamento — organizados por seção.
                </VideoCaption>
              </Panel>
            </Reveal>

            <Reveal delay={0.1} className="h-full">
              <div className="h-full grid grid-rows-2 gap-6">
                <Panel>
                  <FileText className="w-5 h-5 text-gold-champagne/80 mb-3" strokeWidth={1.4} />
                  <h3 className="font-cinzel font-bold text-base mb-2">Fichas</h3>
                  <p className="font-manrope text-[13.5px] text-text-secondary leading-[1.85]">
                    Para elementos objetivos: personagens, lugares, organizações e itens.
                  </p>
                </Panel>
                <Panel>
                  <BookOpen className="w-5 h-5 text-gold-champagne/80 mb-3" strokeWidth={1.4} />
                  <h3 className="font-cinzel font-bold text-base mb-2">Artigos</h3>
                  <p className="font-manrope text-[13.5px] text-text-secondary leading-[1.85]">
                    Para conceitos amplos: sistemas mágicos, períodos históricos, religiões, culturas e acontecimentos.
                  </p>
                </Panel>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.08} className="mt-8">
            <Panel soft>
              <p className="font-manrope font-semibold uppercase tracking-[0.22em] text-[10px] text-gold-champagne/80 mb-5">
                O que você faz no Codex
              </p>
              <CheckList
                columns={2}
                items={[
                  'Criar fichas com imagens',
                  'Escrever artigos completos',
                  'Editar títulos e conteúdos diretamente',
                  'Organizar entradas por mundo',
                  'Importar conteúdos entre mundos',
                  'Consultar referências durante a escrita',
                  'Exportar entradas em PDF',
                  'Manter uma memória central do universo',
                ]}
              />
            </Panel>
          </Reveal>
        </Shell>
      </Band>


      <Breather>
        Um mundo não se constrói de uma vez. Ele cresce — e precisa de um lugar que cresça junto.
      </Breather>

      {/* ============================== 6. IDRIEL =========================== */}
      <section id="idriel" className="relative scroll-mt-24 py-24 sm:py-32 lg:py-[150px] overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 pointer-events-none"
          style={{
            background:
              'radial-gradient(70% 60% at 22% 45%, hsl(38 62% 42% / 0.16) 0%, transparent 68%), radial-gradient(80% 70% at 85% 30%, hsl(210 80% 40% / 0.12) 0%, transparent 70%), radial-gradient(120% 80% at 50% 50%, hsl(214 65% 7% / 0.85) 0%, transparent 75%)',
          }}
        />

        <Shell>
          <Reveal className="text-center mb-16 sm:mb-20">
            <Eyebrow Icon={Feather}>Idriel</Eyebrow>
            <p className="font-cinzel text-[clamp(1.6rem,3.4vw,2.7rem)] leading-[1.32] text-foreground max-w-[22ch] mx-auto">
              Conheça <span className="text-gradient-gold-hero">Idriel</span>,<br className="hidden sm:block" />{' '}
              a Protetora da Árvore dos Mundos.
            </p>
          </Reveal>
        </Shell>

        {/* Composição com a personagem ultrapassando o container */}
        <div className="relative w-full max-w-[1240px] mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-[42%_1fr] gap-12 lg:gap-14 items-center">
            <Reveal className="relative">

              <div
                aria-hidden
                className="absolute -inset-16 rounded-full blur-[90px] -z-10"
                style={{ background: 'radial-gradient(circle, hsl(38 62% 45% / 0.30) 0%, hsl(210 85% 45% / 0.14) 45%, transparent 72%)' }}
              />
              <motion.div
                initial={reduced ? undefined : { opacity: 0, scale: 0.97 }}
                whileInView={reduced ? undefined : { opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: '-10%' }}
                transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
                className="relative mx-auto w-[min(78vw,460px)] aspect-square rounded-full overflow-hidden"
                style={{
                  border: '1px solid hsl(34 42% 58% / 0.45)',
                  boxShadow:
                    '0 0 120px hsl(38 60% 45% / 0.38), 0 0 200px hsl(210 85% 45% / 0.14), inset 0 1px 0 hsl(var(--gold-cream) / 0.18)',
                }}
              >
                <video
                  className="w-full h-full object-cover object-top"
                  src={idrielVideo.url}
                  poster={idrielPoster}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="none"
                  aria-label="Idriel, a anfitriã élfica da Árvore dos Mundos"
                />
                <div
                  aria-hidden
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: 'radial-gradient(circle at 50% 85%, rgba(2,7,13,0.55) 0%, transparent 55%)' }}
                />
              </motion.div>
            </Reveal>

            <Reveal delay={0.12}>
              <Panel>
                <Title className="mb-5">
                  Uma inteligência que conhece seu mundo — sem tomar o lugar de quem o criou.
                </Title>
                <Lede>
                  Idriel é a assistente de worldbuilding da Árvore dos Mundos. Ela não existe para escrever o livro por você.
                  Ela existe para ajudar você a enxergar melhor o mundo que está construindo.
                </Lede>
                <CheckList
                  className="mt-7 pt-7 border-t border-gold/[0.10]"
                  columns={2}
                  items={[
                    'Fazer perguntas que aprofundam uma ideia',
                    'Sugerir possibilidades para cada Fruto',
                    'Identificar lacunas e inconsistências',
                    'Explorar consequências',
                    'Ajudar a criar sistemas, calendários e idiomas',
                    'Resumir descobertas e transformá-las em fichas/artigos',
                    'Analisar a coerência do universo',
                  ]}
                />
                <p className="font-cinzel text-lg text-gold-light mt-8">
                  Idriel sugere. Você decide. Você escreve.
                </p>
                <p className="font-merriweather italic text-text-dim text-sm leading-[1.9] mt-3 max-w-[54ch]">
                  A voz continua sendo sua. As escolhas continuam sendo suas. A autoria continua sendo sua.
                </p>
              </Panel>
            </Reveal>
          </div>
        </div>

        <Shell className="mt-16 lg:mt-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-stretch">
            <Reveal className="h-full">
              <Panel soft className="h-full flex flex-col justify-center">
                <div className="flex items-center gap-2.5 mb-4">
                  <Brain className="w-4 h-4 text-gold-champagne/80" strokeWidth={1.6} />
                  <h3 className="font-cinzel font-bold text-lg">Análise de Mundo</h3>
                </div>
                <p className="font-manrope text-[14.5px] text-text-secondary leading-[1.85] mb-6 max-w-[54ch]">
                  Idriel pode analisar o contexto construído e apresentar:
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {['Pontos fortes', 'Lacunas', 'Inconsistências', 'Furos narrativos', 'Oportunidades', 'Recomendações de aprofundamento'].map(t => (
                    <span key={t} className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-gold/[0.14] bg-gold/[0.03] text-[12.5px] font-manrope text-text-secondary transition-colors duration-500 hover:border-gold/30">
                      <span className="w-1 h-1 rounded-full bg-gold-champagne" />{t}
                    </span>
                  ))}
                </div>
              </Panel>
            </Reveal>

            <Reveal delay={0.1} className="h-full">
              <Panel soft className="h-full">
                <DemoVideo
                  bare
                  src={vidIdriel.url}
                  poster={vidIdrielPoster.url}
                  kicker="Ritual da Guardiã"
                  duration="23s"
                  title="Consultando Idriel dentro de um Fruto"
                  desc="Você traz a ideia, Idriel responde a partir do que já existe no seu mundo."
                />
                <VideoCaption kicker="Ritual da Guardiã · 23s" title="Consultando Idriel dentro de um Fruto">
                  Você traz a ideia, Idriel responde a partir do que já existe no seu mundo — e o resultado pode virar ficha ou artigo no Codex com um clique.
                </VideoCaption>
              </Panel>
            </Reveal>
          </div>
        </Shell>

      </section>

      {/* ============================== 7. OFÍCIO COMPLETO ================== */}
      <Band tone="mist">
        <Shell>
          <SectionHead
            eyebrow="O ofício completo"
            title="Do planejamento à escrita, sem abandonar o seu mundo."
            lede="Um mundo só ganha vida quando começa a afetar escolhas, conflitos, cenas e personagens. Por isso a Árvore reúne construção, organização e escrita dentro do mesmo ambiente."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:gap-8 items-stretch">
            {[
              {
                Icon: Feather, title: 'Manuscritos',
                items: ['Múltiplos manuscritos por mundo', 'Capítulos com autosave e contagem de palavras', 'Consulta ao Codex sem sair da página', 'Modo Zen para reduzir distrações', 'Exportação em PDF, Word e Kindle'],
              },
              {
                Icon: Layers, title: 'Storylines',
                items: ['Arcos e linhas narrativas em painéis visuais', 'Múltiplas Storylines · colunas renomeáveis', 'Cards arrastáveis · acompanhe conflitos e tramas'],
              },
              {
                Icon: ImageIcon, title: 'Galeria e Mapas',
                items: ['Reúna referências, personagens, cenários, objetos e mapas', 'Organize por mundo, Fruto ou categoria', 'Imagens geradas na plataforma salvas automaticamente'],
              },
              {
                Icon: Timer, title: 'Ferramentas de Foco',
                items: ['Pomodoro com intervalos configuráveis', 'Ciclos de trabalho e sons suaves', 'Ambiente de escrita mais imersivo'],
              },
            ].map((b, i) => (
              <Reveal key={b.title} delay={i * 0.07} className="h-full">
                <Panel soft className="h-full">
                  <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-gold/[0.10]">
                    <b.Icon className="w-5 h-5 text-gold-champagne/80" strokeWidth={1.4} />
                    <h3 className="font-cinzel font-bold text-lg">{b.title}</h3>
                  </div>
                  <CheckList items={b.items} />
                </Panel>
              </Reveal>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mt-8 items-stretch">
            <Reveal className="h-full">
              <Panel className="h-full">
                <DemoVideo
                  bare
                  src={vidExport.url}
                  poster={vidExportPoster.url}
                  kicker="Escrever"
                  duration="24s"
                  title="Exportando o manuscrito"
                  desc="Leve o manuscrito inteiro para PDF, Word ou Kindle."
                />
                <VideoCaption kicker="Escrever · 24s" title="Exportando o manuscrito">
                  Termine o capítulo e leve o manuscrito inteiro para PDF, Word ou Kindle — com capa, sumário e formatação pronta para revisão ou publicação.
                </VideoCaption>
              </Panel>
            </Reveal>
            <Reveal delay={0.1} className="h-full">
              <Panel className="h-full">
                <DemoVideo
                  bare
                  src={vidImagem.url}
                  poster={vidImagemPoster.url}
                  kicker="Galeria"
                  duration="27s"
                  title="Gerando uma Visão de Idriel"
                  desc="Retratos e paisagens fiéis ao seu Codex, arquivados automaticamente."
                />
                <VideoCaption kicker="Galeria · 27s" title="Gerando uma Visão de Idriel">
                  Escolha o estilo, descreva a cena e receba retratos e paisagens fiéis ao seu Codex — arquivados automaticamente na pasta certa da Galeria.
                </VideoCaption>
              </Panel>
            </Reveal>
          </div>
        </Shell>
      </Band>

      {/* ============================== 8. IMPORTAÇÃO ======================= */}
      {SHOW_IMPORT_BLOCK && (
        <Band>
          <Shell>
            <SectionHead
              eyebrow="Importação inteligente"
              Icon={Upload}
              title="Você não precisa começar outra vez."
              lede="Talvez seu mundo já exista há anos — em documentos, resumos, rascunhos e anotações. Você envia seus textos e Idriel identifica elementos que podem se transformar em fichas e artigos."
            />
            <Reveal>
              <Panel className="max-w-[900px] mx-auto text-center">
                <p className="font-manrope font-semibold uppercase tracking-[0.22em] text-[10px] text-gold-champagne/80 mb-5">
                  O que Idriel reconhece nos seus textos
                </p>
                <div className="flex flex-wrap justify-center gap-2.5">
                  {['Personagens', 'Lugares', 'Organizações', 'Povos', 'Acontecimentos', 'Sistemas', 'Objetos', 'Conceitos', 'Relações importantes'].map(t => (
                    <span key={t} className="px-3.5 py-1.5 rounded-full border border-gold/[0.14] bg-gold/[0.03] text-[12.5px] font-manrope text-text-secondary transition-colors duration-500 hover:border-gold/30">{t}</span>
                  ))}
                </div>
                <p className="font-manrope text-[14px] text-text-dim leading-[1.9] mt-7 max-w-[58ch] mx-auto">
                  Você recebe uma lista de sugestões: pode revisar, editar, ignorar, criar individualmente ou criar todas.
                  Seu trabalho anterior não precisa ser descartado para que você comece a utilizar a plataforma.
                </p>
              </Panel>
            </Reveal>
          </Shell>
        </Band>
      )}

      {/* ============================== 9. SEGURANÇA ======================== */}
      <Band tone="deep">
        <Shell>
          <SectionHead
            eyebrow="Segurança"
            Icon={ShieldCheck}
            title="Suas ideias pertencem a você. E continuarão pertencendo."
            lede="Personagens, mapas, sistemas, culturas e manuscritos ainda não publicados não são apenas dados — são propriedade intelectual. Segurança e privacidade são compromissos do produto."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6 items-stretch">
            {[
              { Icon: Lock, title: 'Conteúdos isolados por usuário', desc: 'Políticas de acesso impedem que uma conta consulte os mundos pertencentes a outra.' },
              { Icon: ShieldCheck, title: 'Conexão protegida', desc: 'A comunicação entre o navegador e a plataforma utiliza conexão criptografada.' },
              { Icon: FileDown, title: 'Exportação disponível', desc: 'Você pode retirar seus materiais nos formatos disponíveis em seu plano.' },
              { Icon: Crown, title: 'Seus mundos continuam sendo seus', desc: 'A plataforma não reivindica autoria sobre personagens, histórias, sistemas, mapas ou manuscritos criados pelo usuário.' },
              { Icon: Feather, title: 'Idriel não usa sua obra como propriedade', desc: 'A assistência processa o contexto necessário para executar as ações solicitadas, conforme a Política de Privacidade.' },
              { Icon: Layers, title: 'Exclusão de dados', desc: 'A plataforma oferece meios para excluir mundos, conteúdos e a própria conta, observadas as regras descritas nos termos.' },
            ].map((c, i) => (
              <Reveal key={c.title} delay={i * 0.05} className="h-full">
                <Panel soft className="h-full">
                  <c.Icon className="w-5 h-5 text-gold-champagne/75 mb-4" strokeWidth={1.4} />
                  <h3 className="font-cinzel font-bold text-[15px] mb-2.5 leading-snug">{c.title}</h3>
                  <p className="font-manrope text-[13.5px] text-text-secondary leading-[1.85]">{c.desc}</p>
                </Panel>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.1} className="text-center">
            <Link
              to="/seguranca"
              className="inline-flex items-center gap-2 mt-14 px-6 py-3 rounded-xl border border-gold/30 text-gold-light/90 hover:text-gold-light hover:border-gold/50 hover:bg-gold/[0.06] font-manrope font-bold uppercase text-[11px] tracking-[0.18em] transition-all duration-500 hover:-translate-y-[2px]"
            >
              <ShieldCheck className="w-4 h-4" strokeWidth={1.6} /> Conhecer nossa estrutura de segurança
            </Link>
          </Reveal>
        </Shell>
      </Band>


      {/* ============================== 10. PROVAS ========================== */}
      <Band>
        <Shell>
          <div className="space-y-24">
            <div>
              <SectionHead
                eyebrow="Quem já plantou"
                title="Antes de virar plataforma, a Árvore já ajudava escritores a construir mundos."
                lede="Estes depoimentos referem-se ao e-book e à metodologia original — não ao uso do aplicativo."
              />
              <EbookTestimonials />
            </div>

            <div>
              <SectionHead
                eyebrow="Primeiros mundos"
                title="Mundos que já começaram a criar raízes dentro da plataforma."
                lede="Primeiros usuários que estão construindo seus universos dentro da Árvore dos Mundos."
              />
              <TestimonialPlaceholder kind="beta" count={3} />
            </div>
          </div>

        </Shell>
      </Band>

      {/* ============================== 11. PLANOS ========================== */}
      <section id="planos" className="relative scroll-mt-24 py-24 sm:py-32 lg:py-[150px] overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 pointer-events-none"
          style={{
            background:
              'radial-gradient(90% 55% at 72% 45%, hsl(38 60% 42% / 0.13) 0%, transparent 68%), radial-gradient(120% 70% at 50% 0%, hsl(210 70% 12% / 0.5) 0%, transparent 60%)',
          }}
        />
        <Shell>
          <Reveal className="text-center mb-14">
            <Eyebrow>Planos</Eyebrow>
            <Title>Como você deseja cultivar seus mundos?</Title>
            <p className="font-manrope text-[15px] text-text-secondary max-w-[58ch] mx-auto leading-[1.9] mt-5">
              Experimente a experiência completa por <strong className="text-foreground font-semibold">14 dias</strong>, sem cartão.
              Ao final, escolha entre Raiz e Idriel. Seus mundos, fichas, artigos e manuscritos continuam salvos.
            </p>
          </Reveal>

          {/* Toggle billing */}
          <div className="flex items-center justify-center mb-16">
            <div className="inline-flex p-1 rounded-full border border-gold/20 bg-[rgba(4,12,24,0.5)] backdrop-blur-xl">
              <button
                onClick={() => setBilling('mensal')}
                aria-pressed={billing === 'mensal'}
                className={`px-7 py-2.5 rounded-full text-[11px] font-manrope font-bold uppercase tracking-[0.16em] transition-all duration-500 ${
                  billing === 'mensal' ? 'bg-gold text-background' : 'text-text-secondary hover:text-foreground'
                }`}
              >
                Mensal
              </button>
              <button
                onClick={() => setBilling('anual')}
                aria-pressed={billing === 'anual'}
                className={`relative px-7 py-2.5 rounded-full text-[11px] font-manrope font-bold uppercase tracking-[0.16em] transition-all duration-500 ${
                  billing === 'anual' ? 'bg-gold text-background' : 'text-text-secondary hover:text-foreground'
                }`}
              >
                Anual
                <span className="absolute -top-2.5 -right-4 px-2 py-0.5 bg-gold-champagne text-[8px] text-background rounded-full font-bold tracking-wide">
                  ECONOMIZE 2 MESES
                </span>
              </button>
            </div>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 max-w-[1080px] mx-auto items-start">
            {/* CRIADOR */}
            <Reveal>
              <div className="relative rounded-3xl p-8 sm:p-10 border border-gold/[0.12] bg-[rgba(4,12,24,0.45)] backdrop-blur-xl transition-transform duration-500 ease-out hover:-translate-y-1 flex flex-col">
                <p className="font-manrope font-semibold uppercase tracking-[0.26em] text-[9.5px] text-text-dim mb-5">
                  Para quem quer construir e escrever no próprio ritmo
                </p>
                <div className="flex items-center gap-2.5 mb-3">
                  <Leaf className="w-5 h-5 text-gold-champagne/80" strokeWidth={1.5} />
                  <h3 className="font-cinzel font-bold text-2xl">Criador</h3>
                </div>
                <p className="font-merriweather italic text-text-dim text-[13.5px] leading-[1.8] mb-7 max-w-[42ch]">
                  Toda a plataforma para construir, organizar e escrever seus mundos — com corretor AI Powered.
                </p>
                <div className="mb-1.5">
                  <span className="font-cinzel font-bold text-[2.6rem] leading-none">{billing === 'mensal' ? 'R$ 19,90' : 'R$ 197,90'}</span>
                  <span className="text-text-secondary text-sm font-manrope ml-1.5">{billing === 'mensal' ? '/mês' : '/ano'}</span>
                </div>
                <p className="text-[12.5px] font-manrope text-text-dim mb-8">
                  {billing === 'anual' ? 'Equivale a R$ 16,49 por mês · Economize R$ 40,90 no plano anual.' : 'Cobrança mensal · cancele quando quiser.'}
                </p>
                <button
                  onClick={() => handleCheckout(raizKey)}
                  disabled={checkoutLoading === raizKey}
                  className="w-full py-3.5 rounded-xl border border-gold/35 text-gold-light/90 hover:text-gold-light hover:bg-gold/[0.08] hover:border-gold/55 font-manrope font-bold uppercase text-[11px] tracking-[0.18em] transition-all duration-500 mb-9 disabled:opacity-50"
                >
                  {checkoutLoading === raizKey ? 'Abrindo…' : 'Escolher Criador'}
                </button>

                <div className="space-y-7">
                  <div>
                    <p className="font-manrope font-semibold uppercase tracking-[0.26em] text-[9.5px] text-gold-champagne/70 mb-3">Construção</p>
                    <CheckList items={['Mundos ilimitados', 'Os 11 Frutos do Worldbuilding', 'Codex ilimitado (fichas e artigos)', 'Linha do Tempo completa', 'Galeria de Referências']} />
                  </div>
                  <div>
                    <p className="font-manrope font-semibold uppercase tracking-[0.26em] text-[9.5px] text-gold-champagne/70 mb-3">Escrita e saída</p>
                    <CheckList items={['Manuscritos ilimitados', 'Exportação em PDF de Manuscritos, Fichas e Artigos', 'Corretor textual AI Powered (entende contexto)']} />
                  </div>
                  <div>
                    <p className="font-manrope font-semibold uppercase tracking-[0.26em] text-[9.5px] text-gold-champagne/70 mb-3">Experimentação</p>
                    <CheckList items={['5 gotas de Elixir no 1º mês (para experimentar a Idriel)']} />
                  </div>
                </div>
              </div>
            </Reveal>

            {/* IDRIEL */}
            <Reveal delay={0.12}>
              <div className="relative lg:scale-[1.03] lg:origin-top">
                <div
                  aria-hidden
                  className="absolute -inset-10 -z-10 blur-[70px] pointer-events-none"
                  style={{ background: 'radial-gradient(circle at 50% 30%, hsl(38 62% 45% / 0.26) 0%, transparent 70%)' }}
                />
                <div
                  className="relative rounded-3xl p-8 sm:p-10 border border-gold/35 backdrop-blur-xl transition-transform duration-500 ease-out hover:-translate-y-1 flex flex-col"
                  style={{
                    background:
                      'linear-gradient(160deg, hsl(38 55% 32% / 0.14) 0%, hsl(214 60% 4% / 0.9) 42%, hsl(214 60% 3% / 0.95) 100%)',
                    boxShadow: '0 40px 120px -50px hsl(38 60% 45% / 0.5), inset 0 1px 0 hsl(42 60% 90% / 0.10)',
                  }}
                >
                  <div className="absolute -top-3 left-10 px-3.5 py-1 rounded-full bg-gold text-background text-[9.5px] font-manrope font-bold uppercase tracking-[0.16em]">
                    Experiência Completa
                  </div>
                  <p className="font-manrope font-semibold uppercase tracking-[0.26em] text-[9.5px] text-gold-champagne/70 mb-5">
                    Para quem quer uma guardiã que conhece o mundo inteiro
                  </p>
                  <div className="flex items-center gap-2.5 mb-3">
                    <Crown className="w-5 h-5 text-gold-champagne" strokeWidth={1.5} />
                    <h3 className="font-cinzel font-bold text-2xl text-gold-light">Idriel</h3>
                  </div>
                  <p className="font-merriweather italic text-text-dim text-[13.5px] leading-[1.8] mb-7 max-w-[42ch]">
                    Toda a plataforma acompanhada por uma assistente que conhece seu mundo.
                  </p>
                  <div className="mb-1.5">
                    <span className="font-cinzel font-bold text-[2.6rem] leading-none text-gold-light">{billing === 'mensal' ? 'R$ 39,90' : 'R$ 397,90'}</span>
                    <span className="text-text-secondary text-sm font-manrope ml-1.5">{billing === 'mensal' ? '/mês' : '/ano'}</span>
                  </div>
                  <p className="text-[12.5px] font-manrope text-text-dim mb-8">
                    {billing === 'anual' ? 'Equivale a R$ 33,15 por mês · Economize R$ 80,90 no plano anual.' : 'Cobrança mensal · cancele quando quiser.'}
                  </p>
                  <button
                    onClick={() => handleCheckout(idrielKey)}
                    disabled={checkoutLoading === idrielKey}
                    className="w-full py-3.5 rounded-xl font-manrope font-bold uppercase text-[11px] tracking-[0.18em] text-[#1a0f00] transition-all duration-500 mb-9 disabled:opacity-50 hover:-translate-y-[2px]"
                    style={goldButtonStyle}
                  >
                    {checkoutLoading === idrielKey ? 'Abrindo…' : 'Continuar com Idriel'}
                  </button>

                  <p className="font-manrope font-semibold uppercase tracking-[0.22em] text-[10px] text-gold-champagne mb-6">Tudo do Criador, mais:</p>
                  <div className="space-y-7">
                    <div>
                      <p className="font-manrope font-semibold uppercase tracking-[0.26em] text-[9.5px] text-gold-champagne/70 mb-3">A Guardiã</p>
                      <CheckList items={['Idriel — assistente contextual de worldbuilding', 'Sugestões personalizadas em cada Fruto', 'Histórico de sugestões', 'Resumos para fichas e artigos']} />
                    </div>
                    <div>
                      <p className="font-manrope font-semibold uppercase tracking-[0.26em] text-[9.5px] text-gold-champagne/70 mb-3">Inteligência do mundo</p>
                      <CheckList items={['Análise de mundo em 6 dimensões', 'Identificação de inconsistências e lacunas', 'Importação inteligente de textos e documentos', 'Identificação automática de fichas e artigos']} />
                    </div>
                    <div>
                      <p className="font-manrope font-semibold uppercase tracking-[0.26em] text-[9.5px] text-gold-champagne/70 mb-3">Visões e cartografia</p>
                      <CheckList items={['Geração de imagens com inteligência artificial', 'Geração de mapas cartográficos']} />
                    </div>
                    <div>
                      <p className="font-manrope font-semibold uppercase tracking-[0.26em] text-[9.5px] text-gold-champagne/70 mb-3">Elixir dos Mundos</p>
                      <CheckList items={['100 gotas de Elixir dos Mundos por mês', 'Recargas avulsas a partir de R$ 4,90']} />
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Elixir */}
          <Reveal delay={0.08} className="mt-24 max-w-[860px] mx-auto">
            <div className="flex items-start gap-4 mb-6">
              <Droplet className="w-5 h-5 text-gold-champagne/80 mt-1 shrink-0" strokeWidth={1.4} />
              <div>
                <h3 className="font-cinzel font-bold text-lg mb-2.5">Como funciona o Elixir dos Mundos?</h3>
                <p className="font-manrope text-[14px] text-text-secondary leading-[1.9] max-w-[64ch]">
                  As gotas são utilizadas somente em ações que envolvem inteligência artificial. Antes de confirmar qualquer
                  ação, você vê quantas gotas serão consumidas. Os recursos tradicionais continuam disponíveis mesmo quando as gotas acabam.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2.5 mb-6 sm:pl-9">
              {['Consultas à Idriel', 'Análises de mundo', 'Geração de imagens', 'Geração de mapas', 'Importação de documentos', 'Outras ações inteligentes'].map(t => (
                <span key={t} className="px-3.5 py-1.5 rounded-full border border-gold/[0.12] bg-gold/[0.03] text-[12.5px] font-manrope text-text-secondary">{t}</span>
              ))}
            </div>

            <div className="sm:pl-9">
              <button
                onClick={() => setRechargesOpen(v => !v)}
                aria-expanded={rechargesOpen}
                className="inline-flex items-center gap-2 text-[11px] font-manrope font-bold uppercase tracking-[0.18em] text-gold-light/90 hover:text-gold transition-colors duration-500"
              >
                Recargas a partir de R$ 4,90
                <ChevronDown className={`w-4 h-4 transition-transform duration-500 ${rechargesOpen ? 'rotate-180' : ''}`} strokeWidth={2} />
              </button>
              {rechargesOpen && (
                <div className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-3 animate-fade-in">
                  {[
                    { gotas: 15, preco: 'R$ 4,90' },
                    { gotas: 25, preco: 'R$ 7,90' },
                    { gotas: 50, preco: 'R$ 14,90' },
                    { gotas: 100, preco: 'R$ 27,90' },
                    { gotas: 200, preco: 'R$ 54,90' },
                  ].map(r => (
                    <div key={r.gotas} className="rounded-xl border border-gold/[0.14] bg-gold/[0.03] p-3.5 text-center transition-transform duration-500 hover:-translate-y-[3px]">
                      <div className="font-cinzel font-bold text-lg text-gold-light">{r.gotas} gotas</div>
                      <div className="font-manrope text-[12.5px] text-text-secondary mt-1">{r.preco}</div>
                    </div>
                  ))}
                  <p className="col-span-2 sm:col-span-5 text-[11.5px] font-merriweather italic text-text-dim text-center mt-1">
                    Recargas disponíveis para assinantes Idriel.
                  </p>
                </div>
              )}
            </div>
          </Reveal>
        </Shell>
      </section>

      {/* ============================== 12. FAQ ============================ */}
      <Band id="faq" tone="mist">
        <div className="w-full max-w-[820px] mx-auto px-5 sm:px-8">
          <Reveal className="text-center mb-14">
            <Eyebrow>Perguntas comuns</Eyebrow>
            <Title>Tudo o que costuma ser perguntado antes de plantar.</Title>
          </Reveal>

          <Accordion type="single" collapsible className="w-full">
            {[
              {
                q: 'Idriel escreve meu livro por mim?',
                a: 'Não. Idriel é uma assistente de worldbuilding. Ela pode fazer perguntas, sugerir caminhos, identificar inconsistências e ajudar você a organizar suas descobertas. As decisões, a escrita, a voz e a autoria continuam sendo suas.',
              },
              {
                q: 'Preciso utilizar inteligência artificial?',
                a: 'Não. O plano Raiz oferece acesso à plataforma completa sem Idriel. Você pode construir, organizar e escrever seus mundos utilizando apenas os recursos tradicionais.',
              },
              {
                q: 'Meus conteúdos são usados para treinar inteligência artificial?',
                a: 'A Árvore dos Mundos não utiliza seus manuscritos, personagens e mundos como material próprio para treinar modelos. Quando você solicita uma ação de Idriel, o contexto necessário pode ser processado pelos serviços tecnológicos integrados, conforme nossa Política de Privacidade.',
              },
              {
                q: 'Minhas ideias ficam protegidas?',
                a: 'A plataforma utiliza autenticação, políticas de acesso e isolamento por usuário. Cada conta deve acessar apenas os conteúdos aos quais possui autorização. Também disponibilizamos uma página específica explicando os compromissos de segurança e privacidade.',
              },
              {
                q: 'Posso exportar o que criei?',
                a: 'Sim. As exportações disponíveis incluem PDF, Word e formatos compatíveis com Kindle, conforme o tipo de conteúdo e os recursos ativos na plataforma.',
              },
              {
                q: 'O que acontece quando o teste termina?',
                a: 'Nenhum mundo é apagado. Seus conteúdos permanecem salvos. Para continuar utilizando a plataforma, você escolhe entre Raiz e Idriel.',
              },
              {
                q: 'O que acontece se eu cancelar?',
                a: 'Você continua com acesso até o fim do período já pago. Depois disso, poderá escolher outro plano ou reativar sua assinatura. Os detalhes sobre armazenamento, retenção e acesso após cancelamento são descritos nos termos.',
              },
              {
                q: 'Preciso preencher todos os 11 Frutos?',
                a: 'Não. Você pode começar por qualquer Fruto, avançar no próprio ritmo e desenvolver apenas o que fizer sentido para a história.',
              },
              {
                q: 'A plataforma serve apenas para fantasia?',
                a: 'Não. A Árvore dos Mundos pode ser utilizada para fantasia, ficção científica, distopia, fantasia urbana, horror, história alternativa, RPG e outras narrativas que dependam de um universo consistente.',
              },
              {
                q: 'Posso usar um mundo que já comecei fora da plataforma?',
                a: 'Sim. Você pode inserir conteúdos manualmente, importar fichas e artigos entre mundos e, no plano Idriel, utilizar a importação inteligente de textos e documentos.',
              },
              {
                q: 'Posso criar mais de um mundo?',
                a: 'Sim. Os planos Raiz e Idriel oferecem mundos ilimitados.',
              },
              {
                q: 'Como funcionam as gotas?',
                a: 'As gotas de Elixir dos Mundos são consumidas apenas em ações que envolvem inteligência artificial. O custo aparece antes da confirmação. O plano Idriel recebe 100 gotas por mês e permite comprar recargas.',
              },
              {
                q: 'Posso excluir minha conta e meus dados?',
                a: 'Sim. A plataforma oferece meios para exclusão da conta e dos conteúdos associados, conforme as regras informadas nos Termos de Uso e na Política de Privacidade.',
              },
            ].map((item, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border-gold/[0.10]">
                <AccordionTrigger className="font-cinzel text-left text-[15px] py-6 hover:text-gold-light hover:no-underline transition-colors duration-500">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="font-manrope text-[14px] text-text-secondary leading-[1.9] pb-6 max-w-[64ch]">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </Band>

      {/* ============================== FECHAMENTO ========================= */}
      <section className="relative py-28 sm:py-36 lg:py-[160px] overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 pointer-events-none"
          style={{
            background:
              'radial-gradient(65% 60% at 50% 50%, hsl(38 60% 42% / 0.14) 0%, transparent 70%), radial-gradient(120% 70% at 50% 100%, hsl(210 70% 10% / 0.6) 0%, transparent 65%)',
          }}
        />
        <Shell>
          <Reveal className="text-center max-w-[62ch] mx-auto">
            <Leaf className="w-9 h-9 mx-auto text-gold-champagne/80 mb-8" strokeWidth={1.1} />
            <h2 className="font-cinzel font-bold text-[clamp(1.8rem,3.6vw,2.8rem)] leading-[1.28] mb-7">
              Seu mundo já existe dentro de você.<br className="hidden sm:block" />
              Agora ele precisa de um lugar para <span className="text-gold-light">crescer</span>.
            </h2>
            <p className="font-manrope text-[15px] sm:text-base text-text-secondary leading-[1.9] mb-10 max-w-[56ch] mx-auto">
              Plante a primeira semente. Organize o que já criou. Aprofunde as partes que ainda não conhece.
              E transforme esse universo em uma história que possa ser escrita, revisada e compartilhada.
            </p>
            <div className="flex flex-wrap gap-3 justify-center mb-7">
              <button onClick={() => navigate('/login')} className={goldButton} style={goldButtonStyle}>
                <Crown className="w-4 h-4" strokeWidth={2} /> Criar meu primeiro mundo
              </button>
              <a
                href="#tour"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl border border-gold/25 text-gold-light/90 hover:text-gold-light hover:border-gold/45 hover:bg-gold/[0.06] font-manrope font-bold uppercase text-[11px] tracking-[0.2em] transition-all duration-500"
              >
                <Play className="w-3.5 h-3.5" strokeWidth={2} /> Ver a plataforma por dentro
              </a>
            </div>
            <p className="text-[11px] font-manrope tracking-[0.06em] text-text-dim">
              14 dias de experiência completa · Sem cartão · Seus conteúdos continuam sendo seus
            </p>
            <p className="font-merriweather italic text-gold-champagne/90 mt-10">
              Onde mundos criam raízes e narrativas dão frutos.
            </p>
          </Reveal>
        </Shell>
      </section>

      {/* ============================== Footer ============================ */}
      <footer className="border-t border-gold/[0.08]">
        <Shell>
          <div className="py-10 flex flex-wrap items-center justify-between gap-5 text-[11.5px] font-manrope text-text-dim">
            <span className="inline-flex items-center gap-2.5">
              <Leaf className="w-4 h-4 text-gold-champagne/70" strokeWidth={1.4} />
              Árvore dos Mundos · {new Date().getFullYear()}
            </span>
            <div className="flex items-center gap-6">
              <a href="#planos" className="hover:text-foreground transition-colors duration-300">Planos</a>
              <a href="#faq" className="hover:text-foreground transition-colors duration-300">Perguntas</a>
              <Link to="/seguranca" className="hover:text-foreground transition-colors duration-300">Segurança</Link>
              <Link to="/login" className="hover:text-foreground transition-colors duration-300">Entrar</Link>
            </div>
          </div>
        </Shell>
      </footer>
    </div>
  );
};

export default LandingPage;
