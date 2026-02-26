import React, { useState, useCallback } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { DailyLimitBanner } from '@/components/DailyLimitBanner';
import { ApiKeyBar } from '@/components/ApiKeyBar';
import { WorldNameInput } from '@/components/WorldNameInput';
import { TabNav } from '@/components/TabNav';
import { TabConstruir } from '@/components/TabConstruir';
import { TabVisaoGeral } from '@/components/TabVisaoGeral';
import { TabGaleria } from '@/components/TabGaleria';
import { TabGerarImagens } from '@/components/TabGerarImagens';
import type { AppState, TabType, MethodType, GalleryImage } from '@/lib/data';

const initialState: AppState = {
  worldName: '',
  db: {},
  currentFruit: 0,
  method: 'top-down',
  gallery: [],
  activeTab: 'construir',
  apiKey: '',
  generatedPrompt: '',
};

const Index = () => {
  const [state, setState] = useState<AppState>(initialState);

  const setActiveTab = useCallback((tab: TabType) => setState(s => ({ ...s, activeTab: tab })), []);
  const setApiKey = useCallback((apiKey: string) => setState(s => ({ ...s, apiKey })), []);
  const setWorldName = useCallback((worldName: string) => setState(s => ({ ...s, worldName })), []);
  const setCurrentFruit = useCallback((currentFruit: number) => setState(s => ({ ...s, currentFruit })), []);
  const setMethod = useCallback((method: MethodType) => setState(s => ({ ...s, method })), []);
  const setGallery = useCallback((gallery: GalleryImage[]) => setState(s => ({ ...s, gallery })), []);
  const setGeneratedPrompt = useCallback((generatedPrompt: string) => setState(s => ({ ...s, generatedPrompt })), []);

  const updateField = useCallback((fruitId: number, fieldId: string, value: string) => {
    setState(s => ({
      ...s,
      db: { ...s.db, [fruitId]: { ...(s.db[fruitId] || {}), [fieldId]: value } },
    }));
  }, []);

  const addToGallery = useCallback((img: GalleryImage) => {
    setState(s => ({ ...s, gallery: [...s.gallery, img] }));
  }, []);

  return (
    <div className="min-h-screen bg-background relative">
      {/* Background overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: 'radial-gradient(ellipse 100% 80% at 50% 0%, rgba(4,8,15,0.3) 0%, rgba(4,8,15,0.85) 60%, rgba(4,8,15,0.97) 100%)',
        }}
      />

      <div className="relative z-10">
        <AppHeader />
        <DailyLimitBanner />
        <ApiKeyBar apiKey={state.apiKey} setApiKey={setApiKey} />
        <WorldNameInput worldName={state.worldName} setWorldName={setWorldName} />
        <TabNav activeTab={state.activeTab} setActiveTab={setActiveTab} />

        <main>
          {state.activeTab === 'construir' && (
            <TabConstruir state={state} updateField={updateField} setCurrentFruit={setCurrentFruit} setMethod={setMethod} />
          )}
          {state.activeTab === 'visao-geral' && (
            <TabVisaoGeral state={state} setActiveTab={setActiveTab} setCurrentFruit={setCurrentFruit} />
          )}
          {state.activeTab === 'galeria' && (
            <TabGaleria gallery={state.gallery} setGallery={setGallery} />
          )}
          {state.activeTab === 'gerar-imagens' && (
            <TabGerarImagens state={state} setGeneratedPrompt={setGeneratedPrompt} addToGallery={addToGallery} />
          )}
        </main>

        {/* Footer */}
        <footer className="text-center py-8 opacity-40">
          <p className="text-[10px] text-text-dim font-montserrat uppercase tracking-[0.2em]">
            A Árvore dos Mundos · Template com IA · Universo STORIA
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
