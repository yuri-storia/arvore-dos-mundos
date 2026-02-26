import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<Props> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-3">
            <span className="w-2 h-2 rounded-full bg-blue-light dot-bounce" />
            <span className="w-2 h-2 rounded-full bg-blue-light dot-bounce-2" />
            <span className="w-2 h-2 rounded-full bg-blue-light dot-bounce-3" />
          </div>
          <p className="font-merriweather italic text-text-dim text-sm">Carregando…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
