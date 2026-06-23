import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Settings, ChevronDown, ChevronUp, Bug, Shield } from 'lucide-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { BugReportDialog } from '@/components/BugReportDialog';
import { FontSizeToggle } from '@/components/FontSizeToggle';

export const UserMenu: React.FC = () => {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchName = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data?.display_name) setDisplayName(data.display_name);
    };
    fetchName();
  }, [user]);

  if (!user) return null;

  return (
    <div className="flex flex-col items-center px-2 sm:px-4 mb-0 relative">
      <div className="inline-flex items-center justify-center gap-1.5 sm:gap-3 py-1 sm:py-1.5 px-3 sm:px-5 rounded-full bg-white/[0.04] border border-white/[0.06] backdrop-blur-sm">
        {/* Options button — always opens dropdown (font size + settings + admin) */}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Abrir opções"
          aria-expanded={menuOpen}
          className="inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-[10px] font-montserrat font-bold uppercase tracking-wider border border-blue-bright/25 text-blue-light/70 hover:text-blue-light hover:border-blue-bright/40 transition-colors"
        >
          <Settings className="w-3 h-3" aria-hidden="true" />
          <span className="hidden sm:inline">Opções</span>
          {menuOpen ? <ChevronUp className="w-2.5 h-2.5" aria-hidden="true" /> : <ChevronDown className="w-2.5 h-2.5" aria-hidden="true" />}
        </button>

        <span className="text-[11px] text-text-dim font-montserrat truncate max-w-[140px] sm:max-w-[200px]">
          {displayName || user.email}
        </span>

        <BugReportDialog
          trigger={
            <button
              title="Reportar problema"
              aria-label="Reportar problema"
              className="inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-[10px] font-montserrat font-bold uppercase tracking-wider border border-gold/30 text-gold-light/80 hover:text-gold-light hover:border-gold/50 transition-colors"
            >
              <Bug className="w-3 h-3" aria-hidden="true" />
              <span className="hidden sm:inline">Bug</span>
            </button>
          }
        />

        <ConfirmDialog
          trigger={
            <button className="px-2 sm:px-3 py-1 rounded-full text-[10px] font-montserrat font-bold uppercase tracking-wider border border-red-alert/40 text-red-alert hover:text-destructive-foreground hover:bg-red-alert/20 hover:border-red-alert/60 transition-colors">
              Sair
            </button>
          }
          title="Sair da conta"
          description="Tem certeza que deseja sair? Suas alterações recentes foram salvas automaticamente."
          confirmLabel="Sim, sair"
          cancelLabel="Cancelar"
          onConfirm={async () => {
            try { await signOut(); } finally { navigate('/login', { replace: true }); }
          }}
        />
      </div>

      {/* Options dropdown — disponível para todos: tamanho de fonte + configurações + (admin) */}
      {menuOpen && (
        <div className="absolute bottom-full mb-2 z-[60] animate-fadeUp rounded-lg border border-blue-bright/20 backdrop-blur-[16px] overflow-hidden min-w-[240px]" style={{ background: 'linear-gradient(135deg, hsl(211 76% 42% / 0.15) 0%, hsl(214 60% 3% / 0.95) 100%)' }}>
          <FontSizeToggle />
          <button
            onClick={() => { navigate('/settings'); setMenuOpen(false); }}
            className="w-full text-left px-4 py-2.5 text-[10px] font-montserrat font-bold uppercase tracking-wider text-blue-light/80 hover:text-blue-light hover:bg-blue-bright/[0.06] transition-all"
          >
            <><Settings className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} aria-hidden="true" />Configurações</>
          </button>
          {isAdmin && (
            <button
              onClick={() => { navigate('/admin'); setMenuOpen(false); }}
              className="w-full text-left px-4 py-2.5 text-[10px] font-montserrat font-bold uppercase tracking-wider text-gold-light/80 hover:text-gold-light hover:bg-gold/[0.08] transition-all border-t border-blue-bright/10"
            >
              <><Shield className="inline-block w-3.5 h-3.5 mr-1.5 align-[-0.15em]" strokeWidth={1.75} aria-hidden="true" />Painel do Administrador</>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
