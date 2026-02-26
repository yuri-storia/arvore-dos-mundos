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
    const { data } = await supabase.rpc('is_admin', { _user_id: userId });
    setIsAdmin(!!data);
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
      // If edge function fails, allow access (graceful degradation)
      return true;
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user && event === 'SIGNED_IN') {
        // Check access for new sign-ins
        const allowed = await checkAccess(session.access_token);
        if (allowed) {
          setTimeout(() => checkAdmin(session.user.id), 0);
        }
      } else if (session?.user) {
        setTimeout(() => checkAdmin(session.user.id), 0);
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdmin(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
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
