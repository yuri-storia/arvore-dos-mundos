import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { extractTextFromFile, type ImportSourceType } from '@/lib/textExtractor';
import { importTextWithIdriel, importFileWithIdriel, type ImportedSuggestion } from '@/lib/helpers';
import { FRUITS } from '@/lib/data';
import { toast } from 'sonner';
import { Loader2, Upload, Sparkles, FileText, Library, Paperclip, ArrowLeft } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (entries: Array<{ title: string; content: string; entry_type: 'ficha' | 'artigo'; fruit_id: number }>) => Promise<void>;
  canCreateMore: () => boolean;
  remaining: number;
}

export const IdrielImportDialog: React.FC<Props> = ({ open, onOpenChange, onCreate, canCreateMore, remaining }) => {
  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const [extracting, setExtracting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [extractedText, setExtractedText] = useState('');
  const [sourceType, setSourceType] = useState<ImportSourceType>('texto');
  const [fileName, setFileName] = useState('');
  const [pendingPdf, setPendingPdf] = useState<File | null>(null);
  const [suggestions, setSuggestions] = useState<ImportedSuggestion[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());

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
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleFile = async (file: File) => {
    if (file.size > 15 * 1024 * 1024) { toast.error('Arquivo muito grande (máx. 15MB).'); return; }
    setFileName(file.name);
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    // PDFs vão direto pra Idriel em modo multimodal — sem extração no cliente.
    if (isPdf) {
      setPendingPdf(file);
      setExtractedText('');
      setSourceType('pdf');
      toast.success('PDF pronto. Idriel vai ler o documento inteiro com OCR.');
      return;
    }

    // DOCX / TXT / MD continuam com extração local (Gemini não lê DOCX nativo).
    setPendingPdf(null);
    setExtracting(true);
    try {
      const { text, sourceType } = await extractTextFromFile(file);
      if (text.trim().length < 50) {
        toast.error('Não foi possível extrair texto suficiente do arquivo.');
        setFileName('');
        return;
      }
      setExtractedText(text);
      setSourceType(sourceType);
      toast.success(`Texto extraído (${text.length.toLocaleString('pt-BR')} caracteres)`);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao extrair texto do arquivo.');
      setFileName('');
    } finally {
      setExtracting(false);
    }
  };

  const handlePasteAnalyze = async () => {
    if (extractedText.trim().length < 50) { toast.error('Cole pelo menos 50 caracteres de texto.'); return; }
    await runAnalysis(extractedText, 'texto');
  };

  const handleAnalyze = async () => {
    if (pendingPdf) {
      await runPdfAnalysis(pendingPdf);
      return;
    }
    await runAnalysis(extractedText, sourceType);
  };

  const finalizeAnalysis = (result: ImportedSuggestion[]) => {
    if (!Array.isArray(result) || result.length === 0) {
      toast.warning('Idriel não encontrou entradas relevantes neste documento. Tente um trecho mais descritivo.');
      return;
    }
    const valid = result.filter(e =>
      e && (e.type === 'ficha' || e.type === 'artigo') &&
      typeof e.title === 'string' && e.title.trim().length > 0 &&
      typeof e.summary === 'string' && e.summary.trim().length > 0 &&
      typeof e.fruit_id === 'number' && e.fruit_id >= 0 && e.fruit_id <= 10
    );
    if (valid.length === 0) {
      toast.warning('As sugestões retornadas não são válidas. Tente novamente.');
      return;
    }
    setSuggestions(valid);
    setSelected(new Set(valid.map((_, i) => i)));
    setStep('review');
  };

  const runPdfAnalysis = async (file: File) => {
    setAnalyzing(true);
    try {
      const result = await importFileWithIdriel(file);
      finalizeAnalysis(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao analisar arquivo';
      toast.error(msg);
    } finally {
      setAnalyzing(false);
    }
  };

  const runAnalysis = async (text: string, src: ImportSourceType) => {
    if (text.trim().length < 50) {
      toast.error('Texto muito curto (mínimo 50 caracteres).');
      return;
    }
    if (text.length > 400000) {
      toast.error('Texto muito longo (máximo 400.000 caracteres).');
      return;
    }
    setAnalyzing(true);
    try {
      const result = await importTextWithIdriel(text, src);
      finalizeAnalysis(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao analisar texto';
      toast.error(msg);
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleAll = (v: boolean) => setSelected(v ? new Set(suggestions.map((_, i) => i)) : new Set());
  const toggleOne = (i: number) => {
    const next = new Set(selected);
    if (next.has(i)) next.delete(i); else next.add(i);
    setSelected(next);
  };

  const handleCreate = async () => {
    const items = suggestions.filter((_, i) => selected.has(i));
    if (items.length === 0) { toast.error('Selecione ao menos uma entrada.'); return; }
    if (!canCreateMore()) { toast.error('Limite do plano atingido.'); return; }
    if (items.length > remaining) {
      toast.error(`Seu plano permite criar apenas ${remaining} entrada(s) restante(s).`);
      return;
    }
    setCreating(true);
    try {
      await onCreate(items.map(s => ({
        title: s.title.slice(0, 200),
        content: s.summary.slice(0, 50000),
        entry_type: s.type,
        fruit_id: s.fruit_id,
      })));
      toast.success(`${items.length} entrada(s) criada(s)!`);
      reset();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Erro ao criar entradas.';
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[720px] w-[95vw] max-h-[90vh] overflow-y-auto bg-card border-stroke">
        <DialogHeader>
          <DialogTitle className="font-cinzel text-gold inline-flex items-center gap-2"><Library className="w-4 h-4" strokeWidth={1.75} />Importar com Idriel</DialogTitle>
          <DialogDescription className="text-foreground/70">
            Idriel lê seu texto e sugere fichas e artigos para o Codex (custo: 1 gota).
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <div className="border border-dashed border-stroke rounded-lg p-6 text-center">
              <Upload className="mx-auto h-8 w-8 text-gold mb-2" />
              <label className="cursor-pointer">
                <span className="font-merriweather text-foreground/90">
                  <>{fileName ? <span className="inline-flex items-center gap-1.5"><Paperclip className="w-3.5 h-3.5" strokeWidth={1.75} />{fileName}</span> : 'Clique para enviar PDF, DOCX, TXT ou MD'}</>
                </span>
                <input
                  type="file"
                  accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                  disabled={extracting || analyzing}
                />
              </label>
              {extracting && (
                <div className="mt-3 flex items-center justify-center gap-2 text-foreground/70 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" /> Extraindo texto...
                </div>
              )}
            </div>

            <div className="text-center text-sm text-foreground/60">— ou cole texto diretamente —</div>

            <textarea
              className="w-full min-h-[140px] rounded-md bg-background/50 border border-stroke p-3 font-merriweather text-sm text-foreground/90"
              placeholder="Cole aqui um trecho do seu rascunho, anotações ou capítulo..."
              value={extractedText}
              onChange={e => { setExtractedText(e.target.value); setSourceType('texto'); }}
              maxLength={200000}
            />
            <div className="text-xs text-foreground/50 text-right">
              {extractedText.length.toLocaleString('pt-BR')} / 200.000 caracteres
            </div>

            {pendingPdf && (
              <div className="text-xs text-gold/80 bg-gold/[0.06] border border-gold/20 rounded-md p-2 flex items-start gap-2">
                <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>Idriel vai ler este PDF inteiro — incluindo páginas escaneadas (OCR). Sem corte de tamanho.</span>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => handleClose(false)} disabled={analyzing}>Cancelar</Button>
              <Button
                onClick={pendingPdf ? handleAnalyze : (fileName ? handleAnalyze : handlePasteAnalyze)}
                disabled={analyzing || extracting || (!pendingPdf && extractedText.trim().length < 50)}
                className="bg-gold text-background hover:bg-gold/90"
              >
                {analyzing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Idriel está lendo...</> : <><Sparkles className="h-4 w-4 mr-2" /> Analisar com Idriel</>}
              </Button>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground/80">
                {suggestions.length} sugestão(ões) · {selected.size} selecionada(s)
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => toggleAll(true)}>Marcar todas</Button>
                <Button size="sm" variant="ghost" onClick={() => toggleAll(false)}>Desmarcar</Button>
              </div>
            </div>

            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {suggestions.map((s, i) => {
                const fruit = FRUITS.find(f => f.id === s.fruit_id);
                const isFicha = s.type === 'ficha';
                return (
                  <div key={i} className="flex gap-3 p-3 rounded-md border border-stroke bg-background/40">
                    <Checkbox checked={selected.has(i)} onCheckedChange={() => toggleOne(i)} className="mt-1" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <FileText className="h-3.5 w-3.5 text-gold" />
                        <span className="font-cinzel text-foreground/95">{s.title}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${isFicha ? 'bg-blue-500/20 text-blue-300' : 'bg-amber-500/20 text-amber-300'}`}>
                          {isFicha ? 'Ficha' : 'Artigo'}
                        </span>
                        {fruit && <span className="text-[10px] text-foreground/60">· {fruit.name}</span>}
                      </div>
                      <p className="text-xs text-foreground/70 mt-1 line-clamp-3">{s.summary}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between gap-2 pt-2">
              <Button variant="ghost" onClick={() => setStep('upload')} disabled={creating} className="inline-flex items-center gap-1.5"><ArrowLeft className="w-3.5 h-3.5" strokeWidth={2} />Voltar</Button>
              <Button
                onClick={handleCreate}
                disabled={creating || selected.size === 0}
                className="bg-gold text-background hover:bg-gold/90"
              >
                {creating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Criando...</> : `Criar ${selected.size} entrada(s)`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
