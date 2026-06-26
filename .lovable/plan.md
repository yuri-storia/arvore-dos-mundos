# Plano: Corretor Ortográfico v2 + Correções da Auditoria

## Parte 1 — Corretor Ortográfico (reconstrução do zero)

### Diagnóstico do atual
O corretor baseado em `typo-js` + Web Worker + dicionário PT-BR de 4,5 MB nunca funcionou de forma consistente no editor. A inicialização é lenta, o worker às vezes não responde, os sublinhados raramente aparecem e o menu de sugestões depende de um pipeline frágil que silenciosamente falha. Vamos **remover** essa camada inteira.

### Nova arquitetura (modelada em Google Docs / Notion AI)

Estratégia híbrida em duas camadas, ativada automaticamente em **todo o site**:

**Camada 1 — Sublinhado nativo do navegador (instantâneo, zero custo)**
- Ativar `spellcheck="true"` e `lang="pt-BR"` em todo o documento (`<html lang="pt-BR">` já existe).
- Em `index.css`, garantir que `textarea`, `input[type=text]` e `[contenteditable]` herdem `spellcheck`.
- No Tiptap (`RichTextEditor`), forçar `editorProps.attributes = { spellcheck: 'true', lang: 'pt-BR' }`.
- Isso já entrega o sublinhado vermelho clássico para o usuário sem nenhum download de dicionário.

**Camada 2 — Menu de sugestões customizado via IA (substitui o nativo)**
- Criar Edge Function `supabase/functions/ai-spellcheck/index.ts` usando **Gemini 3 Flash** (rápido, ~150ms, custo desprezível — não consome gotas).
- Input: palavra + ~80 caracteres de contexto antes/depois.
- Output JSON: `{ correct: boolean, suggestions: string[] (top 5), reason?: string }`.
- Cache LRU em memória (Map de 500 entradas) por palavra+contexto, para evitar requisições repetidas ao digitar.
- Rate-limit já existente: 30/min/usuário.

**Componente global `<SpellcheckProvider />`**
- Montado uma vez em `App.tsx`.
- Registra um único `contextmenu` listener global.
- Ao clicar com botão direito:
  1. Detecta a palavra sob o cursor (em `input`/`textarea` via `selectionStart`, em `contenteditable` via `Range`/`caretRangeFromPoint`).
  2. Previne o menu nativo (`e.preventDefault()`).
  3. Mostra um popover dourado (estilo grimório) com spinner enquanto chama `ai-spellcheck`.
  4. Lista até 5 sugestões clicáveis + opções **"Adicionar ao dicionário"** e **"Ignorar"**.
  5. Ao escolher: substitui a palavra preservando capitalização e cursor.
- Dicionário pessoal persistido em `localStorage` (`spellcheck-custom-words`) — palavras adicionadas nunca mais aparecem como erro/menu.

**Cobertura**
- Aba **Escrever** (Tiptap): ✅ ativado por padrão.
- Aba **Construir** (Frutos, descrições): ✅ via provider global.
- Aba **Codex** (fichas, artigos): ✅ via provider global.
- Aba **Galeria** (legendas, prompts): ✅ via provider global.
- Modais de cadastro de mundo, perfil, etc.: ✅ via provider global.
- Opt-out: atributo `data-no-spellcheck` em campos sensíveis (e-mail, senha, código).

### Arquivos a criar / remover
**Remover:** `src/components/editor/spellcheck/` inteiro (`spellWorker.ts`, `loadDictionary.ts`, `dictCache.ts`, `SpellcheckExtension.ts`, `SpellSuggestionsMenu.tsx`, `customDictionary.ts`). Remover dependência `typo-js`.

**Criar:**
- `supabase/functions/ai-spellcheck/index.ts` — endpoint Gemini Flash.
- `src/lib/spellcheck/SpellcheckProvider.tsx` — listener global + popover.
- `src/lib/spellcheck/useSpellSuggestions.ts` — hook com cache LRU.
- `src/lib/spellcheck/customDictionary.ts` — wrapper localStorage.
- `src/lib/spellcheck/wordAtPoint.ts` — utilitário cross-input/contenteditable.

**Alterar:**
- `src/App.tsx` — montar `<SpellcheckProvider />`.
- `src/components/editor/RichTextEditor.tsx` — remover extensão antiga, adicionar `spellcheck=true` no editorProps.
- `src/components/escritor/ChapterEditor.tsx` e `MentionTextarea.tsx` — remover referências antigas.

---

## Parte 2 — Cronograma de Correções da Auditoria

Sprint dedicado, executado após o corretor.

### 🔴 Crítico
1. **Upload de imagens coladas no editor** — atualmente vão como base64 no HTML.
   - Em `RichTextEditor.tsx`, interceptar `paste`/`drop` de `image/*`, fazer upload para o bucket `manuscript-images` via `supabase.storage`, e inserir a URL pública. Limite: 5 MB, conversão para WebP via canvas (reaproveitar `imageOptimization.ts`).

2. **Feedback de erro no autosave de capítulos** — `updateChapter` não retorna Promise, toasts de erro nunca disparam.
   - Refatorar `updateChapter` em `useChapters` para `async` retornando Promise.
   - Em `ChapterEditor.tsx`, `await` e `try/catch` real com toast "Não foi possível salvar — tentando novamente em 5s" + retry exponencial (3 tentativas).

### 🟡 Importante
3. **Extensão Underline ausente no Tiptap** — botão "Sublinhado" hoje é no-op.
   - Instalar `@tiptap/extension-underline`, registrar em `RichTextEditor.tsx`, ligar o botão da toolbar.

4. **Renderização de Markdown da Idriel** — respostas aparecem com `**bold**` cru.
   - Usar `react-markdown` (já é candidato natural) no `TabConstruir.tsx` e `CodexAnalysis.tsx` para a saída da IA, com plugin `remark-gfm`.

### 🟢 Polimento
5. **Bubble Menu de imagem em telas estreitas** — sem clamp horizontal.
   - Adicionar `tippyOptions={{ maxWidth: 'calc(100vw - 32px)', placement: 'top' }}` no `BubbleMenu` de imagens em `RichTextEditor.tsx`.

6. **Telemetria leve de qualidade do corretor** — tabela `spellcheck_feedback` (palavra, sugestão_aceita, ignorada) para iterar prompts. *(Adiar para após validação do usuário.)*

---

## Ordem de execução proposta
1. **Hoje (esta tarefa):** Parte 1 inteira — corretor novo funcionando em todo o site.
2. **Próxima tarefa:** itens 🔴 1 e 2 (storage + autosave robusto).
3. **Depois:** itens 🟡 3 e 4 (underline + markdown).
4. **Polimento final:** item 🟢 5.

## Detalhes técnicos
- Edge function `ai-spellcheck` usa o gateway Lovable AI com `google/gemini-3-flash-preview`, `response_format: json_object`, prompt curto pedindo JSON estrito. Sem incremento em `ai_usage` (custo absorvido — é UX essencial, não feature premium).
- Popover usa `@radix-ui/react-popover` (já instalado) posicionado em `clientX`/`clientY` via `virtualReference`.
- Detecção de palavra: regex `/[\p{L}\p{M}'-]+/gu` para suportar acentos e hífens portugueses.
- Preservação de capitalização: se palavra original começa maiúscula → capitalizar sugestão; se toda maiúscula → upper.
- Provider escuta `contextmenu` na fase de captura para preceder menus de bibliotecas (Tiptap, Radix).
