import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SubscriptionInfo {
  plan: 'basico' | 'pro' | null;
  status: string | null;
  textUsed: number;
  textLimit: number;
  imageUsed: number;
  imageLimit: number;
  loading: boolean;
}

const PLAN_LIMITS = {
  basico: { text: 50, image: 10 },
  pro: { text: 200, image: 40 },
};

export function useSubscription(): SubscriptionInfo {
  const { user } = useAuth();
  const [info, setInfo] = useState<SubscriptionInfo>({
    plan: null, status: null,
    textUsed: 0, textLimit: 0,
    imageUsed: 0, imageLimit: 0,
    loading: true,
  });

  useEffect(() => {
    if (!user) {
      setInfo(prev => ({ ...prev, plan: null, status: null, loading: false }));
      return;
    }

    const fetch = async () => {
      // Get subscription
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('plan, status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      const plan = (sub?.plan as 'basico' | 'pro') || null;
      const limits = plan ? PLAN_LIMITS[plan] : { text: 0, image: 0 };

      // Get current month usage
      const month = new Date().toISOString().slice(0, 7);
      const { data: usage } = await supabase
        .from('ai_usage')
        .select('text_count, image_count')
        .eq('user_id', user.id)
        .eq('month', month)
        .maybeSingle();

      setInfo({
        plan,
        status: sub?.status || null,
        textUsed: usage?.text_count || 0,
        textLimit: limits.text,
        imageUsed: usage?.image_count || 0,
        imageLimit: limits.image,
        loading: false,
      });
    };

    fetch();
  }, [user]);

  return info;
}
