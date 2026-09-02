# Roadmap — Plano único (R$ 39,90/mês · R$ 397,90/ano)

## Backend
- [x] `_shared/stripe-plans.ts`: removidos `raiz_mensal` / `raiz_anual`
- [x] `admin-dashboard`: VALID_PLANS sem raiz
- [x] Edge Functions legadas do Asaas removidas
- [x] Preços antigos (R$ 19,90 / R$ 197,90) desativados na Stripe
- [x] Assinatura ativa do plano antigo cancelada na Stripe
- [x] Acesso BETA gratuito (12 meses) concedido ao ex-assinante do plano antigo
- [x] Edge Functions reimplantadas

## Front — arquitetura de planos
- [x] `useSubscription.ts` / `usePlanLimits.ts` sem plano Criador
- [x] `AccountBillingPanel`, `PlanStatusCard`, `ManageAccountPage`,
      `CancelPlanPage`, `SubscriptionBanner`, `HelpDrawer`, `DropsCounterBadge`
- [x] `UpgradeIdrielDialog.tsx` removido
- [x] `AdminPage.tsx`: opções, filtros e métricas sem raiz
- [ ] `FundadorInvitePage.tsx`: revisar copy (plano de convite mantido)

## Páginas de venda
- [x] `/planos`: card único com toggle mensal/anual
- [x] `/` LandingPage: seção de planos com card único
- [ ] `/` LandingPage: aplicar a nova copy V4 completa (18 seções)
