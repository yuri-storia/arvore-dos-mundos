import jsPDF from 'jspdf';
import { FRUITS } from '@/lib/data';
import type { CodexEntry } from '@/hooks/useCodexEntries';
import { htmlToPlainText } from '@/lib/htmlToText';

// ─── Palette (grimório noturno) ──────────────────
const BG: [number, number, number] = [8, 18, 38];
const BG_DEEP: [number, number, number] = [5, 12, 28];
const TITLE_CLR: [number, number, number] = [237, 240, 247];
const HEADING_CLR: [number, number, number] = [125, 195, 250];
const GOLD: [number, number, number] = [201, 162, 77];
const GOLD_SOFT: [number, number, number] = [148, 116, 50];
const BODY_CLR: [number, number, number] = [219, 226, 238];
const DIM_CLR: [number, number, number] = [138, 154, 180];
const ACCENT_CLR: [number, number, number] = [96, 165, 226];

// ─── Métricas ────────────────────────────────────
const MARGIN_X = 26;
const MARGIN_TOP = 34;
const MARGIN_BOTTOM = 28;
const LINE_H = 6.6;
const PARA_GAP = 3.6;

interface PdfCtx {
  doc: jsPDF;
  pageW: number;
  pageH: number;
  maxW: number;
  y: number;
  page: number;
  runningTitle: string;
}

// ─── Imagens ─────────────────────────────────────
const imgCache = new Map<string, { data: string; w: number; h: number }>();

async function loadImage(url: string) {
  const cached = imgCache.get(url);
  if (cached) return cached;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('img load fail'));
    img.src = url;
  });
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  canvas.getContext('2d')!.drawImage(img, 0, 0);
  const out = { data: canvas.toDataURL('image/jpeg', 0.9), w: img.naturalWidth, h: img.naturalHeight };
  imgCache.set(url, out);
  return out;
}

/** Compõe a arte da capa com um degradê suave até o fundo (evita faixas). */
async function coverArt(url: string, aspect: number) {
  const img = await loadImage(url);
  const cw = 1200;
  const ch = Math.round(cw / aspect);
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const c = canvas.getContext('2d')!;
  c.fillStyle = `rgb(${BG[0]},${BG[1]},${BG[2]})`;
  c.fillRect(0, 0, cw, ch);
  // cobre a área mantendo proporção
  const r = img.w / img.h;
  let dw = cw;
  let dh = dw / r;
  if (dh < ch) {
    dh = ch;
    dw = dh * r;
  }
  const el = new Image();
  await new Promise<void>((res, rej) => {
    el.onload = () => res();
    el.onerror = () => rej(new Error('img fail'));
    el.src = img.data;
  });
  c.drawImage(el, (cw - dw) / 2, 0, dw, dh);
  const g = c.createLinearGradient(0, ch * 0.3, 0, ch);
  g.addColorStop(0, `rgba(${BG[0]},${BG[1]},${BG[2]},0)`);
  g.addColorStop(0.55, `rgba(${BG[0]},${BG[1]},${BG[2]},0.75)`);
  g.addColorStop(1, `rgb(${BG[0]},${BG[1]},${BG[2]})`);
  c.fillStyle = g;
  c.fillRect(0, 0, cw, ch);
  return canvas.toDataURL('image/jpeg', 0.92);
}

function createDoc(runningTitle: string): PdfCtx {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  return { doc, pageW, pageH, maxW: pageW - MARGIN_X * 2, y: MARGIN_TOP, page: 0, runningTitle };
}

function paintBg(ctx: PdfCtx) {
  const { doc, pageW, pageH } = ctx;
  doc.setFillColor(...BG);
  doc.rect(0, 0, pageW, pageH, 'F');
  doc.setFillColor(...BG_DEEP);
  doc.rect(0, 0, pageW, 30, 'F');
  doc.rect(0, pageH - 30, pageW, 30, 'F');
}

/** Losango dourado. */
function diamond(ctx: PdfCtx, cx: number, cy: number, r = 1.6, filled = true) {
  const { doc } = ctx;
  doc.setFillColor(...GOLD);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.3);
  doc.triangle(cx, cy - r, cx - r, cy, cx, cy + r, filled ? 'F' : 'S');
  doc.triangle(cx, cy - r, cx + r, cy, cx, cy + r, filled ? 'F' : 'S');
}

/** Régua dourada com losango central. */
function ornament(ctx: PdfCtx, width = 46, cx = ctx.pageW / 2, y = ctx.y) {
  const { doc } = ctx;
  doc.setDrawColor(...GOLD_SOFT);
  doc.setLineWidth(0.3);
  doc.line(cx - width, y, cx - 4, y);
  doc.line(cx + 4, y, cx + width, y);
  diamond(ctx, cx, y, 1.7);
}

/** Moldura dupla dourada com cantos e losangos laterais. */
function pageFrame(ctx: PdfCtx) {
  const { doc, pageW, pageH } = ctx;
  doc.setDrawColor(...GOLD_SOFT);
  doc.setLineWidth(0.6);
  doc.rect(9, 9, pageW - 18, pageH - 18, 'S');
  doc.setDrawColor(...GOLD_SOFT);
  doc.setLineWidth(0.25);
  doc.rect(12.5, 12.5, pageW - 25, pageH - 25, 'S');

  // cantos: pequenos arcos/ângulos
  const c = 9;
  const L = 14;
  doc.setLineWidth(0.5);
  doc.setDrawColor(...GOLD);
  const corners: [number, number, number, number][] = [
    [c, c, 1, 1],
    [pageW - c, c, -1, 1],
    [c, pageH - c, 1, -1],
    [pageW - c, pageH - c, -1, -1],
  ];
  corners.forEach(([x, y, sx, sy]) => {
    doc.line(x + sx * 3, y + sy * 3, x + sx * L, y + sy * 3);
    doc.line(x + sx * 3, y + sy * 3, x + sx * 3, y + sy * L);
  });

  // losangos nas laterais
  diamond(ctx, 9, pageH / 2, 2.2, false);
  diamond(ctx, pageW - 9, pageH / 2, 2.2, false);
  diamond(ctx, pageW / 2, 9, 2.2, false);
  diamond(ctx, pageW / 2, pageH - 9, 2.2, false);
}

function addChrome(ctx: PdfCtx) {
  const { doc, pageW, pageH } = ctx;
  pageFrame(ctx);

  doc.setFontSize(7.5);
  doc.setFont('times', 'italic');
  doc.setTextColor(...DIM_CLR);
  doc.text(ctx.runningTitle, MARGIN_X, 21, { maxWidth: ctx.maxW * 0.6 });
  ornament(ctx, 26, pageW - MARGIN_X - 26, 20);

  doc.setFontSize(7.5);
  doc.setFont('times', 'italic');
  doc.setTextColor(...DIM_CLR);
  doc.text('A Árvore dos Mundos', MARGIN_X, pageH - 19);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...GOLD_SOFT);
  doc.setFontSize(8);
  doc.text(String(Math.max(1, ctx.page - 1)), pageW - MARGIN_X, pageH - 19, { align: 'right' });
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

// ─── Markdown → texto ────────────────────────────
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
  justify = false,
) {
  const { doc } = ctx;
  const apply = () => {
    doc.setFontSize(fontSize);
    doc.setTextColor(...color);
    doc.setFont(font, style);
  };
  apply();
  const width = ctx.maxW - indent;
  const lines: string[] = doc.splitTextToSize(text, width);
  lines.forEach((line, i) => {
    ensureSpace(ctx, lineH);
    apply();
    const isLast = i === lines.length - 1;
    if (justify && !isLast) {
      doc.text(line, MARGIN_X + indent, ctx.y, { maxWidth: width, align: 'justify' });
    } else {
      doc.text(line, MARGIN_X + indent, ctx.y);
    }
    ctx.y += lineH;
  });
}

/** Imagem com moldura dourada dupla e losangos, como na referência. */
async function embedImage(ctx: PdfCtx, url: string, maxImgW: number, maxImgH: number) {
  try {
    const img = await loadImage(url);
    const ratio = img.w / img.h;
    let w = maxImgW;
    let h = w / ratio;
    if (h > maxImgH) {
      h = maxImgH;
      w = h * ratio;
    }
    ensureSpace(ctx, h + 18);
    const x = MARGIN_X + (ctx.maxW - w) / 2;
    const y = ctx.y;

    ctx.doc.addImage(img.data, 'JPEG', x, y, w, h);

    ctx.doc.setDrawColor(...GOLD);
    ctx.doc.setLineWidth(0.7);
    ctx.doc.rect(x - 2, y - 2, w + 4, h + 4, 'S');
    ctx.doc.setDrawColor(...GOLD_SOFT);
    ctx.doc.setLineWidth(0.3);
    ctx.doc.rect(x - 4.2, y - 4.2, w + 8.4, h + 8.4, 'S');
    diamond(ctx, x + w / 2, y - 3.1, 1.8);
    diamond(ctx, x + w / 2, y + h + 3.1, 1.8);

    ctx.y = y + h + 14;
  } catch {
    /* imagem indisponível */
  }
}

// ─── Entrada ─────────────────────────────────────
function typeLabel(entry: CodexEntry) {
  return entry.entry_type === 'artigo' ? 'ARTIGO' : 'FICHA';
}

function fruitName(entry: CodexEntry) {
  const f = entry.fruit_id !== null ? FRUITS.find(fr => fr.id === entry.fruit_id) : null;
  return f ? f.name : null;
}

async function renderEntry(ctx: PdfCtx, entry: CodexEntry, startOnNewPage = false) {
  if (startOnNewPage || ctx.y > MARGIN_TOP + 4) newPage(ctx);
  const isArticle = entry.entry_type === 'artigo';

  // sobrancelha: tipo · fruto
  const eyebrow = [typeLabel(entry), fruitName(entry)?.toUpperCase()].filter(Boolean).join('   ·   ');
  ctx.doc.setFontSize(8);
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.setTextColor(...(isArticle ? GOLD : ACCENT_CLR));
  ctx.doc.text(eyebrow, MARGIN_X, ctx.y, { charSpace: 1.2 });
  ctx.y += 12;

  // título serifado
  ctx.doc.setFontSize(28);
  ctx.doc.setFont('times', 'normal');
  ctx.doc.setTextColor(...TITLE_CLR);
  for (const line of ctx.doc.splitTextToSize(entry.title, ctx.maxW)) {
    ensureSpace(ctx, 14);
    ctx.doc.setFontSize(28);
    ctx.doc.setFont('times', 'normal');
    ctx.doc.setTextColor(...TITLE_CLR);
    ctx.doc.text(line, MARGIN_X, ctx.y);
    ctx.y += 13;
  }
  ctx.y += 3;
  ornament(ctx, 30, MARGIN_X + 30, ctx.y);
  ctx.y += 12;

  if (entry.image_url) {
    await embedImage(ctx, entry.image_url, ctx.maxW, ctx.pageH * 0.42);
  }

  if (entry.content) {
    const clean = stripMarkdown(entry.content);
    if (clean) {
      for (const block of clean.split(/\n{2,}/)) {
        const trimmed = block.trim();
        if (!trimmed) continue;

        if (trimmed === '\u0002') {
          ensureSpace(ctx, 12);
          ctx.y += 3;
          ornament(ctx, 28);
          ctx.y += 8;
          continue;
        }

        const md = trimmed.match(/^\u0001(\d)\u0001\s*/);
        const looksLikeHeading =
          !md &&
          trimmed.length <= 66 &&
          !/[.!?;:]$/.test(trimmed) &&
          !trimmed.startsWith('•') &&
          !/^\d+\./.test(trimmed) &&
          !trimmed.includes('\n');

        if (md || looksLikeHeading) {
          const text = md ? trimmed.slice(md[0].length) : trimmed;
          const level = md ? Number(md[1]) : 3;
          ensureSpace(ctx, 22);
          ctx.y += 5;
          writeLines(ctx, text, level <= 2 ? 14 : 12, level <= 2 ? HEADING_CLR : GOLD, 'helvetica', 'bold', level <= 2 ? 7 : 6.2);
          ctx.y += 1.5;
          ctx.doc.setDrawColor(...GOLD_SOFT);
          ctx.doc.setLineWidth(0.2);
          ctx.doc.line(MARGIN_X, ctx.y, MARGIN_X + ctx.maxW, ctx.y);
          ctx.y += 7;
          continue;
        }

        for (const sub of trimmed.split('\n')) {
          const s = sub.replace(/\u0001\d\u0001/g, '').trim();
          if (!s) continue;
          const isList = s.startsWith('•') || /^\d+\./.test(s);
          writeLines(ctx, s, 11, BODY_CLR, 'times', 'normal', LINE_H, isList ? 6 : 0, !isList);
          if (isList) ctx.y += 1;
        }
        ctx.y += PARA_GAP;
      }
    }
  }

  ctx.y += 8;
  ensureSpace(ctx, 14);
  ornament(ctx, 24);
  ctx.y += 14;
}

// ─── Abertura de fruto ───────────────────────────
function addFruitSection(ctx: PdfCtx, fruitId: number, count: number) {
  const fruit = FRUITS.find(f => f.id === fruitId);
  if (!fruit) return;
  newPage(ctx);
  ctx.y = ctx.pageH * 0.36;

  ctx.doc.setFontSize(8.5);
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.setTextColor(...GOLD_SOFT);
  ctx.doc.text(String(fruit.num).toUpperCase(), ctx.pageW / 2, ctx.y, { align: 'center', charSpace: 1.4 });
  ctx.y += 14;

  ctx.doc.setFontSize(24);
  ctx.doc.setFont('times', 'normal');
  ctx.doc.setTextColor(...TITLE_CLR);
  ctx.doc.text(fruit.name, ctx.pageW / 2, ctx.y, { align: 'center' });
  ctx.y += 10;

  ornament(ctx, 34);
  ctx.y += 9;

  ctx.doc.setFontSize(9);
  ctx.doc.setFont('times', 'italic');
  ctx.doc.setTextColor(...DIM_CLR);
  ctx.doc.text(`${count} entrada${count !== 1 ? 's' : ''} do Codex`, ctx.pageW / 2, ctx.y, { align: 'center' });
  ctx.y = ctx.pageH; // força nova página para a próxima entrada
}

// ─── Capa ────────────────────────────────────────
/** Texto centralizado respeitando o espaçamento entre letras. */
function centeredTracked(ctx: PdfCtx, text: string, y: number, charSpace: number) {
  const w = ctx.doc.getTextWidth(text) + charSpace * Math.max(0, text.length - 1);
  ctx.doc.text(text, (ctx.pageW - w) / 2, y, { charSpace });
}

/** Céu estrelado + silhueta de árvore, usado quando não há imagem na entrada. */
function starfield(ctx: PdfCtx, height: number) {
  const { doc, pageW } = ctx;
  doc.setFillColor(...BG);
  doc.rect(0, 0, pageW, height + 2, 'F');
  let seed = 20260730;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  for (let i = 0; i < 320; i++) {
    const x = rnd() * pageW;
    const y = rnd() * height * 0.95;
    const r = 0.12 + rnd() * 0.45;
    const tone = 150 + Math.floor(rnd() * 105);
    doc.setFillColor(tone, tone, 255);
    doc.circle(x, y, r, 'F');
  }
  // halo central com a árvore
  doc.setDrawColor(...GOLD_SOFT);
  doc.setLineWidth(0.25);
  doc.circle(pageW / 2, height * 0.5, 30, 'S');
  doc.setLineWidth(0.15);
  doc.circle(pageW / 2, height * 0.5, 34, 'S');
  treeEmblem(ctx, pageW / 2, height * 0.62, 34);
  // esmaecimento inferior
  const GS = (doc as unknown as { GState?: new (o: { opacity: number }) => unknown }).GState;
  const bands = 60;
  const bandH = (height * 0.45) / bands;
  for (let i = 0; i < bands; i++) {
    if (GS) doc.setGState(new GS({ opacity: Math.min(1, (i / bands) ** 1.5 + 0.03) }) as never);
    doc.setFillColor(...BG);
    doc.rect(0, height * 0.55 + i * bandH, pageW, bandH + 0.4, 'F');
  }
  if (GS) doc.setGState(new GS({ opacity: 1 }) as never);
}

/** Pequena árvore vetorial dourada. */
function treeEmblem(ctx: PdfCtx, cx: number, baseY: number, size: number) {
  const { doc } = ctx;
  const top = baseY - size * 0.55;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(size * 0.05);
  doc.line(cx, baseY, cx, top);
  // galhos
  doc.setLineWidth(size * 0.035);
  ([[-0.42, -0.95], [0.42, -0.95], [-0.2, -1.15], [0.2, -1.15]] as [number, number][]).forEach(
    ([dx, dy]) => doc.line(cx, top + size * 0.12, cx + dx * size * 0.55, baseY + dy * size * 0.55),
  );
  // raízes
  doc.setLineWidth(size * 0.03);
  [-0.45, -0.18, 0.18, 0.45].forEach(dx => doc.line(cx, baseY, cx + dx * size * 0.6, baseY + size * 0.26));
  // copa
  doc.setLineWidth(size * 0.028);
  doc.circle(cx, baseY - size * 0.6, size * 0.45, 'S');
}

async function addCover(ctx: PdfCtx, title: string, subtitle?: string, kicker?: string, artUrl?: string | null) {
  const { doc, pageW, pageH } = ctx;
  ctx.page = 1;
  paintBg(ctx);

  const artH = pageH * 0.56;
  let hasArt = false;
  if (artUrl) {
    try {
      const art = await coverArt(artUrl, pageW / artH);
      doc.addImage(art, 'JPEG', 0, 0, pageW, artH, undefined, 'FAST');
      hasArt = true;
    } catch {
      hasArt = false;
    }
  }
  if (!hasArt) starfield(ctx, artH);

  pageFrame(ctx);

  ctx.y = pageH * 0.54;
  ornament(ctx, 34);
  ctx.y += 20;

  doc.setFont('times', 'normal');
  doc.setTextColor(...TITLE_CLR);
  doc.setFontSize(34);
  for (const line of doc.splitTextToSize(title, ctx.maxW - 16)) {
    doc.text(line, pageW / 2, ctx.y, { align: 'center' });
    ctx.y += 15;
  }

  if (subtitle) {
    ctx.y += 3;
    doc.setFontSize(13);
    doc.setFont('times', 'italic');
    doc.setTextColor(...DIM_CLR);
    for (const line of doc.splitTextToSize(subtitle, ctx.maxW - 26)) {
      doc.text(line, pageW / 2, ctx.y, { align: 'center' });
      ctx.y += 7;
    }
  }

  if (kicker) {
    ctx.y += 5;
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GOLD);
    centeredTracked(ctx, kicker.toUpperCase(), ctx.y, 1.2);
    ctx.y += 6;
  }

  // emblema
  const cy = pageH - 54;
  ctx.y = cy - 22;
  ornament(ctx, 34);
  doc.setDrawColor(...GOLD_SOFT);
  doc.setLineWidth(0.35);
  doc.circle(pageW / 2, cy, 13, 'S');
  treeEmblem(ctx, pageW / 2, cy + 6, 11);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...GOLD);
  centeredTracked(ctx, 'ÁRVORE DOS MUNDOS', pageH - 33, 2);

  doc.setFont('times', 'italic');
  doc.setTextColor(...DIM_CLR);
  doc.setFontSize(8.5);
  doc.text(
    new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
    pageW / 2,
    pageH - 29,
    { align: 'center' },
  );

  ctx.y = ctx.pageH; // próxima escrita abre nova página
}

function fileSafe(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ─── API pública ─────────────────────────────────

/** Exporta uma única entrada do Codex */
export async function exportSingleEntry(entry: CodexEntry) {
  const label = entry.entry_type === 'artigo' ? 'Artigo do Codex' : 'Ficha do Codex';
  const fruit = fruitName(entry);
  const ctx = createDoc(entry.title);
  await addCover(ctx, entry.title, label, fruit ? `Fruto · ${fruit}` : undefined, entry.image_url);
  await renderEntry(ctx, entry, true);
  ctx.doc.save(`${entry.entry_type === 'artigo' ? 'artigo' : 'ficha'}-${fileSafe(entry.title)}.pdf`);
}

/** Exporta todas as entradas de um fruto */
export async function exportFruitEntries(fruitId: number, entries: CodexEntry[]) {
  const fruit = FRUITS.find(f => f.id === fruitId);
  if (!fruit) return;
  const fruitEntries = entries.filter(e => e.fruit_id === fruitId);
  if (fruitEntries.length === 0) return;

  const ctx = createDoc(fruit.name);
  await addCover(ctx, fruit.name, `${fruitEntries.length} entradas do Codex`, `Fruto · ${fruit.num}`);
  for (const entry of fruitEntries) await renderEntry(ctx, entry, true);
  ctx.doc.save(`codex-${fileSafe(fruit.name)}.pdf`);
}

/** Exporta entradas dos frutos selecionados */
export async function exportSelectedFruits(fruitIds: number[], entries: CodexEntry[]) {
  const names = fruitIds.map(id => FRUITS.find(f => f.id === id)?.name).filter(Boolean) as string[];
  const ctx = createDoc('Codex — Frutos Selecionados');
  await addCover(ctx, 'Codex', names.join(' · '), 'Frutos selecionados');

  for (const fruitId of fruitIds) {
    const fruitEntries = entries.filter(e => e.fruit_id === fruitId);
    if (fruitEntries.length === 0) continue;
    addFruitSection(ctx, fruitId, fruitEntries.length);
    for (const entry of fruitEntries) await renderEntry(ctx, entry, true);
  }

  ctx.doc.save('codex-frutos-selecionados.pdf');
}

/** Exporta todas as entradas */
export async function exportAllEntries(entries: CodexEntry[]) {
  const ctx = createDoc('Codex Completo');
  await addCover(ctx, 'Codex Completo', `${entries.length} entradas registradas`, 'Compêndio integral');

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
      for (const entry of group) await renderEntry(ctx, entry, true);
    }
  }

  const noFruit = grouped.get(null);
  if (noFruit && noFruit.length > 0) {
    newPage(ctx);
    ctx.y = ctx.pageH * 0.4;
    ctx.doc.setFontSize(22);
    ctx.doc.setFont('times', 'normal');
    ctx.doc.setTextColor(...TITLE_CLR);
    ctx.doc.text('Sem Fruto Associado', ctx.pageW / 2, ctx.y, { align: 'center' });
    ctx.y += 9;
    ornament(ctx, 32);
    ctx.y = ctx.pageH;
    for (const entry of noFruit) await renderEntry(ctx, entry, true);
  }

  ctx.doc.save('codex-completo.pdf');
}
