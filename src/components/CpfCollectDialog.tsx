import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface CpfCollectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (cpfCnpj: string) => Promise<void> | void;
}

function formatCpfCnpj(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 11) {
    // CPF: 000.000.000-00
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  // CNPJ: 00.000.000/0000-00
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function isValidCpfCnpj(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length === 11 || digits.length === 14;
}

export function CpfCollectDialog({ open, onOpenChange, onConfirm }: CpfCollectDialogProps) {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const valid = isValidCpfCnpj(value);

  async function handleConfirm() {
    if (!valid) return;
    setLoading(true);
    try {
      await onConfirm(value.replace(/\D/g, ""));
      setValue("");
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-cinzel">Identificação para o pagamento</DialogTitle>
          <DialogDescription className="pt-2 space-y-2">
            <span className="block">
              O processador de pagamentos exige CPF ou CNPJ para emitir cobranças no Brasil
              (Receita Federal).
            </span>
            <span className="block text-xs text-muted-foreground">
              Usado apenas para gerar a fatura. Guardado uma única vez — você não vai precisar
              informar de novo.
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="cpf-cnpj">CPF ou CNPJ</Label>
          <Input
            id="cpf-cnpj"
            inputMode="numeric"
            autoComplete="off"
            placeholder="000.000.000-00"
            value={value}
            onChange={(e) => setValue(formatCpfCnpj(e.target.value))}
            onKeyDown={(e) => { if (e.key === "Enter" && valid) handleConfirm(); }}
          />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!valid || loading}>
            {loading ? "Abrindo pagamento..." : "Continuar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
