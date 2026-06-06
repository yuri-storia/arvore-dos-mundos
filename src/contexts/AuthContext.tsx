import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  accessDenied: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isAdmin: false,
  loading: true,
  accessDenied: false,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  const checkAdmin = async (userId: string) => {
    const { data, error } = await supabase.rpc('is_admin', { _user_id: userId });
    setIsAdmin(!error && !!data);
  };

  const checkAccess = async (accessToken: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('check-access', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (error || !data?.allowed) {
        setAccessDenied(true);
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        return false;
      }
      setAccessDenied(false);
      return true;
    } catch {
      // If backend function fails, allow access (graceful degradation)
      return true;
    }
  };

  const currentUserIdRef = React.useRef<string | null>(null);

  const processSession = async (nextSession: Session | null, shouldValidateAccess: boolean) => {
    const nextUser = nextSession?.user ?? null;
    const nextId = nextUser?.id ?? null;
    const userChanged = currentUserIdRef.current !== nextId;

    // Always keep the latest session token (for API calls), but only update
    // the user reference when the identity actually changes. This prevents
    // downstream hooks (useCodexEntries, useWorlds, ...) from re-fetching
    // whenever Supabase silently refreshes the token (e.g. on tab focus).
    setSession(nextSession);
    if (userChanged) {
      currentUserIdRef.current = nextId;
      setUser(nextUser);
    }

    if (!nextUser) {
      setIsAdmin(false);
      setAccessDenied(false);
      setLoading(false);
      return;
    }

    // Only validate access / re-check admin on real identity changes.
    if (!userChanged) {
      setLoading(false);
      return;
    }

    if (shouldValidateAccess) {
      const allowed = await checkAccess(nextSession!.access_token);
      if (!allowed) {
        setLoading(false);
        return;
      }
    }

    await checkAdmin(nextUser.id);
    setLoading(false);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      // TOKEN_REFRESHED fires whenever the tab regains focus and the token is
      // silently renewed — do NOT revalidate access in that case, it's already
      // been validated on SIGNED_IN / INITIAL_SESSION.
      const shouldValidateAccess = event === 'SIGNED_IN' || event === 'INITIAL_SESSION';

      void processSession(nextSession, shouldValidateAccess);
    });

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      void processSession(initialSession, true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut({ scope: 'local' });
    setUser(null);
    setSession(null);
    setIsAdmin(false);
    setAccessDenied(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, loading, accessDenied, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
