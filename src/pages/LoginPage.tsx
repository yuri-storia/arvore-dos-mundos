import React, { useState } from 'react';
import { lovable } from '@/integrations/lovable';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import treeWallpaper from '@/assets/tree-wallpaper.webp';

const LoginPage: React.FC = () => {
  const { user, loading: authLoading, accessDenied } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(accessDenied ? 'Acesso negado. Seu e-mail não está autorizado.' : '');

  // Redirect if already logged in
  if (!authLoading && user && !accessDenied) {
    return <Navigate to="/" replace />;
  }

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        setError('Erro ao fazer login. Tente novamente.');
      }
    } catch (e: any) {
      setError(e.message || 'Erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative flex items-center justify-center">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <img
          src={treeWallpaper}
          alt=""
          className="w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
      </div>

      {/* Login card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="card-glass rounded-lg p-8 sm:p-10 text-center">
          {/* Badge */}
          <div className="inline-block mb-6 px-4 py-1.5 rounded-full border border-blue-bright/20 bg-blue-bright/[0.06]">
            <span className="font-cinzel text-xs tracking-[0.15em] text-blue-light">
              ✦ Universo STORIA ✦
            </span>
          </div>

          {/* Title */}
          <h1 className="font-cinzel font-bold text-2xl sm:text-3xl text-foreground mb-2">
            A Árvore <span className="text-blue-light">dos Mundos</span>
          </h1>
          <p className="font-merriweather italic text-text-secondary text-sm mb-8">
            O Template Definitivo de Worldbuilding
          </p>

          {/* Divider */}
          <div className="mx-auto w-[60px] h-[2px] bg-gradient-to-r from-transparent via-blue-bright to-transparent mb-8" />

          {/* Google button */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-lg bg-foreground/[0.08] border border-blue-bright/20 hover:border-blue-bright/40 hover:bg-foreground/[0.12] transition-all text-foreground font-montserrat font-semibold text-sm disabled:opacity-50"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            {loading ? 'Entrando…' : 'Entrar com Google'}
          </button>

          {error && (
            <p className="mt-4 text-red-alert text-sm font-merriweather">{error}</p>
          )}

          <p className="mt-6 text-text-dim text-[11px] font-montserrat">
            Acesso restrito a contas autorizadas
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
