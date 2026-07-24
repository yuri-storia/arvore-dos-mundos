## Escopo

São 6 entregas interdependentes. Vou implementar em ordem para minimizar retrabalho.

---

### 1. Página **Gerenciar Minha Conta** (`/minha-conta`)

Substitui o destino atual do botão "Gerenciar" (hoje vai direto para `/cancelar-plano`).

**Conteúdo da página:**
- Card do plano ativo (nome, ciclo, próxima cobrança, benefícios) — reaproveita `PlanStatusCard`.
- **Limites atuais em tempo real**: mundos usados/limite, entradas no Codex, manuscritos — consulta o Supabase e compara com `usePlanLimits`.
- **Saldo de Elixir** (usadas no mês + bônus/recargas disponíveis) — vem do item 4.
- **Ações**: Upgrade (→ `/planos`), Downgrade (→ `/planos` com destaque no plano inferior), Recargas avulsas (abre `RechargePackageDialog`), Cancelar (→ `/cancelar-plano`).
- **Histórico de pagamentos e recargas** (item 4).

O botão "Gerenciar" em `PlanStatusCard` e `SubscriptionBanner` passa a apontar para `/minha-conta`.

---

### 2. Exportações premium (PDF/DOCX/EPUB)

Redesenhar o layout dos arquivos gerados em `src/lib/manuscriptExport.ts` e `src/lib/codexPdfExport.ts`.

**Manuscrito (PDF):**
- Capa com título, subtítulo do mundo, autor (display_name) e marca discreta "Árvore dos Mundos".
- Sumário automático com números de página.
- Tipografia serifada, entrelinha 1.6, capítulos começando em página nova com número + título hierárquico.
- Cabeçalho com título do manuscrito, rodapé com número de página.

**Codex (PDF):**
- Capa "Compêndio do Mundo — <nome>".
- Sumário agrupado por Fruto.
- Fichas e Artigos com card sóbrio, chip do Fruto colorido, imagem quando houver.

**DOCX/EPUB:** aplicar mesma hierarquia (Heading 1/2, quebras de página, estilos).

Sem mudar assinaturas públicas — só melhora visual.

---

### 3. Auditoria de bloqueio pós-cancelamento

Já existe `plan.canEdit`. Vou:
- Varrer todos os hooks/componentes que fazem `update`/`insert`/`delete` e adicionar guarda `canEdit` + toast "Assinatura inativa" antes da chamada ao Supabase.
- Alvos: `useCodexEntries` (create/update/delete), `useWorlds` (update), `useManuscript` (create/update/delete chapter e manuscript), `useTimelineEvents`, `useStorylines`, `useStorylineCards`, `useIdrielVisions`, `useMapHistory`, `useFreeWritings`.
- Botões de "criar/editar/deletar" ficam com aparência desabilitada quando `!canEdit`.
- Reforço no servidor: trigger `enforce_plan_creation` já bloqueia INSERT em worlds/codex quando não há assinatura ativa; vou estendê-lo para bloquear também UPDATE nas tabelas de conteúdo (`worlds`, `codex_entries`, `chapters`, `manuscripts`, `timeline_events`, `storylines`, `storyline_cards`, `free_writings`).

---

### 4. Histórico de recargas + saldo auditável de Elixir

**DB:**
- `user_credit_balance` já tem `bonus_drops`. Vou adicionar `total_purchased`, `total_consumed` para saldo auditável.
- Nova tabela `elixir_ledger` (append-only): `id, user_id, kind ('recharge'|'consume'|'monthly_grant'|'bonus'), delta int, balance_after int, reference text, created_at`.
- Trigger em `asaas_payments` (quando `kind='recharge'` e `status` vira paga): insere linha no ledger e credita `bonus_drops`.
- Função `consume_drops(_user_id, _amount, _reference)` que decrementa e registra no ledger — chamada pelas edge functions de IA em vez do `increment_ai_usage` isolado.

**Realtime:**
- Habilitar Realtime em `user_credit_balance` e `elixir_ledger`.
- Hook novo `useElixirBalance()` subscreve mudanças e atualiza contador em tempo real (o `DropsCounterBadge` passa a usar isso).

**UI:**
- Seção "Histórico de Elixir" dentro de `/minha-conta` listando compras e consumos com data/hora.

---

### 5. Webhooks do Asaas (sincronização servidor)

Já existe `asaas-webhook`. Vou auditar e completar:
- Confirmar tratamento de eventos: `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, `PAYMENT_REFUNDED`, `SUBSCRIPTION_CANCELLED`, `SUBSCRIPTION_UPDATED`.
- Validar assinatura via header `asaas-access-token` = `ASAAS_WEBHOOK_TOKEN`.
- Ao confirmar pagamento de assinatura: `subscriptions.status='active'`, atualizar `expires_at`.
- Ao cancelar ou vencer: `status='cancelled'|'expired'`.
- Ao confirmar recarga: credita ledger + `bonus_drops`.
- Idempotência via `webhook_events` (tabela já existe).
- Notificar frontend via Realtime na tabela `subscriptions` (habilitar).

URL do webhook: `https://<project>.supabase.co/functions/v1/asaas-webhook`. Vou entregar a URL e o token que o usuário já configurou.

---

### 6. Fluxo de upgrade no HelpDrawer

Substituir o CTA atual de upgrade no `HelpDrawer` por um mini-fluxo:
- Se plano < Idriel: mostra card "Ganhe com Idriel" listando benefícios exclusivos (IAs, geração de imagens, 100 gotas/mês, importação automática).
- Botão "Fazer upgrade" abre `ConfirmDialog` mostrando: preço, o que muda, e só então chama `openCheckout('idriel_mensal'|'idriel_anual')`.
- Escolha entre mensal e anual dentro do próprio dialog (com selo de economia no anual).

---

### Detalhes técnicos

**Ordem de execução:**
1. Migração DB (ledger, colunas em `user_credit_balance`, triggers de bloqueio, realtime).
2. Webhook `asaas-webhook` — completar handlers.
3. `useElixirBalance` + `DropsCounterBadge` real-time.
4. Página `/minha-conta` (rota, componente, integração com hooks).
5. Guardas `canEdit` nos hooks/componentes de conteúdo.
6. Upgrade dialog no `HelpDrawer`.
7. Exportações premium (PDF/DOCX/EPUB).

**Arquivos principais criados/modificados:**
- Migração SQL (nova tabela `elixir_ledger`, colunas, triggers, realtime).
- `supabase/functions/asaas-webhook/index.ts` (revisão completa).
- `src/hooks/useElixirBalance.ts` (novo).
- `src/hooks/useAccountUsage.ts` (novo — conta mundos/codex/manuscritos).
- `src/pages/ManageAccountPage.tsx` (novo).
- `src/App.tsx` (rota `/minha-conta`).
- `src/components/PlanStatusCard.tsx` + `SubscriptionBanner.tsx` (destino do "Gerenciar").
- `src/components/UpgradeConfirmDialog.tsx` (novo).
- `src/components/HelpDrawer.tsx` (integrar dialog).
- Hooks de conteúdo: guardas `canEdit`.
- `src/lib/manuscriptExport.ts`, `src/lib/codexPdfExport.ts` (redesign visual).
- `src/components/DropsCounterBadge.tsx` (usar `useElixirBalance`).

**Custos e riscos:**
- Migração toca em triggers de UPDATE em várias tabelas — vou testar com plano ativo para não bloquear usuários pagos.
- `elixir_ledger` cresce sem parar; sem retenção agora (baixo volume esperado).
- Redesign de PDF pode aumentar tempo de geração; ainda é síncrono no cliente, então mantenho leve.

**Fora de escopo:**
- Downgrade automático entre planos no Asaas (mantido como link para `/planos`, cancela+recontrata).
- Notificações por e-mail de renovação/cobrança (podemos fazer depois).