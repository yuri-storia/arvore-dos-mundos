import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, KeyRound, FileDown, Ban, Database, Eye, ScrollText, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Pillar {
  icon: React.ElementType;
  title: string;
  desc: string;
}

const PILLARS: Pillar[] = [
  {
    icon: Lock,
    title: 'Criptografia TLS 1.3 ponta a ponta',
    desc: 'Toda comunicação entre seu navegador e nossos servidores trafega cifrada. Nada do seu manuscrito passa em texto aberto pela internet.',
  },
  {
    icon: Shield,
    title: 'Isolamento total por usuário (RLS)',
    desc: 'Cada tabela do banco aplica Row Level Security do PostgreSQL. Sua conta enxerga apenas as suas linhas — não existe consulta, endpoint ou bug capaz de devolver o capítulo de outro autor.',
  },
  {
    icon: Ban,
    title: 'Seu texto não treina nenhuma IA',
    desc: 'Manuscritos, codex e anotações jamais alimentam modelos de linguagem. Quando você usa Idriel, o conteúdo enviado é processado, retornado e descartado pelo provedor de IA.',
  },
  {
    icon: KeyRound,
    title: 'Senhas vazadas são bloqueadas',
    desc: 'Integração com o Have I Been Pwned: se a senha escolhida já apareceu em vazamentos públicos, o cadastro é recusado antes de criar a conta.',
  },
  {
    icon: Database,
    title: 'Backups automáticos e cifrados',
    desc: 'A infraestrutura mantém snapshots periódicos do banco em repouso criptografado. Em caso de incidente, restauramos sem expor o conteúdo.',
  },
  {
    icon: FileDown,
    title: 'Exportação livre, sempre',
    desc: 'Você baixa seu manuscrito completo em PDF, DOCX ou EPUB a qualquer momento. Sem trava de fornecedor, sem refém. Seu texto é seu.',
  },
  {
    icon: Eye,
    title: 'Nenhum humano lê seu material',
    desc: 'A equipe da Árvore dos Mundos não acessa conteúdo de usuários como prática operacional. Suporte só visualiza dados quando você autoriza explicitamente por escrito.',
  },
  {
    icon: ScrollText,
    title: 'Conformidade com a LGPD',
    desc: 'Tratamos dados sob base legal de execução de contrato (Art. 7º, V). Você pode solicitar exportação ou exclusão completa da conta a qualquer momento.',
  },
];

const SegurancaPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[hsl(var(--bg-deep))] text-foreground">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-montserrat uppercase tracking-[0.2em] text-text-secondary hover:text-gold-champagne transition-colors mb-10"
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
          Voltar
        </Link>

        {/* Hero */}
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center mb-14 sm:mb-20"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border border-gold-bronze/40 bg-gold-deep/10 mb-6">
            <Shield className="w-7 h-7 text-gold-champagne" strokeWidth={1.5} />
          </div>
          <p className="font-montserrat text-[10px] uppercase tracking-[0.35em] text-gold-champagne/80 mb-4">
            Segurança & Privacidade
          </p>
          <h1 className="font-cinzel font-bold text-3xl sm:text-5xl text-gradient-gold leading-tight mb-5">
            Seu manuscrito vive
            <br className="hidden sm:block" /> em um cofre só seu.
          </h1>
          <p className="font-amiri italic text-text-secondary text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Escrever uma obra original exige confiança absoluta na ferramenta que a guarda.
            Estes são os compromissos técnicos e operacionais que assumimos com cada autor
            que escolhe a Árvore dos Mundos.
          </p>
        </motion.header>

        {/* Pillars */}
        <div className="grid sm:grid-cols-2 gap-4 mb-16">
          {PILLARS.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="rounded-2xl border border-gold-bronze/25 bg-card/40 p-6 backdrop-blur-sm hover:border-gold-warm/40 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-10 h-10 rounded-lg border border-gold-bronze/30 bg-gold-deep/10 flex items-center justify-center">
                  <p.icon className="w-5 h-5 text-gold-champagne" strokeWidth={1.6} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-cinzel font-bold text-base text-foreground mb-2 leading-snug">
                    {p.title}
                  </h3>
                  <p className="font-montserrat text-[13px] text-text-secondary leading-relaxed">
                    {p.desc}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Architecture detail */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.7 }}
          className="rounded-2xl border border-gold-bronze/30 p-8 mb-12 backdrop-blur-md"
          style={{
            background: 'linear-gradient(135deg, hsl(34 38% 30% / 0.10) 0%, hsl(214 60% 4% / 0.85) 100%)',
          }}
        >
          <h2 className="font-cinzel font-bold text-xl sm:text-2xl text-gradient-gold mb-5">
            Como funciona, em termos simples
          </h2>
          <div className="space-y-4 font-montserrat text-sm text-text-secondary leading-relaxed">
            <p>
              <strong className="text-foreground">1. Autenticação.</strong> Você entra com e-mail e senha (ou Google).
              Receba um token assinado de curta duração que prova quem você é a cada requisição.
              Sem token válido, o servidor recusa qualquer leitura.
            </p>
            <p>
              <strong className="text-foreground">2. Regra de acesso no próprio banco.</strong> Cada tabela
              (manuscritos, capítulos, codex, galeria) tem uma política que compara o seu identificador
              de usuário com o dono da linha. A regra roda dentro do PostgreSQL — não depende do
              aplicativo se comportar bem.
            </p>
            <p>
              <strong className="text-foreground">3. Funções administrativas isoladas.</strong> Operações
              sensíveis (cobrança, webhooks, IA) rodam em funções de borda assinadas, com validação
              de token em código e segredos guardados fora do repositório.
            </p>
            <p>
              <strong className="text-foreground">4. Cascade delete soberano.</strong> Ao excluir sua conta
              ou um mundo, todo o conteúdo associado é apagado em cascata no mesmo instante.
              Nada fica órfão em backups acessíveis.
            </p>
          </div>
        </motion.section>

        {/* Promise */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="rounded-2xl border border-gold-warm/40 bg-gold-deep/10 p-8 text-center"
        >
          <p className="font-cinzel font-bold text-lg sm:text-xl text-gradient-gold mb-3">
            O compromisso da Árvore
          </p>
          <p className="font-amiri italic text-text-secondary text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
            Sua obra é fruto do seu trabalho. Aqui ela permanece sua —
            cifrada, isolada, exportável e jamais usada para treinar máquinas.
          </p>
        </motion.div>

        {/* Footer note */}
        <div className="text-center mt-16">
          <p className="font-montserrat text-[10px] uppercase tracking-[0.3em] text-text-secondary/60">
            Encontrou uma vulnerabilidade? Escreva para contato@arvoredosmundos.app
          </p>
        </div>
      </div>
    </div>
  );
};

export default SegurancaPage;
