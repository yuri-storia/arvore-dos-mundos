## Escopo

Vou implementar uma reformulação grande do sistema de escrita e revisar a arquitetura de IA. Pelo tamanho, divido em 5 frentes claras.

---

### 1. Editor Rico estilo Google Docs (Manuscrito, Fichas, Artigos, Escrita Livre)

Hoje usamos `<textarea>` puro. Vou migrar para **TipTap** (ProseMirror) com extensões:
- StarterKit (negrito, itálico, listas, headings)
- Underline, Strike, TextAlign (left/center/right/justify)
- Color + Highlight (paleta de cores para caractere e fundo)
- Indent customizado (recuo de parágrafo via Tab/Shift+Tab)
- Placeholder, CharacterCount
- Mention (`@` para Codex) — substitui o sistema atual

**Toolbar adaptativa**:
- **Desktop/Tablet**: barra fixa no topo do editor com grupos: Estilo (H1/H2/H3/parágrafo) · Formato (B/I/U/S) · Cor (texto/fundo) · Alinhamento · Listas · Recuo · Inserir (`@` menção)
- **Mobile**: barra **flutuante** ancorada acima do teclado virtual (CSS `position: fixed; bottom: env(keyboard-inset-height)`), compacta com scroll horizontal. Em seleção de texto também aparece um *bubble menu* contextual (TipTap BubbleMenu) com B/I/U + cor.

Componente único `RichTextEditor.tsx` reutilizado em:
- `TabEscrever` (manuscrito por capítulos)
- `TabCodex` (fichas e artigos — campo content)
- `escritor/` (escrita livre)

Persistência: HTML (compatível com export PDF/DOCX/Kindle atual). Migração transparente — textos antigos (texto puro) carregam como `<p>` simples.

### 2. Fix seleção de texto no mobile

Causa provável: `user-select: none` herdado de containers (cards, sidebar) ou handlers `onTouchStart` que cancelam o long-press. Vou:
- Adicionar `user-select: text; -webkit-user-select: text; -webkit-touch-callout: default` explicitamente no editor e em parágrafos do Codex
- Remover `touch-action: none` indevido
- Garantir que wrappers de drag (kanban de arcos) não capturem long-press dentro do editor

### 3. Corretor ortográfico

- Garantir `spellCheck={true}` e `lang="pt-BR"` no editor (TipTap suporta nativo via `contenteditable`)
- Adicionar `lang="pt-BR"` no `<html>` (provavelmente já existe) e em todos os campos de texto livre (títulos, descrições)

### 4. Sistema de menção `@` / `Ctrl+L`

Migrar para `@tiptap/extension-mention` com suggestion popup:
- Lista entradas do Codex do mundo atual em tempo real (filtra por título)
- Insere chip clicável que linka para a ficha
- Atalho `Ctrl+L` (e `Cmd+L`) abre o mesmo popup via comando do editor
- Mantém renderização em HTML exportável (link `#codex/{id}` + data-attr)

### 5. Progresso dos Frutos ligado à Análise de Idriel

Hoje o badge "X entradas" em `FruitGuideBlock`/`TabConstruir` conta `codex_entries` por `fruit`. Vou:
- **Resetar** essa contagem visual
- Adicionar coluna `fruit_scores` (jsonb) em `world_analyses` OU usar as 6 seções semânticas já retornadas pela análise → mapear cada seção para 1-2 frutos
- Cada fruto exibe **estrela 0-5** vinda da última análise daquele mundo (em vez de contagem)
- Quando não há análise, mostra estado "Sem análise ainda — gere uma análise para ver seu progresso"
- Botão direto "Analisar mundo (1 gota)" no card de cada fruto sem análise

### 6. Review da arquitetura de IA + bugs

- Rodar lint/typecheck em todas as edge functions (`ai-text`, `ai-image`, `ai-image-consistent`, `idriel-help`, `idriel-import-text`)
- Validar: cota (`check_ai_quota`), incremento (`increment_ai_usage`), injeção de Codex, refs estruturadas, fallback de erro padronizado
- Garantir que toda chamada client passa por `callAI*` helpers (sem fetch direto)
- Confirmar toasts de erro consistentes (mensagens em pt-BR, sem stack)
- Logs estruturados nas functions para debug

---

### Detalhes técnicos

**Dependências novas**:
```
@tiptap/react @tiptap/starter-kit @tiptap/extension-underline 
@tiptap/extension-text-align @tiptap/extension-color 
@tiptap/extension-text-style @tiptap/extension-highlight
@tiptap/extension-placeholder @tiptap/extension-character-count
@tiptap/extension-mention @tiptap/suggestion
tippy.js
```

**Arquivos criados**:
- `src/components/editor/RichTextEditor.tsx`
- `src/components/editor/EditorToolbar.tsx`
- `src/components/editor/MobileFloatingToolbar.tsx`
- `src/components/editor/MentionList.tsx` + `mentionSuggestion.ts`
- `src/components/editor/editor.css`

**Arquivos editados**:
- `TabEscrever.tsx`, `TabCodex.tsx`, `escritor/*` (substituir textarea)
- `TabConstruir.tsx`, `FruitGuideBlock.tsx` (progresso por análise)
- `ManuscriptExportMenu.tsx` (já recebe HTML — mínimo ajuste)
- Edge functions: pequenos hardenings

**Migration**:
- (Opcional) `ALTER TABLE world_analyses ADD COLUMN fruit_scores jsonb` — só se decidirmos persistir score por fruto separadamente. Caso contrário derivamos do JSON existente.

---

### Fora de escopo desta leva
- Refazer export DOCX para preservar cores/alinhamento avançado (pode ser próxima leva se quiser)
- Histórico de versões do editor
- Comentários inline (estilo Google Docs)

Confirma que posso prosseguir com tudo acima? Se quiser cortar alguma frente (ex.: adiar mention para depois), me diz antes que eu começo.