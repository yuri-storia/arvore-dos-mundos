import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Stripe product/price IDs
// Pricing plans (gateway: Asaas — IDs will be set after integration)
export const PLANS = {
  raiz_anual: {
    id: "raiz_anual",
    name: "🌱 Raiz",
    price: "R$ 87/ano",
    priceValue: 87,
    period: "anual",
    hasIdriel: false,
  },
  idriel_mensal: {
    id: "idriel_mensal",
    name: "✨ Idriel",
    price: "R$ 29,90/mês",
    priceValue: 29.90,
    period: "mensal",
    hasIdriel: true,
  },
  idriel_anual: {
    id: "idriel_anual",
    name: "✨ Idriel Anual",
    price: "R$ 279/ano",
    priceValue: 279,
    period: "anual",
    hasIdriel: true,
  },
  recarga_seiva: {
    id: "recarga_seiva",
    name: "🧪 Recarga de Seiva",
    price: "R$ 15,00",
    priceValue: 15,
    period: "avulso",
    hasIdriel: false,
  },
} as const;

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
  });

  const checkSubscription = useCallback(async () => {
    if (!user) {
      setInfo(prev => ({ ...prev, loading: false, subscribed: false, plan: null, hasIdriel: false, hasTemplate: false, active: false }));
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error || !data) {
        // Fallback to legacy subscription table
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('plan, status')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();

        const active = !!sub;

        const month = new Date().toISOString().slice(0, 7);
        const { data: usage } = await supabase
          .from('ai_usage')
          .select('text_count, image_count')
          .eq('user_id', user.id)
          .eq('month', month)
          .maybeSingle();

        const textCount = usage?.text_count || 0;
        const imageCount = usage?.image_count || 0;
        const creditsUsed = textCount + (imageCount * IMAGE_CREDIT_COST);

        setInfo({
          loading: false,
          subscribed: active,
          plan: active ? 'idriel' : null,
          hasIdriel: active,
          hasTemplate: active,
          subscriptionEnd: null,
          active,
          creditsUsed,
          creditLimit: CREDIT_LIMIT,
        });
        return;
      }

      // Fetch credits for idriel users
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
        subscribed: data.subscribed,
        plan: data.plan,
        hasIdriel: data.has_idriel || false,
        hasTemplate: data.has_template || data.has_idriel || false,
        subscriptionEnd: data.subscription_end,
        active: data.has_idriel || false,
        creditsUsed,
        creditLimit: CREDIT_LIMIT,
      });
    } catch {
      setInfo(prev => ({ ...prev, loading: false }));
    }
  }, [user]);

  useEffect(() => {
    checkSubscription();

    // Auto-refresh every 60s
    const interval = setInterval(checkSubscription, 60_000);
    return () => clearInterval(interval);
  }, [checkSubscription]);

  return info;
}

export async function openCheckout(priceId: string, mode: 'subscription' | 'payment' = 'subscription') {
  const { data, error } = await supabase.functions.invoke('create-checkout', {
    body: { priceId, mode },
  });
  if (error) throw new Error(error.message);
  if (data?.url) {
    window.open(data.url, '_blank');
  }
}

export async function openCustomerPortal() {
  const { data, error } = await supabase.functions.invoke('customer-portal');
  if (error) throw new Error(error.message);
  if (data?.url) {
    window.open(data.url, '_blank');
  }
}
