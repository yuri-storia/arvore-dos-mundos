import React, { useState } from 'react';
import { FRUIT_RECOMMENDED_TYPE, type FruitGuide, type RecommendedType } from '@/lib/data';
import { ChevronDown, ClipboardList, PencilLine, Leaf, BookOpen, type LucideIcon } from 'lucide-react';
import idrielAvatar from '@/assets/idriel-avatar.png';

interface Props {
  guide: FruitGuide;
  id?: string;
  fruitId?: number;
}

const RECOMMENDATION_COPY: Record<RecommendedType, { icon: string; label: string; tone: string }> = {
  ficha: {
    Icon: ClipboardList,
    label: 'Fichas',
    tone: 'Idriel sugere que este Fruto gere principalmente **Fichas** — entradas estruturadas e visuais (personagens, lugares, criaturas, itens).',
  },
  artigo: {
    Icon: PencilLine,
    label: 'Artigos',
    tone: 'Idriel sugere que este Fruto gere principalmente **Artigos** — textos livres que explicam sistemas, lore, conceitos e história.',
  },
  both: {
    Icon: Leaf,
    label: 'Fichas e Artigos',
    tone: 'Idriel sugere que este Fruto pode gerar tanto **Fichas** (rituais, costumes específicos) quanto **Artigos** (valores e crenças).',
  },
};

export const FruitGuideBlock: React.FC<Props> = ({ guide, id, fruitId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const toggle = (key: string) =>
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  const recommendation = fruitId !== undefined ? FRUIT_RECOMMENDED_TYPE[fruitId] : undefined;
  const recCopy = recommendation ? RECOMMENDATION_COPY[recommendation] : null;

  const sections = [
    { key: 'orientacao', Icon: Leaf, title: 'Sobre este Fruto', content: guide.min, recCopy },
    { key: 'estudo', Icon: BookOpen, title: 'Estudo de Caso', content: guide.ref, recCopy: null },
  ];

  return (
    <div id={id} className="mb-6 rounded-xl overflow-hidden card-glass-idriel">
      {/* Collapsed header */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-idriel/[0.04] transition-colors"
      >
        <img
          src={idrielAvatar}
          alt="Idriel"
          className="w-8 h-8 rounded-full object-cover border border-idriel/40 shrink-0"
        />
        <div className="flex-1 min-w-0">
          <span className="font-cinzel font-bold text-sm text-idriel-light block">
            Orientações de Idriel
          </span>
          <span className="font-merriweather italic text-xs text-text-secondary">
            Dicas, estudo de caso e passo a passo
          </span>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-idriel/50 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Inner accordion sections — only visible when outer is open */}
      {isOpen && (
        <div className="animate-fadeUp divide-y divide-idriel/10 border-t border-idriel/15">
          {sections.map(section => {
            const sectionOpen = openSections[section.key] ?? false;

            return (
              <div key={section.key}>
                <button
                  onClick={() => toggle(section.key)}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-idriel/[0.04] transition-colors group"
                >
                  <span className="text-base shrink-0">{section.icon}</span>
                  <span className="font-montserrat font-bold text-[13px] uppercase tracking-wider text-idriel-light flex-1">
                    {section.title}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-idriel/50 transition-transform duration-300 ${sectionOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {sectionOpen && (
                  <div className="animate-fadeUp px-4 pb-4">
                    {/* Recommendation banner — only on "Sobre este Fruto" */}
                    {section.recCopy && (
                      <div className="mb-3 flex items-start gap-2.5 p-3 rounded-md bg-gold/[0.07] border border-gold/25">
                        <span className="text-base shrink-0 mt-0.5">{section.recCopy.icon}</span>
                        <p
                          className="font-merriweather text-[13px] leading-relaxed text-gold-light/95 italic"
                          dangerouslySetInnerHTML={{
                            __html: section.recCopy.tone.replace(
                              /\*\*(.+?)\*\*/g,
                              '<strong class="text-gold not-italic font-bold">$1</strong>'
                            ),
                          }}
                        />
                      </div>
                    )}
                    <p className="font-merriweather text-[14px] leading-[1.75] whitespace-pre-line text-text-secondary">
                      {section.content}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Closing quote */}
      {isOpen && guide.closing && (
        <div className="px-4 py-3 border-t border-idriel/15 bg-idriel/[0.03]">
          <p className="font-cinzel italic text-center text-[13px] leading-relaxed text-idriel-glow">
            "{guide.closing}"
          </p>
        </div>
      )}
    </div>
  );
};
