import React, { useState, useRef } from 'react';
import { Upload, FileText, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { importManuscriptFile, chapterTextToHtml, type ImportedManuscript } from '@/lib/manuscriptImport';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  worldId: string;
  trigger: React.ReactNode;
  onImported?: (manuscript: { id: string; title: string }) => void;
}

const ACCEPT = '.pdf,.docx,.txt,.md,.epub,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/epub+zip,text/plain';

export const ImportManuscriptDialog: React.FC<Props> = ({ worldId, trigger, onImported }) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ImportedManuscript | null>(null);
  const [manuscriptTitle, setManuscriptTitle] = useState('');
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null); setParsed(null); setManuscriptTitle(''); setParsing(false); setSaving(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleFile = async (f: File | null) => {
    if (!f) return;
    if (f.size > 30 * 1024 * 1024) {
      toast.error('Arquivo muito grande (máx. 30 MB).');
      return;
    }
    setFile(f);
    setParsing(true);
    try {
      const result = await importManuscriptFile(f);
      setParsed(result);
      setManuscriptTitle(result.title);
      toast.success(`Importado: ${result.chapters.length} capítulo${result.chapters.length !== 1 ? 's' : ''} detectado${result.chapters.length !== 1 ? 's' : ''}.`);
    } catch (e) {
      console.error(e);
      toast.error('Não foi possível ler este arquivo. Verifique o formato.');
      setFile(null);
    } finally {
      setParsing(false);
    }
  };

  const handleConfirm = async () => {
    if (!parsed || !user) return;
    setSaving(true);
    try {
      const { data: ms, error: msErr } = await supabase
        .from('manuscripts')
        .insert({ user_id: user.id, world_id: worldId, title: manuscriptTitle.trim() || 'Manuscrito importado' })
        .select()
        .single();
      if (msErr || !ms) throw msErr || new Error('Falha ao criar manuscrito');

      const rows = parsed.chapters.map((c, i) => ({
        user_id: user.id,
        manuscript_id: ms.id,
        title: c.title || `Capítulo ${i + 1}`,
        content: chapterTextToHtml(c.content),
        word_count: c.content.trim() ? c.content.trim().split(/\s+/).length : 0,
        sort_order: i,
      }));
      const { error: chErr } = await supabase.from('chapters').insert(rows);
      if (chErr) throw chErr;

      toast.success('Manuscrito importado com sucesso!');
      onImported?.(ms.id);
      setOpen(false);
      reset();
    } catch (e) {
      console.error(e);
      toast.error('Erro ao salvar o manuscrito importado.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-cinzel flex items-center gap-2">
            <Upload className="w-4 h-4 text-emerald-400" />
            Importar Manuscrito
          </DialogTitle>
          <DialogDescription className="text-xs">
            Envie um arquivo <strong>.pdf</strong>, <strong>.docx</strong>, <strong>.txt</strong> ou <strong>.epub</strong>. A Árvore identificará os capítulos automaticamente (procurando por "Capítulo", "Chapter", "Prólogo" ou pela estrutura do EPUB).
          </DialogDescription>
        </DialogHeader>

        {!parsed && (
          <div>
            <label
              htmlFor="ms-import-input"
              className="block border-2 border-dashed border-blue-bright/25 rounded-lg p-6 text-center cursor-pointer hover:border-emerald-400/40 hover:bg-emerald-400/5 transition-colors"
            >
              {parsing ? (
                <>
                  <Loader2 className="w-6 h-6 mx-auto mb-2 text-emerald-400 animate-spin" />
                  <p className="text-xs text-text-secondary">Analisando "{file?.name}"…</p>
                </>
              ) : (
                <>
                  <Upload className="w-7 h-7 mx-auto mb-2 text-text-dim" />
                  <p className="text-sm font-montserrat font-bold text-foreground">Clique para escolher</p>
                  <p className="text-[11px] text-text-dim mt-1">PDF · DOCX · TXT · EPUB (até 30 MB)</p>
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
        )}

        {parsed && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 text-xs">
              <CheckCircle2 className="w-4 h-4" />
              <span>Arquivo lido: <strong>{parsed.chapters.length}</strong> capítulo{parsed.chapters.length !== 1 ? 's' : ''} · {parsed.sourceType.toUpperCase()}</span>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-text-dim font-montserrat mb-1.5">
                Nome do manuscrito
              </label>
              <Input
                value={manuscriptTitle}
                onChange={(e) => setManuscriptTitle(e.target.value)}
                placeholder="Ex: Crônicas de Ellerya"
              />
            </div>
            <div className="max-h-[220px] overflow-y-auto rounded-md border border-blue-bright/10 bg-white/[0.02] p-2">
              <p className="text-[10px] uppercase tracking-wider text-text-dim font-montserrat mb-1.5 px-1">Prévia dos capítulos</p>
              <ol className="space-y-1">
                {parsed.chapters.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs px-1 py-1 rounded hover:bg-white/[0.03]">
                    <FileText className="w-3 h-3 mt-0.5 text-blue-light/70 shrink-0" />
                    <span className="flex-1 min-w-0">
                      <span className="text-foreground font-montserrat font-bold truncate block">{c.title}</span>
                      <span className="text-[10px] text-text-dim">
                        {c.content.trim() ? c.content.trim().split(/\s+/).length.toLocaleString() : 0} palavras
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => { setOpen(false); reset(); }} disabled={saving}>
            Cancelar
          </Button>
          {parsed && (
            <Button
              onClick={handleConfirm}
              disabled={saving || !manuscriptTitle.trim()}
              className="bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-400 hover:to-blue-400 text-white shadow-lg shadow-emerald-500/20"
            >
              {saving ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Salvando…</> : <>Importar {parsed.chapters.length} capítulo{parsed.chapters.length !== 1 ? 's' : ''}</>}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
