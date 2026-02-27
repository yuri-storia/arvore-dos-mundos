import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SubscriptionInfo {
  active: boolean;
  creditsUsed: number;
  creditLimit: number;
  loading: boolean;
}

const CREDIT_LIMIT = 100;
const IMAGE_CREDIT_COST = 5;

export function useSubscription(): SubscriptionInfo {
  const { user } = useAuth();
  const [info, setInfo] = useState<SubscriptionInfo>({
    active: false, creditsUsed: 0, creditLimit: CREDIT_LIMIT, loading: true,
  });

  useEffect(() => {
    if (!user) {
      setInfo({ active: false, creditsUsed: 0, creditLimit: CREDIT_LIMIT, loading: false });
      return;
    }

    const fetch = async () => {
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

      setInfo({ active, creditsUsed, creditLimit: CREDIT_LIMIT, loading: false });
    };

    fetch();
  }, [user]);

  return info;
}
