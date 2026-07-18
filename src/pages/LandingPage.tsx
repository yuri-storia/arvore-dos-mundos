import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sparkles, Leaf, Crown, BookOpen, Library, Map, Image as ImageIcon,
  Feather, Wand2, ShieldCheck, ArrowRight, LogIn, Check, Play,
  FileText, Layers, Compass, Upload, Lock, Quote, Droplet,
  ChevronDown, Trees, MessageCircle, Star, FileDown, Brain, Timer,
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
import previewConstruir from '@/assets/plataforma-construir.jpg.asset.json';
import previewCodex from '@/assets/plataforma-codex.jpg.asset.json';
import previewEscrever from '@/assets/plataforma-escrever.jpg.asset.json';


const heroSrcSet = `${hero640.url} 640w, ${hero960.url} 960w, ${hero1280.url} 1280w, ${hero1600.url} 1600w`;

// Feature flag: importação só aparece quando estável + testada
const SHOW_IMPORT_BLOCK = true;

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.7, delay: i * 0.06, ease: 'easeOut' as const },
  }),
};

/* -------------------------------------------------------------------------- */
/*  Placeholders reservados                                                    */
/* -------------------------------------------------------------------------- */

const VideoPlaceholder: React.FC<{
  title: string;
  duration: string;
  bullets: string[];
  ratio?: string; // ex 'aspect-video'
  screenshot?: { url: string; alt: string };
}> = ({ title, duration, bullets, ratio = 'aspect-video', screenshot }) => (
  <figure
    aria-label={`Prévia da plataforma referente ao vídeo: ${title}. Duração ${duration}.`}
    className="group relative rounded-2xl overflow-hidden border border-gold-warm/25 bg-[rgba(4,12,24,0.72)] backdrop-blur-xl shadow-[0_18px_60px_-24px_rgba(0,0,0,0.85),inset_0_1px_0_hsl(var(--gold-champagne)/0.10)]"
  >
    <div className={`relative ${ratio} w-full overflow-hidden`}>
      {screenshot ? (
        <>
          <img
            src={screenshot.url}
            alt={screenshot.alt}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover object-left-top transition-transform duration-[900ms] ease-out group-hover:scale-[1.025]"
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(180deg, hsl(214 60% 3% / 0) 45%, hsl(214 60% 3% / 0.78) 100%)',
            }}
            aria-hidden="true"
          />
          <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full border border-gold-warm/40 bg-[rgba(4,12,24,0.75)] backdrop-blur-md px-2.5 py-1">
            <Play className="w-3 h-3 text-gold-champagne" strokeWidth={2.2} />
            <span className="font-montserrat uppercase tracking-[0.22em] text-[9px] text-gold-champagne">
              Vídeo em breve · print da plataforma
            </span>
          </div>
        </>
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-gold/[0.04] via-transparent to-gold/[0.06]">
          <div className="mx-auto w-14 h-14 rounded-full border border-gold/40 bg-gold/[0.08] flex items-center justify-center">
            <Play className="w-6 h-6 text-gold-champagne" strokeWidth={1.5} />
          </div>
        </div>
      )}
    </div>

    <figcaption className="relative px-5 sm:px-6 py-5 border-t border-gold-warm/20 bg-[rgba(4,12,24,0.55)]">
      <p className="font-montserrat uppercase tracking-[0.22em] text-[10px] text-gold-champagne mb-1.5">
        Roteiro do vídeo · {duration}
      </p>
      <h4 className="font-cinzel font-bold text-base sm:text-lg text-foreground mb-3">{title}</h4>
      <ol className="space-y-1.5 font-merriweather text-[13px] sm:text-sm text-text-secondary leading-relaxed list-decimal list-inside marker:text-gold-champagne/70">
        {bullets.map((b) => (
          <li key={b} className="pl-1">
            {b}
          </li>
        ))}
      </ol>
    </figcaption>
  </figure>
);

const TestimonialPlaceholder: React.FC<{ kind: 'ebook' | 'beta'; count: number }> = ({ kind, count }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="rounded-lg border border-dashed border-gold/25 bg-[rgba(4,12,24,0.45)] p-5 min-h-[180px] flex flex-col"
      >
        <Quote className="w-5 h-5 text-gold/40 mb-3" strokeWidth={1.5} />
        <div className="space-y-2 mb-4 flex-1">
          <div className="h-2 w-11/12 bg-gold/10 rounded-full" />
          <div className="h-2 w-9/12 bg-gold/10 rounded-full" />
          <div className="h-2 w-10/12 bg-gold/10 rounded-full" />
          <div className="h-2 w-7/12 bg-gold/10 rounded-full" />
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gold/10 border border-gold/20" />
          <div className="space-y-1">
            <div className="h-2 w-20 bg-gold/15 rounded-full" />
            <div className="h-1.5 w-14 bg-gold/10 rounded-full" />
          </div>
        </div>
      </div>
    ))}
    <p className="sm:col-span-2 lg:col-span-3 text-center font-merriweather italic text-xs text-text-dim mt-2">
      {kind === 'ebook'
        ? 'Em curadoria — depoimentos do e-book serão adicionados após seleção (4 a 6).'
        : 'Em curadoria — depoimentos serão adicionados após seleção (3 a 5).'}
    </p>
  </div>
);

/* -------------------------------------------------------------------------- */

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [billing, setBilling] = useState<'mensal' | 'anual'>('anual');
  const [rechargesOpen, setRechargesOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen bg-[#02070d] text-foreground overflow-x-hidden">
      {/* ============================== Header ============================== */}
      <header className="sticky top-0 z-40 border-b border-gold/10 bg-[#02070d]/85 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2" aria-label="Árvore dos Mundos — início">
            <Leaf className="w-5 h-5 text-gold-champagne" strokeWidth={1.75} />
            <span className="font-cinzel font-bold tracking-wider text-sm">Árvore dos Mundos</span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-4">
            <a href="#planos" className="text-xs font-montserrat uppercase tracking-wider text-text-secondary hover:text-foreground transition-colors hidden sm:inline">
              Planos
            </a>
            <a href="#faq" className="text-xs font-montserrat uppercase tracking-wider text-text-secondary hover:text-foreground transition-colors hidden sm:inline">
              Perguntas
            </a>
            <Link
              to={user ? '/app' : '/login'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-montserrat font-bold uppercase tracking-wider border border-gold/40 text-gold-light hover:bg-gold/[0.08] transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" strokeWidth={1.75} /> {user ? 'Abrir App' : 'Entrar'}
            </Link>
          </nav>
        </div>
      </header>

      {/* ============================== 1. HERO ============================= */}
      <section className="relative isolate overflow-hidden min-h-[92vh] flex items-center">
        {/* Vídeo de fundo — Árvore animada (mais visível, brilho/saturação ajustados) */}
        <video
          className="absolute inset-0 -z-20 w-full h-full object-cover scale-[1.08]"
          poster={hero1280.url}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          style={{
            filter: 'brightness(1.12) contrast(1.05) saturate(1.15)',
          }}
        >
          <source src={heroVideo1080.url} type="video/mp4" media="(min-width: 1280px)" />
          <source src={heroVideo720.url} type="video/mp4" media="(min-width: 640px)" />
          <source src={heroVideo480.url} type="video/mp4" />
        </video>
        {/* Fallback image (caso o vídeo não carregue) */}
        <img
          src={hero1280.url}
          srcSet={heroSrcSet}
          sizes="100vw"
          width={1600}
          height={900}
          alt=""
          aria-hidden="true"
          decoding="async"
          className="absolute inset-0 -z-30 w-full h-full object-cover object-center scale-[1.08]"
          style={{
            filter: 'brightness(1.12) contrast(1.05) saturate(1.15)',
          }}
        />
        {/* Vinheta radial — preserva legibilidade, mas revela mais o vídeo */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at center, hsl(214 80% 3% / 0.18) 0%, hsl(214 80% 3% / 0.55) 55%, hsl(214 80% 3% / 0.92) 100%)',
          }}
        />
        {/* Glow dourado sutil ao centro — mais contido para não mascarar o vídeo */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 pointer-events-none opacity-50"
          style={{
            background:
              'radial-gradient(ellipse 55% 42% at 50% 45%, hsl(38 60% 45% / 0.18) 0%, transparent 70%)',
          }}
        />
        {/* Fade inferior p/ próxima seção */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-56 -z-10 pointer-events-none"
          style={{
            background:
              'linear-gradient(to bottom, transparent 0%, rgba(2,7,13,0.45) 45%, #02070d 100%)',
          }}
        />

        <div className="relative w-full max-w-5xl mx-auto px-4 sm:px-6 pt-24 sm:pt-28 lg:pt-32 pb-20 sm:pb-28 text-center">
          <motion.div initial="hidden" animate="show" variants={fadeUp}>
            <span
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gold-warm/40 bg-gold-deep/20 backdrop-blur-sm text-[10px] font-montserrat font-bold uppercase tracking-[0.24em] text-gold-champagne mb-7 shadow-[0_4px_24px_rgba(0,0,0,0.45)]"
            >
              <Sparkles className="w-3 h-3" strokeWidth={1.75} /> Mais de 1.500 exemplares vendidos
            </span>

            <h1
              className="font-cinzel font-bold text-[clamp(2rem,4.6vw,3.6rem)] leading-[1.08] mb-6 mx-auto max-w-4xl"
              style={{
                textShadow: '0 2px 28px rgba(2,7,13,0.95), 0 1px 8px rgba(2,7,13,0.85)',
              }}
            >
              Crie Mundos Fantásticos com a{' '}
              <span className="text-gradient-gold-hero">Plataforma Definitiva</span>{' '}
              de Worldbuilding.
            </h1>

            <p
              className="font-merriweather text-base sm:text-lg lg:text-xl text-text-secondary leading-relaxed mb-9 max-w-2xl mx-auto"
              style={{
                textShadow: '0 2px 20px rgba(2,7,13,0.95), 0 1px 6px rgba(2,7,13,0.85)',
              }}
            >
              Construa universos profundos e coerentes com os <strong className="text-foreground">11 Frutos</strong>,
              organize tudo em um <strong className="text-foreground">Codex vivo</strong> e
              escreva suas histórias com a assistência de <strong className="text-foreground">Idriel</strong> —
              sem entregar sua voz, suas escolhas ou sua autoria à inteligência artificial.
            </p>

            <div className="flex flex-wrap gap-3 justify-center">
              <button
                onClick={() => navigate('/login')}
                className="group inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-montserrat font-bold uppercase text-[11px] tracking-[0.22em] text-[#1a0f00] transition-all hover:-translate-y-0.5"
                style={{
                  background:
                    'linear-gradient(135deg, hsl(42 55% 90%) 0%, hsl(40 50% 78%) 30%, hsl(34 42% 58%) 65%, hsl(30 30% 42%) 100%)',
                  boxShadow:
                    '0 10px 32px hsl(30 30% 20% / 0.55), 0 0 48px hsl(38 60% 45% / 0.35), inset 0 1px 0 hsl(42 60% 96% / 0.7), inset 0 -2px 0 hsl(28 32% 22% / 0.4)',
                  border: '1px solid hsl(34 42% 50% / 0.7)',
                }}
              >
                <Crown className="w-4 h-4" strokeWidth={2} />
                Começar meu teste gratuito
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={2.25} />
              </button>
              <a
                href="#tour"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl border border-gold-warm/50 bg-[rgba(2,7,13,0.55)] backdrop-blur-sm text-gold-champagne hover:bg-gold/[0.12] font-montserrat font-bold uppercase text-[11px] tracking-[0.22em] transition-colors shadow-[0_4px_24px_rgba(0,0,0,0.35)]"
              >
                <Play className="w-3.5 h-3.5" strokeWidth={2.25} /> Ver a plataforma por dentro
              </a>
            </div>

            <div
              className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mt-7 text-[11px] font-montserrat text-text-dim uppercase tracking-wider"
              style={{ textShadow: '0 1px 10px rgba(2,7,13,0.85)' }}
            >
              <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-gold-champagne" strokeWidth={2} /> 14 dias de experiência completa</span>
              <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-gold-champagne" strokeWidth={2} /> Sem cartão</span>
              <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-gold-champagne" strokeWidth={2} /> Seus conteúdos continuam sendo seus</span>
            </div>
          </motion.div>
        </div>
      </section>


      {/* ============================== 2. PROBLEMA ========================= */}
      <section className="border-y border-gold/10 bg-[rgba(4,12,24,0.4)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} variants={fadeUp} className="max-w-3xl mb-12">
            <h2 className="font-cinzel font-bold text-2xl sm:text-3xl mb-4">
              Você não tem falta de ideias. Tem ideias demais vivendo em <span className="text-gold-champagne">lugares diferentes</span>.
            </h2>
            <p className="font-merriweather text-text-secondary leading-relaxed">
              Um personagem em um documento. A religião de um povo em uma anotação antiga.
              O mapa em uma pasta. A linha do tempo em uma planilha. As melhores respostas que você recebeu
              de uma IA, desaparecidas em um histórico que você nunca mais encontrou. O mundo se expande —
              mas a história não avança.
            </p>
            <p className="font-merriweather italic text-text-dim mt-4">
              A Árvore dos Mundos reúne esse processo em um único ambiente: da construção do universo à escrita do manuscrito.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="card-glass rounded-lg p-6 border border-red-900/30 bg-red-950/10">
              <p className="font-montserrat uppercase tracking-[0.22em] text-[10px] text-red-300/70 mb-3">Antes</p>
              <h3 className="font-cinzel font-bold text-lg mb-3">Tudo espalhado</h3>
              <ul className="space-y-2 font-merriweather text-sm text-text-secondary">
                {['Documentos soltos no computador', 'Notas e rascunhos perdidos', 'Imagens em pastas diferentes', 'Planilhas para linha do tempo', 'Conversas com IA que somem do histórico'].map(t => (
                  <li key={t} className="flex gap-2"><span className="text-red-300/70 mt-1">×</span><span>{t}</span></li>
                ))}
              </ul>
            </div>
            <div className="card-glass rounded-lg p-6 border border-gold/30">
              <p className="font-montserrat uppercase tracking-[0.22em] text-[10px] text-gold-champagne mb-3">Com a Árvore dos Mundos</p>
              <h3 className="font-cinzel font-bold text-lg mb-3">Um universo conectado</h3>
              <ul className="space-y-2 font-merriweather text-sm text-text-secondary">
                {['Mundo centralizado em um só lugar', 'Codex vivo de fichas e artigos', 'Galeria de referências e mapas', 'Manuscritos com capítulos e Storylines', 'Idriel contextual conhece o que você criou'].map(t => (
                  <li key={t} className="flex gap-2"><Check className="w-4 h-4 text-gold-champagne mt-0.5 shrink-0" strokeWidth={2.25} /><span>{t}</span></li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ============================== 3. COMO FUNCIONA ==================== */}
      <section id="tour" className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-24">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} className="text-center mb-12">
          <h2 className="font-cinzel font-bold text-2xl sm:text-3xl mb-3">Da primeira semente ao manuscrito.</h2>
          <p className="font-merriweather italic text-text-dim">A Árvore dos Mundos organiza o processo de criação em quatro movimentos.</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-14">
          {[
            { n: '01', title: 'Plante', desc: 'Crie seu mundo e registre a ideia que dará origem a ele. Você não precisa saber tudo antes de começar.', Icon: Leaf },
            { n: '02', title: 'Cultive', desc: 'Desenvolva povos, lugares, culturas, conflitos, sistemas e linguagens pelos 11 Frutos do Worldbuilding.', Icon: Trees },
            { n: '03', title: 'Organize', desc: 'Transforme descobertas em fichas e artigos dentro de um Codex vivo, criado para conectar cada parte do universo.', Icon: Library },
            { n: '04', title: 'Escreva', desc: 'Leve tudo o que foi construído para seus manuscritos, capítulos e Storylines.', Icon: Feather },
          ].map((s, i) => (
            <motion.div
              key={s.n}
              initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} custom={i}
              className="card-glass rounded-lg p-5 border border-gold/15"
            >
              <span className="font-cinzel font-bold text-gold-champagne/70 text-3xl block mb-2">{s.n}</span>
              <div className="flex items-center gap-2 mb-2">
                <s.Icon className="w-4 h-4 text-gold-champagne" strokeWidth={1.75} />
                <h3 className="font-cinzel font-bold text-base">{s.title}</h3>
              </div>
              <p className="font-merriweather text-sm text-text-secondary leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>

        <VideoPlaceholder
          screenshot={{ url: previewConstruir.url, alt: "Aba Construir da plataforma, mostrando o carrossel dos 11 Frutos" }}
          title="Tour principal da plataforma"
          duration="60 a 90s · narrado · com legendas"
          bullets={[
            'Criar/abrir um mundo · entrar na aba Construir',
            'Abrir um Fruto · responder a um campo · consultar Idriel',
            'Salvar descoberta como ficha/artigo · abrir no Codex',
            'Consultar a referência durante a escrita · exportar',
            'Fechamento: "Tudo o que você cria permanece conectado ao mesmo universo."',
          ]}
        />
      </section>

      {/* ============================== 4. 11 FRUTOS ======================== */}
      <section className="border-y border-gold/10 bg-[rgba(4,12,24,0.4)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-10 items-center mb-12">
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gold/30 text-[10px] font-montserrat font-bold uppercase tracking-[0.2em] text-gold-light mb-4">
                <Trees className="w-3 h-3" strokeWidth={1.75} /> Os 11 Frutos
              </span>
              <h2 className="font-cinzel font-bold text-2xl sm:text-3xl mb-4">
                Você não precisa construir um universo diante de uma página vazia.
              </h2>
              <p className="font-merriweather text-text-secondary leading-relaxed mb-4">
                Muitos criadores sabem que desejam construir um mundo profundo, mas não sabem qual pergunta fazer primeiro.
                Os 11 Frutos organizam as grandes dimensões do worldbuilding e ajudam você a enxergar o que ainda precisa ser desenvolvido.
              </p>
              <ul className="space-y-2 mb-6">
                {[
                  'Explicações sobre cada aspecto do mundo',
                  'Perguntas guiadas e campos de construção',
                  'Orientações sobre fichas e artigos',
                  'Sugestões contextuais de Idriel',
                  'Caminhos Top-Down e Bottom-Up',
                ].map(t => (
                  <li key={t} className="flex items-start gap-2 font-merriweather text-sm text-text-secondary">
                    <Check className="w-4 h-4 text-gold-champagne mt-[3px] shrink-0" strokeWidth={2} />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
              <p className="font-merriweather italic text-text-dim text-sm">
                Você pode começar por onde fizer mais sentido. Não existe obrigação de preencher tudo. Não existe uma ordem única.
              </p>
            </motion.div>

            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} custom={1}
              className="card-glass rounded-lg p-6 border border-gold/25"
            >
              <p className="font-montserrat uppercase tracking-[0.22em] text-[10px] text-gold-champagne mb-3">Uma metodologia que já existia antes da plataforma</p>
              <h3 className="font-cinzel font-bold text-lg mb-3">Do e-book ao ambiente vivo</h3>
              <p className="font-merriweather text-sm text-text-secondary leading-relaxed mb-4">
                Os 11 Frutos nasceram no e-book <em>A Árvore dos Mundos</em>, uma metodologia de worldbuilding que já vendeu
                mais de <strong className="text-foreground">1.500 exemplares</strong>. Agora, o método deixou de existir apenas
                nas páginas e se transformou em um ambiente vivo de criação.
              </p>
              <div className="flex items-center gap-2 text-[11px] font-montserrat uppercase tracking-wider text-gold-champagne">
                <Star className="w-3.5 h-3.5" strokeWidth={2} /> +1.500 exemplares vendidos
              </div>
            </motion.div>
          </div>

          <VideoPlaceholder
            screenshot={{ url: previewConstruir.url, alt: "Aba Construir da plataforma, mostrando o carrossel dos 11 Frutos" }}
            title="Microvídeo dos 11 Frutos"
            duration="20 a 30s"
            bullets={[
              'Lista/visualização dos Frutos · abertura de um Fruto',
              'Bloco “Sobre este Fruto” · campo sendo preenchido',
              'Indicação de que aquele conteúdo pode gerar ficha/artigo',
              'Autosave funcionando · sugestão de Idriel',
            ]}
          />
        </div>
      </section>

      {/* ============================== 5. CODEX ============================ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-24">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} className="max-w-3xl mb-10">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gold/30 text-[10px] font-montserrat font-bold uppercase tracking-[0.2em] text-gold-light mb-4">
            <Library className="w-3 h-3" strokeWidth={1.75} /> Codex
          </span>
          <h2 className="font-cinzel font-bold text-2xl sm:text-3xl mb-4">
            Cada personagem, lugar e descoberta encontra seu lugar.
          </h2>
          <p className="font-merriweather text-text-secondary leading-relaxed">
            Um universo cresce por meio de relações. Personagens pertencem a povos. Povos ocupam territórios.
            Religiões influenciam conflitos. Eventos mudam culturas. Objetos carregam histórias. O Codex reúne cada uma dessas partes dentro do mundo ao qual pertencem.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-10">
          <div className="card-glass rounded-lg p-6 border border-gold/20">
            <FileText className="w-5 h-5 text-gold-champagne mb-3" strokeWidth={1.5} />
            <h3 className="font-cinzel font-bold text-base mb-2">Fichas</h3>
            <p className="font-merriweather text-sm text-text-secondary leading-relaxed">
              Para elementos objetivos: personagens, lugares, organizações e itens.
            </p>
          </div>
          <div className="card-glass rounded-lg p-6 border border-gold/20">
            <BookOpen className="w-5 h-5 text-gold-champagne mb-3" strokeWidth={1.5} />
            <h3 className="font-cinzel font-bold text-base mb-2">Artigos</h3>
            <p className="font-merriweather text-sm text-text-secondary leading-relaxed">
              Para conceitos amplos: sistemas mágicos, períodos históricos, religiões, culturas e acontecimentos.
            </p>
          </div>
        </div>

        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mb-10">
          {[
            'Criar fichas com imagens',
            'Escrever artigos completos',
            'Editar títulos e conteúdos diretamente',
            'Organizar entradas por mundo',
            'Importar conteúdos entre mundos',
            'Consultar referências durante a escrita',
            'Exportar entradas em PDF',
            'Manter uma memória central do universo',
          ].map(t => (
            <li key={t} className="flex items-start gap-2 font-merriweather text-sm text-text-secondary">
              <Check className="w-4 h-4 text-gold-champagne mt-[3px] shrink-0" strokeWidth={2} />
              <span>{t}</span>
            </li>
          ))}
        </ul>

        <VideoPlaceholder
          screenshot={{ url: previewCodex.url, alt: "Aba Codex com fichas e artigos organizados por Fruto" }}
          title="Vídeo do Codex"
          duration="20 a 30s"
          bullets={[
            'Grade do Codex · ficha visual com imagem · artigo aprofundado',
            'Abertura rápida da entrada · edição simples',
            'Busca/filtro · entrada consultada dentro da aba Escrever',
            'Conteúdo ficcional de qualidade, nunca lorem ipsum',
          ]}
        />
      </section>

      {/* ============================== 6. IDRIEL =========================== */}
      <section className="border-y border-gold/10 bg-[rgba(4,12,24,0.4)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-10 lg:gap-16 items-center mb-12">
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} className="relative mx-auto lg:mx-0">
              <div
                aria-hidden
                className="absolute -inset-8 rounded-full blur-3xl -z-10"
                style={{ background: 'radial-gradient(circle, hsl(38 60% 45% / 0.35) 0%, transparent 70%)' }}
              />
              <div
                className="w-60 h-60 sm:w-80 sm:h-80 rounded-full overflow-hidden"
                style={{
                  border: '2px solid hsl(34 42% 58% / 0.6)',
                  boxShadow:
                    '0 0 80px hsl(38 60% 45% / 0.45), 0 0 0 1px hsl(var(--gold-bronze) / 0.4), inset 0 1px 0 hsl(var(--gold-cream) / 0.2)',
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
              </div>
            </motion.div>
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} custom={1}>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gold/30 text-[10px] font-montserrat font-bold uppercase tracking-[0.2em] text-gold-light mb-4">
                <Feather className="w-3 h-3" strokeWidth={1.75} /> Idriel
              </span>
              <h2 className="font-cinzel font-bold text-2xl sm:text-3xl mb-4">
                Uma inteligência que conhece seu mundo — sem tomar o lugar de quem o criou.
              </h2>
              <p className="font-merriweather text-text-secondary leading-relaxed mb-4">
                Idriel é a assistente de worldbuilding da Árvore dos Mundos. Ela não existe para escrever o livro por você.
                Ela existe para ajudar você a enxergar melhor o mundo que está construindo.
              </p>
              <ul className="space-y-2 mb-6">
                {[
                  'Fazer perguntas que aprofundam uma ideia',
                  'Sugerir possibilidades para cada Fruto',
                  'Identificar lacunas e inconsistências',
                  'Explorar consequências',
                  'Ajudar a criar sistemas, calendários e idiomas',
                  'Resumir descobertas e transformá-las em fichas/artigos',
                  'Analisar a coerência do universo',
                ].map(t => (
                  <li key={t} className="flex items-start gap-2 font-merriweather text-sm text-text-secondary">
                    <Check className="w-4 h-4 text-gold-champagne mt-[3px] shrink-0" strokeWidth={2} />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
              <p className="font-cinzel text-base text-gold-light">
                Idriel sugere. Você decide. Você escreve.
              </p>
              <p className="font-merriweather italic text-text-dim text-sm mt-2">
                A voz continua sendo sua. As escolhas continuam sendo suas. A autoria continua sendo sua.
              </p>
            </motion.div>
          </div>

          <div className="card-glass rounded-lg p-6 border border-gold/20 mb-10">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-4 h-4 text-gold-champagne" strokeWidth={1.75} />
              <h3 className="font-cinzel font-bold text-base">Análise de Mundo</h3>
            </div>
            <p className="font-merriweather text-sm text-text-secondary leading-relaxed mb-3">
              Idriel pode analisar o contexto construído e apresentar:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {['Pontos fortes', 'Lacunas', 'Inconsistências', 'Furos narrativos', 'Oportunidades', 'Recomendações de aprofundamento'].map(t => (
                <span key={t} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-gold/15 bg-gold/[0.04] text-xs font-merriweather text-text-secondary">
                  <span className="w-1 h-1 rounded-full bg-gold-champagne" />{t}
                </span>
              ))}
            </div>
          </div>

          <VideoPlaceholder
            screenshot={{ url: previewCodex.url, alt: "Aba Codex com fichas e artigos organizados por Fruto" }}
            title="Vídeo da Idriel"
            duration="35 a 50s · narração ou legendas"
            bullets={[
              'Usuário apresenta uma ideia de sistema mágico ou sociedade',
              'Idriel reconhece algo já registrado no mundo',
              'Aponta inconsistência ou consequência · sugere 2-3 caminhos',
              'Usuário escolhe · plataforma gera resumo limpo',
              'Resumo salvo como artigo ou ficha no Codex',
            ]}
          />
        </div>
      </section>

      {/* ============================== 7. OFÍCIO COMPLETO ================== */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} className="max-w-3xl mb-10">
          <h2 className="font-cinzel font-bold text-2xl sm:text-3xl mb-3">
            Do planejamento à escrita, sem abandonar o seu mundo.
          </h2>
          <p className="font-merriweather text-text-secondary leading-relaxed">
            Worldbuilding não termina quando povos, mapas e sistemas estão prontos. Um mundo só ganha vida
            quando começa a afetar escolhas, conflitos, cenas e personagens. Por isso, A Árvore dos Mundos reúne
            construção, organização e escrita dentro do mesmo ambiente.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
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
            <motion.div
              key={b.title}
              initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} custom={i}
              className="card-glass rounded-lg p-6 border border-gold/15"
            >
              <div className="flex items-center gap-2 mb-3">
                <b.Icon className="w-5 h-5 text-gold-champagne" strokeWidth={1.5} />
                <h3 className="font-cinzel font-bold text-base">{b.title}</h3>
              </div>
              <ul className="space-y-1.5">
                {b.items.map(t => (
                  <li key={t} className="flex items-start gap-2 font-merriweather text-sm text-text-secondary">
                    <Check className="w-3.5 h-3.5 text-gold-champagne mt-[4px] shrink-0" strokeWidth={2} />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <VideoPlaceholder
          screenshot={{ url: previewEscrever.url, alt: "Aba Escrever com o manuscrito e a lista de capítulos" }}
          title="Vídeo do Ofício"
          duration="30 a 40s"
          bullets={[
            'Troca entre dois manuscritos · abertura de um capítulo',
            'Referência do Codex visualizada sem sair da escrita',
            'Card sendo movido em uma Storyline · Galeria · Mapa',
            'Modo Zen · Pomodoro sendo ativado',
          ]}
        />
      </section>

      {/* ============================== 8. IMPORTAÇÃO ======================= */}
      {SHOW_IMPORT_BLOCK && (
        <section className="border-y border-gold/10 bg-[rgba(4,12,24,0.4)]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} className="max-w-3xl mb-10">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gold/30 text-[10px] font-montserrat font-bold uppercase tracking-[0.2em] text-gold-light mb-4">
                <Upload className="w-3 h-3" strokeWidth={1.75} /> Importação inteligente
              </span>
              <h2 className="font-cinzel font-bold text-2xl sm:text-3xl mb-4">
                Você não precisa começar outra vez.
              </h2>
              <p className="font-merriweather text-text-secondary leading-relaxed mb-4">
                Talvez seu mundo já exista há anos. Em documentos, resumos, rascunhos, livros, anotações.
                Com a importação inteligente, você envia seus textos e Idriel identifica elementos que podem
                se transformar em fichas e artigos.
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {['Personagens', 'Lugares', 'Organizações', 'Povos', 'Acontecimentos', 'Sistemas', 'Objetos', 'Conceitos', 'Relações importantes'].map(t => (
                  <span key={t} className="px-3 py-1 rounded-full border border-gold/20 bg-gold/[0.04] text-xs font-merriweather text-text-secondary">{t}</span>
                ))}
              </div>
              <p className="font-merriweather text-sm text-text-dim">
                Você recebe uma lista de sugestões: pode revisar, editar, ignorar, criar individualmente ou criar todas.
                Seu trabalho anterior não precisa ser descartado para que você comece a utilizar a plataforma.
              </p>
            </motion.div>

            <VideoPlaceholder
              screenshot={{ url: previewEscrever.url, alt: "Aba Escrever com o manuscrito e a lista de capítulos" }}
              title="Vídeo da Importação"
              duration="30 a 45s"
              bullets={[
                'Upload de PDF ou documento · estado de processamento',
                'Idriel identificando possíveis entradas',
                'Lista de fichas e artigos sugeridos · sugestão editada',
                'Opção de criar várias entradas · Codex recebendo os conteúdos',
              ]}
            />
          </div>
        </section>
      )}

      {/* ============================== 9. SEGURANÇA ======================== */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} className="max-w-3xl mb-10">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gold/30 text-[10px] font-montserrat font-bold uppercase tracking-[0.2em] text-gold-light mb-4">
            <ShieldCheck className="w-3 h-3" strokeWidth={1.75} /> Segurança
          </span>
          <h2 className="font-cinzel font-bold text-2xl sm:text-3xl mb-4">
            Suas ideias pertencem a você. E continuarão pertencendo.
          </h2>
          <p className="font-merriweather text-text-secondary leading-relaxed">
            Um universo ficcional pode representar anos de trabalho. Personagens, mapas, sistemas, culturas,
            manuscritos e ideias ainda não publicadas não são apenas dados — são propriedade intelectual.
            Por isso, segurança e privacidade são compromissos do produto.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {[
            { Icon: Lock, title: 'Conteúdos isolados por usuário', desc: 'Políticas de acesso impedem que uma conta consulte os mundos pertencentes a outra.' },
            { Icon: ShieldCheck, title: 'Conexão protegida', desc: 'A comunicação entre o navegador e a plataforma utiliza conexão criptografada.' },
            { Icon: FileDown, title: 'Exportação disponível', desc: 'Você pode retirar seus materiais nos formatos disponíveis em seu plano.' },
            { Icon: Crown, title: 'Seus mundos continuam sendo seus', desc: 'A plataforma não reivindica autoria sobre personagens, histórias, sistemas, mapas ou manuscritos criados pelo usuário.' },
            { Icon: Feather, title: 'Idriel não usa sua obra como propriedade', desc: 'A assistência processa o contexto necessário para executar as ações solicitadas, conforme a Política de Privacidade.' },
            { Icon: Layers, title: 'Exclusão de dados', desc: 'A plataforma oferece meios para excluir mundos, conteúdos e a própria conta, observadas as regras descritas nos termos.' },
          ].map((c, i) => (
            <motion.div
              key={c.title}
              initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} custom={i}
              className="card-glass rounded-lg p-5 border border-gold/15"
            >
              <c.Icon className="w-5 h-5 text-gold-champagne mb-3" strokeWidth={1.5} />
              <h3 className="font-cinzel font-bold text-sm mb-2">{c.title}</h3>
              <p className="font-merriweather text-sm text-text-secondary leading-relaxed">{c.desc}</p>
            </motion.div>
          ))}
        </div>

        <Link
          to="/seguranca"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md border border-gold text-gold-light hover:bg-gold/10 font-montserrat font-bold uppercase text-xs tracking-wider transition-colors"
        >
          <ShieldCheck className="w-4 h-4" strokeWidth={1.75} /> Conhecer nossa estrutura de segurança
        </Link>
      </section>

      {/* ============================== 10. PROVAS ========================== */}
      <section className="border-y border-gold/10 bg-[rgba(4,12,24,0.4)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 space-y-16">
          <div>
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} className="text-center mb-8">
              <h2 className="font-cinzel font-bold text-2xl sm:text-3xl mb-3">
                Antes de virar plataforma, a Árvore já ajudava escritores a construir mundos.
              </h2>
              <p className="font-merriweather italic text-text-dim max-w-2xl mx-auto">
                Estes depoimentos referem-se ao e-book e à metodologia original — não ao uso do aplicativo.
              </p>
            </motion.div>
            <TestimonialPlaceholder kind="ebook" count={3} />
          </div>

          <div>
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} className="text-center mb-8">
              <h2 className="font-cinzel font-bold text-2xl sm:text-3xl mb-3">
                Mundos que já começaram a criar raízes dentro da plataforma.
              </h2>
              <p className="font-merriweather italic text-text-dim max-w-2xl mx-auto">
                Primeiros usuários que estão construindo seus universos dentro da Árvore dos Mundos.
              </p>
            </motion.div>
            <TestimonialPlaceholder kind="beta" count={3} />
          </div>
        </div>
      </section>

      {/* ============================== 11. PLANOS ========================== */}
      <section id="planos" className="max-w-6xl mx-auto px-4 sm:px-6 py-20 scroll-mt-20">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} className="text-center mb-10">
          <h2 className="font-cinzel font-bold text-2xl sm:text-3xl mb-3">Como você deseja cultivar seus mundos?</h2>
          <p className="font-merriweather text-text-secondary max-w-2xl mx-auto leading-relaxed">
            Experimente a experiência completa por <strong className="text-foreground">14 dias</strong>, sem cartão.
            Ao final, escolha entre Raiz e Idriel. Seus mundos, fichas, artigos e manuscritos continuam salvos.
          </p>
        </motion.div>

        {/* Toggle billing */}
        <div className="flex items-center justify-center mb-10">
          <div className="inline-flex p-1 rounded-full border border-gold/30 bg-card/60 backdrop-blur-md">
            <button
              onClick={() => setBilling('mensal')}
              aria-pressed={billing === 'mensal'}
              className={`px-6 py-2 rounded-full text-[11px] font-montserrat font-bold uppercase tracking-wider transition-all ${
                billing === 'mensal' ? 'bg-gold text-background' : 'text-text-secondary hover:text-foreground'
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setBilling('anual')}
              aria-pressed={billing === 'anual'}
              className={`relative px-6 py-2 rounded-full text-[11px] font-montserrat font-bold uppercase tracking-wider transition-all ${
                billing === 'anual' ? 'bg-gold text-background' : 'text-text-secondary hover:text-foreground'
              }`}
            >
              Anual
              <span className="absolute -top-2 -right-3 px-1.5 py-0.5 bg-gold-champagne text-[8px] text-background rounded-full font-bold">
                ECONOMIZE 2 MESES
              </span>
            </button>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-10">
          {/* RAIZ */}
          <div className="card-glass rounded-2xl p-7 border border-gold/20 flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <Leaf className="w-5 h-5 text-gold-champagne" strokeWidth={1.75} />
              <h3 className="font-cinzel font-bold text-xl">Raiz</h3>
            </div>
            <p className="font-merriweather italic text-text-dim text-sm mb-5">
              Toda a plataforma para construir, organizar e escrever seus mundos — sem assistência de IA.
            </p>
            <div className="mb-1">
              <span className="font-cinzel font-bold text-4xl">{billing === 'mensal' ? 'R$ 19,90' : 'R$ 197'}</span>
              <span className="text-text-secondary text-sm font-montserrat ml-1">{billing === 'mensal' ? '/mês' : '/ano'}</span>
            </div>
            <p className="text-xs font-merriweather text-text-dim mb-5">
              {billing === 'anual' ? 'Equivale a R$ 16,42 por mês · Economize R$ 41,80 no plano anual.' : 'Cobrança mensal · cancele quando quiser.'}
            </p>
            <button
              onClick={() => handleCheckout(raizKey)}
              disabled={checkoutLoading === raizKey}
              className="w-full py-3 rounded-md border border-gold text-gold-light hover:bg-gold/10 font-montserrat font-bold uppercase text-xs tracking-wider transition-colors mb-6 disabled:opacity-50"
            >
              {checkoutLoading === raizKey ? 'Abrindo…' : 'Escolher Raiz'}
            </button>
            <ul className="space-y-2 text-sm font-merriweather text-text-secondary">
              {[
                'Mundos ilimitados',
                'Os 11 Frutos do Worldbuilding',
                'Codex ilimitado · fichas e artigos ilimitados',
                'Múltiplos manuscritos · capítulos ilimitados',
                'Storylines personalizáveis',
                'Galeria de referências · autosave',
                'Importação de fichas e artigos entre mundos',
                'Exportação em PDF, Word e Kindle',
                'Atualizações da plataforma',
              ].map(t => (
                <li key={t} className="flex items-start gap-2"><Check className="w-4 h-4 text-gold-champagne mt-[3px] shrink-0" strokeWidth={2} /><span>{t}</span></li>
              ))}
            </ul>
          </div>

          {/* IDRIEL */}
          <div className="relative rounded-2xl p-[1px] bg-gradient-to-br from-gold via-gold-champagne to-gold-light flex">
            <div className="rounded-2xl p-7 bg-[#02070d] flex-1 flex flex-col">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gold text-background text-[10px] font-montserrat font-bold uppercase tracking-wider">
                Experiência Completa
              </div>
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-5 h-5 text-gold-champagne" strokeWidth={1.75} />
                <h3 className="font-cinzel font-bold text-xl text-gold-light">Idriel</h3>
              </div>
              <p className="font-merriweather italic text-text-dim text-sm mb-5">
                Toda a plataforma acompanhada por uma assistente que conhece seu mundo.
              </p>
              <div className="mb-1">
                <span className="font-cinzel font-bold text-4xl text-gold-light">{billing === 'mensal' ? 'R$ 39,90' : 'R$ 397'}</span>
                <span className="text-text-secondary text-sm font-montserrat ml-1">{billing === 'mensal' ? '/mês' : '/ano'}</span>
              </div>
              <p className="text-xs font-merriweather text-text-dim mb-5">
                {billing === 'anual' ? 'Equivale a R$ 33,08 por mês · Economize R$ 81,80 no plano anual.' : 'Cobrança mensal · cancele quando quiser.'}
              </p>
              <button
                onClick={() => handleCheckout(idrielKey)}
                disabled={checkoutLoading === idrielKey}
                className="w-full py-3 rounded-md bg-gold hover:bg-gold-light text-background font-montserrat font-bold uppercase text-xs tracking-wider transition-colors mb-6 shadow-[0_0_24px_rgba(218,165,32,0.35)] disabled:opacity-50"
              >
                {checkoutLoading === idrielKey ? 'Abrindo…' : 'Continuar com Idriel'}
              </button>
              <p className="text-[11px] font-montserrat uppercase tracking-wider text-gold-champagne mb-3">Tudo do Raiz, mais:</p>
              <ul className="space-y-2 text-sm font-merriweather text-text-secondary">
                {[
                  'Idriel — assistente contextual de worldbuilding',
                  'Sugestões personalizadas em cada Fruto',
                  'Histórico de sugestões',
                  'Resumos para fichas e artigos',
                  'Análise de mundo em 6 dimensões',
                  'Identificação de inconsistências e lacunas',
                  'Importação inteligente de textos e documentos',
                  'Identificação automática de fichas e artigos',
                  'Geração de imagens com inteligência artificial',
                  'Geração de mapas cartográficos',
                  '100 gotas de Elixir dos Mundos por mês',
                  'Recargas avulsas a partir de R$ 4,90',
                ].map(t => (
                  <li key={t} className="flex items-start gap-2"><Check className="w-4 h-4 text-gold-champagne mt-[3px] shrink-0" strokeWidth={2} /><span>{t}</span></li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Elixir */}
        <div className="card-glass rounded-xl border border-gold/15 p-6 max-w-4xl mx-auto">
          <div className="flex items-start gap-3 mb-4">
            <Droplet className="w-5 h-5 text-gold-champagne mt-0.5" strokeWidth={1.5} />
            <div>
              <h3 className="font-cinzel font-bold text-base mb-1">Como funciona o Elixir dos Mundos?</h3>
              <p className="font-merriweather text-sm text-text-secondary leading-relaxed">
                As gotas são utilizadas somente em ações que envolvem inteligência artificial. Antes de confirmar qualquer
                ação, você vê quantas gotas serão consumidas. Os recursos tradicionais continuam disponíveis mesmo quando as gotas acabam.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {['Consultas à Idriel', 'Análises de mundo', 'Geração de imagens', 'Geração de mapas', 'Importação de documentos', 'Outras ações inteligentes'].map(t => (
              <span key={t} className="px-3 py-1 rounded-full border border-gold/15 bg-gold/[0.04] text-xs font-merriweather text-text-secondary">{t}</span>
            ))}
          </div>

          <button
            onClick={() => setRechargesOpen(v => !v)}
            aria-expanded={rechargesOpen}
            className="inline-flex items-center gap-2 text-xs font-montserrat font-bold uppercase tracking-wider text-gold-light hover:text-gold transition-colors"
          >
            Recargas a partir de R$ 4,90
            <ChevronDown className={`w-4 h-4 transition-transform ${rechargesOpen ? 'rotate-180' : ''}`} strokeWidth={2} />
          </button>
          {rechargesOpen && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { gotas: 15, preco: 'R$ 4,90' },
                { gotas: 50, preco: 'R$ 15,90' },
                { gotas: 100, preco: 'R$ 29,90' },
                { gotas: 200, preco: 'R$ 57,90' },
              ].map(r => (
                <div key={r.gotas} className="rounded-lg border border-gold/20 bg-gold/[0.04] p-3 text-center">
                  <div className="font-cinzel font-bold text-lg text-gold-light">{r.gotas} gotas</div>
                  <div className="font-montserrat text-xs text-text-secondary mt-1">{r.preco}</div>
                </div>
              ))}
              <p className="col-span-2 sm:col-span-4 text-[11px] font-merriweather italic text-text-dim text-center">
                Recargas disponíveis para assinantes Idriel.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ============================== 12. FAQ ============================ */}
      <section id="faq" className="border-t border-gold/10 bg-[rgba(4,12,24,0.4)]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 scroll-mt-20">
          <motion.h2 initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}
            className="font-cinzel font-bold text-2xl sm:text-3xl text-center mb-10">
            Perguntas comuns
          </motion.h2>

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
              <AccordionItem key={i} value={`item-${i}`} className="border-gold/15">
                <AccordionTrigger className="font-cinzel text-left text-base hover:text-gold-light">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="font-merriweather text-sm text-text-secondary leading-relaxed">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ============================== FECHAMENTO ========================= */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-20 text-center">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}>
          <Leaf className="w-10 h-10 mx-auto text-gold-champagne mb-5" strokeWidth={1.25} />
          <h2 className="font-cinzel font-bold text-3xl sm:text-4xl mb-5 leading-tight">
            Seu mundo já existe dentro de você.<br className="hidden sm:block" />
            Agora ele precisa de um lugar para <span className="text-gold-light">crescer</span>.
          </h2>
          <p className="font-merriweather text-text-secondary text-base sm:text-lg leading-relaxed mb-8 max-w-2xl mx-auto">
            Plante a primeira semente. Organize o que já criou. Aprofunde as partes que ainda não conhece.
            E transforme esse universo em uma história que possa ser escrita, revisada e compartilhada.
          </p>
          <div className="flex flex-wrap gap-3 justify-center mb-5">
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-gold hover:bg-gold-light text-background font-montserrat font-bold uppercase text-xs tracking-wider transition-colors shadow-[0_0_24px_rgba(218,165,32,0.35)]"
            >
              <Crown className="w-4 h-4" strokeWidth={1.75} /> Criar meu primeiro mundo
            </button>
            <a
              href="#tour"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-md border border-gold/40 text-gold-light hover:bg-gold/[0.08] font-montserrat font-bold uppercase text-xs tracking-wider transition-colors"
            >
              <Play className="w-3.5 h-3.5" strokeWidth={2} /> Ver a plataforma por dentro
            </a>
          </div>
          <p className="text-[11px] font-montserrat uppercase tracking-wider text-text-dim">
            14 dias de experiência completa · Sem cartão · Seus conteúdos continuam sendo seus
          </p>
          <p className="font-merriweather italic text-gold-champagne mt-8">
            Onde mundos criam raízes e narrativas dão frutos.
          </p>
        </motion.div>
      </section>

      {/* ============================== Footer ============================ */}
      <footer className="border-t border-gold/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-wrap items-center justify-between gap-4 text-[11px] font-montserrat uppercase tracking-wider text-text-dim">
          <span className="inline-flex items-center gap-2">
            <Leaf className="w-4 h-4 text-gold-champagne" strokeWidth={1.5} />
            Árvore dos Mundos · {new Date().getFullYear()}
          </span>
          <div className="flex items-center gap-4">
            <a href="#planos" className="hover:text-foreground transition-colors">Planos</a>
            <a href="#faq" className="hover:text-foreground transition-colors">Perguntas</a>
            <Link to="/seguranca" className="hover:text-foreground transition-colors">Segurança</Link>
            <Link to="/login" className="hover:text-foreground transition-colors">Entrar</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
