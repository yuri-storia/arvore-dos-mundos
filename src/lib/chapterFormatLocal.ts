// Pré-passo determinístico de formatação de capítulo. Sem IA, sem custo.
// Regras conservadoras — só aplicamos onde o resultado é inequívoco.
//
// Se o texto ainda parece "colado" depois do pré-passo, sinalizamos
// `needsAI=true` para que o cliente chame a edge function.
//
// Detecta também se o conteúdo tem marcações inline ricas (<em>, <strong>,
// <u>, <s>, <a>, <mark>) — nesses casos o modo "fronteiras" perderia
// formatação, então recomendamos o modo `rewrite`.

export type LocalPassResult = {
  /** HTML pronto para gravar de volta no capítulo. */
  result: string;
  /** True se algo mudou em relação ao original. */
  changed: boolean;
  /** True se o pré-passo não resolveu tudo e a IA ainda é necessária. */
  needsAI: boolean;
  /** Modo recomendado para IA quando needsAI=true. */
  suggestedMode: "boundaries" | "rewrite";
  /** Texto plano normalizado (útil para enviar à IA em modo boundaries). */
  plainText: string;
};

const RICH_INLINE_RE = /<(em|strong|b|i|u|s|a|mark|code|sub|sup)[\s>]/i;
const BLOCK_HTML_RE = /^\s*<(p|div|h[1-6]|ul|ol|blockquote|pre)[\s>]/i;
const MAX_PARAGRAPH_CHARS = 1500;

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&hellip;/g, "…");
}

function stripToPlain(html: string): string {
  return decodeEntities(
    html
      // <br> vira quebra de linha
      .replace(/<br\s*\/?>/gi, "\n")
      // fim de bloco também vira quebra dupla
      .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, "\n\n")
      // tudo mais some
      .replace(/<[^>]+>/g, ""),
  );
}

/**
 * Regras determinísticas aplicadas ao texto plano.
 * Cada regra é conservadora — só aplica onde o ganho é inequívoco.
 */
function normalizePlain(text: string): string {
  let out = text;

  // Normaliza fim-de-linha e trims por linha.
  out = out.replace(/\r\n?/g, "\n");

  // Remove hifenização de fim de linha: "pala-\nvra" → "palavra".
  // Só quando a próxima linha começa com letra minúscula (heurística clássica).
  out = out.replace(/(\p{L}+)-\n(\p{Ll})/gu, "$1$2");

  // Colapsa espaços múltiplos (mas preserva quebras de linha).
  out = out.replace(/[ \t]+/g, " ");

  // Remove espaço antes de pontuação comum.
  out = out.replace(/ +([,.;:!?…])/g, "$1");

  // Normaliza travessão de diálogo no INÍCIO de linha:
  // "-", "--", "–", "―", "—" seguido de espaço → "— ".
  // (não mexemos em hífens intra-palavra).
  out = out.replace(/^[ \t]*[-–―—]{1,3}[ \t]+/gm, "— ");

  // Junta linhas soltas dentro do mesmo parágrafo:
  // Uma quebra simples entre linhas que terminam sem pontuação forte
  // e começam com minúscula geralmente é uma quebra "mole" de PDF.
  out = out.replace(/([^\n.!?…:"'”])\n(?!\n)(\p{Ll})/gu, "$1 $2");

  // Colapsa quebras triplas ou mais em quebra dupla.
  out = out.replace(/\n{3,}/g, "\n\n");

  // Trim geral.
  return out.trim();
}

function paragraphsFromPlain(plain: string): string[] {
  return plain
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, " ").trim())
    .filter((p) => p.length > 0);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function paragraphsToHtml(paras: string[]): string {
  return paras.map((p) => `<p>${escapeHtml(p)}</p>`).join("");
}

export function localFormatPass(input: string): LocalPassResult {
  const raw = input || "";
  const hasRichInline = RICH_INLINE_RE.test(raw);
  const isHtml = BLOCK_HTML_RE.test(raw) || /<br\s*\/?>/i.test(raw);

  const plainOriginal = isHtml ? stripToPlain(raw) : raw;
  const normalized = normalizePlain(plainOriginal);
  const paras = paragraphsFromPlain(normalized);

  // Heurística "precisa de IA":
  // - Algum parágrafo continua gigante (colados)
  // - OU só existe 1 parágrafo mas o texto é longo (> 800 chars sem quebras)
  const longestPara = paras.reduce((m, p) => Math.max(m, p.length), 0);
  const needsAI =
    longestPara > MAX_PARAGRAPH_CHARS ||
    (paras.length <= 1 && normalized.length > 800);

  // Se tem formatação inline rica e a IA for necessária, precisamos do
  // modo rewrite para não perder <em>/<strong>. Caso contrário, boundaries.
  const suggestedMode: "boundaries" | "rewrite" = hasRichInline
    ? "rewrite"
    : "boundaries";

  // Se o conteúdo original tinha marcações inline ricas, NÃO sobrescrevemos
  // com o plano — devolvemos o raw e deixamos a IA (modo rewrite) cuidar.
  const result = hasRichInline ? raw : paragraphsToHtml(paras);
  const changed = result.trim() !== raw.trim();

  return {
    result,
    changed,
    needsAI,
    suggestedMode,
    plainText: normalized,
  };
}
