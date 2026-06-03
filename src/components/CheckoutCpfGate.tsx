import { useEffect, useState } from "react";
import { CpfCollectDialog } from "./CpfCollectDialog";
import { openCheckout } from "@/hooks/useSubscription";

export function CheckoutCpfGate() {
  const [open, setOpen] = useState(false);
  const [planId, setPlanId] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      if (detail.planId) {
        setPlanId(detail.planId);
        setOpen(true);
      }
    };
    window.addEventListener("arvore:cpf-required", handler as EventListener);
    return () => window.removeEventListener("arvore:cpf-required", handler as EventListener);
  }, []);

  return (
    <CpfCollectDialog
      open={open}
      onOpenChange={setOpen}
      onConfirm={async (cpfCnpj) => {
        if (!planId) return;
        await openCheckout(planId, cpfCnpj);
      }}
    />
  );
}
