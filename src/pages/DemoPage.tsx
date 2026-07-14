import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const DemoPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = params.get("token")?.trim();
    if (!token) {
      setError("missing_token");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        // Encerra qualquer sessão anterior para garantir isolamento.
        await supabase.auth.signOut({ scope: "local" }).catch(() => {});

        const { data, error: fnError } = await supabase.functions.invoke("demo-login", {
          body: { token },
        });
        if (cancelled) return;
        if (fnError || !data?.access_token) {
          setError(data?.error || fnError?.message || "invalid_token");
          return;
        }
        const { error: setErr } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });
        if (setErr) {
          setError(setErr.message);
          return;
        }
        try { sessionStorage.setItem("adm_demo_mode", "1"); } catch { /* ignore */ }
        navigate("/app", { replace: true });
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();
    return () => { cancelled = true; };
  }, [params, navigate]);

  if (!error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#02070d]">
        <div className="text-center">
          <div className="h-10 w-10 mx-auto rounded-full border-2 border-[hsl(var(--gold))] border-t-transparent animate-spin mb-4" />
          <p className="font-merriweather italic text-text-dim text-sm">
            Abrindo o Modo de Demonstração…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#02070d] px-6">
      <div className="max-w-md text-center border border-red-alert/30 bg-red-alert/5 rounded-lg p-8">
        <h1 className="font-cinzel text-2xl text-red-alert mb-3">Acesso não autorizado</h1>
        <p className="font-merriweather text-text-dim text-sm mb-6">
          O link de demonstração é inválido, expirou ou foi revogado.
        </p>
        <button
          onClick={() => navigate("/login", { replace: true })}
          className="px-4 py-2 rounded-full border border-blue-bright/40 text-blue-light hover:bg-blue-bright/10 text-xs font-montserrat uppercase tracking-wider"
        >
          Ir para o login
        </button>
      </div>
    </div>
  );
};

export default DemoPage;
