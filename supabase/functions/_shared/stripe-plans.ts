// Catálogo único de planos/recargas da Árvore dos Mundos na Stripe.
// Mantém os códigos internos (`plan_code`) já usados no banco.

export type PlanKind = "subscription" | "recharge";

export interface StripePlanDef {
  code: string;
  priceId: string;
  name: string;
  amount: number;
  kind: PlanKind;
  cycle?: "monthly" | "yearly";
  hasIdriel?: boolean;
  drops?: number;
  couponId?: string;
  /** Recarga/plano exige que o usuário já seja assinante Idriel */
  requiresIdriel?: boolean;
  /** Só acessível por link de convite */
  inviteOnly?: boolean;
}

export const STRIPE_PLANS: Record<string, StripePlanDef> = {
  raiz_mensal: {
    code: "raiz_mensal",
    priceId: "price_1Tz2d6Pqftrc5bEYkZsmRCu5",
    name: "Criador Mensal",
    amount: 19.9,
    kind: "subscription",
    cycle: "monthly",
    hasIdriel: false,
  },
  raiz_anual: {
    code: "raiz_anual",
    priceId: "price_1Tz2ffPqftrc5bEYVArxoa2i",
    name: "Criador Anual",
    amount: 197.9,
    kind: "subscription",
    cycle: "yearly",
    hasIdriel: false,
  },
  idriel_mensal: {
    code: "idriel_mensal",
    priceId: "price_1Tz2g4Pqftrc5bEYByZzhqfn",
    name: "Idriel Mensal",
    amount: 39.9,
    kind: "subscription",
    cycle: "monthly",
    hasIdriel: true,
  },
  idriel_anual: {
    code: "idriel_anual",
    priceId: "price_1Tz2gSPqftrc5bEYb1vl2xBV",
    name: "Idriel Anual",
    amount: 397.9,
    kind: "subscription",
    cycle: "yearly",
    hasIdriel: true,
  },
  fundador_mensal: {
    code: "fundador_mensal",
    priceId: "price_1Tz2g4Pqftrc5bEYByZzhqfn", // Idriel mensal
    couponId: "fundador-3-meses", // R$ 19,90 nos 3 primeiros meses
    name: "Membro Fundador Mensal",
    amount: 19.9,
    kind: "subscription",
    cycle: "monthly",
    hasIdriel: true,
    inviteOnly: true,
  },

  recarga_15: {
    code: "recarga_15",
    priceId: "price_1Tz2icPqftrc5bEYrWl8KRoc",
    name: "15 gotas de Elixir",
    amount: 4.9,
    kind: "recharge",
    drops: 15,
    requiresIdriel: true,
  },
  recarga_25: {
    code: "recarga_25",
    priceId: "price_1Tz2poPqftrc5bEY83jf1s2C",
    name: "25 gotas de Elixir",
    amount: 7.9,
    kind: "recharge",
    drops: 25,
    requiresIdriel: true,
  },
  recarga_50: {
    code: "recarga_50",
    priceId: "price_1Tz2q6Pqftrc5bEYwO43jMRw",
    name: "50 gotas de Elixir",
    amount: 14.9,
    kind: "recharge",
    drops: 50,
    requiresIdriel: true,
  },
  recarga_100: {
    code: "recarga_100",
    priceId: "price_1TzVtwPqftrc5bEYuYlIqdqy",
    name: "100 gotas de Elixir",
    amount: 28.9,
    kind: "recharge",
    drops: 100,
    requiresIdriel: true,
  },
  recarga_200: {
    code: "recarga_200",
    priceId: "price_1TzVuHPqftrc5bEYNBahGJun",
    name: "200 gotas de Elixir",
    amount: 56.9,
    kind: "recharge",
    drops: 200,
    requiresIdriel: true,
  },
};

export function planByPriceId(priceId: string): StripePlanDef | undefined {
  return Object.values(STRIPE_PLANS).find((p) => p.priceId === priceId);
}

/** Ranking usado para decidir upgrade x downgrade x troca de ciclo. */
export function planRank(plan: StripePlanDef): { tier: number; cycle: number } {
  return {
    tier: plan.hasIdriel ? 2 : 1,
    cycle: plan.cycle === "yearly" ? 2 : 1,
  };
}

export type PlanChangeDirection = "upgrade" | "downgrade" | "same";

/** Compara dois planos de assinatura: tier pesa mais que ciclo. */
export function comparePlans(from: StripePlanDef, to: StripePlanDef): PlanChangeDirection {
  const a = planRank(from);
  const b = planRank(to);
  if (a.tier !== b.tier) return b.tier > a.tier ? "upgrade" : "downgrade";
  if (a.cycle !== b.cycle) return b.cycle > a.cycle ? "upgrade" : "downgrade";
  return "same";
}

