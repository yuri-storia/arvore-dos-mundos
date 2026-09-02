import React, { useState } from 'react';
import { Download, FileText, FileType, BookOpen, HelpCircle, X, Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exportManuscriptPDF, exportManuscriptDOCX, exportManuscriptEPUB } from '@/lib/manuscriptExport';
import type { Manuscript, Chapter, Scene } from '@/hooks/useManuscript';
import { toast } from 'sonner';
import { usePlanLimits } from '@/hooks/usePlanLimits';

interface Props {
  manuscript: Manuscript;
  chapters: Chapter[];
  scenes: Scene[];
}

const EXPORT_OPTIONS = [
  {
    id: 'pdf' as const,
    label: 'PDF',
    icon: FileText,
    desc: 'Formato universal para leitura e impressão. Ideal para revisão e compartilhamento.',
  },
  {
    id: 'docx' as const,
    label: 'Word (.docx)',
    icon: FileType,
    desc: 'Compatível com editoras e revisores. Use para submissões profissionais ou edição avançada.',
  },
  {
    id: 'kindle' as const,
    label: 'Kindle / EPUB (.epub)',
    icon: BookOpen,
    desc: 'EPUB 3 válido, importável diretamente no Kindle Direct Publishing (KDP), Kindle Previewer e Apple Books.',
  },
];

export const ManuscriptExportMenu: React.FC<Props> = ({ manuscript, chapters, scenes }) => {
  const [open, setOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const planLimits = usePlanLimits();

  if (!planLimits.canExport) {
    return (
      <Button variant="ghost" size="sm" disabled
        className="text-muted-foreground gap-1.5 text-[11px] cursor-not-allowed" title="Exportação disponível para assinantes">
        <Lock className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Exportar</span>
      </Button>
    );
  }

  const handleExport = async (format: 'pdf' | 'docx' | 'kindle') => {
    try {
      if (format === 'pdf') exportManuscriptPDF(manuscript, chapters, scenes);
      else if (format === 'docx') await exportManuscriptDOCX(manuscript, chapters, scenes);
      else exportManuscriptEPUB(manuscript, chapters, scenes);
      toast.success('Exportação concluída!');
      setOpen(false);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao exportar. Tente novamente.');
    }
  };

  return (
    <div className="relative">
      <Button
        size="sm"
        onClick={() => setOpen(!open)}
        className="gap-1.5 text-[11px] font-montserrat font-bold uppercase tracking-wider text-white border-0 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500 hover:from-emerald-400 hover:via-teal-400 hover:to-blue-400 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-400/40 transition-all"
        title="Exportar manuscrito"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Exportar</span>
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setShowHelp(false); }} />
          <div className="absolute right-0 top-full mt-2 w-80 z-50 rounded-xl border border-blue-bright/20 bg-[hsl(var(--bg-deep))] shadow-2xl animate-scale-in">
            <div className="p-3 border-b border-blue-bright/10 flex items-center justify-between">
              <h3 className="font-cinzel font-bold text-sm text-foreground">Exportar Manuscrito</h3>
              <button onClick={() => setShowHelp(!showHelp)}
                className="p-1 rounded hover:bg-white/[0.05] text-text-dim hover:text-idriel-light transition-colors" title="Como funciona?">
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>

            {showHelp && (
              <div className="p-3 bg-idriel/[0.06] border-b border-idriel/10 text-xs text-text-secondary leading-relaxed space-y-2">
                <p className="font-montserrat font-bold text-idriel-light text-[11px] inline-flex items-center gap-1.5"><Sparkles className="w-3 h-3" strokeWidth={1.75} />Como exportar seu manuscrito</p>
                <p>O manuscrito exporta <strong>todos os capítulos</strong> na ordem em que você organizou. Certifique-se de que:</p>
                <ul className="list-disc list-inside space-y-1 ml-1">
                  <li>Os capítulos estejam na ordem desejada</li>
                  <li>Cada capítulo tenha título e conteúdo</li>
                  <li>A sinopse do manuscrito esteja preenchida (aparece na capa)</li>
                </ul>
                <p><strong>Para Kindle:</strong> Geramos um <code>.epub</code> válido (EPUB 3 com sumário navegável). Faça upload direto no <a href="https://kdp.amazon.com" target="_blank" rel="noopener" className="text-blue-light underline">Kindle Direct Publishing</a> ou abra no <a href="https://www.amazon.com/Kindle-Previewer/b?node=21381691011" target="_blank" rel="noopener" className="text-blue-light underline">Kindle Previewer</a> para conferir antes de publicar.</p>
              </div>
            )}

            <div className="p-2 space-y-1">
              {EXPORT_OPTIONS.map(opt => {
                const locked = opt.id === 'kindle' && !planLimits.canExportEpub;
                return (
                  <button
                    key={opt.id}
                    onClick={() => (locked ? undefined : handleExport(opt.id))}
                    disabled={locked}
                    title={locked ? 'Exportação E-pub/Kindle é exclusiva do plano Idriel' : undefined}
                    className={`w-full flex items-start gap-3 p-3 rounded-lg transition-colors group text-left ${locked ? 'opacity-45 cursor-not-allowed' : 'hover:bg-white/[0.04]'}`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-bright/10 flex items-center justify-center shrink-0 group-hover:bg-blue-bright/20 transition-colors">
                      {locked ? <Lock className="w-4 h-4 text-text-dim" /> : <opt.icon className="w-4 h-4 text-blue-light" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-montserrat font-bold text-xs text-foreground">{opt.label}</p>
                      <p className="text-[11px] text-text-dim leading-snug mt-0.5">
                        {locked ? 'Disponível no plano Idriel.' : opt.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="p-2 pt-0">
              <p className="text-[10px] text-text-dim/50 text-center">
                {chapters.length} capítulo{chapters.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
