import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak } from 'docx';
import { saveAs } from 'file-saver';
import type { Manuscript, Chapter, Scene } from '@/hooks/useManuscript';

/** Strip `@` from mention tokens so exports show plain text only. */
const stripMentions = (s: string) =>
  s.replace(/@([A-Za-zÀ-ÿ0-9_\-]+(?:\s[A-Za-zÀ-ÿ0-9_\-]+)?)/g, '$1');


// ── PDF Export ──
export function exportManuscriptPDF(manuscript: Manuscript, chapters: Chapter[], _scenes?: Scene[]) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 25;
  const maxW = pageW - margin * 2;
  let y = margin;

  const addBg = () => {
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageW, pageH, 'F');
  };
  const checkPage = (needed: number) => {
    if (y + needed > pageH - margin) { doc.addPage(); addBg(); y = margin; }
  };
  addBg();

  // Title page
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text(manuscript.title || 'Sem título', pageW / 2, pageH / 3, { align: 'center' });
  if (manuscript.synopsis) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    const synLines = doc.splitTextToSize(manuscript.synopsis, maxW - 20);
    synLines.forEach((line: string, i: number) => {
      doc.text(line, pageW / 2, pageH / 3 + 20 + i * 6, { align: 'center' });
    });
  }

  // Chapters
  chapters.sort((a, b) => a.sort_order - b.sort_order).forEach((ch) => {
    doc.addPage(); addBg(); y = margin;
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(ch.title, pageW / 2, y + 20, { align: 'center' });
    y += 35;

    if (ch.content) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40, 40, 40);
      const lines = doc.splitTextToSize(stripMentions(ch.content), maxW);
      lines.forEach((line: string) => {
        checkPage(6);
        doc.text(line, margin, y);
        y += 5.5;
      });
    }
    y += 8;
  });

  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Exportado via A Árvore dos Mundos', pageW / 2, pageH - 10, { align: 'center' });

  doc.save(`${(manuscript.title || 'manuscrito').toLowerCase().replace(/\s+/g, '-')}.pdf`);
}

// ── DOCX Export ──
export async function exportManuscriptDOCX(manuscript: Manuscript, chapters: Chapter[], _scenes?: Scene[]) {
  const children: Paragraph[] = [];

  // Title
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
    children: [new TextRun({ text: manuscript.title || 'Sem título', bold: true, size: 56, font: 'Georgia' })],
  }));

  if (manuscript.synopsis) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
      children: [new TextRun({ text: manuscript.synopsis, italics: true, size: 24, font: 'Georgia', color: '666666' })],
    }));
  }

  children.push(new Paragraph({ children: [new PageBreak()] }));

  chapters.sort((a, b) => a.sort_order - b.sort_order).forEach((ch, idx) => {
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
      pageBreakBefore: idx > 0,
      children: [new TextRun({ text: ch.title, bold: true, size: 36, font: 'Georgia' })],
    }));

    if (ch.content) {
      stripMentions(ch.content).split('\n').forEach(para => {
        children.push(new Paragraph({
          spacing: { after: 120, line: 360 },
          children: [new TextRun({ text: para, size: 24, font: 'Georgia' })],
        }));
      });
    }
  });

  const docFile = new Document({
    sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } }, children }],
  });

  const buffer = await Packer.toBlob(docFile);
  saveAs(buffer, `${(manuscript.title || 'manuscrito').toLowerCase().replace(/\s+/g, '-')}.docx`);
}

// ── EPUB / Kindle-ready HTML Export ──
export function exportManuscriptEPUB(manuscript: Manuscript, chapters: Chapter[], _scenes?: Scene[]) {
  let html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${manuscript.title || 'Sem título'}</title>
<style>
  body { font-family: Georgia, serif; max-width: 700px; margin: 0 auto; padding: 40px 20px; color: #222; line-height: 1.8; }
  h1 { text-align: center; font-size: 2em; margin-bottom: 0.5em; page-break-before: always; }
  h1:first-of-type { page-break-before: avoid; }
  p { text-indent: 1.5em; margin: 0.3em 0; }
  .title-page { text-align: center; padding: 30vh 0 10vh; }
  .title-page h1 { page-break-before: avoid; font-size: 2.5em; }
  .synopsis { font-style: italic; color: #666; max-width: 500px; margin: 1em auto; }
</style>
</head>
<body>
<div class="title-page">
  <h1>${(manuscript.title || 'Sem título').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</h1>
  ${manuscript.synopsis ? `<p class="synopsis">${manuscript.synopsis.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>` : ''}
</div>
`;

  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  chapters.sort((a, b) => a.sort_order - b.sort_order).forEach((ch) => {
    html += `<h1>${esc(ch.title)}</h1>\n`;
    if (ch.content) {
      stripMentions(ch.content).split('\n').filter(p => p.trim()).forEach(para => {
        html += `<p>${esc(para)}</p>\n`;
      });
    }
  });

  html += `</body></html>`;
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  saveAs(blob, `${(manuscript.title || 'manuscrito').toLowerCase().replace(/\s+/g, '-')}-kindle.html`);
}
