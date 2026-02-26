import React from 'react';
import { TabType } from '@/lib/data';

const TABS: { id: TabType; label: string; icon: string }[] = [
  { id: 'construir', label: 'Construir', icon: '🌿' },
  { id: 'visao-geral', label: 'Visão Geral', icon: '🗺' },
  { id: 'galeria', label: 'Galeria', icon: '🖼' },
  { id: 'gerar-imagens', label: 'Gerar Imagens', icon: '✨' },
];

interface Props {
  activeTab: TabType;
  setActiveTab: (t: TabType) => void;
}

export const TabNav: React.FC<Props> = ({ activeTab, setActiveTab }) => (
  <nav className="sticky top-0 z-50 bg-background/70 backdrop-blur-[10px] border-b border-blue-light/[0.35]">
    <div className="mx-auto max-w-[1060px] flex overflow-x-auto">
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`flex-1 min-w-[120px] py-3 px-2 text-center font-montserrat font-bold text-xs uppercase tracking-[0.14em] transition-colors border-b-2 ${
            activeTab === tab.id
              ? 'text-blue-bright border-blue-bright'
              : 'text-text-dim border-transparent hover:text-text-secondary'
          }`}
        >
          <span className="mr-1">{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </div>
  </nav>
);
