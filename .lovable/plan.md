
# Sprint 3 — Streaming, Rate Limit e Justificativas

Três entregas independentes, cada uma com migração + edge function + UI.

## 1. Streaming SSE (chat e geração de texto)

**Por quê:** Idriel responde em 5–15 s; sem streaming, o usuário vê só "pensando…". Streaming reduz latência percebida em ~70%.

**Escopo:**
- `idriel-help/index.ts` — passar a fazer `stream: true` no chat-completions e repassar SSE com `Content-Type: text/event-stream`. Pré-check de cota/limite mantido antes de abrir o stream; incremento de uso ao final via `[DONE]`.
- `ai-text/index.ts` — mesmo padrão para gerações longas (sugestões, importação, análise de mundo).
- `src/lib/helpers.ts` — adicionar `callAITextStream(messages, systemPrompt, onChunk)` que faz `fetch` direto via `supabase.functions.invoke`-equivalente (URL + token) e consome ReadableStream. Manter `callAIText` como wrapper que acumula chunks (backwards compat para todos os callers).
- `src/components/IdrielHelpChat.tsx` (e dialogs equivalentes) — usar a versão stream e renderizar incrementalmente.
- `CodexAnalysis.tsx` — remover `typewriter` artificial e usar chunks reais.

## 2. Rate limiting por usuário (anti-burst)

**Por quê:** hoje a única barreira é a cota mensal (100 gotas). Um usuário pode disparar 50 requisições em 1 s, queimar saldo e estressar o gateway.

**Escopo:**
- Migration: tabela `ai_rate_limits(user_id, function_name, window_start, count)` + função `check_rate_limit(_user_id, _function, _max_per_min)` que retorna boolean.
- Limites sugeridos (por minuto, por usuário): `ai-text` 20, `idriel-help` 10, `ai-image` 6, `ai-image-consistent` 6.
- Cada edge function chama `check_rate_limit` antes da cota. Retorna 429 com mensagem amigável de Idriel ("os galhos precisam respirar…").
- UI: já tratamos 429 em `friendlyAIError`; apenas adicionar string específica.

## 3. Justificativas por Fruto na Análise de Mundo

**Por quê:** hoje a nota "3/5" aparece sem contexto. O usuário pediu ver os trechos que motivaram a nota.

**Escopo:**
- Migration: já temos `fruit_scores jsonb`. Estender para `{ score: n, justification: "trecho/explicação curta", evidence_entries: ["id1","id2"] }`.
- `CodexAnalysis.tsx` — atualizar `systemPrompt` para pedir, junto da nota, **uma frase de justificativa** (máx 140 chars) e **1–2 títulos de entradas** que a embasam, no formato:
  ```
  - **Mapa do Mundo**: 3/5 — Geografia clara, falta detalhamento climático. (Reino de Lyrr, Mar de Vetra)
  ```
- `useLatestAnalysis.parseFruitScoresFromAnalysis` — estender regex para capturar justificativa e entradas citadas.
- `TabConstruir.tsx` (grid de Frutos) — exibir tooltip/popover ao passar sobre a estrela mostrando justificativa + links rápidos para as entradas citadas.

## Ordem de execução

1. **Rate limit** (migration + 4 funções) — menor risco, blinda receita imediatamente.
2. **Justificativas** (migration leve + prompt + parser + UI tooltip) — entrega visível.
3. **Streaming SSE** (refactor de helpers + 2 funções + 2 componentes) — maior impacto perceptivo, maior superfície de teste.

Commits separados, type-check entre cada um.

## Riscos

- Streaming muda contrato de resposta — manter wrapper síncrono para 100% dos callers existentes.
- Rate limit muito apertado bloqueia uso legítimo do editor — começamos folgados (acima) e ajustamos com telemetria.
- Parser de justificativa precisa tolerar variação do modelo (Gemini às vezes ignora formato exato).
