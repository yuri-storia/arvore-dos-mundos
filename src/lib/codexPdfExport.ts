import jsPDF from 'jspdf';
import { FRUITS } from '@/lib/data';
import type { CodexEntry } from '@/hooks/useCodexEntries';

const MARGIN = 20;
const BG_COLOR: [number, number, number] = [4, 12, 17];
const TITLE_COLOR: [number, number, number] = [220, 230, 245];
const HEADING_COLOR: [number, number, number] = [100, 181, 246];
const LABEL_COLOR: [number, number, number] = [200, 146, 42];
const BODY_COLOR: [number, number, number] = [200, 210, 225];
const DIM_COLOR: [number, number, number] = [100, 120, 150];
const ACCENT_LINE: [number, number, number] = [33, 150, 243];

function createDoc() {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const maxW = pageW - MARGIN * 2;
  let y = MARGIN;

  const addPageBg = () => {
    doc.setFillColor(...BG_COLOR);
    doc.rect(0, 0, pageW, pageH, 'F');
  };

  const checkPage = (needed: number) => {
    if (y + needed > pageH - MARGIN) {
      doc.addPage();
      addPageBg();
      y = MARGIN;
    }
  };

  addPageBg();

  return { doc, pageW, pageH, maxW, y, setY: (val: number) => { y = val; }, getY: () => y, addPageBg, checkPage };
}

function renderEntry(ctx: ReturnType<typeof createDoc>, entry: CodexEntry) {
  const { doc, maxW, checkPage, getY, setY } = ctx;
  let y = getY();

  checkPage(20);
  y = getY();

  // Entry title
  doc.setFontSize(12);
  doc.setTextColor(...HEADING_COLOR);
  doc.setFont('helvetica', 'bold');
  doc.text(entry.title, MARGIN, y);
  y += 2;

  doc.setDrawColor(...ACCENT_LINE);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, MARGIN + 40, y);
  y += 5;

  // Fruit badge
  doc.setFontSize(8);
  doc.setTextColor(...LABEL_COLOR);
  doc.setFont('helvetica', 'bold');
  const fruitInfo = entry.fruit_id !== null ? FRUITS.find(f => f.id === entry.fruit_id) : null;
  const badge = fruitInfo ? fruitInfo.name : '';
  if (badge) doc.text(badge, MARGIN, y);
  y += 5;

  // Content
  if (entry.content) {
    doc.setFontSize(10);
    doc.setTextColor(...BODY_COLOR);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(entry.content, maxW);
    lines.forEach((line: string) => {
      ctx.checkPage(6);
      y = ctx.getY();
      doc.text(line, MARGIN, y);
      y += 5;
      ctx.setY(y);
    });
  }

  y += 6;
  ctx.setY(y);
}

function addHeader(ctx: ReturnType<typeof createDoc>, title: string, subtitle?: string) {
  const { doc, pageW } = ctx;
  let y = ctx.getY();

  doc.setTextColor(...TITLE_COLOR);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(title, pageW / 2, y, { align: 'center' });
  y += 10;

  if (subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(...DIM_COLOR);
    doc.setFont('helvetica', 'italic');
    doc.text(subtitle, pageW / 2, y, { align: 'center' });
    y += 4;
  }

  doc.setDrawColor(...ACCENT_LINE);
  doc.setLineWidth(0.5);
  doc.line(pageW / 2 - 20, y, pageW / 2 + 20, y);
  y += 10;

  ctx.setY(y);
}

function addFruitSection(ctx: ReturnType<typeof createDoc>, fruitId: number, entries: CodexEntry[]) {
  const fruit = FRUITS.find(f => f.id === fruitId);
  if (!fruit || entries.length === 0) return;

  const { doc } = ctx;
  ctx.checkPage(18);
  let y = ctx.getY();

  doc.setFontSize(14);
  doc.setTextColor(...HEADING_COLOR);
  doc.setFont('helvetica', 'bold');
  doc.text(`${fruit.icon} ${fruit.num}: ${fruit.name}`, MARGIN, y);
  y += 2;

  doc.setDrawColor(...ACCENT_LINE);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, y, MARGIN + 55, y);
  y += 8;
  ctx.setY(y);

  entries.forEach(entry => renderEntry(ctx, entry));
}

function addFooter(ctx: ReturnType<typeof createDoc>) {
  const { doc, pageW, pageH } = ctx;
  doc.setFontSize(7);
  doc.setTextColor(...DIM_COLOR);
  doc.text('A Árvore dos Mundos · Universo STORIA', pageW / 2, pageH - 10, { align: 'center' });
}

function savePdf(ctx: ReturnType<typeof createDoc>, filename: string) {
  addFooter(ctx);
  ctx.doc.save(`${filename}.pdf`);
}

// ---- Public API ----

/** Export a single codex entry */
export function exportSingleEntry(entry: CodexEntry) {
  const ctx = createDoc();
  const label = entry.entry_type === 'artigo' ? 'Artigo do Codex' : 'Ficha do Codex';
  addHeader(ctx, entry.title, label);
  renderEntry(ctx, entry);
  savePdf(ctx, `entrada-${entry.title.toLowerCase().replace(/\s+/g, '-')}`);
}

/** Export all entries of a single fruit */
export function exportFruitEntries(fruitId: number, entries: CodexEntry[]) {
  const fruit = FRUITS.find(f => f.id === fruitId);
  if (!fruit) return;
  const fruitEntries = entries.filter(e => e.fruit_id === fruitId);
  if (fruitEntries.length === 0) return;

  const ctx = createDoc();
  addHeader(ctx, fruit.name, `${fruit.num} · ${fruitEntries.length} entradas`);
  fruitEntries.forEach(entry => renderEntry(ctx, entry));
  savePdf(ctx, `codex-${fruit.name.toLowerCase().replace(/\s+/g, '-')}`);
}

/** Export entries from selected fruits */
export function exportSelectedFruits(fruitIds: number[], entries: CodexEntry[]) {
  const ctx = createDoc();
  const names = fruitIds.map(id => FRUITS.find(f => f.id === id)?.name).filter(Boolean);
  addHeader(ctx, 'Codex — Frutos Selecionados', names.join(', '));

  fruitIds.forEach(fruitId => {
    const fruitEntries = entries.filter(e => e.fruit_id === fruitId);
    addFruitSection(ctx, fruitId, fruitEntries);
  });

  savePdf(ctx, 'codex-frutos-selecionados');
}

/** Export all entries */
export function exportAllEntries(entries: CodexEntry[]) {
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
  FRUITS.forEach(fruit => {
    const group = grouped.get(fruit.id);
    if (group && group.length > 0) {
      addFruitSection(ctx, fruit.id, group);
    }
  });

  // Entries without fruit
  const noFruit = grouped.get(null);
  if (noFruit && noFruit.length > 0) {
    ctx.checkPage(18);
    const { doc } = ctx;
    let y = ctx.getY();
    doc.setFontSize(14);
    doc.setTextColor(...HEADING_COLOR);
    doc.setFont('helvetica', 'bold');
    doc.text('Sem Fruto Associado', MARGIN, y);
    y += 8;
    ctx.setY(y);
    noFruit.forEach(entry => renderEntry(ctx, entry));
  }

  savePdf(ctx, 'codex-completo');
}
