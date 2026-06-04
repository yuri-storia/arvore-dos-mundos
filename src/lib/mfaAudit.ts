import { supabase } from '@/integrations/supabase/client';

export type MfaEventType =
  | 'enrolled'
  | 'unenrolled'
  | 'challenge_success'
  | 'challenge_failed'
  | 'backup_codes_generated'
  | 'backup_code_used'
  | 'recovery_factor_removed';

export async function logMfaEvent(userId: string, event: MfaEventType): Promise<void> {
  try {
    await supabase.from('mfa_audit_log').insert({
      user_id: userId,
      event_type: event,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 500) : null,
    });
  } catch (e) {
    // Silent — audit log should never break the user flow
    console.warn('mfa audit log failed:', e);
  }
}

export const MFA_EVENT_LABELS: Record<MfaEventType, string> = {
  enrolled: 'Autenticação em dois fatores ativada',
  unenrolled: 'Autenticação em dois fatores desativada',
  challenge_success: 'Login com 2FA bem-sucedido',
  challenge_failed: 'Tentativa de 2FA com código inválido',
  backup_codes_generated: 'Novos códigos de backup gerados',
  backup_code_used: 'Código de backup utilizado',
  recovery_factor_removed: 'Fator removido por recuperação',
};
