import React, { useMemo, useState } from 'react';
import type { Chapter } from '@/hooks/useManuscript';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Sparkles, Loader2, CheckCircle2, XCircle, AlertTriangle, Leaf } from 'lucide-react';
import { toast } from 'sonner';
import { smartFormatChapter, previewChapterCost } from '@/lib/chapterFormat';

const MIN_CHARS = 40;

const stripHTML = (s: string) =>
  (s || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

interface Props {
  chapters: Chapter[];
  onChapterUpdate: (id: string, patch: Partial<Chapter>) => Promise<void> | void;
}

type ChapterStatus = 'pending' | 'running' | 'done-local' | 'done-ai' | 'skipped' | 'error';

interface Row {
  id: string;
  title: string;
  estimatedCost: 0 | 1 | 2;
  actualCost: number;
  status: ChapterStatus;
  message?: string;
}

export const FormatAllChaptersDialog: React.FC<Props> = ({ chapters, onChapterUpdate }) => {
  const plan = usePlanLimits();
  const [open, setOpen] = useState(false);
  const [guidance, setGuidance] = useState('');
  const [running, setRunning] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [aborted, setAborted] = useState(false);

  const eligibleChapters = useMemo(
    () => chapters.filter((c) => stripHTML(c.content || '').length >= MIN_CHARS),
    [chapters],
  );
  const skippedCount = chapters.length - eligibleChapters.length;

  const preview = useMemo(() => {
    let total = 0;
    let local = 0;
    let cheap = 0;
    let full = 0;
    for (const c of eligibleChapters) {
      const cost = previewChapterCost(c.content || '');
      total += cost;
      if (cost === 0) local++;
      else if (cost === 1) cheap++;
      else full++;
    }
    return { total, local, cheap, full };
  }, [eligibleChapters]);

  if (!plan.canUseAI) return null;

  const doneCount = rows.filter((r) => r.status === 'done-local' || r.status === 'done-ai').length;
  const errorCount = rows.filter((r) => r.status === 'error').length;
  const totalDone = rows.filter(
    (r) => r.status === 'done-local' || r.status === 'done-ai' || r.status === 'error' || r.status === 'skipped',
  ).length;
  const totalActualCost = rows.reduce((sum, r) => sum + r.actualCost, 0);
  const progressPct = rows.length ? Math.round((totalDone / rows.length) * 100) : 0;

  const reset = () => {
    setRows([]);
    setAborted(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (running) return;
    setOpen(next);
    if (!next) {
      reset();
      setGuidance('');
    }
  };

  const runAll = async () => {
    if (eligibleChapters.length === 0) {
      toast.error('Nenhum capítulo com texto suficiente para formatar.');
      return;
    }

    const initial: Row[] = eligibleChapters.map((c) => ({
      id: c.id,
      title: c.title,
      estimatedCost: previewChapterCost(c.content || ''),
      actualCost: 0,
      status: 'pending',
    }));
    setRows(initial);
    setRunning(true);
    setAborted(false);

    let localAborted = false;
    const trimmedGuidance = guidance.trim() || undefined;

    for (const ch of eligibleChapters) {
      if (localAborted) break;
      setRows((prev) => prev.map((r) => (r.id === ch.id ? { ...r, status: 'running' } : r)));

      const outcome = await smartFormatChapter({ content: ch.content || '', guidance: trimmedGuidance });

      if (outcome.kind === 'error') {
        setRows((prev) => prev.map((r) => (r.id === ch.id ? { ...r, status: 'error', message: outcome.message } : r)));
        if (outcome.aborted) {
          localAborted = true;
          setAborted(true);
          toast.error('Interrompido: ' + outcome.message);
        }
        continue;
      }

      try {
        await onChapterUpdate(ch.id, { content: outcome.content });
        setRows((prev) => prev.map((r) => {
          if (r.id !== ch.id) return r;
          if (outcome.kind === 'local') {
            return { ...r, status: 'done-local', actualCost: 0 };
          }
          return { ...r, status: 'done-ai', actualCost: outcome.costDrops };
        }));
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erro ao salvar capítulo.';
        setRows((prev) => prev.map((r) => (r.id === ch.id ? { ...r, status: 'error', message: msg } : r)));
      }
    }

    setRunning(false);
    if (!localAborted) toast.success('Formatação em lote concluída.');
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-[11px] font-montserrat font-bold uppercase tracking-wider border-amber-400/40 text-amber-300 hover:text-amber-200 hover:bg-amber-500/10 hover:border-amber-400/60"
          title="Idriel formata a diagramação de todos os capítulos."
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Formatar tudo</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="border-amber-400/25 bg-gradient-to-br from-[#0a0f18] via-[#0b0e16] to-[#0a0e18] backdrop-blur-2xl max-w-xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl opacity-40 bg-amber-400/20" />
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
        <DialogHeader className="relative">
          <DialogTitle className="font-cinzel text-lg text-amber-300 flex items-center gap-2.5 tracking-wide">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-amber-400/25 to-amber-500/5 border border-amber-400/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <Sparkles className="w-4 h-4" strokeWidth={2} />
            </span>
            Formatar todos os capítulos
          </DialogTitle>
          <DialogDescription className="font-montserrat text-sm text-text-secondary leading-relaxed">
            A Idriel refina apenas a <strong className="text-amber-200/90">diagramação</strong> — parágrafos, travessões, espaçamento.
            Capítulos já bem formatados são resolvidos localmente, <strong className="text-emerald-300">de graça</strong>.
          </DialogDescription>
        </DialogHeader>

        {rows.length === 0 ? (
          <>
            <div className="rounded-md border border-amber-400/20 bg-amber-400/[0.04] p-3 text-xs font-montserrat text-amber-200/90 space-y-1.5">
              <div>
                Capítulos elegíveis: <strong>{eligibleChapters.length}</strong>
                {skippedCount > 0 && (
                  <span className="text-text-dim"> · {skippedCount} pulado(s) por serem curtos</span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div className="rounded border border-emerald-400/20 bg-emerald-400/[0.05] px-2 py-1.5">
                  <div className="flex items-center gap-1 text-emerald-300 font-bold">
                    <Leaf className="w-3 h-3" /> Local · 0g
                  </div>
                  <div className="text-text-secondary mt-0.5">{preview.local} capítulo(s)</div>
                </div>
                <div className="rounded border border-amber-400/20 bg-amber-400/[0.05] px-2 py-1.5">
                  <div className="flex items-center gap-1 text-amber-300 font-bold">
                    <Sparkles className="w-3 h-3" /> IA leve · 1g
                  </div>
                  <div className="text-text-secondary mt-0.5">{preview.cheap} capítulo(s)</div>
                </div>
                <div className="rounded border border-purple-400/20 bg-purple-400/[0.05] px-2 py-1.5">
                  <div className="flex items-center gap-1 text-purple-300 font-bold">
                    <Sparkles className="w-3 h-3" /> IA cheia · 2g
                  </div>
                  <div className="text-text-secondary mt-0.5">{preview.full} capítulo(s)</div>
                </div>
              </div>
              <div className="pt-1 border-t border-amber-400/20">
                Custo total estimado: <strong className="text-amber-200">{preview.total} gota{preview.total === 1 ? '' : 's'}</strong>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-montserrat text-text-secondary">
                Orientação para a Idriel (opcional — aplicada a todos os capítulos)
              </label>
              <textarea
                value={guidance}
                onChange={(e) => setGuidance(e.target.value.slice(0, 1000))}
                placeholder="Ex.: cada fala começa em nova linha; preserve os asteriscos como marcadores de cena."
                rows={3}
                className="w-full bg-white/[0.03] border border-white/10 rounded px-3 py-2 text-sm font-merriweather text-foreground/90 focus:outline-none focus:border-amber-400/40"
              />
              <div className="text-[10px] font-mono text-text-dim text-right">{guidance.length}/1000</div>
            </div>

            <div className="rounded-md border border-white/10 bg-white/[0.02] p-2 text-[11px] font-montserrat text-text-dim flex gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400/70" />
              <span>
                O conteúdo antigo de cada capítulo é substituído após o sucesso. Em capítulos processados por IA,
                o texto (palavras e ortografia) é preservado byte a byte — só as quebras de parágrafo mudam.
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-montserrat">
                <span className="text-text-secondary">
                  Progresso: <strong className="text-amber-300">{totalDone}/{rows.length}</strong>
                  {errorCount > 0 && <span className="text-red-alert ml-2">· {errorCount} com erro</span>}
                </span>
                <span className="text-text-dim">
                  {totalActualCost}g gastos · {progressPct}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto rounded-md border border-white/10 bg-white/[0.02] divide-y divide-white/5">
              {rows.map((r) => (
                <div key={r.id} className="flex items-center gap-2 px-3 py-1.5 text-xs font-montserrat">
                  <StatusIcon status={r.status} />
                  <span className="flex-1 truncate text-foreground/90">{r.title}</span>
                  {r.status === 'done-local' && (
                    <span className="text-[10px] text-emerald-300 font-mono">local · 0g</span>
                  )}
                  {r.status === 'done-ai' && (
                    <span className="text-[10px] text-amber-300 font-mono">IA · −{r.actualCost}g</span>
                  )}
                  {r.status === 'pending' && (
                    <span className="text-[10px] text-text-dim font-mono">~{r.estimatedCost}g</span>
                  )}
                  {r.message && (
                    <span className="text-[10px] text-red-alert/90 truncate max-w-[180px]" title={r.message}>
                      {r.message}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {aborted && (
              <div className="text-[11px] font-montserrat text-red-alert/90">
                Execução interrompida. Os capítulos já formatados foram salvos.
              </div>
            )}
          </>
        )}

        <DialogFooter>
          {rows.length === 0 ? (
            <>
              <Button variant="ghost" onClick={() => handleOpenChange(false)}>Cancelar</Button>
              <Button
                onClick={runAll}
                disabled={eligibleChapters.length === 0}
                className="bg-gradient-to-r from-amber-400/20 to-emerald-400/20 text-amber-200 border border-amber-400/40 hover:from-amber-400/30 hover:to-emerald-400/30"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Formatar {eligibleChapters.length} capítulo{eligibleChapters.length !== 1 ? 's' : ''} (~{preview.total}g)
              </Button>
            </>
          ) : running ? (
            <Button disabled className="bg-white/[0.05] text-text-dim">
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              Formatando… ({totalDone}/{rows.length})
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => { reset(); setGuidance(''); }}>Rodar novamente</Button>
              <Button
                onClick={() => handleOpenChange(false)}
                className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 hover:bg-emerald-500/30"
              >
                Concluir ({doneCount} formatados · {totalActualCost}g)
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const StatusIcon: React.FC<{ status: ChapterStatus }> = ({ status }) => {
  if (status === 'done-local') return <Leaf className="w-3.5 h-3.5 text-emerald-400" />;
  if (status === 'done-ai') return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
  if (status === 'error') return <XCircle className="w-3.5 h-3.5 text-red-alert" />;
  if (status === 'running') return <Loader2 className="w-3.5 h-3.5 text-amber-300 animate-spin" />;
  if (status === 'skipped') return <AlertTriangle className="w-3.5 h-3.5 text-text-dim" />;
  return <div className="w-3.5 h-3.5 rounded-full border border-white/20" />;
};
