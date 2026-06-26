/**
 * Converte HTML (do Tiptap/RichTextEditor) em texto puro com parágrafos
 * preservados. Blocos (p, h1-6, li, blockquote, br, div, hr) viram quebras
 * de linha; demais tags são removidas. Entidades HTML são decodificadas.
 *
 * Usado em exportações (PDF/DOCX/EPUB) e em previews de cards do Codex —
 * onde o conteúdo bruto vazaria como `<h1>Título</h1><p>...`.
 */
const BLOCK_RE = /<\/(p|div|h[1-6]|li|blockquote|pre|tr|section|article|header|footer)>/gi;
const BR_RE = /<(br|hr)\s*\/?\s*>/gi;
const LIST_ITEM_RE = /<li[^>]*>/gi;
const TAG_RE = /<[^>]+>/g;

function decodeEntities(s: string): string {
  if (typeof document === 'undefined') {
    return s
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
      .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
  }
  const ta = document.createElement('textarea');
  ta.innerHTML = s;
  return ta.value;
}

/** HTML → texto puro, blocos preservados como parágrafos (\n\n). */
export function htmlToPlainText(input: string | null | undefined): string {
  if (!input) return '';
  const looksHtml = /<\/?[a-z][^>]*>/i.test(input);
  if (!looksHtml) return input;

  let s = input
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(BR_RE, '\n')
    .replace(LIST_ITEM_RE, '\n• ')
    .replace(BLOCK_RE, '\n\n')
    .replace(TAG_RE, '');

  s = decodeEntities(s);
  // normaliza espaços por linha e colapsa múltiplas quebras
  s = s
    .split('\n')
    .map(l => l.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return s;
}

/** Divide HTML em parágrafos de texto puro (para PDF/DOCX/EPUB). */
export function htmlToParagraphs(input: string | null | undefined): string[] {
  const text = htmlToPlainText(input);
  if (!text) return [];
  return text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
}
