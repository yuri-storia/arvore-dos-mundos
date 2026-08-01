## Escopo

Refatoração das duas ferramentas visuais (Galeria → Criar com Idriel, e Construir → Forjar Mapa do Mundo) para uma arquitetura única, com GPT Image 2 como provedor exclusivo, prompts compilados no servidor e imagens persistidas em arquivo.

---

### 1. Provedor único: GPT Image 2

- `supabase/functions/_shared/image-provider.ts` (novo): função única que chama `/v1/images/generations` com `openai/gpt-image-2`, trata 429/402/content_policy e devolve o PNG em base64.
- Galeria passa a ter **nível único de qualidade** (`quality: "high"`, 1024×1024). Removo o seletor Rascunho/Padrão/Máxima da UI.
- Mapa também usa `high`, mantendo **5 gotas** (custo centralizado numa constante única, fácil de revisar depois).
- Custo da Galeria: passa a ser sempre o tipo de cota `image_premium` (15 gotas). Isso é o efeito direto de "nível único, sempre alta qualidade" — sinalizo isso na UI antes de gerar, no modal de custo.
- `ai-image-consistent` deixa de usar Gemini e passa pelo mesmo provedor, com as referências entrando como imagens de entrada (edição/variação do GPT Image 2).

---

### 2. Compiladores de prompt centralizados

`supabase/functions/_shared/prompt-compilers.ts` (novo), com duas funções puras:

- `compileVisionPrompt({ description, style, imageType, tone, worldContext, codexCanon, references })` — cenas, personagens, objetos.
- `compileMapPrompt({ style, description, worldContext, geography, factions, cultures })` — cartografia, com regras próprias: vista de topo, rosa dos ventos, escala, coerência de biomas e fronteiras, sem texto ilegível/inventado.

Ambos rodam a etapa de refino via `ai-text` **dentro da edge function** (hoje isso está duplicado no frontend), então o cliente envia apenas os parâmetros semânticos. Isso elimina a divergência entre as duas telas e evita que o prompt final viaje pelo cliente.

---

### 3. Referências visuais com papéis (Galeria)

Novo componente `src/components/VisionReferencePicker.tsx`, reaproveitando o upload/otimização do `ImageReferencePicker`:

- Até **3 slots**, cada um com papel selecionável: **Identidade** (personagem/rosto), **Estilo** (paleta e traço), **Ambiente** (cenário/atmosfera).
- Upload manual + escolha rápida entre imagens do Codex/Galeria do mundo.
- Os papéis são traduzidos em instruções explícitas no prompt compilado e enviados como imagens de entrada ao GPT Image 2.
- O pacote automático de canon do Codex continua existindo, mas como complemento textual, não substituindo as referências manuais.

---

### 4. Persistência em Storage (fim do base64 no banco)

- Toda imagem gerada é enviada pela edge function ao bucket `codex-images`, em `{user_id}/generated/{uuid}.png`, e o banco passa a guardar a **URL pública**.
- Vale para `idriel_visions.image_url`, `map_history.image_url` e `gallery_images.src`.
- Registros antigos em base64 continuam funcionando (a UI só renderiza a string, seja data URL ou URL).
- Ganho direto: histórico de mapas e visões deixa de arrastar megabytes por linha.

---

### 5. UI congruente

- **Galeria (`TabGerarImagens`)**: remove o seletor de qualidade; adiciona o bloco de referências com papéis; modal de custo mostra 15 gotas e o tempo estimado; estado de progresso (compondo prompt → gerando → salvando).
- **Mapa (`MapGenerator`)**: mantém o carrossel de estilos, passa a enviar só os parâmetros; custo 5 gotas inalterado; reprocessar usa o mesmo caminho.
- Mensagens de erro amigáveis unificadas (bloqueio de conteúdo, gotas insuficientes, limite de requisições).

---

### Detalhes técnicos

**Ordem de execução:**
1. `_shared/image-provider.ts` + `_shared/prompt-compilers.ts` + helper de upload no Storage.
2. Reescrita de `ai-image` (nível único, prompt compilado no servidor, upload) e `ai-image-consistent` (referências com papéis).
3. `src/lib/helpers.ts`: novas assinaturas (`generateVision(params)`, `generateMap(params)`).
4. `VisionReferencePicker` + refatoração de `TabGerarImagens`.
5. Refatoração de `MapGenerator`.
6. Teste real ponta a ponta de cada função com leitura da resposta.

**Sem migração de banco** — as colunas já são `text` e recebem URL sem mudança de schema. Políticas de `storage.objects` do bucket `codex-images` já permitem escrita autenticada; se a escrita via service role falhar no teste, adiciono a política necessária.

**Riscos:**
- GPT Image 2 é mais lento (~40-120s). Mantenho o indicador de fases e o cronômetro já existentes.
- Moderação da OpenAI é mais restritiva que a do Gemini; prompts com IP/violência explícita podem ser recusados. Trato o erro com mensagem clara em vez de falha genérica.
- Galeria passa de 5 para 15 gotas por imagem no fluxo padrão — impacto direto na percepção de custo do usuário Idriel (100 gotas/mês = ~6 imagens). Vale reavaliar depois de ver o uso real.

**Fora de escopo (conforme combinado):**
- Camada de rótulos editáveis no mapa.
- Migração retroativa das imagens base64 já salvas.
