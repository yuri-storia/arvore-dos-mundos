import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const UserMenu: React.FC = () => {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <div className="mx-auto max-w-[1060px] px-4 mb-2">
      <div className="flex items-center justify-end gap-3 py-2">
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
          className="px-3 py-1 rounded-full text-[10px] font-montserrat font-bold uppercase tracking-wider border border-blue-bright/20 text-text-dim hover:text-foreground hover:border-blue-bright/30 transition-colors"
        >
          Sair
        </button>
      </div>
    </div>
  );
};
