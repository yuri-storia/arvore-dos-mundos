// Client-side helpers para formatação barata de capítulos.
// Usa `localFormatPass` para tentar resolver sem IA (0 gotas). Se não der,
// chama a edge `ai-format-chapter` no modo apropriado:
//   • boundaries (1 gota, flash-lite) — texto plano.
//   • rewrite   (2 gotas, flash)     — HTML com marcações inline ricas.

import { supabase } from "@/integrations/supabase/client";
import { localFormatPass } from "@/lib/chapterFormatLocal";

export type FormatOutcome =
  | { kind: "local"; content: string; costDrops: 0; changed: boolean }
  | { kind: "ai-boundaries"; content: string; costDrops: 1 }
  | { kind: "ai-rewrite"; content: string; costDrops: 2 }
  | { kind: "error"; message: string; aborted?: boolean };

interface Args {
  content: string;
  guidance?: string;
}

/**
 * Aplica as fronteiras (first_line strings) devolvidas pela IA ao texto plano.
 * Cada linha encontrada abre um novo parágrafo. O texto entre fronteiras é
 * preservado byte a byte — a IA nunca reescreve nada.
 */
function applyBoundariesToPlain(plain: string, starts: string[]): string {
  const flat = plain.replace(/\s+/g, " ").trim();
  const cuts: number[] = [0];
  let searchFrom = 0;
  for (const s of starts) {
    const needle = s.trim();
    if (needle.length < 8) continue;
    // Busca em versão colapsada (a IA copia verbatim mas pode ter espaços
    // levemente diferentes; comparamos por versão normalizada).
    const idx = flat.indexOf(needle.replace(/\s+/g, " "), searchFrom);
    if (idx < 0) continue;
    if (idx <= cuts[cuts.length - 1]) continue;
    cuts.push(idx);
    searchFrom = idx + needle.length;
  }
  cuts.push(flat.length);

  const paras: string[] = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    const chunk = flat.slice(cuts[i], cuts[i + 1]).trim();
    if (chunk) paras.push(chunk);
  }

  return paras.map((p) => `<p>${escapeHtml(p)}</p>`).join("");
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Escolhe automaticamente o caminho mais barato que mantém qualidade.
 */
export async function smartFormatChapter({ content, guidance }: Args): Promise<FormatOutcome> {
  const pass = localFormatPass(content || "");

  // Caso 1 — pré-passo local já resolveu.
  if (!pass.needsAI) {
    return {
      kind: "local",
      content: pass.result,
      costDrops: 0,
      changed: pass.changed,
    };
  }

  // Caso 2 — precisa da IA. Escolhe o modo mais barato compatível.
  const mode = pass.suggestedMode;
  const textToSend = mode === "boundaries" ? pass.plainText : content;

  try {
    const { data, error } = await supabase.functions.invoke("ai-format-chapter", {
      body: {
        text: textToSend,
        mode,
        guidance: guidance?.trim() || undefined,
      },
    });
    if (error) {
      const msg = (data as { error?: string } | null)?.error || error.message || "Falha ao formatar.";
      return {
        kind: "error",
        message: msg,
        aborted: /gota|quota|credit|assinatura|plano/i.test(msg),
      };
    }

    if (mode === "boundaries") {
      const starts = (data as { starts?: string[] } | null)?.starts;
      if (!starts || starts.length === 0) {
        return { kind: "error", message: "A IA não retornou fronteiras." };
      }
      const html = applyBoundariesToPlain(pass.plainText, starts);
      if (!html || html.length < Math.floor(pass.plainText.length * 0.4)) {
        return { kind: "error", message: "Fronteiras inconsistentes com o texto." };
      }
      return { kind: "ai-boundaries", content: html, costDrops: 1 };
    }

    const formatted = (data as { formatted?: string } | null)?.formatted;
    if (!formatted) return { kind: "error", message: "A IA não retornou resultado." };
    return { kind: "ai-rewrite", content: formatted, costDrops: 2 };
  } catch (e) {
    return { kind: "error", message: e instanceof Error ? e.message : "Erro desconhecido." };
  }
}

/**
 * Preview de custo (sem chamar IA). Usado no diálogo de batch para mostrar
 * o custo total antes de rodar.
 */
export function previewChapterCost(content: string): 0 | 1 | 2 {
  const pass = localFormatPass(content || "");
  if (!pass.needsAI) return 0;
  return pass.suggestedMode === "rewrite" ? 2 : 1;
}
