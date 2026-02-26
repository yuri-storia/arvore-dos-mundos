

# A Árvore dos Mundos — Template Interativo de Worldbuilding

## Visão Geral
Um app React completo em português do Brasil para escritores de ficção, com visual de grimório digital (dark fantasy épico), 4 abas principais e integração com OpenAI para assistência de IA em worldbuilding.

## Identidade Visual
- **Tema escuro atmosférico** com fundo #04080f, cards com blur/glassmorphism, bordas com glow azulado
- **Fontes Google**: Cinzel (títulos/fantasia), Montserrat (interface), Merriweather (conteúdo narrativo)
- **Paleta**: azuis (#1565c0, #2196f3, #64b5f6), dourado (#c8922a, #e8b84b), texto claro (#e8f4fd)
- **Animações**: fadeUp nos painéis, float na árvore do header, glow pulsante, dots de loading

## Componentes Globais (todas as abas)
- **Header**: badge Universo STORIA, árvore decorativa com animação flutuante, título estilizado, subtítulo em itálico
- **Banner de Limite Diário**: medidores de uso de IA (15 textos / 3 imagens por dia, localStorage por data)
- **Barra de Chave API**: input para chave OpenAI com validação visual, pills de custo
- **Campo Nome do Mundo**: input estilizado com fonte Cinzel
- **Navegação sticky**: 4 abas (Construir, Visão Geral, Galeria, Gerar Imagens)

## Aba 1 — 🌿 Construir (Editor Principal)
- **Toggle de metodologia**: Cima para Baixo / Baixo para Cima
- **Barra de progresso**: animada conforme preenchimento dos 11 frutos
- **Grid de 11 Frutos**: cards com aspect ratio 3:4, imagens temáticas placeholder (gradientes + ícones), contadores de progresso, badges de conclusão
- **Painel do Fruto selecionado**: imagem hero, campos de texto/textarea/select conforme especificação dos 11 frutos (Mapa, Político, História, Cultura, Magia, Seres, Economia, Linguagem, Mitologia, Personagens, Narrativa)
- **Assistente de IA**: chips de sugestão rápida (4 por fruto), input de pergunta, chamada à API OpenAI (GPT-4o mini), área de resposta com animação
- **Navegação entre frutos**: anterior/próximo, botão de exportar no último fruto

## Aba 2 — 🗺 Visão Geral (Dashboard)
- **5 cards de estatísticas**: Frutos Iniciados, Completos, Campos Preenchidos, Progresso Total (%), Imagens na Galeria
- **Resumo do Mundo**: até 6 campos-chave já preenchidos (Regiões, Governo, Magia, Protagonista, Deuses, Tom)
- **Grid de progresso por Fruto**: cards clicáveis com barras de progresso coloridas e badges de status
- **Botões**: Continuar Construindo, Exportar (.md)

## Aba 3 — 🖼 Galeria
- **Upload de imagens**: zona drag/click, suporte a múltiplos arquivos (PNG, JPG, WEBP)
- **Modal de upload**: preview, nome editável, seleção de categoria
- **Filtros**: Todos, Geral, Mapa do Mundo, Personagens, Criaturas, Arquitetura, Paisagens, Artefatos, Cultura
- **Grid de imagens**: cards com hover effect, botão de exclusão

## Aba 4 — ✨ Gerar Imagens
- **Formulário completo**: descrição em português, estilo visual (9 opções), tipo de imagem (8 opções), tom/iluminação (6 opções), detalhes extras
- **Etapa 1**: GPT-4o mini cria prompt otimizado em inglês para DALL-E/Midjourney
- **Etapa 2**: DALL-E 3 gera a imagem (1024x1024)
- **Ações**: copiar prompt para Midjourney/Leonardo, salvar na galeria, baixar imagem

## Exportação Markdown
- Arquivo .md completo com todos os campos preenchidos, organizado por fruto
- Download automático com nome baseado no mundo

## Estado e Persistência
- Estado em React (useState/useReducer) — sem persistência de dados de worldbuilding (stateless por sessão)
- localStorage apenas para limites diários de uso da API
- Chave API nunca persistida

## Responsividade
- Mobile (<600px): 3 colunas no grid de frutos, campos em 1 coluna
- Tablet (600-900px): 4-5 colunas, campos em 2 colunas
- Desktop (>900px): layout completo, max-width 1060px

