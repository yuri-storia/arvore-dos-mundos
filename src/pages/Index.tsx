import React, { useState, useCallback } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { UserMenu } from '@/components/UserMenu';
import { DailyLimitBanner } from '@/components/DailyLimitBanner';
import { OnboardingBanner } from '@/components/OnboardingBanner';
import { ApiKeyBar } from '@/components/ApiKeyBar';
import { WorldNameInput } from '@/components/WorldNameInput';
import { WorldSelector } from '@/components/WorldSelector';
import { TabNav } from '@/components/TabNav';
import { TabConstruir } from '@/components/TabConstruir';
import { TabVisaoGeral } from '@/components/TabVisaoGeral';
import { TabGaleria } from '@/components/TabGaleria';
import { TabGerarImagens } from '@/components/TabGerarImagens';
import { saveWorld, loadSave, type WorldSave } from '@/lib/saves';
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

  const handleSaveWorld = useCallback(() => {
    setState(s => {
      const saved = saveWorld(s);
      toast.success(`"${saved.name}" salvo com sucesso!`);
      return { ...s, currentSaveId: saved.id };
    });
  }, []);

  const handleLoadWorld = useCallback((save: WorldSave) => {
    setState(prev => {
      if (prev.currentSaveId && (prev.worldName || Object.keys(prev.db).length > 0)) {
        saveWorld(prev);
      }
      return {
        ...prev,
        worldName: save.name,
        db: save.db,
        method: save.method,
        gallery: save.gallery,
        currentFruit: 0,
        currentSaveId: save.id,
        generatedPrompt: '',
        activeTab: 'construir',
      };
    });
    toast.success(`"${save.name}" carregado!`);
  }, []);

  const handleNewWorld = useCallback(() => {
    setState(prev => {
      if (prev.currentSaveId && (prev.worldName || Object.keys(prev.db).length > 0)) {
        saveWorld(prev);
      }
      return { ...createNewState(), apiKey: prev.apiKey };
    });
    toast.info('Novo mundo criado!');
  }, []);

  return (
    <div className="min-h-screen bg-background relative">
      {/* Ambient gradient overlays */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{
        background: 'radial-gradient(ellipse 100% 80% at 50% 0%, rgba(4,8,15,0.2) 0%, rgba(4,8,15,0.75) 60%, rgba(4,8,15,0.97) 100%)',
      }} />
      <div className="fixed inset-0 pointer-events-none z-0" style={{
        background: 'radial-gradient(ellipse 80% 40% at 50% 55%, hsl(207 90% 61% / 0.07) 0%, transparent 70%), radial-gradient(ellipse 70% 35% at 40% 90%, hsl(207 90% 61% / 0.06) 0%, transparent 60%)',
      }} />

      <div className="relative z-10">
        <AppHeader />
        <UserMenu />

        {/* World name first — identity before management */}
        <WorldNameInput worldName={state.worldName} setWorldName={setWorldName} />

        {/* World management */}
        <WorldSelector
          currentSaveId={state.currentSaveId}
          onNewWorld={handleNewWorld}
          onLoadWorld={handleLoadWorld}
          onSaveWorld={handleSaveWorld}
        />

        <OnboardingBanner />
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

        {/* AI usage + API key grouped together at the bottom */}
        <DailyLimitBanner />
        <ApiKeyBar apiKey={state.apiKey} setApiKey={setApiKey} />

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
