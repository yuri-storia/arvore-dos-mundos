
# Plano de Ajustes Pós-Auditoria

Cinco frentes, ordenadas por impacto e velocidade. Tudo escopado em **uma sessão de build**.

---

## 1. Padronizar copy das gotas (P1 — impacto alto, esforço baixo)

A migração para 3 níveis de imagem + redução da análise para 1 gota não foi refletida em 6 telas de texto. Hoje o usuário lê informações conflitantes em diferentes lugares.

**Onde corrigir:**
- `src/components/HelpDrawer.tsx` — 4 menções (FAQ de imagem, Elixir, análise, upgrade)
- `src/components/OnboardingBanner.tsx` — bloco "Textos consomem 1, imagens 5, análise 2"
- `src/components/InteractiveTour.tsx` — passo "Visões de Idriel" (5 gotas) e "Consultar Idriel"
- `src/components/OnboardingTips.tsx` — duas dicas com custos
- `src/pages/PricingPage.tsx` — FAQ "O que é o Elixir dos Mundos?"
- `src/components/IdrielImportDialog.tsx` — texto "custo: 5 gotas"

**Texto-padrão a usar (referência única):**
> "Gerar imagem: **Rascunho 2 gotas · Padrão 5 gotas · Qualidade Máxima 15 gotas**. Texto e consulta a Idriel: **1 gota**. Análise do mundo: **1 gota**. Importar documento: **1 gota**."

---

## 2. Corrigir bilhetagem do Idriel Import (P2 — bug real)

`IdrielImportDialog` promete cobrar **5 gotas**, mas o edge function `idriel-import-text` chama `_type: "text"` na cota, que custa **1 gota**. A UI mente sobre o preço.

**Decisão a confirmar com você:** o import processa até 200K caracteres com Gemini 3 Flash Preview. O custo real de tokens justifica **3 gotas** (preço justo). Recomendo:
- Atualizar `idriel-import-text/index.ts` para checar/incrementar uma nova chave `text_heavy` que custa 3 gotas
- OU manter 1 gota e atualizar a UI para refletir o preço real (mais simples, sem mudança de schema)

→ Vou propor a **opção simples (1 gota)** porque é coerente com o custo real de inferência do Gemini Flash.

---

## 3. Ajustar preço do Rascunho para evitar margem negativa (P6)

O nível Rascunho (Nano Banana 2 a ~R$0,21) está cobrando 1 gota (R$0,18) → **margem negativa**.

**Ação:** subir Rascunho para **2 gotas** (R$0,36 → margem 42%).

**Onde mudar:**
- `supabase/functions/ai-image/index.ts`: `image_draft` → adicionar lógica de custo 2 (ou usar nova chave `image_draft` no SQL com custo 2)
- Migration: ajustar `check_ai_quota` para `image_draft` custar 2 em vez de 1
- `src/components/TabGerarImagens.tsx`: rótulo "1 gota" → "2 gotas"
- `src/components/TabGaleria.tsx`: rótulo "1 gota" → "2 gotas"
- Copy unificada (item 1) já reflete os 2 gotas

---

## 4. Streaming progressivo no GPT Image 2 (P3 — UX premium)

Hoje "Qualidade Máxima" mostra apenas um spinner por até 2 min. A documentação Lovable suporta SSE com `partial_images: 1` que entrega previews progressivos com blur.

**Estratégia:**
- Reescrever o ramo `quality === "premium"` em `ai-image/index.ts` para pedir `stream: true, partial_images: 1`
- Encaminhar o stream SSE direto ao cliente (sem buffer no backend) com `Content-Type: text/event-stream`
- Em `helpers.ts`, criar `callAIImageStreaming(prompt, quality, onFrame)` usando `fetch` direto (não `supabase.functions.invoke`, que não streama) com a URL construída a partir de `import.meta.env.VITE_SUPABASE_PROJECT_ID` + token Supabase
- Adicionar parser `eventsource-parser` (já documentado) com `flushSync` para evitar batching React
- Em `TabGerarImagens.tsx`, exibir frames com `className={isFinal ? "blur-0" : "blur-2xl"}` para vender o efeito "ainda carregando"

**Risco:** complexidade média. Se preferir, posso deixar para uma sessão dedicada e neste momento apenas melhorar a copy do loading ("Pode levar até 2 minutos — vale a pena").

---

## 5. Limpeza técnica (debt rápida)

- **Remover `console.log/warn/error`** em hooks de produção (23 ocorrências em 7 hooks: `useCodexEntries`, `useWorlds`, `useSubscription`, `useManuscript`, `useIdrielVisions`, `useStorylineCards`, `useIdrielHistory`). Manter apenas `console.error` em catch blocks que realmente precisam.
- Não vou tocar nos `: any` types nem nos warnings de SECURITY DEFINER nesta sessão — escopo separado.

---

## Itens deferidos (não entram nesta sessão)

- **Rate limit por usuário** (P5): backend Lovable não tem primitivo padrão; trataria como dívida para infra dedicada.
- **Fallback automático Pro → Draft** em erro 5xx (P4): só vale com telemetria mostrando taxa de falha relevante.
- **Tipagem dos `: any`** críticos (LoginPage, useWorlds, RichTextEditor, CodexAnalysis): sessão de refactor à parte.
- **Sweep de tablet (768–1024px)** e **contraste WCAG** dos `text-text-dim`: sessão de a11y dedicada.

---

## Ordem de execução proposta

1. **Migration**: ajustar `check_ai_quota` para `image_draft = 2`
2. **Backend**: `ai-image/index.ts` (custo) + decisão sobre streaming GPT Image 2
3. **Frontend**: atualizar 8 arquivos de copy (item 1 + 3) numa rajada paralela
4. **Limpeza**: remover console.logs dos hooks
5. **Deploy edge functions** afetadas

**Tempo estimado:** 1 sessão de build, ~15–20 edições paralelas.

---

## Decisões para você confirmar

1. **Idriel Import**: mantém **1 gota** (real) ou cobra **3 gotas** (introduz `text_heavy` no schema)?
2. **Streaming GPT Image 2**: entra agora (mais complexo) ou fica para próxima sessão (apenas melhoro a copy do loading)?
3. **Rascunho a 2 gotas**: confirmo o reajuste?
