# Plano: Legibilidade + Refinos da Auditoria

Seis frentes, executáveis em sequência. Começo pela legibilidade (impacto imediato no beta), depois os 5 itens da auditoria.

## 1. Aumentar legibilidade (feedback do beta tester)

**Diagnóstico:** base do `html` em 16px e 384 ocorrências de `text-xs`/`text-sm` em componentes. O problema é mais de escala secundária (badges, labels, descrições) do que do body em si.

**Ações:**
- `html { font-size: 17px }` em desktop (≥1024px) e `16.5px` em tablet. Mobile permanece 16px (iOS evita zoom). Ganho global ≈6%.
- Subir o piso das utilitárias tipográficas em `index.css`:
  - `p` → `clamp(1rem, 0.5vw + 0.9rem, 1.125rem)`
  - `.text-body-sm` → `1rem` (era 0.9375rem)
  - `.text-ui` → `0.8125rem` (era 0.75)
  - `.text-ui-xs` → `0.75rem` (era 0.6875)
- Auditar e reescrever os usos críticos de `text-xs` em conteúdo (não em chips/badges decorativos): CodexCard meta, TabConstruir descrições dos frutos, FichaCard, sidebar do Escritor, IdrielChat mensagens, ManuscriptOutline. Converter para `text-sm` ou `.text-body-sm`.
- Editor TipTap: `prose-base` → `prose-lg` no `RichTextView` e `RichTextEditor` (já está, validar). Garantir `line-height: 1.75` no manuscrito.
- Adicionar **alternador de tamanho de fonte** no menu de perfil (3 níveis: Confortável / Padrão / Compacto) salvando preferência em `localStorage` e aplicando via classe no `<html>`. Atende quem ainda quer mais e quem preferia compacto.

## 2. Acessibilidade (item 1 da auditoria)

- `aria-label` em todos os botões somente-ícone (auditoria via `rg "Button[^>]*size=\"icon\""`). Foco em AppHeader, CodexCard actions, ChapterEditor toolbar, ImageReferencePicker, GalleryItem.
- Corrigir contraste do dourado: `--gold` de `hsl(45 85% 55%)` para `hsl(45 85% 62%)` apenas em uso de texto (manter brilho em bordas/glow via novo token `--gold-glow` = valor antigo).
- `focus-visible` outline dourado consistente (`outline: 2px solid hsl(var(--gold-light)); outline-offset: 2px`).
- `lang="pt-BR"` no `<html>` (validar).

## 3. Tablet (item 2)

- Auditoria de breakpoints `md:` vs `lg:` em: TabGaleria (grid 2→3→4), TabEscrever (sidebar colapsa em md), TabCodex (grid de fichas), TabConstruir (cards de frutos em 2 colunas no md).
- Adicionar breakpoint `lg:` onde só existia `md:` para evitar layouts apertados em 768-1024px.
- Validar com `preview_ui--set_preview_device_viewport` em tablet.

## 4. Streaming de respostas Idriel (item 3)

- Migrar `idriel-help` e `ai-text` para SSE: trocar `generateContent` por `generateContentStream` do Gemini.
- Edge function: retornar `Response` com `text/event-stream`, `ReadableStream`, headers CORS preservados.
- Cliente: helper `callAIStream` em `src/lib/ai.ts` que retorna `AsyncIterable<string>`. IdrielChat e CodexAnalysis renderizam token-a-token.
- Manter `callAI` síncrono para chamadas curtas (importação, scoring estruturado).

## 5. Justificativa por fruto na análise (item 4)

- `world_analyses.fruit_scores` (já existe) ganha shape `{ [frutoId]: { score: number, excerpt: string } }`.
- Parser em `CodexAnalysis` captura o parágrafo que antecede o "N/5" e salva no `excerpt`.
- `TabConstruir`: estrela agora é botão → abre `Popover` com o trecho da análise + botão "Reanalisar este fruto".

## 6. Rate-limit + retry com backoff (item 5)

- Tabela `ai_rate_limits (user_id, function_name, window_start, request_count)` com policy de upsert via security-definer.
- Edge functions chamam `check_rate_limit(user_id, fn, limit, window_seconds)` no topo. Limites sugeridos: ai-text 20/min, ai-image 6/min, ai-image-consistent 4/min, idriel-help 30/min.
- Cliente: `callAI*` envolvido em retry exponencial (1s, 2s, 4s) só para 429/503/timeout. Toast amigável quando estourar o teto: "Idriel precisa respirar — tente em N segundos".

## 7. Revisão final

- `tsgo` + smoke test Playwright das rotas críticas (login, criar mundo, abrir codex, gerar imagem, analisar mundo).
- Atualizar `mem://design/typography` com a nova escala.

## Detalhes técnicos

**Arquivos novos:** `src/hooks/useFontSize.ts`, `src/lib/aiStream.ts`, `src/components/FontSizeToggle.tsx`, `supabase/migrations/<ts>_rate_limits.sql`.

**Arquivos editados (principais):** `src/index.css`, `tailwind.config.ts` (nenhum — escala vem do CSS), `src/components/AppHeader.tsx`, `src/components/TabConstruir.tsx`, `src/components/CodexCard.tsx`, `src/components/CodexAnalysis.tsx`, `src/components/IdrielChat.tsx`, `src/components/escritor/ChapterEditor.tsx`, `src/components/TabGaleria.tsx`, `src/components/TabCodex.tsx`, `supabase/functions/idriel-help/index.ts`, `supabase/functions/ai-text/index.ts`.

**Ordem de execução:** 1 (legibilidade) → 2 (a11y) → 3 (tablet) → 5 (justificativas) → 4 (streaming) → 6 (rate-limit). Streaming e rate-limit no fim porque mexem em edge functions e exigem teste mais cuidadoso.

**Fora do escopo:** version history e side-by-side review (mencionados na auditoria mas não pedidos agora).
