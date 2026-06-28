# Plano: unificar landing pública

## Objetivo
Ter **uma única página pública** que explique o app para visitantes não logados, usando a copy enviada. Hoje existem duas (`/` LandingPage e `/planos` PricingPage). A nova landing absorve tudo, e `/planos` passa a ser uma âncora dentro dela.

## Estrutura da nova `LandingPage.tsx`
12 blocos, na ordem da copy:

1. **Hero** — headline, subhead, dois CTAs, microcopy de 14 dias, placeholder de vídeo (12–18s, loop, sem áudio) com poster estático já existente (`hero` WebP responsivo).
2. **O Problema** — comparativo "Antes / Com a Árvore dos Mundos" em duas colunas.
3. **Como Funciona** — 4 cards (Plante / Cultive / Organize / Escreva) + placeholder vídeo tour (60–90s).
4. **11 Frutos** — texto + lista de benefícios do Fruto + selo "1.500 exemplares vendidos" + placeholder microvídeo (20–30s).
5. **Codex** — bullets + placeholder vídeo (20–30s).
6. **Idriel** — manifesto "sugere, você decide" + bloco "Análise de Mundo" + placeholder vídeo (35–50s).
7. **Ofício Completo** — 4 sub-blocos (Manuscritos, Storylines, Galeria/Mapas, Ferramentas de Foco) + placeholder vídeo (30–40s).
8. **Importação** — bloco renderizado condicionalmente via flag `FEATURE_IMPORT_PUBLIC = true` (default `true`, já que existe); fácil de esconder se precisar. Placeholder vídeo (30–45s).
9. **Segurança** — 6 compromissos em cards + botão "Conhecer nossa estrutura" → `/seguranca`. Sem promessas absolutas (segue diretriz da copy).
10. **Provas** — duas seções de depoimentos com placeholders ("Depoimentos do e-book" e "Beta testers"). Renderizados como cards vazios com nota editorial até serem preenchidos.
11. **Planos** — toggle Mensal/Anual, dois cards (Raiz / Idriel destacado como "Experiência Completa"), accordion de recargas, explicação do Elixir. **Substitui** a PricingPage atual.
12. **FAQ + Fechamento** — accordion com as 12 perguntas, encerramento poético + dois CTAs finais.

## Rotas
- `/` — nova LandingPage unificada (visitantes) / `Index` (logados). Mantém `HomeRoute`.
- `/planos` — **redireciona** para `/#planos` (âncora no Bloco 11). Mantém o link externo que já existe em e-mails/anúncios.
- `/login`, `/seguranca`, `/beta`, `/obrigado` — inalteradas.
- `PricingPage.tsx` — removida do roteador (arquivo mantido por ora caso precise reverter, mas pode ser apagado depois).

## Placeholders reservados
Componente `<VideoPlaceholder label="..." spec="..." />` reutilizável: card escuro com borda dourada tracejada, ícone de play, título do vídeo e a especificação resumida (duração + o que mostrar). Some automaticamente quando recebe a prop `src`. Isso deixa claro o que falta produzir sem quebrar o layout.

Placeholders para depoimentos: `<TestimonialPlaceholder kind="ebook" | "beta" />` com nota "Em curadoria — depoimentos serão adicionados após seleção."

## Design
Reuso integral do sistema atual (cores grimório, Cinzel/Merriweather/Montserrat, `card-glass`, gold tokens). Sem nova paleta. Animações `framer-motion` no padrão já usado.

## Detalhes técnicos
- Substituir `src/pages/LandingPage.tsx` pela nova versão (12 seções, componentes internos pequenos).
- Adicionar redirect `/planos` → `/#planos` em `App.tsx`.
- Remover import de `PricingPage` do `App.tsx`.
- Componente de planos lê toggle mensal/anual via `useState`; CTAs dos planos apontam para `/login?next=checkout&plan=raiz|idriel` (mantém o fluxo de checkout existente — sem mexer em lógica de cobrança).
- Bloco Importação atrás de constante local `SHOW_IMPORT_BLOCK = true`.
- SEO: atualizar `<title>` e `<meta description>` em `index.html` para refletir a página única (1.500 exemplares, 11 Frutos, 14 dias grátis).
- Acessibilidade: cada placeholder de vídeo com `role="img"` + `aria-label` descritivo; FAQ usa `<Accordion>` shadcn (já tem foco/teclado).

## O que **não** vou fazer agora
- Não vou produzir os vídeos — ficam como placeholders visuais claros.
- Não vou criar/editar a página `/seguranca` (já existe; só linko).
- Não vou mexer em preços/checkout/edge functions.
- Não vou apagar `PricingPage.tsx` no mesmo passo (só removo do router) — apago depois que você confirmar.

## Entrega
Um único PR de frontend: nova `LandingPage.tsx` + ajuste de rotas + meta tags.
