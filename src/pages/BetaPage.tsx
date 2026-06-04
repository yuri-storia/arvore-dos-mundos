import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, Loader2, CheckCircle2, AlertCircle, Apple } from 'lucide-react';
import { openCheckout } from '@/hooks/useSubscription';

type Status = 'idle' | 'loading' | 'success' | 'already' | 'error';

const BetaPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const code = (params.get('code') || '').trim().toUpperCase();
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<{ raiz_granted_until?: string; idriel_discount_until?: string }>({});

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate(`/login?next=${encodeURIComponent('/beta?code=' + code)}`, { replace: true });
      return;
    }
    if (!code) {
      setStatus('error');
      setMessage('Nenhum código informado. Verifique o link recebido.');
      return;
    }
    void redeem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, code]);

  const redeem = async () => {
    setStatus('loading');
    try {
      const { data, error } = await supabase.functions.invoke('redeem-beta-code', {
        body: { code },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data);
      setStatus(data.already ? 'already' : 'success');
    } catch (e: any) {
      setStatus('error');
      setMessage(e?.message || 'Não foi possível validar o código.');
    }
  };

  const fmt = (iso?: string) => iso ? new Date(iso).toLocaleDateString('pt-BR') : '—';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-xl w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-gold/20 to-gold/5 border-2 border-gold/30 mb-4">
            <Apple className="w-8 h-8 text-gold-champagne" strokeWidth={1.5} />
          </div>
          <h1 className="font-cinzel font-bold text-3xl text-gradient-gold mb-2">Beta da Árvore</h1>
          <p className="font-merriweather italic text-text-secondary">
            Bem-vindo ao programa de testes da comunidade.
          </p>
        </div>

        <div className="rounded-xl border border-gold/20 bg-gold/[0.03] p-6">
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="w-8 h-8 text-gold animate-spin" />
              <p className="font-merriweather text-text-secondary">Validando código <span className="font-bold text-gold-light">{code}</span>…</p>
            </div>
          )}

          {(status === 'success' || status === 'already') && (
            <div className="text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" strokeWidth={1.5} />
              <h2 className="font-cinzel font-bold text-xl text-foreground mb-2">
                {status === 'already' ? 'Você já está no beta!' : 'Acesso liberado!'}
              </h2>
              <ul className="text-left max-w-md mx-auto space-y-2 mb-6 font-merriweather text-sm text-text-secondary">
                <li className="flex gap-2"><Sparkles className="w-4 h-4 text-gold-champagne shrink-0 mt-0.5" />
                  Plano <strong className="text-gold-light">Raiz gratuito</strong> até <strong>{fmt(result.raiz_granted_until)}</strong>.
                </li>
                <li className="flex gap-2"><Sparkles className="w-4 h-4 text-gold-champagne shrink-0 mt-0.5" />
                  Depois disso, até <strong>3 cobranças avulsas</strong> de Idriel por <strong className="text-gold-light">R$ 19,90</strong> cada, válidas até <strong>{fmt(result.idriel_discount_until)}</strong>.
                </li>
                <li className="flex gap-2"><Sparkles className="w-4 h-4 text-gold-champagne shrink-0 mt-0.5" />
                  Em seguida, preço normal: R$ 19,90/mês Raiz ou R$ 39,90/mês Idriel.
                </li>
              </ul>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Link
                  to="/"
                  className="px-5 py-2.5 rounded-full bg-gradient-to-r from-gold to-gold-light text-background text-xs font-montserrat font-bold uppercase tracking-wider hover:shadow-[0_0_20px_rgba(218,165,32,0.3)] transition-all"
                >
                  Entrar na Árvore
                </Link>
                <button
                  onClick={() => openCheckout('beta_idriel_avulso')}
                  className="px-5 py-2.5 rounded-full border border-gold/40 text-gold-light text-xs font-montserrat font-bold uppercase tracking-wider hover:bg-gold/10 transition-all"
                >
                  Adquirir Idriel Beta (R$ 19,90)
                </button>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center py-4">
              <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-2" strokeWidth={1.5} />
              <p className="font-merriweather text-destructive mb-4">{message}</p>
              <Link to="/planos" className="text-xs font-montserrat uppercase text-gold-light hover:underline">
                Ver planos disponíveis →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BetaPage;
