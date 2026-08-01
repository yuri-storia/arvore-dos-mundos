// Fonte única de verdade (servidor) para qualidade e custo das gerações visuais.
// Espelhado no cliente em `src/lib/imageQuality.ts` — mantenha os dois iguais.

export type QualityTier = "essencial" | "alta";
export type GenSurface = "gallery" | "map";

export interface QualityDef {
  tier: QualityTier;
  label: string;
  description: string;
  /** valor enviado ao provedor de imagem */
  quality: "medium" | "high";
  cost: number;
}

export const QUALITY_MATRIX: Record<GenSurface, Record<QualityTier, QualityDef>> = {
  gallery: {
    essencial: {
      tier: "essencial",
      label: "Essencial",
      description: "Excelente qualidade para explorar ideias.",
      quality: "medium",
      cost: 5,
    },
    alta: {
      tier: "alta",
      label: "Alta Fidelidade",
      description: "Mais refinamento e detalhes para resultados finais.",
      quality: "high",
      cost: 9,
    },
  },
  map: {
    essencial: {
      tier: "essencial",
      label: "Essencial",
      description: "Excelente qualidade para explorar ideias.",
      quality: "medium",
      cost: 7,
    },
    alta: {
      tier: "alta",
      label: "Alta Fidelidade",
      description: "Mais refinamento e detalhes para resultados finais.",
      quality: "high",
      cost: 10,
    },
  },
};

export function resolveQuality(surface: GenSurface, raw: unknown): QualityDef {
  const tier: QualityTier = raw === "alta" ? "alta" : "essencial";
  return QUALITY_MATRIX[surface][tier];
}

/** Pacote mensal de gotas do plano Idriel. */
export const IDRIEL_MONTHLY_DROPS = 150;
