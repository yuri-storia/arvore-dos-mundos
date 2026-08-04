import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Trees, Sparkles } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { SubscriptionBanner } from '@/components/SubscriptionBanner';
import { DropsCounterBadge } from '@/components/DropsCounterBadge';
import { OnboardingTips } from '@/components/OnboardingTips';
import { HelpDrawer } from '@/components/HelpDrawer';
import { AppSidebar } from '@/components/AppSidebar';
import { InteractiveTour, hasDoneTour, TOUR_STORAGE_KEY } from '@/components/InteractiveTour';
import { IdrielFirstMeeting } from '@/components/idriel/IdrielFirstMeeting';

import { WorldNameInput } from '@/components/WorldNameInput';
import { TabNav } from '@/components/TabNav';
import { WorldLoadingOverlay } from '@/components/WorldLoadingOverlay';
// Sprint 1 / P0 #3+#4: lazy-load tabs so o bundle inicial não inclui
// Tiptap, dicionário PT-BR, gerador de imagem etc. até serem necessários.
const TabConstruir = React.lazy(() => import('@/components/TabConstruir').then(m => ({ default: m.TabConstruir })));
const TabCodex     = React.lazy(() => import('@/components/TabCodex').then(m => ({ default: m.TabCodex })));
const TabGaleria   = React.lazy(() => import('@/components/TabGaleria').then(m => ({ default: m.TabGaleria })));
const TabEscrever  = React.lazy(() => import('@/components/TabEscrever').then(m => ({ default: m.TabEscrever })));

const TabFallback = () => (
  <div role="status" aria-label="Carregando aba" className="flex items-center justify-center py-24">
    <div className="h-8 w-8 rounded-full border-2 border-[hsl(var(--gold))] border-t-transparent animate-spin" />
  </div>
);
import { useWorlds, type WorldRecord } from '@/hooks/useWorlds';
import { useGalleryImages } from '@/hooks/useGalleryImages';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import type { AppState, TabType, MethodType, GalleryImage } from '@/lib/data';
import { usePlanLimits } from '@/hooks/usePlanLimits';

const LAST_WORLD_STORAGE = 'adm_last_world';
const LAST_TAB_STORAGE = 'adm_last_tab';
const APP_TABS: TabType[] = ['construir', 'codex', 'galeria', 'escrever'];

const getStoredActiveTab = (): TabType => {
  try {
    const stored = localStorage.getItem(LAST_TAB_STORAGE) as TabType | null;
    return stored && APP_TABS.includes(stored) ? stored : 'construir';
  } catch {
    return 'construir';
  }
};

const createNewState = (activeTab: TabType = 'construir'): AppState => ({
  worldName: '',
  db: {},
  currentFruit: 0,
  method: 'top-down',
  gallery: [],
  folderCovers: {},
  activeTab,
  apiKey: '',
  generatedPrompt: '',
  currentSaveId: '',
});

const Index = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { worlds, createWorld, updateWorld, deleteWorld, loadWorldFull } = useWorlds();
  const planLimits = usePlanLimits();
  const [state, setState] = useState<AppState>(() => createNewState(getStoredActiveTab()));
  const [tourActive, setTourActive] = useState(false);
  const [showTourPrompt, setShowTourPrompt] = useState(false);
  const [worldLoading, setWorldLoading] = useState<{ name: string } | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoadDone = useRef(false);

  // Nova arquitetura de galeria: cada imagem é uma linha em `gallery_images`.
  // Persistência atômica e cross-device, sem depender de debounce/JSONB.
  const galleryStore = useGalleryImages(state.currentSaveId || undefined);
  const gallery = galleryStore.gallery;

  // Espelha a galeria do servidor no AppState para componentes legados que ainda
  // leem `state.gallery` (ex: TabConstruir, referências visuais). Sem writes.
  useEffect(() => {
    setState(s => (s.gallery === gallery ? s : { ...s, gallery }));
  }, [gallery]);

  // Tutorial só começa depois que Idriel souber o nome do criador.
  const handleIntroResolved = useCallback((needsIntro: boolean) => {
    if (!needsIntro && !hasDoneTour()) setTourActive(true);
  }, []);
  const handleIntroComplete = useCallback(() => setTourActive(true), []);

  // Allow other components (e.g. HelpDrawer) to start the tour on demand
  useEffect(() => {
    const handler = () => setTourActive(true);
    window.addEventListener('adm:start-tour', handler);
    return () => window.removeEventListener('adm:start-tour', handler);
  }, []);


  // When worlds load, restore the last active world
  useEffect(() => {
    if (initialLoadDone.current || !user || worlds.length === 0) return;
    initialLoadDone.current = true;
    (async () => {
      try {
        const lastId = localStorage.getItem(LAST_WORLD_STORAGE);
        const target = lastId ? worlds.find(w => w.id === lastId) : worlds[0];
        if (!target) return;
        setWorldLoading({ name: target.name });
        const full = await loadWorldFull(target.id);
        const data = full || target;
        setState(prev => ({
          ...prev,
          worldName: data.name,
          db: data.db,
          method: data.method,
          gallery: [],
          folderCovers: data.folderCovers || {},
          currentSaveId: data.id,
          currentFruit: 0,
        }));
      } catch {
        // Local storage may be unavailable in restricted browser modes.
      } finally {
        setTimeout(() => setWorldLoading(null), 250);
      }
    })();
  }, [worlds, user, loadWorldFull]);

  const setActiveTab = useCallback((tab: TabType) => setState(s => ({ ...s, activeTab: tab })), []);
  const setWorldName = useCallback((worldName: string) => setState(s => ({ ...s, worldName })), []);
  const setCurrentFruit = useCallback((currentFruit: number) => setState(s => ({ ...s, currentFruit })), []);
  const setMethod = useCallback((method: MethodType) => setState(s => ({ ...s, method })), []);
  const setFolderCovers = useCallback((folderCovers: Record<number, string>) => setState(s => ({ ...s, folderCovers })), []);
  const setGeneratedPrompt = useCallback((generatedPrompt: string) => setState(s => ({ ...s, generatedPrompt })), []);

  // Wrappers de compatibilidade: agora escrevem direto na tabela `gallery_images`
  // (persistência imediata, cross-device).
  const setGallery = useCallback((next: GalleryImage[]) => { void galleryStore.replaceAll(next); }, [galleryStore]);
  const addToGallery = useCallback((img: GalleryImage) => {
    void galleryStore.addOne({ src: img.src, name: img.name, cat: img.cat, status: img.status });
  }, [galleryStore]);

  const updateField = useCallback((fruitId: number, fieldId: string, value: string) => {
    setState(s => ({
      ...s,
      db: { ...s.db, [fruitId]: { ...(s.db[fruitId] || {}), [fieldId]: value } },
    }));
  }, []);

  useEffect(() => {
    try {
      if (state.currentSaveId) localStorage.setItem(LAST_WORLD_STORAGE, state.currentSaveId);
      else localStorage.removeItem(LAST_WORLD_STORAGE);
    } catch {
      // Local storage may be unavailable in restricted browser modes.
    }
  }, [state.currentSaveId]);

  useEffect(() => {
    try {
      localStorage.setItem(LAST_TAB_STORAGE, state.activeTab);
    } catch {
      // Local storage may be unavailable in restricted browser modes.
    }
  }, [state.activeTab]);

  // Auto-save principal (nome/método/db) — debounce 2s (mudanças são por keystroke)
  useEffect(() => {
    if (!state.currentSaveId || !user) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      updateWorld(state.currentSaveId, {
        name: state.worldName || 'Mundo Sem Nome',
        method: state.method,
        db: state.db,
      });
    }, 2000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [state.worldName, state.db, state.method, state.currentSaveId, user, updateWorld]);

  // Capas de pasta ainda vivem em worlds.folder_covers (payload pequeno; ~10 URLs).
  // Escrita direta e imediata quando o usuário troca a capa.
  useEffect(() => {
    if (!state.currentSaveId || !user) return;
    const t = setTimeout(() => {
      updateWorld(state.currentSaveId, { folderCovers: state.folderCovers });
    }, 300);
    return () => clearTimeout(t);
  }, [state.folderCovers, state.currentSaveId, user, updateWorld]);

  // Flush síncrono ao fechar a aba / navegar: garante o autosave principal
  // (galeria já foi persistida imediatamente pelo hook).
  useEffect(() => {
    const flush = () => {
      if (!state.currentSaveId || !user) return;
      if (autoSaveTimer.current) { clearTimeout(autoSaveTimer.current); autoSaveTimer.current = null; }
      updateWorld(state.currentSaveId, {
        name: state.worldName || 'Mundo Sem Nome',
        method: state.method,
        db: state.db,
        folderCovers: state.folderCovers,
      });
    };
    window.addEventListener('beforeunload', flush);
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('beforeunload', flush);
      window.removeEventListener('pagehide', flush);
    };
  }, [state, user, updateWorld]);

  const handleCreateWorld = useCallback(async () => {
    if (!user) { toast.error('Faça login para criar um mundo'); return; }
    if (planLimits.isExpired) {
      toast.error('Sua assinatura expirou. Seus Mundos ficam preservados, mas para criar um novo é preciso reativar o plano.');
      return;
    }
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

  const handleLoadWorld = useCallback(async (world: WorldRecord) => {
    if (world.id === state.currentSaveId) return;
    // Flush pendentes do mundo atual (galeria já persiste imediatamente).
    if (state.currentSaveId && user) {
      if (autoSaveTimer.current) { clearTimeout(autoSaveTimer.current); autoSaveTimer.current = null; }
      try {
        await updateWorld(state.currentSaveId, {
          name: state.worldName || 'Mundo Sem Nome',
          method: state.method,
          db: state.db,
          folderCovers: state.folderCovers,
        });
      } catch { /* segue com o load mesmo se falhar */ }
    }
    setWorldLoading({ name: world.name });
    try {
      const needsFull = !world.db || Object.keys(world.db).length === 0;
      const full = needsFull ? await loadWorldFull(world.id) : world;
      const data = full || world;
      setState(prev => ({
        ...prev,
        worldName: data.name,
        db: data.db,
        method: data.method,
        gallery: [],
        folderCovers: (data as any).folderCovers || {},
        currentFruit: 0,
        currentSaveId: data.id,
        generatedPrompt: '',
        activeTab: 'construir',
      }));
      toast.success(`"${data.name}" carregado!`);
    } finally {
      setTimeout(() => setWorldLoading(null), 250);
    }
  }, [loadWorldFull, state, user, updateWorld]);



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

        {/* Na aba Construir o Elixir vive dentro da faixa compacta do Estúdio. */}
        {state.activeTab !== 'construir' && <DropsCounterBadge />}

        <SubscriptionBanner />
        <TabNav activeTab={state.activeTab} setActiveTab={setActiveTab} />
        {!tourActive && <OnboardingTips tab={state.activeTab} />}
        <HelpDrawer tab={state.activeTab} />
        <IdrielFirstMeeting onResolved={handleIntroResolved} onComplete={handleIntroComplete} />

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
          <React.Suspense fallback={<TabFallback />}>
            {state.activeTab === 'construir' && <TabConstruir state={state} updateField={updateField} setCurrentFruit={setCurrentFruit} setMethod={setMethod} onNavigateCodex={() => setActiveTab('codex')} addToGallery={addToGallery} />}
            {state.activeTab === 'codex' && <TabCodex gallery={gallery} worldId={state.currentSaveId} worlds={worlds} />}
            {state.activeTab === 'escrever' && <TabEscrever worldId={state.currentSaveId} worlds={worlds} />}
            {state.activeTab === 'galeria' && <TabGaleria gallery={gallery} setGallery={setGallery} folderCovers={state.folderCovers} setFolderCovers={setFolderCovers} state={state} setGeneratedPrompt={setGeneratedPrompt} addToGallery={addToGallery} />}
          </React.Suspense>
        </main>

        <footer className={`text-center py-8 opacity-40 ${isMobile ? 'pb-24' : 'pb-8'}`}>
          <p className="text-[10px] text-text-dim font-montserrat uppercase tracking-[0.2em]">
            A Árvore dos Mundos · Template com IA · Universo STORIA
          </p>
        </footer>
      </div>
      <WorldLoadingOverlay active={!!worldLoading} worldName={worldLoading?.name} />
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
