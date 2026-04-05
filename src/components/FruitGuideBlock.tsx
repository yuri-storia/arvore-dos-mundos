import React, { useState } from 'react';
import type { FruitGuide } from '@/lib/data';
import { ChevronDown } from 'lucide-react';
import idrielAvatar from '@/assets/idriel-avatar.png';

interface Props {
  guide: FruitGuide;
}

export const FruitGuideBlock: React.FC<Props> = ({ guide }) => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const toggle = (key: string) =>
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  const sections = [
    { key: 'orientacao', icon: '🌿', title: 'Orientação de Idriel', content: guide.min },
    { key: 'estudo', icon: '📖', title: 'Estudo de Caso', content: guide.ref },
    ...(guide.steps?.length ? [{ key: 'passos', icon: '🗺', title: 'Passo a Passo', content: null as string | null }] : []),
  ];

  return (
    <div className="mb-6 rounded-xl overflow-hidden card-glass-idriel">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-idriel/15">
        <img
          src={idrielAvatar}
          alt="Idriel"
          className="w-8 h-8 rounded-full object-cover border border-idriel/40 shrink-0"
        />
        <div className="flex-1 min-w-0">
          <span className="font-cinzel font-bold text-sm text-idriel-light block">
            📖 Orientação para Criação & Estudo de Caso
          </span>
          <span className="font-merriweather italic text-xs text-text-secondary">
            por Idriel, Guardiã da Árvore dos Mundos
          </span>
        </div>
      </div>

      {/* Accordion sections */}
      <div className="divide-y divide-idriel/10">
        {sections.map(section => {
          const isOpen = openSections[section.key] ?? false;

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
                  className={`w-4 h-4 text-idriel/50 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {isOpen && (
                <div className="animate-fadeUp px-4 pb-4">
                  {section.key === 'passos' ? (
                    <ol className="space-y-2 pl-1">
                      {guide.steps.map((step, i) => (
                        <li key={i} className="flex gap-2.5 items-start">
                          <span className="font-montserrat font-bold text-xs mt-0.5 shrink-0 w-6 h-6 rounded-full flex items-center justify-center bg-idriel/15 text-idriel-light">
                            {i + 1}
                          </span>
                          <span className="font-merriweather text-[14px] leading-relaxed text-text-secondary">
                            {step}
                          </span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="font-merriweather text-[14px] leading-[1.75] whitespace-pre-line text-text-secondary">
                      {section.content}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Closing quote */}
      {guide.closing && (
        <div className="px-4 py-3 border-t border-idriel/15 bg-idriel/[0.03]">
          <p className="font-cinzel italic text-center text-[13px] leading-relaxed text-idriel-glow">
            "{guide.closing}"
          </p>
        </div>
      )}
    </div>
  );
};
