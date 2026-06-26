# Auditoria: Importar com Idriel + Exportar Manuscrito

## Diagnóstico atual

### Importar com Idriel
- **Como funciona hoje:** o arquivo é processado **no navegador** com `pdfjs-dist` (PDF) e `mammoth` (DOCX), virando uma string de até 200 KB. Essa string vai como `text` para a edge function `idriel-import-text`, que manda no Gemini 3 Flash.
- **Problemas reais:**
  1. Extração local perde estrutura (tabelas, hierarquia de títulos, ordem de blocos em PDFs com colunas).
  2. PDFs escaneados/imagéticos viram texto vazio — sem OCR.
  3. Corte rígido em 200 KB descarta documentos longos antes da IA decidir o que importa.
  4. Mammoth devolve só "raw text", então estilos de capítulo do DOCX somem.

### Exportar Manuscrito
- **PDF (`jsPDF`):** fonte Helvetica padrão, sem capítulo em página dedicada bonita, sem cabeçalho/rodapé, sem numeração, sem sumário, sem capitular, parágrafos sem recuo, quebras de linha pobres. Visualmente "rascunho".
- **DOCX (`docx`):** já está OK, só falta afinar para parecer um Google Docs limpo (Calibri/Arial, margens padrão, espaçamento 1.15, parágrafos com recuo, numeração de página, sumário).
- **Kindle (HTML):** entrega um `.html`, não um `.epub`. O KDP aceita HTML mas a experiência é instável; quem importa pelo Kindle Previewer espera `.epub` válido (com `mimetype`, `META-INF/container.xml`, `OEBPS/content.opf`, `toc.ncx`, `nav.xhtml`). Sem isso, a chance de o livro reprovar na validação da Amazon é alta.

---

## Mudanças propostas

### 1. Idriel passa a "ler" o documento de verdade (multimodal)

Em vez de extrair texto no cliente, enviar o **arquivo binário** direto para o Gemini via Lovable AI Gateway, igual aos chats de IA modernos.

- **Modelo:** continuar em `google/gemini-3-flash-preview` (suporta PDF nativo, contexto de ~1M tokens, custo baixo). **Não precisa subir para Pro** — o Flash já lê PDFs longos com qualidade muito boa. Se um dia quisermos qualidade máxima em livros densos, ativamos `google/gemini-3-pro-preview` num toggle "Análise profunda" (custa ~10× mais).
- **Fluxo novo:**
  1. Cliente lê o arquivo como base64 (sem extrair texto).
  2. Envia para `idriel-import-text` como `{ file_data, mime_type, filename }`.
  3. Edge function monta a chamada multimodal:
     ```
     content: [
       { type: "text", text: "<prompt curadora>" },
       { type: "file", file: { filename, file_data: "data:application/pdf;base64,..." } }
     ]
     ```
  4. Gemini lê o documento internamente (inclui OCR de páginas escaneadas) e devolve o JSON de entradas.
- **Limites:** aceitar até **20 MB** por upload (limite do gateway). DOCX continua sendo convertido para texto no servidor (Gemini não lê DOCX nativo) — mas sem corte de 200 KB. PDF e TXT/MD vão diretos.
- **Custo:** mesma cobrança atual (5 gotas por importação). PDFs grandes consomem mais tokens internos, mas continua dentro da margem.

### 2. Exportar PDF — diagramação de livro

Migrar de `jsPDF` puro para **`pdfmake`** (já leve, controle fino de tipografia) ou manter `jsPDF` com layout artesanal. Recomendo `pdfmake`.

Entregar:
- **Capa:** título centralizado em serifada grande, autor opcional, sinopse em itálico abaixo, separador ornamental.
- **Sumário automático** com número de página real.
- **Página de capítulo:** título em página ímpar, espaço respirado no topo, número do capítulo discreto acima.
- **Corpo:** fonte serifada (Lora/Merriweather embarcada), tamanho 11pt, entrelinha 1.45, parágrafos com recuo de 1ª linha (sem linha em branco entre eles, padrão livro), justificado com hifenização básica.
- **Cabeçalho:** título do livro (versais) à esquerda, título do capítulo à direita.
- **Rodapé:** numeração centralizada, começando depois do sumário.
- **Quebras:** capítulo sempre começa em página nova; última linha de parágrafo não fica órfã isolada (controle de `widows/orphans`).

### 3. Exportar DOCX — padrão Google Docs limpo

Ajustes no `docx` atual:
- Fonte **Calibri 11pt** (default do Word/Docs) ou Georgia 11pt se quisermos serifa.
- Margens 2,54 cm (1 pol).
- Espaçamento de linha **1.15**, espaço depois do parágrafo de 8pt.
- Estilo `Heading 1` para capítulos (entra automático no painel de navegação do Word/Docs).
- Recuo de primeira linha de 1,25 cm nos parágrafos do corpo.
- Numeração de página no rodapé.
- Sumário (`TableOfContents`) na 2ª página, atualizável no Word.

### 4. Exportar Kindle/EPUB — `.epub` real, validado

Substituir o HTML por um **EPUB 3** real, gerado client-side:
- Estrutura mínima EPUB3: `mimetype` (sem compressão), `META-INF/container.xml`, `OEBPS/content.opf` (manifest + spine + metadata Dublin Core), `OEBPS/nav.xhtml` (TOC navegável), `OEBPS/toc.ncx` (compat. Kindle antigo), 1 XHTML por capítulo.
- Metadados completos: `dc:title`, `dc:creator`, `dc:language=pt-BR`, `dc:identifier` (UUID), `dc:date`.
- CSS embarcado com tipografia de e-book (serifada, line-height 1.6, indent em parágrafos, capítulos sempre em nova página via `page-break-before`).
- Capa opcional (se o manuscrito tiver imagem futuramente).
- Empacotamento via **`jszip`** (já está no projeto pelas dependências do docx) — gera `.epub` válido.
- Resultado: passa no **EPUB Validator** (epubcheck) e importa limpo no **Kindle Direct Publishing** e no **Kindle Previewer**.

Manter o HTML como fallback opcional? Não — substituir totalmente. `.epub` é o que o KDP recomenda.

---

## Detalhes técnicos

- **Arquivos a alterar:**
  - `src/components/IdrielImportDialog.tsx` — parar de chamar `extractTextFromFile`; passar a ler `file.arrayBuffer()` → base64 e enviar `{ file_data, mime_type, filename }`.
  - `src/lib/textExtractor.ts` — manter só para `.docx`/`.txt`/`.md` (Gemini não lê DOCX nativo); PDF vai cru.
  - `supabase/functions/idriel-import-text/index.ts` — aceitar payload novo, montar mensagem multimodal quando `mime_type === application/pdf`, manter fluxo de texto para DOCX/TXT, subir o cap de tamanho para 15 MB.
  - `src/lib/manuscriptExport.ts` — reescrever `exportManuscriptPDF` (via `pdfmake`) e `exportManuscriptEPUB` (via `jszip`), ajustar `exportManuscriptDOCX`.
  - `package.json` — adicionar `pdfmake` e `jszip` (se ainda não estiver direto).

- **Custos LLM:** sem mudança no preço por importação (5 gotas). PDFs muito grandes podem estourar contexto — vamos limitar upload a 15 MB e ~300 páginas no prompt.

- **Riscos:**
  - `pdfmake` adiciona ~300 KB ao bundle do editor. Mitigação: import dinâmico só quando o usuário clicar em "Exportar PDF".
  - Geração de EPUB no cliente é CPU-light, sem risco.
  - Multimodal no Gateway: já documentado e suportado para `google/*` via `type: file`.

---

## Ordem de execução

1. **Idriel multimodal** (cliente + edge function) — entrega leitura nativa de PDF, fim do limite de 200 KB.
2. **EPUB real** — vital pro Kindle, prioridade alta.
3. **PDF diagramado** — `pdfmake` com capa, sumário, cabeçalho/rodapé, tipografia de livro.
4. **DOCX afinado** — ajustes finos de estilo.

Cada etapa é independente e validável: testo importação de um PDF longo, exporto um manuscrito de exemplo nos 3 formatos e abro no Kindle Previewer + Word + leitor de PDF.

Posso seguir nessa ordem?
