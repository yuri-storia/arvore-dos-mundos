// Import a manuscript file (.pdf, .docx, .txt, .epub) and split it into chapters.
// Returns { title, chapters: [{ title, content }] } — content is plain text
// stored later as `<p>...</p>` blocks by the caller.

import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth/mammoth.browser';
import JSZip from 'jszip';
import { htmlToPlainText } from '@/lib/htmlToText';

export interface ImportedChapter {
  title: string;
  content: string; // plain text with \n\n paragraph separators
}

export interface ImportedManuscript {
  title: string;
  chapters: ImportedChapter[];
  sourceType: 'pdf' | 'docx' | 'txt' | 'epub';
}

// Matches "Capítulo 1", "CAPÍTULO I", "Chapter 12", "Prólogo", "Epílogo"
const CHAPTER_HEADING_RE =
  /^\s*(?:cap[ií]tulo|chapter|pr[oó]logo|prologue|ep[ií]logo|epilogue)\b[^\n]*$/im;

function splitByChapterHeadings(text: string): ImportedChapter[] {
  const lines = text.split(/\r?\n/);
  const chapters: ImportedChapter[] = [];
  let current: ImportedChapter | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const isHeading =
      line.length > 0 &&
      line.length <= 80 &&
      CHAPTER_HEADING_RE.test(line);

    if (isHeading) {
      if (current) chapters.push(current);
      current = { title: line.replace(/\s+/g, ' ').trim(), content: '' };
    } else {
      if (!current) current = { title: 'Capítulo 1', content: '' };
      current.content += rawLine + '\n';
    }
  }
  if (current) chapters.push(current);

  // Cleanup: collapse blank lines and trim
  return chapters
    .map((c) => ({
      title: c.title,
      content: c.content.replace(/\n{3,}/g, '\n\n').trim(),
    }))
    .filter((c) => c.content.length > 0 || chapters.length === 1);
}

function normalizeChapters(chapters: ImportedChapter[], fallbackTitle: string): ImportedChapter[] {
  const clean = chapters
    .map((c, i) => ({
      title: (c.title || `Capítulo ${i + 1}`).slice(0, 120),
      content: c.content.trim(),
    }))
    .filter((c) => c.content.length > 0);
  if (clean.length === 0) {
    return [{ title: fallbackTitle || 'Capítulo 1', content: '' }];
  }
  return clean;
}

async function extractPdf(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  let text = '';
  const maxPages = Math.min(pdf.numPages, 500);
  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    // Preserve rough line structure using item transforms
    let lastY: number | null = null;
    let pageText = '';
    for (const it of content.items as Array<{ str?: string; transform?: number[] }>) {
      const y = it.transform?.[5] ?? null;
      if (lastY !== null && y !== null && Math.abs(y - lastY) > 2) pageText += '\n';
      pageText += (it.str || '') + ' ';
      lastY = y;
    }
    text += pageText.trim() + '\n\n';
  }
  return text;
}

async function extractDocx(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  // Use HTML then flatten — preserves paragraph breaks better than raw text.
  const result = await mammoth.convertToHtml({ arrayBuffer: buf });
  return htmlToPlainText(result.value || '');
}

async function extractEpub(file: File): Promise<ImportedChapter[]> {
  const zip = await JSZip.loadAsync(file);

  // Find OPF via container.xml
  const containerFile = zip.file('META-INF/container.xml');
  let opfPath: string | null = null;
  if (containerFile) {
    const xml = await containerFile.async('string');
    const m = xml.match(/full-path="([^"]+)"/);
    if (m) opfPath = m[1];
  }
  // Fallback: scan for any .opf
  if (!opfPath) {
    const opfEntry = Object.keys(zip.files).find((n) => n.toLowerCase().endsWith('.opf'));
    opfPath = opfEntry || null;
  }
  if (!opfPath) throw new Error('EPUB inválido: OPF não encontrado.');

  const opfFile = zip.file(opfPath);
  if (!opfFile) throw new Error('EPUB inválido: OPF ausente.');
  const opfXml = await opfFile.async('string');
  const basePath = opfPath.split('/').slice(0, -1).join('/');

  // Manifest: id → href
  const manifest = new Map<string, string>();
  const manifestRe = /<item\s+[^>]*id="([^"]+)"[^>]*href="([^"]+)"[^>]*\/?>/gi;
  let mm: RegExpExecArray | null;
  while ((mm = manifestRe.exec(opfXml))) {
    manifest.set(mm[1], mm[2]);
  }

  // Spine order
  const spineIds: string[] = [];
  const spineRe = /<itemref\s+[^>]*idref="([^"]+)"/gi;
  let sm: RegExpExecArray | null;
  while ((sm = spineRe.exec(opfXml))) spineIds.push(sm[1]);

  const resolved = spineIds
    .map((id) => manifest.get(id))
    .filter(Boolean)
    .map((href) => (basePath ? `${basePath}/${href}` : href!)) as string[];

  const chapters: ImportedChapter[] = [];
  for (const path of resolved) {
    const file = zip.file(path) || zip.file(decodeURIComponent(path));
    if (!file) continue;
    const html = await file.async('string');
    // Title: <title>, first <h1>, <h2>, or filename
    const titleMatch =
      html.match(/<title[^>]*>([^<]+)<\/title>/i) ||
      html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) ||
      html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
    const title = titleMatch ? htmlToPlainText(titleMatch[1]).trim() : '';
    // Body content: extract inside <body>...</body> when present
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const bodyHtml = bodyMatch ? bodyMatch[1] : html;
    const content = htmlToPlainText(bodyHtml);
    chapters.push({
      title: title || `Capítulo ${chapters.length + 1}`,
      content,
    });
  }
  return chapters;
}

export async function importManuscriptFile(file: File): Promise<ImportedManuscript> {
  const name = file.name.toLowerCase();
  const ext = name.split('.').pop() || '';
  const baseTitle = file.name.replace(/\.[^.]+$/, '');

  if (ext === 'epub' || file.type === 'application/epub+zip') {
    const chapters = await extractEpub(file);
    return {
      title: baseTitle,
      chapters: normalizeChapters(chapters, baseTitle),
      sourceType: 'epub',
    };
  }

  let rawText = '';
  let sourceType: 'pdf' | 'docx' | 'txt' = 'txt';

  if (ext === 'pdf' || file.type === 'application/pdf') {
    rawText = await extractPdf(file);
    sourceType = 'pdf';
  } else if (
    ext === 'docx' ||
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    rawText = await extractDocx(file);
    sourceType = 'docx';
  } else {
    rawText = await file.text();
    sourceType = 'txt';
  }

  rawText = rawText.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  const split = splitByChapterHeadings(rawText);
  return {
    title: baseTitle,
    chapters: normalizeChapters(split, baseTitle),
    sourceType,
  };
}

/** Convert plain text (with \n\n paragraphs) into simple HTML for the editor. */
export function chapterTextToHtml(text: string): string {
  if (!text.trim()) return '';
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br />')}</p>`)
    .join('');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
