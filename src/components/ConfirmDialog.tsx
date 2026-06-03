import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  trigger: React.ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  variant?: 'destructive' | 'warning';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  trigger,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  variant = 'destructive',
}) => {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent className="border-red-alert/30 bg-[#0a0f18] backdrop-blur-xl shadow-[0_0_60px_rgba(220,38,38,0.15)]">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-cinzel text-lg text-red-alert flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-alert" strokeWidth={2} /> {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="font-montserrat text-sm text-text-secondary">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="font-montserrat text-xs font-bold uppercase tracking-wider border-blue-bright/20 text-text-secondary hover:text-foreground hover:bg-white/[0.04]">
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="font-montserrat text-xs font-bold uppercase tracking-wider bg-red-alert/20 text-red-alert border border-red-alert/40 hover:bg-red-alert/30 hover:border-red-alert/60 transition-all"
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
