## Decisões já travadas

- **Custo-base:** R$ 0,18 por gota (1 imagem máxima qualidade = 5 gotas ≈ R$ 0,90 de custo)
- **Modelo de imagem:** `google/gemini-3-pro-image-preview` (Nano Banana Pro) em todas as gerações de Idriel — máxima qualidade
- **Idriel mensal:** R$ 29,90 → **R$ 39,90/mês** (mantém 100 gotas/mês)
- **Idriel anual:** R$ 279 → **R$ 399/ano** (proporcional, ~17% desconto vs mensal)
- **Sem migração necessária:** ainda não há assinantes Idriel
- **Gateway:** decisão adiada — vamos só travar a tabela de preços e a estrutura de código; integração de cobrança fica para depois

## Tabela de recargas (Seiva Dourada)

Custo-base R$ 0,18/gota. Margens calculadas:

| Pacote | Custo (R$) | Preço sugerido | Margem | R$/gota efetivo |
|---|---|---|---|---|
| 15 gotas | 2,70 | **R$ 4,90** | 45% | 0,33 |
| 25 gotas | 4,50 | **R$ 7,90** | 43% | 0,32 |
| 50 gotas | 9,00 | **R$ 14,90** | 40% | 0,30 |
| 100 gotas | 18,00 | **R$ 27,90** | 35% | 0,28 |
| 200 gotas | 36,00 | **R$ 49,90** | 28%* | 0,25 |

*O pacote de 200 gotas fica ligeiramente abaixo da faixa pedida (28% vs 35–50%). Duas opções para corrigir:
- **A)** Subir para **R$ 54,90** (margem 34%) — ainda atrativo, escala suave
- **B)** Manter R$ 49,90 como "âncora de volume" e aceitar margem menor para incentivar compras grandes

Recomendação: **opção A** (R$ 54,90) — preserva sua regra de 35–50% em todos os SKUs.

**Tabela final recomendada:**
- 🧪 15 gotas — R$ 4,90
- 🧪 25 gotas — R$ 7,90
- 🧪 50 gotas — R$ 14,90
- 🧪 100 gotas — R$ 27,90
- 🧪 200 gotas — R$ 54,90

Psicologia de preço: o usuário vê que comprar mais barateia o R$/gota (de 0,33 → 0,25), incentivando ticket maior.

## Mudanças no produto

### 1. Plano Idriel — novo posicionamento
- Banner e landing passam a comunicar **"Qualidade Suprema"** — Idriel agora usa o modelo de imagem mais avançado disponível
- Preço: R$ 39,90/mês ou R$ 399/ano
- Mantém 100 gotas mensais
- Mantém todos os outros benefícios

### 2. Tela de Recarga
Substituir o botão único atual ("+100 gotas — R$15") por uma **modal/tela de seleção de pacote** com os 5 SKUs em cards. Acessível a partir de:
- Banner de Seiva Dourada (botão "Recarregar Seiva")
- Estado vazio quando gotas = 0
- Página `/planos`

Layout: 5 cards lado a lado em desktop, carrossel/grid 2 colunas em mobile. Pacote de 100 marcado como "Mais popular", pacote de 200 como "Melhor custo-benefício".

### 3. Página `/planos`
Atualizar todas as referências de preço (R$ 29,90 → R$ 39,90, R$ 279 → R$ 399) e adicionar a nova tabela de recargas.

## Arquivos a alterar

**Front-end (preços e UI):**
- `src/hooks/useSubscription.ts` — atualizar objeto `PLANS` com novos preços e os 5 SKUs de recarga (`recarga_15`, `recarga_25`, `recarga_50`, `recarga_100`, `recarga_200`)
- `src/components/SubscriptionBanner.tsx` — novo botão "Recarregar Seiva" abre modal de pacotes; preço Idriel atualizado
- `src/pages/PricingPage.tsx` — preços novos + seção "Pacotes de Seiva"
- `src/pages/LandingPage.tsx` — comparativo de custo atualizado
- **Novo:** `src/components/RechargePackageDialog.tsx` — modal com os 5 cards de recarga

**Back-end (preparação, sem cobrar ainda):**
- Manter `useSubscription.openCheckout()` como stub até decisão de gateway
- Documentar IDs de SKU em código para integração futura
- `supabase/functions/ai-image-consistent/index.ts` — já está em `gemini-3-pro-image-preview`, sem mudanças
- Garantir que `ai-image` legado (se ainda usado em algum ponto) também seja apontado para o modelo Pro, OU descontinuado

**Memória:**
- Atualizar `mem://project/monetization` com nova tabela de preços
- Atualizar Core memory: novo preço Idriel R$ 39,90

## Detalhes técnicos

**Estrutura de PLANS atualizada:**
```ts
PLANS = {
  semente: { priceValue: 0, ... },
  raiz_anual: { priceValue: 87, ... },
  idriel_mensal: { priceValue: 39.90, ... },   // ← era 29.90
  idriel_anual: { priceValue: 399, ... },      // ← era 279
  recarga_15:  { priceValue: 4.90,  drops: 15  },
  recarga_25:  { priceValue: 7.90,  drops: 25  },
  recarga_50:  { priceValue: 14.90, drops: 50  },
  recarga_100: { priceValue: 27.90, drops: 100 },
  recarga_200: { priceValue: 54.90, drops: 200 },
}
```

**Lógica de gotas no servidor:** quando integrarmos o gateway, o webhook de pagamento vai creditar `drops` na tabela `ai_usage` (decrementando `text_count + image_count*5` correspondente, ou criar coluna `bonus_credits` separada — decidiremos no momento da integração).

**Custo do modelo já implementado:** `ai-image-consistent` usa `google/gemini-3-pro-image-preview` ($0.134/imagem ≈ R$ 0,75–0,90 dependendo do câmbio). Os 5 gotas/imagem cobrem o custo com folga em qualquer cenário.

## O que fica para depois (fora deste plano)

- Escolha definitiva e integração do gateway (Stripe vs Asaas vs outro)
- Webhook de creditamento de gotas
- Email transacional de confirmação de recarga
- Histórico de compras na página de Configurações

## Próximo passo após aprovação

Implementar tudo do bloco "Arquivos a alterar" — UI, preços, modal de recarga e atualização de memória. A camada de cobrança fica em stub até você decidir o gateway.