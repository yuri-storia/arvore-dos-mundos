
## Escopo

Três entregas independentes em uma única implementação.

---

### 1. Barra contadora de gotas no AppHeader

Componente novo `DropsCounterBadge` colado ao lado do `UserMenu` no `AppHeader`. Sempre visível (desktop + mobile).

Conteúdo:
- Ícone de gota dourada + número `X / 100` (uso mensal Idriel) **ou** `X gotas` (recargas avulsas).
- Para usuários **Idriel** (mensal ou anual): mostra `restantes do mês + bônus`, com botão **"Adquirir Elixir"** que abre o `RechargePackageDialog` existente.
- Para usuários **sem Idriel** (Semente ou Raiz): mostra "Sem acesso à Idriel" com botão **"Upgrade Idriel"** que abre o novo `UpgradeIdrielDialog`.
- Para **admin**: mostra "∞" sem botão.

Detecção via `usePlanLimits` + `useSubscription` (já trazem `hasIdriel`, `plan_code`, `bonus_drops`, `creditsUsed`).

---

### 2. UpgradeIdrielDialog + cobrança Asaas

Novo componente `UpgradeIdrielDialog` que detecta o `plan_code` atual e mostra **apenas os caminhos aplicáveis**:

| Plano atual | Opção(ões) mostrada(s) | Cobrança |
|---|---|---|
| `raiz_mensal` | Idriel mensal (1º mês R$20, depois R$39,90) **ou** Idriel anual promocional R$329 | 2 fluxos |
| `raiz_anual` | Idriel anual (diferença R$200) | 1 fluxo |
| sem plano (Semente) | Redireciona para `/planos` | — |
| Idriel | Dialog não abre (usuário já tem) | — |

**Estratégia de cobrança no Asaas** (a mais limpa que respeita "nova assinatura com 1ª parcela diferenciada"):

- **Mensal R$20 → R$39,90/mês**: cria charge avulso de R$20 (`DETACHED`, PIX+cartão) e, no webhook ao confirmar pagamento, cria a `subscription` Idriel R$39,90 com `nextDueDate = hoje + 30 dias`. Cancela a assinatura Raiz mensal antiga.
- **Anual promocional R$329**: charge avulso `DETACHED` R$329. Webhook ativa Idriel com `expires_at = hoje + 365d` e cria subscription `YEARLY` R$397 com `nextDueDate = hoje + 365d`. Cancela Raiz antiga.
- **Anual→Anual diferença R$200**: charge avulso `DETACHED` R$200. Webhook estende `expires_at` para `+365d a partir do fim do ciclo Raiz atual` (ou hoje + 365d, o que for maior), marca `has_idriel=true`, cria subscription `YEARLY` R$397 com `nextDueDate` igual ao novo `expires_at`. Não cancela Raiz anual — substitui.

Implementação:
- **Frontend**: novo dialog + função `openUpgradeCheckout(upgradeCode)` em `useSubscription.ts`.
- **Edge function nova** `asaas-create-upgrade-checkout/index.ts` — análoga à `asaas-create-checkout` mas com SKUs internos: `upgrade_raiz_mensal_to_idriel_mensal`, `upgrade_raiz_mensal_to_idriel_anual`, `upgrade_raiz_anual_to_idriel_anual`. Cria charge `DETACHED` e grava `plan_code = <upgrade_code>` em `asaas_payments` para o webhook reconhecer.
- **Webhook**: adicionar ramo `if (plan_code.startsWith('upgrade_'))` que, ao receber `PAYMENT_CONFIRMED`/`PAYMENT_RECEIVED`, executa a transição correspondente (cancela sub antiga via Asaas API + cria nova + atualiza tabela `subscriptions`).

Validação server-side: edge function recupera o `plan_code` ativo do usuário antes de criar o checkout para rejeitar combinações inválidas (ex.: usuário Semente tentando comprar upgrade).

---

### 3. Tokens gold premium em "/" (landing)

Em `src/pages/Index.tsx`:
- Trocar todas as classes `bg-yellow-*`, `text-yellow-*`, `border-yellow-*`, `from-yellow-*`, `to-yellow-*`, `hover:bg-yellow-*` por tokens semânticos `gold` / `gold-light` / `gold-deep` / `gold-warm` (já definidos em `tailwind.config.ts`).
- Aplicar gradient `from-gold via-gold-warm to-gold-deep` nos CTAs principais.
- Manter aspectos amarelos APENAS se forem `red-alert` ou outro token semântico de aviso (não é o caso atual — varredura prévia confirmará).

---

## Detalhes técnicos

**Migração DB**: não precisa de migração nova — `subscriptions.plan_code`, `asaas_payments.plan_code` e `user_credit_balance.bonus_drops` já existem.

**Webhook idempotente**: já checa `asaas_payment_id` único; novos upgrades reusam mesma lógica.

**Cancelamento da sub antiga via Asaas**: usar `DELETE /v3/subscriptions/{id}` (já temos `asaas-cancel-subscription` como referência). Buscar `asaas_subscription_id` em `subscriptions` do usuário antes de cancelar.

**UI**: dialog usa `ConfirmDialog` aesthetic existente, com bloco destacando "Condição especial" para o R$329 e o R$20-primeiro-mês.

**Não toca em**: `asaas-create-checkout` (compras novas continuam iguais), `RechargePackageDialog` (já funcional).

---

## Ordem de execução

1. Substituir tokens amarelos em `Index.tsx` (mais barato, sem dependência).
2. Criar `UpgradeIdrielDialog` + `DropsCounterBadge`.
3. Plugar no `AppHeader`.
4. Edge function `asaas-create-upgrade-checkout`.
5. Estender `asaas-webhook` com ramo de upgrades.
6. Adicionar `openUpgradeCheckout` em `useSubscription.ts`.

Confirma que posso seguir nessa direção?
