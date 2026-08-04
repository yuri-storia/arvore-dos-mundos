# Redesenho da aba Construir — Estúdio de Criação com Idriel

## 1. Diagnóstico da estrutura atual

**Layout atual da aba (topo → base):**
1. `AppHeader` (nome do mundo, opções) — `src/pages/Index.tsx`
2. `DropsCounterBadge` (Elixir dos Mundos + gotas + "Adquirir Elixir") — bloco próprio, linha inteira
3. `SubscriptionBanner`, `TabNav`, `OnboardingTips`, `HelpDrawer`
4. `TabConstruir` (734 linhas, monolítico):
   - botões "Cima para baixo / Baixo para cima" (2 botões empilhados no mobile)
   - caixa de descrição do método (bloco alto)
   - `FruitCarousel` (Embla, cards altos, persistência do snap em sessionStorage)
   - painel do Fruto: hero de 140–200 px de imagem, título, desc, nota de metodologia, `FruitGuideBlock` ("Orientações de Idriel"), referências da Galeria, campos (`CreateFichaButton` por campo), `MapGenerator` (Fruto 0) **ou** bloco "Consultar Idriel", navegação Anterior/Próximo
   - diálogos: salvar como ficha/artigo, `TimelineEventDialog`, Sheet de histórico

**Dados e regras já existentes (fonte de verdade):**
- `src/lib/data.ts`: `FRUITS` (id, num, name, desc, gradient, `fields`, `chips`, `guide{min,ref,steps,closing}`), `FRUIT_RECOMMENDED_TYPE` (ficha/artigo/both por Fruto), `TOP_DOWN_ORDER`/`BOTTOM_UP_ORDER`, `METHOD_DESCRIPTIONS`
- Hooks: `useCodexEntries` (fichas/artigos), `useTimelineEvents`, `useIdrielHistory`, `useLatestAnalysis` (estrelas/progresso), `usePlanLimits` (`canUseAI`, `maxArtigos`), `useElixirBalance`, `useSubscription`
- IA: `callAIText` em `src/lib/helpers.ts` → Edge Function `ai-text`; `summarizeIdrielResponse`; `MapGenerator` → `ai-image` + `image_jobs`; contexto do Codex montado dentro de `handleConsult`
- Salvamento: `CreateFichaButton` (overlay em portal, anexar a ficha existente, atalho Linha do Tempo), `TimelineEventDialog`
- Especial: Fruto 0 = `MapGenerator` (estilos, qualidade, gotas, `map_history`); Fruto 4 = auto-artigo `__magictype__`; Frutos 2 e 8 = atalho Linha do Tempo

**Backend:** nenhuma mudança de banco, Edge Function, preço ou consumo de gotas é necessária. Todo o redesenho é de frontend/apresentação.

## 2. Componentes reutilizados (sem alteração de lógica)
`FruitCarousel` (ajuste apenas de altura/estilo), `CreateFichaButton`, `TimelineEventDialog`, `MapGenerator`, `IdrielMarkdown`, `ImageLightbox`, `DropsCounterBadge` (extraindo variante compacta), `useCodexEntries`, `useTimelineEvents`, `useIdrielHistory`, `useLatestAnalysis`, `usePlanLimits`, `callAIText`, `summarizeIdrielResponse`, `FRUITS`/`FRUIT_RECOMMENDED_TYPE`.

## 3. Componentes novos
```
src/lib/construir/fruitStudioConfig.ts   → config central por Fruto (deriva de FRUITS)
src/lib/idriel/idrielStates.ts           → máquina de estados + mapa de eventos
src/components/idriel/IdrielStateSprite.tsx
src/components/construir/BuildWorldControls.tsx   (faixa Elixir + modo)
src/components/construir/CompactElixirBar.tsx     (variante compacta reutilizando DropsCounterBadge)
src/components/construir/BuildModeSelector.tsx    (segmented control)
src/components/construir/GuidedBuildChat.tsx      (orquestrador do estúdio)
src/components/construir/chat/FruitTutorial.tsx
src/components/construir/chat/CreationPathOptions.tsx
src/components/construir/chat/GuidedQuestion.tsx  (pergunta + chips + campo livre)
src/components/construir/chat/AskIdrielIdeas.tsx  (IA explícita)
src/components/construir/chat/BuildSummary.tsx
src/components/construir/chat/CodexOutputPreview.tsx  (usa fluxos existentes)
src/components/construir/FruitSpecialAction.tsx   (wrapper do MapGenerator)
src/assets/idriel/states/*.webp
```

## 4. Arquivos alterados
- `src/components/TabConstruir.tsx` — vira casca de composição (~200 linhas), mantendo diálogos e handlers atuais
- `src/components/construir/FruitCarousel.tsx` — altura −25/35%, remoção de "Abrir", 5 cards visíveis no desktop, snap horizontal no mobile
- `src/pages/Index.tsx` — mover o Elixir para dentro da faixa da aba Construir (mantendo `DropsCounterBadge` nas demais abas)
- `src/components/FruitGuideBlock.tsx` — reaproveitado como fonte do mini-tutorial dentro do chat
- `src/lib/data.ts` — apenas adições opcionais (perguntas guiadas por Fruto), sem remover campos

## 5. Máquina de estados da Idriel + assets
- 18 estados semânticos, fallback `neutral_attentive`, transição de opacidade 220 ms, `prefers-reduced-motion` respeitado, área de tamanho fixo com `object-fit: contain`, preload apenas de 5 estados.
- Processamento dos WebP: extração de alpha por luminância sobre fundo preto puro (preserva fios de cabelo, coroa e efeitos mágicos sem halo), sem tocar em rosto/pose/cor; originais preservados em backup. Se algum arquivo sair danificado, mantenho o original e aviso — não substituo em silêncio.
- Nesta primeira leva só existem 8 imagens (01–08). Implemento a máquina completa com os 18 slots e faço fallback dos ausentes até você enviar 09–18.

## 6. Separação IA x conteúdo predefinido
- **Sem IA:** apresentação do Fruto, tutorial, princípios, perguntas guiadas, chips, exemplos, caminhos de criação, navegação, confirmações — tudo vindo de `fruitStudioConfig.ts`.
- **Com IA (explícita):** "Pedir ideias à Idriel" (decisão pontual, prompt curto) e "Consultar Idriel" (análise ampla com o canon do Codex, exatamente o prompt atual de `handleConsult`).
- Nenhuma chamada automática após resposta do usuário.

## 7. Etapas de implementação
1. Assets + máquina de estados + `IdrielStateSprite`
2. `fruitStudioConfig.ts` (config central derivada de FRUITS/guides/chips)
3. Faixa compacta: `BuildWorldControls` + `CompactElixirBar` + `BuildModeSelector`
4. Carrossel compacto (desktop e mobile)
5. `GuidedBuildChat` com Idriel à esquerda + subcomponentes do fluxo
6. Saídas: ficha, artigo e fato reaproveitando `CreateFichaButton`/`TimelineEventDialog`/`createEntry`
7. Ação especial (Mapa do Mundo) abaixo do chat, com estado `forging`
8. Polimento responsivo + acessibilidade
9. Browser testing real (1366×768, 1440×900, 1920×1080, 360×800, 390×844, 430×932) com os 20 casos da sua lista

## 8. Riscos de regressão
- `state.db` e autosave do mundo: os campos por Fruto continuam sendo a fonte de dados; o chat escreve neles via `updateField` para não quebrar o autosave.
- `CreateFichaButton` dentro do chat: manter o portal e o comportamento de "anexar a ficha existente".
- Fruto 4 (`__magictype__`) e limites de plano de artigos: preservar handlers atuais.
- `InteractiveTour` depende de `data-tour="method-selector"`, `data-tour="method-bottom-up"` e `data-tour="consult-idriel"` — os atributos serão mantidos nos novos componentes.
- Elixir movido de `Index` para a faixa da aba: garantir que as outras abas continuem exibindo o painel.

## 9. Backend
Nenhuma migration, Edge Function, preço ou regra de gotas será alterada nesta tarefa.
