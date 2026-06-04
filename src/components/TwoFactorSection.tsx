import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  ShieldCheck, ShieldOff, Smartphone, Loader2, Copy, Check,
  KeyRound, Download, History, AlertTriangle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { logMfaEvent, MFA_EVENT_LABELS, type MfaEventType } from '@/lib/mfaAudit';

interface Factor { id: string; status: string; friendly_name?: string }
interface AuditRow { id: string; event_type: MfaEventType; created_at: string; user_agent: string | null }
interface BackupCodeRow { id: string; used_at: string | null; created_at: string }

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function eventColor(t: MfaEventType) {
  if (t === 'challenge_failed') return 'text-red-alert';
  if (t === 'unenrolled' || t === 'recovery_factor_removed' || t === 'backup_code_used') return 'text-amber-300';
  return 'text-emerald-300';
}

export const TwoFactorSection: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [factor, setFactor] = useState<Factor | null>(null);

  // Enrollment
  const [enrollMode, setEnrollMode] = useState(false);
  const [enrollFactorId, setEnrollFactorId] = useState<string | null>(null);
  const [qrSvg, setQrSvg] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [secretCopied, setSecretCopied] = useState(false);
  const [code, setCode] = useState('');

  // Backup codes
  const [backupCodes, setBackupCodes] = useState<BackupCodeRow[]>([]);
  const [freshCodes, setFreshCodes] = useState<string[] | null>(null);
  const [confirmRegen, setConfirmRegen] = useState(false);

  // Audit
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [showAudit, setShowAudit] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [{ data: f }, { data: bc }, { data: al }] = await Promise.all([
      supabase.auth.mfa.listFactors(),
      supabase.from('mfa_backup_codes').select('id, used_at, created_at').order('created_at', { ascending: false }),
      supabase.from('mfa_audit_log').select('id, event_type, created_at, user_agent').order('created_at', { ascending: false }).limit(20),
    ]);
    const verified = f?.totp.find(x => x.status === 'verified') || null;
    setFactor(verified ? { id: verified.id, status: verified.status, friendly_name: verified.friendly_name } : null);
    setBackupCodes((bc as BackupCodeRow[]) || []);
    setAudit((al as AuditRow[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleStartEnroll = async () => {
    setBusy(true);
    const { data: list } = await supabase.auth.mfa.listFactors();
    if (list) for (const f of list.totp) if (f.status !== 'verified') await supabase.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: `Árvore dos Mundos · ${new Date().toLocaleDateString('pt-BR')}`,
    });
    setBusy(false);
    if (error) { toast.error(error.message || 'Não foi possível iniciar a configuração.'); return; }
    setEnrollFactorId(data.id); setQrSvg(data.totp.qr_code); setSecret(data.totp.secret); setEnrollMode(true);
  };

  const generateBackupCodes = async (): Promise<string[] | null> => {
    const { data, error } = await supabase.functions.invoke('mfa-recovery', { body: { action: 'generate' } });
    if (error || !data?.codes) { toast.error('Erro ao gerar códigos de backup.'); return null; }
    return data.codes as string[];
  };

  const handleVerify = async () => {
    if (!enrollFactorId || !user) return;
    if (code.replace(/\s/g, '').length !== 6) { toast.error('Digite o código de 6 dígitos.'); return; }
    setBusy(true);
    const { data: chal, error: chErr } = await supabase.auth.mfa.challenge({ factorId: enrollFactorId });
    if (chErr || !chal) { setBusy(false); toast.error('Erro ao gerar desafio. Tente novamente.'); return; }
    const { error: vErr } = await supabase.auth.mfa.verify({
      factorId: enrollFactorId, challengeId: chal.id, code: code.replace(/\s/g, ''),
    });
    if (vErr) { setBusy(false); toast.error('Código inválido. Verifique a hora do dispositivo e tente outro código.'); return; }

    await logMfaEvent(user.id, 'enrolled');
    const codes = await generateBackupCodes();
    setBusy(false);
    setEnrollMode(false); setCode(''); setQrSvg(null); setSecret(null); setEnrollFactorId(null);
    if (codes) setFreshCodes(codes);
    toast.success('Autenticação em dois fatores ativada!');
    refresh();
  };

  const handleCancelEnroll = async () => {
    if (enrollFactorId) await supabase.auth.mfa.unenroll({ factorId: enrollFactorId });
    setEnrollMode(false); setCode(''); setQrSvg(null); setSecret(null); setEnrollFactorId(null);
  };

  const handleDisable = async () => {
    if (!factor || !user) return;
    if (!confirm('Tem certeza que deseja desativar a autenticação em dois fatores? Sua conta voltará a depender apenas da senha e os códigos de backup atuais serão invalidados.')) return;
    setBusy(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
    if (!error) {
      await supabase.from('mfa_backup_codes').delete().eq('user_id', user.id);
      await logMfaEvent(user.id, 'unenrolled');
    }
    setBusy(false);
    if (error) { toast.error('Não foi possível desativar.'); return; }
    toast.success('Autenticação em dois fatores desativada.');
    refresh();
  };

  const handleRegenerate = async () => {
    setBusy(true);
    const codes = await generateBackupCodes();
    setBusy(false);
    setConfirmRegen(false);
    if (codes) { setFreshCodes(codes); refresh(); }
  };

  const copySecret = async () => {
    if (!secret) return;
    await navigator.clipboard.writeText(secret);
    setSecretCopied(true);
    setTimeout(() => setSecretCopied(false), 2000);
  };

  const downloadCodes = (codes: string[]) => {
    const text = [
      'Árvore dos Mundos — Códigos de backup 2FA',
      `Gerado em: ${new Date().toLocaleString('pt-BR')}`,
      `Conta: ${user?.email || ''}`,
      '',
      'IMPORTANTE: Cada código só pode ser usado uma vez.',
      'Guarde este arquivo em local seguro (gerenciador de senhas, cofre, impressão).',
      '',
      ...codes.map((c, i) => `${(i + 1).toString().padStart(2, '0')}. ${c}`),
    ].join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `arvore-mundos-2fa-backup-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const unusedBackupCount = backupCodes.filter(c => !c.used_at).length;

  return (
    <div className="space-y-4">
      {/* Main card */}
      <div className="card-glass rounded-lg p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="font-montserrat font-bold text-xs uppercase tracking-wider text-gold-light mb-1">
              Autenticação em Dois Fatores
            </h2>
            <p className="font-montserrat text-[11px] text-text-dim leading-relaxed">
              Camada extra de proteção: mesmo com a senha em mãos, ninguém entra sem o código do seu aparelho.
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
                <button onClick={copySecret}
                  className="w-full inline-flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-secondary/50 border border-blue-bright/15 text-foreground font-mono text-xs hover:border-blue-bright/40 transition-colors">
                  <span className="truncate">{secret}</span>
                  {secretCopied ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <Copy className="w-3.5 h-3.5 text-text-dim shrink-0" />}
                </button>
              </div>
            )}
            <div>
              <p className="font-montserrat text-xs text-foreground mb-2">
                <strong>2.</strong> Digite o código de 6 dígitos exibido no app:
              </p>
              <input type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} placeholder="000000"
                className="w-full bg-secondary/50 border border-blue-bright/15 rounded-md px-3 py-2 text-center text-lg tracking-[0.4em] font-mono text-foreground focus:outline-none focus:border-blue-bright/40 transition-colors" />
            </div>
            <div className="flex gap-2">
              <button onClick={handleVerify} disabled={busy || code.length !== 6}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-md bg-gold hover:bg-gold-light text-background text-xs font-montserrat font-bold uppercase tracking-wider transition-colors disabled:opacity-50">
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                Ativar
              </button>
              <button onClick={handleCancelEnroll} disabled={busy}
                className="px-4 py-2 rounded-md border border-blue-bright/20 text-text-dim hover:text-foreground hover:border-blue-bright/40 text-xs font-montserrat font-bold uppercase tracking-wider transition-colors disabled:opacity-50">
                Cancelar
              </button>
            </div>
            <p className="text-[10px] text-text-dim/70 font-montserrat leading-relaxed">
              Após ativar, você receberá 10 códigos de backup para guardar em local seguro.
            </p>
          </div>
        ) : factor ? (
          <div className="space-y-3 pt-3 border-t border-blue-bright/10">
            <div className="flex items-center gap-2 text-emerald-300 text-xs font-montserrat">
              <Smartphone className="w-3.5 h-3.5" />
              Dispositivo registrado: <strong>{factor.friendly_name || 'App autenticador'}</strong>
            </div>
            <button onClick={handleDisable} disabled={busy}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md border border-red-alert/30 text-red-alert hover:bg-red-alert/10 text-xs font-montserrat font-bold uppercase tracking-wider transition-colors disabled:opacity-50">
              {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldOff className="w-3 h-3" />}
              Desativar 2FA
            </button>
          </div>
        ) : (
          <button onClick={handleStartEnroll} disabled={busy}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-blue-main hover:bg-blue-bright text-foreground text-xs font-montserrat font-bold uppercase tracking-wider transition-colors disabled:opacity-50">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
            Ativar 2FA
          </button>
        )}
      </div>

      {/* Fresh codes overlay */}
      {freshCodes && (
        <div className="card-glass rounded-lg p-5 border-2 border-gold-warm/50 bg-gold-deep/[0.06]">
          <div className="flex items-start gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-gold-champagne shrink-0 mt-0.5" />
            <div>
              <h3 className="font-cinzel font-bold text-sm text-gradient-gold mb-1">Códigos de backup gerados</h3>
              <p className="font-montserrat text-[11px] text-text-secondary leading-relaxed">
                Estes códigos <strong>serão exibidos uma única vez</strong>. Guarde em um gerenciador de senhas, imprima, ou anote em local seguro. Cada código permite recuperar o acesso uma vez, caso você perca o app autenticador.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 p-3 rounded-md bg-[hsl(var(--bg-deep))] border border-gold-bronze/30 mb-3">
            {freshCodes.map((c, i) => (
              <div key={c} className="flex items-center gap-2 font-mono text-sm text-foreground">
                <span className="text-text-dim/60 text-[10px] w-5">{(i + 1).toString().padStart(2, '0')}</span>
                <span className="tracking-wider">{c}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => downloadCodes(freshCodes)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gold hover:bg-gold-light text-background text-xs font-montserrat font-bold uppercase tracking-wider transition-colors">
              <Download className="w-3 h-3" /> Baixar (.txt)
            </button>
            <button onClick={() => { navigator.clipboard.writeText(freshCodes.join('\n')); toast.success('Códigos copiados!'); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-blue-bright/20 text-foreground hover:border-blue-bright/40 text-xs font-montserrat font-bold uppercase tracking-wider transition-colors">
              <Copy className="w-3 h-3" /> Copiar
            </button>
            <button onClick={() => setFreshCodes(null)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 text-xs font-montserrat font-bold uppercase tracking-wider transition-colors ml-auto">
              <Check className="w-3 h-3" /> Salvei em local seguro
            </button>
          </div>
        </div>
      )}

      {/* Backup codes management — only when 2FA active and no fresh codes overlay */}
      {factor && !freshCodes && (
        <div className="card-glass rounded-lg p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h3 className="font-montserrat font-bold text-xs uppercase tracking-wider text-gold-light mb-1 inline-flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" /> Códigos de Backup
              </h3>
              <p className="font-montserrat text-[11px] text-text-dim leading-relaxed">
                {unusedBackupCount > 0
                  ? <><strong className="text-foreground">{unusedBackupCount}</strong> {unusedBackupCount === 1 ? 'código restante' : 'códigos restantes'} de {backupCodes.length}.</>
                  : 'Você não tem códigos disponíveis. Gere novos para garantir recuperação.'}
              </p>
            </div>
            {unusedBackupCount <= 2 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-montserrat font-bold uppercase tracking-wider shrink-0">
                <AlertTriangle className="w-3 h-3" /> Atenção
              </span>
            )}
          </div>
          {confirmRegen ? (
            <div className="space-y-2 pt-3 border-t border-blue-bright/10">
              <p className="font-montserrat text-xs text-amber-300">
                Gerar novos códigos <strong>invalida todos os atuais</strong>, mesmo os não usados. Confirmar?
              </p>
              <div className="flex gap-2">
                <button onClick={handleRegenerate} disabled={busy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500/80 hover:bg-amber-500 text-background text-xs font-montserrat font-bold uppercase tracking-wider transition-colors disabled:opacity-50">
                  {busy && <Loader2 className="w-3 h-3 animate-spin" />} Sim, gerar novos
                </button>
                <button onClick={() => setConfirmRegen(false)}
                  className="px-3 py-1.5 rounded-md border border-blue-bright/20 text-text-dim hover:text-foreground text-xs font-montserrat font-bold uppercase tracking-wider transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setConfirmRegen(true)} disabled={busy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-blue-bright/20 text-foreground hover:border-blue-bright/40 text-xs font-montserrat font-bold uppercase tracking-wider transition-colors">
              <KeyRound className="w-3 h-3" /> Gerar novos códigos
            </button>
          )}
        </div>
      )}

      {/* Audit log */}
      <div className="card-glass rounded-lg p-5">
        <button onClick={() => setShowAudit(s => !s)}
          className="w-full flex items-center justify-between gap-3 text-left">
          <div>
            <h3 className="font-montserrat font-bold text-xs uppercase tracking-wider text-gold-light mb-0.5 inline-flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" /> Histórico de Segurança
            </h3>
            <p className="font-montserrat text-[11px] text-text-dim">
              {audit.length === 0 ? 'Nenhum evento registrado ainda.' : `Últimos ${audit.length} eventos de 2FA`}
            </p>
          </div>
          <span className="text-text-dim text-xs font-montserrat">{showAudit ? 'Ocultar' : 'Ver'}</span>
        </button>
        {showAudit && audit.length > 0 && (
          <ul className="mt-4 space-y-2 pt-3 border-t border-blue-bright/10">
            {audit.map(ev => (
              <li key={ev.id} className="flex items-start justify-between gap-3 text-[11px] font-montserrat">
                <span className={eventColor(ev.event_type)}>{MFA_EVENT_LABELS[ev.event_type]}</span>
                <span className="text-text-dim shrink-0">{formatDate(ev.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
