import jsPDF from 'jspdf';
import { FRUITS } from '@/lib/data';
import type { CodexEntry } from '@/hooks/useCodexEntries';
import { htmlToPlainText } from '@/lib/htmlToText';

// ─── Colors ──────────────────────────────────────
const BG: [number, number, number] = [4, 12, 17];
const TITLE_CLR: [number, number, number] = [220, 230, 245];
const HEADING_CLR: [number, number, number] = [100, 181, 246];
const LABEL_CLR: [number, number, number] = [200, 146, 42];
const BODY_CLR: [number, number, number] = [200, 210, 225];
const DIM_CLR: [number, number, number] = [100, 120, 150];
const ACCENT_CLR: [number, number, number] = [33, 150, 243];
const DIVIDER_CLR: [number, number, number] = [33, 80, 130];

const MARGIN = 20;
const LINE_H = 5.2; // line height for body text (10pt)
const SMALL_LINE_H = 4; // line height for small text (8pt)

// ─── Context ─────────────────────────────────────
interface PdfCtx {
  doc: jsPDF;
  pageW: number;
  pageH: number;
  maxW: number;
  y: number;
}

function createDoc(): PdfCtx {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const ctx: PdfCtx = { doc, pageW, pageH, maxW: pageW - MARGIN * 2, y: MARGIN };
  paintBg(ctx);
  return ctx;
}

function paintBg(ctx: PdfCtx) {
  ctx.doc.setFillColor(...BG);
  ctx.doc.rect(0, 0, ctx.pageW, ctx.pageH, 'F');
}

function addFooter(ctx: PdfCtx) {
  ctx.doc.setFontSize(7);
  ctx.doc.setTextColor(...DIM_CLR);
  ctx.doc.setFont('helvetica', 'italic');
  ctx.doc.text('A Árvore dos Mundos · Universo STORIA', ctx.pageW / 2, ctx.pageH - 8, { align: 'center' });
}

function newPage(ctx: PdfCtx) {
  addFooter(ctx);
  ctx.doc.addPage();
  paintBg(ctx);
  ctx.y = MARGIN;
}

function ensureSpace(ctx: PdfCtx, needed: number) {
  if (ctx.y + needed > ctx.pageH - MARGIN - 10) {
    newPage(ctx);
  }
}

// ─── Strip markdown for plain text rendering ────
function stripMarkdown(text: string): string {
  // Conteúdo do Codex pode vir como HTML (RichTextEditor) ou Markdown. Primeiro
  // achatamos qualquer HTML em texto puro com parágrafos preservados.
  const base = htmlToPlainText(text).replace(/^__magictype__\n?/, '');
  return base
    .replace(/^#{1,6}\s+/gm, '') // strip heading markers
    .replace(/\*\*(.+?)\*\*/g, '$1') // bold
    .replace(/\*(.+?)\*/g, '$1') // italic
    .replace(/_(.+?)_/g, '$1') // italic alt
    .replace(/`(.+?)`/g, '$1') // inline code
    .replace(/^>\s?/gm, '  ') // blockquote
    .replace(/^[-*]\s+/gm, '• ') // unordered list
    .replace(/^\d+\.\s+/gm, (m) => m) // keep numbered lists
    .replace(/---+/g, '────────────────────')
    // Flatten @Mentions to plain text (drop the @ glyph, keep the name verbatim).
    .replace(/@(?=[A-Za-zÀ-ÿ0-9_\-])/g, '')
    .trim();
}

// ─── Text helpers ────────────────────────────────
function writeLines(ctx: PdfCtx, text: string, fontSize: number, color: [number, number, number], style: string, lineH: number, indent = 0) {
  ctx.doc.setFontSize(fontSize);
  ctx.doc.setTextColor(...color);
  ctx.doc.setFont('helvetica', style);
  const lines = ctx.doc.splitTextToSize(text, ctx.maxW - indent);
  for (const line of lines) {
    ensureSpace(ctx, lineH + 1);
    ctx.doc.text(line, MARGIN + indent, ctx.y);
    ctx.y += lineH;
  }
}

// ─── Image embedding ────────────────────────────
async function embedImage(ctx: PdfCtx, url: string, maxImgW: number, maxImgH: number): Promise<void> {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('img load fail'));
      img.src = url;
    });

    // Calculate aspect-fit dimensions
    const ratio = img.naturalWidth / img.naturalHeight;
    let w = maxImgW;
    let h = w / ratio;
    if (h > maxImgH) {
      h = maxImgH;
      w = h * ratio;
    }

    // Draw to canvas to get data URL
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const c2d = canvas.getContext('2d')!;
    c2d.drawImage(img, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    ensureSpace(ctx, h + 4);

    // Center image
    const x = MARGIN + (ctx.maxW - w) / 2;

    // Subtle border around image
    ctx.doc.setDrawColor(...DIVIDER_CLR);
    ctx.doc.setLineWidth(0.3);
    ctx.doc.roundedRect(x - 1, ctx.y - 1, w + 2, h + 2, 1, 1, 'S');

    ctx.doc.addImage(dataUrl, 'JPEG', x, ctx.y, w, h);
    ctx.y += h + 6;
  } catch {
    // Silently skip if image fails to load
  }
}

// ─── Render a single entry ──────────────────────
async function renderEntry(ctx: PdfCtx, entry: CodexEntry, includeImage = true) {
  ensureSpace(ctx, 22);

  // ── Entry type badge ──
  const isArticle = entry.entry_type === 'artigo';
  ctx.doc.setFontSize(7);
  ctx.doc.setTextColor(...(isArticle ? LABEL_CLR : DIM_CLR));
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.text(isArticle ? 'ARTIGO' : 'FICHA', MARGIN, ctx.y);
  ctx.y += 4;

  // ── Title ──
  ctx.doc.setFontSize(13);
  ctx.doc.setTextColor(...TITLE_CLR);
  ctx.doc.setFont('helvetica', 'bold');
  const titleLines = ctx.doc.splitTextToSize(entry.title, ctx.maxW);
  for (const line of titleLines) {
    ctx.doc.text(line, MARGIN, ctx.y);
    ctx.y += 6.5;
  }

  // ── Accent line ──
  ctx.doc.setDrawColor(...ACCENT_CLR);
  ctx.doc.setLineWidth(0.4);
  ctx.doc.line(MARGIN, ctx.y, MARGIN + Math.min(ctx.maxW * 0.4, 60), ctx.y);
  ctx.y += 4;

  // ── Fruit badge ──
  const fruitInfo = entry.fruit_id !== null ? FRUITS.find(f => f.id === entry.fruit_id) : null;
  if (fruitInfo) {
    ctx.doc.setFontSize(8);
    ctx.doc.setTextColor(...LABEL_CLR);
    ctx.doc.setFont('helvetica', 'bold');
    ctx.doc.text(`${fruitInfo.icon} ${fruitInfo.name}`, MARGIN, ctx.y);
    ctx.y += 6;
  }

  // ── Image (for fichas) ──
  if (includeImage && entry.image_url && !isArticle) {
    await embedImage(ctx, entry.image_url, Math.min(ctx.maxW * 0.7, 100), 70);
  }

  // ── Content ──
  if (entry.content) {
    const clean = stripMarkdown(entry.content);
    if (clean) {
      // Split into paragraphs for breathing room
      const paragraphs = clean.split(/\n{2,}/);
      for (const para of paragraphs) {
        const trimmed = para.trim();
        if (!trimmed) continue;

        // Check if this is a divider line
        if (trimmed.startsWith('──')) {
          ensureSpace(ctx, 6);
          ctx.doc.setDrawColor(...DIVIDER_CLR);
          ctx.doc.setLineWidth(0.2);
          ctx.doc.line(MARGIN, ctx.y, MARGIN + ctx.maxW, ctx.y);
          ctx.y += 5;
          continue;
        }

        // Check if it looks like a section heading (short, no ending punctuation)
        const isHeadingLine = trimmed.length <= 80
          && !trimmed.endsWith('.')
          && !trimmed.endsWith('!')
          && !trimmed.endsWith('?')
          && !trimmed.startsWith('•')
          && !trimmed.match(/^\d+\./);

        if (isHeadingLine) {
          ensureSpace(ctx, 10);
          ctx.y += 2;
          writeLines(ctx, trimmed, 11, HEADING_CLR, 'bold', 5.5);
          // Small underline
          ctx.doc.setDrawColor(...DIVIDER_CLR);
          ctx.doc.setLineWidth(0.2);
          ctx.doc.line(MARGIN, ctx.y, MARGIN + 35, ctx.y);
          ctx.y += 3;
        } else {
          // Regular body text — handle line by line for lists
          const subLines = trimmed.split('\n');
          for (const sub of subLines) {
            const s = sub.trim();
            if (!s) continue;
            if (s.startsWith('•')) {
              writeLines(ctx, s, 9.5, BODY_CLR, 'normal', LINE_H, 3);
            } else {
              writeLines(ctx, s, 9.5, BODY_CLR, 'normal', LINE_H);
            }
          }
          ctx.y += 2; // paragraph gap
        }
      }
    }
  }

  // ── Separator between entries ──
  ctx.y += 4;
  ctx.doc.setDrawColor(...DIVIDER_CLR);
  ctx.doc.setLineWidth(0.15);
  ctx.doc.line(MARGIN + 10, ctx.y, ctx.pageW - MARGIN - 10, ctx.y);
  ctx.y += 8;
}

// ─── Section header (fruit group) ───────────────
function addFruitSection(ctx: PdfCtx, fruitId: number) {
  const fruit = FRUITS.find(f => f.id === fruitId);
  if (!fruit) return;

  ensureSpace(ctx, 20);

  // Fruit section heading
  ctx.doc.setFontSize(15);
  ctx.doc.setTextColor(...HEADING_CLR);
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.text(`${fruit.num}: ${fruit.name}`, MARGIN, ctx.y);
  ctx.y += 3;

  ctx.doc.setDrawColor(...ACCENT_CLR);
  ctx.doc.setLineWidth(0.5);
  ctx.doc.line(MARGIN, ctx.y, MARGIN + 60, ctx.y);
  ctx.y += 10;
}

// ─── Document header ────────────────────────────
function addHeader(ctx: PdfCtx, title: string, subtitle?: string) {
  ctx.y += 8;

  ctx.doc.setTextColor(...TITLE_CLR);
  ctx.doc.setFontSize(24);
  ctx.doc.setFont('helvetica', 'bold');
  const titleLines = ctx.doc.splitTextToSize(title, ctx.maxW);
  for (const line of titleLines) {
    ctx.doc.text(line, ctx.pageW / 2, ctx.y, { align: 'center' });
    ctx.y += 10;
  }

  if (subtitle) {
    ctx.y += 1;
    ctx.doc.setFontSize(10);
    ctx.doc.setTextColor(...DIM_CLR);
    ctx.doc.setFont('helvetica', 'italic');
    ctx.doc.text(subtitle, ctx.pageW / 2, ctx.y, { align: 'center' });
    ctx.y += 6;
  }

  // Decorative line
  ctx.doc.setDrawColor(...ACCENT_CLR);
  ctx.doc.setLineWidth(0.6);
  const lineW = 30;
  ctx.doc.line(ctx.pageW / 2 - lineW, ctx.y, ctx.pageW / 2 + lineW, ctx.y);
  ctx.y += 12;
}

// ─── Public API ─────────────────────────────────

/** Export a single codex entry */
export async function exportSingleEntry(entry: CodexEntry) {
  const ctx = createDoc();
  const label = entry.entry_type === 'artigo' ? 'Artigo do Codex' : 'Ficha do Codex';
  addHeader(ctx, entry.title, label);
  await renderEntry(ctx, entry);
  addFooter(ctx);
  ctx.doc.save(`entrada-${entry.title.toLowerCase().replace(/\s+/g, '-')}.pdf`);
}

/** Export all entries of a single fruit */
export async function exportFruitEntries(fruitId: number, entries: CodexEntry[]) {
  const fruit = FRUITS.find(f => f.id === fruitId);
  if (!fruit) return;
  const fruitEntries = entries.filter(e => e.fruit_id === fruitId);
  if (fruitEntries.length === 0) return;

  const ctx = createDoc();
  addHeader(ctx, fruit.name, `${fruit.num} · ${fruitEntries.length} entradas`);
  for (const entry of fruitEntries) {
    await renderEntry(ctx, entry);
  }
  addFooter(ctx);
  ctx.doc.save(`codex-${fruit.name.toLowerCase().replace(/\s+/g, '-')}.pdf`);
}

/** Export entries from selected fruits */
export async function exportSelectedFruits(fruitIds: number[], entries: CodexEntry[]) {
  const ctx = createDoc();
  const names = fruitIds.map(id => FRUITS.find(f => f.id === id)?.name).filter(Boolean);
  addHeader(ctx, 'Codex — Frutos Selecionados', names.join(', '));

  for (const fruitId of fruitIds) {
    const fruitEntries = entries.filter(e => e.fruit_id === fruitId);
    if (fruitEntries.length === 0) continue;
    addFruitSection(ctx, fruitId);
    for (const entry of fruitEntries) {
      await renderEntry(ctx, entry);
    }
  }

  addFooter(ctx);
  ctx.doc.save('codex-frutos-selecionados.pdf');
}

/** Export all entries */
export async function exportAllEntries(entries: CodexEntry[]) {
  const ctx = createDoc();
  addHeader(ctx, 'Codex Completo', `${entries.length} entradas`);

  // Group by fruit
  const grouped = new Map<number | null, CodexEntry[]>();
  entries.forEach(e => {
    const key = e.fruit_id;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(e);
  });

  // Render fruits in order
  for (const fruit of FRUITS) {
    const group = grouped.get(fruit.id);
    if (group && group.length > 0) {
      addFruitSection(ctx, fruit.id);
      for (const entry of group) {
        await renderEntry(ctx, entry);
      }
    }
  }

  // Entries without fruit
  const noFruit = grouped.get(null);
  if (noFruit && noFruit.length > 0) {
    ensureSpace(ctx, 18);
    ctx.doc.setFontSize(15);
    ctx.doc.setTextColor(...HEADING_CLR);
    ctx.doc.setFont('helvetica', 'bold');
    ctx.doc.text('Sem Fruto Associado', MARGIN, ctx.y);
    ctx.y += 10;
    for (const entry of noFruit) {
      await renderEntry(ctx, entry);
    }
  }

  addFooter(ctx);
  ctx.doc.save('codex-completo.pdf');
}
