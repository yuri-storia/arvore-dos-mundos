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
    label: 'Kindle / E-book (.html)',
    icon: BookOpen,
    desc: 'HTML formatado pronto para importar no Kindle Direct Publishing (KDP) da Amazon ou converter em .epub.',
  },
];

export const ManuscriptExportMenu: React.FC<Props> = ({ manuscript, chapters, scenes }) => {
  const [open, setOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const planLimits = usePlanLimits();

  if (!planLimits.canExport) {
    return (
      <Button variant="ghost" size="sm" disabled
        className="text-muted-foreground gap-1.5 text-[11px] cursor-not-allowed" title="Exportação disponível a partir do plano Raiz">
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
      <Button variant="ghost" size="sm" onClick={() => setOpen(!open)}
        className="text-text-dim hover:text-foreground gap-1.5 text-[11px]" title="Exportar manuscrito">
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
                <p><strong>Para Kindle:</strong> O arquivo HTML pode ser importado diretamente no <a href="https://kdp.amazon.com" target="_blank" rel="noopener" className="text-blue-light underline">Kindle Direct Publishing</a> ou convertido para .epub com o <a href="https://calibre-ebook.com" target="_blank" rel="noopener" className="text-blue-light underline">Calibre</a>.</p>
              </div>
            )}

            <div className="p-2 space-y-1">
              {EXPORT_OPTIONS.map(opt => (
                <button key={opt.id} onClick={() => handleExport(opt.id)}
                  className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-white/[0.04] transition-colors group text-left">
                  <div className="w-8 h-8 rounded-lg bg-blue-bright/10 flex items-center justify-center shrink-0 group-hover:bg-blue-bright/20 transition-colors">
                    <opt.icon className="w-4 h-4 text-blue-light" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-montserrat font-bold text-xs text-foreground">{opt.label}</p>
                    <p className="text-[11px] text-text-dim leading-snug mt-0.5">{opt.desc}</p>
                  </div>
                </button>
              ))}
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
