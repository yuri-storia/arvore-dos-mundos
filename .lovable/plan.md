# Histórico de Importações com Idriel

Adicionar uma camada de **memória das importações** dentro do diálogo "Importar com Idriel", para o usuário voltar em um documento já enviado, ver o que já virou ficha/artigo no Codex, e pedir à Idriel que procure apenas o que ainda falta.

## Comportamento

Dentro de `IdrielImportDialog`, adicionar uma nova aba/seção **"Importações anteriores"** ao lado do passo de upload.

Cada item da lista mostra:
- Nome do arquivo (ou "Texto colado · 12.345 caracteres")
- Data da importação
- Mundo de origem
- Contagem: `X de Y sugestões criadas` (com barra de progresso)
- Botões: **Revisar** · **Buscar o que falta** · **Excluir**

### Revisar
Reabre a tela de review com as sugestões originais. Cada sugestão mostra um estado:
- ✅ **Criada** (com link para abrir no Codex)
- ⚪ **Não criada** — checkbox habilitado para criar agora
- 🗑️ **Criada e depois excluída** (badge cinza) — checkbox habilitado para recriar

A detecção é feita comparando `title` + `fruit_id` com as entradas atuais do Codex do mundo. Quando o usuário criar entradas novas, atualizamos a tabela de import.

### Buscar o que falta
Re-roda a análise no mesmo documento, mas envia ao prompt da Idriel a lista de títulos já existentes no Codex do mundo com a instrução: *"Ignore entidades já catalogadas abaixo. Foque em personagens, locais e conceitos citados no texto que ainda não aparecem nesta lista."* Cobra 5 gotas normalmente. O resultado entra na mesma tela de review, mesclado com as sugestões anteriores não criadas.

### Persistência
- Documentos (PDF/DOCX/TXT/MD) ficam em um bucket privado por até 60 dias para permitir o "buscar o que falta" sem novo upload. Texto colado é salvo direto no banco (até 400k chars).
- Após 60 dias o arquivo é descartado mas o registro de sugestões permanece — o usuário ainda consegue **Revisar**, só não consegue **Buscar o que falta** sem reenviar.

## Esquema de dados (backend)

Tabela `idriel_imports`:
- `id uuid pk`
- `user_id uuid` (RLS = auth.uid())
- `world_id uuid` (FK worlds, cascade)
- `source_kind text` ('pdf' | 'docx' | 'txt' | 'md' | 'texto')
- `source_name text` (nome do arquivo ou rótulo)
- `source_size int` (bytes ou char count)
- `storage_path text null` (path no bucket privado, null para texto colado)
- `pasted_text text null` (até 400k, só quando source_kind='texto')
- `suggestions jsonb` (array de `{ title, summary, type, fruit_id, created_entry_id?: uuid }`)
- `created_at timestamptz`, `expires_at timestamptz` (created_at + 60d)

Bucket privado novo: `idriel-imports` (RLS por user_id no path).

Edge function existente `idriel-import-text` ganha um modo opcional `excludeTitles: string[]` que é injetado no system prompt.

Cleanup: cron/edge para apagar arquivos com `expires_at < now()` (best-effort; sem bloquear MVP).

## Frontend

- Novo hook `useIdrielImports(worldId)` — CRUD + cálculo de "X criadas de Y" cruzando com `useCodexEntries`.
- `IdrielImportDialog` ganha tabs internas: **Nova importação** | **Histórico**.
- Componente `IdrielImportHistoryItem` para cada linha.
- Tela de Review é refatorada para aceitar `previousSuggestions` + `existingCodexTitles` e renderizar os badges de estado.
- Ao confirmar criação, gravar `created_entry_id` em cada sugestão correspondente.

## Custos & limites

- Salvar histórico: **grátis**.
- Revisar (sem IA): **grátis**.
- Buscar o que falta: **5 gotas** (mesma cobrança da importação original).
- Limite de 30 importações por mundo (FIFO — exclui automaticamente as mais antigas).

## Fora de escopo

- Diff visual entre versões diferentes do mesmo documento.
- Re-OCR de PDFs já processados (reusamos o arquivo bruto).
- Compartilhamento de importações entre mundos.
