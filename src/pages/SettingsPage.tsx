import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Save, Eye, EyeOff, User, KeyRound, ShieldCheck, Crown } from 'lucide-react';
import { TwoFactorSection } from '@/components/TwoFactorSection';
import { PlanStatusCard } from '@/components/PlanStatusCard';

const SectionCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}> = ({ icon, title, description, children }) => (
  <section className="card-glass rounded-xl p-5 sm:p-6 border border-blue-bright/15">
    <header className="flex items-start gap-3 mb-4 pb-3 border-b border-white/5">
      <div className="w-8 h-8 rounded-full bg-blue-main/20 border border-blue-bright/20 flex items-center justify-center shrink-0 text-blue-light">
        {icon}
      </div>
      <div className="min-w-0">
        <h2 className="font-cinzel font-bold text-sm text-foreground leading-tight">{title}</h2>
        {description && (
          <p className="text-[11px] text-text-dim font-merriweather italic mt-0.5">{description}</p>
        )}
      </div>
    </header>
    {children}
  </section>
);

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

  const inputCls =
    'w-full bg-secondary/40 border border-blue-bright/15 rounded-md px-3 py-2 text-sm text-foreground font-montserrat placeholder:text-text-dim/40 focus:outline-none focus:border-blue-bright/50 transition-colors';

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/app')}
            className="inline-flex items-center gap-1.5 text-text-dim hover:text-foreground text-xs font-montserrat uppercase tracking-wider mb-5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar para o app
          </button>
          <h1 className="font-cinzel font-bold text-3xl sm:text-4xl text-foreground mb-1 tracking-wide">
            Configurações
          </h1>
          <p className="font-merriweather italic text-text-dim text-sm">
            Gerencie sua conta, plano e segurança · <span className="text-blue-light/80">{user?.email}</span>
          </p>
        </div>

        {/* Plano — full width no topo */}
        <div className="mb-8">
          <SectionCard
            icon={<Crown className="w-4 h-4" strokeWidth={2} />}
            title="Minha Conta · Plano Ativo"
            description="Visão geral dos benefícios do seu plano e gerenciamento da assinatura."
          >
            <PlanStatusCard variant="settings" />
          </SectionCard>
        </div>

        {/* Grid de 2 colunas em telas médias+ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Nome de exibição */}
          <SectionCard
            icon={<User className="w-4 h-4" strokeWidth={2} />}
            title="Nome de exibição"
            description="Como você é chamado dentro da Árvore dos Mundos."
          >
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              maxLength={100}
              placeholder="Seu nome..."
              disabled={loadingProfile}
              className={inputCls}
            />
            <button
              onClick={handleSaveName}
              disabled={loading}
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-blue-main hover:bg-blue-bright text-foreground text-xs font-montserrat font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
            >
              <Save className="w-3 h-3" />
              Salvar nome
            </button>
          </SectionCard>

          {/* Alterar senha */}
          <SectionCard
            icon={<KeyRound className="w-4 h-4" strokeWidth={2} />}
            title="Alterar senha"
            description="Use pelo menos 6 caracteres. Recomendamos combinar letras, números e símbolos."
          >
            <div className="space-y-3">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Nova senha..."
                  className={`${inputCls} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-foreground transition-colors"
                  aria-label={showPassword ? 'Esconder senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirmar nova senha..."
                className={inputCls}
              />
              <button
                onClick={handleChangePassword}
                disabled={loading || !newPassword}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-gold hover:bg-gold-light text-background text-xs font-montserrat font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                Alterar senha
              </button>
            </div>
          </SectionCard>

          {/* 2FA — ocupa as 2 colunas (traz seu próprio card) */}
          <div className="md:col-span-2">
            <TwoFactorSection />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
