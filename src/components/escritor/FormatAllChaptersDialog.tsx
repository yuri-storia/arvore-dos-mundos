import React, { useState } from 'react';
import type { Chapter } from '@/hooks/useManuscript';
import { supabase } from '@/integrations/supabase/client';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Sparkles, Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const COST_PER_CHAPTER = 2;
const MIN_CHARS = 40;

const stripHTML = (s: string) =>
  (s || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

interface Props {
  chapters: Chapter[];
  onChapterUpdate: (id: string, patch: Partial<Chapter>) => Promise<void> | void;
}

type ChapterStatus = 'pending' | 'running' | 'done' | 'skipped' | 'error';

interface Row {
  id: string;
  title: string;
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

  if (!plan.canUseAI) return null;

  const eligibleChapters = chapters.filter((c) => stripHTML(c.content || '').length >= MIN_CHARS);
  const skippedCount = chapters.length - eligibleChapters.length;
  const totalCost = eligibleChapters.length * COST_PER_CHAPTER;

  const doneCount = rows.filter((r) => r.status === 'done').length;
  const errorCount = rows.filter((r) => r.status === 'error').length;
  const totalDone = rows.filter((r) => r.status === 'done' || r.status === 'error' || r.status === 'skipped').length;
  const progressPct = rows.length ? Math.round((totalDone / rows.length) * 100) : 0;

  const reset = () => {
    setRows([]);
    setAborted(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (running) return; // não fecha durante execução
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
      status: 'pending',
    }));
    setRows(initial);
    setRunning(true);
    setAborted(false);

    let localAborted = false;
    const trimmedGuidance = guidance.trim() || undefined;

    for (let i = 0; i < eligibleChapters.length; i++) {
      if (localAborted) break;
      // Confere o flag mais recente (fecho é uma cópia — usamos ref via state check).
      // Como state é assíncrono, guardamos aborted via variável local ativada por botão:
      // Solução simples: verifica DOM via callback abaixo.
      const ch = eligibleChapters[i];
      setRows((prev) => prev.map((r) => (r.id === ch.id ? { ...r, status: 'running' } : r)));

      try {
        const { data, error } = await supabase.functions.invoke('ai-format-chapter', {
          body: { text: ch.content || '', guidance: trimmedGuidance },
        });
        if (error) {
          const msg = (data as { error?: string } | null)?.error || error.message || 'Falha ao formatar.';
          setRows((prev) => prev.map((r) => (r.id === ch.id ? { ...r, status: 'error', message: msg } : r)));
          // Se ficou sem gotas, aborta o restante para não gerar erros repetidos.
          if (/gota|quota|credit|assinatura|plano/i.test(msg)) {
            localAborted = true;
            setAborted(true);
            toast.error('Interrompido: ' + msg);
          }
          continue;
        }
        const formatted = (data as { formatted?: string } | null)?.formatted;
        if (!formatted) {
          setRows((prev) =>
            prev.map((r) => (r.id === ch.id ? { ...r, status: 'error', message: 'Sem resultado.' } : r)),
          );
          continue;
        }
        await onChapterUpdate(ch.id, { content: formatted });
        setRows((prev) => prev.map((r) => (r.id === ch.id ? { ...r, status: 'done' } : r)));
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erro desconhecido.';
        setRows((prev) => prev.map((r) => (r.id === ch.id ? { ...r, status: 'error', message: msg } : r)));
      }
    }

    setRunning(false);
    if (!localAborted) {
      toast.success('Formatação em lote concluída.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-[11px] font-montserrat font-bold uppercase tracking-wider border-amber-400/40 text-amber-300 hover:text-amber-200 hover:bg-amber-500/10 hover:border-amber-400/60"
          title={`Idriel formata a diagramação de todos os capítulos — ${COST_PER_CHAPTER} gotas por capítulo.`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Formatar tudo</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="border-amber-400/30 bg-[#0a0f18] backdrop-blur-xl max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-cinzel text-lg text-amber-300 flex items-center gap-2">
            <Sparkles className="w-5 h-5" strokeWidth={2} /> Formatar todos os capítulos
          </DialogTitle>
          <DialogDescription className="font-montserrat text-sm text-text-secondary">
            A Idriel percorre cada capítulo e corrige apenas a <strong>diagramação</strong>
            {' '}(parágrafos, travessões, espaçamento). Ela <strong>não</strong> reescreve o texto.
          </DialogDescription>
        </DialogHeader>

        {rows.length === 0 ? (
          <>
            <div className="rounded-md border border-amber-400/20 bg-amber-400/[0.04] p-3 text-xs font-montserrat text-amber-200/90 space-y-1">
              <div>
                Capítulos elegíveis: <strong>{eligibleChapters.length}</strong>
                {skippedCount > 0 && (
                  <span className="text-text-dim"> · {skippedCount} pulado(s) por serem curtos demais</span>
                )}
              </div>
              <div>
                Custo total: <strong>{totalCost} gotas</strong>
                {' '}<span className="text-text-dim">({COST_PER_CHAPTER}g × {eligibleChapters.length} capítulos)</span>
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
                Os capítulos são reescritos em sequência. O conteúdo antigo é substituído em cada capítulo
                após o sucesso da IA — recomendamos ter uma cópia antes de operações em lote grandes.
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
                <span className="text-text-dim">{progressPct}%</span>
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
                Execução interrompida (provavelmente sem gotas suficientes). Os capítulos já formatados foram salvos.
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
                Formatar {eligibleChapters.length} capítulo{eligibleChapters.length !== 1 ? 's' : ''} ({totalCost}g)
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
                Concluir ({doneCount} formatados)
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const StatusIcon: React.FC<{ status: ChapterStatus }> = ({ status }) => {
  if (status === 'done') return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
  if (status === 'error') return <XCircle className="w-3.5 h-3.5 text-red-alert" />;
  if (status === 'running') return <Loader2 className="w-3.5 h-3.5 text-amber-300 animate-spin" />;
  if (status === 'skipped') return <AlertTriangle className="w-3.5 h-3.5 text-text-dim" />;
  return <div className="w-3.5 h-3.5 rounded-full border border-white/20" />;
};
