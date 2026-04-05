import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Settings, LogOut, Shield, Map, BookOpen, Image, Sparkles, Plus, Trash2, ChevronRight, PenLine } from 'lucide-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
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
  { id: 'gerar-imagens', label: 'Gerar Imagens', icon: Sparkles, emoji: '✨' },
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
  const [confirmDelete, setConfirmDelete] = React.useState<string | null>(null);

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

  const handleDelete = (id: string) => {
    if (confirmDelete === id) {
      onDeleteWorld(id);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(id);
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-blue-bright/10 bg-transparent">
      <SidebarHeader className="p-3">
        {!collapsed && (
          <div className="flex items-center gap-2 px-1">
            <span className="text-lg">🌳</span>
            <span className="font-cinzel font-bold text-sm text-foreground leading-tight">
              Árvore dos Mundos
            </span>
          </div>
        )}
        {collapsed && (
          <div className="flex justify-center">
            <span className="text-lg">🌳</span>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        {/* Navigation tabs */}
        <SidebarGroup>
          <SidebarGroupLabel className="font-montserrat text-[9px] uppercase tracking-widest text-text-dim">
            Navegação
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {TABS.map(tab => (
                <SidebarMenuItem key={tab.id}>
                  <SidebarMenuButton
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

        <SidebarSeparator className="bg-blue-bright/10" />

        {/* Worlds */}
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
                  <div className="flex items-center w-full group">
                    <SidebarMenuButton
                      isActive={currentSaveId === world.id}
                      onClick={() => onLoadWorld(world)}
                      className={`flex-1 min-w-0 ${
                        currentSaveId === world.id
                          ? 'bg-gold/[0.08] text-gold-light'
                          : 'text-text-dim hover:text-foreground hover:bg-white/[0.03]'
                      }`}
                    >
                      <ChevronRight className={`w-3 h-3 shrink-0 transition-transform ${currentSaveId === world.id ? 'text-gold rotate-90' : ''}`} />
                      <span className="font-merriweather text-xs truncate">{world.name}</span>
                    </SidebarMenuButton>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(world.id); }}
                      className={`shrink-0 w-6 h-6 flex items-center justify-center rounded transition-all ${
                        confirmDelete === world.id
                          ? 'text-red-alert bg-red-alert/20'
                          : 'text-transparent group-hover:text-text-dim/50 hover:!text-red-alert'
                      }`}
                      title={confirmDelete === world.id ? 'Clique novamente para confirmar' : 'Excluir'}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
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
            <SidebarMenuButton
              onClick={async () => {
                try { await signOut(); } finally { navigate('/login', { replace: true }); }
              }}
              tooltip="Sair"
              className="text-red-alert/60 hover:text-red-alert hover:bg-red-alert/[0.08]"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="font-montserrat text-[10px] uppercase tracking-wider">Sair</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};
