import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/contexts/AuthContext';

export interface PlanLimits {
  maxWorlds: number;
  maxFichas: number;
  maxArtigos: number;
  canExport: boolean;
  canUseAI: boolean;
  /** Pode criar novos Mundos (bloqueado em plano expirado / cancelado / Semente) */
  canCreateWorld: boolean;
  /** Pode criar novas Fichas (bloqueado em plano expirado / cancelado / Semente) */
  canCreateFicha: boolean;
  /** Pode criar novos Artigos (bloqueado em plano expirado / cancelado / Semente) */
  canCreateArtigo: boolean;
  /** Pode adicionar imagens à Galeria (bloqueado em plano expirado / cancelado / Semente) */
  canUploadGallery: boolean;
  /** Pode comprar recargas avulsas de Elixir (somente plano Idriel) */
  canRecharge: boolean;
  /** Acesso à aba Escrever (sempre liberado para leitura/exportação) */
  canWrite: boolean;
  /** Pode editar qualquer conteúdo (fichas, artigos, manuscritos). Bloqueado em plano expirado/cancelado. */
  canEdit: boolean;
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
  canRecharge: false,
  canWrite: true,
  canEdit: false,
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
  canRecharge: false,
  canWrite: true,
  canEdit: true,
  isExpired: false,
  planLabel: 'Criador',
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
  canRecharge: true,
  canWrite: true,
  canEdit: true,
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
  canRecharge: true,
  canWrite: true,
  canEdit: true,
  isExpired: false,
  planLabel: 'Admin',
};

// Plano expirado / cancelado: leitura + exportação PDF liberadas, mas
// nenhuma edição ou criação de conteúdo. Escrever segue acessível como leitura.
const EXPIRED_LIMITS: PlanLimits = {
  ...SEMENTE_LIMITS,
  canExport: true,
  canEdit: false,
  isExpired: true,
  planLabel: 'Plano cancelado',
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
