import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sparkles, Leaf, Crown, BookOpen, Library, Map, Image as ImageIcon,
  Feather, Wand2, ShieldCheck, ArrowRight, LogIn, Check,
} from 'lucide-react';
import heroPoster from '@/assets/arvore-mundos-hero.webp.asset.json';
import hero640 from '@/assets/arvore-mundos-hero-640.webp.asset.json';
import hero960 from '@/assets/arvore-mundos-hero-960.webp.asset.json';
import hero1280 from '@/assets/arvore-mundos-hero-1280.webp.asset.json';
import hero1600 from '@/assets/arvore-mundos-hero-1600.webp.asset.json';

const heroSrcSet = `${hero640.url} 640w, ${hero960.url} 960w, ${hero1280.url} 1280w, ${hero1600.url} 1600w`;
const heroSizes = '100vw';
import idrielPoster from '@/assets/idriel-avatar.webp';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.7, delay: i * 0.08, ease: 'easeOut' as const } }),
};

const pillars = [
  { Icon: Library, title: '11 Frutos de Worldbuilding', desc: 'Metodologia pedagógica completa: do Mito Fundador às Ramificações Narrativas. Construa mundos com profundidade real.' },
  { Icon: BookOpen, title: 'Codex vivo + Manuscrito', desc: 'Fichas, artigos, capítulos e Mural de Arcos integrados. Tudo conversa entre si, sem perder o fio da narrativa.' },
  { Icon: Wand2, title: 'Idriel — sua co-autora', desc: 'IA fluente em português que conhece SEU mundo. Pergunte, peça análises, gere visões e mapas com canon do Codex.' },
  { Icon: Map, title: 'Visões e Mapas IA', desc: 'GPT Image 2 e Nano Banana Pro a serviço da sua imaginação. Capas, retratos e cartografia em qualidade cinematográfica.' },
];

const flow = [
  { n: '01', title: 'Plante a semente', desc: 'Crie seu mundo a partir do Mito Fundador ou de uma cena de inspiração.' },
  { n: '02', title: 'Cultive os Frutos', desc: 'Geografia, povos, magia, conflitos — Idriel sugere caminhos coerentes.' },
  { n: '03', title: 'Materialize visões', desc: 'Gere imagens, mapas e fichas com referências do próprio Codex.' },
  { n: '04', title: 'Escreva sem fricção', desc: 'Manuscrito com corretor automático pt-BR, autosave e Mural de Arcos.' },
];

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#02070d] text-foreground overflow-x-hidden">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-gold/10 bg-[#02070d]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2" aria-label="Árvore dos Mundos — início">
            <Leaf className="w-5 h-5 text-gold-champagne" strokeWidth={1.75} />
            <span className="font-cinzel font-bold tracking-wider text-sm">Árvore dos Mundos</span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-4">
            <Link to="/planos" className="text-xs font-montserrat uppercase tracking-wider text-text-secondary hover:text-foreground transition-colors hidden sm:inline">
              Planos
            </Link>
            <Link to="/login" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-montserrat font-bold uppercase tracking-wider border border-gold/40 text-gold-light hover:bg-gold/[0.08] transition-colors">
              <LogIn className="w-3.5 h-3.5" strokeWidth={1.75} /> Entrar
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <img
          src={hero960.url}
          srcSet={heroSrcSet}
          sizes={heroSizes}
          width={1600}
          height={900}
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 -z-10 w-full h-full object-cover object-center opacity-[0.35]"
        />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-[#02070d]/40 via-[#02070d]/80 to-[#02070d]" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28 lg:py-36">
          <motion.div
            initial="hidden"
            animate="show"
            variants={fadeUp}
            className="max-w-3xl"
          >
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gold/30 text-[10px] font-montserrat font-bold uppercase tracking-[0.2em] text-gold-light mb-6">
              <Sparkles className="w-3 h-3" strokeWidth={1.75} /> Plataforma de Worldbuilding em pt-BR
            </span>
            <h1 className="font-cinzel font-bold text-4xl sm:text-5xl lg:text-6xl leading-[1.05] mb-5">
              Onde mundos <span className="text-gold-champagne">criam raízes</span>,<br className="hidden sm:block" />
              e narrativas <span className="text-gold-light">dão frutos</span>.
            </h1>
            <p className="font-merriweather text-base sm:text-lg text-text-secondary leading-relaxed mb-8 max-w-2xl">
              Codex, manuscrito, visões e mapas — tudo em um único grimório vivo,
              com Idriel, sua co-autora élfica que conhece cada detalhe do mundo que você plantou.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate('/planos')}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-md bg-gold hover:bg-gold-light text-background font-montserrat font-bold uppercase text-xs tracking-wider transition-colors shadow-[0_0_24px_rgba(218,165,32,0.35)]"
              >
                <Crown className="w-4 h-4" strokeWidth={1.75} /> Começar agora
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-md border border-gold/40 text-gold-light hover:bg-gold/[0.08] font-montserrat font-bold uppercase text-xs tracking-wider transition-colors"
              >
                Já tenho conta
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-8 text-[11px] font-montserrat text-text-dim uppercase tracking-wider">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-gold-champagne" strokeWidth={1.75} /> Sem cartão para explorar planos</span>
              <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-gold-champagne" strokeWidth={2} /> 100% em português</span>
              <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-gold-champagne" strokeWidth={2} /> Cancelamento a qualquer momento</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pillars */}
      <section className="border-y border-gold/10 bg-[rgba(4,12,24,0.4)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <motion.h2
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
            className="font-cinzel font-bold text-2xl sm:text-3xl text-center mb-3"
          >
            Tudo o que um mundo precisa para germinar
          </motion.h2>
          <motion.p
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={1}
            className="font-merriweather italic text-text-dim text-center max-w-2xl mx-auto mb-12"
          >
            Ferramentas pedagógicas, integradas e em pt-BR — para quem leva worldbuilding a sério.
          </motion.p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {pillars.map((p, i) => (
              <motion.div
                key={p.title}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: '-40px' }}
                variants={fadeUp}
                custom={i}
                className="card-glass rounded-lg p-5 border border-gold/15 hover:border-gold/35 transition-colors"
              >
                <div className="w-10 h-10 rounded-md border border-gold/30 bg-gold/[0.06] flex items-center justify-center mb-4">
                  <p.Icon className="w-5 h-5 text-gold-champagne" strokeWidth={1.5} />
                </div>
                <h3 className="font-cinzel font-bold text-base text-foreground mb-2">{p.title}</h3>
                <p className="font-merriweather text-sm text-text-secondary leading-relaxed">{p.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Idriel highlight */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-10 lg:gap-16 items-center">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
            className="relative mx-auto lg:mx-0"
          >
            <div className="absolute -inset-6 bg-gold/10 blur-3xl rounded-full -z-10" />
            <div className="w-56 h-56 sm:w-72 sm:h-72 rounded-full overflow-hidden border-2 border-gold/40 shadow-[0_0_60px_rgba(218,165,32,0.35)]">
              <img src={idrielPoster} alt="Idriel, a co-autora élfica" className="w-full h-full object-cover object-top" />
            </div>
          </motion.div>
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} custom={1}>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gold/30 text-[10px] font-montserrat font-bold uppercase tracking-[0.2em] text-gold-light mb-4">
              <Feather className="w-3 h-3" strokeWidth={1.75} /> Conheça Idriel
            </span>
            <h2 className="font-cinzel font-bold text-2xl sm:text-3xl mb-4">
              Uma co-autora élfica que lê seu Codex inteiro
            </h2>
            <p className="font-merriweather text-base text-text-secondary leading-relaxed mb-5">
              Idriel não é um chatbot genérico. Ela canaliza o <em>Elixir dos Mundos</em> para gerar respostas,
              análises, imagens e mapas alinhados ao canon que <strong>você</strong> construiu — fichas, artigos,
              geografia, povos e magia.
            </p>
            <ul className="space-y-2 mb-6">
              {[
                'Análise semântica do mundo em 6 dimensões (de 1 a 5 estrelas)',
                'Geração de visões com referências do Codex (Nano Banana Pro)',
                'Modo Cinematográfico para capas e retratos (GPT Image 2)',
                'Importação de texto que vira fichas automaticamente',
              ].map(t => (
                <li key={t} className="flex items-start gap-2 font-merriweather text-sm text-text-secondary">
                  <Check className="w-4 h-4 text-gold-champagne mt-[3px] shrink-0" strokeWidth={2} />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => navigate('/planos')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-gold text-gold-light hover:bg-gold/10 font-montserrat font-bold uppercase text-xs tracking-wider transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" strokeWidth={1.75} /> Conhecer planos com Idriel
            </button>
          </motion.div>
        </div>
      </section>

      {/* Flow */}
      <section className="border-t border-gold/10 bg-[rgba(4,12,24,0.4)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <motion.h2 initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}
            className="font-cinzel font-bold text-2xl sm:text-3xl text-center mb-12">
            Do mito ao manuscrito — em quatro estações
          </motion.h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {flow.map((s, i) => (
              <motion.div
                key={s.n}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
                className="relative card-glass rounded-lg p-5 border border-gold/15"
              >
                <span className="font-cinzel font-bold text-gold-champagne/70 text-3xl block mb-2">{s.n}</span>
                <h3 className="font-cinzel font-bold text-base mb-2">{s.title}</h3>
                <p className="font-merriweather text-sm text-text-secondary leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}>
          <ImageIcon className="w-10 h-10 mx-auto text-gold-champagne mb-5" strokeWidth={1.25} />
          <h2 className="font-cinzel font-bold text-3xl sm:text-4xl mb-4">
            Sua próxima saga merece um <span className="text-gold-light">grimório à altura</span>.
          </h2>
          <p className="font-merriweather text-text-secondary text-base sm:text-lg leading-relaxed mb-8 max-w-2xl mx-auto">
            Escolha seu plano e plante a primeira semente hoje. Cancele quando quiser, exporte tudo quando precisar.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => navigate('/planos')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-gold hover:bg-gold-light text-background font-montserrat font-bold uppercase text-xs tracking-wider transition-colors shadow-[0_0_24px_rgba(218,165,32,0.35)]"
            >
              <Crown className="w-4 h-4" strokeWidth={1.75} /> Ver planos
            </button>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-md border border-gold/40 text-gold-light hover:bg-gold/[0.08] font-montserrat font-bold uppercase text-xs tracking-wider transition-colors"
            >
              Entrar
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gold/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-wrap items-center justify-between gap-4 text-[11px] font-montserrat uppercase tracking-wider text-text-dim">
          <span className="inline-flex items-center gap-2">
            <Leaf className="w-4 h-4 text-gold-champagne" strokeWidth={1.5} />
            Árvore dos Mundos · {new Date().getFullYear()}
          </span>
          <div className="flex items-center gap-4">
            <Link to="/planos" className="hover:text-foreground transition-colors">Planos</Link>
            <Link to="/seguranca" className="hover:text-foreground transition-colors">Segurança</Link>
            <Link to="/login" className="hover:text-foreground transition-colors">Entrar</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
