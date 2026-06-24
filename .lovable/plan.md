## Objetivo

Tornar o corretor ortográfico PT-BR **automático e embutido** — sem depender de configuração do navegador, sistema operacional ou teclado do usuário. O escritor liga/desliga em um único botão, e tudo o mais acontece sozinho (como no Google Docs).

## O que muda para o usuário

- Um único botão na barra do `ChapterEditor` (já existe) liga/desliga o corretor.
- Quando ligado: palavras erradas aparecem **sublinhadas em vermelho ondulado** no editor, mesmo se o navegador não tiver dicionário PT-BR.
- **Clique com botão direito** sobre uma palavra sublinhada abre um menu com até 5 sugestões + "Adicionar ao meu dicionário" + "Ignorar".
- Quando desligado: o sublinhado some imediatamente e nada interfere na digitação.
- O popover de "ajuda" e as instruções de "ative no Chrome/iOS/Android" são **removidos** — não fazem mais sentido, já que o corretor é nosso.

## Como funciona por baixo (seção técnica)

1. **Dicionário Hunspell PT-BR** carregado uma única vez via `nspell` + `dictionary-pt-br` (lazy, dinâmico — só baixa quando o usuário liga o corretor pela primeira vez na sessão; ~1-2MB cacheado pelo browser).
2. Nova extensão Tiptap `SpellcheckPtBr` que:
   - Usa `ProseMirror DecorationSet` para sublinhar tokens desconhecidos (regex que ignora HTML, menções `@Codex`, URLs, números e palavras com maiúsculas — substantivos próprios).
   - Recalcula só nos parágrafos afetados a cada transação (debounced 250ms) — não trava em capítulos longos.
   - Atributo HTML nativo `spellcheck="false"` no contenteditable para **desligar o corretor do navegador** e evitar sublinhado duplicado/conflito.
3. Menu de contexto próprio (`SpellSuggestionsMenu`): captura `contextmenu` sobre `.spell-error`, posiciona um popover Radix com `nspell.suggest(word).slice(0,5)`, e aplica a substituição via `editor.chain().insertContentAt(range, suggestion).run()`.
4. **Dicionário pessoal do usuário** persistido em `localStorage` (`adm-spell-custom-pt-br`) — palavras adicionadas viram parte do `nspell` na próxima checagem.
5. Estado do toggle persistido em `localStorage` (`adm-spell-enabled`) — começa **ligado** por padrão.

## Estrutura de arquivos

- **novo** `src/components/editor/spellcheck/loadDictionary.ts` — loader lazy do `dictionary-pt-br` + `nspell`, com cache em módulo.
- **novo** `src/components/editor/spellcheck/SpellcheckExtension.ts` — extensão Tiptap (Plugin + DecorationSet + worker debounce).
- **novo** `src/components/editor/spellcheck/SpellSuggestionsMenu.tsx` — popover de sugestões e ações.
- **novo** `src/components/editor/spellcheck/customDictionary.ts` — get/add/remove no localStorage.
- **editado** `src/components/editor/RichTextEditor.tsx` — registra a extensão quando `spellCheck=true`; força `spellcheck="false"` no atributo nativo do EditorView; renderiza o `SpellSuggestionsMenu`.
- **editado** `src/components/editor/editor.css` — `.spell-error { text-decoration: underline wavy #ef4444; text-decoration-skip-ink: none; }`.
- **editado** `src/components/escritor/ChapterEditor.tsx` — remove o botão de ajuda (`HelpCircle`) e o `SpellcheckHelpPopover`; mantém só o botão verde liga/desliga; persiste o estado em localStorage; mostra um pequeno spinner no botão enquanto o dicionário baixa pela primeira vez.

## Dependências novas

- `nspell` (~30KB)
- `dictionary-pt-br` (afixos + dicionário Hunspell oficial; carregado sob demanda)

## Riscos e mitigações

- **Tamanho do dicionário**: lazy-load + cache do browser; não afeta tempo de boot.
- **Performance em capítulos longos**: debounce 250ms + checagem apenas dos parágrafos alterados (usando `tr.mapping` para detectar ranges).
- **Conflito com corretor nativo**: forçamos `spellcheck="false"` enquanto o nosso está ativo. Quando o usuário desliga, restauramos `spellcheck="true"` para quem tiver dicionário no navegador (fallback gracioso).
- **Mobile**: o teclado virtual continua oferecendo autocorreção do sistema; nosso sublinhado aparece igual no toque longo (menu de contexto via `touchstart` longo → mesmo `SpellSuggestionsMenu`).

## Fora de escopo

- Gramática (concordância, regência) — só ortografia.
- Sincronizar dicionário pessoal entre dispositivos — fica em localStorage por enquanto.
