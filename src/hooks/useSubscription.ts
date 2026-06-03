import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Pricing plans (gateway será integrado depois — IDs prontos para mapear)
export const PLANS = {
  raiz_mensal: {
    id: "raiz_mensal",
    name: "Raiz",
    price: "R$ 19,90/mês",
    priceValue: 19.90,
    period: "mensal",
    hasIdriel: false,
  },
  raiz_anual: {
    id: "raiz_anual",
    name: "Raiz Anual",
    price: "R$ 197/ano",
    priceValue: 197,
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
    price: "R$ 397/ano",
    priceValue: 397,
    period: "anual",
    hasIdriel: true,
  },

  // Pacotes de recarga de Elixir dos Mundos (avulsos)
  recarga_15: {
    id: "recarga_15",
    name: "15 gotas",
    price: "R$ 4,90",
    priceValue: 4.90,
    drops: 15,
    period: "avulso",
    hasIdriel: false,
  },
  recarga_25: {
    id: "recarga_25",
    name: "25 gotas",
    price: "R$ 7,90",
    priceValue: 7.90,
    drops: 25,
    period: "avulso",
    hasIdriel: false,
  },
  recarga_50: {
    id: "recarga_50",
    name: "50 gotas",
    price: "R$ 14,90",
    priceValue: 14.90,
    drops: 50,
    period: "avulso",
    hasIdriel: false,
  },
  recarga_100: {
    id: "recarga_100",
    name: "100 gotas",
    price: "R$ 27,90",
    priceValue: 27.90,
    drops: 100,
    period: "avulso",
    hasIdriel: false,
  },
  recarga_200: {
    id: "recarga_200",
    name: "200 gotas",
    price: "R$ 54,90",
    priceValue: 54.90,
    drops: 200,
    period: "avulso",
    hasIdriel: false,
  },
  // Alias legado para compatibilidade
  recarga_seiva: {
    id: "recarga_100",
    name: "Recarga de Elixir",
    price: "R$ 27,90",
    priceValue: 27.90,
    drops: 100,
    period: "avulso",
    hasIdriel: false,
  },
} as const;

// Pacotes de recarga em ordem de exibição (UI)
export const RECHARGE_PACKAGES = [
  { id: "recarga_15",  drops: 15,  price: 4.90,  priceLabel: "R$ 4,90",  pricePerDrop: 0.327, badge: null },
  { id: "recarga_25",  drops: 25,  price: 7.90,  priceLabel: "R$ 7,90",  pricePerDrop: 0.316, badge: null },
  { id: "recarga_50",  drops: 50,  price: 14.90, priceLabel: "R$ 14,90", pricePerDrop: 0.298, badge: null },
  { id: "recarga_100", drops: 100, price: 27.90, priceLabel: "R$ 27,90", pricePerDrop: 0.279, badge: "Mais popular" },
  { id: "recarga_200", drops: 200, price: 54.90, priceLabel: "R$ 54,90", pricePerDrop: 0.275, badge: "Melhor custo-benefício" },
] as const;

export interface SubscriptionInfo {
  loading: boolean;
  subscribed: boolean;
  plan: 'template' | 'idriel' | null;
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

export function useSubscription(): SubscriptionInfo {
  const { user } = useAuth();
  const [info, setInfo] = useState<SubscriptionInfo>({
    loading: true,
    subscribed: false,
    plan: null,
    hasIdriel: false,
    hasTemplate: false,
    subscriptionEnd: null,
    active: false,
    creditsUsed: 0,
    creditLimit: CREDIT_LIMIT,
    bonusDrops: 0,
  });

  const checkSubscription = useCallback(async () => {
    if (!user) {
      setInfo(prev => ({ ...prev, loading: false, subscribed: false, plan: null, hasIdriel: false, hasTemplate: false, active: false, bonusDrops: 0 }));
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (error || !data) {
        setInfo(prev => ({ ...prev, loading: false }));
        return;
      }

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

      setInfo({
        loading: false,
        subscribed: !!data.subscribed,
        plan: data.plan,
        hasIdriel: !!data.has_idriel,
        hasTemplate: !!(data.has_template || data.has_idriel),
        subscriptionEnd: data.subscription_end,
        active: !!data.has_idriel,
        creditsUsed,
        creditLimit: CREDIT_LIMIT,
        bonusDrops: data.bonus_drops || 0,
      });
    } catch {
      setInfo(prev => ({ ...prev, loading: false }));
    }
  }, [user]);

  useEffect(() => {
    checkSubscription();
    const interval = setInterval(checkSubscription, 60_000);
    return () => clearInterval(interval);
  }, [checkSubscription]);

  return info;
}

// Asaas checkout — opens invoice URL in a new tab
export async function openCheckout(planId: string) {
  try {
    const { data, error } = await supabase.functions.invoke('asaas-create-checkout', {
      body: { planId },
    });
    if (error) throw error;
    if (data?.url) {
      window.open(data.url, '_blank', 'noopener,noreferrer');
    } else {
      throw new Error('Sem URL de pagamento');
    }
  } catch (e: any) {
    console.error('openCheckout error:', e);
    alert('Não foi possível abrir o pagamento: ' + (e?.message || 'erro desconhecido'));
  }
}

export async function openCustomerPortal() {
  if (!confirm('Deseja cancelar sua assinatura ativa? O acesso permanece até o fim do ciclo já pago.')) return;
  try {
    const { data, error } = await supabase.functions.invoke('asaas-cancel-subscription');
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

