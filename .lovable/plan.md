
# Ajustes + Novas Funcionalidades

## 1. Aba "Construir"

### 1.1 Histórico de sugestões de Idriel por fruto
- Nova tabela `idriel_suggestions` (user_id, world_id, fruit_id, question, response, created_at).
- Após cada resposta de Idriel em `TabConstruir`, salvar o par {pergunta, resposta}.
- Adicionar botão "📜 Histórico de Idriel" abaixo do bloco de resposta — abre um Drawer lateral listando todas as sugestões anteriores deste fruto (mais recentes no topo). Cada item é expansível e mostra ações: "Ver completo", "Salvar como ficha", "Salvar como artigo", "Excluir".

### 1.2 Renomear 3º Fruto e novo chip
- Em `src/lib/data.ts`: renomear `Fatos Históricos` → **`Linha do Tempo`** (mantém id=2). Atualizar descrição/guide brevemente.
- Adicionar chip `"Criar calendário"` na lista de chips desse fruto (ao lado dos chips existentes).

### 1.3 Salvar resposta de Idriel como ficha OU artigo (resumido)
- No bloco de resposta de Idriel, adicionar dois botões: **"💾 Salvar como Ficha"** e **"💾 Salvar como Artigo"**.
- Ao clicar, chamar uma função auxiliar `summarizeIdrielResponse()` que dispara o edge function `ai-text` com instrução clara: *"Resuma o seguinte conselho de worldbuilding em 3-5 parágrafos objetivos, em terceira pessoa, sem trejeitos místicos. Mantenha apenas o conteúdo factualmente útil."* O resumo é o conteúdo salvo. Pré-visualização em diálogo antes de confirmar (usuário pode editar título/conteúdo).

### 1.4 Indicar tipo recomendado (Ficha vs Artigo) no "Sobre este Fruto"
- Adicionar campo `recommendedType: 'ficha' | 'artigo' | 'both'` em cada entrada de `FRUITS`.
- No `FruitGuideBlock`, exibir uma faixa logo no topo da seção "Sobre este Fruto" tipo: *"🌿 Idriel sugere que este Fruto gere principalmente **Fichas** — entradas estruturadas e visuais (personagens, lugares, criaturas)."* ou variação para "Artigos" (lore, sistemas, conceitos).
- Mapeamento por fruto:
  - Fichas: 0 (Mapa→regiões), 5 (Seres), 9 (Personagens)
  - Artigos: 1 (Político), 2 (Linha do Tempo), 4 (Magia/Tec — exceto campo de itens), 6 (Economia), 7 (Linguagem), 8 (Mitologia), 10 (Narrativa)
  - Misto: 3 (Cultura)
- Estender `getEntryTypeForField()` para usar essa convenção por campo (já parcialmente feito).

### 1.5 Chip "Criar idioma do zero" no fruto Linguagem
- Adicionar chip especial no fruto 7. Ao clicar, abre um modal "Construtor de Idioma" com formulário guiado (família fonética, sons proibidos, terminações comuns, 3 termos de exemplo) e dispara `ai-text` para gerar:
  - Padrão fonético + 10 nomes de exemplo + 5 expressões idiomáticas.
- Resultado pode ser salvo como artigo no Codex com um clique.

### 1.6 Campo "Item Mágico/Tecnológico" salva como Ficha
- Já existe override em `getEntryTypeForField` (`fruitId === 4 && fieldId === 'items'`). Confirmar que está funcionando para o campo `magicitems` (corrigir id se necessário).

### 1.7 Sistema de magia → artigo automático (já existe, generalizar memória)
- Comportamento atual já cria/atualiza artigo. Adicionar coluna `magic_system_choice` à tabela `worlds.db` (já é jsonb, basta persistir o último valor escolhido) — ao trocar a opção, o pop-up sempre dispara, mesmo na 2ª/3ª vez. O id do artigo criado é guardado em `worlds.db[4].__magic_article_id` para sempre atualizar o mesmo.

### 1.8 Persistência de rascunhos (auto-save universal)
- Já existe autosave de mundos (2s) em `useWorlds`. Verificar se TODOS os campos de `db` estão entrando no autosave (são, via `updateField`). Adicionar:
  - autosave da pergunta atual de Idriel (`aiQuestion`) por fruto, em `localStorage` chave `idriel_draft_<worldId>_<fruitId>`, restaurado ao remontar o componente.
  - autosave de qualquer rascunho não-salvo de ficha/artigo (modal de criação) em `localStorage`.

---

## 2. Aba "Codex"

### 2.1 Bug de abertura da ficha (rolagem indesejada)
- Substituir o overlay manual (`fixed inset-0 ... flex items-center`) por componente `Dialog` do shadcn (já presente no projeto). Benefícios automáticos:
  - Scroll lock no body
  - Foco capturado, ESC fecha
  - Modal sempre centrado no viewport sem depender da posição de scroll
- Mover o conteúdo expandido do `CodexCard` (modos `expanded={true}`) para dentro de um `<Dialog>` controlado por `expandedId`. Largura `max-w-[900px]`, altura `max-h-[90vh]`, com `overflow-y-auto` interno.

### 2.2 Cor da fonte mais branca dentro de fichas/artigos
- Substituir `text-muted-foreground` (que está bem dim) por `text-foreground/90` ou definir nova classe utilitária `text-codex-body` no `index.css` mapeando para HSL próximo a `0 0% 95%`.
- Aplicar no `CodexCard` linhas 164, 201, 309, 488 (preview e expanded body).

---

## 3. Aba "Escrever"

### 3.1 Múltiplos manuscritos com switcher
- `useManuscript` já suporta `manuscripts[]` e `setActiveManuscript`. Faltam UI:
  - Adicionar dropdown ao lado do título do manuscrito mostrando todos os manuscritos do mundo + "+ Novo manuscrito" + "Excluir manuscrito atual".
  - Ao trocar, scenes/chapters re-fetch automaticamente (efeito já existe).

### 3.2 Pré-visualização inline de referências do Codex
- Substituir comportamento atual onde `@nome` fica como texto:
  - Render do conteúdo do capítulo agora será uma camada dupla — `textarea` para edição, mas no modo "preview" (toggle no topo), mostra HTML com `@nome` como **chip clicável**.
  - Clicar no chip abre um **Popover lateral** dentro da própria aba Escrever (não modal full-screen) com a ficha/artigo renderizado em modo somente-leitura. Fica posicionado à direita, ocupando o painel de referências.
  - Manter o autocomplete `@` para inserir.

### 3.3 "Mural de Arcos" → "Storyline" com colunas customizáveis
- Renomear UI label: `Mural de Arcos` → **`Storyline`**.
- Nova tabela `storylines` (id, user_id, world_id, manuscript_id NULLABLE, name).
- Nova tabela `storyline_columns` (id, storyline_id, title, sort_order, color).
- Tabela `scenes` ganha coluna `storyline_column_id` (nullable, FK lógico). Manter `status` como fallback durante migração.
- UI:
  - Dropdown de storylines acima do board (semelhante ao de manuscritos). Default: storyline única chamada "Sem título" com 1 coluna "Sem título".
  - Botão "+ Coluna" cria nova coluna ao lado.
  - Título de cada coluna é editável inline (clique).
  - Filtro superior deixa de filtrar por capítulo — passa a permitir vincular a storyline a um manuscrito específico (opcional) via dropdown "Vincular a manuscrito".
  - Drag & drop entre colunas atualiza `storyline_column_id`.

### 3.4 Pomodoro com som mágico, ciclos e cancelamento
- Adicionar arquivo `public/sounds/chimes.mp3` (sino suave). Pré-carregar via `new Audio('/sounds/chimes.mp3')`.
- Configurações expandidas no popover do `PomodoroTimer`:
  - Tempo de foco (já existe)
  - Tempo de pausa curta (já existe)
  - Tempo de pausa longa (default 60min)
  - Ciclos até pausa longa (default 4)
- Ao zerar o timer: tocar `chimes.mp3` e exibir toast "Tempo concluído ✦".
- Botão "⏹ Cancelar sessão" ao lado de play/pause durante uma sessão ativa — reseta o ciclo.
- Contador visual: "Ciclo 2/4" abaixo do timer.

---

## 4. Aba "Galeria"

### 4.1 Espaço "neutro" para imagens geradas no app
- Adicionar coluna `status` à `gallery` (no jsonb da tabela `worlds.gallery`): valores `'unsorted' | 'kept' | 'tagged'`. Default `unsorted` para imagens geradas via `ai-image` em qualquer ponto do app (Codex card AI, Visões de Idriel, mapa).
- UI da Galeria ganha aba/seção no topo: **"📥 Caixa de Visões Recentes"** (mostra apenas `unsorted`). Cada imagem tem 3 botões:
  - **🌳 Etiquetar** (abre seletor de fruto/categoria → marca `tagged` + define `cat`)
  - **💾 Manter na galeria** (vai para `kept`)
  - **🗑 Excluir**
- Imagens upload manual continuam indo direto para `kept` na categoria escolhida (comportamento atual).
- Atualizar `addToGallery` em `helpers.ts` para aceitar `status: 'unsorted'` quando vier de geração automática.

---

## 5. Novas funcionalidades de Idriel

### 5.1 Importar PDFs/textos → fichas e artigos sugeridos
- Novo edge function `idriel-import-text`:
  - Input: texto extraído do arquivo (até 200k chars) + tipo de conteúdo (livro, resumo, anotação).
  - Usa `google/gemini-2.5-pro` com instrução estruturada para retornar JSON: `{ entries: [{ type: 'ficha'|'artigo', title, fruit_id, summary }] }`.
  - Custo: 5 gotas (analisa contexto pesado).
- UI: nova entrada no menu "+ Nova Entrada" do Codex → **"📚 Importar de arquivo"**. Modal:
  - Upload de PDF/DOCX/TXT (extração client-side via `pdf.js` para PDF, mammoth para DOCX, leitura direta para TXT).
  - Botão "Analisar com Idriel" → mostra lista de sugestões com checkboxes.
  - Botões: "Criar selecionadas" / "Criar todas".
- Cada item criado segue regras de plan limit (`usePlanLimits`).

### 5.2 Geração de imagens consistentes com Codex
- Nova feature na aba Galeria (Visões de Idriel) e dentro do `CodexCard`:
  - Toggle **"🔗 Manter consistência com o Codex"** ao gerar imagem.
  - Quando ativo, o sistema:
    1. Busca todas as fichas com imagem do mesmo fruto/categoria relacionada (até 5).
    2. Constrói prompt com referências textuais (descrições) E passa as URLs das imagens existentes para o modelo `google/gemini-3.1-flash-image-preview` (suporta multi-image input).
    3. Adiciona instruções de estilo: "Maintain consistent character design, lighting, and color palette with the reference images."
- Novo edge function `ai-image-consistent` (variante de `ai-image`) que aceita array `referenceImageUrls: string[]` e monta a chamada com `content: [{type:'text'}, {type:'image_url', ...}]`.
- Em uma ficha de personagem, novo botão "🎨 Gerar imagem consistente" usa as outras imagens das fichas relacionadas (mesma cultura/raça/local) automaticamente.

---

## Resumo técnico (DB / arquivos)

**Novas tabelas (migration):**
- `idriel_suggestions` — histórico de respostas de Idriel
- `storylines` — agrupamentos de colunas Kanban
- `storyline_columns` — colunas customizáveis
- `scenes.storyline_column_id` (nullable) — vínculo opcional

**Novos edge functions:**
- `idriel-import-text` — extrai sugestões de fichas/artigos de um texto longo
- `ai-image-consistent` — geração de imagem com referências visuais

**Arquivos editados (principais):**
- `src/lib/data.ts` (rename Fruto 3, recommendedType, chips)
- `src/components/TabConstruir.tsx` (histórico, salvar resposta, idioma do zero, recomendação)
- `src/components/FruitGuideBlock.tsx` (faixa de recomendação)
- `src/components/TabCodex.tsx` (Dialog para expandir, importar arquivo)
- `src/components/CodexCard.tsx` (cor de texto, gerar consistente)
- `src/components/TabEscrever.tsx` (switcher manuscritos, popover ref inline, storylines)
- `src/components/escritor/KanbanBoard.tsx` (colunas dinâmicas)
- `src/components/PomodoroTimer.tsx` (som, ciclos, cancelar)
- `src/components/TabGaleria.tsx` (caixa de visões recentes)
- `public/sounds/chimes.mp3` (novo asset)

**Hooks novos:** `useIdrielHistory`, `useStorylines`, `useImportText`.

---

## Ordem sugerida de execução
1. Migrations (tabelas novas + colunas novas)
2. Bug do Codex (Dialog) + cor da fonte — entrega rápida visível
3. Renomear Fruto 3 + recomendação de tipo + histórico de Idriel
4. Pomodoro completo (som, ciclos, cancelar)
5. Caixa de visões recentes na Galeria
6. Switcher de manuscritos + popover de referências inline
7. Storylines (rebuild do Kanban)
8. Importar PDF/texto (Idriel)
9. Geração de imagem consistente

Após aprovação, posso executar em sequência ou priorizar um subconjunto se preferir entregar em ondas.
