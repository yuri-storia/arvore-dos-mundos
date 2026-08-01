import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Mail, CheckCircle2, Loader2 } from "lucide-react";
import Seo from "@/components/Seo";
import { supabase } from "@/integrations/supabase/client";

export default function ObrigadoPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const sessionId = params.get("session_id") || "";
  const [state, setState] = useState<"checking" | "valid" | "invalid">("checking");

  useEffect(() => {
    document.title = "Pagamento confirmado — Árvore dos Mundos";
  }, []);

  useEffect(() => {
    let active = true;
    if (!sessionId) {
      setState("invalid");
      return;
    }
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("verify-checkout-session", {
          body: { session_id: sessionId },
        });
        if (!active) return;
        setState(!error && data?.valid ? "valid" : "invalid");
      } catch {
        if (active) setState("invalid");
      }
    })();
    return () => {
      active = false;
    };
  }, [sessionId]);

  if (state === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#02070d" }}>
        <Loader2 className="w-6 h-6 animate-spin text-gold-champagne" />
      </div>
    );
  }

  if (state === "invalid") return <Navigate to="/" replace />;


  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-16" style={{ background: "#02070d" }}>
      <Seo
        title="Pagamento confirmado — Árvore dos Mundos"
        description="Confirmação de pagamento da Árvore dos Mundos."
        path="/obrigado"
        noindex
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="max-w-xl w-full text-center"
      >
        <div
          className="relative rounded-3xl p-10 sm:p-12 backdrop-blur-md"
          style={{
            background: "radial-gradient(ellipse at top, hsl(34 38% 30% / 0.18) 0%, hsl(214 60% 4% / 0.97) 70%)",
            border: "1px solid hsl(34 42% 50% / 0.35)",
            boxShadow: "0 30px 90px hsl(214 90% 2% / 0.7)",
          }}
        >
          <div className="mx-auto mb-6 w-16 h-16 rounded-full flex items-center justify-center bg-gradient-gold-premium shadow-[0_6px_28px_hsl(var(--gold-bronze)/0.55)]">
            <CheckCircle2 className="w-8 h-8 text-[#1a0f00]" strokeWidth={2.25} />
          </div>

          <p className="font-montserrat uppercase tracking-[0.32em] text-[10px] text-gold-champagne mb-3 flex items-center justify-center gap-2">
            <Sparkles className="w-3 h-3" />
            Pagamento confirmado
          </p>

          <h1 className="font-cinzel font-bold text-[clamp(1.8rem,4vw,2.6rem)] text-gradient-gold mb-5 leading-tight">
            Bem-vindo(a) à Árvore dos Mundos
          </h1>

          <p className="font-amiri text-text-secondary text-lg leading-relaxed mb-8">
            Recebemos seu pagamento. Em alguns instantes você receberá um <strong className="text-gold-cream">e-mail com seu link de acesso</strong> e o recibo da compra.
          </p>

          <div className="rounded-xl p-5 mb-8 text-left" style={{ background: "hsl(214 60% 8% / 0.6)", border: "1px solid hsl(34 42% 50% / 0.2)" }}>
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-gold-champagne mt-0.5 shrink-0" />
              <div>
                <p className="font-cinzel text-sm text-gold-cream mb-2">O que fazer agora:</p>
                <ol className="text-sm text-text-secondary space-y-1.5 font-amiri leading-relaxed list-decimal pl-4">
                  <li>Abra o e-mail que enviamos (verifique o spam!)</li>
                  <li>Clique no botão de acesso — entrada sem senha</li>
                  <li>Comece a construir seus mundos</li>
                </ol>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate("/login")}
            className="w-full py-3.5 rounded-xl bg-gradient-gold-premium text-[#1a0f00] font-montserrat font-bold uppercase tracking-[0.22em] text-[11px] shadow-[0_6px_24px_hsl(var(--gold-bronze)/0.4)] hover:-translate-y-0.5 transition-all"
          >
            Ir para a tela de login
          </button>

          <p className="text-xs text-muted-foreground mt-6">
            Não recebeu o e-mail em 5 minutos? Escreva para <a href="mailto:oi@arvoredosmundos.app" className="text-gold-champagne underline">oi@arvoredosmundos.app</a>.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
