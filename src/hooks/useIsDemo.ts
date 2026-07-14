import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/**
 * Retorna true se o usuário autenticado é a conta de demonstração/auditoria.
 * Baseado na flag `profiles.is_demo` (fonte da verdade no banco).
 * Também respeita o marker de sessão salvo pelo /demo para bloquear cedo antes
 * do fetch resolver.
 */
export function useIsDemo(): boolean {
  const { user } = useAuth();
  const [isDemo, setIsDemo] = useState<boolean>(() => {
    try { return sessionStorage.getItem("adm_demo_mode") === "1"; } catch { return false; }
  });

  useEffect(() => {
    if (!user) { setIsDemo(false); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("is_demo")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const v = !!(data as { is_demo?: boolean } | null)?.is_demo;
      setIsDemo(v);
      try {
        if (v) sessionStorage.setItem("adm_demo_mode", "1");
        else sessionStorage.removeItem("adm_demo_mode");
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [user]);

  return isDemo;
}
