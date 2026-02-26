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
  <nav className="fixed bottom-0 left-0 right-0 z-[150] bg-blue-light/90 backdrop-blur-[12px] border-t border-blue-bright/30 shadow-[0_-4px_20px_rgba(0,0,0,0.4)]">
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
          <span className="block text-base mb-0.5">{tab.icon}</span>
          <span className={`block ${activeTab === tab.id ? 'opacity-100' : 'opacity-70'}`}>{tab.label}</span>
          {activeTab === tab.id && (
            <div className="mx-auto mt-1 w-6 h-[2px] rounded-full bg-bg-deep" />
          )}
        </button>
      ))}
    </div>
  </nav>
);
