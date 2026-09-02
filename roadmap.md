# Roadmap — Plano único (R$ 39,90/mês · R$ 397,90/ano)

## Backend
- [ ] `_shared/stripe-plans.ts`: remover `raiz_mensal` / `raiz_anual`
- [ ] `admin-dashboard`: VALID_PLANS sem raiz
- [ ] `asaas-create-checkout` / `asaas-webhook` (legado): remover raiz
- [ ] Migração: acesso BETA gratuito para art2soulz@gmail.com + cancelar assinatura Stripe dela

## Front — arquitetura de planos
- [ ] `useSubscription.ts`: PLANS sem raiz; aliases
- [ ] `usePlanLimits.ts`: remover RAIZ_LIMITS
- [ ] `AccountBillingPanel.tsx`, `PlanStatusCard.tsx`, `ManageAccountPage.tsx`,
      `CancelPlanPage.tsx`, `SubscriptionBanner.tsx`, `HelpDrawer.tsx`,
      `DropsCounterBadge.tsx`: sem Criador / sem upgrade de tier
- [ ] Remover `UpgradeIdrielDialog.tsx`
- [ ] `AdminPage.tsx`: opções e métricas sem raiz
- [ ] `FundadorInvitePage.tsx`: revisar copy de preço

## Páginas de venda
- [ ] `/planos`: card único com toggle mensal/anual (Copy V4)
- [ ] `/` LandingPage: nova copy V4 (18 seções) mantendo identidade atual
