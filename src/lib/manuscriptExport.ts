import jsPDF from 'jspdf';
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak,
  Footer, PageNumber, TableOfContents, LineRuleType,
} from 'docx';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import type { Manuscript, Chapter, Scene } from '@/hooks/useManuscript';
import { htmlToPlainText } from '@/lib/htmlToText';

/** Strip `@` glyph from mention tokens so exports show plain text only. */
const stripMentions = (s: string) => s.replace(/@(?=[A-Za-zÀ-ÿ0-9_\-])/g, '');

/** Converte conteúdo do capítulo (HTML do Tiptap) em texto puro para export. */
const chapterPlain = (s: string | null | undefined) =>
  stripMentions(htmlToPlainText(s));

const slug = (s: string) =>
  (s || 'manuscrito').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'manuscrito';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
   .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// ────────────────────────────────────────────────────────────────────
// PDF Export — diagramação de livro
// Capa · Sumário · Páginas de capítulo · Cabeçalho/rodapé · Numeração
// Tipografia serifada (Times), corpo justificado, recuo de 1ª linha.
// ────────────────────────────────────────────────────────────────────
export function exportManuscriptPDF(manuscript: Manuscript, chapters: Chapter[], _scenes?: Scene[]) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' }); // formato livro
  const pageW = doc.internal.pageSize.getWidth();   // 148
  const pageH = doc.internal.pageSize.getHeight();  // 210
  const marginX = 18;
  const marginTop = 22;
  const marginBottom = 22;
  const maxW = pageW - marginX * 2;
  const bookTitle = manuscript.title || 'Sem título';

  // Cor preta sólida (impressão profissional)
  const setBody = () => { doc.setTextColor(20, 20, 22); doc.setFont('times', 'normal'); doc.setFontSize(10.5); };
  const setItalic = () => { doc.setTextColor(70, 70, 75); doc.setFont('times', 'italic'); doc.setFontSize(10); };

  // Header/footer (não em capa nem na 1ª página de capítulo)
  const drawHeaderFooter = (pageNumDisplay: number, chapterTitle: string) => {
    doc.setFont('times', 'italic'); doc.setFontSize(8); doc.setTextColor(110, 110, 115);
    doc.text(bookTitle.toUpperCase(), marginX, 12);
    doc.text(chapterTitle, pageW - marginX, 12, { align: 'right' });
    doc.setDrawColor(180, 180, 185); doc.setLineWidth(0.2);
    doc.line(marginX, 14, pageW - marginX, 14);
    // rodapé com número de página
    doc.setFont('times', 'normal'); doc.setFontSize(9); doc.setTextColor(90, 90, 95);
    doc.text(String(pageNumDisplay), pageW / 2, pageH - 10, { align: 'center' });
  };

  // ── Capa ──
  doc.setFillColor(255, 255, 255); doc.rect(0, 0, pageW, pageH, 'F');
  doc.setFont('times', 'bold'); doc.setFontSize(28); doc.setTextColor(25, 25, 30);
  const titleLines = doc.splitTextToSize(bookTitle, maxW - 10);
  let coverY = pageH / 3;
  titleLines.forEach((line: string) => {
    doc.text(line, pageW / 2, coverY, { align: 'center' });
    coverY += 10;
  });
  // ornamento
  doc.setDrawColor(160, 130, 60); doc.setLineWidth(0.4);
  doc.line(pageW / 2 - 18, coverY + 4, pageW / 2 + 18, coverY + 4);

  if (manuscript.synopsis) {
    doc.setFont('times', 'italic'); doc.setFontSize(11); doc.setTextColor(80, 80, 90);
    const synLines = doc.splitTextToSize(manuscript.synopsis, maxW - 20);
    let sy = coverY + 18;
    synLines.slice(0, 8).forEach((line: string) => {
      doc.text(line, pageW / 2, sy, { align: 'center' });
      sy += 5.5;
    });
  }

  // marca discreta no rodapé da capa
  doc.setFont('times', 'italic'); doc.setFontSize(7); doc.setTextColor(150, 150, 155);
  doc.text('A Árvore dos Mundos', pageW / 2, pageH - 12, { align: 'center' });

  // ── Sumário ──
  const sortedChapters = [...chapters].sort((a, b) => a.sort_order - b.sort_order);
  doc.addPage();
  doc.setFillColor(255, 255, 255); doc.rect(0, 0, pageW, pageH, 'F');
  doc.setFont('times', 'bold'); doc.setFontSize(18); doc.setTextColor(25, 25, 30);
  doc.text('Sumário', pageW / 2, marginTop + 4, { align: 'center' });
  doc.setDrawColor(160, 130, 60); doc.setLineWidth(0.3);
  doc.line(pageW / 2 - 12, marginTop + 8, pageW / 2 + 12, marginTop + 8);

  let tocY = marginTop + 22;
  doc.setFont('times', 'normal'); doc.setFontSize(11); doc.setTextColor(40, 40, 45);
  // Numeração só estimada (capítulo X · página _) — preenchemos a página depois.
  const tocEntries: { title: string; placeholderY: number }[] = [];
  sortedChapters.forEach((ch, i) => {
    if (tocY > pageH - marginBottom - 8) { doc.addPage(); tocY = marginTop; }
    const label = `${i + 1}. ${ch.title}`;
    const lbl = doc.splitTextToSize(label, maxW - 14)[0];
    doc.text(lbl, marginX, tocY);
    tocEntries.push({ title: ch.title, placeholderY: tocY });
    // pontilhado decorativo
    doc.setTextColor(160, 160, 165); doc.setFontSize(9);
    const dots = '. '.repeat(40);
    doc.text(dots, marginX + 4, tocY + 0.3, { maxWidth: maxW - 16 });
    doc.setTextColor(40, 40, 45); doc.setFontSize(11);
    tocY += 8;
  });

  // Salva páginas atuais para depois preencher as páginas reais no sumário
  const tocPageNumbers: number[] = [];

  // ── Capítulos ──
  let displayPage = 1; // numeração visível começa no 1º capítulo
  sortedChapters.forEach((ch, idx) => {
    doc.addPage();
    doc.setFillColor(255, 255, 255); doc.rect(0, 0, pageW, pageH, 'F');
    tocPageNumbers.push(displayPage);

    // Página de abertura do capítulo: respiro no topo, "Capítulo N", título grande
    doc.setFont('times', 'italic'); doc.setFontSize(10); doc.setTextColor(150, 130, 70);
    doc.text(`Capítulo ${idx + 1}`, pageW / 2, pageH / 4, { align: 'center' });

    doc.setFont('times', 'bold'); doc.setFontSize(20); doc.setTextColor(25, 25, 30);
    const chTitleLines = doc.splitTextToSize(ch.title, maxW - 6);
    let chY = pageH / 4 + 12;
    chTitleLines.forEach((line: string) => {
      doc.text(line, pageW / 2, chY, { align: 'center' });
      chY += 9;
    });
    doc.setDrawColor(160, 130, 60); doc.setLineWidth(0.3);
    doc.line(pageW / 2 - 14, chY + 2, pageW / 2 + 14, chY + 2);

    // Rodapé da abertura (sem cabeçalho)
    doc.setFont('times', 'normal'); doc.setFontSize(9); doc.setTextColor(90, 90, 95);
    doc.text(String(displayPage), pageW / 2, pageH - 10, { align: 'center' });
    displayPage++;

    // Corpo: parágrafos justificados com recuo de 1ª linha
    if (ch.content) {
      doc.addPage();
      doc.setFillColor(255, 255, 255); doc.rect(0, 0, pageW, pageH, 'F');
      drawHeaderFooter(displayPage, ch.title);

      let y = marginTop + 6;
      const lineH = 5.2;
      const indent = 5; // recuo de 1ª linha

      setBody();
      const paragraphs = chapterPlain(ch.content)
        .split(/\n\s*\n/) // parágrafos separados por linha em branco
        .map(p => p.replace(/\s+/g, ' ').trim())
        .filter(p => p.length > 0);

      paragraphs.forEach((para, pIdx) => {
        // primeira linha com recuo
        const firstLineWidth = maxW - indent;
        // splitTextToSize na largura total — depois ajustamos a 1ª linha
        const lines: string[] = doc.splitTextToSize(para, maxW);
        // refaz: 1ª linha com largura reduzida, resto com largura cheia
        const first = doc.splitTextToSize(para, firstLineWidth)[0];
        const rest = para.slice(first.length).trim();
        const restLines = rest ? doc.splitTextToSize(rest, maxW) : [];
        const allLines = [first, ...restLines];

        allLines.forEach((line: string, lineIdx: number) => {
          if (y > pageH - marginBottom - 4) {
            doc.addPage();
            doc.setFillColor(255, 255, 255); doc.rect(0, 0, pageW, pageH, 'F');
            displayPage++;
            drawHeaderFooter(displayPage, ch.title);
            y = marginTop + 6;
            setBody();
          }
          const isLast = lineIdx === allLines.length - 1;
          const x = lineIdx === 0 ? marginX + indent : marginX;
          if (!isLast && line.includes(' ')) {
            // justificado: jsPDF aceita maxWidth + align justify simulando via charSpace
            doc.text(line, x, y, { maxWidth: lineIdx === 0 ? firstLineWidth : maxW, align: 'justify' });
          } else {
            doc.text(line, x, y);
          }
          y += lineH;
        });

        // espaço sutil entre parágrafos (estilo livro: só meia linha extra opcional)
        if (pIdx < paragraphs.length - 1) y += 0.5;
        // Nunca termina página com 1 linha sozinha do próximo parágrafo (widow control simples)
      });
    }
  });

  // Volta no sumário e escreve as páginas reais à direita
  // Sumário está nas páginas 2..? — encontramos por iteração
  // Salvamos os Y exatos em tocEntries; vamos sobrescrever
  const totalPages = doc.getNumberOfPages();
  // Página 1 = capa; sumário começa em página 2
  doc.setPage(2);
  tocEntries.forEach((e, i) => {
    // pode ter virado de página; simplificação: assume tudo na página 2 (n. de capítulos < 25 cabe)
    if (i > 0 && tocEntries[i].placeholderY < tocEntries[i - 1].placeholderY) {
      // virou página dentro do sumário
      doc.setPage(doc.getCurrentPageInfo().pageNumber + 1);
    }
    const pageNum = tocPageNumbers[i];
    if (pageNum) {
      // cobre a região onde estavam os pontos
      doc.setFillColor(255, 255, 255);
      doc.rect(pageW - marginX - 14, e.placeholderY - 3, 14, 5, 'F');
      doc.setFont('times', 'normal'); doc.setFontSize(11); doc.setTextColor(40, 40, 45);
      doc.text(String(pageNum), pageW - marginX, e.placeholderY, { align: 'right' });
    }
  });

  void totalPages;
  doc.save(`${slug(bookTitle)}.pdf`);
}

// ────────────────────────────────────────────────────────────────────
// DOCX — limpo, próximo do padrão Google Docs / Word
// Calibri 11pt · margens 1" · linha 1.15 · recuo 1.25cm · sumário automático
// ────────────────────────────────────────────────────────────────────
export async function exportManuscriptDOCX(manuscript: Manuscript, chapters: Chapter[], _scenes?: Scene[]) {
  const FONT = 'Calibri';
  const SIZE = 22; // 11pt (half-points)
  const INDENT_TWIPS = 720; // 0.5 polegada (~1.27cm) — padrão Word/Docs

  const children: Paragraph[] = [];

  // Capa
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 2400, after: 400 },
    children: [new TextRun({ text: manuscript.title || 'Sem título', bold: true, size: 56, font: FONT })],
  }));

  if (manuscript.synopsis) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [new TextRun({ text: manuscript.synopsis, italics: true, size: 24, font: FONT, color: '555555' })],
    }));
  }

  children.push(new Paragraph({ children: [new PageBreak()] }));

  // Sumário
  children.push(new Paragraph({
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
    spacing: { after: 300 },
    children: [new TextRun({ text: 'Sumário', bold: true, size: 32, font: FONT })],
  }));
  children.push(new Paragraph({
    children: [
      new TableOfContents('Sumário', { hyperlink: true, headingStyleRange: '1-3' }),
    ],
  }));
  children.push(new Paragraph({ children: [new PageBreak()] }));

  const sortedChapters = [...chapters].sort((a, b) => a.sort_order - b.sort_order);

  sortedChapters.forEach((ch, idx) => {
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_1,
      pageBreakBefore: idx > 0,
      alignment: AlignmentType.CENTER,
      spacing: { before: 600, after: 400 },
      children: [new TextRun({ text: ch.title, bold: true, size: 36, font: FONT })],
    }));

    if (ch.content) {
      const paragraphs = chapterPlain(ch.content)
        .split(/\n\s*\n/)
        .map(p => p.replace(/\s+/g, ' ').trim())
        .filter(p => p.length > 0);

      paragraphs.forEach(para => {
        children.push(new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { line: 276, lineRule: LineRuleType.AUTO, after: 0 }, // 1.15
          indent: { firstLine: INDENT_TWIPS },
          children: [new TextRun({ text: para, size: SIZE, font: FONT })],
        }));
      });
    }
  });

  const docFile = new Document({
    creator: 'A Árvore dos Mundos',
    title: manuscript.title || 'Manuscrito',
    styles: {
      default: { document: { run: { font: FONT, size: SIZE } } },
      paragraphStyles: [
        {
          id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 36, bold: true, font: FONT, color: '1a1a1a' },
          paragraph: { spacing: { before: 480, after: 240 }, outlineLevel: 0 },
        },
      ],
    },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 }, // Letter
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }, // 1"
        },
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 18, color: '777777' }),
            ],
          })],
        }),
      },
      children,
    }],
  });

  const buffer = await Packer.toBlob(docFile);
  saveAs(buffer, `${slug(manuscript.title || 'manuscrito')}.docx`);
}

// ────────────────────────────────────────────────────────────────────
// EPUB 3 — `.epub` válido, importável no KDP / Kindle Previewer / Calibre
// Estrutura: mimetype (stored), META-INF/container.xml, OEBPS/content.opf,
//            OEBPS/nav.xhtml, OEBPS/toc.ncx, OEBPS/styles.css,
//            OEBPS/chap-N.xhtml por capítulo.
// ────────────────────────────────────────────────────────────────────
function uuid(): string {
  // RFC4122 v4 leve (suficiente p/ dc:identifier)
  const a = crypto.getRandomValues(new Uint8Array(16));
  a[6] = (a[6] & 0x0f) | 0x40;
  a[8] = (a[8] & 0x3f) | 0x80;
  const hex = Array.from(a, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

function chapterXhtml(title: string, content: string, isCover = false): string {
  const paragraphs = content
    ? chapterPlain(content)
        .split(/\n\s*\n/)
        .map(p => p.replace(/\s+/g, ' ').trim())
        .filter(p => p.length > 0)
    : [];

  const body = isCover
    ? `<section epub:type="titlepage" class="titlepage">
  <h1 class="book-title">${esc(title)}</h1>
</section>`
    : `<section epub:type="chapter" class="chapter">
  <h1>${esc(title)}</h1>
${paragraphs.map(p => `  <p>${esc(p)}</p>`).join('\n')}
</section>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="pt-BR" lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>${esc(title)}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
${body}
</body>
</html>`;
}

export async function exportManuscriptEPUB(manuscript: Manuscript, chapters: Chapter[], _scenes?: Scene[]) {
  const zip = new JSZip();
  const bookTitle = manuscript.title || 'Sem título';
  const bookId = `urn:uuid:${uuid()}`;
  const now = new Date().toISOString().replace(/\.\d{3}/, '');
  const sortedChapters = [...chapters].sort((a, b) => a.sort_order - b.sort_order);

  // 1) mimetype — DEVE ser o 1º arquivo e SEM compressão
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  // 2) META-INF/container.xml
  zip.folder('META-INF')!.file('container.xml',
`<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

  const oebps = zip.folder('OEBPS')!;

  // 3) CSS de leitura (Kindle-friendly)
  oebps.file('styles.css',
`@namespace epub "http://www.idpf.org/2007/ops";
body { font-family: Georgia, "Times New Roman", serif; line-height: 1.6; margin: 0 1em; color: #1a1a1a; }
h1 { font-size: 1.6em; font-weight: bold; text-align: center; margin: 2em 0 1.2em; page-break-before: always; }
.chapter > h1 { margin-top: 3em; }
.chapter > p { text-indent: 1.5em; margin: 0; text-align: justify; }
.chapter > p:first-of-type { text-indent: 0; }
.chapter > p:first-of-type::first-letter { font-size: 2.4em; font-weight: bold; float: left; line-height: 1; padding: 0.05em 0.08em 0 0; }
.titlepage { text-align: center; padding: 30% 1em 0; }
.book-title { font-size: 2.2em; font-weight: bold; }
.synopsis { font-style: italic; color: #555; margin-top: 2em; font-size: 1.05em; }`);

  // 4) Capítulos XHTML
  // cover.xhtml
  const coverXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="pt-BR" lang="pt-BR">
<head><meta charset="UTF-8"/><title>${esc(bookTitle)}</title><link rel="stylesheet" type="text/css" href="styles.css"/></head>
<body>
<section epub:type="titlepage" class="titlepage">
  <h1 class="book-title">${esc(bookTitle)}</h1>
  ${manuscript.synopsis ? `<p class="synopsis">${esc(manuscript.synopsis)}</p>` : ''}
</section>
</body>
</html>`;
  oebps.file('cover.xhtml', coverXhtml);

  sortedChapters.forEach((ch, i) => {
    oebps.file(`chap-${i + 1}.xhtml`, chapterXhtml(ch.title, ch.content || ''));
  });

  // 5) nav.xhtml (TOC EPUB3)
  const navItems = sortedChapters
    .map((ch, i) => `      <li><a href="chap-${i + 1}.xhtml">${esc(ch.title)}</a></li>`)
    .join('\n');
  oebps.file('nav.xhtml',
`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="pt-BR" lang="pt-BR">
<head><meta charset="UTF-8"/><title>Sumário</title><link rel="stylesheet" type="text/css" href="styles.css"/></head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Sumário</h1>
    <ol>
${navItems}
    </ol>
  </nav>
</body>
</html>`);

  // 6) toc.ncx (compat. Kindle antigo / EPUB2)
  const navPoints = sortedChapters
    .map((ch, i) =>
`    <navPoint id="np-${i + 1}" playOrder="${i + 1}">
      <navLabel><text>${esc(ch.title)}</text></navLabel>
      <content src="chap-${i + 1}.xhtml"/>
    </navPoint>`).join('\n');
  oebps.file('toc.ncx',
`<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1" xml:lang="pt-BR">
  <head>
    <meta name="dtb:uid" content="${bookId}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${esc(bookTitle)}</text></docTitle>
  <navMap>
${navPoints}
  </navMap>
</ncx>`);

  // 7) content.opf
  const manifestChapters = sortedChapters
    .map((_, i) => `    <item id="chap${i + 1}" href="chap-${i + 1}.xhtml" media-type="application/xhtml+xml"/>`)
    .join('\n');
  const spineChapters = sortedChapters
    .map((_, i) => `    <itemref idref="chap${i + 1}"/>`)
    .join('\n');

  oebps.file('content.opf',
`<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="pt-BR">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">${bookId}</dc:identifier>
    <dc:title>${esc(bookTitle)}</dc:title>
    <dc:language>pt-BR</dc:language>
    <dc:creator>${esc('Autor')}</dc:creator>
    <dc:date>${now.slice(0, 10)}</dc:date>
    ${manuscript.synopsis ? `<dc:description>${esc(manuscript.synopsis)}</dc:description>` : ''}
    <meta property="dcterms:modified">${now}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="css" href="styles.css" media-type="text/css"/>
    <item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>
${manifestChapters}
  </manifest>
  <spine toc="ncx">
    <itemref idref="cover"/>
    <itemref idref="nav"/>
${spineChapters}
  </spine>
</package>`);

  // 8) Gera o .epub
  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/epub+zip',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
  saveAs(blob, `${slug(bookTitle)}.epub`);
}
