import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Trees, Sparkles } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { SubscriptionBanner } from '@/components/SubscriptionBanner';
import { OnboardingTips } from '@/components/OnboardingTips';
import { HelpDrawer } from '@/components/HelpDrawer';
import { AppSidebar } from '@/components/AppSidebar';
import { InteractiveTour, hasDoneTour, TOUR_STORAGE_KEY } from '@/components/InteractiveTour';

import { WorldNameInput } from '@/components/WorldNameInput';
import { TabNav } from '@/components/TabNav';
import { TabConstruir } from '@/components/TabConstruir';
import { TabCodex } from '@/components/TabCodex';
import { TabGaleria } from '@/components/TabGaleria';
import { TabEscrever } from '@/components/TabEscrever';
import { useWorlds, type WorldRecord } from '@/hooks/useWorlds';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import type { AppState, TabType, MethodType, GalleryImage } from '@/lib/data';
import { usePlanLimits } from '@/hooks/usePlanLimits';

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
  const isMobile = useIsMobile();
  const { worlds, createWorld, updateWorld, deleteWorld } = useWorlds();
  const planLimits = usePlanLimits();
  const [state, setState] = useState<AppState>(createNewState);
  const [tourActive, setTourActive] = useState(false);
  const [showTourPrompt, setShowTourPrompt] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoadDone = useRef(false);

  // First-time tour trigger
  useEffect(() => {
    if (user && !hasDoneTour()) {
      setTourActive(true);
    }
  }, [user]);

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
    if (worlds.length >= planLimits.maxWorlds) {
      toast.error(`O plano ${planLimits.planLabel} permite apenas ${planLimits.maxWorlds} mundo. Faça upgrade para criar mais!`);
      return;
    }
    const record = await createWorld({ ...state, worldName: state.worldName || 'Mundo Sem Nome' } as AppState);
    if (record) {
      setState(s => ({ ...s, currentSaveId: record.id }));
      toast.success(`"${record.name}" criado com sucesso!`);
      setShowTourPrompt(true);
    }
  }, [user, state, createWorld, worlds.length, planLimits]);

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
  }, []);

  const handleDeleteWorld = useCallback(async (id: string) => {
    await deleteWorld(id);
    if (state.currentSaveId === id) setState(createNewState());
  }, [deleteWorld, state.currentSaveId]);

  const mainContent = (
    <>
      <div className="fixed inset-0 pointer-events-none z-0" style={{ background: '#02070d' }} />
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[300px] left-1/2 -translate-x-1/2 w-[140%] h-[600px]" style={{ background: 'radial-gradient(ellipse 80% 100% at 50% 0%, rgba(43,74,108,0.08) 0%, transparent 60%)', filter: 'blur(80px)' }} />
        <div className="particle-bottom" style={{ left: '12%', animationDelay: '0s', animationDuration: '18s' }} />
        <div className="particle-bottom" style={{ left: '35%', animationDelay: '4s', animationDuration: '22s' }} />
        <div className="particle-bottom" style={{ left: '58%', animationDelay: '8s', animationDuration: '20s' }} />
        <div className="particle-bottom" style={{ left: '78%', animationDelay: '2s', animationDuration: '24s' }} />
        <div className="particle-bottom" style={{ left: '90%', animationDelay: '10s', animationDuration: '19s' }} />
      </div>

      <div className="relative z-10">
        <AppHeader worldName={state.worldName} setWorldName={setWorldName} onCreateWorld={handleCreateWorld} method={state.method} currentSaveId={state.currentSaveId} db={state.db} worlds={worlds} onLoadWorld={handleLoadWorld} onNewWorld={handleNewWorld} onDeleteWorld={handleDeleteWorld} />

        <DropsCounterBadge />

        <SubscriptionBanner />
        <TabNav activeTab={state.activeTab} setActiveTab={setActiveTab} />
        {!tourActive && <OnboardingTips tab={state.activeTab} />}
        <HelpDrawer tab={state.activeTab} />

        {/* Interactive Tour */}
        <InteractiveTour active={tourActive} onFinish={() => setTourActive(false)} setActiveTab={setActiveTab} setCurrentFruit={setCurrentFruit} setMethod={setMethod} />

        {/* Tour prompt after creating world */}
        {showTourPrompt && !tourActive && (
          <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-background/60 backdrop-blur-[3px]" onClick={() => setShowTourPrompt(false)}>
            <div className="card-glass-idriel rounded-2xl p-6 w-[92vw] max-w-[400px] text-center" onClick={e => e.stopPropagation()}>
              <Trees className="w-12 h-12 mx-auto mb-3 text-gold-champagne" strokeWidth={1.5} />
              <h3 className="font-cinzel font-bold text-lg text-foreground mb-2">Mundo criado, viajante!</h3>
              <p className="font-merriweather italic text-sm text-text-secondary mb-5 leading-relaxed">
                Deseja que eu, Idriel, lhe mostre os caminhos desta Árvore? Posso guiá-lo(a) pelas ferramentas com graciosidade.
              </p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setShowTourPrompt(false)}
                  className="px-4 py-2 rounded-lg text-xs font-montserrat font-bold text-text-dim border border-blue-bright/15 hover:bg-white/[0.04] transition-all">
                  Explorar por conta própria
                </button>
                <button onClick={() => { setShowTourPrompt(false); setTourActive(true); }}
                  className="px-4 py-2 rounded-lg text-xs font-montserrat font-bold text-background bg-idriel-light hover:bg-idriel-glow transition-all shadow-md shadow-idriel/20">
                  <><Sparkles className="inline-block w-4 h-4 mr-1.5 align-[-0.2em]" strokeWidth={1.75} />Guie-me, Idriel!</>
                </button>
              </div>
            </div>
          </div>
        )}

        <main>
          {state.activeTab === 'construir' && <TabConstruir state={state} updateField={updateField} setCurrentFruit={setCurrentFruit} setMethod={setMethod} onNavigateCodex={() => setActiveTab('codex')} />}
          {state.activeTab === 'codex' && <TabCodex gallery={state.gallery} worldId={state.currentSaveId} worlds={worlds} />}
          {state.activeTab === 'escrever' && <TabEscrever worldId={state.currentSaveId} worlds={worlds} />}
          {state.activeTab === 'galeria' && <TabGaleria gallery={state.gallery} setGallery={setGallery} state={state} setGeneratedPrompt={setGeneratedPrompt} addToGallery={addToGallery} />}
        </main>

        <footer className={`text-center py-8 opacity-40 ${isMobile ? 'pb-24' : 'pb-8'}`}>
          <p className="text-[10px] text-text-dim font-montserrat uppercase tracking-[0.2em]">
            A Árvore dos Mundos · Template com IA · Universo STORIA
          </p>
        </footer>
      </div>
    </>
  );

  // Mobile: no sidebar, just bottom bar
  if (isMobile) {
    return (
      <div className="min-h-screen bg-background relative">
        {mainContent}
      </div>
    );
  }

  // Desktop: sidebar layout
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background relative">
        <AppSidebar
          activeTab={state.activeTab}
          setActiveTab={setActiveTab}
          worlds={worlds}
          currentSaveId={state.currentSaveId}
          onLoadWorld={handleLoadWorld}
          onNewWorld={handleNewWorld}
          onDeleteWorld={handleDeleteWorld}
        />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Sidebar trigger */}
          <div className="sticky top-0 z-[50] flex items-center h-10 px-2 bg-[#02070d]/80 backdrop-blur-sm border-b border-blue-bright/5">
            <SidebarTrigger className="text-text-dim hover:text-foreground" />
            {state.currentSaveId && (
              <span className="ml-3 font-cinzel text-xs text-blue-light/50 truncate">
                {state.worldName || 'Mundo Sem Nome'}
              </span>
            )}
          </div>
          <div className="flex-1 overflow-auto">
            {mainContent}
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;
