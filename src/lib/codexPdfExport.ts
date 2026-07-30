import jsPDF from 'jspdf';
import { FRUITS } from '@/lib/data';
import type { CodexEntry } from '@/hooks/useCodexEntries';
import { htmlToPlainText } from '@/lib/htmlToText';

// ─── Palette (grimoire) ──────────────────────────
const BG: [number, number, number] = [3, 9, 15];
const BG_SOFT: [number, number, number] = [7, 16, 25];
const TITLE_CLR: [number, number, number] = [226, 235, 248];
const HEADING_CLR: [number, number, number] = [125, 195, 250];
const GOLD: [number, number, number] = [212, 168, 68];
const GOLD_SOFT: [number, number, number] = [150, 116, 44];
const BODY_CLR: [number, number, number] = [206, 216, 230];
const DIM_CLR: [number, number, number] = [110, 130, 158];
const ACCENT_CLR: [number, number, number] = [43, 130, 205];
const DIVIDER_CLR: [number, number, number] = [28, 62, 96];

// ─── Metrics (generous editorial rhythm) ─────────
const MARGIN_X = 24;
const MARGIN_TOP = 26;
const MARGIN_BOTTOM = 24;
const LINE_H = 6.1; // body 10.5pt
const PARA_GAP = 3.4;

interface PdfCtx {
  doc: jsPDF;
  pageW: number;
  pageH: number;
  maxW: number;
  y: number;
  page: number;
  runningTitle: string;
  cover: boolean;
}

function createDoc(runningTitle: string): PdfCtx {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const ctx: PdfCtx = {
    doc,
    pageW,
    pageH,
    maxW: pageW - MARGIN_X * 2,
    y: MARGIN_TOP,
    page: 0,
    runningTitle,
    cover: true,
  };
  paintBg(ctx);
  return ctx;
}

function paintBg(ctx: PdfCtx) {
  const { doc, pageW, pageH } = ctx;
  doc.setFillColor(...BG);
  doc.rect(0, 0, pageW, pageH, 'F');
  // subtle vertical vignette using two soft bands
  doc.setFillColor(...BG_SOFT);
  doc.rect(0, 0, pageW, 42, 'F');
  doc.rect(0, pageH - 32, pageW, 32, 'F');
}

/** Thin gold rule with a diamond at the center. */
function ornament(ctx: PdfCtx, width = 46) {
  const { doc, pageW } = ctx;
  const cx = pageW / 2;
  doc.setDrawColor(...GOLD_SOFT);
  doc.setLineWidth(0.25);
  doc.line(cx - width, ctx.y, cx - 3, ctx.y);
  doc.line(cx + 3, ctx.y, cx + width, ctx.y);
  doc.setFillColor(...GOLD);
  doc.triangle(cx, ctx.y - 1.4, cx - 1.4, ctx.y, cx, ctx.y + 1.4, 'F');
  doc.triangle(cx, ctx.y - 1.4, cx + 1.4, ctx.y, cx, ctx.y + 1.4, 'F');
}

function addChrome(ctx: PdfCtx) {
  const { doc, pageW, pageH } = ctx;
  if (ctx.page <= 1) return; // no chrome on cover
  // running head
  doc.setFontSize(7.5);
  doc.setFont('times', 'italic');
  doc.setTextColor(...DIM_CLR);
  doc.text(ctx.runningTitle, MARGIN_X, 14, { maxWidth: ctx.maxW * 0.7 });
  doc.setDrawColor(...DIVIDER_CLR);
  doc.setLineWidth(0.2);
  doc.line(MARGIN_X, 16.5, pageW - MARGIN_X, 16.5);

  // footer
  doc.setDrawColor(...DIVIDER_CLR);
  doc.line(MARGIN_X, pageH - 16, pageW - MARGIN_X, pageH - 16);
  doc.setFontSize(7);
  doc.setFont('times', 'italic');
  doc.setTextColor(...DIM_CLR);
  doc.text('A Árvore dos Mundos', MARGIN_X, pageH - 11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...GOLD_SOFT);
  doc.text(String(ctx.page - 1), pageW - MARGIN_X, pageH - 11, { align: 'right' });
}

function newPage(ctx: PdfCtx) {
  ctx.doc.addPage();
  ctx.page += 1;
  paintBg(ctx);
  ctx.y = MARGIN_TOP;
  addChrome(ctx);
}

function ensureSpace(ctx: PdfCtx, needed: number) {
  if (ctx.y + needed > ctx.pageH - MARGIN_BOTTOM) newPage(ctx);
}

// ─── Markdown → plain text ──────────────────────
function stripMarkdown(text: string): string {
  const base = htmlToPlainText(text).replace(/^__magictype__\n?/, '');
  return base
    .replace(/^(#{1,6})\s+/gm, (_m, h: string) => `\u0001${h.length}\u0001`)
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/^>\s?/gm, '  ')
    .replace(/^[-*]\s+/gm, '• ')
    .replace(/---+/g, '\u0002')
    .replace(/@(?=[A-Za-zÀ-ÿ0-9_\-])/g, '')
    .trim();
}

function writeLines(
  ctx: PdfCtx,
  text: string,
  fontSize: number,
  color: [number, number, number],
  font: 'times' | 'helvetica',
  style: string,
  lineH: number,
  indent = 0,
) {
  ctx.doc.setFontSize(fontSize);
  ctx.doc.setTextColor(...color);
  ctx.doc.setFont(font, style);
  const lines = ctx.doc.splitTextToSize(text, ctx.maxW - indent);
  for (const line of lines) {
    ensureSpace(ctx, lineH);
    ctx.doc.setFontSize(fontSize);
    ctx.doc.setTextColor(...color);
    ctx.doc.setFont(font, style);
    ctx.doc.text(line, MARGIN_X + indent, ctx.y);
    ctx.y += lineH;
  }
}

// ─── Images ─────────────────────────────────────
async function embedImage(ctx: PdfCtx, url: string, maxImgW: number, maxImgH: number): Promise<void> {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('img load fail'));
      img.src = url;
    });

    const ratio = img.naturalWidth / img.naturalHeight;
    let w = maxImgW;
    let h = w / ratio;
    if (h > maxImgH) {
      h = maxImgH;
      w = h * ratio;
    }

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext('2d')!.drawImage(img, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);

    ensureSpace(ctx, h + 12);
    const x = MARGIN_X + (ctx.maxW - w) / 2;

    // gold hairline frame with inner offset
    ctx.doc.setDrawColor(...GOLD_SOFT);
    ctx.doc.setLineWidth(0.4);
    ctx.doc.rect(x - 1.8, ctx.y - 1.8, w + 3.6, h + 3.6, 'S');
    ctx.doc.setDrawColor(...DIVIDER_CLR);
    ctx.doc.setLineWidth(0.2);
    ctx.doc.rect(x - 3.4, ctx.y - 3.4, w + 6.8, h + 6.8, 'S');

    ctx.doc.addImage(dataUrl, 'JPEG', x, ctx.y, w, h);
    ctx.y += h + 11;
  } catch {
    /* skip broken images */
  }
}

// ─── Entry ──────────────────────────────────────
async function renderEntry(ctx: PdfCtx, entry: CodexEntry, includeImage = true) {
  const isArticle = entry.entry_type === 'artigo';
  ensureSpace(ctx, 46);
  ctx.y += 2;

  // eyebrow: type + fruit
  const fruitInfo = entry.fruit_id !== null ? FRUITS.find(f => f.id === entry.fruit_id) : null;
  const eyebrow = [isArticle ? 'ARTIGO' : 'FICHA', fruitInfo ? fruitInfo.name.toUpperCase() : null]
    .filter(Boolean)
    .join('   ·   ');
  ctx.doc.setFontSize(7);
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.setTextColor(...(isArticle ? GOLD : ACCENT_CLR));
  ctx.doc.text(eyebrow, MARGIN_X, ctx.y, { charSpace: 0.6 });
  ctx.y += 7.5;

  // title (serif, airy)
  ctx.doc.setFontSize(19);
  ctx.doc.setTextColor(...TITLE_CLR);
  ctx.doc.setFont('times', 'bold');
  for (const line of ctx.doc.splitTextToSize(entry.title, ctx.maxW)) {
    ensureSpace(ctx, 9);
    ctx.doc.setFontSize(19);
    ctx.doc.setTextColor(...TITLE_CLR);
    ctx.doc.setFont('times', 'bold');
    ctx.doc.text(line, MARGIN_X, ctx.y);
    ctx.y += 8.6;
  }

  ctx.y += 1.5;
  ctx.doc.setDrawColor(...(isArticle ? GOLD : ACCENT_CLR));
  ctx.doc.setLineWidth(0.7);
  ctx.doc.line(MARGIN_X, ctx.y, MARGIN_X + 26, ctx.y);
  ctx.y += 9;

  if (includeImage && entry.image_url && !isArticle) {
    await embedImage(ctx, entry.image_url, Math.min(ctx.maxW * 0.62, 96), 74);
  }

  if (entry.content) {
    const clean = stripMarkdown(entry.content);
    if (clean) {
      const blocks = clean.split(/\n{2,}/);
      for (const block of blocks) {
        const trimmed = block.trim();
        if (!trimmed) continue;

        if (trimmed === '\u0002') {
          ensureSpace(ctx, 10);
          ctx.y += 2;
          ornament(ctx, 30);
          ctx.y += 7;
          continue;
        }

        const md = trimmed.match(/^\u0001(\d)\u0001\s*/);
        const looksLikeHeading =
          !md &&
          trimmed.length <= 72 &&
          !/[.!?;:]$/.test(trimmed) &&
          !trimmed.startsWith('•') &&
          !/^\d+\./.test(trimmed) &&
          !trimmed.includes('\n');

        if (md || looksLikeHeading) {
          const text = md ? trimmed.slice(md[0].length) : trimmed;
          const level = md ? Number(md[1]) : 3;
          ensureSpace(ctx, 18);
          ctx.y += 4;
          writeLines(
            ctx,
            text,
            level <= 2 ? 13 : 11.5,
            level <= 2 ? HEADING_CLR : GOLD,
            'helvetica',
            'bold',
            level <= 2 ? 6.6 : 5.9,
          );
          ctx.y += 1;
          ctx.doc.setDrawColor(...DIVIDER_CLR);
          ctx.doc.setLineWidth(0.2);
          ctx.doc.line(MARGIN_X, ctx.y, MARGIN_X + ctx.maxW, ctx.y);
          ctx.y += 5.5;
          continue;
        }

        for (const sub of trimmed.split('\n')) {
          const s = sub.replace(/\u0001\d\u0001/g, '').trim();
          if (!s) continue;
          if (s.startsWith('•')) {
            writeLines(ctx, s, 10.5, BODY_CLR, 'times', 'normal', LINE_H, 5);
            ctx.y += 0.8;
          } else if (/^\d+\./.test(s)) {
            writeLines(ctx, s, 10.5, BODY_CLR, 'times', 'normal', LINE_H, 5);
            ctx.y += 0.8;
          } else {
            writeLines(ctx, s, 10.5, BODY_CLR, 'times', 'normal', LINE_H);
          }
        }
        ctx.y += PARA_GAP;
      }
    }
  }

  // entry separator
  ctx.y += 6;
  ensureSpace(ctx, 12);
  ornament(ctx, 22);
  ctx.y += 13;
}

// ─── Fruit section opener ───────────────────────
function addFruitSection(ctx: PdfCtx, fruitId: number, count: number) {
  const fruit = FRUITS.find(f => f.id === fruitId);
  if (!fruit) return;

  ensureSpace(ctx, 44);
  ctx.y += 4;

  ctx.doc.setFontSize(8);
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.setTextColor(...GOLD_SOFT);
  ctx.doc.text(String(fruit.num).toUpperCase(), MARGIN_X, ctx.y, { charSpace: 0.8 });
  ctx.y += 8;

  ctx.doc.setFontSize(17);
  ctx.doc.setFont('times', 'bold');
  ctx.doc.setTextColor(...HEADING_CLR);
  ctx.doc.text(fruit.name, MARGIN_X, ctx.y);
  ctx.y += 4;

  ctx.doc.setDrawColor(...ACCENT_CLR);
  ctx.doc.setLineWidth(0.6);
  ctx.doc.line(MARGIN_X, ctx.y, MARGIN_X + ctx.maxW, ctx.y);
  ctx.y += 5;

  ctx.doc.setFontSize(7.5);
  ctx.doc.setFont('helvetica', 'normal');
  ctx.doc.setTextColor(...DIM_CLR);
  ctx.doc.text(`${count} entrada${count !== 1 ? 's' : ''}`, MARGIN_X, ctx.y);
  ctx.y += 12;
}

// ─── Cover ──────────────────────────────────────
function addCover(ctx: PdfCtx, title: string, subtitle?: string) {
  const { doc, pageW, pageH } = ctx;
  ctx.page = 1;

  // double frame
  doc.setDrawColor(...GOLD_SOFT);
  doc.setLineWidth(0.5);
  doc.rect(14, 14, pageW - 28, pageH - 28, 'S');
  doc.setDrawColor(...DIVIDER_CLR);
  doc.setLineWidth(0.25);
  doc.rect(17.5, 17.5, pageW - 35, pageH - 35, 'S');

  ctx.y = pageH * 0.33;
  ornament(ctx, 34);
  ctx.y += 20;

  doc.setFont('times', 'bold');
  doc.setTextColor(...TITLE_CLR);
  doc.setFontSize(30);
  const lines = doc.splitTextToSize(title, ctx.maxW - 20);
  for (const line of lines) {
    doc.text(line, pageW / 2, ctx.y, { align: 'center' });
    ctx.y += 13;
  }

  if (subtitle) {
    ctx.y += 4;
    doc.setFontSize(10.5);
    doc.setFont('times', 'italic');
    doc.setTextColor(...DIM_CLR);
    for (const line of doc.splitTextToSize(subtitle, ctx.maxW - 30)) {
      doc.text(line, pageW / 2, ctx.y, { align: 'center' });
      ctx.y += 6;
    }
  }

  ctx.y += 16;
  ornament(ctx, 34);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...GOLD_SOFT);
  doc.text('A ÁRVORE DOS MUNDOS', pageW / 2, pageH - 30, { align: 'center', charSpace: 1.4 });
  doc.setFont('times', 'italic');
  doc.setTextColor(...DIM_CLR);
  doc.setFontSize(7.5);
  doc.text(
    new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
    pageW / 2,
    pageH - 24,
    { align: 'center' },
  );

  newPage(ctx);
}

function fileSafe(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ─── Public API ─────────────────────────────────

/** Export a single codex entry */
export async function exportSingleEntry(entry: CodexEntry) {
  const label = entry.entry_type === 'artigo' ? 'Artigo do Codex' : 'Ficha do Codex';
  const ctx = createDoc(entry.title);
  addCover(ctx, entry.title, label);
  await renderEntry(ctx, entry);
  ctx.doc.save(`entrada-${fileSafe(entry.title)}.pdf`);
}

/** Export all entries of a single fruit */
export async function exportFruitEntries(fruitId: number, entries: CodexEntry[]) {
  const fruit = FRUITS.find(f => f.id === fruitId);
  if (!fruit) return;
  const fruitEntries = entries.filter(e => e.fruit_id === fruitId);
  if (fruitEntries.length === 0) return;

  const ctx = createDoc(fruit.name);
  addCover(ctx, fruit.name, `${fruit.num} · ${fruitEntries.length} entradas do Codex`);
  for (const entry of fruitEntries) await renderEntry(ctx, entry);
  ctx.doc.save(`codex-${fileSafe(fruit.name)}.pdf`);
}

/** Export entries from selected fruits */
export async function exportSelectedFruits(fruitIds: number[], entries: CodexEntry[]) {
  const names = fruitIds.map(id => FRUITS.find(f => f.id === id)?.name).filter(Boolean) as string[];
  const ctx = createDoc('Codex — Frutos Selecionados');
  addCover(ctx, 'Codex', names.join(' · '));

  for (const fruitId of fruitIds) {
    const fruitEntries = entries.filter(e => e.fruit_id === fruitId);
    if (fruitEntries.length === 0) continue;
    addFruitSection(ctx, fruitId, fruitEntries.length);
    for (const entry of fruitEntries) await renderEntry(ctx, entry);
  }

  ctx.doc.save('codex-frutos-selecionados.pdf');
}

/** Export all entries */
export async function exportAllEntries(entries: CodexEntry[]) {
  const ctx = createDoc('Codex Completo');
  addCover(ctx, 'Codex Completo', `${entries.length} entradas registradas`);

  const grouped = new Map<number | null, CodexEntry[]>();
  entries.forEach(e => {
    const key = e.fruit_id;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(e);
  });

  for (const fruit of FRUITS) {
    const group = grouped.get(fruit.id);
    if (group && group.length > 0) {
      addFruitSection(ctx, fruit.id, group.length);
      for (const entry of group) await renderEntry(ctx, entry);
    }
  }

  const noFruit = grouped.get(null);
  if (noFruit && noFruit.length > 0) {
    ensureSpace(ctx, 30);
    ctx.doc.setFontSize(17);
    ctx.doc.setFont('times', 'bold');
    ctx.doc.setTextColor(...HEADING_CLR);
    ctx.doc.text('Sem Fruto Associado', MARGIN_X, ctx.y);
    ctx.y += 4;
    ctx.doc.setDrawColor(...ACCENT_CLR);
    ctx.doc.setLineWidth(0.6);
    ctx.doc.line(MARGIN_X, ctx.y, MARGIN_X + ctx.maxW, ctx.y);
    ctx.y += 12;
    for (const entry of noFruit) await renderEntry(ctx, entry);
  }

  ctx.doc.save('codex-completo.pdf');
}
