
# Plano de Redesign UI/UX — A Árvore dos Mundos

## Fase 1: Navegação (Sidebar + Bottom Bar Mobile)
- Criar sidebar colapsável no desktop com: abas principais, lista de mundos, botão de novo mundo
- Manter bottom bar apenas no mobile (< 768px)
- Mover WorldNameInput e controles de projeto para dentro da sidebar
- Ajustar layout do Index.tsx para usar SidebarProvider
- Remover padding-bottom hack do footer

## Fase 2: Simplificar Aba Construir
- Reduzir campos dos frutos de 4-5 para 2-3 essenciais (mesclar campos redundantes)
- Melhorar placeholders: curtos e diretos em vez de parágrafos
- Unificar botões de IA: 1 painel Idriel por fruto em vez de 1 por campo
- Simplificar fluxo CreateFichaButton: título auto-sugerido, menos cliques
- Tornar o FruitGuideBlock mais compacto e colapsável por padrão

## Fase 3: Melhorias no Codex e Galeria
- Filtros por fruto em dropdown em vez de pills horizontais
- Upload batch na Galeria sem modal intermediário por imagem
- Melhorias visuais nos cards de fichas/artigos

## Abordagem
- Incremental: implementar e testar cada fase antes de avançar
- Começar pela Fase 1 (navegação)
