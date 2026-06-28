import React, { useState } from 'react';
import { FRUIT_RECOMMENDED_TYPE, type FruitGuide, type RecommendedType } from '@/lib/data';
import { ChevronDown, ClipboardList, PencilLine, Apple, BookOpen, type LucideIcon } from 'lucide-react';
import idrielAvatar from '@/assets/idriel-avatar.webp';

interface Props {
  guide: FruitGuide;
  id?: string;
  fruitId?: number;
}

const RECOMMENDATION_COPY: Record<RecommendedType, { Icon: LucideIcon; label: string; tone: string }> = {
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
    Icon: Apple,
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
    { key: 'orientacao', Icon: Apple, title: 'Sobre este Fruto', content: guide.min, recCopy },
    { key: 'estudo', Icon: BookOpen, title: 'Estudo de Caso', content: guide.ref, recCopy: null },
  ];

  return (
    <div id={id} className="mb-6 rounded-xl overflow-hidden card-glass-gold-premium">
      {/* Collapsed header */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gold-warm/[0.06] transition-colors"
      >
        <img
          src={idrielAvatar}
          alt="Idriel"
          className="w-8 h-8 rounded-full object-cover border border-gold-warm/50 shrink-0 shadow-[0_0_8px_hsl(var(--gold-warm)/0.3)]"
        />
        <div className="flex-1 min-w-0">
          <span className="font-cinzel font-bold text-sm text-gradient-gold block">
            Orientações de Idriel
          </span>
          <span className="font-merriweather italic text-xs text-text-secondary">
            Dicas, estudo de caso e passo a passo
          </span>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-gold-warm/70 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Inner accordion sections — only visible when outer is open */}
      {isOpen && (
        <div className="animate-fadeUp divide-y divide-gold-warm/15 border-t border-gold-warm/20">
          {sections.map(section => {
            const sectionOpen = openSections[section.key] ?? false;

            return (
              <div key={section.key}>
                <button
                  onClick={() => toggle(section.key)}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-gold-warm/[0.05] transition-colors group"
                >
                  <section.Icon className="w-4 h-4 shrink-0 text-gold-champagne" strokeWidth={1.75} />
                  <span className="font-montserrat font-bold text-[13px] uppercase tracking-wider text-gradient-gold flex-1">
                    {section.title}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-gold-warm/60 transition-transform duration-300 ${sectionOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {sectionOpen && (
                  <div className="animate-fadeUp px-4 pb-4">
                    {section.recCopy && (
                      <div className="mb-3 flex items-start gap-2.5 p-3 rounded-md bg-gradient-to-br from-gold-warm/[0.10] to-gold-deep/[0.05] border border-gold-warm/30">
                        <section.recCopy.Icon className="w-4 h-4 shrink-0 mt-0.5 text-gold-champagne" strokeWidth={1.75} />
                        <p
                          className="font-merriweather text-[13px] leading-relaxed text-gold-cream/95 italic"
                          dangerouslySetInnerHTML={{
                            __html: section.recCopy.tone.replace(
                              /\*\*(.+?)\*\*/g,
                              '<strong class="text-gradient-gold not-italic font-bold">$1</strong>'
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
        <div className="px-4 py-3 border-t border-gold-warm/20 bg-gradient-to-r from-gold-deep/[0.06] via-gold-warm/[0.04] to-gold-deep/[0.06]">
          <p className="font-cinzel italic text-center text-[13px] leading-relaxed text-gradient-gold">
            "{guide.closing}"
          </p>
        </div>
      )}
    </div>
  );
};
