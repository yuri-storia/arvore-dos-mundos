import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { DailyLimitBanner } from '@/components/DailyLimitBanner';
import { OnboardingBanner } from '@/components/OnboardingBanner';
import { ApiKeyBar } from '@/components/ApiKeyBar';

import { WorldNameInput } from '@/components/WorldNameInput';
import { TabNav } from '@/components/TabNav';
import { TabConstruir } from '@/components/TabConstruir';
import { TabVisaoGeral } from '@/components/TabVisaoGeral';
import { TabGaleria } from '@/components/TabGaleria';
import { TabGerarImagens } from '@/components/TabGerarImagens';
import { saveWorld, type WorldSave } from '@/lib/saves';
import { toast } from 'sonner';
import type { AppState, TabType, MethodType, GalleryImage } from '@/lib/data';

const createNewState = (): AppState => ({
  worldName: '',
  db: {},
  currentFruit: 0,
  method: 'top-down',
  gallery: [],
  activeTab: 'construir',
  apiKey: '',
  generatedPrompt: '',
  currentSaveId: '',
});

const Index = () => {
  const [state, setState] = useState<AppState>(createNewState);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Auto-save
  useEffect(() => {
    if (!state.currentSaveId) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => { saveWorld(state); }, 2000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [state.worldName, state.db, state.method, state.gallery, state.currentSaveId]);

  const handleCreateWorld = useCallback(() => {
    setState(s => {
      const saved = saveWorld({ ...s, worldName: s.worldName || 'Mundo Sem Nome' });
      toast.success(`"${saved.name}" criado com sucesso!`);
      return { ...s, currentSaveId: saved.id };
    });
  }, []);

  const handleLoadWorld = useCallback((save: WorldSave) => {
    setState(prev => {
      if (prev.currentSaveId && (prev.worldName || Object.keys(prev.db).length > 0)) saveWorld(prev);
      return { ...prev, worldName: save.name, db: save.db, method: save.method, gallery: save.gallery, currentFruit: 0, currentSaveId: save.id, generatedPrompt: '', activeTab: 'construir' };
    });
    toast.success(`"${save.name}" carregado!`);
  }, []);

  const handleNewWorld = useCallback(() => {
    setState(prev => {
      if (prev.currentSaveId && (prev.worldName || Object.keys(prev.db).length > 0)) saveWorld(prev);
      return { ...createNewState(), apiKey: prev.apiKey };
    });
    toast.info('Novo mundo criado!');
  }, []);

  return (
    <div className="min-h-screen bg-background relative">
      <div className="fixed inset-0 pointer-events-none z-0" style={{ background: 'radial-gradient(ellipse 100% 80% at 50% 0%, rgba(4,8,15,0.2) 0%, rgba(4,8,15,0.75) 60%, rgba(4,8,15,0.97) 100%)' }} />
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[300px] left-1/2 -translate-x-1/2 w-[140%] h-[600px]" style={{ background: 'radial-gradient(ellipse 80% 100% at 50% 0%, rgba(43,74,108,0.12) 0%, rgba(4,12,17,0.08) 60%, transparent 100%)', filter: 'blur(80px)' }} />
      </div>

      <div className="relative z-10">
        <AppHeader />

        <WorldNameInput
          worldName={state.worldName}
          setWorldName={setWorldName}
          hasBeenCreated={!!state.currentSaveId}
          onCreateWorld={handleCreateWorld}
          onLoadWorld={handleLoadWorld}
          onNewWorld={handleNewWorld}
          currentSaveId={state.currentSaveId}
        />

        <OnboardingBanner />
        <TabNav activeTab={state.activeTab} setActiveTab={setActiveTab} />

        <main>
          {state.activeTab === 'construir' && <TabConstruir state={state} updateField={updateField} setCurrentFruit={setCurrentFruit} setMethod={setMethod} />}
          {state.activeTab === 'visao-geral' && <TabVisaoGeral state={state} setActiveTab={setActiveTab} setCurrentFruit={setCurrentFruit} />}
          {state.activeTab === 'galeria' && <TabGaleria gallery={state.gallery} setGallery={setGallery} />}
          {state.activeTab === 'gerar-imagens' && <TabGerarImagens state={state} setGeneratedPrompt={setGeneratedPrompt} addToGallery={addToGallery} />}
        </main>

        <DailyLimitBanner />
        <ApiKeyBar apiKey={state.apiKey} setApiKey={setApiKey} />

        <footer className="text-center py-8 pb-24 opacity-40">
          <p className="text-[10px] text-text-dim font-montserrat uppercase tracking-[0.2em]">
            A Árvore dos Mundos · Template com IA · Universo STORIA
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
