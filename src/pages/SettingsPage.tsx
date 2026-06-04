import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Save, Eye, EyeOff } from 'lucide-react';
import { TwoFactorSection } from '@/components/TwoFactorSection';

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data?.display_name) setDisplayName(data.display_name);
      setLoadingProfile(false);
    };
    fetchProfile();
  }, [user]);

  const handleSaveName = async () => {
    if (!user) return;
    if (displayName.trim().length > 100) { toast.error('Nome muito longo (máximo 100 caracteres)'); return; }
    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .upsert({ user_id: user.id, display_name: displayName.trim() || null }, { onConflict: 'user_id' });
    setLoading(false);
    if (error) {
      toast.error('Erro ao salvar nome.');
    } else {
      toast.success('Nome atualizado com sucesso!');
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) {
      toast.error('Erro ao alterar senha.');
    } else {
      toast.success('Senha alterada com sucesso!');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-text-dim hover:text-foreground text-xs font-montserrat uppercase tracking-wider mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar
        </button>

        <h1 className="font-cinzel font-bold text-2xl text-foreground mb-1">Configurações</h1>
        <p className="font-merriweather italic text-text-dim text-sm mb-8">{user?.email}</p>

        {/* Display Name */}
        <div className="card-glass rounded-lg p-5 mb-4">
          <h2 className="font-montserrat font-bold text-xs uppercase tracking-wider text-gold-light mb-3">Nome de exibição</h2>
          <input
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            maxLength={100}
            placeholder="Seu nome..."
            disabled={loadingProfile}
            className="w-full bg-secondary/50 border border-blue-bright/15 rounded-md px-3 py-2 text-sm text-foreground font-montserrat placeholder:text-text-dim/40 focus:outline-none focus:border-blue-bright/40 transition-colors mb-3"
          />
          <button
            onClick={handleSaveName}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-blue-main hover:bg-blue-bright text-foreground text-xs font-montserrat font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
          >
            <Save className="w-3 h-3" />
            Salvar Nome
          </button>
        </div>

        {/* Change Password */}
        <div className="card-glass rounded-lg p-5">
          <h2 className="font-montserrat font-bold text-xs uppercase tracking-wider text-gold-light mb-3">Alterar Senha</h2>
          <div className="relative mb-3">
            <input
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Nova senha..."
              className="w-full bg-secondary/50 border border-blue-bright/15 rounded-md px-3 py-2 pr-10 text-sm text-foreground font-montserrat placeholder:text-text-dim/40 focus:outline-none focus:border-blue-bright/40 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="Confirmar nova senha..."
            className="w-full bg-secondary/50 border border-blue-bright/15 rounded-md px-3 py-2 text-sm text-foreground font-montserrat placeholder:text-text-dim/40 focus:outline-none focus:border-blue-bright/40 transition-colors mb-3"
          />
          <button
            onClick={handleChangePassword}
            disabled={loading || !newPassword}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-gold hover:bg-gold-light text-background text-xs font-montserrat font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
          >
            Alterar Senha
          </button>
        </div>

        {/* 2FA */}
        <div className="mt-4">
          <TwoFactorSection />
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
