import React from 'react';
import { TabType } from '@/lib/data';
import { useIsMobile } from '@/hooks/use-mobile';
import { Leaf, BookOpen, Feather, Palette, type LucideIcon } from 'lucide-react';

const TABS: { id: TabType; label: string; Icon: LucideIcon }[] = [
  { id: 'construir', label: 'Construir', Icon: Leaf },
  { id: 'codex', label: 'Codex', Icon: BookOpen },
  { id: 'escrever', label: 'Escrever', Icon: Feather },
  { id: 'galeria', label: 'Galeria', Icon: Palette },
];

interface Props {
  activeTab: TabType;
  setActiveTab: (t: TabType) => void;
}

export const TabNav: React.FC<Props> = ({ activeTab, setActiveTab }) => {
  const isMobile = useIsMobile();

  // Only render on mobile — desktop uses sidebar
  if (!isMobile) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[150] backdrop-blur-[20px] border-t shadow-[0_-6px_30px_hsl(28_32%_15%/0.55)]"
      style={{
        background:
          'linear-gradient(135deg, hsl(28 32% 18% / 0.92) 0%, hsl(30 30% 28% / 0.88) 50%, hsl(34 42% 38% / 0.92) 100%)',
        borderColor: 'hsl(40 50% 70% / 0.35)',
      }}
    >
      <div className="mx-auto max-w-[1060px] flex">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              data-tour={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-0 py-2.5 px-1 text-center font-montserrat font-bold text-[10px] sm:text-xs uppercase tracking-[0.1em] transition-colors ${
                isActive ? 'text-gold-cream' : 'text-gold-cream/55 hover:text-gold-cream/85'
              }`}
            >
              <tab.Icon className="block mx-auto mb-0.5 w-[18px] h-[18px]" strokeWidth={1.75} />
              <span className="block">{tab.label}</span>
              {isActive && (
                <div
                  className="mx-auto mt-1 w-8 h-[2px] rounded-full"
                  style={{ background: 'linear-gradient(90deg, hsl(40 50% 78%), hsl(42 55% 90%))' }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
