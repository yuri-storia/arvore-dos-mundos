import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  Upload, FileText, Loader2, CheckCircle2, ArrowLeft, ArrowRight,
  Trash2, ArrowUp, ArrowDown, GripVertical, Sparkles, ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  smartImportManuscript, aiImportManuscript, chapterTextToHtml, countWords,
  AI_IMPORT_COST_DROPS,
  type ImportedManuscript, type ImportedChapter, type ProgressEvent,
} from '@/lib/manuscriptImport';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePlanLimits } from '@/hooks/usePlanLimits';

interface ManuscriptTarget {
  id: string;
  title: string;
}

interface Props {
  worldId: string;
  trigger: React.ReactNode;
  existingManuscripts?: ManuscriptTarget[];
  defaultTargetId?: string;
  onImported?: (manuscript: { id: string; title: string }) => void;
}

const ACCEPT = '.pdf,.docx,.txt,.md,.epub,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/epub+zip,text/plain';

type Step = 'destination' | 'upload' | 'processing' | 'preview';
type Destination = 'new' | 'existing';
type MergeMode = 'replace' | 'merge-title';

function normalizeTitle(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

export const ImportManuscriptDialog: React.FC<Props> = ({
  worldId, trigger, existingManuscripts = [], defaultTargetId, onImported,
}) => {
  const { user } = useAuth();
  const plan = usePlanLimits();
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [useAI, setUseAI] = useState(false);

  // Wizard state
  const [step, setStep] = useState<Step>('destination');
  const [destination, setDestination] = useState<Destination>('new');
  const [targetId, setTargetId] = useState<string>(defaultTargetId ?? '');
  const [mergeMode, setMergeMode] = useState<MergeMode>('merge-title');

  const [file, setFile] = useState<File | null>(null);
  const [expectedCount, setExpectedCount] = useState<string>(''); // "" = "não sei"
  const [progress, setProgress] = useState<ProgressEvent>({ stage: 'reading', progress: 0, message: '' });

  const [parsed, setParsed] = useState<ImportedManuscript | null>(null);
  const [chapters, setChapters] = useState<ImportedChapter[]>([]);
  const [manuscriptTitle, setManuscriptTitle] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (defaultTargetId && open) {
      setDestination('existing');
      setTargetId(defaultTargetId);
    }
  }, [defaultTargetId, open]);

  const reset = () => {
    setStep('destination');
    setDestination(defaultTargetId ? 'existing' : 'new');
    setTargetId(defaultTargetId ?? '');
    setMergeMode('merge-title');
    setFile(null);
    setExpectedCount('');
    setParsed(null);
    setChapters([]);
    setManuscriptTitle('');
    setSaving(false);
    setUseAI(false);
    setProgress({ stage: 'reading', progress: 0, message: '' });
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleFile = (f: File | null) => {
    if (!f) return;
    if (f.size > 30 * 1024 * 1024) {
      toast.error('Arquivo muito grande (máx. 30 MB).');
      return;
    }
    setFile(f);
  };

  const handleParse = async () => {
    if (!file) return;
    setStep('processing');
    setProgress({ stage: 'reading', progress: 0, message: 'Iniciando…' });
    try {
      const expected = expectedCount ? parseInt(expectedCount, 10) : undefined;
      const expectedNum = Number.isFinite(expected as number) ? (expected as number) : undefined;

      let result: ImportedManuscript;
      if (useAI && plan.canUseAI) {
        const aiResult = await aiImportManuscript(file, {
          expectedChapterCount: expectedNum,
          onProgress: (e) => setProgress(e),
        });
        result = aiResult;
        if (aiResult.truncated) {
          toast.warning('O arquivo é muito grande; a IA trabalhou nos primeiros ~400 mil caracteres.');
        }
        toast.success(`Detectados ${aiResult.chapters.length} capítulos com IA (${AI_IMPORT_COST_DROPS} gotas).`);
      } else {
        result = await smartImportManuscript(file, {
          expectedChapterCount: expectedNum,
          onProgress: (e) => setProgress(e),
        });
      }
      setParsed(result);
      setChapters(result.chapters);
      if (destination === 'new') {
        setManuscriptTitle(result.title);
      } else {
        const t = existingManuscripts.find((m) => m.id === targetId);
        setManuscriptTitle(t?.title ?? result.title);
      }
      setStep('preview');
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : 'Não foi possível ler este arquivo.';
      toast.error(msg);
      setStep('upload');
    }
  };

  const totalWords = useMemo(
    () => chapters.reduce((sum, c) => sum + countWords(c.content), 0),
    [chapters],
  );

  const renameChapter = (idx: number, title: string) => {
    setChapters((prev) => prev.map((c, i) => (i === idx ? { ...c, title } : c)));
  };
  const removeChapter = (idx: number) => {
    setChapters((prev) => prev.filter((_, i) => i !== idx));
  };
  const moveChapter = (idx: number, dir: -1 | 1) => {
    setChapters((prev) => {
      const j = idx + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  };
  const moveChapterTo = (from: number, to: number) => {
    setChapters((prev) => {
      if (from === to || to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const handleConfirm = async () => {
    if (!parsed || !user || chapters.length === 0) return;
    setSaving(true);
    try {
      let manuscriptId: string;
      let finalTitle = manuscriptTitle.trim() || 'Manuscrito importado';

      if (destination === 'new') {
        const { data: ms, error: msErr } = await supabase
          .from('manuscripts')
          .insert({ user_id: user.id, world_id: worldId, title: finalTitle })
          .select()
          .single();
        if (msErr || !ms) throw msErr || new Error('Falha ao criar manuscrito');
        manuscriptId = ms.id;
        finalTitle = ms.title;

        const rows = chapters.map((c, i) => ({
          user_id: user.id,
          manuscript_id: manuscriptId,
          title: c.title || `Capítulo ${i + 1}`,
          content: chapterTextToHtml(c.content),
          word_count: countWords(c.content),
          sort_order: i,
        }));
        const { error: chErr } = await supabase.from('chapters').insert(rows);
        if (chErr) throw chErr;
      } else {
        manuscriptId = targetId;
        if (finalTitle) {
          await supabase.from('manuscripts').update({ title: finalTitle }).eq('id', manuscriptId);
        }
        if (mergeMode === 'replace') {
          const { error: delErr } = await supabase.from('chapters').delete().eq('manuscript_id', manuscriptId);
          if (delErr) throw delErr;
          const rows = chapters.map((c, i) => ({
            user_id: user.id,
            manuscript_id: manuscriptId,
            title: c.title || `Capítulo ${i + 1}`,
            content: chapterTextToHtml(c.content),
            word_count: countWords(c.content),
            sort_order: i,
          }));
          const { error: chErr } = await supabase.from('chapters').insert(rows);
          if (chErr) throw chErr;
        } else {
          const { data: existing, error: fetchErr } = await supabase
            .from('chapters')
            .select('id, title, sort_order')
            .eq('manuscript_id', manuscriptId);
          if (fetchErr) throw fetchErr;
          const byTitle = new Map<string, { id: string; sort_order: number }>();
          (existing || []).forEach((row: any) => {
            byTitle.set(normalizeTitle(row.title), { id: row.id, sort_order: row.sort_order });
          });
          let maxOrder = (existing || []).reduce((m: number, r: any) => Math.max(m, r.sort_order ?? 0), -1);

          const toUpdate: Array<{ id: string; title: string; content: string; word_count: number; sort_order: number }> = [];
          const toInsert: Array<{ user_id: string; manuscript_id: string; title: string; content: string; word_count: number; sort_order: number }> = [];

          chapters.forEach((c, i) => {
            const key = normalizeTitle(c.title);
            const match = byTitle.get(key);
            if (match) {
              toUpdate.push({
                id: match.id,
                title: c.title,
                content: chapterTextToHtml(c.content),
                word_count: countWords(c.content),
                sort_order: i,
              });
              byTitle.delete(key);
            } else {
              maxOrder += 1;
              toInsert.push({
                user_id: user.id,
                manuscript_id: manuscriptId,
                title: c.title || `Capítulo ${i + 1}`,
                content: chapterTextToHtml(c.content),
                word_count: countWords(c.content),
                sort_order: maxOrder,
              });
            }
          });

          for (const row of toUpdate) {
            const { error } = await supabase.from('chapters').update({
              title: row.title,
              content: row.content,
              word_count: row.word_count,
              sort_order: row.sort_order,
            }).eq('id', row.id);
            if (error) throw error;
          }
          if (toInsert.length) {
            const { error } = await supabase.from('chapters').insert(toInsert);
            if (error) throw error;
          }
        }
      }

      const msg =
        destination === 'new' ? 'Manuscrito criado!' :
        mergeMode === 'replace' ? 'Capítulos substituídos!' :
        'Capítulos atualizados sem duplicar!';
      toast.success(msg);
      onImported?.({ id: manuscriptId, title: finalTitle });
      setOpen(false);
      reset();
    } catch (e) {
      console.error(e);
      toast.error('Erro ao salvar. Verifique sua conexão e tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const stageLabel = {
    reading: 'Lendo arquivo',
    extracting: 'Extraindo conteúdo',
    parsing: 'Interpretando',
    splitting: 'Detectando capítulos',
    ordering: 'Organizando',
    done: 'Finalizado',
  }[progress.stage];

  const canGoToUpload = destination === 'new' || !!targetId;
  const hasExisting = existingManuscripts.length > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-cinzel flex items-center gap-2">
            <Upload className="w-4 h-4 text-emerald-400" />
            Importar Manuscrito
          </DialogTitle>
          <DialogDescription className="text-xs">
            Envie um arquivo <strong>.pdf</strong>, <strong>.docx</strong>, <strong>.txt</strong> ou <strong>.epub</strong>. Nós detectamos os capítulos automaticamente.
          </DialogDescription>
        </DialogHeader>

        {/* ── STEP 1: DESTINATION ── */}
        {step === 'destination' && (
          <div className="flex-1 space-y-3 py-2">
            <p className="text-sm text-text-secondary font-montserrat">O que você quer fazer?</p>

            <button
              onClick={() => setDestination('new')}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                destination === 'new'
                  ? 'border-emerald-400/60 bg-emerald-500/10 shadow-md shadow-emerald-500/10'
                  : 'border-blue-bright/15 bg-white/[0.02] hover:border-blue-bright/30'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="font-montserrat font-bold text-sm text-foreground">Criar novo manuscrito</span>
              </div>
              <p className="text-xs text-text-dim leading-snug">
                Um manuscrito novo será criado neste mundo, com os capítulos do arquivo importado.
              </p>
            </button>

            <button
              onClick={() => hasExisting && setDestination('existing')}
              disabled={!hasExisting}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                destination === 'existing'
                  ? 'border-emerald-400/60 bg-emerald-500/10 shadow-md shadow-emerald-500/10'
                  : 'border-blue-bright/15 bg-white/[0.02] hover:border-blue-bright/30'
              } ${!hasExisting ? 'opacity-40 cursor-not-allowed hover:border-blue-bright/15' : ''}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-blue-bright" />
                <span className="font-montserrat font-bold text-sm text-foreground">Adicionar a um manuscrito existente</span>
              </div>
              <p className="text-xs text-text-dim leading-snug">
                {hasExisting
                  ? 'Insere ou atualiza capítulos em um manuscrito que você já tem neste mundo.'
                  : 'Você ainda não tem manuscritos neste mundo.'}
              </p>
            </button>

            {destination === 'existing' && hasExisting && (
              <div className="space-y-3 p-3 rounded-lg border border-blue-bright/10 bg-white/[0.02]">
                <div>
                  <Label className="text-[10px] uppercase tracking-wider text-text-dim font-montserrat">Manuscrito</Label>
                  <Select value={targetId} onValueChange={setTargetId}>
                    <SelectTrigger className="h-9 text-xs mt-1">
                      <SelectValue placeholder="Selecione o manuscrito…" />
                    </SelectTrigger>
                    <SelectContent>
                      {existingManuscripts.map((m) => (
                        <SelectItem key={m.id} value={m.id} className="text-xs">{m.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-[10px] uppercase tracking-wider text-text-dim font-montserrat">Como mesclar</Label>
                  <div className="grid gap-1.5 mt-1">
                    <label className={`flex items-start gap-2 p-2 rounded text-xs cursor-pointer border ${mergeMode === 'merge-title' ? 'border-emerald-400/50 bg-emerald-500/5' : 'border-transparent hover:bg-white/[0.03]'}`}>
                      <input
                        type="radio"
                        checked={mergeMode === 'merge-title'}
                        onChange={() => setMergeMode('merge-title')}
                        className="mt-0.5"
                      />
                      <div>
                        <div className="font-bold text-foreground">Atualizar por título (recomendado)</div>
                        <div className="text-[11px] text-text-dim">Capítulos com o mesmo título são atualizados. Novos são inseridos ao final.</div>
                      </div>
                    </label>
                    <label className={`flex items-start gap-2 p-2 rounded text-xs cursor-pointer border ${mergeMode === 'replace' ? 'border-emerald-400/50 bg-emerald-500/5' : 'border-transparent hover:bg-white/[0.03]'}`}>
                      <input
                        type="radio"
                        checked={mergeMode === 'replace'}
                        onChange={() => setMergeMode('replace')}
                        className="mt-0.5"
                      />
                      <div>
                        <div className="font-bold text-foreground">Substituir tudo</div>
                        <div className="text-[11px] text-text-dim">Apaga todos os capítulos existentes e insere os importados.</div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: UPLOAD ── */}
        {step === 'upload' && (
          <div className="flex-1 space-y-4 py-2">
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-text-dim font-montserrat">Arquivo</Label>
              <label
                htmlFor="ms-import-input"
                className="mt-1 block border-2 border-dashed border-blue-bright/25 rounded-lg p-5 text-center cursor-pointer hover:border-emerald-400/40 hover:bg-emerald-400/5 transition-colors"
              >
                {file ? (
                  <>
                    <FileText className="w-6 h-6 mx-auto mb-1 text-emerald-400" />
                    <p className="text-sm font-montserrat font-bold text-foreground">{file.name}</p>
                    <p className="text-[10px] text-text-dim">Clique para trocar</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-7 h-7 mx-auto mb-1 text-text-dim" />
                    <p className="text-sm font-montserrat font-bold text-foreground">Escolher arquivo</p>
                    <p className="text-[10px] text-text-dim mt-0.5">PDF · DOCX · TXT · EPUB (até 30 MB)</p>
                  </>
                )}
              </label>
              <input
                ref={inputRef}
                id="ms-import-input"
                type="file"
                accept={ACCEPT}
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0] || null)}
              />
            </div>

            <div>
              <Label className="text-xs font-montserrat text-foreground">
                Quantos capítulos seu manuscrito tem? <span className="text-text-dim font-normal">(opcional)</span>
              </Label>
              <Input
                type="number"
                min={1}
                max={999}
                value={expectedCount}
                onChange={(e) => setExpectedCount(e.target.value.replace(/[^\d]/g, ''))}
                placeholder="Ex: 24"
                className="mt-1 h-9 text-sm"
              />
              <p className="text-[11px] text-text-dim mt-1 leading-snug">
                Se você souber o número, testamos várias estratégias de detecção e escolhemos a que mais se aproxima. Se não souber, deixe em branco.
              </p>
            </div>

            {/* Toggle IA */}
            <button
              type="button"
              onClick={() => plan.canUseAI && setUseAI((v) => !v)}
              disabled={!plan.canUseAI}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                useAI && plan.canUseAI
                  ? 'border-amber-400/60 bg-gradient-to-br from-amber-500/10 to-emerald-500/10 shadow-md shadow-amber-500/10'
                  : 'border-blue-bright/15 bg-white/[0.02] hover:border-blue-bright/30'
              } ${!plan.canUseAI ? 'opacity-50 cursor-not-allowed hover:border-blue-bright/15' : ''}`}
            >
              <div className="flex items-start gap-2">
                <div className={`w-4 h-4 mt-0.5 rounded border-2 flex items-center justify-center shrink-0 ${
                  useAI && plan.canUseAI ? 'border-amber-400 bg-amber-400/20' : 'border-blue-bright/30'
                }`}>
                  {useAI && plan.canUseAI && <CheckCircle2 className="w-3 h-3 text-amber-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-montserrat font-bold text-sm text-foreground">
                      Detectar capítulos com IA
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                      {AI_IMPORT_COST_DROPS} gotas
                    </span>
                  </div>
                  <p className="text-[11px] text-text-dim leading-snug mt-1">
                    {plan.canUseAI
                      ? 'Idriel lê o arquivo e identifica onde cada capítulo começa — ideal quando a diagramação do PDF confunde a detecção automática. O conteúdo dos capítulos não é alterado.'
                      : 'Disponível apenas no plano Idriel. Faça upgrade para usar.'}
                  </p>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* ── STEP 3: PROCESSING ── */}
        {step === 'processing' && (
          <div className="flex-1 flex flex-col items-center justify-center py-10 gap-4">
            <Loader2 className="w-9 h-9 text-emerald-400 animate-spin" />
            <div className="w-full max-w-sm space-y-2">
              <div className="flex justify-between text-[10px] font-montserrat uppercase tracking-widest text-text-dim">
                <span>{stageLabel}</span>
                <span>{Math.round(progress.progress * 100)}%</span>
              </div>
              <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden border border-blue-bright/10">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 transition-all duration-200"
                  style={{ width: `${Math.max(2, progress.progress * 100)}%` }}
                />
              </div>
              <p className="text-xs text-text-secondary text-center">{progress.message}</p>
            </div>
          </div>
        )}

        {/* ── STEP 4: PREVIEW ── */}
        {step === 'preview' && parsed && (
          <div className="flex-1 flex flex-col min-h-0 space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 text-xs">
              <CheckCircle2 className="w-4 h-4" />
              <span>
                <strong>{chapters.length}</strong> capítulo{chapters.length !== 1 ? 's' : ''} detectado{chapters.length !== 1 ? 's' : ''} · {totalWords.toLocaleString()} palavras · {parsed.sourceType.toUpperCase()}
              </span>
            </div>
            {expectedCount && parseInt(expectedCount, 10) !== chapters.length && (
              <p className="text-[11px] text-amber-400/90 bg-amber-500/5 border border-amber-500/20 rounded px-2 py-1.5">
                Você esperava {expectedCount} capítulos e detectamos {chapters.length}. Você pode ajustar abaixo (renomear, reordenar, remover) ou voltar e tentar outro valor.
              </p>
            )}

            <div>
              <Label className="text-[10px] uppercase tracking-wider text-text-dim font-montserrat">Nome do manuscrito</Label>
              <Input
                value={manuscriptTitle}
                onChange={(e) => setManuscriptTitle(e.target.value)}
                placeholder="Ex: Crônicas de Ellerya"
                className="mt-1"
              />
            </div>

            <div className="flex-1 min-h-0 rounded-md border border-blue-bright/10 bg-white/[0.02] flex flex-col">
              <div className="px-2 py-1.5 border-b border-blue-bright/10 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest font-montserrat text-text-dim">Capítulos</span>
                <span className="text-[10px] text-text-dim">Renomeie, reordene ou remova antes de confirmar</span>
              </div>
              <ScrollArea className="flex-1">
                <ol className="p-1.5 space-y-1">
                  {chapters.map((c, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/[0.03] group"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', String(i));
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const from = Number(e.dataTransfer.getData('text/plain'));
                        if (!Number.isNaN(from)) moveChapterTo(from, i);
                      }}
                    >
                      <GripVertical className="w-3 h-3 text-text-dim/50 cursor-grab shrink-0" />
                      <span className="text-[10px] font-mono text-text-dim w-6 shrink-0 text-right">{i + 1}.</span>
                      <Input
                        value={c.title}
                        onChange={(e) => renameChapter(i, e.target.value)}
                        className="h-7 text-xs flex-1 bg-transparent border-white/5 focus:border-blue-bright/40"
                      />
                      <span className="text-[10px] text-text-dim tabular-nums w-14 text-right shrink-0">
                        {countWords(c.content).toLocaleString()} p.
                      </span>
                      <button
                        onClick={() => moveChapter(i, -1)}
                        disabled={i === 0}
                        className="p-1 text-text-dim hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed"
                        title="Mover para cima"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => moveChapter(i, 1)}
                        disabled={i === chapters.length - 1}
                        className="p-1 text-text-dim hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed"
                        title="Mover para baixo"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => removeChapter(i)}
                        className="p-1 text-text-dim hover:text-red-alert"
                        title="Remover capítulo"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </li>
                  ))}
                  {chapters.length === 0 && (
                    <p className="text-xs text-text-dim text-center py-6">Nenhum capítulo restante.</p>
                  )}
                </ol>
              </ScrollArea>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === 'destination' && (
            <>
              <Button variant="ghost" onClick={() => { setOpen(false); reset(); }}>Cancelar</Button>
              <Button
                onClick={() => setStep('upload')}
                disabled={!canGoToUpload}
                className="bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-400 hover:to-blue-400 text-white"
              >
                Continuar <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </>
          )}
          {step === 'upload' && (
            <>
              <Button variant="ghost" onClick={() => setStep('destination')}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
              </Button>
              <Button
                onClick={handleParse}
                disabled={!file}
                className={useAI && plan.canUseAI
                  ? 'bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-white shadow-lg shadow-amber-500/20'
                  : 'bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-400 hover:to-blue-400 text-white'}
              >
                {useAI && plan.canUseAI ? (
                  <>Ler com IA ({AI_IMPORT_COST_DROPS} gotas) <ArrowRight className="w-4 h-4 ml-1" /></>
                ) : (
                  <>Ler arquivo <ArrowRight className="w-4 h-4 ml-1" /></>
                )}
              </Button>
            </>
          )}
          {step === 'processing' && (
            <Button variant="ghost" disabled className="opacity-50">Processando…</Button>
          )}
          {step === 'preview' && (
            <>
              <Button variant="ghost" onClick={() => setStep('upload')} disabled={saving}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={saving || chapters.length === 0 || !manuscriptTitle.trim()}
                className="bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-400 hover:to-blue-400 text-white shadow-lg shadow-emerald-500/20"
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Salvando…</>
                ) : destination === 'new' ? (
                  <>Criar com {chapters.length} capítulo{chapters.length !== 1 ? 's' : ''}</>
                ) : mergeMode === 'replace' ? (
                  <>Substituir por {chapters.length} capítulo{chapters.length !== 1 ? 's' : ''}</>
                ) : (
                  <>Atualizar {chapters.length} capítulo{chapters.length !== 1 ? 's' : ''}</>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
