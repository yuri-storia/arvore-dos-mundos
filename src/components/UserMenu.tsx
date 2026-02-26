import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface Props {
  onOpenWorlds?: () => void;
  onNewWorld?: () => void;
  worldCount?: number;
}

export const UserMenu: React.FC<Props> = ({ onOpenWorlds, onNewWorld, worldCount = 0 }) => {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <div className="flex flex-col items-center gap-2 px-4 mb-0">
      {/* User row */}
      <div className="inline-flex items-center justify-center gap-3 py-1.5 px-5 rounded-full bg-white/[0.04] border border-white/[0.06] backdrop-blur-sm">
        {isAdmin && (
          <button
            onClick={() => navigate('/admin')}
            className="px-3 py-1 rounded-full text-[10px] font-montserrat font-bold uppercase tracking-wider border border-gold/30 text-gold-light hover:text-gold hover:border-gold/50 transition-colors"
          >
            🛡 Admin
          </button>
        )}
        <span className="text-[11px] text-text-dim font-montserrat truncate max-w-[200px]">
          {user.email}
        </span>
        <button
          onClick={async () => {
            try {
              await signOut();
            } finally {
              navigate('/login', { replace: true });
            }
          }}
          className="px-3 py-1 rounded-full text-[10px] font-montserrat font-bold uppercase tracking-wider border border-red-alert/40 text-red-alert hover:text-destructive-foreground hover:bg-red-alert/20 hover:border-red-alert/60 transition-colors"
        >
          Sair
        </button>
      </div>

      {/* World management row */}
      <div className="inline-flex items-center justify-center gap-2">
        {onOpenWorlds && (
          <button
            onClick={onOpenWorlds}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-montserrat font-bold uppercase tracking-wider border border-blue-bright/25 bg-blue-bright/[0.08] hover:bg-blue-bright/[0.15] text-blue-light/80 hover:text-blue-light transition-all backdrop-blur-sm"
          >
            📂 Meus Projetos {worldCount > 0 && `(${worldCount})`}
          </button>
        )}
        {onNewWorld && (
          <button
            onClick={onNewWorld}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-montserrat font-bold uppercase tracking-wider border border-gold/30 bg-gold/[0.08] hover:bg-gold/[0.15] text-gold-light/80 hover:text-gold-light transition-all backdrop-blur-sm"
          >
            ✦ Criar Novo Mundo
          </button>
        )}
      </div>
    </div>
  );
};
