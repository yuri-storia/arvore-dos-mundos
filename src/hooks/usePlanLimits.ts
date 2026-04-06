import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/contexts/AuthContext';

export interface PlanLimits {
  maxWorlds: number;
  maxFichas: number;
  maxArtigos: number;
  canExport: boolean;
  canUseAI: boolean;
  planLabel: string;
}

const SEMENTE_LIMITS: PlanLimits = {
  maxWorlds: 1,
  maxFichas: 5,
  maxArtigos: 1,
  canExport: false,
  canUseAI: false,
  planLabel: '🌱 Semente',
};

const RAIZ_LIMITS: PlanLimits = {
  maxWorlds: Infinity,
  maxFichas: Infinity,
  maxArtigos: Infinity,
  canExport: true,
  canUseAI: false,
  planLabel: '🌿 Raiz',
};

const IDRIEL_LIMITS: PlanLimits = {
  maxWorlds: Infinity,
  maxFichas: Infinity,
  maxArtigos: Infinity,
  canExport: true,
  canUseAI: true,
  planLabel: '✨ Idriel',
};

const ADMIN_LIMITS: PlanLimits = {
  maxWorlds: Infinity,
  maxFichas: Infinity,
  maxArtigos: Infinity,
  canExport: true,
  canUseAI: true,
  planLabel: '👑 Admin',
};

export function usePlanLimits(): PlanLimits & { loading: boolean } {
  const { isAdmin } = useAuth();
  const sub = useSubscription();

  if (sub.loading) {
    return { ...SEMENTE_LIMITS, loading: true };
  }

  // Admin bypass — full access
  if (isAdmin) {
    return { ...ADMIN_LIMITS, loading: false };
  }

  // Idriel plan
  if (sub.hasIdriel) {
    return { ...IDRIEL_LIMITS, loading: false };
  }

  // Raiz / template plan
  if (sub.subscribed && sub.plan === 'template') {
    return { ...RAIZ_LIMITS, loading: false };
  }

  // Free tier (Semente)
  return { ...SEMENTE_LIMITS, loading: false };
}
