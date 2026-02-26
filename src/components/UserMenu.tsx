import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const UserMenu: React.FC = () => {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <div className="flex justify-center px-4 mb-0">
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
    </div>
  );
};
