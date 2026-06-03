import React, { useState, useEffect, useRef } from 'react';
import { lovable } from '@/integrations/lovable';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import treeWallpaper from '@/assets/tree-wallpaper.webp';

const Particles: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const particles: { x: number; y: number; r: number; vx: number; vy: number; o: number; vo: number }[] = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < 90; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 2.2 + 0.3,
        vx: (Math.random() - 0.5) * 0.12,
        vy: -Math.random() * 0.12 - 0.02,
        o: Math.random() * 0.5 + 0.15,
        vo: (Math.random() - 0.5) * 0.004,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.o += p.vo;
        if (p.o > 0.7) p.vo = -Math.abs(p.vo);
        if (p.o < 0.1) p.vo = Math.abs(p.vo);
        if (p.y < -5) { p.y = canvas.height + 5; p.x = Math.random() * canvas.width; }
        if (p.x < -5) p.x = canvas.width + 5;
        if (p.x > canvas.width + 5) p.x = -5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(144, 202, 249, ${p.o})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(33, 150, 243, 0.5)';
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-[1]" />;
};

type AuthMode = 'login' | 'signup';

const LoginPage: React.FC = () => {
  const { user, loading: authLoading, accessDenied } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(accessDenied ? 'Acesso negado.' : '');
  const [success, setSuccess] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<AuthMode>('login');
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

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
        setError('Erro ao fazer login com Google. Tente novamente.');
      }
    } catch (e: any) {
      setError(e.message || 'Erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message === 'Invalid login credentials'
          ? 'E-mail ou senha incorretos.'
          : error.message === 'Email not confirmed'
            ? 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.'
            : error.message);
      }
    } catch (e: any) {
      setError(e.message || 'Erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) {
        setError(error.message);
      } else {
        setSuccess('Conta criada! Verifique seu e-mail para confirmar o cadastro.');
        setMode('login');
        setPassword('');
      }
    } catch (e: any) {
      setError(e.message || 'Erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        setError(error.message);
      } else {
        setForgotSent(true);
      }
    } catch (e: any) {
      setError(e.message || 'Erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <img src={treeWallpaper} alt="" className="w-full h-full object-cover opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/50 to-background/70" />
      </div>

      <Particles />

      {/* Login card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="rounded-lg p-8 sm:p-10 text-center relative overflow-hidden"
          style={{
            background: 'rgba(6, 14, 28, 0.72)',
            backdropFilter: 'blur(16px)',
            border: '1px solid hsl(211 76% 42% / 0.2)',
            borderTop: '2px solid hsl(207 90% 61%)',
          }}
        >
          <div className="absolute inset-0 z-0 opacity-20">
            <img src={treeWallpaper} alt="" className="w-full h-full object-cover" />
          </div>

          <div className="relative z-10">
            {/* Badge */}
            <div className="inline-block mb-6 px-4 py-1.5 rounded-full border border-blue-bright/20 bg-blue-bright/[0.06]">
              <span className="font-cinzel text-xs tracking-[0.15em] text-blue-light">
                Universo STORIA
              </span>
            </div>

            <h1 className="font-cinzel font-bold text-2xl sm:text-3xl text-foreground mb-2">
              A Árvore <span className="text-blue-light">dos Mundos</span>
            </h1>
            <p className="font-merriweather italic text-text-secondary text-sm mb-8">
              O Template Definitivo de Worldbuilding
            </p>

            <div className="mx-auto w-[60px] h-[2px] bg-gradient-to-r from-transparent via-blue-bright to-transparent mb-8" />

            {forgotMode ? (
              forgotSent ? (
                <div className="space-y-4">
                  <p className="text-blue-light font-merriweather text-sm">
                    E-mail de recuperação enviado! Verifique sua caixa de entrada.
                  </p>
                  <button onClick={() => { setForgotMode(false); setForgotSent(false); setError(''); }}
                    className="text-blue-light text-xs font-montserrat hover:underline">
                    Voltar ao login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-3">
                  <p className="text-text-secondary font-montserrat text-xs mb-2">
                    Informe seu e-mail para receber o link de recuperação.
                  </p>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="E-mail" required
                    className="w-full px-4 py-3 rounded-lg bg-foreground/[0.06] border border-blue-bright/15 text-foreground placeholder:text-text-dim font-montserrat text-sm focus:outline-none focus:border-blue-bright/40 transition-colors" />
                  <button type="submit" disabled={loading}
                    className="w-full px-6 py-3 rounded-lg bg-primary/80 hover:bg-primary transition-colors text-primary-foreground font-montserrat font-semibold text-sm disabled:opacity-50">
                    {loading ? 'Enviando…' : 'Enviar link de recuperação'}
                  </button>
                  <button type="button" onClick={() => { setForgotMode(false); setError(''); }}
                    className="text-blue-light text-xs font-montserrat hover:underline">
                    Voltar ao login
                  </button>
                </form>
              )
            ) : (
              <>
                {/* Mode toggle */}
                <div className="flex items-center justify-center gap-1 mb-6 p-1 rounded-lg bg-foreground/[0.04] border border-blue-bright/10">
                  <button
                    onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
                    className={`flex-1 px-4 py-2 rounded-md text-xs font-montserrat font-bold uppercase tracking-wider transition-all ${
                      mode === 'login'
                        ? 'bg-primary/80 text-primary-foreground'
                        : 'text-text-dim hover:text-foreground'
                    }`}
                  >
                    Entrar
                  </button>
                  <button
                    onClick={() => { setMode('signup'); setError(''); setSuccess(''); }}
                    className={`flex-1 px-4 py-2 rounded-md text-xs font-montserrat font-bold uppercase tracking-wider transition-all ${
                      mode === 'signup'
                        ? 'bg-primary/80 text-primary-foreground'
                        : 'text-text-dim hover:text-foreground'
                    }`}
                  >
                    Criar Conta
                  </button>
                </div>

                {/* Email/Password form */}
                <form onSubmit={mode === 'login' ? handleEmailLogin : handleSignup} className="space-y-3">
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="E-mail" required
                    className="w-full px-4 py-3 rounded-lg bg-foreground/[0.06] border border-blue-bright/15 text-foreground placeholder:text-text-dim font-montserrat text-sm focus:outline-none focus:border-blue-bright/40 transition-colors" />
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Senha"
                      required
                      minLength={6}
                      className="w-full px-4 py-3 pr-12 rounded-lg bg-foreground/[0.06] border border-blue-bright/15 text-foreground placeholder:text-text-dim font-montserrat text-sm focus:outline-none focus:border-blue-bright/40 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-text-dim hover:text-blue-light transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full px-6 py-3 rounded-lg bg-primary/80 hover:bg-primary transition-colors text-primary-foreground font-montserrat font-semibold text-sm disabled:opacity-50">
                    {loading ? (mode === 'login' ? 'Entrando…' : 'Criando conta…') : (mode === 'login' ? 'Entrar' : 'Criar Conta')}
                  </button>
                </form>

                {mode === 'login' && (
                  <button onClick={() => { setForgotMode(true); setError(''); }}
                    className="mt-3 text-text-dim text-xs font-montserrat hover:text-blue-light hover:underline transition-colors">
                    Esqueci minha senha
                  </button>
                )}

                {/* Divider */}
                <div className="flex items-center gap-3 my-6">
                  <div className="flex-1 h-px bg-foreground/10" />
                  <span className="text-text-dim text-xs font-montserrat">ou</span>
                  <div className="flex-1 h-px bg-foreground/10" />
                </div>

                {/* Google */}
                <button onClick={handleGoogleLogin} disabled={loading}
                  className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-lg bg-foreground/[0.08] border border-blue-bright/20 hover:border-blue-bright/40 hover:bg-foreground/[0.12] transition-all text-foreground font-montserrat font-semibold text-sm disabled:opacity-50">
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  {mode === 'login' ? 'Entrar com Google' : 'Criar conta com Google'}
                </button>

                {/* Link to landing page */}
                <button
                  onClick={() => navigate('/inicio')}
                  className="mt-4 text-text-dim text-[11px] font-montserrat hover:text-blue-light hover:underline transition-colors"
                >
                  Conheça a Árvore dos Mundos →
                </button>
              </>
            )}

            {success && (
              <p className="mt-4 text-emerald-400 text-sm font-merriweather">{success}</p>
            )}

            {error && (
              <p className="mt-4 text-red-alert text-sm font-merriweather">{error}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
