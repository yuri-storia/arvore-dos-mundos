import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowUpRight, ArrowDownRight, CalendarClock, Sparkles, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  PLANS,
  applyPlanChange,
  previewPlanChange,
  useRefreshSubscription,
  type PlanChangePreview,
} from '@/hooks/useSubscription';

interface Props {
  planId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Chamado quando não há assinatura na Stripe e é preciso ir para o checkout */
  onNeedsCheckout?: (planId: string) => void;
}

const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

/**
 * Confirmação de troca de plano no padrão dos grandes SaaS:
 * mostra direção (upgrade/downgrade), valor proporcional e quando passa a valer.
 */
export function PlanChangeDialog({ planId, open, onOpenChange, onNeedsCheckout }: Props) {
  const [preview, setPreview] = useState<PlanChangePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const refresh = useRefreshSubscription();

  const target = planId ? (PLANS as Record<string, { name: string; price: string }>)[planId] : null;

  useEffect(() => {
    if (!open || !planId) { setPreview(null); return; }
    let cancelled = false;
    setLoading(true);
    previewPlanChange(planId).then((res) => {
      if (cancelled) return;
      if (res?.needsCheckout) {
        onOpenChange(false);
        onNeedsCheckout?.(planId);
        return;
      }
      setPreview(res);
    }).finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [open, planId, onOpenChange, onNeedsCheckout]);

  const isUpgrade = preview?.direction === 'upgrade';
  const currentName = preview?.currentPlanCode
    ? (PLANS as Record<string, { name: string }>)[preview.currentPlanCode]?.name ?? preview.currentPlanCode
    : null;

  const handleApply = async () => {
    if (!planId) return;
    setApplying(true);
    const res = await applyPlanChange(planId);
    setApplying(false);
    if (res?.error) {
      toast.error('Não foi possível trocar o plano', { description: res.error });
      return;
    }
    if (res?.needsCheckout) {
      onOpenChange(false);
      onNeedsCheckout?.(planId);
      return;
    }
    refresh();
    onOpenChange(false);
    toast.success(
      res?.effectiveAt === 'now' ? 'Plano atualizado!' : 'Mudança agendada',
      {
        description: res?.effectiveAt === 'now'
          ? `Você já está no plano ${target?.name ?? ''}. Os novos recursos estão liberados.`
          : `Seu plano muda para ${target?.name ?? ''} em ${fmtDate(res?.periodEnd)}. Até lá, nada muda.`,
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-gold/25 bg-[#02070d]/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="font-cinzel text-xl text-gold flex items-center gap-2">
            {isUpgrade ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
            {isUpgrade ? 'Confirmar upgrade' : 'Confirmar mudança de plano'}
          </DialogTitle>
          <DialogDescription className="font-manrope text-foreground/70">
            {currentName ? <>De <strong>{currentName}</strong> para <strong>{target?.name}</strong>.</> : <>Mudar para <strong>{target?.name}</strong>.</>}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-foreground/60">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Calculando valores…
          </div>
        ) : preview?.error ? (
          <div className="flex gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm font-manrope">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />
            <span>{preview.error}</span>
          </div>
        ) : (
          <div className="space-y-3 font-manrope text-sm">
            <div className="rounded-xl border border-gold/20 bg-gold/5 p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-foreground/70">Novo valor</span>
                <span className="font-semibold text-gold">{target?.price}</span>
              </div>
              {isUpgrade ? (
                <>
                  {typeof preview?.credit === 'number' && preview.credit > 0 && (
                    <div className="flex justify-between">
                      <span className="text-foreground/70">Crédito do plano atual</span>
                      <span className="text-emerald-400">− {brl(preview.credit)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-gold/15 pt-2">
                    <span className="text-foreground/70">A pagar hoje</span>
                    <span className="font-semibold text-gold">
                      {typeof preview?.amountDue === 'number' ? brl(preview.amountDue) : 'valor proporcional'}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex items-start gap-2 text-foreground/70">
                  <CalendarClock className="h-4 w-4 mt-0.5 shrink-0 text-gold" />
                  <span>
                    Nada é cobrado agora. Você mantém todos os recursos do plano atual até{' '}
                    <strong className="text-foreground">{fmtDate(preview?.periodEnd)}</strong>, quando a mudança passa a valer.
                  </span>
                </div>
              )}
            </div>

            {isUpgrade && (
              <p className="flex items-start gap-2 text-xs text-foreground/60">
                <Sparkles className="h-3.5 w-3.5 mt-0.5 shrink-0 text-gold" />
                O acesso aos novos recursos é liberado imediatamente. Cobramos apenas a diferença proporcional aos dias restantes.
              </p>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={applying}>Cancelar</Button>
          <Button
            onClick={handleApply}
            disabled={loading || applying || !!preview?.error}
            className="bg-gradient-to-r from-gold to-amber-500 text-[#02070d] font-semibold hover:opacity-90"
          >
            {applying ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processando…</> : isUpgrade ? 'Confirmar upgrade' : 'Confirmar mudança'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PlanChangeDialog;
