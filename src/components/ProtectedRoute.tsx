import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  children: React.ReactNode;
}

const Loader: React.FC = () => (
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

export const ProtectedRoute: React.FC<Props> = ({ children }) => {
  const { user, loading } = useAuth();
  const [aalChecking, setAalChecking] = useState(true);
  const [mfaPending, setMfaPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!user) { setAalChecking(false); setMfaPending(false); return; }
    setAalChecking(true);
    (async () => {
      const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (cancelled) return;
      setMfaPending(data?.currentLevel === 'aal1' && data?.nextLevel === 'aal2');
      setAalChecking(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (loading || (user && aalChecking)) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  if (mfaPending) return <Navigate to="/login" replace />;

  return <>{children}</>;
};
