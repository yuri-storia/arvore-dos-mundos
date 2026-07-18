import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Settings, LogOut, Shield, Map, BookOpen, Image, Plus, Trash2, ChevronRight, ChevronDown, PenLine, FileText, Sparkles, FolderOpen, BookMarked } from 'lucide-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useManuscript, type Chapter, type Scene, type Manuscript } from '@/hooks/useManuscript';
import type { TabType } from '@/lib/data';
import type { WorldRecord } from '@/hooks/useWorlds';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';

const TABS: { id: TabType; label: string; icon: React.ElementType }[] = [
  { id: 'construir', label: 'Construir', icon: Map },
  { id: 'codex', label: 'Codex', icon: BookOpen },
  { id: 'escrever', label: 'Escrever', icon: PenLine },
  { id: 'galeria', label: 'Galeria', icon: Image },
];

interface Props {
  activeTab: TabType;
  setActiveTab: (t: TabType) => void;
  worlds: WorldRecord[];
  currentSaveId: string;
  onLoadWorld: (world: WorldRecord) => void;
  onNewWorld: () => void;
  onDeleteWorld: (id: string) => void;
}

export const AppSidebar: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  worlds,
  currentSaveId,
  onLoadWorld,
  onNewWorld,
  onDeleteWorld,
}) => {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const { state: sidebarState } = useSidebar();
  const collapsed = sidebarState === 'collapsed';

  const [displayName, setDisplayName] = React.useState<string | null>(null);
  const [expandedWorlds, setExpandedWorlds] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.display_name) setDisplayName(data.display_name);
      });
  }, [user]);

  const toggleWorld = (id: string) => {
    setExpandedWorlds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-blue-bright/10 bg-transparent">
      <SidebarHeader className="p-3">
        {!collapsed ? (
          <div className="flex items-center justify-center px-1">
            <div className="inline-block px-3 py-1 rounded-full border border-blue-bright/15 bg-blue-bright/[0.04] backdrop-blur-sm">
              <span className="font-cinzel text-[9px] tracking-[0.18em] text-blue-light/60 uppercase">
                A Árvore dos Mundos
              </span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <Sparkles className="w-3 h-3 text-blue-light/60" strokeWidth={1.5} />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        {/* Worlds — NOW ON TOP */}
        <SidebarGroup>
          <SidebarGroupLabel className="font-montserrat text-[9px] uppercase tracking-widest text-text-dim">
            {collapsed ? <FolderOpen className="w-4 h-4 mx-auto" strokeWidth={1.75} /> : 'Meus Mundos'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={onNewWorld}
                  tooltip="Novo Mundo"
                  className="text-gold-light/70 hover:text-gold-light hover:bg-gold/[0.06] transition-all"
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  {!collapsed && (
                    <span className="font-montserrat font-bold text-[10px] uppercase tracking-wider">
                      Novo Mundo
                    </span>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>

              {!collapsed && worlds.map(world => (
                <SidebarMenuItem key={world.id}>
                  <div className="flex flex-col w-full">
                    <div className="flex items-center w-full group">
                      <button
                        onClick={() => toggleWorld(world.id)}
                        className="p-0.5 text-text-dim hover:text-foreground shrink-0"
                      >
                        {expandedWorlds.has(world.id) ? (
                          <ChevronDown className="w-3 h-3" />
                        ) : (
                          <ChevronRight className="w-3 h-3" />
                        )}
                      </button>
                      <SidebarMenuButton
                        isActive={currentSaveId === world.id}
                        onClick={() => onLoadWorld(world)}
                        className={`flex-1 min-w-0 ${
                          currentSaveId === world.id
                            ? 'bg-gold/[0.08] text-gold-light'
                            : 'text-text-dim hover:text-foreground hover:bg-white/[0.03]'
                        }`}
                      >
                        <span className="font-merriweather text-xs truncate">{world.name}</span>
                      </SidebarMenuButton>
                      <ConfirmDialog
                        trigger={
                          <button
                            onClick={(e) => e.stopPropagation()}
                            className="shrink-0 w-6 h-6 flex items-center justify-center rounded transition-all text-transparent group-hover:text-text-dim/50 hover:!text-red-alert"
                            title="Excluir"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        }
                        title="Excluir mundo"
                        description={`Tem certeza que deseja excluir "${world.name}"? Todos os dados deste mundo serão perdidos permanentemente.`}
                        confirmLabel="Excluir"
                        cancelLabel="Cancelar"
                        onConfirm={() => onDeleteWorld(world.id)}
                      />
                    </div>
                    {/* Expandable chapters/scenes */}
                    {expandedWorlds.has(world.id) && currentSaveId === world.id && (
                      <WorldChaptersTree worldId={world.id} setActiveTab={setActiveTab} />
                    )}
                  </div>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="bg-blue-bright/10" />

        {/* Navigation tabs — NOW BELOW */}
        <SidebarGroup>
          <SidebarGroupLabel className="font-montserrat text-[9px] uppercase tracking-widest text-text-dim">
            Navegação
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {TABS.map(tab => (
                <SidebarMenuItem key={tab.id}>
                  <SidebarMenuButton
                    data-tour={`tab-${tab.id}`}
                    isActive={activeTab === tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    tooltip={tab.label}
                    className={`transition-all ${
                      activeTab === tab.id
                        ? 'text-[#1a0f00] border-l-2 border-gold-champagne shadow-[inset_0_1px_0_hsl(42_60%_96%/0.4)]'
                        : 'text-text-secondary hover:text-gold-cream hover:bg-gold-deep/20'
                    }`}
                    style={
                      activeTab === tab.id
                        ? {
                            background:
                              'linear-gradient(135deg, hsl(42 55% 90%) 0%, hsl(40 50% 78%) 45%, hsl(34 42% 58%) 100%)',
                          }
                        : undefined
                    }
                  >
                    <tab.icon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                    {!collapsed && (
                      <span className="font-montserrat font-bold text-xs uppercase tracking-wider">
                        {tab.label}
                      </span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <SidebarMenu>
          {isAdmin && (
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => navigate('/admin')}
                tooltip="Admin"
                className="text-gold-light/60 hover:text-gold-light hover:bg-gold/[0.06]"
              >
                <Shield className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="font-montserrat text-[10px] uppercase tracking-wider">Admin</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => navigate('/settings')}
              tooltip="Configurações"
              className="text-text-dim hover:text-foreground hover:bg-white/[0.04]"
            >
              <Settings className="w-4 h-4 shrink-0" />
              {!collapsed && (
                <div className="flex flex-col min-w-0">
                  <span className="font-montserrat text-[10px] uppercase tracking-wider">Configurações</span>
                  <span className="text-[9px] text-text-dim truncate">{displayName || user?.email}</span>
                </div>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <ConfirmDialog
              trigger={
                <SidebarMenuButton
                  tooltip="Sair"
                  className="text-red-alert/60 hover:text-red-alert hover:bg-red-alert/[0.08]"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  {!collapsed && <span className="font-montserrat text-[10px] uppercase tracking-wider">Sair</span>}
                </SidebarMenuButton>
              }
              title="Sair da conta"
              description="Tem certeza que deseja sair? Suas alterações recentes foram salvas automaticamente."
              confirmLabel="Sim, sair"
              cancelLabel="Cancelar"
              onConfirm={async () => {
                try { await signOut(); } finally { navigate('/login', { replace: true }); }
              }}
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

// ── Sub-component: manuscripts tree inside sidebar (World → Manuscripts → Chapters) ──
const WorldChaptersTree: React.FC<{ worldId: string; setActiveTab: (t: TabType) => void }> = ({ worldId, setActiveTab }) => {
  const [manuscripts, setManuscripts] = React.useState<Manuscript[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

  const fetchManuscripts = React.useCallback(async () => {
    const { data } = await supabase
      .from('manuscripts')
      .select('*')
      .eq('world_id', worldId)
      .order('created_at', { ascending: true });
    setManuscripts((data || []) as Manuscript[]);
    setLoading(false);
  }, [worldId]);

  React.useEffect(() => { fetchManuscripts(); }, [fetchManuscripts]);

  React.useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || detail.worldId === worldId) fetchManuscripts();
    };
    const onRenamed = (e: Event) => {
      const detail = (e as CustomEvent).detail as { id: string; title: string } | undefined;
      if (!detail) return;
      setManuscripts(prev => prev.map(m => m.id === detail.id ? { ...m, title: detail.title } : m));
    };
    window.addEventListener('adm:manuscripts-changed', onChange);
    window.addEventListener('adm:manuscript-renamed', onRenamed);
    return () => {
      window.removeEventListener('adm:manuscripts-changed', onChange);
      window.removeEventListener('adm:manuscript-renamed', onRenamed);
    };
  }, [worldId, fetchManuscripts]);

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleDeleteManuscript = async (id: string) => {
    const { error } = await supabase.from('manuscripts').delete().eq('id', id);
    if (error) {
      const { toast } = await import('sonner');
      toast.error('Erro ao excluir manuscrito');
      return;
    }
    setManuscripts(prev => prev.filter(m => m.id !== id));
    try { window.dispatchEvent(new CustomEvent('adm:manuscripts-changed', { detail: { worldId } })); } catch {}
    const { toast } = await import('sonner');
    toast.success('Manuscrito excluído');
  };

  if (loading) {
    return (
      <div className="ml-6 py-1">
        <p className="text-[9px] text-text-dim/40 font-montserrat italic">Carregando…</p>
      </div>
    );
  }

  if (manuscripts.length === 0) {
    return (
      <div className="ml-6 py-1">
        <p className="text-[9px] text-text-dim/40 font-montserrat italic">Nenhum manuscrito ainda</p>
      </div>
    );
  }

  return (
    <div className="ml-4 py-0.5 border-l border-blue-bright/10 pl-2 space-y-0.5">
      {manuscripts.map(m => {
        const isOpen = expanded.has(m.id);
        return (
          <div key={m.id}>
            <div className="flex items-center gap-1 w-full group">
              <button
                onClick={() => toggle(m.id)}
                className="p-0.5 text-text-dim hover:text-foreground shrink-0"
                aria-label={isOpen ? 'Recolher manuscrito' : 'Expandir manuscrito'}
              >
                {isOpen ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
              </button>
              <button
                onClick={() => {
                  const detail = { manuscriptId: m.id };
                  try { sessionStorage.setItem('adm:pending-open', JSON.stringify(detail)); } catch {}
                  setActiveTab('escrever');
                  setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('adm:open-manuscript', { detail }));
                  }, 0);
                }}
                className="flex items-center gap-1 flex-1 min-w-0 text-left py-0.5 text-[10px] text-blue-light/80 hover:text-blue-light transition-colors"
                title={m.title}
              >
                <BookMarked className="w-2.5 h-2.5 shrink-0 opacity-60" />
                <span className="truncate font-cinzel font-bold">{m.title}</span>
              </button>
              <ConfirmDialog
                trigger={
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0 w-5 h-5 flex items-center justify-center rounded transition-all text-transparent group-hover:text-text-dim/50 hover:!text-red-alert"
                    title="Excluir manuscrito"
                    aria-label="Excluir manuscrito"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                }
                title="Excluir manuscrito"
                description={`Tem certeza que deseja excluir o manuscrito completo "${m.title}"? Todos os capítulos e conteúdo serão perdidos permanentemente.`}
                confirmLabel="Excluir manuscrito"
                cancelLabel="Cancelar"
                onConfirm={() => handleDeleteManuscript(m.id)}
              />
            </div>
            {isOpen && <ManuscriptChaptersList manuscriptId={m.id} setActiveTab={setActiveTab} />}
          </div>
        );
      })}
    </div>
  );
};

// ── Sub-component: chapters under a manuscript (lazy fetch on expand) ──
const ManuscriptChaptersList: React.FC<{ manuscriptId: string; setActiveTab: (t: TabType) => void }> = ({ manuscriptId, setActiveTab }) => {
  const [chapters, setChapters] = React.useState<Chapter[] | null>(null);

  const fetchChapters = React.useCallback(async () => {
    const { data } = await supabase
      .from('chapters')
      .select('id, manuscript_id, title, word_count, sort_order')
      .eq('manuscript_id', manuscriptId)
      .order('sort_order', { ascending: true });
    setChapters((data || []) as Chapter[]);
  }, [manuscriptId]);

  React.useEffect(() => { fetchChapters(); }, [fetchChapters]);

  React.useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || detail.manuscriptId === manuscriptId) fetchChapters();
    };
    window.addEventListener('adm:chapters-changed', onChange);
    return () => window.removeEventListener('adm:chapters-changed', onChange);
  }, [manuscriptId, fetchChapters]);

  if (chapters === null) {
    return (
      <div className="ml-5 py-0.5">
        <p className="text-[9px] text-text-dim/40 font-montserrat italic">Carregando…</p>
      </div>
    );
  }

  if (chapters.length === 0) {
    return (
      <div className="ml-5 py-0.5">
        <p className="text-[9px] text-text-dim/40 font-montserrat italic">Sem capítulos</p>
      </div>
    );
  }

  return (
    <div className="ml-3 mt-0.5 mb-1 border-l border-blue-bright/10 pl-2 space-y-0.5">
      {chapters.map(ch => (
        <button
          key={ch.id}
          onClick={() => {
            const detail = { manuscriptId: ch.manuscript_id, chapterId: ch.id };
            try { sessionStorage.setItem('adm:pending-open', JSON.stringify(detail)); } catch {}
            setActiveTab('escrever');
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('adm:open-manuscript', { detail }));
            }, 0);
          }}
          className="flex items-center gap-1 w-full text-left py-0.5 text-[10px] text-text-dim hover:text-foreground transition-colors"
          title={ch.title}
        >
          <BookOpen className="w-2.5 h-2.5 shrink-0 opacity-50" />
          <span className="truncate font-montserrat font-semibold">{ch.title}</span>
          <span className="ml-auto text-[8px] text-text-dim/30">{ch.word_count || 0}</span>
        </button>
      ))}
    </div>
  );
};

