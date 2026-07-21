# Linha do Tempo — nova funcionalidade do Codex

Uma trilha vertical dourada, ornamental (estética monárquica/medieval fantástica), que brota das raízes da Árvore dos Mundos e recebe fatos históricos do mundo do criador. Fichas/artigos podem ser ancorados em pontos da linha; entradas exclusivas nascem direto nela.

## O que muda para o usuário

1. **Novo sub-modo no Codex**: acima dos filtros de Fichas/Artigos ganha um toggle "Enciclopédia | Linha do Tempo".
2. **Frutos renomeados / integrados**:
   - Fruto 3 "Linha do Tempo" → **"Fatos Históricos"** (só troca de nome, não muda ordem/estrutura).
   - Ao usar "Consultar Idriel" nos Frutos **Fatos Históricos** e **Mitologia**, aparece uma opção extra "Enviar para a Linha do Tempo" além de "Criar ficha/artigo".
3. **Linha do Tempo (visual)**:
   - Tronco vertical dourado com filigranas, brotando de raízes SVG que casam com a hero da Árvore.
   - Marcos (nós) em forma de gema/selo real, com halo pulsante suave.
   - Cada nó abre um card lateral (drawer no mobile) com título, data narrativa (era/ano/mês livre em texto), descrição rica, tipo (Fato, Mito, Batalha, Descoberta, Nascimento, Queda, Ritual, Outro) e opcional: ficha/artigo vinculado.
   - Ordenação por `sort_index` numérico + fallback por data textual; drag-and-drop para reordenar (dnd-kit, já instalado).
4. **Ancoragem no Codex**: dentro de uma ficha/artigo, botão "Ancorar na Linha do Tempo" cria/relaciona um marco. No marco, botão "Abrir ficha vinculada" navega ao Codex.
5. **Idriel**: persona e `PLATFORM_KNOWLEDGE` do `idriel-help` atualizados para descrever a Linha do Tempo, o novo nome do Fruto 3 e a integração Fatos Históricos/Mitologia → Linha do Tempo.

## Escopo técnico

### Banco (migração)
- Nova tabela `public.timeline_events`:
  - `id uuid pk`, `user_id uuid not null`, `world_id uuid not null references worlds(id) on delete cascade`
  - `title text not null` (≤200), `description text` (≤10000), `era_label text` (texto livre curto, ex. "Era das Sombras · 342 AF")
  - `event_type text not null default 'fato'` (fato|mito|batalha|descoberta|nascimento|queda|ritual|outro)
  - `sort_index double precision not null default 0` (permite inserção entre dois nós sem renumerar tudo)
  - `codex_entry_id uuid null references codex_entries(id) on delete set null`
  - `fruit_id int null` (origem: 3 ou 6, quando criado pelo Construir)
  - `created_at`, `updated_at` timestamptz default now()
- GRANT SELECT/INSERT/UPDATE/DELETE para `authenticated`, ALL para `service_role`, sem `anon`.
- RLS: `user_id = auth.uid()` em SELECT/INSERT/UPDATE/DELETE.
- Trigger de validação de tamanho + `update_updated_at_column`.

### Frontend
- `src/hooks/useTimelineEvents.ts`: CRUD + reorder via React Query (mesmo padrão do `useCodexEntries`).
- `src/components/timeline/TimelineView.tsx`: layout desktop/tablet/mobile responsivo, SVG das raízes no topo, tronco central, nós à esquerda/direita alternados (mobile: só à direita do tronco).
- `src/components/timeline/TimelineNode.tsx`: gema dourada com selo do tipo, hover glow, click abre editor.
- `src/components/timeline/TimelineEventDialog.tsx`: form (título, era, tipo, descrição, vínculo com ficha via `CodexEntryPicker` existente).
- `src/components/timeline/TimelineRootsSVG.tsx`: raízes SVG que reaproveitam paleta gold/blue-glow.
- `src/components/TabCodex.tsx`: toggle Enciclopédia/Linha do Tempo persistido em `sessionStorage`.
- `src/components/CodexAnalysis.tsx` / consulta Idriel nos Frutos 3 e 6: novo botão "Enviar para a Linha do Tempo" que chama `createTimelineEvent` com `fruit_id`.
- `src/lib/data.ts`: renomear label do Fruto 3 para "Fatos Históricos" (mantendo id).
- Atualizar `supabase/functions/_shared/idriel-persona.ts` e `PLATFORM_KNOWLEDGE` em `idriel-help/index.ts` para citar a Linha do Tempo, novo nome do Fruto e integrações.

### Estilo
- Tokens já existentes: `gold`, `gold-deep`, `gold-champagne`, `blue-glow`. Nenhum hardcode.
- Ornamentos: filigranas via SVG inline + `drop-shadow(0 0 12px hsl(var(--gold)/0.35))`.
- Animações suaves com `framer-motion` (já usado no projeto).

## Diagrama rápido

```text
        [Raízes SVG douradas]
                |
        ◆ Nascimento do Reino  (Era I · 0)
        |
   ◈ Batalha da Aurora  (Era II · 142)
        |
        ◆ Fundação da Ordem  ← vinculado à ficha "Ordem dos Selos"
        |
        …
```

## Fora de escopo (nesta entrega)
- Zoom cronológico numérico automático (datas continuam texto livre).
- Exportação PDF da Linha do Tempo.
- Compartilhamento público.
