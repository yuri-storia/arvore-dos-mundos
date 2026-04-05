import React, { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';

interface Tip {
  icon: string;
  title: string;
  desc: string;
}

const TAB_TIPS: Record<string, { label: string; tips: Tip[] }> = {
  construir: {
    label: 'Construir',
    tips: [
      { icon: '🌿', title: 'Escolha um Fruto', desc: 'Clique em qualquer um dos 11 Frutos para começar a preencher os campos do seu mundo.' },
      { icon: '✍️', title: 'Peça ajuda a Idriel', desc: 'Use o botão "Solicitar Ajuda de Idriel" em qualquer campo para receber sugestões criativas.' },
      { icon: '💾', title: 'Salva automaticamente', desc: 'Tudo que você escreve é salvo automaticamente na nuvem a cada 2 segundos.' },
    ],
  },
  codex: {
    label: 'Codex',
    tips: [
      { icon: '📝', title: 'Fichas e Artigos', desc: 'Crie Fichas (personagens, locais) com imagem ou Artigos (lore, história) estilo wiki.' },
      { icon: '🔍', title: 'Filtre por Fruto', desc: 'Use o dropdown de filtro para encontrar entradas por categoria rapidamente.' },
      { icon: '📄', title: 'Exporte como PDF', desc: 'Expanda uma entrada e clique em "Exportar PDF" para gerar um documento formatado.' },
    ],
  },
  escrever: {
    label: 'Escrever',
    tips: [
      { icon: '📖', title: 'Três modos de escrita', desc: 'Manuscrito (hierárquico), Quadro (Kanban visual) ou Livre (blocos independentes).' },
      { icon: '@', title: 'Menções do Codex', desc: 'Digite @NomeDoPersonagem no editor para referenciar fichas e artigos do seu mundo.' },
      { icon: '⏱️', title: 'Timer Pomodoro', desc: 'Use o timer personalizável para sessões focadas de escrita com pausas programadas.' },
    ],
  },
  galeria: {
    label: 'Galeria',
    tips: [
      { icon: '🖼️', title: 'Upload em lote', desc: 'Arraste múltiplas imagens ou clique na área de upload para adicionar várias de uma vez.' },
      { icon: '🏷️', title: 'Categorize por Fruto', desc: 'Escolha a categoria antes do upload para organizar suas referências visuais.' },
      { icon: '🔎', title: 'Zoom e download', desc: 'Clique em qualquer imagem para ampliar. Passe o mouse para opções de remover.' },
    ],
  },
  'gerar-imagens': {
    label: 'Visões de Idriel',
    tips: [
      { icon: '🌿', title: 'Dois passos criativos', desc: 'Primeiro Idriel cria o prompt ideal, depois materializa a imagem com Seiva Dourada.' },
      { icon: '🎨', title: 'Estilos visuais', desc: 'Escolha estilo, tipo de imagem e tom para guiar a geração exatamente como imagina.' },
      { icon: '💾', title: 'Salve na galeria', desc: 'Após gerar, salve direto na galeria com a categoria desejada para referência futura.' },
    ],
  },
};

interface Props {
  tab: string;
}

export const HelpDrawer: React.FC<Props> = ({ tab }) => {
  const [open, setOpen] = useState(false);
  const data = TAB_TIPS[tab];
  if (!data) return null;

  return (
    <>
      {/* Floating golden ? button — right side */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-40 w-10 h-10 rounded-full flex items-center justify-center border border-gold/40 bg-gold/[0.10] backdrop-blur-sm text-gold-light hover:bg-gold/[0.25] hover:scale-110 transition-all shadow-lg shadow-gold/10"
        aria-label="Ajuda"
      >
        <HelpCircle className="w-5 h-5" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="bg-[#060c16] border-l border-gold/15 w-[320px] sm:w-[360px] p-0">
          <SheetHeader className="p-5 pb-3 border-b border-gold/10">
            <SheetTitle className="font-cinzel text-gold-light text-base flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-gold" />
              Guia — {data.label}
            </SheetTitle>
            <SheetDescription className="font-montserrat text-[11px] text-text-dim">
              Dicas rápidas sobre esta seção
            </SheetDescription>
          </SheetHeader>

          <div className="p-4 space-y-3 overflow-y-auto max-h-[calc(100vh-120px)]">
            {data.tips.map((tip, i) => (
              <div
                key={i}
                className="rounded-lg p-3.5 border border-gold/10 bg-gold/[0.03] hover:bg-gold/[0.06] transition-colors"
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl shrink-0 mt-0.5">{tip.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-montserrat font-bold text-sm text-foreground mb-1">{tip.title}</h4>
                    <p className="font-merriweather text-xs text-text-dim leading-relaxed">{tip.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
