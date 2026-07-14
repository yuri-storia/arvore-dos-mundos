import React, { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { useIsDemo } from "@/hooks/useIsDemo";

/**
 * Bloqueia rotas sensíveis (conta, admin, pagamentos) para a conta de
 * demonstração. Redireciona para /app e mostra um toast explicativo.
 */
export const DemoGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isDemo = useIsDemo();
  useEffect(() => {
    if (isDemo) {
      toast.info("Esta função está desativada no ambiente de demonstração.");
    }
  }, [isDemo]);
  if (isDemo) return <Navigate to="/app" replace />;
  return <>{children}</>;
};
