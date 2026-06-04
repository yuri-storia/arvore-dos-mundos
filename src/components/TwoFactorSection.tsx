import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ShieldCheck, ShieldOff, Smartphone, Loader2, Copy, Check } from 'lucide-react';

interface Factor {
  id: string;
  status: string;
  friendly_name?: string;
}

export const TwoFactorSection: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [factor, setFactor] = useState<Factor | null>(null);

  // Enrollment state
  const [enrollMode, setEnrollMode] = useState(false);
  const [enrollFactorId, setEnrollFactorId] = useState<string | null>(null);
  const [qrSvg, setQrSvg] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [secretCopied, setSecretCopied] = useState(false);
  const [code, setCode] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (!error) {
      const verified = data.totp.find(f => f.status === 'verified') || null;
      setFactor(verified ? { id: verified.id, status: verified.status, friendly_name: verified.friendly_name } : null);
    }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleStartEnroll = async () => {
    setBusy(true);
    // Clean up any pending (unverified) factors first
    const { data: list } = await supabase.auth.mfa.listFactors();
    if (list) {
      for (const f of list.totp) {
        if (f.status !== 'verified') {
          await supabase.auth.mfa.unenroll({ factorId: f.id });
        }
      }
    }
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: `Árvore dos Mundos · ${new Date().toLocaleDateString('pt-BR')}`,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message || 'Não foi possível iniciar a configuração.');
      return;
    }
    setEnrollFactorId(data.id);
    setQrSvg(data.totp.qr_code);
    setSecret(data.totp.secret);
    setEnrollMode(true);
  };

  const handleVerify = async () => {
    if (!enrollFactorId) return;
    if (code.replace(/\s/g, '').length !== 6) {
      toast.error('Digite o código de 6 dígitos.');
      return;
    }
    setBusy(true);
    const { data: chal, error: chErr } = await supabase.auth.mfa.challenge({ factorId: enrollFactorId });
    if (chErr || !chal) {
      setBusy(false);
      toast.error('Erro ao gerar desafio. Tente novamente.');
      return;
    }
    const { error: vErr } = await supabase.auth.mfa.verify({
      factorId: enrollFactorId,
      challengeId: chal.id,
      code: code.replace(/\s/g, ''),
    });
    setBusy(false);
    if (vErr) {
      toast.error('Código inválido. Verifique a hora do dispositivo e tente outro código.');
      return;
    }
    toast.success('Autenticação em dois fatores ativada!');
    setEnrollMode(false);
    setCode('');
    setQrSvg(null);
    setSecret(null);
    setEnrollFactorId(null);
    refresh();
  };

  const handleCancelEnroll = async () => {
    if (enrollFactorId) {
      await supabase.auth.mfa.unenroll({ factorId: enrollFactorId });
    }
    setEnrollMode(false);
    setCode('');
    setQrSvg(null);
    setSecret(null);
    setEnrollFactorId(null);
  };

  const handleDisable = async () => {
    if (!factor) return;
    if (!confirm('Tem certeza que deseja desativar a autenticação em dois fatores? Sua conta voltará a depender apenas da senha.')) return;
    setBusy(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
    setBusy(false);
    if (error) { toast.error('Não foi possível desativar.'); return; }
    toast.success('Autenticação em dois fatores desativada.');
    refresh();
  };

  const copySecret = async () => {
    if (!secret) return;
    await navigator.clipboard.writeText(secret);
    setSecretCopied(true);
    setTimeout(() => setSecretCopied(false), 2000);
  };

  return (
    <div className="card-glass rounded-lg p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="font-montserrat font-bold text-xs uppercase tracking-wider text-gold-light mb-1">
            Autenticação em Dois Fatores
          </h2>
          <p className="font-montserrat text-[11px] text-text-dim leading-relaxed">
            Adicione uma segunda camada de proteção ao seu acervo. Mesmo que alguém descubra sua senha, não conseguirá entrar sem o código do seu aparelho.
          </p>
        </div>
        {!loading && (
          factor ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-montserrat font-bold uppercase tracking-wider shrink-0">
              <ShieldCheck className="w-3 h-3" /> Ativo
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-foreground/[0.05] border border-foreground/10 text-text-dim text-[10px] font-montserrat font-bold uppercase tracking-wider shrink-0">
              <ShieldOff className="w-3 h-3" /> Inativo
            </span>
          )
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-text-dim text-xs font-montserrat">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando…
        </div>
      ) : enrollMode ? (
        <div className="space-y-4 pt-3 border-t border-blue-bright/10">
          <div>
            <p className="font-montserrat text-xs text-foreground mb-2">
              <strong>1.</strong> Abra um app autenticador (Google Authenticator, Authy, 1Password, Microsoft Authenticator) e escaneie o QR Code abaixo:
            </p>
            {qrSvg && (
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <div className="w-44 h-44" dangerouslySetInnerHTML={{ __html: qrSvg }} />
              </div>
            )}
          </div>

          {secret && (
            <div>
              <p className="font-montserrat text-[11px] text-text-dim mb-1.5">
                Não consegue escanear? Digite o código manualmente:
              </p>
              <button
                onClick={copySecret}
                className="w-full inline-flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-secondary/50 border border-blue-bright/15 text-foreground font-mono text-xs hover:border-blue-bright/40 transition-colors"
              >
                <span className="truncate">{secret}</span>
                {secretCopied ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <Copy className="w-3.5 h-3.5 text-text-dim shrink-0" />}
              </button>
            </div>
          )}

          <div>
            <p className="font-montserrat text-xs text-foreground mb-2">
              <strong>2.</strong> Digite o código de 6 dígitos exibido no app para confirmar:
            </p>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-full bg-secondary/50 border border-blue-bright/15 rounded-md px-3 py-2 text-center text-lg tracking-[0.4em] font-mono text-foreground focus:outline-none focus:border-blue-bright/40 transition-colors"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleVerify}
              disabled={busy || code.length !== 6}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-md bg-gold hover:bg-gold-light text-background text-xs font-montserrat font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              Ativar
            </button>
            <button
              onClick={handleCancelEnroll}
              disabled={busy}
              className="px-4 py-2 rounded-md border border-blue-bright/20 text-text-dim hover:text-foreground hover:border-blue-bright/40 text-xs font-montserrat font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>

          <p className="text-[10px] text-text-dim/70 font-montserrat leading-relaxed">
            Guarde o código manual em local seguro. Sem ele e sem o app, você precisará entrar em contato com o suporte para recuperar o acesso.
          </p>
        </div>
      ) : factor ? (
        <div className="space-y-3 pt-3 border-t border-blue-bright/10">
          <div className="flex items-center gap-2 text-emerald-300 text-xs font-montserrat">
            <Smartphone className="w-3.5 h-3.5" />
            Dispositivo registrado: <strong>{factor.friendly_name || 'App autenticador'}</strong>
          </div>
          <button
            onClick={handleDisable}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md border border-red-alert/30 text-red-alert hover:bg-red-alert/10 text-xs font-montserrat font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldOff className="w-3 h-3" />}
            Desativar 2FA
          </button>
        </div>
      ) : (
        <button
          onClick={handleStartEnroll}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-blue-main hover:bg-blue-bright text-foreground text-xs font-montserrat font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
          Ativar 2FA
        </button>
      )}
    </div>
  );
};
