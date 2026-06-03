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
    <nav className="fixed bottom-0 left-0 right-0 z-[150] backdrop-blur-[20px] border-t border-blue-glow/50 shadow-[0_-4px_30px_rgba(33,150,243,0.2)]" style={{ background: 'linear-gradient(135deg, hsl(210 84% 69% / 0.45) 0%, hsl(211 76% 42% / 0.35) 50%, hsl(207 90% 61% / 0.4) 100%)' }}>
      <div className="mx-auto max-w-[1060px] flex">
        {TABS.map(tab => (
          <button
            key={tab.id}
            data-tour={`tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 min-w-0 py-2.5 px-1 text-center font-montserrat font-bold text-[10px] sm:text-xs uppercase tracking-[0.1em] transition-colors ${
              activeTab === tab.id
                ? 'text-bg-deep'
                : 'text-bg-deep/60 hover:text-bg-deep/80'
            }`}
          >
            <tab.Icon className="block mx-auto mb-0.5 w-[18px] h-[18px]" strokeWidth={1.75} />
            <span className={`block ${activeTab === tab.id ? 'opacity-100' : 'opacity-70'}`}>{tab.label}</span>
            {activeTab === tab.id && (
              <div className="mx-auto mt-1 w-6 h-[2px] rounded-full bg-bg-deep" />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
};
