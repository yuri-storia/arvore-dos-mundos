import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Trees, X, ScrollText, Trash2, Droplet, Droplets, Leaf, Sparkles, RefreshCw, Check, Gem, AlertTriangle, Eye, Compass, Award, ArrowRight, Star, ClipboardList, PencilLine, Wand2, Quote, BookMarked, ChevronDown } from 'lucide-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { FRUITS, type Fruit } from '@/lib/data';
import { callAIText, callAITextStream, friendlyAIError } from '@/lib/helpers';
import type { CodexEntry } from '@/hooks/useCodexEntries';
import { useSubscription } from '@/hooks/useSubscription';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AnimatePresence, motion } from 'framer-motion';

import ReactMarkdown from 'react-markdown';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import idrielAvatar from '@/assets/idriel-avatar.webp';


interface Props {
  entries: CodexEntry[];
  worldId: string;
  onClose: () => void;
}

interface AnalysisRecord {
  id: string;
  analysis_text: string;
  entry_count: number;
  ficha_count: number;
  artigo_count: number;
  covered_fruits: number;
  created_at: string;
}

const ANALYSIS_COST = 1;

const IDRIEL_NAME = 'Idriel';
const IDRIEL_TITLE = 'Guardiã da Árvore dos Mundos';

const LOADING_STEPS = [
  { message: 'Abrindo os galhos da Árvore para enxergar seu mundo…', delay: 0 },
  { message: 'Analisando suas fichas de personagens, criaturas e lugares…', delay: 3000 },
  { message: 'Agora, vou percorrer seus artigos e anotações…', delay: 7000 },
  { message: 'Verificando a cobertura de cada Fruto do worldbuilding…', delay: 11000 },
  { message: 'Quase lá… estou reunindo minhas considerações finais…', delay: 16000 },
  { message: 'Tecendo a sabedoria dos Frutos em minha avaliação…', delay: 21000 },
];

// Render N/5 ratings as 5-star icon rows (filled + outlined)
const StarRating: React.FC<{ n: number }> = ({ n }) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md align-middle mx-1"
    style={{
      background: 'linear-gradient(135deg, hsl(var(--gold-warm)/0.18), hsl(var(--gold-deep)/0.08))',
      border: '1px solid hsl(var(--gold-warm)/0.35)',
    }}>
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className="w-3 h-3"
          strokeWidth={1.5}
          style={{
            color: 'hsl(var(--gold-light))',
            fill: i < n ? 'hsl(var(--gold-light))' : 'transparent',
            filter: i < n ? 'drop-shadow(0 0 3px hsl(var(--gold-warm)/0.7))' : 'none',
          }}
        />
      ))}
    </span>
    <span className="text-[9px] font-montserrat font-bold tracking-wider text-gold-light/80">{n}/5</span>
  </span>
);

// Walk markdown children and replace plain-text "N/5" with <StarRating>
const renderWithStars = (children: React.ReactNode): React.ReactNode => {
  return React.Children.map(children, (child, idx) => {
    if (typeof child === 'string') {
      const parts = child.split(/(\b[1-5]\/5\b)/g);
      if (parts.length === 1) return child;
      return parts.map((p, i) => {
        const m = p.match(/^([1-5])\/5$/);
        return m ? <StarRating key={`${idx}-${i}`} n={parseInt(m[1], 10)} /> : <React.Fragment key={`${idx}-${i}`}>{p}</React.Fragment>;
      });
    }
    if (React.isValidElement(child) && (child.props as any)?.children) {
      return React.cloneElement(child, { ...(child.props as any) }, renderWithStars((child.props as any).children));
    }
    return child;
  });
};

// ---------- Section parsing (splits Idriel's markdown into blocks) ----------
interface Section { heading: string; body: string; }
function splitSections(md: string): Section[] {
  if (!md) return [];
  const parts = md.split(/^##\s+/m);
  const out: Section[] = [];
  parts.forEach((p, idx) => {
    if (idx === 0) {
      const t = p.trim();
      if (t) out.push({ heading: '', body: t });
      return;
    }
    const nl = p.indexOf('\n');
    const heading = (nl > 0 ? p.slice(0, nl) : p).trim();
    const body = nl > 0 ? p.slice(nl + 1).trim() : '';
    out.push({ heading, body });
  });
  return out;
}

interface FruitEval {
  fruit: Fruit;
  score: number;
  justification?: string;
  evidence?: string[];
}
function parseFruitEvaluations(body: string): FruitEval[] {
  const items: FruitEval[] = [];
  if (!body) return items;
  const lines = body.split(/\r?\n/);
  for (const fruit of FRUITS) {
    const escaped = fruit.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(
      `\\*{0,2}\\s*${escaped}\\s*\\*{0,2}\\s*:?\\s*([0-5])\\s*/\\s*5\\s*[—\\-–:]?\\s*([^\\n]*)`,
      'i'
    );
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      const m = line.match(re);
      if (!m) continue;
      const score = Number(m[1]);
      const tail = (m[2] || '').trim();
      let justification: string | undefined = tail;
      let evidence: string[] | undefined;
      const evMatch = tail.match(/\(([^()]+)\)\s*$/);
      if (evMatch) {
        evidence = evMatch[1].split(/[,;]/).map(s => s.trim()).filter(Boolean);
        justification = tail.slice(0, evMatch.index).trim().replace(/[.;,—–-]+$/, '').trim();
      }
      items.push({ fruit, score, justification: justification || undefined, evidence });
      break;
    }
  }
  return items;
}

// Metadata per section heading (icon, color palette)
function sectionMeta(text: string) {
  let Icon: any = Sparkles;
  let color = 'hsl(var(--gold-warm))';
  let tone: 'gold' | 'blue' | 'danger' | 'warn' | 'emerald' = 'gold';
  if (/Saudação/i.test(text)) { Icon = Gem; }
  else if (/Avaliação/i.test(text)) { Icon = Award; }
  else if (/Furos/i.test(text)) { Icon = Eye; color = 'hsl(0 70% 60%)'; tone = 'danger'; }
  else if (/Inconsistências/i.test(text)) { Icon = AlertTriangle; color = 'hsl(30 80% 58%)'; tone = 'warn'; }
  else if (/Expansão/i.test(text)) { Icon = Compass; color = 'hsl(150 60% 52%)'; tone = 'emerald'; }
  else if (/Fortes/i.test(text)) { Icon = Sparkles; }
  else if (/Continuar/i.test(text)) { Icon = ArrowRight; color = 'hsl(210 70% 68%)'; tone = 'blue'; }
  return { Icon, color, tone };
}

// ---------- Fruit Evaluation Card Grid ----------
const scoreLabel = (n: number) =>
  n >= 5 ? 'Maduro' : n >= 4 ? 'Vigoroso' : n >= 3 ? 'Em flor' : n >= 2 ? 'Germinando' : n >= 1 ? 'Semente' : 'Estéril';

const FruitEvaluationGrid: React.FC<{ items: FruitEval[] }> = ({ items }) => {
  if (items.length === 0) return null;
  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } } }}
    >
      {items.map(({ fruit, score, justification, evidence }) => {
        // Emphasis tier drives visual weight: strong (4-5★), medium (3★), soft (0-2★)
        const emphasis: 'strong' | 'medium' | 'soft' =
          score >= 4 ? 'strong' : score >= 3 ? 'medium' : 'soft';
        const accent =
          emphasis === 'strong'
            ? 'hsl(var(--gold-light))'
            : emphasis === 'medium'
              ? 'hsl(var(--gold-warm))'
              : 'hsl(30 38% 42%)';
        // Per-tier visual weights (background alpha, top-edge alpha, shadow, top-bar height)
        const weight = {
          strong: { bgA: 0.22, edgeA: 0.85, halo: 0.55, ring: 0.28, topBar: '2px' },
          medium: { bgA: 0.14, edgeA: 0.6,  halo: 0.4,  ring: 0.18, topBar: '1px' },
          soft:   { bgA: 0.08, edgeA: 0.35, halo: 0.22, ring: 0.10, topBar: '1px' },
        }[emphasis];

        return (
          <motion.article
            key={fruit.id}
            variants={{
              hidden: { opacity: 0, y: 10, scale: 0.98 },
              visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: [0.32, 0.72, 0, 1] } },
            }}
            whileHover={{ y: -3 }}
            tabIndex={0}
            data-emphasis={emphasis}
            className="fruit-eval-card group focus:outline-none"
            style={{
              // exposed CSS vars consumed by .fruit-eval-card styles in index.css
              ['--accent' as any]: accent,
              ['--bgA' as any]: weight.bgA,
              ['--edgeA' as any]: weight.edgeA,
              ['--haloA' as any]: weight.halo,
              ['--ringA' as any]: weight.ring,
              ['--topBar' as any]: weight.topBar,
            }}
          >
            {/* Gold gradient top edge — accent scaled by emphasis */}
            <div
              className="fruit-eval-card__edge"
              style={{
                height: weight.topBar,
                background: `linear-gradient(to right, transparent, color-mix(in oklab, ${accent}, transparent ${Math.round((1 - weight.edgeA) * 100)}%), transparent)`,
              }}
            />
            {/* Corner halo */}
            <div
              className="fruit-eval-card__halo"
              style={{ background: `radial-gradient(circle, color-mix(in oklab, ${accent}, transparent 50%), transparent 70%)`, opacity: weight.halo }}
            />
            {/* Hover sheen — sweeping gold gradient */}
            <div className="fruit-eval-card__sheen" aria-hidden />

            <div className="relative flex items-start gap-2.5">
              <div
                className="fruit-eval-card__icon shrink-0 w-9 h-9 rounded-lg flex items-center justify-center backdrop-blur-md"
                style={{
                  background: `linear-gradient(135deg, color-mix(in oklab, ${accent}, transparent 82%), hsl(0 0% 100% / 0.02))`,
                  boxShadow: `0 0 14px color-mix(in oklab, ${accent}, transparent 82%), inset 0 0 0 1px color-mix(in oklab, ${accent}, transparent 78%), inset 0 1px 0 hsl(0 0% 100% / 0.05)`,
                }}
              >
                <fruit.Icon className="w-4 h-4" strokeWidth={1.75} style={{ color: accent }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h4 className="font-cinzel font-bold text-[13px] text-foreground truncate">{fruit.name}</h4>
                  <span
                    className="shrink-0 text-[9px] font-montserrat font-bold uppercase tracking-[0.14em] px-1.5 py-0.5 rounded-full backdrop-blur-md"
                    style={{
                      color: accent,
                      background: `linear-gradient(135deg, color-mix(in oklab, ${accent}, transparent 86%), color-mix(in oklab, ${accent}, transparent 94%))`,
                      boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${accent}, transparent ${emphasis === 'strong' ? 70 : 82}%)`,
                    }}
                  >
                    {scoreLabel(score)}
                  </span>
                </div>
                <div className="flex items-center gap-1 mb-1.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className="w-3.5 h-3.5"
                      strokeWidth={1.5}
                      style={{
                        color: 'hsl(var(--gold-light))',
                        fill: i < score ? 'hsl(var(--gold-light))' : 'transparent',
                        filter: i < score ? 'drop-shadow(0 0 3px hsl(var(--gold-warm)/0.6))' : 'none',
                      }}
                    />
                  ))}
                  <span className="ml-1 text-[10px] font-montserrat font-bold text-gold-light/80 tabular-nums">{score}/5</span>
                </div>
                {justification && (
                  <p className="font-merriweather text-[12px] leading-relaxed text-foreground/85">
                    {justification}
                  </p>
                )}
                {evidence && evidence.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {evidence.map((ev, i) => (
                      <button
                        key={i}
                        type="button"
                        className="evidence-chip"
                        data-emphasis={emphasis}
                      >
                        <Quote className="w-2.5 h-2.5 evidence-chip__quote" strokeWidth={1.75} />
                        <span className="evidence-chip__label">{ev}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.article>
        );
      })}
    </motion.div>
  );
};

// ---------- Section Card (wraps a markdown block) ----------
const SectionCard: React.FC<{
  heading: string;
  children: React.ReactNode;
  index: number;
  defaultOpen?: boolean;
  collapsible?: boolean;
}> = ({ heading, children, index, defaultOpen = true, collapsible = true }) => {
  const { Icon, color } = sectionMeta(heading);
  const [open, setOpen] = useState<boolean>(defaultOpen);
  const panelId = React.useId();
  const headerContent = (
    <>
      <span
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg shrink-0 backdrop-blur-md transition-transform duration-300 group-hover:scale-[1.04]"
        style={{
          background: `linear-gradient(135deg, color-mix(in oklab, ${color}, transparent 78%), hsl(0 0% 100% / 0.02))`,
          boxShadow: `0 0 14px color-mix(in oklab, ${color}, transparent 82%), inset 0 0 0 1px color-mix(in oklab, ${color}, transparent 74%), inset 0 1px 0 hsl(0 0% 100% / 0.06)`,
        }}
      >
        <Icon className="w-4 h-4" strokeWidth={1.75} style={{ color }} />
      </span>
      <h3 className="font-cinzel font-bold text-sm sm:text-[15px] uppercase tracking-[0.14em]" style={{ color }}>
        {heading}
      </h3>
      <span className="flex-1 h-px opacity-40" style={{ background: `linear-gradient(to right, color-mix(in oklab, ${color}, transparent 65%), transparent)` }} />
    </>
  );
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1], delay: index * 0.06 }}
      className="relative rounded-2xl p-4 sm:p-5 pl-5 sm:pl-6 overflow-hidden backdrop-blur-xl"
      style={{
        background: `linear-gradient(140deg, rgba(12,10,6,0.55) 0%, rgba(6,8,14,0.68) 100%), radial-gradient(circle at 0% 0%, color-mix(in oklab, ${color}, transparent 82%), transparent 55%)`,
        boxShadow: `inset 0 1px 0 hsl(0 0% 100% / 0.045), inset 0 0 0 1px color-mix(in oklab, ${color}, transparent 88%), 0 14px 40px -22px color-mix(in oklab, ${color}, transparent 55%), 0 1px 0 hsl(0 0% 0% / 0.4)`,
      }}
    >
      {/* Left rail */}
      <div
        className="pointer-events-none absolute left-0 top-4 bottom-4 w-[3px] rounded-full"
        style={{
          background: `linear-gradient(to bottom, transparent, color-mix(in oklab, ${color}, transparent 35%), color-mix(in oklab, ${color}, transparent 55%), transparent)`,
          boxShadow: `0 0 12px color-mix(in oklab, ${color}, transparent 55%)`,
        }}
      />
      {/* Top edge accent */}
      <div
        className="pointer-events-none absolute inset-x-6 top-0 h-px"
        style={{ background: `linear-gradient(to right, transparent, color-mix(in oklab, ${color}, transparent 45%), transparent)` }}
      />
      {/* Corner halo */}
      <div
        className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-30"
        style={{ background: `radial-gradient(circle, color-mix(in oklab, ${color}, transparent 55%), transparent 70%)` }}
      />

      {collapsible ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={panelId}
          className={`relative w-full flex items-center gap-2.5 text-left group focus:outline-none rounded-md transition-[margin,padding] duration-300 ${
            open ? 'mb-3.5 pb-3 border-b' : 'mb-0 pb-0 border-b-0'
          }`}
          style={open ? { borderColor: `color-mix(in oklab, ${color}, transparent 88%)` } : undefined}
        >
          {headerContent}
          <span
            className="inline-flex items-center justify-center w-7 h-7 rounded-full shrink-0 backdrop-blur-md transition-all duration-300 group-hover:brightness-125"
            style={{
              background: `linear-gradient(135deg, color-mix(in oklab, ${color}, transparent 84%), hsl(0 0% 100% / 0.02))`,
              boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${color}, transparent 82%)`,
            }}
            aria-hidden
          >
            <ChevronDown
              className="w-3.5 h-3.5 transition-transform duration-300"
              style={{ color, transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}
              strokeWidth={2.25}
            />
          </span>
        </button>
      ) : (
        <div className="relative w-full flex items-center gap-2.5 text-left group mb-3.5 pb-3 border-b" style={{ borderColor: `color-mix(in oklab, ${color}, transparent 88%)` }}>
          {headerContent}
        </div>
      )}

      <AnimatePresence initial={false}>
        {(collapsible ? open : true) && (
          <motion.div
            id={panelId}
            key="content"
            initial={collapsible ? { height: 0, opacity: 0 } : false}
            animate={{ height: 'auto', opacity: 1 }}
            exit={collapsible ? { height: 0, opacity: 0 } : undefined}
            transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
            className="relative"
            style={{ overflow: collapsible && !open ? 'hidden' : 'visible' }}
          >
            <div className="pt-2 pb-1 -mx-1 px-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
};


export const CodexAnalysis: React.FC<Props> = ({ entries, worldId, onClose }) => {
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [history, setHistory] = useState<AnalysisRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [viewingHistoryId, setViewingHistoryId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [revealedChars, setRevealedChars] = useState(0);
  const [isRevealing, setIsRevealing] = useState(false);
  const [stageMessage, setStageMessage] = useState<string>('');
  const revealTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sub = useSubscription();
  const planLimits = usePlanLimits();
  const { user } = useAuth();

  const creditsRemaining = Math.max(sub.creditLimit - sub.creditsUsed, 0) + (sub.bonusDrops || 0);
  const canAnalyze = planLimits.canUseAI && creditsRemaining >= ANALYSIS_COST;

  // Fetch history on mount (escopado ao mundo ativo)
  const fetchHistory = useCallback(async () => {
    if (!user || !worldId) { setHistoryLoading(false); return; }
    // Inclui análises legadas (world_id NULL) salvas antes do escopo por mundo
    const { data, error: err } = await supabase
      .from('world_analyses')
      .select('*')
      .eq('user_id', user.id)
      .or(`world_id.eq.${worldId},world_id.is.null`)
      .order('created_at', { ascending: false });
    if (!err && data) setHistory(data as AnalysisRecord[]);
    setHistoryLoading(false);
  }, [user, worldId]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // Animated loading steps
  useEffect(() => {
    if (!loading) { setCurrentStep(0); return; }
    const timers = LOADING_STEPS.map((step, i) =>
      setTimeout(() => setCurrentStep(i), step.delay)
    );
    return () => timers.forEach(clearTimeout);
  }, [loading]);

  // Typewriter reveal effect
  useEffect(() => {
    if (!isRevealing || !analysis) return;
    const totalLen = analysis.length;
    const charsPerTick = Math.max(3, Math.ceil(totalLen / 300)); // reveal in ~300 ticks (~6s)
    revealTimerRef.current = setInterval(() => {
      setRevealedChars(prev => {
        const next = prev + charsPerTick;
        if (next >= totalLen) {
          if (revealTimerRef.current) clearInterval(revealTimerRef.current);
          setIsRevealing(false);
          return totalLen;
        }
        return next;
      });
    }, 20);
    return () => { if (revealTimerRef.current) clearInterval(revealTimerRef.current); };
  }, [isRevealing, analysis]);

  // Sanitize AI output: strip emojis/decorative chars and convert star runs to "N/5"
  const sanitizeAnalysis = (txt: string): string => {
    if (!txt) return '';
    let out = txt;
    // Convert runs of star/diamond glyphs (optionally separated by spaces) into "N/5"
    out = out.replace(/(?:[★☆✦✧✨⭐]\s*){1,5}/g, (m) => {
      const n = (m.match(/[★✦✨⭐]/g) || []).length;
      return n > 0 ? `${n}/5 ` : '';
    });
    // Strip emoji / pictographs / variation selectors
    try {
      out = out.replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '');
    } catch {
      out = out.replace(/[\u2600-\u27BF\uE000-\uF8FF\uD800-\uDBFF\uDC00-\uDFFF]/g, '');
    }
    // Fix malformed bold like "** Texto **" or "**  Texto  **" -> "**Texto**"
    out = out.replace(/\*\*\s+([^*\n]+?)\s+\*\*/g, '**$1**');
    out = out.replace(/\*\*\s+([^*\n]+?)\*\*/g, '**$1**');
    out = out.replace(/\*\*([^*\n]+?)\s+\*\*/g, '**$1**');
    // Collapse leftover double spaces created by removals
    out = out.replace(/[ \t]{2,}/g, ' ').replace(/^\s*[-–—]\s*$/gm, '');
    return out;
  };

  // Compute visible text (snap to last complete line to avoid broken markdown)
  const displayedAnalysis = useMemo(() => {
    const full = sanitizeAnalysis(analysis);
    if (!full) return '';
    if (!isRevealing && revealedChars >= analysis.length) return full;
    if (viewingHistoryId) return full; // history = instant
    const slice = full.slice(0, revealedChars);
    const lastNewline = slice.lastIndexOf('\n');
    return lastNewline > 0 ? slice.slice(0, lastNewline) : slice;
  }, [analysis, revealedChars, isRevealing, viewingHistoryId]);

  const buildPrompt = () => {
    const lines: string[] = [];
    FRUITS.forEach(fruit => {
      const fruitEntries = entries.filter(e => e.fruit_id === fruit.id);
      if (fruitEntries.length === 0) {
        lines.push(`## ${fruit.name}\nNenhuma entrada criada.\n`);
        return;
      }
      lines.push(`## ${fruit.name} (${fruitEntries.length} entradas)`);
      fruitEntries.forEach(e => {
        const typeLabel = e.entry_type === 'ficha' ? 'Ficha' : 'Artigo';
        const contentPreview = (e.content || '').slice(0, 600);
        lines.push(`### ${typeLabel}: ${e.title}`);
        lines.push(contentPreview || '(sem conteúdo)');
        lines.push('');
      });
    });
    const orphans = entries.filter(e => e.fruit_id === null);
    if (orphans.length > 0) {
      lines.push(`## Sem fruto associado (${orphans.length})`);
      orphans.forEach(e => {
        lines.push(`- ${e.title}: ${(e.content || '').slice(0, 200)}`);
      });
    }
    return lines.join('\n');
  };

  const handleAnalyze = async () => {
    if (entries.length === 0 || !canAnalyze || !user) return;
    setLoading(true);
    setError('');
    setAnalysis('');
    setViewingHistoryId(null);
    setShowHistory(false);

    const systemPrompt = `Você é ${IDRIEL_NAME}, a ${IDRIEL_TITLE} — uma sábia ancestral que observa mundos florescerem. Nunca se descreva como "élfica" ou "imortal"; use apenas o título "Guardiã da Árvore dos Mundos". Fale com elegância, sofisticação e sabedoria contida. Seja objetiva, concisa e premium. Trate o usuário como "viajante".

REGRAS DE ESTILO INVIOLÁVEIS:
- NÃO use emojis em nenhuma circunstância (sem 🌟, ⭐, ✨, 🌿, 🌳, etc.). A estética é editorial e refinada, não infantil.
- NÃO use ícones decorativos, hashtags soltas, exclamações exageradas ou linguagem coloquial.
- Use APENAS texto e Markdown sóbrio (cabeçalhos ##, listas com -, **negrito**, *itálico*).
- Para avaliações com estrelas, escreva sempre "3/5" em texto puro — NUNCA caracteres ★ ou ✰.

A metodologia "Árvore dos Mundos" usa 11 pilares ("Frutos"):
${FRUITS.map(f => `- ${f.name}`).join('\n')}

Analise as entradas do Codex e responda em português brasileiro. NÃO repita saudações. Use EXATAMENTE estas seções, nesta ordem:

## Saudação
Uma ÚNICA frase poética de boas-vindas (máximo 2 linhas, sem emojis).

## Avaliação dos Frutos
Para CADA um dos 11 Frutos, escreva UMA linha no formato EXATO abaixo, sem espaços extras dentro dos asteriscos e SEM emojis:
- **Nome do Fruto**: N/5 — justificativa breve em 1 frase (até 140 caracteres). (Entrada citada 1, Entrada citada 2)

Regras da linha:
- A justificativa deve apontar O QUE motivou a nota (ex.: "Geografia clara, falta clima"; "Sem fichas de espécies"; "Sistema sem regras de custo").
- Entre parênteses no fim, cite 1 a 3 TÍTULOS exatos de fichas/artigos do Codex que embasam a nota — separados por vírgula. Se não houver nada relevante, omita os parênteses.
- Liste os frutos nesta ordem: ${FRUITS.map(f => f.name).join(', ')}.
- Se o fruto não tem entradas, dê 1/5 com justificativa "Sem entradas — pilar a desenvolver" e omita parênteses.

Exemplo:
- **Mapa do Mundo**: 3/5 — Geografia clara, falta detalhamento climático e fronteiras políticas. (Reino de Lyrr, Mar de Vetra)

## Furos de Enredo
Identifique contradições, lacunas lógicas ou informações que se contradizem entre fichas/artigos. Se não houver, diga brevemente.

## Inconsistências de Worldbuilding
Aponte elementos que não fazem sentido dentro da lógica interna do mundo (ex.: tecnologia incompatível com a era, geografia contraditória, sistemas de magia sem regras claras).

## Oportunidades de Expansão
Sugira 3-5 áreas promissoras onde o mundo pode crescer, referenciando entradas específicas do criador.

## Pontos Fortes
Destaque o que está bem construído. Cite entradas específicas.

## Por Onde Continuar
Liste 3 ações concretas e prioritárias, ordenadas por importância. Priorize os frutos com notas mais baixas.

Seja construtiva, honesta e SUCINTA. Assine ao final apenas com "— Idriel, ${IDRIEL_TITLE}".`;

    try {
      // Throttle stream updates to ~10fps to prevent flicker from re-rendering
      // large markdown trees on every token.
      let lastFlush = 0;
      let pending: string | null = null;
      let rafId: number | null = null;
      const flush = () => {
        rafId = null;
        if (pending == null) return;
        setAnalysis(pending);
        setRevealedChars(pending.length);
        pending = null;
        lastFlush = performance.now();
      };
      const content = await callAITextStream(
        [{ role: 'user', content: `Aqui estão todas as entradas do meu Codex:\n\n${buildPrompt()}` }],
        systemPrompt,
        (acc) => {
          pending = acc;
          const now = performance.now();
          if (now - lastFlush >= 100 && rafId == null) {
            rafId = requestAnimationFrame(flush);
          }
        }
      );
      if (rafId != null) cancelAnimationFrame(rafId);

      // Parse per-fruit scores out of Idriel's response so the fruit grid can use them
      const { parseFruitScoresFromAnalysis } = await import('@/hooks/useLatestAnalysis');
      const fruitScores = parseFruitScoresFromAnalysis(content);

      // Save to history
      const fichas = entries.filter(e => e.entry_type === 'ficha').length;
      const artigos = entries.filter(e => e.entry_type === 'artigo').length;
      const coveredFruits = FRUITS.filter(f => entries.some(e => e.fruit_id === f.id)).length;

      await supabase.from('world_analyses').insert({
        user_id: user.id,
        world_id: worldId,
        analysis_text: content,
        entry_count: entries.length,
        ficha_count: fichas,
        artigo_count: artigos,
        covered_fruits: coveredFruits,
        fruit_scores: fruitScores as any,
      });

      setAnalysis(content);
      setRevealedChars(content.length);
      setIsRevealing(false);
      fetchHistory();

    } catch (e: any) {
      const f = friendlyAIError(e?.message || '');
      setError(`${f.title} ${f.hint}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAnalysis = async (id: string) => {
    await supabase.from('world_analyses').delete().eq('id', id);
    setHistory(prev => prev.filter(a => a.id !== id));
    if (viewingHistoryId === id) {
      setViewingHistoryId(null);
      setAnalysis('');
    }
  };

  const viewHistoryItem = (item: AnalysisRecord) => {
    setAnalysis(item.analysis_text);
    setViewingHistoryId(item.id);
    setShowHistory(false);
    setError('');
  };

  const fichas = entries.filter(e => e.entry_type === 'ficha').length;
  const artigos = entries.filter(e => e.entry_type === 'artigo').length;
  const coveredFruits = FRUITS.filter(f => entries.some(e => e.fruit_id === f.id)).length;


  

  return (
    <div
      className="rounded-2xl p-4 sm:p-6 mb-6 animate-fadeUp border border-gold/25 relative overflow-hidden"
      style={{
        background:
          'linear-gradient(135deg, rgba(20,14,4,0.92) 0%, rgba(10,8,2,0.95) 50%, rgba(8,5,10,0.92) 100%)',
        backdropFilter: 'blur(20px)',
        boxShadow:
          '0 18px 60px rgba(0,0,0,0.55), 0 0 80px hsl(var(--gold-warm)/0.10), inset 0 1px 0 hsl(var(--gold-champagne)/0.12)',
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{ background: 'radial-gradient(ellipse 60% 60% at 0% 0%, hsl(var(--gold-warm)/0.10) 0%, transparent 70%)' }}
      />
      <div className="relative">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-3.5 min-w-0">
          {/* Idriel medallion */}
          <div className="relative shrink-0">
            <div className="absolute inset-0 -m-1.5 rounded-full bg-gold-warm/25 blur-lg opacity-70" />
            <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden border border-gold-warm/60 shadow-[0_0_18px_hsl(var(--gold-warm)/0.4)]">
              <img src={idrielAvatar} alt="Idriel" className="w-full h-full object-cover object-top" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-gradient-to-br from-gold-champagne to-gold-warm border border-gold-cream/50 flex items-center justify-center shadow-[0_0_8px_hsl(var(--gold-warm)/0.6)]">
              <Wand2 className="w-2.5 h-2.5 text-[#1a0f00]" strokeWidth={2.25} />
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[9px] font-montserrat font-bold uppercase tracking-[0.22em] text-gold-champagne/80">Ritual da Guardiã</span>
            </div>
            <h3 className="font-cinzel font-bold text-base sm:text-lg leading-tight bg-gradient-to-r from-gold-champagne via-gold-light to-gold-champagne bg-clip-text text-transparent">
              {IDRIEL_NAME} — {IDRIEL_TITLE}
            </h3>
            <p className="font-merriweather italic text-text-dim text-[11px] mt-1">
              A sábia guardiã irá avaliar suas entradas e iluminar o caminho a seguir
            </p>
          </div>
        </div>
        <button onClick={onClose} className="shrink-0 w-8 h-8 rounded-full border border-gold-warm/25 text-text-dim hover:text-gold-light hover:border-gold-warm/60 hover:bg-gold-warm/5 flex items-center justify-center transition-colors" aria-label="Fechar"><X className="w-3.5 h-3.5" strokeWidth={2} /></button>
      </div>

      {/* Stats summary — refined glass */}
      <div className="grid grid-cols-3 gap-2.5 mb-4">
        <div className="relative rounded-lg px-3 py-2.5 border border-blue-bright/25 bg-gradient-to-br from-blue-bright/10 via-blue-main/[0.06] to-transparent overflow-hidden">
          <div className="pointer-events-none absolute -top-4 -right-4 w-14 h-14 rounded-full bg-blue-glow/25 blur-2xl" />
          <div className="relative flex items-center gap-1.5 mb-1">
            <ClipboardList className="w-3 h-3 text-blue-light" strokeWidth={2} />
            <p className="text-[9px] uppercase tracking-[0.14em] text-blue-light/80 font-montserrat font-bold">Fichas</p>
          </div>
          <p className="relative text-xl font-cinzel font-bold text-blue-light tabular-nums leading-none">{fichas}</p>
        </div>
        <div className="relative rounded-lg px-3 py-2.5 border border-gold-warm/30 bg-gradient-to-br from-gold-warm/12 via-gold/[0.06] to-transparent overflow-hidden">
          <div className="pointer-events-none absolute -top-4 -right-4 w-14 h-14 rounded-full bg-gold-champagne/25 blur-2xl" />
          <div className="relative flex items-center gap-1.5 mb-1">
            <PencilLine className="w-3 h-3 text-gold-light" strokeWidth={2} />
            <p className="text-[9px] uppercase tracking-[0.14em] text-gold-light/80 font-montserrat font-bold">Artigos</p>
          </div>
          <p className="relative text-xl font-cinzel font-bold text-gold-light tabular-nums leading-none">{artigos}</p>
        </div>
        <div className="relative rounded-lg px-3 py-2.5 border border-gold-champagne/30 bg-gradient-to-br from-gold-champagne/10 via-gold-warm/[0.05] to-transparent overflow-hidden">
          <div className="pointer-events-none absolute -top-4 -right-4 w-14 h-14 rounded-full bg-gold-warm/20 blur-2xl" />
          <div className="relative flex items-center gap-1.5 mb-1">
            <Leaf className="w-3 h-3 text-gold-champagne" strokeWidth={2} />
            <p className="text-[9px] uppercase tracking-[0.14em] text-gold-champagne/85 font-montserrat font-bold">Frutos</p>
          </div>
          <p className="relative text-xl font-cinzel font-bold text-gold-champagne tabular-nums leading-none">{coveredFruits}<span className="text-sm text-text-dim/70">/11</span></p>
        </div>
      </div>

      {/* Coverage bar — refined */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[9px] uppercase tracking-[0.18em] text-gold-champagne/75 font-montserrat font-bold inline-flex items-center gap-1.5">
            <Compass className="w-3 h-3" strokeWidth={1.75} />
            Cobertura dos Frutos
          </span>
          <span className="text-[10px] text-gold-light font-montserrat font-bold tabular-nums">{Math.round((coveredFruits / 11) * 100)}%</span>
        </div>
        <div className="relative h-2 w-full rounded-full overflow-hidden border border-gold-warm/20"
          style={{ background: 'linear-gradient(180deg, hsl(220 50% 4%) 0%, hsl(220 40% 7%) 100%)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.7)' }}>
          <div
            className="relative h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${(coveredFruits / 11) * 100}%`,
              background: 'linear-gradient(90deg, hsl(46 95% 78%) 0%, hsl(44 92% 62%) 50%, hsl(32 78% 42%) 100%)',
              boxShadow: '0 0 10px hsl(var(--gold-warm) / 0.55), inset 0 1px 0 rgba(255, 240, 200, 0.5)',
            }}
          >
            <div className="absolute inset-x-0 top-0 h-1/2 rounded-t-full pointer-events-none"
              style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 100%)' }} />
          </div>
        </div>
      </div>

      {/* History button — elegant scroll */}
      {!historyLoading && history.length > 0 && (
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full mb-4 px-3.5 py-2.5 rounded-lg border border-gold-warm/25 bg-gradient-to-r from-gold-warm/[0.08] via-gold/[0.04] to-transparent hover:from-gold-warm/[0.16] hover:via-gold/[0.08] hover:border-gold-warm/45 transition-all text-left flex items-center justify-between group"
        >
          <span className="text-[10px] uppercase tracking-[0.18em] font-montserrat font-bold text-gold-light inline-flex items-center gap-2">
            <ScrollText className="w-3.5 h-3.5 text-gold-champagne" strokeWidth={1.75} />
            Histórico de Análises
            <span className="px-1.5 py-0.5 rounded-full bg-gold-warm/15 border border-gold-warm/30 text-[9px] text-gold-champagne tabular-nums">{history.length}</span>
          </span>
          <span className="text-gold-champagne/70 text-xs group-hover:text-gold-light transition-colors">{showHistory ? '▲' : '▼'}</span>
        </button>
      )}

      {/* History list — refined scroll of past readings */}
      <AnimatePresence initial={false}>
        {showHistory && (
          <motion.div
            key="history"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            className="mb-4 overflow-hidden"
          >
            <ScrollArea className="max-h-[280px]">
              <motion.div
                className="space-y-2 pr-2"
                initial="hidden"
                animate="visible"
                variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.04 } } }}
              >
                {history.map((item, idx) => {
                  const active = viewingHistoryId === item.id;
                  return (
                    <motion.div
                      key={item.id}
                      variants={{
                        hidden: { opacity: 0, x: -8 },
                        visible: { opacity: 1, x: 0, transition: { duration: 0.28, ease: [0.32, 0.72, 0, 1] } },
                      }}
                      className={`relative rounded-lg p-3 pl-4 border transition-all cursor-pointer group overflow-hidden ${
                        active
                          ? 'border-gold-warm/50 bg-gold-warm/[0.08] shadow-[0_0_20px_-10px_hsl(var(--gold-warm)/0.6)]'
                          : 'border-gold-warm/15 bg-[rgba(8,6,2,0.4)] hover:border-gold-warm/35 hover:bg-gold-warm/[0.04]'
                      }`}
                    >
                      <span
                        className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full"
                        style={{
                          background: active
                            ? 'linear-gradient(180deg, hsl(var(--gold-light)), hsl(var(--gold-warm)))'
                            : 'linear-gradient(180deg, hsl(var(--gold-warm)/0.5), transparent)',
                        }}
                      />
                      <div className="flex items-center justify-between gap-2">
                        <button onClick={() => viewHistoryItem(item)} className="flex-1 text-left min-w-0">
                          <p className="text-xs font-cinzel font-bold text-foreground inline-flex items-center gap-2">
                            <BookMarked className="w-3 h-3 text-gold-champagne shrink-0" strokeWidth={1.75} />
                            {new Date(item.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                            <span className="text-text-dim font-montserrat font-normal">
                              {new Date(item.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </p>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            <span className="text-[10px] font-montserrat px-1.5 py-0.5 rounded-md bg-blue-main/12 text-blue-light/90 border border-blue-bright/25 inline-flex items-center gap-1">
                              <ClipboardList className="w-2.5 h-2.5" strokeWidth={2} />{item.ficha_count}
                            </span>
                            <span className="text-[10px] font-montserrat px-1.5 py-0.5 rounded-md bg-gold-warm/12 text-gold-light border border-gold-warm/30 inline-flex items-center gap-1">
                              <PencilLine className="w-2.5 h-2.5" strokeWidth={2} />{item.artigo_count}
                            </span>
                            <span className="text-[10px] font-montserrat px-1.5 py-0.5 rounded-md bg-gold-champagne/12 text-gold-champagne border border-gold-champagne/30 inline-flex items-center gap-1">
                              <Leaf className="w-2.5 h-2.5" strokeWidth={2} />{item.covered_fruits}/11
                            </span>
                          </div>
                        </button>
                        <ConfirmDialog
                          trigger={
                            <button
                              onClick={(e) => e.stopPropagation()}
                              className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-full text-destructive/80 hover:bg-destructive/10 hover:text-destructive flex items-center justify-center transition-all shrink-0"
                              title="Excluir análise"
                            >
                              <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                            </button>
                          }
                          title="Excluir análise"
                          description="Tem certeza que deseja excluir esta análise? Ela não poderá ser recuperada."
                          confirmLabel="Excluir"
                          onConfirm={() => handleDeleteAnalysis(item.id)}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>



      {!sub.loading && !planLimits.canUseAI && (
        <div className="rounded-lg px-3.5 py-2.5 mb-4 border border-destructive/30 bg-destructive/5">
          <p className="text-[11px] text-destructive font-merriweather italic inline-flex items-start gap-2">
            <Droplets className="w-3.5 h-3.5 mt-0.5 shrink-0" strokeWidth={1.75} />
            <span>Idriel precisa de Elixir dos Mundos para novas análises. Você ainda pode revisitar análises anteriores no histórico.</span>
          </p>
        </div>
      )}

      {!displayedAnalysis && !loading && (
        <div className="text-center">
          {entries.length === 0 ? (
            <p className="text-text-dim font-merriweather italic text-sm py-4">
              Crie pelo menos uma entrada no Codex antes de consultar {IDRIEL_NAME}.
            </p>
          ) : (
            <button
              onClick={handleAnalyze}
              disabled={!canAnalyze || sub.loading}
              className="group relative inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-gradient-to-r from-gold-deep via-gold-warm to-gold-champagne text-[#1a0f00] hover:from-gold-warm hover:via-gold-champagne hover:to-gold-cream font-cinzel font-bold text-[13px] tracking-wide transition-all shadow-[0_10px_28px_-8px_hsl(var(--gold-warm)/0.55),inset_0_1px_0_hsl(var(--gold-cream)/0.55)] hover:shadow-[0_14px_36px_-8px_hsl(var(--gold-warm)/0.75),inset_0_1px_0_hsl(var(--gold-cream)/0.7)] hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0 border border-gold-cream/40"
            >
              <Sparkles className="w-4 h-4" strokeWidth={2} />
              <span>Consultar {IDRIEL_NAME}</span>
              <span className="opacity-70 font-montserrat font-semibold text-[11px] normal-case tracking-normal">· {entries.length} entrada{entries.length !== 1 ? 's' : ''}</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" strokeWidth={2} />
            </button>
          )}
          <p className="text-[10px] text-text-dim mt-3 font-montserrat">
            <Droplet className="inline-block w-3 h-3 mr-1 align-[-0.1em] text-gold-champagne" strokeWidth={1.75} />
            Custo: <span className="font-bold text-gold-light">{ANALYSIS_COST} gota</span> · Você tem <span className="font-bold text-gold-light">{creditsRemaining} gotas</span> · Análises anteriores são gratuitas
          </p>
        </div>
      )}



      {/* Loading — Idriel weaving the analysis */}
      <AnimatePresence>
        {loading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
            className="py-8"
          >
            <div className="flex flex-col items-center gap-4 mb-7">
              <div className="relative">
                <motion.span
                  aria-hidden
                  className="absolute inset-[-14px] rounded-full"
                  style={{ background: 'radial-gradient(circle, hsl(var(--gold-warm)/0.35), transparent 65%)' }}
                  animate={{ scale: [1, 1.15, 1], opacity: [0.55, 0.85, 0.55] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                />
                <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-gold-warm/60 shadow-[0_0_36px_hsl(var(--gold-warm)/0.5)]">
                  <img src={idrielAvatar} alt="Idriel" className="w-full h-full object-cover object-top" />
                </div>
                <motion.div
                  className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, hsl(var(--gold-light)), hsl(var(--gold-warm)))',
                    boxShadow: '0 0 14px hsl(var(--gold-warm)/0.6)',
                  }}
                  animate={{ rotate: [0, 8, -8, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Wand2 className="w-3.5 h-3.5 text-[#1a0f00]" strokeWidth={2} />
                </motion.div>
              </div>
              <div className="text-center">
                <p
                  className="font-cinzel font-bold text-base"
                  style={{
                    background: 'linear-gradient(90deg, hsl(var(--gold-cream)), hsl(var(--gold-light)), hsl(var(--gold-champagne)))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {IDRIEL_NAME}
                </p>
                <p className="text-[10px] text-gold-champagne/80 font-montserrat italic tracking-wide">
                  está tecendo a análise do seu mundo…
                </p>
              </div>
            </div>

            <div className="space-y-2.5 max-w-md mx-auto">
              {LOADING_STEPS.map((step, i) => {
                const state = i < currentStep ? 'done' : i === currentStep ? 'active' : 'pending';
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: state === 'pending' ? 0.3 : 1, x: 0 }}
                    transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
                    className={`flex items-start gap-2.5 rounded-lg px-3 py-2 border ${
                      state === 'active'
                        ? 'border-gold-warm/40 bg-gold-warm/[0.06] shadow-[0_0_18px_-10px_hsl(var(--gold-warm)/0.7)]'
                        : state === 'done'
                          ? 'border-gold-warm/20 bg-transparent'
                          : 'border-transparent bg-transparent'
                    }`}
                  >
                    <span
                      className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                        state === 'done'
                          ? 'bg-gold-warm/25 text-gold-light'
                          : state === 'active'
                            ? 'bg-gold-warm/40 text-gold-cream'
                            : 'bg-secondary text-text-dim'
                      }`}
                    >
                      {state === 'done' ? (
                        <Check className="w-3 h-3" strokeWidth={2.5} />
                      ) : state === 'active' ? (
                        <motion.span
                          className="w-1.5 h-1.5 rounded-full bg-current"
                          animate={{ scale: [1, 1.6, 1], opacity: [1, 0.6, 1] }}
                          transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                        />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      )}
                    </span>
                    <p className={`font-merriweather italic text-[13px] leading-snug ${
                      state === 'active' ? 'text-foreground' : 'text-text-dim'
                    }`}>
                      {step.message}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="rounded-md p-3 bg-destructive/10 border border-destructive/30 text-destructive text-sm font-merriweather">
          {error}
        </div>
      )}

      {displayedAnalysis && !loading && (() => {
        const sections = splitSections(displayedAnalysis);
        return (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
            className="mt-4"
          >
            {viewingHistoryId && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-3 px-3 py-1.5 rounded-md bg-gold-warm/8 border border-gold-warm/25 flex items-center gap-2"
              >
                <span className="text-[10px] text-gold-champagne font-montserrat inline-flex items-center gap-1.5">
                  <ScrollText className="w-3 h-3" strokeWidth={1.75} />Visualizando análise do histórico
                </span>
                <button
                  onClick={() => { setViewingHistoryId(null); setAnalysis(''); setRevealedChars(0); }}
                  className="text-[10px] text-text-dim hover:text-foreground font-montserrat underline ml-auto"
                >
                  Voltar
                </button>
              </motion.div>
            )}

            {isRevealing && (
              <div className="mb-3 flex items-center gap-1.5 text-gold-light/70">
                <span className="w-1.5 h-1.5 rounded-full bg-gold-champagne animate-pulse" />
                <span className="text-[10px] font-montserrat italic">Idriel escrevendo…</span>
              </div>
            )}

            <div className="space-y-3">
              {sections.map((sec, idx) => {
                if (!sec.heading) {
                  // Preamble (no heading yet) — render as plain markdown block
                  return (
                    <motion.div
                      key={`pre-${idx}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
                      className="prose prose-sm prose-invert max-w-none
                        [&_p]:font-merriweather [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-foreground/85
                        [&_strong]:text-gold-light [&_strong]:font-bold
                        [&_em]:text-gold-champagne/90"
                    >
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p>{renderWithStars(children)}</p>,
                          strong: ({ children }) => <strong className="text-gold-light font-bold">{children}</strong>,
                        }}
                      >
                        {sec.body}
                      </ReactMarkdown>
                    </motion.div>
                  );
                }
                const isFruits = /Avaliação/i.test(sec.heading);
                const isSaudacao = /Saudação/i.test(sec.heading);
                const fruitEvals = isFruits ? parseFruitEvaluations(sec.body) : [];
                return (
                  <SectionCard key={`sec-${idx}`} heading={sec.heading} index={idx} collapsible={!isSaudacao}>
                    {isFruits && fruitEvals.length > 0 ? (
                      <FruitEvaluationGrid items={fruitEvals} />
                    ) : (
                      <div className="prose prose-sm prose-invert max-w-none
                        [&_h3]:font-montserrat [&_h3]:text-sm [&_h3]:font-bold [&_h3]:mt-3 [&_h3]:mb-1 [&_h3]:text-foreground
                        [&_p]:font-merriweather [&_p]:text-[13px] [&_p]:leading-relaxed [&_p]:text-foreground/85
                        [&_ul]:font-merriweather [&_ul]:text-[13px] [&_ul]:text-foreground/85 [&_ul]:pl-4
                        [&_ol]:font-merriweather [&_ol]:text-[13px] [&_ol]:text-foreground/85 [&_ol]:pl-4
                        [&_li]:mb-1 [&_li]:marker:text-gold-warm
                        [&_strong]:text-gold-light [&_strong]:font-bold
                        [&_blockquote]:border-l-2 [&_blockquote]:border-gold/40 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-text-dim
                        [&_em]:text-gold-champagne/90">
                        <ReactMarkdown
                          components={{
                            strong: ({ children }) => <strong className="text-gold-light font-bold">{children}</strong>,
                            li: ({ children }) => <li className="mb-1">{renderWithStars(children)}</li>,
                            p: ({ children }) => <p>{renderWithStars(children)}</p>,
                          }}
                        >
                          {sec.body}
                        </ReactMarkdown>
                      </div>
                    )}
                  </SectionCard>
                );
              })}
            </div>

            <div className="flex gap-2 mt-4 justify-end">
              {!viewingHistoryId && (
                <button
                  onClick={handleAnalyze}
                  disabled={!canAnalyze}
                  className="px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground rounded-md text-[10px] font-montserrat font-bold uppercase tracking-wider transition-colors disabled:opacity-40"
                >
                  <><RefreshCw className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} />Nova análise</>
                </button>
              )}
              <button
                onClick={() => {
                  if (viewingHistoryId) { setViewingHistoryId(null); setAnalysis(''); }
                  else onClose();
                }}
                className="px-3 py-1.5 text-text-dim hover:text-foreground text-[10px] font-montserrat uppercase tracking-wider transition-colors"
              >
                {viewingHistoryId ? 'Voltar' : 'Fechar'}
              </button>
            </div>
          </motion.div>
        );
      })()}

      </div>
    </div>
  );
};
