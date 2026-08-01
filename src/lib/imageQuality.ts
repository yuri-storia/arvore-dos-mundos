// Fonte única de verdade (cliente) para qualidade e custo das gerações visuais.
// Espelhado no servidor em `supabase/functions/_shared/image-quality.ts`.

export type QualityTier = 'essencial' | 'alta';
export type GenSurface = 'gallery' | 'map';

export interface QualityOption {
  tier: QualityTier;
  label: string;
  description: string;
  cost: number;
}

export const QUALITY_MATRIX: Record<GenSurface, Record<QualityTier, QualityOption>> = {
  gallery: {
    essencial: { tier: 'essencial', label: 'Essencial', description: 'Excelente qualidade para explorar ideias.', cost: 5 },
    alta: { tier: 'alta', label: 'Alta Fidelidade', description: 'Mais refinamento e detalhes para resultados finais.', cost: 9 },
  },
  map: {
    essencial: { tier: 'essencial', label: 'Essencial', description: 'Excelente qualidade para explorar ideias.', cost: 7 },
    alta: { tier: 'alta', label: 'Alta Fidelidade', description: 'Mais refinamento e detalhes para resultados finais.', cost: 10 },
  },
};

export const qualityOptions = (surface: GenSurface): QualityOption[] => [
  QUALITY_MATRIX[surface].essencial,
  QUALITY_MATRIX[surface].alta,
];

export const qualityCost = (surface: GenSurface, tier: QualityTier) => QUALITY_MATRIX[surface][tier].cost;

/** Pacote mensal de gotas do plano Idriel. */
export const IDRIEL_MONTHLY_DROPS = 150;
