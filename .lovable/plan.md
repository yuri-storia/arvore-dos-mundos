
# Plano de Otimização de Desempenho

Objetivo: reduzir o tempo percebido de carregamento da homepage, da lista de mundos e das 4 abas (Construir, Codex, Escrever, Galeria), atacando os 3 gargalos medidos: (1) assets pesados, (2) queries trazendo dados grandes desnecessariamente, (3) fetches duplicados entre abas.

---

## Sprint 1 — Assets pesados (impacto imediato no FCP/LCP)

1. Comprimir `idriel-avatar.png` (2 MB) → WebP 512px (~40 KB).
2. Comprimir `tree-bg-blur.png` (515 KB) → WebP (~80 KB).
3. Adicionar `loading="lazy"` e `decoding="async"` em todos os `<img>` da Galeria e dos lightboxes do Codex que ainda não têm.
4. Adicionar `<link rel="preload" as="image">` para o hero da Landing e `poster` no `<video>` do herói.

Ganho esperado: −1,9 MB no primeiro paint da área logada; FCP da landing −0,4 a −1 s.

---

## Sprint 2 — Slim queries (corta picos de 6,5 s no Codex)

5. `useCodexEntries` passa a listar sem o campo `content`:
   `select('id, title, image_url, entry_type, fruit_id, world_id, image_position, updated_at, created_at')`.
6. Novo método `fetchEntryContent(id)` para carregar `content` sob demanda ao abrir uma ficha.
7. `useManuscript` passa a listar capítulos sem `content` e `notes` (apenas metadados + `word_count`); `content` é carregado quando o capítulo é aberto no editor.

Ganho esperado: payload da listagem do Codex cai de ~MBs para dezenas de KB; elimina picos de 700 ms–6,5 s.

---

## Sprint 3 — Cache compartilhado entre abas (corta 75% das chamadas)

8. Migrar `useCodexEntries`, `useWorlds` e `useSubscription` para React Query (já instalado), com chaves estáveis (`['codex', worldId]`, `['worlds']`, `['subscription', userId]`).
9. `staleTime` agressivo: `codex` 30 s, `worlds` 60 s, `subscription` 60 s.
10. Resultado: quando o usuário troca entre Construir → Codex → Galeria → Escrever, todos consomem o mesmo cache em vez de refazer o `SELECT`.

Ganho esperado: chamadas a `subscriptions` caem de 195k para ~5k; chamadas ao Codex caem ~75 %.

---

## Sprint 4 — Autosave mais leve do mundo

11. Diff no autosave: só envia para o `UPDATE worlds` os campos que mudaram desde a última gravação (evita reescrever `db` + `gallery` inteiros a cada 2 s quando só o nome mudou).
12. Debounce do autosave subindo de 2 s para 3 s quando o payload é grande (>200 KB).

Ganho esperado: tempo médio do `UPDATE worlds` cai de 14 ms para <5 ms; pico de 703 ms vira raro.

---

## Sprint 5 — Carregamento sob demanda do corretor

13. Hunspell WASM + dicionário VERO passam a carregar somente quando o usuário ativar o toggle "Corretor" no editor (já existe no `ChapterEditor`). Hoje carrega no boot da aba Escrever.

Ganho esperado: TTI da aba Escrever −300 a −600 ms em mobile.

---

## Detalhes técnicos

- Sem mudanças de schema do banco (índices já existem: `idx_codex_entries_world_updated`, `idx_worlds_user_updated`, `idx_chapters_manuscript_sort`).
- Sem mudanças nas Edge Functions.
- Mudanças concentradas em: `src/hooks/useCodexEntries.ts`, `src/hooks/useManuscript.ts`, `src/hooks/useWorlds.ts`, `src/hooks/useSubscription.ts`, `src/pages/Index.tsx`, `src/components/TabCodex.tsx`, `src/components/TabGaleria.tsx`, `src/components/escritor/ChapterEditor.tsx`, `src/lib/spellcheck/SpellcheckProvider.tsx`, `index.html` e `src/pages/LandingPage.tsx`.
- Imagens: `imagegen--edit_image` para gerar WebP otimizado de `idriel-avatar.png` e `tree-bg-blur.png`, ou regerar via pipeline manual com `sharp`/`squoosh`.

---

## Riscos e mitigação

- Slim do `select` no Codex: cards que mostram preview do conteúdo precisam migrar para `fetchEntryContent` no `onClick` — verificar `CodexCard.tsx` antes de remover o campo.
- React Query: invalidar cache em todo `create/update/delete` para a UI continuar otimista.
- Diff de autosave: comparar por referência via `useRef` da última versão salva.

---

## Critério de sucesso

- LCP da homepage logada cai ≥ 40 % em conexão 4G simulada.
- Pico de query em `codex_entries` cai de 6,5 s para <500 ms.
- Chamadas a `subscriptions` em 24 h caem ≥ 90 %.
- Troca entre abas sem novos fetches visíveis no Network.

Após aprovação, executo na ordem Sprint 1 → 5 e reporto os resultados ao final de cada sprint.
