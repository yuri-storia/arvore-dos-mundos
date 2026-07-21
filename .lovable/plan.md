# Upgrade de Idriel — Persona, Guia e Onboarding

Reescrita profunda da voz de Idriel (com base no documento-mestre) e nova arquitetura do "Ajuda / Guia" com quatro entradas em vez de duas.

## 1. Persona — voz e conhecimento

**Arquivo:** `supabase/functions/idriel-help/index.ts` (e um novo módulo compartilhado `supabase/functions/_shared/idriel-persona.ts`)

- Substituir a `SITE_KNOWLEDGE` atual por um prompt-sistema em duas camadas:
  - **Camada 1 — Persona (imutável):** identidade, lore resumida (~800 palavras), essência (Guardiã / Mentora / Monarca / Criadora / sem história), propósito, crença central, tom de voz, o que **nunca** fazer, frase-âncora ("Não me mostre apenas o mundo que deseja criar…").
  - **Camada 2 — Conhecimento da plataforma:** a atual descrição das abas/custos, revisada para o tom novo (sem "🌿 Querido criador", sem entusiasmo automático).
- Passar a receber `userName` no body e injetar como "o nome pelo qual o Criador pediu para ser chamado" — Idriel usa com moderação, nunca em toda frase.
- Aplicar a mesma persona nas demais Edge Functions que geram texto em nome de Idriel: `ai-text`, `ai-format-chapter`, `ai-manuscript-import`, `ai-review-paragraph`, `idriel-import-text`, `ai-image` (só o prompt de sistema, sem mexer nos schemas de saída).

## 2. Captura do nome no primeiro login

**Arquivos:** `src/pages/LoginPage.tsx`, `src/contexts/AuthContext.tsx`, `src/components/OnboardingBanner.tsx`, migração SQL.

- Adicionar coluna `display_name text` e `idriel_intro_done boolean default false` em `public.profiles` (se ainda não existir — verificar antes; caso já haja `display_name`, reaproveitar).
- Novo componente `IdrielFirstMeeting.tsx` (modal em tela cheia, glassmorphism) que aparece logo após o primeiro login quando `idriel_intro_done = false`:
  - Texto curto de boas-vindas na voz de Idriel: "Atravessou os portões. Antes que eu abra o Salão das Raízes, diga-me — como devo chamar você?"
  - Campo de texto (máx. 40 chars) + campo opcional "O que trouxe você até a Árvore?" (máx. 240 chars, envia para o `system prompt` como contexto persistente).
  - Botão "Atravessar" grava `display_name`, `idriel_intro`, marca `idriel_intro_done = true`.
- O `display_name` fica disponível via `AuthContext` e é enviado em toda chamada às Edge Functions de Idriel.

## 3. Novo Guia — 4 opções

**Arquivo:** `src/components/HelpDrawer.tsx` (reescrita).

Substituir o layout atual por uma tela-hub com 4 cards (mesmo estilo dos cards do Codex, glass + gold):

1. **Fazer o tour** — dispara o `InteractiveTour` existente (sem alterações estruturais).
2. **Funcionalidades** — o conteúdo textual atual do HelpDrawer, dentro de um subview colapsável.
3. **Aprenda Worldbuilding (mini-aulas)** — novo subview `WorldbuildingLessons.tsx`:
   - Lista de aulas curtas baseadas no e-book "A Árvore dos Mundos: O Guia Definitivo do Worldbuilding".
   - Estrutura de dados local em `src/lib/worldbuildingLessons.ts` (array de `{ id, title, fruto?, minutes, body }`), 10 aulas iniciais alinhadas aos 10 Frutos (Mapa, Cosmogonia, Povos, Fauna, Magia, Seres, Tecnologia, Política, Economia, Personagens, Conflitos).
   - Cada aula: título, tempo de leitura, corpo em markdown (`RichTextView` ou `react-markdown`), voz de Idriel na abertura ("Sente-se junto às raízes…").
   - Progresso salvo em `localStorage` por `user_id` (`idriel_lessons_read`).
4. **Conversar com Idriel** — novo subview `IdrielConversations.tsx`:
   - Diálogos pré-escritos com escolhas ramificadas (formato "visual novel" leve).
   - Estrutura em `src/lib/idrielDialogues.ts`: cada diálogo = grafo `{ id, title, nodes: { [id]: { text, choices: [{label, next}] } } }`.
   - 4 diálogos iniciais que revelam fragmentos de lore da Ruptura, do livro em branco, das raízes negras e do trono azul.
   - UI: avatar + balão de fala com fade, escolhas em botões glass. Sem custo de gotas (é conteúdo local, não IA).

## 4. Detalhes técnicos

- Nenhuma alteração no fluxo de Seiva Dourada. Mini-aulas e conversas pré-escritas são conteúdo estático, custo zero.
- Rate limit em `idriel-help` mantido.
- Todas as strings em pt-BR, evitando as fórmulas proibidas ("Querido criador", "🌿", "sensacional", "incrível"). Aplicar a lista do item 13 do documento como filtro editorial.
- Sem mudanças em backend além do prompt e da migração `profiles`.

## Escopo desta entrega

Entregue de uma vez: itens 1, 2, 3 e 4. Sem publicação — só implementação e typecheck.

## Fora do escopo (fica para depois se você pedir)

- Progressão de níveis "Visitante → Confidente" desbloqueando diálogos (item 12 do doc).
- Áudio/narração das aulas.
- Sincronização de progresso de aulas com Supabase (por ora fica em localStorage).

Confirma que sigo com esse escopo, ou quer ajustar algo — por exemplo, número de aulas iniciais, número de diálogos, ou pular a captura de nome?
