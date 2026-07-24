import { toast } from 'sonner';

/**
 * O trigger `enforce_content_edit` no banco rejeita INSERT/UPDATE em
 * mundos, fichas, artigos, capítulos, manuscritos, linha do tempo, etc.
 * quando o usuário não tem assinatura ativa (código P0001,
 * mensagem `plan_required: ...`). Este helper centraliza a detecção
 * para dar um feedback consistente na UI.
 */
export function isPlanRequiredError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const anyErr = error as Record<string, unknown>;
  const msg = String(anyErr.message ?? '');
  const code = String(anyErr.code ?? '');
  const hint = String(anyErr.hint ?? '');
  return (
    msg.includes('plan_required') ||
    hint === 'upgrade_required' ||
    (code === 'P0001' && msg.toLowerCase().includes('assinatura'))
  );
}

let lastToastAt = 0;
/**
 * Mostra um toast único quando o erro veio do bloqueio de plano.
 * Retorna `true` se lidou com o erro (o chamador não precisa mais fazer nada).
 */
export function handlePlanEditError(error: unknown): boolean {
  if (!isPlanRequiredError(error)) return false;
  const now = Date.now();
  // Throttle — autosaves podem disparar em rajada.
  if (now - lastToastAt > 4000) {
    lastToastAt = now;
    toast.error('Assinatura inativa — edições bloqueadas', {
      description: 'Reative um plano em Configurações para voltar a editar.',
      duration: 5000,
    });
  }
  return true;
}
