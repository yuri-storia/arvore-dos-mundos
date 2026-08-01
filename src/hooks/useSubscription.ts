import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Pricing plans (gateway será integrado depois — IDs prontos para mapear)
// Códigos internos "raiz_*" foram mantidos para preservar dados no DB/Asaas,
// mas o nome comercial passou a ser "Criador".
export const PLANS = {
  raiz_mensal: {
    id: "raiz_mensal",
    name: "Criador",
    price: "R$ 19,90/mês",
    priceValue: 19.90,
    period: "mensal",
    hasIdriel: false,
  },
  raiz_anual: {
    id: "raiz_anual",
    name: "Criador Anual",
    price: "R$ 197,90/ano",
    priceValue: 197.90,
    period: "anual",
    hasIdriel: false,
  },
  idriel_mensal: {
    id: "idriel_mensal",
    name: "Idriel",
    price: "R$ 39,90/mês",
    priceValue: 39.90,
    period: "mensal",
    hasIdriel: true,
  },
  idriel_anual: {
    id: "idriel_anual",
    name: "Idriel Anual",
    price: "R$ 397,90/ano",
    priceValue: 397.90,
    period: "anual",
    hasIdriel: true,
  },

  // Plano exclusivo — só via convite do fundador
  fundador_mensal: {
    id: "fundador_mensal",
    name: "Membro Fundador",
    price: "R$ 19,90/mês (3 meses), depois R$ 39,90/mês",
    priceValue: 19.90,
    period: "mensal",
    hasIdriel: true,
  },

  // Pacotes de recarga de Elixir dos Mundos (avulsos)
  recarga_15: { id: "recarga_15", name: "15 gotas", price: "R$ 4,90", priceValue: 4.90, drops: 15, period: "avulso", hasIdriel: false },
  recarga_25: { id: "recarga_25", name: "25 gotas", price: "R$ 7,90", priceValue: 7.90, drops: 25, period: "avulso", hasIdriel: false },
  recarga_50: { id: "recarga_50", name: "50 gotas", price: "R$ 14,90", priceValue: 14.90, drops: 50, period: "avulso", hasIdriel: false },
  recarga_100: { id: "recarga_100", name: "100 gotas", price: "R$ 28,90", priceValue: 28.90, drops: 100, period: "avulso", hasIdriel: false },
  recarga_200: { id: "recarga_200", name: "200 gotas", price: "R$ 56,90", priceValue: 56.90, drops: 200, period: "avulso", hasIdriel: false },
  recarga_seiva: { id: "recarga_100", name: "Recarga de Elixir", price: "R$ 28,90", priceValue: 28.90, drops: 100, period: "avulso", hasIdriel: false },
} as const;

// Pacotes de recarga em ordem de exibição (UI)
export const RECHARGE_PACKAGES = [
  { id: "recarga_15",  drops: 15,  price: 4.90,  priceLabel: "R$ 4,90",  pricePerDrop: 0.327, badge: null },
  { id: "recarga_25",  drops: 25,  price: 7.90,  priceLabel: "R$ 7,90",  pricePerDrop: 0.316, badge: null },
  { id: "recarga_50",  drops: 50,  price: 14.90, priceLabel: "R$ 14,90", pricePerDrop: 0.298, badge: null },
  { id: "recarga_100", drops: 100, price: 28.90, priceLabel: "R$ 28,90", pricePerDrop: 0.279, badge: "Mais popular" },
  { id: "recarga_200", drops: 200, price: 56.90, priceLabel: "R$ 56,90", pricePerDrop: 0.275, badge: "Melhor custo-benefício" },
] as const;

export interface SubscriptionInfo {
  loading: boolean;
  subscribed: boolean;
  plan: 'template' | 'idriel' | null;
  plan_code: string | null;
  hasIdriel: boolean;
  hasTemplate: boolean;
  subscriptionEnd: string | null;
  // Legacy compat
  active: boolean;
  creditsUsed: number;
  creditLimit: number;
  bonusDrops: number;
}

const CREDIT_LIMIT = 100;
const IMAGE_CREDIT_COST = 5;

const EMPTY_INFO: SubscriptionInfo = {
  loading: true,
  subscribed: false,
  plan: null,
  plan_code: null,
  hasIdriel: false,
  hasTemplate: false,
  subscriptionEnd: null,
  active: false,
  creditsUsed: 0,
  creditLimit: CREDIT_LIMIT,
  bonusDrops: 0,
};

const NO_USER_INFO: SubscriptionInfo = { ...EMPTY_INFO, loading: false };

// React Query compartilha o resultado entre TODOS os componentes que
// chamam useSubscription (DropsCounterBadge, SubscriptionBanner,
// usePlanLimits, abas etc.). Antes, cada montagem disparava uma
// invocação separada da função check-subscription + um SELECT em
// ai_usage — chegando a 195k chamadas/24h em logs.
export function useSubscription(): SubscriptionInfo {
  const { user } = useAuth();

  const { data } = useQuery<SubscriptionInfo>({
    queryKey: ['subscription', user?.id ?? null],
    enabled: !!user,
    staleTime: 60_000,         // 1 min — alinhado ao antigo polling
    gcTime: 5 * 60_000,
    refetchInterval: 60_000,   // mantém o refresh, mas agora compartilhado
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<SubscriptionInfo> => {
      if (!user) return NO_USER_INFO;
      try {
        const { data, error } = await supabase.functions.invoke('check-subscription');
        if (error || !data) return { ...EMPTY_INFO, loading: false };

        let creditsUsed = 0;
        if (data.has_idriel) {
          const month = new Date().toISOString().slice(0, 7);
          const { data: usage } = await supabase
            .from('ai_usage')
            .select('text_count, image_count')
            .eq('user_id', user.id)
            .eq('month', month)
            .maybeSingle();
          const textCount = usage?.text_count || 0;
          const imageCount = usage?.image_count || 0;
          creditsUsed = textCount + (imageCount * IMAGE_CREDIT_COST);
        }

        return {
          loading: false,
          subscribed: !!data.subscribed,
          plan: data.plan,
          plan_code: data.plan_code || null,
          hasIdriel: !!data.has_idriel,
          hasTemplate: !!(data.has_template || data.has_idriel),
          subscriptionEnd: data.subscription_end,
          active: !!data.has_idriel,
          creditsUsed,
          creditLimit: CREDIT_LIMIT,
          bonusDrops: data.bonus_drops || 0,
        };
      } catch {
        return { ...EMPTY_INFO, loading: false };
      }
    },
  });

  if (!user) return NO_USER_INFO;
  return data ?? EMPTY_INFO;
}

// Stripe Checkout — redireciona na mesma aba para o checkout hospedado da Stripe.
// Assinaturas funcionam com OU sem login (a conta é criada após o pagamento).
// Recargas de Elixir exigem login + plano Idriel ativo.
export async function openCheckout(planId: string, invite?: string) {
  try {
    const { data, error } = await supabase.functions.invoke('stripe-create-checkout', {
      body: { planId, invite },
    });

    if (error) {
      console.error('openCheckout error:', error);
      alert('Não foi possível abrir o pagamento: ' + (error.message || 'erro desconhecido'));
      return;
    }

    if (data?.url) {
      window.location.href = data.url;
      return;
    }
    alert('Não foi possível abrir o pagamento: resposta inválida.');
  } catch (e: any) {
    console.error('openCheckout error:', e);
    alert('Não foi possível abrir o pagamento: ' + (e?.message || 'erro desconhecido'));
  }
}



export async function openCustomerPortal() {
  if (!confirm('Deseja cancelar sua assinatura ativa? O acesso permanece até o fim do ciclo já pago.')) return;
  try {
    const { data, error } = await supabase.functions.invoke('cancel-subscription');
    if (error) throw error;
    alert('Assinatura cancelada. O acesso continua até o fim do ciclo já pago.');
  } catch (e: any) {
    console.error('cancel error:', e);
    alert('Não foi possível cancelar agora: ' + (e?.message || 'erro desconhecido'));
  }
}

// Plan id aliases for older components
export const STRIPE_PLANS = {
  idriel_mensal:  { price_id: PLANS.idriel_mensal.id },
  idriel_anual:   { price_id: PLANS.idriel_anual.id },
  template_anual: { price_id: PLANS.raiz_anual.id },
  raiz_mensal:    { price_id: PLANS.raiz_mensal.id },
  recarga_seiva:  { price_id: PLANS.recarga_seiva.id },
};

