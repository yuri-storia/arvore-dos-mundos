import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/contexts/AuthContext';

export interface PlanLimits {
  maxWorlds: number;
  maxFichas: number;
  maxArtigos: number;
  canExport: boolean;
  canUseAI: boolean;
  /** Pode criar novos Mundos (bloqueado em plano expirado / Semente) */
  canCreateWorld: boolean;
  /** Pode criar novas Fichas (bloqueado em plano expirado / Semente) */
  canCreateFicha: boolean;
  /** Pode criar novos Artigos (bloqueado em plano expirado / Semente) */
  canCreateArtigo: boolean;
  /** Pode adicionar imagens à Galeria (bloqueado em plano expirado / Semente) */
  canUploadGallery: boolean;
  /** Acesso à aba Escrever (sempre liberado — manuscritos do usuário ficam preservados) */
  canWrite: boolean;
  /** Plano já existiu mas não está ativo agora — usado para mensagens "plano expirado" */
  isExpired: boolean;
  planLabel: string;
}

const SEMENTE_LIMITS: PlanLimits = {
  maxWorlds: 0,
  maxFichas: 0,
  maxArtigos: 0,
  canExport: false,
  canUseAI: false,
  canCreateWorld: false,
  canCreateFicha: false,
  canCreateArtigo: false,
  canUploadGallery: false,
  canWrite: true,
  isExpired: false,
  planLabel: 'Sem plano',
};

const RAIZ_LIMITS: PlanLimits = {
  maxWorlds: Infinity,
  maxFichas: Infinity,
  maxArtigos: Infinity,
  canExport: true,
  canUseAI: false,
  canCreateWorld: true,
  canCreateFicha: true,
  canCreateArtigo: true,
  canUploadGallery: true,
  canWrite: true,
  isExpired: false,
  planLabel: 'Raiz',
};

const IDRIEL_LIMITS: PlanLimits = {
  maxWorlds: Infinity,
  maxFichas: Infinity,
  maxArtigos: Infinity,
  canExport: true,
  canUseAI: true,
  canCreateWorld: true,
  canCreateFicha: true,
  canCreateArtigo: true,
  canUploadGallery: true,
  canWrite: true,
  isExpired: false,
  planLabel: 'Idriel',
};

const ADMIN_LIMITS: PlanLimits = {
  maxWorlds: Infinity,
  maxFichas: Infinity,
  maxArtigos: Infinity,
  canExport: true,
  canUseAI: true,
  canCreateWorld: true,
  canCreateFicha: true,
  canCreateArtigo: true,
  canUploadGallery: true,
  canWrite: true,
  isExpired: false,
  planLabel: 'Admin',
};

// Plano expirado: como Semente, mas exportação permanece liberada para evitar
// fricção em migração. Escrever segue liberado.
const EXPIRED_LIMITS: PlanLimits = {
  ...SEMENTE_LIMITS,
  canExport: true,
  isExpired: true,
  planLabel: 'Plano expirado',
};

export function usePlanLimits(): PlanLimits & { loading: boolean } {
  const { isAdmin } = useAuth();
  const sub = useSubscription();

  if (sub.loading) {
    return { ...SEMENTE_LIMITS, loading: true };
  }

  if (isAdmin) {
    return { ...ADMIN_LIMITS, loading: false };
  }

  if (sub.hasIdriel) {
    return { ...IDRIEL_LIMITS, loading: false };
  }

  if (sub.subscribed && sub.plan === 'template') {
    return { ...RAIZ_LIMITS, loading: false };
  }

  // Sem assinatura ativa: se já houve plano (plan_code presente), trata como expirado.
  if (sub.plan_code) {
    return { ...EXPIRED_LIMITS, loading: false };
  }

  return { ...SEMENTE_LIMITS, loading: false };
}
