## Plano de Correções — Árvore dos Mundos
Ordem: **impacto no usuário/receita × esforço**. Itens P0 são bloqueadores ou brechas de receita; P3 são polimentos.

---

### 🔴 P0 — Crítico (receita, segurança, bugs visíveis)

**1. Enforcement server-side de `usePlanLimits`**
Hoje os limites de plano (mundos, capítulos, Codex) são validados no cliente. Risco direto de evasão de receita.
→ Mover validação para Edge Functions / RPCs com `SECURITY DEFINER` que checam `subscription_tier` antes de `INSERT`. Manter `usePlanLimits` apenas como UX.

**2. Webhook de pagamento sem observabilidade**
Falhas em webhooks (Stripe/Paddle) hoje passam silenciosas → assinante paga e não recebe acesso.
→ Adicionar Sentry (ou log estruturado em `webhook_events` com status `failed`) + alerta admin. Endpoint de replay manual.

**3. Lazy-loading de rotas no `App.tsx`**
Bundle inicial carrega Construir + Codex + Galeria + Escritor + Editor Tiptap + Worker do corretor de uma vez. LCP alto, principalmente em mobile.
→ `React.lazy` por tab + `<Suspense>` com skeleton dourado. Ganho esperado: -40% bundle inicial.

**4. Code-splitting do Tiptap + dicionário PT-BR**
~5MB de dicionário e extensões Tiptap entram mesmo em quem só está no Construir.
→ Dynamic import do `RichTextEditor` e do `spellWorker` somente ao abrir um capítulo.

---

### 🟠 P1 — Alto impacto

**5. Landing pública em `/`**
Hoje `/` redireciona para login. Sem porta de entrada SEO/orgânica.
→ Reaproveitar a landing existente em `mem://marketing/landing-page-and-conversion`, mover para rota pública, CTAs para `/login` e `/planos`. Meta tags, OG, JSON-LD.

**6. Loading UX da geração Premium (GPT Image 2 ~2min)**
Usuário acha que travou. Risco de duplo clique = duplo débito.
→ Botão disabled + barra de progresso indeterminada com mensagens rotativas ("Idriel está pintando os detalhes…"), timeout claro, retry idempotente via `request_id`.

**7. Auditoria de breakpoints tablet (768–1024px)**
Galeria, Escritor e Codex quebram nessa faixa (apontado na auditoria original).
→ Pass sistemático trocando `md:` por `lg:` onde a densidade está alta; testar em 820×1180 (iPad Air).

**8. Justificativas das notas dos Frutos**
Análise dá 0–5 sem mostrar de onde veio. Reduz confiança pedagógica.
→ Edge function `analyze-world` já retorna texto; persistir `excerpts: [{fruto, trecho, justificativa}]` em `world_analyses` e exibir no modal de cada Fruto.

---

### 🟡 P2 — Médio (qualidade percebida)

**9. Streaming SSE para Idriel (chat + análise)**
Hoje a resposta aparece de uma vez após 8–15s.
→ Migrar `idriel-help` e `analyze-world` para resposta em stream (já usamos Gemini 3 Flash, suporta SSE nativo). Token-by-token na UI.

**10. Rate limiting e retry nas Edge Functions de IA**
Sem proteção contra abuso ou picos. Falhas transientes do gateway quebram UX.
→ Rate limit por `user_id` em tabela `ai_rate_limits` (janela deslizante). Retry exponencial (3x) em 429/5xx no cliente do gateway.

**11. Busca global cross-world**
Apontado na auditoria. Usuário com 3+ mundos não consegue encontrar onde citou um personagem.
→ `pg_trgm` + RPC `search_all(query, user_id)` retornando hits em Codex/Capítulos/Frutos com snippet.

**12. Cobertura completa de `aria-label` + contraste**
Já fizemos uma passagem; faltam Galeria (cards de imagem), Codex (filtros), modais de exportação.
→ Auditoria automatizada via `@axe-core/playwright` em CI e correção dos achados.

---

### 🟢 P3 — Polimento

**13. Cache de assets no Vite/CDN**
Headers `Cache-Control: immutable` para `/assets/*` hasheados; revisar headers no Hostinger.

**14. Skeleton states consistentes**
Codex e Galeria piscam vazios antes de renderizar. Adicionar skeletons dourados padronizados.

**15. Onboarding tour — revisão de copy**
Após mudanças de custo (1/2/5/15 gotas) e novo corretor automático, alguns passos do tour estão desatualizados.

**16. Telemetria de produto**
Hoje sem visão de funil (signup → 1º mundo → 1ª análise → assinatura). Adicionar PostHog ou eventos próprios em `analytics_events`.

---

### Ordem de execução sugerida (sprints curtos)

```text
Sprint 1 (2-3 dias) — Receita & Performance
  └─ P0 #1 enforcement   ├─ P0 #3 lazy routes
  └─ P0 #2 webhook obs   └─ P0 #4 split Tiptap

Sprint 2 (2-3 dias) — Conversão & UX crítica
  └─ P1 #5 landing pública
  └─ P1 #6 loading Premium
  └─ P1 #7 tablet pass

Sprint 3 (2 dias) — Confiança na IA
  └─ P1 #8 justificativas
  └─ P2 #9 streaming SSE
  └─ P2 #10 rate limit + retry

Sprint 4 (2 dias) — Qualidade & descoberta
  └─ P2 #11 busca global
  └─ P2 #12 a11y sweep
  └─ P3 #13–#16
```

### Recomendação
Começar pelo **Sprint 1** — protege receita (#1, #2) e dá ganho de performance imediato (#3, #4) mexendo em poucos arquivos (`App.tsx`, `vite.config.ts`, RPCs Supabase e webhook handler). Posso seguir direto por aí assim que aprovar.
