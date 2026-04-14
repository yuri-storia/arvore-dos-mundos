import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Settings, LogOut, Shield, Map, BookOpen, Image, Plus, Trash2, ChevronRight, ChevronDown, PenLine, FileText } from 'lucide-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useManuscript, type Chapter, type Scene } from '@/hooks/useManuscript';
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

const TABS: { id: TabType; label: string; icon: React.ElementType; emoji: string }[] = [
  { id: 'construir', label: 'Construir', icon: Map, emoji: '🌿' },
  { id: 'codex', label: 'Codex', icon: BookOpen, emoji: '📖' },
  { id: 'escrever', label: 'Escrever', icon: PenLine, emoji: '✍️' },
  { id: 'galeria', label: 'Galeria', icon: Image, emoji: '🎨' },
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
                ✦ A Árvore dos Mundos ✦
              </span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <span className="font-cinzel text-[9px] text-blue-light/60">✦</span>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        {/* Worlds — NOW ON TOP */}
        <SidebarGroup>
          <SidebarGroupLabel className="font-montserrat text-[9px] uppercase tracking-widest text-text-dim">
            {collapsed ? '📂' : 'Meus Mundos'}
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
                        ? 'bg-blue-bright/15 text-blue-light border-l-2 border-blue-bright'
                        : 'text-text-dim hover:text-foreground hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className="text-base shrink-0">{tab.emoji}</span>
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

// ── Sub-component: chapters/scenes tree inside sidebar ──
const WorldChaptersTree: React.FC<{ worldId: string; setActiveTab: (t: TabType) => void }> = ({ worldId, setActiveTab }) => {
  const { chapters, scenes } = useManuscript(worldId);
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());

  const toggleChapter = (id: string) => {
    setExpandedChapters(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (chapters.length === 0) {
    return (
      <div className="ml-6 py-1">
        <p className="text-[9px] text-text-dim/40 font-montserrat italic">Nenhum capítulo ainda</p>
      </div>
    );
  }

  return (
    <div className="ml-4 py-0.5 border-l border-blue-bright/10 pl-2 space-y-0.5">
      {chapters.map(ch => (
        <button
          key={ch.id}
          onClick={() => setActiveTab('escrever')}
          className="flex items-center gap-1 w-full text-left py-0.5 text-[10px] text-text-dim hover:text-foreground transition-colors"
        >
          <BookOpen className="w-2.5 h-2.5 shrink-0 opacity-50" />
          <span className="truncate font-montserrat font-semibold">{ch.title}</span>
          <span className="ml-auto text-[8px] text-text-dim/30">{ch.word_count || 0}</span>
        </button>
      ))}
    </div>
  );
};
