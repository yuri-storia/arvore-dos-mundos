import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { SubscriptionBanner } from '@/components/SubscriptionBanner';
import { OnboardingBanner } from '@/components/OnboardingBanner';

import { WorldNameInput } from '@/components/WorldNameInput';
import { TabNav } from '@/components/TabNav';
import { TabConstruir } from '@/components/TabConstruir';
import { TabCodex } from '@/components/TabCodex';
import { TabGaleria } from '@/components/TabGaleria';
import { TabGerarImagens } from '@/components/TabGerarImagens';
import { useWorlds, type WorldRecord } from '@/hooks/useWorlds';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { AppState, TabType, MethodType, GalleryImage } from '@/lib/data';

const LAST_WORLD_STORAGE = 'adm_last_world';

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
  const { user } = useAuth();
  const { worlds, createWorld, updateWorld, deleteWorld } = useWorlds();
  const [state, setState] = useState<AppState>(createNewState);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoadDone = useRef(false);

  // When worlds load, restore the last active world
  useEffect(() => {
    if (initialLoadDone.current || !user || worlds.length === 0) return;
    initialLoadDone.current = true;
    try {
      const lastId = localStorage.getItem(LAST_WORLD_STORAGE);
      const target = lastId ? worlds.find(w => w.id === lastId) : worlds[0];
      if (target) {
        setState(prev => ({
          ...prev,
          worldName: target.name,
          db: target.db,
          method: target.method,
          gallery: target.gallery,
          currentSaveId: target.id,
          currentFruit: 0,
        }));
      }
    } catch {}
  }, [worlds, user]);

  const setActiveTab = useCallback((tab: TabType) => setState(s => ({ ...s, activeTab: tab })), []);
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

  useEffect(() => {
    try {
      if (state.currentSaveId) localStorage.setItem(LAST_WORLD_STORAGE, state.currentSaveId);
      else localStorage.removeItem(LAST_WORLD_STORAGE);
    } catch {}
  }, [state.currentSaveId]);

  // Auto-save to database
  useEffect(() => {
    if (!state.currentSaveId || !user) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      updateWorld(state.currentSaveId, {
        name: state.worldName || 'Mundo Sem Nome',
        method: state.method,
        db: state.db,
        gallery: state.gallery,
      });
    }, 2000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [state.worldName, state.db, state.method, state.gallery, state.currentSaveId, user, updateWorld]);

  const handleCreateWorld = useCallback(async () => {
    if (!user) { toast.error('Faça login para criar um mundo'); return; }
    const record = await createWorld({ ...state, worldName: state.worldName || 'Mundo Sem Nome' } as AppState);
    if (record) {
      setState(s => ({ ...s, currentSaveId: record.id }));
      toast.success(`"${record.name}" criado com sucesso!`);
    }
  }, [user, state, createWorld]);

  const handleLoadWorld = useCallback((world: WorldRecord) => {
    setState(prev => ({
      ...prev,
      worldName: world.name,
      db: world.db,
      method: world.method,
      gallery: world.gallery,
      currentFruit: 0,
      currentSaveId: world.id,
      generatedPrompt: '',
      activeTab: 'construir',
    }));
    toast.success(`"${world.name}" carregado!`);
  }, []);

  const handleNewWorld = useCallback(() => {
    setState(createNewState());
    toast.info('Novo mundo criado!');
  }, []);

  const handleDeleteWorld = useCallback(async (id: string) => {
    await deleteWorld(id);
    if (state.currentSaveId === id) setState(createNewState());
  }, [deleteWorld, state.currentSaveId]);

  return (
    <div className="min-h-screen bg-background relative">
      <div className="fixed inset-0 pointer-events-none z-0" style={{ background: '#02070d' }} />
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[300px] left-1/2 -translate-x-1/2 w-[140%] h-[600px]" style={{ background: 'radial-gradient(ellipse 80% 100% at 50% 0%, rgba(43,74,108,0.08) 0%, transparent 60%)', filter: 'blur(80px)' }} />
        {/* Bottom rising particles */}
        <div className="particle-bottom" style={{ left: '12%', animationDelay: '0s', animationDuration: '18s' }} />
        <div className="particle-bottom" style={{ left: '35%', animationDelay: '4s', animationDuration: '22s' }} />
        <div className="particle-bottom" style={{ left: '58%', animationDelay: '8s', animationDuration: '20s' }} />
        <div className="particle-bottom" style={{ left: '78%', animationDelay: '2s', animationDuration: '24s' }} />
        <div className="particle-bottom" style={{ left: '90%', animationDelay: '10s', animationDuration: '19s' }} />
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
          onDeleteWorld={handleDeleteWorld}
          currentSaveId={state.currentSaveId}
          worlds={worlds}
        />

        <OnboardingBanner />
        <SubscriptionBanner />
        <TabNav activeTab={state.activeTab} setActiveTab={setActiveTab} />

        <main>
          {state.activeTab === 'construir' && <TabConstruir state={state} updateField={updateField} setCurrentFruit={setCurrentFruit} setMethod={setMethod} onNavigateCodex={() => setActiveTab('codex')} />}
          {state.activeTab === 'codex' && <TabCodex gallery={state.gallery} />}
          {state.activeTab === 'galeria' && <TabGaleria gallery={state.gallery} setGallery={setGallery} />}
          {state.activeTab === 'gerar-imagens' && <TabGerarImagens state={state} setGeneratedPrompt={setGeneratedPrompt} addToGallery={addToGallery} />}
        </main>

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
