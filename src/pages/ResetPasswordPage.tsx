import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import treeWallpaper from '@/assets/tree-wallpaper.webp';

const ResetPasswordPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isRecoveryFlow, setIsRecoveryFlow] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, '');
    const params = new URLSearchParams(hash);
    setIsRecoveryFlow(params.get('type') === 'recovery');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não conferem.');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(true);
  };

  if (!isRecoveryFlow && !authLoading && !user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-background relative flex items-center justify-center overflow-hidden px-4">
      <div className="absolute inset-0 z-0">
        <img src={treeWallpaper} alt="" className="w-full h-full object-cover opacity-75" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/60 to-background/80" />
      </div>

      <div
        className="relative z-10 w-full max-w-md rounded-lg p-8 sm:p-10"
        style={{
          background: 'rgba(6, 14, 28, 0.78)',
          backdropFilter: 'blur(16px)',
          border: '1px solid hsl(211 76% 42% / 0.2)',
          borderTop: '2px solid hsl(207 90% 61%)',
        }}
      >
        <h1 className="font-cinzel font-bold text-2xl sm:text-3xl text-foreground mb-2 text-center">
          Redefinir <span className="text-blue-light">Senha</span>
        </h1>
        <p className="font-merriweather italic text-text-secondary text-sm mb-8 text-center">
          Defina sua nova senha para acessar a plataforma
        </p>

        {success ? (
          <div className="space-y-4 text-center">
            <p className="text-blue-light font-merriweather text-sm">Senha atualizada com sucesso.</p>
            <button
              onClick={() => navigate('/login')}
              className="w-full px-6 py-3 rounded-lg bg-primary/80 hover:bg-primary transition-colors text-primary-foreground font-montserrat font-semibold text-sm"
            >
              Ir para o login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nova senha"
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-lg bg-foreground/[0.06] border border-blue-bright/15 text-foreground placeholder:text-text-dim font-montserrat text-sm focus:outline-none focus:border-blue-bright/40 transition-colors"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirmar nova senha"
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-lg bg-foreground/[0.06] border border-blue-bright/15 text-foreground placeholder:text-text-dim font-montserrat text-sm focus:outline-none focus:border-blue-bright/40 transition-colors"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 rounded-lg bg-primary/80 hover:bg-primary transition-colors text-primary-foreground font-montserrat font-semibold text-sm disabled:opacity-50"
            >
              {loading ? 'Atualizando…' : 'Atualizar senha'}
            </button>
          </form>
        )}

        {error && <p className="mt-4 text-red-alert text-sm font-merriweather">{error}</p>}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
