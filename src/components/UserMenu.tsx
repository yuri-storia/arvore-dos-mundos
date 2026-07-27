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

  const displayLabel = displayName || user.email || 'Viajante';
  const initial = (displayLabel[0] || 'V').toUpperCase();

  return (
    <div className="relative w-full max-w-[440px] mx-auto px-3 animate-[fade-in_0.5s_ease-out]">
      {/* Card com moldura dourada sutil e halo */}
      <div
        className="relative p-[1px] rounded-2xl transition-shadow duration-500 hover:shadow-[0_0_28px_hsl(var(--gold)/0.18)]"
        style={{ background: 'linear-gradient(140deg, hsl(var(--gold) / 0.45) 0%, hsl(var(--gold) / 0.08) 40%, transparent 70%, hsl(var(--gold) / 0.15) 100%)' }}
      >
        <div
          className="rounded-[15px] px-5 py-4 backdrop-blur-2xl border border-white/[0.06]"
          style={{
            background:
              'radial-gradient(120% 140% at 50% -20%, hsl(211 76% 42% / 0.12) 0%, transparent 55%), linear-gradient(180deg, hsl(214 60% 6% / 0.72) 0%, hsl(214 60% 3% / 0.62) 100%)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), inset 0 -1px 0 rgba(0,0,0,0.4)',
          }}
        >
          {/* Identidade do viajante */}
          <div className="flex items-center justify-center gap-2.5 mb-3.5">
            <div
              className="w-7 h-7 rounded-full border border-gold/45 flex items-center justify-center shrink-0 shadow-[0_0_10px_hsl(var(--gold)/0.25)]"
              style={{ background: 'radial-gradient(circle at 30% 30%, hsl(var(--gold) / 0.35), hsl(var(--gold) / 0.05))' }}
            >
              <span className="font-cinzel font-bold text-[12px] text-gold-light leading-none">{initial}</span>
            </div>
            <span className="text-[12px] font-montserrat text-foreground/85 truncate max-w-[260px] tracking-wide">
              {displayLabel}
            </span>
          </div>

          {/* Divisor ornamental */}
          <div
            className="h-px w-full mb-3.5"
            style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--gold) / 0.28), transparent)' }}
            aria-hidden="true"
          />

          {/* Controles em grid equilibrado */}
          <div className="grid grid-cols-3 gap-2.5">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Abrir opções"
              aria-expanded={menuOpen}
              className="group relative flex items-center justify-center gap-1.5 h-10 px-3 rounded-xl border border-blue-bright/25 bg-blue-bright/[0.05] hover:bg-blue-bright/[0.13] hover:border-blue-bright/50 text-blue-light/85 hover:text-blue-light transition-all duration-300 ease-out hover:-translate-y-[1px] hover:shadow-[0_4px_18px_hsl(var(--blue-bright)/0.22)] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright/50 backdrop-blur-md overflow-hidden"
            >
              <span
                className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: 'radial-gradient(60% 80% at 50% 0%, hsl(var(--blue-bright) / 0.20), transparent 70%)' }}
                aria-hidden="true"
              />
              <Settings className="relative w-3.5 h-3.5 transition-transform duration-500 group-hover:rotate-45" strokeWidth={1.75} aria-hidden="true" />
              <span className="relative text-[10px] font-montserrat font-bold uppercase tracking-[0.14em]">Opções</span>
              {menuOpen
                ? <ChevronUp className="relative w-2.5 h-2.5 transition-transform" aria-hidden="true" />
                : <ChevronDown className="relative w-2.5 h-2.5 transition-transform" aria-hidden="true" />}
            </button>

            <BugReportDialog
              trigger={
                <button
                  title="Reportar problema"
                  aria-label="Reportar problema"
                  className="group relative flex items-center justify-center gap-1.5 h-10 px-3 rounded-xl border border-gold/30 bg-gold/[0.05] hover:bg-gold/[0.13] hover:border-gold/55 text-gold-light/85 hover:text-gold-light transition-all duration-300 ease-out hover:-translate-y-[1px] hover:shadow-[0_4px_18px_hsl(var(--gold)/0.22)] focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 backdrop-blur-md overflow-hidden"
                >
                  <span
                    className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ background: 'radial-gradient(60% 80% at 50% 0%, hsl(var(--gold) / 0.22), transparent 70%)' }}
                    aria-hidden="true"
                  />
                  <Bug className="relative w-3.5 h-3.5 transition-transform duration-300 group-hover:-rotate-12" strokeWidth={1.75} aria-hidden="true" />
                  <span className="relative text-[10px] font-montserrat font-bold uppercase tracking-[0.14em]">Bug</span>
                </button>
              }
            />

            <ConfirmDialog
              trigger={
                <button className="group relative flex items-center justify-center h-10 px-3 rounded-xl border border-red-alert/40 bg-red-alert/[0.06] text-red-alert hover:bg-red-alert/[0.18] hover:border-red-alert/65 transition-all duration-300 ease-out hover:-translate-y-[1px] hover:shadow-[0_4px_18px_hsl(var(--red-alert)/0.28)] focus:outline-none focus-visible:ring-2 focus-visible:ring-red-alert/50 backdrop-blur-md overflow-hidden text-[10px] font-montserrat font-bold uppercase tracking-[0.14em]">
                  <span
                    className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ background: 'radial-gradient(60% 80% at 50% 0%, hsl(var(--red-alert) / 0.22), transparent 70%)' }}
                    aria-hidden="true"
                  />
                  <span className="relative">Sair</span>
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
        </div>
      </div>


      {/* Options dropdown */}
      {menuOpen && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-[60] animate-fadeUp rounded-lg border border-blue-bright/20 backdrop-blur-[16px] overflow-hidden min-w-[240px]" style={{ background: 'linear-gradient(135deg, hsl(211 76% 42% / 0.15) 0%, hsl(214 60% 3% / 0.95) 100%)' }}>
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
