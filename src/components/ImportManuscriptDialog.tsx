import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  Upload, FileText, Loader2, CheckCircle2, ArrowLeft, ArrowRight,
  Trash2, ArrowUp, ArrowDown, Settings2, ListOrdered, GripVertical,
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import {
  importManuscriptFile, chapterTextToHtml, countWords,
  DEFAULT_DETECTION,
  type ImportedManuscript, type ImportedChapter,
  type DetectionConfig, type DetectionMode, type OrderRule, type ProgressEvent,
} from '@/lib/manuscriptImport';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Minimal shape from manuscripts row.
interface ManuscriptTarget {
  id: string;
  title: string;
}

interface Props {
  worldId: string;
  trigger: React.ReactNode;
  existingManuscripts?: ManuscriptTarget[];
  /** Optional pre-selected manuscript to re-import into. */
  defaultTargetId?: string;
  onImported?: (manuscript: { id: string; title: string }) => void;
}

const ACCEPT = '.pdf,.docx,.txt,.md,.epub,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/epub+zip,text/plain';

type Step = 'configure' | 'processing' | 'preview';
type MergeStrategy = 'new' | 'replace' | 'merge-title';

const DETECTION_OPTIONS: { value: DetectionMode; label: string; desc: string }[] = [
  { value: 'auto', label: 'Automática', desc: 'Detecta "Capítulo 1", "Chapter I", "Prólogo", "Epílogo" (recomendado).' },
  { value: 'regex', label: 'Regex personalizada', desc: 'Uma expressão regular por linha para identificar títulos de capítulo.' },
  { value: 'separator', label: 'Separador literal', desc: 'Uma linha específica (ex: *** ou ---) marca o início de novo capítulo.' },
  { value: 'heading', label: 'Nível de título (EPUB)', desc: 'Divide o EPUB pelos títulos H1, H2 ou H3 dentro dos documentos.' },
  { value: 'none', label: 'Sem divisão', desc: 'Importa como um único capítulo.' },
];

const ORDER_OPTIONS: { value: OrderRule; label: string; desc: string }[] = [
  { value: 'as-detected', label: 'Ordem detectada', desc: 'Preserva a ordem em que apareceram no arquivo.' },
  { value: 'numeric', label: 'Por numeração', desc: 'Ordena por "Capítulo 1, 2, 3…" (inclusive romanos).' },
  { value: 'title', label: 'Por título (A→Z)', desc: 'Ordena alfabeticamente.' },
  { value: 'spine', label: 'Ordem do OPF/spine (EPUB)', desc: 'Segue exatamente a lombada declarada no EPUB.' },
];

const MERGE_OPTIONS: { value: MergeStrategy; label: string; desc: string }[] = [
  { value: 'new', label: 'Criar novo manuscrito', desc: 'Adiciona um manuscrito novo ao mundo atual.' },
  { value: 'replace', label: 'Substituir capítulos do manuscrito', desc: 'Apaga todos os capítulos existentes e insere os importados.' },
  { value: 'merge-title', label: 'Atualizar por título', desc: 'Capítulos com o mesmo título são atualizados. Novos são inseridos ao final. Sem duplicar.' },
];

function normalizeTitle(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

export const ImportManuscriptDialog: React.FC<Props> = ({
  worldId, trigger, existingManuscripts = [], defaultTargetId, onImported,
}) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Wizard state
  const [step, setStep] = useState<Step>('configure');
  const [file, setFile] = useState<File | null>(null);
  const [detection, setDetection] = useState<DetectionConfig>({ ...DEFAULT_DETECTION });
  const [order, setOrder] = useState<OrderRule>('as-detected');
  const [mergeStrategy, setMergeStrategy] = useState<MergeStrategy>('new');
  const [targetId, setTargetId] = useState<string>(defaultTargetId ?? '');
  const [progress, setProgress] = useState<ProgressEvent>({ stage: 'reading', progress: 0, message: '' });

  // Preview state
  const [parsed, setParsed] = useState<ImportedManuscript | null>(null);
  const [chapters, setChapters] = useState<ImportedChapter[]>([]);
  const [manuscriptTitle, setManuscriptTitle] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (defaultTargetId) {
      setTargetId(defaultTargetId);
      setMergeStrategy('merge-title');
    }
  }, [defaultTargetId, open]);

  const isEpub = file && /\.epub$/i.test(file.name);
  const availableOrders = ORDER_OPTIONS.filter((o) => o.value !== 'spine' || isEpub);
  const availableDetections = DETECTION_OPTIONS.filter((o) => o.value !== 'heading' || isEpub);

  const reset = () => {
    setStep('configure');
    setFile(null);
    setDetection({ ...DEFAULT_DETECTION });
    setOrder('as-detected');
    setMergeStrategy(defaultTargetId ? 'merge-title' : 'new');
    setTargetId(defaultTargetId ?? '');
    setParsed(null);
    setChapters([]);
    setManuscriptTitle('');
    setSaving(false);
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
    // Sensible defaults per file type
    if (/\.epub$/i.test(f.name)) setOrder('spine');
  };

  const handleParse = async () => {
    if (!file) return;
    setStep('processing');
    setProgress({ stage: 'reading', progress: 0, message: 'Iniciando…' });
    try {
      const result = await importManuscriptFile(file, {
        detection,
        order,
        onProgress: (e) => setProgress(e),
      });
      setParsed(result);
      setChapters(result.chapters);
      // Prefill manuscript title
      if (mergeStrategy === 'new') {
        setManuscriptTitle(result.title);
      } else {
        const t = existingManuscripts.find((m) => m.id === targetId);
        setManuscriptTitle(t?.title ?? result.title);
      }
      setStep('preview');
    } catch (e) {
      console.error(e);
      toast.error('Não foi possível ler este arquivo. Verifique o formato.');
      setStep('configure');
    }
  };

  const totalWords = useMemo(
    () => chapters.reduce((sum, c) => sum + countWords(c.content), 0),
    [chapters],
  );

  // Preview operations
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

      if (mergeStrategy === 'new' || !targetId) {
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
        // Update manuscript title if user changed it
        if (finalTitle) {
          await supabase.from('manuscripts').update({ title: finalTitle }).eq('id', manuscriptId);
        }
        if (mergeStrategy === 'replace') {
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
        } else if (mergeStrategy === 'merge-title') {
          // Fetch existing chapters
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
                sort_order: i, // reorder to imported order
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

      const strategyMsg =
        mergeStrategy === 'new' ? 'Manuscrito criado!' :
        mergeStrategy === 'replace' ? 'Capítulos substituídos!' :
        'Capítulos atualizados sem duplicar!';
      toast.success(strategyMsg);
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
    ordering: 'Ordenando',
    done: 'Finalizado',
  }[progress.stage];

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-cinzel flex items-center gap-2">
            <Upload className="w-4 h-4 text-emerald-400" />
            Importar Manuscrito
          </DialogTitle>
          <DialogDescription className="text-xs">
            Envie um arquivo <strong>.pdf</strong>, <strong>.docx</strong>, <strong>.txt</strong> ou <strong>.epub</strong>. Configure a detecção, revise a prévia e confirme.
          </DialogDescription>
        </DialogHeader>

        {/* ── Stepper header ── */}
        <div className="flex items-center gap-2 text-[10px] font-montserrat uppercase tracking-widest text-text-dim">
          <span className={step === 'configure' ? 'text-emerald-400' : ''}>1. Configurar</span>
          <span>·</span>
          <span className={step === 'processing' ? 'text-emerald-400' : ''}>2. Processar</span>
          <span>·</span>
          <span className={step === 'preview' ? 'text-emerald-400' : ''}>3. Prévia</span>
        </div>

        {/* ── STEP 1: CONFIGURE ── */}
        {step === 'configure' && (
          <ScrollArea className="flex-1 pr-2">
            <div className="space-y-4 pb-2">
              {/* File picker */}
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-text-dim font-montserrat">Arquivo</Label>
                <label
                  htmlFor="ms-import-input"
                  className="mt-1 block border-2 border-dashed border-blue-bright/25 rounded-lg p-4 text-center cursor-pointer hover:border-emerald-400/40 hover:bg-emerald-400/5 transition-colors"
                >
                  {file ? (
                    <>
                      <FileText className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
                      <p className="text-xs font-montserrat font-bold text-foreground">{file.name}</p>
                      <p className="text-[10px] text-text-dim">Clique para trocar</p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 mx-auto mb-1 text-text-dim" />
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

              {/* Target */}
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-wider text-text-dim font-montserrat flex items-center gap-1.5">
                  <Settings2 className="w-3 h-3" /> Destino
                </Label>
                <RadioGroup value={mergeStrategy} onValueChange={(v) => setMergeStrategy(v as MergeStrategy)}>
                  {MERGE_OPTIONS.map((opt) => {
                    const disabled = opt.value !== 'new' && existingManuscripts.length === 0;
                    return (
                      <label
                        key={opt.value}
                        className={`flex items-start gap-2 p-2 rounded-md border text-xs transition-colors ${
                          mergeStrategy === opt.value ? 'border-emerald-400/50 bg-emerald-500/5' : 'border-blue-bright/10 bg-white/[0.02]'
                        } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:border-blue-bright/30'}`}
                      >
                        <RadioGroupItem value={opt.value} disabled={disabled} className="mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="font-montserrat font-bold text-foreground">{opt.label}</p>
                          <p className="text-[11px] text-text-dim leading-snug">{opt.desc}</p>
                        </div>
                      </label>
                    );
                  })}
                </RadioGroup>
                {mergeStrategy !== 'new' && (
                  <div>
                    <Label className="text-[10px] uppercase tracking-wider text-text-dim font-montserrat">Manuscrito de destino</Label>
                    <Select value={targetId} onValueChange={setTargetId}>
                      <SelectTrigger className="h-8 text-xs mt-1">
                        <SelectValue placeholder="Selecione…" />
                      </SelectTrigger>
                      <SelectContent>
                        {existingManuscripts.map((m) => (
                          <SelectItem key={m.id} value={m.id} className="text-xs">{m.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Detection */}
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-wider text-text-dim font-montserrat">Detecção de capítulos</Label>
                <Select
                  value={detection.mode}
                  onValueChange={(v) => setDetection((prev) => ({ ...prev, mode: v as DetectionMode }))}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {availableDetections.map((o) => (
                      <SelectItem key={o.value} value={o.value} className="text-xs">
                        <div>
                          <div className="font-bold">{o.label}</div>
                          <div className="text-[10px] text-text-dim">{o.desc}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {detection.mode === 'regex' && (
                  <div>
                    <Label className="text-[10px] uppercase tracking-wider text-text-dim font-montserrat">Regex (uma linha inteira)</Label>
                    <Input
                      value={detection.regex ?? ''}
                      onChange={(e) => setDetection((prev) => ({ ...prev, regex: e.target.value }))}
                      className="h-8 text-xs font-mono mt-1"
                      placeholder={DEFAULT_DETECTION.regex}
                    />
                    <p className="text-[10px] text-text-dim mt-1">Case-insensitive. Ex: <code>^\s*(cap[ií]tulo|parte)\s+\d+</code></p>
                  </div>
                )}
                {detection.mode === 'separator' && (
                  <div>
                    <Label className="text-[10px] uppercase tracking-wider text-text-dim font-montserrat">Linha separadora</Label>
                    <Input
                      value={detection.separator ?? ''}
                      onChange={(e) => setDetection((prev) => ({ ...prev, separator: e.target.value }))}
                      className="h-8 text-xs font-mono mt-1"
                      placeholder="***"
                    />
                    <p className="text-[10px] text-text-dim mt-1">Ex: <code>***</code>, <code>---</code>, <code>§</code></p>
                  </div>
                )}
                {detection.mode === 'heading' && (
                  <div>
                    <Label className="text-[10px] uppercase tracking-wider text-text-dim font-montserrat">Nível do título</Label>
                    <Select
                      value={String(detection.headingLevel ?? 1)}
                      onValueChange={(v) => setDetection((prev) => ({ ...prev, headingLevel: Number(v) as 1 | 2 | 3 }))}
                    >
                      <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1" className="text-xs">H1 — Título principal</SelectItem>
                        <SelectItem value="2" className="text-xs">H2 — Subtítulo</SelectItem>
                        <SelectItem value="3" className="text-xs">H3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Order */}
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-text-dim font-montserrat flex items-center gap-1.5">
                  <ListOrdered className="w-3 h-3" /> Ordenação
                </Label>
                <Select value={order} onValueChange={(v) => setOrder(v as OrderRule)}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {availableOrders.map((o) => (
                      <SelectItem key={o.value} value={o.value} className="text-xs">
                        <div>
                          <div className="font-bold">{o.label}</div>
                          <div className="text-[10px] text-text-dim">{o.desc}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </ScrollArea>
        )}

        {/* ── STEP 2: PROCESSING ── */}
        {step === 'processing' && (
          <div className="flex-1 flex flex-col items-center justify-center py-8 gap-4">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
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

        {/* ── STEP 3: PREVIEW ── */}
        {step === 'preview' && parsed && (
          <div className="flex-1 flex flex-col min-h-0 space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 text-xs">
              <CheckCircle2 className="w-4 h-4" />
              <span>
                <strong>{chapters.length}</strong> capítulo{chapters.length !== 1 ? 's' : ''} · {totalWords.toLocaleString()} palavras · {parsed.sourceType.toUpperCase()}
              </span>
            </div>

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
                <span className="text-[10px] uppercase tracking-widest font-montserrat text-text-dim">Capítulos (edite antes de confirmar)</span>
                <span className="text-[10px] text-text-dim">Renomeie, reordene ou remova</span>
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
          {step === 'configure' && (
            <>
              <Button variant="ghost" onClick={() => { setOpen(false); reset(); }}>Cancelar</Button>
              <Button
                onClick={handleParse}
                disabled={!file || (mergeStrategy !== 'new' && !targetId)}
                className="bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-400 hover:to-blue-400 text-white"
              >
                Ler arquivo <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </>
          )}
          {step === 'processing' && (
            <Button variant="ghost" disabled className="opacity-50">Processando…</Button>
          )}
          {step === 'preview' && (
            <>
              <Button variant="ghost" onClick={() => setStep('configure')} disabled={saving}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={saving || chapters.length === 0 || !manuscriptTitle.trim()}
                className="bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-400 hover:to-blue-400 text-white shadow-lg shadow-emerald-500/20"
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Salvando…</>
                ) : mergeStrategy === 'new' ? (
                  <>Criar com {chapters.length} capítulo{chapters.length !== 1 ? 's' : ''}</>
                ) : mergeStrategy === 'replace' ? (
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
