import React from 'react';
import { TabType } from '@/lib/data';
import { useIsMobile } from '@/hooks/use-mobile';

const TABS: { id: TabType; label: string; icon: string }[] = [
  { id: 'construir', label: 'Construir', icon: '🌿' },
  { id: 'codex', label: 'Codex', icon: '📖' },
  { id: 'escrever', label: 'Escrever', icon: '✍️' },
  { id: 'galeria', label: 'Galeria', icon: '🎨' },
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
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 min-w-0 py-2.5 px-1 text-center font-montserrat font-bold text-[10px] sm:text-xs uppercase tracking-[0.1em] transition-colors ${
              activeTab === tab.id
                ? 'text-bg-deep'
                : 'text-bg-deep/60 hover:text-bg-deep/80'
            }`}
          >
            <span className="block text-base mb-0.5" style={{ color: 'initial', filter: 'none' }}>{tab.icon}</span>
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
