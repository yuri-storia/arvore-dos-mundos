import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { extractTextFromFile, type ImportSourceType } from '@/lib/textExtractor';
import {
  importTextWithIdriel,
  importFileWithIdriel,
  importStoredPdfWithIdriel,
  type ImportedSuggestion,
  type ImportProgress,
} from '@/lib/helpers';
import { useIdrielImports, type IdrielImportRecord, type ImportSuggestionStored } from '@/hooks/useIdrielImports';
import { FRUITS } from '@/lib/data';
import { toast } from 'sonner';
import {
  Loader2, Upload, Sparkles, FileText, Library, Paperclip, ArrowLeft,
  History, Search, Trash2, CheckCircle2, Circle, AlertCircle, FileSearch,
} from 'lucide-react';

interface CodexEntryLite { id: string; title: string; fruit_id?: number | null }

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  worldId: string | null | undefined;
  existingEntries: CodexEntryLite[];
  onCreate: (entries: Array<{ title: string; content: string; entry_type: 'ficha' | 'artigo'; fruit_id: number }>) => Promise<Array<{ id: string; title: string; fruit_id?: number | null }>>;
  canCreateMore: () => boolean;
  remaining: number;
}

type Step = 'upload' | 'review' | 'history';
type SourceKind = IdrielImportRecord['source_kind'];

interface ReviewItemState extends ImportSuggestionStored {
  /** index na lista renderizada */
  _key: number;
  /** já existe entrada no Codex com mesmo título+fruit_id? */
  existingEntryId?: string | null;
  /** foi criado por uma importação anterior, mas a entrada já não existe mais */
  wasDeleted?: boolean;
}

const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

function matchExisting(s: ImportSuggestionStored, entries: CodexEntryLite[]): string | null {
  const t = normalize(s.title);
  const hit = entries.find(e => normalize(e.title) === t && (e.fruit_id ?? -1) === s.fruit_id);
  return hit ? hit.id : null;
}

export const IdrielImportDialog: React.FC<Props> = ({ open, onOpenChange, worldId, existingEntries, onCreate, canCreateMore, remaining }) => {
  const [step, setStep] = useState<Step>('upload');
  const [extracting, setExtracting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [extractedText, setExtractedText] = useState('');
  const [sourceType, setSourceType] = useState<ImportSourceType>('texto');
  const [fileName, setFileName] = useState('');
  const [pendingPdf, setPendingPdf] = useState<File | null>(null);
  const [suggestions, setSuggestions] = useState<ImportSuggestionStored[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null);

  const { imports, loading: loadingImports, createRecord, updateSuggestions, deleteRecord, uploadSourceFile, refetch } = useIdrielImports(worldId);

  useEffect(() => { if (open) refetch(); }, [open, refetch]);

  const reset = () => {
    setStep('upload');
    setExtractedText('');
    setSourceType('texto');
    setFileName('');
    setPendingPdf(null);
    setSuggestions([]);
    setSelected(new Set());
    setExtracting(false);
    setAnalyzing(false);
    setCreating(false);
    setProgress(null);
    setActiveRecordId(null);
  };

  const handleClose = (v: boolean) => { if (!v) reset(); onOpenChange(v); };

  // Estado de revisão: cruza com codex atual
  const reviewItems = useMemo<ReviewItemState[]>(() => suggestions.map((s, i) => {
    const existingNow = matchExisting(s, existingEntries);
    const wasDeleted = !!s.created_entry_id && !existingEntries.some(e => e.id === s.created_entry_id);
    return { ...s, _key: i, existingEntryId: existingNow, wasDeleted };
  }), [suggestions, existingEntries]);

  const handleFile = async (file: File) => {
    if (file.size > 15 * 1024 * 1024) { toast.error('Arquivo muito grande (máx. 15MB).'); return; }
    setFileName(file.name);
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (isPdf) {
      setPendingPdf(file);
      setExtractedText('');
      setSourceType('pdf');
      toast.success('PDF pronto. Idriel vai ler o documento inteiro com OCR.');
      return;
    }
    setPendingPdf(null);
    setExtracting(true);
    try {
      const { text, sourceType } = await extractTextFromFile(file);
      if (text.trim().length < 50) { toast.error('Não foi possível extrair texto suficiente do arquivo.'); setFileName(''); return; }
      setExtractedText(text);
      setSourceType(sourceType);
      toast.success(`Texto extraído (${text.length.toLocaleString('pt-BR')} caracteres)`);
    } catch (err) { console.error(err); toast.error('Erro ao extrair texto do arquivo.'); setFileName(''); }
    finally { setExtracting(false); }
  };

  const finalizeAnalysis = async (
    result: ImportedSuggestion[],
    persist: { kind: SourceKind; name: string; size: number; storagePath?: string | null; pastedText?: string | null } | null,
  ) => {
    if (!Array.isArray(result) || result.length === 0) {
      toast.warning('Idriel não encontrou entradas novas relevantes.');
      return;
    }
    const valid = result.filter(e =>
      e && (e.type === 'ficha' || e.type === 'artigo') &&
      typeof e.title === 'string' && e.title.trim().length > 0 &&
      typeof e.summary === 'string' && e.summary.trim().length > 0 &&
      typeof e.fruit_id === 'number' && e.fruit_id >= 0 && e.fruit_id <= 10
    ).map<ImportSuggestionStored>(s => ({ ...s, created_entry_id: null }));
    if (valid.length === 0) { toast.warning('As sugestões retornadas não são válidas.'); return; }

    // Persiste novo registro (ou anexa ao existente em modo "buscar o que falta")
    if (persist && worldId) {
      if (activeRecordId) {
        // mescla com as anteriores não criadas
        const prev = imports.find(r => r.id === activeRecordId)?.suggestions || [];
        const merged = [...prev, ...valid];
        await updateSuggestions(activeRecordId, merged);
        setSuggestions(merged);
        setSelected(new Set(merged.map((_, i) => i).filter(i => !merged[i].created_entry_id)));
      } else {
        const rec = await createRecord({
          sourceKind: persist.kind,
          sourceName: persist.name,
          sourceSize: persist.size,
          storagePath: persist.storagePath ?? null,
          pastedText: persist.pastedText ?? null,
          suggestions: valid,
        });
        if (rec) setActiveRecordId(rec.id);
        setSuggestions(valid);
        setSelected(new Set(valid.map((_, i) => i)));
      }
    } else {
      setSuggestions(valid);
      setSelected(new Set(valid.map((_, i) => i)));
    }
    setStep('review');
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setProgress({ phase: pendingPdf ? 'reading' : 'uploading', pct: pendingPdf ? 0 : 10, label: pendingPdf ? 'Lendo o arquivo...' : 'Enviando para Idriel...' });
    try {
      if (pendingPdf) {
        // 1) upload do PDF cru
        const storagePath = await uploadSourceFile(pendingPdf);
        // 2) analisa
        const result = await importFileWithIdriel(pendingPdf, setProgress);
        await finalizeAnalysis(result, { kind: 'pdf', name: pendingPdf.name, size: pendingPdf.size, storagePath });
      } else {
        const text = extractedText;
        if (text.trim().length < 50) { toast.error('Texto muito curto.'); return; }
        if (text.length > 400000) { toast.error('Texto muito longo (máx. 400.000).'); return; }
        const result = await importTextWithIdriel(text, sourceType, setProgress);
        const kind: SourceKind = (sourceType === 'pdf' ? 'pdf' : sourceType === 'docx' ? 'docx' : sourceType === 'txt' ? 'txt' : 'texto');
        await finalizeAnalysis(result, { kind, name: fileName || 'Texto colado', size: text.length, pastedText: text });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao analisar';
      toast.error(msg);
    } finally { setAnalyzing(false); setProgress(null); }
  };

  // === Histórico: abrir um registro ===
  const openRecord = (rec: IdrielImportRecord) => {
    setActiveRecordId(rec.id);
    setSuggestions(rec.suggestions || []);
    setSelected(new Set((rec.suggestions || []).map((_, i) => i).filter(i => {
      const s = rec.suggestions[i];
      return !matchExisting(s, existingEntries);
    })));
    setFileName(rec.source_name);
    setStep('review');
  };

  const reanalyzeRecord = async (rec: IdrielImportRecord) => {
    if (!canCreateMore()) { toast.error('Limite do plano atingido.'); return; }
    setActiveRecordId(rec.id);
    setFileName(rec.source_name);
    setSuggestions(rec.suggestions || []);
    setStep('review'); // entra na review imediatamente
    setAnalyzing(true);
    setProgress({ phase: 'reading', pct: 0, label: 'Recuperando documento...' });
    try {
      const existingTitles = Array.from(new Set([
        ...existingEntries.map(e => e.title),
        ...(rec.suggestions || []).filter(s => matchExisting(s, existingEntries)).map(s => s.title),
      ])).slice(0, 200);

      let result: ImportedSuggestion[] = [];
      if (rec.storage_path && rec.source_kind === 'pdf') {
        result = await importStoredPdfWithIdriel(rec.storage_path, rec.source_name, setProgress, existingTitles);
      } else if (rec.pasted_text) {
        const srcForApi: 'pdf' | 'docx' | 'txt' | 'texto' =
          rec.source_kind === 'pdf' ? 'pdf' :
          rec.source_kind === 'docx' ? 'docx' :
          rec.source_kind === 'txt' || rec.source_kind === 'md' ? 'txt' : 'texto';
        result = await importTextWithIdriel(rec.pasted_text, srcForApi, setProgress, existingTitles);
      } else {
        throw new Error('Este registro não pode mais ser reanalisado (arquivo expirado). Faça um novo envio.');
      }
      await finalizeAnalysis(result, { kind: rec.source_kind, name: rec.source_name, size: rec.source_size, storagePath: rec.storage_path, pastedText: rec.pasted_text });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao reanalisar';
      toast.error(msg);
    } finally { setAnalyzing(false); setProgress(null); }
  };

  // === Criar entradas selecionadas + sincronizar created_entry_id ===
  const handleCreate = async () => {
    // só cria as selecionadas que ainda não têm correspondente vivo no codex
    const toCreateIdx = Array.from(selected).filter(i => !reviewItems[i].existingEntryId);
    if (toCreateIdx.length === 0) { toast.error('Selecione ao menos uma entrada nova.'); return; }
    if (!canCreateMore()) { toast.error('Limite do plano atingido.'); return; }
    if (toCreateIdx.length > remaining) { toast.error(`Seu plano permite criar apenas ${remaining} entrada(s) restante(s).`); return; }
    setCreating(true);
    try {
      const payload = toCreateIdx.map(i => ({
        title: suggestions[i].title.slice(0, 200),
        content: suggestions[i].summary.slice(0, 50000),
        entry_type: suggestions[i].type,
        fruit_id: suggestions[i].fruit_id,
      }));
      const created = await onCreate(payload);
      // mapeia ids criados por título+fruit_id (mesma ordem que enviei, mas robustece)
      const nextSuggestions = suggestions.slice();
      toCreateIdx.forEach((idx, k) => {
        const c = created?.[k];
        if (c) nextSuggestions[idx] = { ...nextSuggestions[idx], created_entry_id: c.id };
      });
      setSuggestions(nextSuggestions);
      if (activeRecordId) await updateSuggestions(activeRecordId, nextSuggestions);
      toast.success(`${toCreateIdx.length} entrada(s) criada(s)!`);
      setSelected(new Set());
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Erro ao criar entradas.');
    } finally { setCreating(false); }
  };

  const stats = (rec: IdrielImportRecord) => {
    const total = rec.suggestions.length;
    const created = rec.suggestions.filter(s => matchExisting(s, existingEntries)).length;
    return { total, created, pct: total === 0 ? 0 : Math.round((created / total) * 100) };
  };

  const toggleAllNew = (v: boolean) => {
    if (!v) { setSelected(new Set()); return; }
    setSelected(new Set(reviewItems.filter(r => !r.existingEntryId).map(r => r._key)));
  };
  const toggleOne = (i: number) => { const next = new Set(selected); next.has(i) ? next.delete(i) : next.add(i); setSelected(next); };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[760px] w-[95vw] max-h-[90vh] overflow-y-auto bg-card border-stroke">
        <DialogHeader>
          <DialogTitle className="font-cinzel text-gold inline-flex items-center gap-2"><Library className="w-4 h-4" strokeWidth={1.75} />Importar com Idriel</DialogTitle>
          <DialogDescription className="text-foreground/70">
            Idriel lê documentos inteiros, sugere fichas e artigos para o Codex, e guarda o histórico para você completar depois.
          </DialogDescription>
        </DialogHeader>

        {step !== 'review' ? (
          <Tabs value={step} onValueChange={(v) => setStep(v as Step)}>
            <TabsList className="grid w-full grid-cols-2 bg-background/40 border border-stroke">
              <TabsTrigger value="upload" className="data-[state=active]:bg-gold/15 data-[state=active]:text-gold font-cinzel text-xs"><Upload className="w-3.5 h-3.5 mr-1.5" />Nova importação</TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-gold/15 data-[state=active]:text-gold font-cinzel text-xs"><History className="w-3.5 h-3.5 mr-1.5" />Histórico <span className="ml-1.5 text-[10px] opacity-70">({imports.length})</span></TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-4 mt-4">
              <label className={`group relative block cursor-pointer rounded-xl overflow-hidden border border-gold/60 bg-gradient-to-br from-gold/25 via-gold/10 to-amber-700/20 px-6 py-7 text-center shadow-[0_8px_30px_-12px_rgba(212,175,55,0.5)] transition-all hover:from-gold/35 hover:via-gold/20 hover:to-amber-600/25 hover:shadow-[0_12px_40px_-10px_rgba(212,175,55,0.7)] hover:border-gold focus-within:ring-2 focus-within:ring-gold/70 ${(extracting || analyzing) ? 'opacity-60 pointer-events-none' : ''}`}>
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,215,128,0.18),transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity" />
                <Upload className="mx-auto h-9 w-9 text-gold mb-2 drop-shadow-[0_2px_8px_rgba(212,175,55,0.6)]" strokeWidth={1.75} />
                <span className="font-cinzel text-gold text-base tracking-wide block">
                  {fileName ? <span className="inline-flex items-center gap-1.5"><Paperclip className="w-4 h-4" strokeWidth={1.75} />{fileName}</span> : 'Clique para enviar PDF, DOCX, TXT ou MD'}
                </span>
                <span className="block text-[11px] text-foreground/60 mt-1.5 font-merriweather">Até 15MB · OCR nativo para PDFs escaneados</span>
                <input type="file" accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
                  className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} disabled={extracting || analyzing} />
              </label>
              {extracting && <div className="flex items-center justify-center gap-2 text-foreground/70 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Extraindo texto...</div>}

              <div className="text-center text-sm text-foreground/60">— ou cole texto diretamente —</div>
              <textarea className="w-full min-h-[140px] rounded-md bg-background/50 border border-stroke p-3 font-merriweather text-sm text-foreground/90"
                placeholder="Cole aqui um trecho do seu rascunho, anotações ou capítulo..."
                value={extractedText} onChange={e => { setExtractedText(e.target.value); setSourceType('texto'); }} maxLength={200000} />
              <div className="text-xs text-foreground/50 text-right">{extractedText.length.toLocaleString('pt-BR')} / 200.000 caracteres</div>

              {pendingPdf && (
                <div className="text-xs text-gold/80 bg-gold/[0.06] border border-gold/20 rounded-md p-2 flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>O PDF será guardado no seu histórico privado por 60 dias para você poder voltar e completar fichas depois.</span>
                </div>
              )}

              {progress && <ProgressBlock progress={progress} />}

              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => handleClose(false)} disabled={analyzing}>Cancelar</Button>
                <Button onClick={handleAnalyze} disabled={analyzing || extracting || (!pendingPdf && extractedText.trim().length < 50)}
                  className="relative overflow-hidden bg-gradient-to-r from-amber-400 via-gold to-amber-500 text-background hover:from-amber-300 hover:via-gold hover:to-amber-400 font-cinzel tracking-wide shadow-[0_6px_24px_-6px_rgba(212,175,55,0.75)] hover:shadow-[0_10px_30px_-6px_rgba(212,175,55,0.9)] border border-gold/70 transition-all">
                  {analyzing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Idriel está lendo...</> : <><Sparkles className="h-4 w-4 mr-2" /> Analisar com Idriel</>}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="history" className="space-y-3 mt-4">
              {loadingImports ? (
                <div className="flex items-center justify-center py-8 text-foreground/60 text-sm"><Loader2 className="w-4 h-4 mr-2 animate-spin" />Carregando histórico...</div>
              ) : imports.length === 0 ? (
                <div className="text-center py-8 text-foreground/60 text-sm font-merriweather">
                  Nenhum documento importado ainda para este mundo.<br />
                  <span className="text-xs opacity-70">Os arquivos enviados ficam aqui por 60 dias para você revisitar e completar fichas.</span>
                </div>
              ) : (
                imports.map(rec => {
                  const st = stats(rec);
                  const canReanalyze = !!rec.storage_path || !!rec.pasted_text;
                  const expired = new Date(rec.expires_at).getTime() < Date.now();
                  return (
                    <div key={rec.id} className="rounded-md border border-stroke bg-background/40 p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <FileText className="w-3.5 h-3.5 text-gold shrink-0" />
                            <span className="font-cinzel text-foreground/95 truncate">{rec.source_name}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold/15 text-gold uppercase tracking-wide">{rec.source_kind}</span>
                          </div>
                          <div className="text-[11px] text-foreground/55 mt-0.5 font-merriweather">
                            {new Date(rec.created_at).toLocaleString('pt-BR')} · {st.created}/{st.total} sugestões já viraram entradas
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => deleteRecord(rec.id)} className="h-7 w-7 p-0 text-foreground/60 hover:text-red-400" aria-label="Excluir registro"><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                      <Progress value={st.pct} className="h-1.5 bg-background/60" />
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" variant="outline" onClick={() => openRecord(rec)} className="flex-1 border-gold/40 text-gold hover:bg-gold/10"><FileSearch className="w-3.5 h-3.5 mr-1.5" />Revisar</Button>
                        <Button size="sm" disabled={!canReanalyze || expired || analyzing} onClick={() => reanalyzeRecord(rec)} className="flex-1 bg-gradient-to-r from-amber-400 via-gold to-amber-500 text-background hover:from-amber-300 hover:via-gold hover:to-amber-400 font-cinzel disabled:opacity-50" title={!canReanalyze ? 'Arquivo expirou — reenvie' : 'Custa 5 gotas'}>
                          <Search className="w-3.5 h-3.5 mr-1.5" />Buscar o que falta
                        </Button>
                      </div>
                      {(!canReanalyze || expired) && (
                        <div className="text-[10px] text-amber-400/80 inline-flex items-center gap-1"><AlertCircle className="w-3 h-3" />Documento original não está mais disponível — você ainda pode revisar as sugestões, mas precisa reenviar para uma nova varredura.</div>
                      )}
                    </div>
                  );
                })
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-3">
            {analyzing && progress && <ProgressBlock progress={progress} />}

            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-sm text-foreground/80">
                {reviewItems.length} sugestão(ões) · {reviewItems.filter(r => r.existingEntryId).length} já no Codex · {selected.size} selecionada(s)
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => toggleAllNew(true)}>Marcar pendentes</Button>
                <Button size="sm" variant="ghost" onClick={() => toggleAllNew(false)}>Desmarcar</Button>
              </div>
            </div>

            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {reviewItems.map((s) => {
                const fruit = FRUITS.find(f => f.id === s.fruit_id);
                const isFicha = s.type === 'ficha';
                const isExisting = !!s.existingEntryId;
                const wasDeleted = s.wasDeleted && !isExisting;
                return (
                  <div key={s._key} className={`flex gap-3 p-3 rounded-md border ${isExisting ? 'border-emerald-700/40 bg-emerald-900/10' : wasDeleted ? 'border-stroke bg-background/30' : 'border-stroke bg-background/40'}`}>
                    <Checkbox checked={selected.has(s._key)} disabled={isExisting} onCheckedChange={() => toggleOne(s._key)} className="mt-1" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isExisting ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Circle className="h-3.5 w-3.5 text-foreground/40" />}
                        <span className="font-cinzel text-foreground/95">{s.title}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${isFicha ? 'bg-blue-500/20 text-blue-300' : 'bg-amber-500/20 text-amber-300'}`}>{isFicha ? 'Ficha' : 'Artigo'}</span>
                        {fruit && <span className="text-[10px] text-foreground/60">· {fruit.name}</span>}
                        {isExisting && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300">No Codex</span>}
                        {wasDeleted && <span className="text-[10px] px-2 py-0.5 rounded-full bg-foreground/10 text-foreground/60">Excluída — pode recriar</span>}
                      </div>
                      <p className="text-xs text-foreground/70 mt-1 line-clamp-3">{s.summary}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between gap-2 pt-2">
              <Button variant="ghost" onClick={() => { setStep(activeRecordId ? 'history' : 'upload'); }} disabled={creating || analyzing} className="inline-flex items-center gap-1.5"><ArrowLeft className="w-3.5 h-3.5" strokeWidth={2} />Voltar</Button>
              <Button onClick={handleCreate} disabled={creating || analyzing || selected.size === 0} className="bg-gold text-background hover:bg-gold/90">
                {creating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Criando...</> : `Criar ${selected.size} entrada(s)`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const ProgressBlock: React.FC<{ progress: ImportProgress }> = ({ progress }) => (
  <div className="space-y-2 rounded-md border border-gold/25 bg-gold/[0.04] p-3" role="status" aria-live="polite">
    <div className="flex items-center justify-between text-xs text-foreground/80">
      <span className="inline-flex items-center gap-1.5 font-cinzel text-gold"><Loader2 className="w-3.5 h-3.5 animate-spin" />{progress.label}</span>
      <span className="tabular-nums">{progress.pct}%</span>
    </div>
    <Progress value={progress.pct} className="h-1.5 bg-background/60" />
    <div className="flex flex-wrap gap-1 text-[10px] text-foreground/55">
      {(['reading','encoding','uploading','ocr','extracting','done'] as const).map((p, i, arr) => {
        const order = arr.indexOf(progress.phase);
        const active = i <= order;
        const labels = ['Upload','Preparo','Envio','Leitura/OCR','Extração','Preview'];
        return <span key={p} className={active ? 'text-gold' : 'text-foreground/40'}>{labels[i]}{i < arr.length - 1 ? ' ›' : ''}</span>;
      })}
    </div>
  </div>
);
