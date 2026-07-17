// Import a manuscript file (.pdf, .docx, .txt, .epub) and split it into chapters.
// Supports configurable detection strategy, ordering rule, and progress reporting.

import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth/mammoth.browser';
import JSZip from 'jszip';
import { htmlToPlainText } from '@/lib/htmlToText';
import { supabase } from '@/integrations/supabase/client';

// Ensure pdfjs worker is configured even if textExtractor.ts hasn't loaded yet.
(pdfjsLib as unknown as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc =
  `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export type SourceType = 'pdf' | 'docx' | 'txt' | 'epub';

export interface ImportedChapter {
  title: string;
  content: string; // plain text with \n\n paragraph separators
}

export interface ImportedManuscript {
  title: string;
  chapters: ImportedChapter[];
  sourceType: SourceType;
}

// ─────────────────────────── Text cleanup (diagramação) ───────────────────────────

/**
 * Cleans extracted text from PDF/DOCX/EPUB. Removes typical layout artifacts:
 * - Zero-width & non-breaking spaces
 * - Soft hyphens & end-of-line hyphenation (pala-\nvra -> palavra)
 * - Standalone page numbers
 * - Repeated running headers/footers (same short line appearing on many pages)
 * - Line breaks inside paragraphs (join lines that don't end with sentence punctuation)
 * - Collapses excessive whitespace and blank lines
 */
export function cleanExtractedText(raw: string): string {
  if (!raw) return '';
  let t = raw.replace(/\r\n?/g, '\n');

  // Strip invisible / weird chars
  t = t.replace(/[\u200B-\u200D\uFEFF]/g, ''); // zero-width
  t = t.replace(/\u00AD/g, ''); // soft hyphen
  t = t.replace(/\u00A0/g, ' '); // non-breaking space

  // End-of-line hyphenation: "pala-\nvra" -> "palavra"
  // Only when second part starts lowercase (avoid joining proper nouns / compounds like "pós-Guerra")
  t = t.replace(/([A-Za-zÀ-ÿ])-\n([a-zà-ÿ])/g, '$1$2');

  // Remove repeated running headers/footers.
  // Heuristic: short lines (<= 80 chars) that appear 3+ times identically.
  {
    const lines = t.split('\n');
    const counts = new Map<string, number>();
    for (const l of lines) {
      const k = l.trim();
      if (!k || k.length > 80) continue;
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    const repeated = new Set<string>();
    for (const [k, n] of counts) {
      if (n >= 3 && !/[.!?]$/.test(k) && k.split(/\s+/).length <= 12) repeated.add(k);
    }
    if (repeated.size > 0) {
      t = lines.filter((l) => !repeated.has(l.trim())).join('\n');
    }
  }

  // Remove standalone page numbers: lines that are just digits or "Página 12", "- 12 -", etc.
  t = t.replace(/^\s*(?:p[aá]g(?:ina)?\.?\s*)?[-–—]?\s*\d{1,4}\s*[-–—]?\s*$/gim, '');

  // Normalize spaces inside lines
  t = t
    .split('\n')
    .map((l) => l.replace(/[ \t]+/g, ' ').replace(/ +$/g, ''))
    .join('\n');

  // Join broken lines inside paragraphs.
  // A "paragraph break" = a blank line. Inside a paragraph, single \n should become a space
  // unless the previous line clearly ends a sentence and the next starts with a capital / dash.
  {
    const paragraphs = t.split(/\n{2,}/);
    const rebuilt = paragraphs.map((p) => {
      const lines = p.split('\n');
      if (lines.length <= 1) return p.trim();
      let out = lines[0].trim();
      for (let i = 1; i < lines.length; i++) {
        const prev = out;
        const cur = lines[i].trim();
        if (!cur) continue;
        const prevEndsSentence = /[.!?…"”)\]]$/.test(prev);
        const curStartsDialog = /^[-–—"“]/.test(cur);
        const curStartsList = /^(?:[•·]|\d+[.)]\s)/.test(cur);
        if (prevEndsSentence && (curStartsDialog || curStartsList)) {
          out += '\n' + cur;
        } else {
          out += ' ' + cur;
        }
      }
      return out;
    });
    t = rebuilt.filter((p) => p.length > 0).join('\n\n');
  }

  // Collapse leftover multi-blank lines and trim
  t = t.replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ').trim();
  return t;
}

// ─────────────────────────── Detection & ordering ───────────────────────────

export type DetectionMode = 'auto' | 'regex' | 'separator' | 'heading' | 'none';
export type OrderRule = 'as-detected' | 'numeric' | 'title' | 'spine';

export interface DetectionConfig {
  mode: DetectionMode;
  /** Custom regex source (used when mode = 'regex'). Line-based, case-insensitive. */
  regex?: string;
  /** Literal separator string (used when mode = 'separator'). */
  separator?: string;
  /** Heading level for EPUB (mode = 'heading'). 1 = <h1>, 2 = <h2>, 3 = <h3>. */
  headingLevel?: 1 | 2 | 3;
}

export const DEFAULT_DETECTION: DetectionConfig = {
  mode: 'auto',
  regex: '^\\s*(?:cap[ií]tulo|chapter|pr[oó]logo|prologue|ep[ií]logo|epilogue)\\b.*$',
  separator: '***',
  headingLevel: 1,
};

// Default "auto" regex.
const AUTO_HEADING_RE =
  /^\s*(?:cap[ií]tulo|chapter|pr[oó]logo|prologue|ep[ií]logo|epilogue)\b[^\n]*$/i;

export type ProgressStage =
  | 'reading'
  | 'extracting'
  | 'parsing'
  | 'splitting'
  | 'ordering'
  | 'done';

export interface ProgressEvent {
  stage: ProgressStage;
  /** 0..1 */
  progress: number;
  message: string;
}

export type OnProgress = (e: ProgressEvent) => void;

// ─────────────────────────── Splitting ───────────────────────────

function buildDetector(cfg: DetectionConfig): { kind: 'regex' | 'separator' | 'none'; test: (line: string) => boolean } {
  if (cfg.mode === 'none') return { kind: 'none', test: () => false };
  if (cfg.mode === 'separator') {
    const sep = (cfg.separator ?? DEFAULT_DETECTION.separator!).trim();
    return { kind: 'separator', test: (l) => l.trim() === sep };
  }
  if (cfg.mode === 'regex') {
    try {
      const re = new RegExp(cfg.regex ?? DEFAULT_DETECTION.regex!, 'i');
      return { kind: 'regex', test: (l) => re.test(l) };
    } catch {
      return { kind: 'regex', test: (l) => AUTO_HEADING_RE.test(l) };
    }
  }
  // auto (or fallback)
  return {
    kind: 'regex',
    test: (l) => l.trim().length > 0 && l.trim().length <= 80 && AUTO_HEADING_RE.test(l),
  };
}

function splitByDetector(text: string, cfg: DetectionConfig): ImportedChapter[] {
  const det = buildDetector(cfg);
  const lines = text.split(/\r?\n/);
  const chapters: ImportedChapter[] = [];
  let current: ImportedChapter | null = null;
  let sepCounter = 1;

  for (const rawLine of lines) {
    const line = rawLine;
    if (det.test(line)) {
      // For 'separator' the line itself is discarded; the next chapter starts fresh.
      if (current) chapters.push(current);
      if (det.kind === 'separator') {
        current = { title: `Capítulo ${chapters.length + 1}`, content: '' };
      } else {
        current = { title: line.trim().replace(/\s+/g, ' '), content: '' };
      }
      sepCounter++;
    } else {
      if (!current) current = { title: 'Capítulo 1', content: '' };
      current.content += rawLine + '\n';
    }
  }
  if (current) chapters.push(current);

  return chapters
    .map((c) => ({
      title: c.title,
      content: c.content.replace(/\n{3,}/g, '\n\n').trim(),
    }));
}

function normalizeChapters(chapters: ImportedChapter[], fallbackTitle: string): ImportedChapter[] {
  const clean = chapters
    .map((c, i) => ({
      title: (c.title || `Capítulo ${i + 1}`).replace(/\s+/g, ' ').trim().slice(0, 120),
      content: cleanExtractedText((c.content || '').trim()),
    }))
    .filter((c) => c.content.length > 0 || c.title.length > 0);
  if (clean.length === 0) {
    return [{ title: fallbackTitle || 'Capítulo 1', content: '' }];
  }
  return clean;
}

// ─────────────────────────── Ordering ───────────────────────────

const ROMAN_RE = /^[IVXLCDM]+$/i;

function parseRoman(s: string): number | null {
  const map: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;
  const up = s.toUpperCase();
  for (let i = 0; i < up.length; i++) {
    const cur = map[up[i]];
    const next = map[up[i + 1]] || 0;
    if (!cur) return null;
    total += cur < next ? -cur : cur;
  }
  return total || null;
}

function extractChapterNumber(title: string): number | null {
  // "Capítulo 12", "Chapter IV", "12 - Something"
  const m = title.match(/(?:cap[ií]tulo|chapter)\s+([\dIVXLCM]+)/i) || title.match(/^\s*([\dIVXLCM]+)\b/);
  if (!m) return null;
  const raw = m[1];
  if (/^\d+$/.test(raw)) return parseInt(raw, 10);
  if (ROMAN_RE.test(raw)) return parseRoman(raw);
  return null;
}

export function applyOrderRule(chapters: ImportedChapter[], rule: OrderRule): ImportedChapter[] {
  if (rule === 'as-detected' || rule === 'spine') return chapters;
  const withKey = chapters.map((c, i) => ({ c, i, num: extractChapterNumber(c.title) }));
  if (rule === 'numeric') {
    withKey.sort((a, b) => {
      const an = a.num ?? Number.MAX_SAFE_INTEGER;
      const bn = b.num ?? Number.MAX_SAFE_INTEGER;
      if (an !== bn) return an - bn;
      return a.i - b.i;
    });
  } else if (rule === 'title') {
    withKey.sort((a, b) => a.c.title.localeCompare(b.c.title, 'pt-BR', { sensitivity: 'base' }));
  }
  return withKey.map((x) => x.c);
}

// ─────────────────────────── Extractors ───────────────────────────

async function extractPdf(file: File, onProgress?: OnProgress): Promise<string> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const maxPages = Math.min(pdf.numPages, 500);
  let text = '';
  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    let lastY: number | null = null;
    let pageText = '';
    for (const it of content.items as Array<{ str?: string; transform?: number[] }>) {
      const y = it.transform?.[5] ?? null;
      if (lastY !== null && y !== null && Math.abs(y - lastY) > 2) pageText += '\n';
      pageText += (it.str || '') + ' ';
      lastY = y;
    }
    text += pageText.trim() + '\n\n';
    onProgress?.({
      stage: 'extracting',
      progress: 0.1 + 0.7 * (i / maxPages),
      message: `Lendo página ${i} de ${maxPages}…`,
    });
  }
  return text;
}

async function extractDocx(file: File, onProgress?: OnProgress): Promise<string> {
  onProgress?.({ stage: 'extracting', progress: 0.3, message: 'Convertendo documento Word…' });
  const buf = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer: buf });
  onProgress?.({ stage: 'extracting', progress: 0.7, message: 'Extraindo texto…' });
  return htmlToPlainText(result.value || '');
}

interface EpubDoc {
  path: string;
  html: string;
}

async function loadEpubDocs(file: File, onProgress?: OnProgress): Promise<EpubDoc[]> {
  onProgress?.({ stage: 'extracting', progress: 0.15, message: 'Abrindo pacote EPUB…' });
  const zip = await JSZip.loadAsync(file);

  const containerFile = zip.file('META-INF/container.xml');
  let opfPath: string | null = null;
  if (containerFile) {
    const xml = await containerFile.async('string');
    const m = xml.match(/full-path="([^"]+)"/);
    if (m) opfPath = m[1];
  }
  if (!opfPath) {
    const opfEntry = Object.keys(zip.files).find((n) => n.toLowerCase().endsWith('.opf'));
    opfPath = opfEntry || null;
  }
  if (!opfPath) throw new Error('EPUB inválido: OPF não encontrado.');

  const opfFile = zip.file(opfPath);
  if (!opfFile) throw new Error('EPUB inválido: OPF ausente.');
  const opfXml = await opfFile.async('string');
  const basePath = opfPath.split('/').slice(0, -1).join('/');

  const manifest = new Map<string, string>();
  const manifestRe = /<item\s+[^>]*id="([^"]+)"[^>]*href="([^"]+)"[^>]*\/?>/gi;
  let mm: RegExpExecArray | null;
  while ((mm = manifestRe.exec(opfXml))) manifest.set(mm[1], mm[2]);

  const spineIds: string[] = [];
  const spineRe = /<itemref\s+[^>]*idref="([^"]+)"/gi;
  let sm: RegExpExecArray | null;
  while ((sm = spineRe.exec(opfXml))) spineIds.push(sm[1]);

  const resolved = spineIds
    .map((id) => manifest.get(id))
    .filter(Boolean)
    .map((href) => (basePath ? `${basePath}/${href}` : href!)) as string[];

  const docs: EpubDoc[] = [];
  for (let i = 0; i < resolved.length; i++) {
    const path = resolved[i];
    const entry = zip.file(path) || zip.file(decodeURIComponent(path));
    if (!entry) continue;
    const html = await entry.async('string');
    docs.push({ path, html });
    onProgress?.({
      stage: 'extracting',
      progress: 0.2 + 0.6 * ((i + 1) / resolved.length),
      message: `Lendo documento ${i + 1} de ${resolved.length}…`,
    });
  }
  return docs;
}

function epubDocsToChapters(docs: EpubDoc[], cfg: DetectionConfig): ImportedChapter[] {
  // Heading mode: split each doc by its heading level (h1/h2/h3).
  if (cfg.mode === 'heading') {
    const lvl = cfg.headingLevel ?? 1;
    const chapters: ImportedChapter[] = [];
    const tagRe = new RegExp(`<h${lvl}[^>]*>([\\s\\S]*?)<\\/h${lvl}>`, 'gi');
    for (const doc of docs) {
      // Split doc HTML at each h{lvl}
      const parts = doc.html.split(tagRe);
      // parts = [before, title1, content1, title2, content2, ...]
      if (parts.length <= 1) {
        const content = htmlToPlainText(doc.html);
        if (content.trim()) chapters.push({ title: `Capítulo ${chapters.length + 1}`, content });
        continue;
      }
      // Any "before" text is prepended to previous chapter or skipped
      for (let i = 1; i < parts.length; i += 2) {
        const title = htmlToPlainText(parts[i]).trim() || `Capítulo ${chapters.length + 1}`;
        const content = htmlToPlainText(parts[i + 1] || '');
        chapters.push({ title, content });
      }
    }
    return chapters;
  }

  // Default (auto/spine): one chapter per doc; title comes from <title>/<h1>/<h2>.
  return docs.map((doc, i) => {
    const titleMatch =
      doc.html.match(/<title[^>]*>([^<]+)<\/title>/i) ||
      doc.html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) ||
      doc.html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
    const title = titleMatch ? htmlToPlainText(titleMatch[1]).trim() : '';
    const bodyMatch = doc.html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const bodyHtml = bodyMatch ? bodyMatch[1] : doc.html;
    return {
      title: title || `Capítulo ${i + 1}`,
      content: htmlToPlainText(bodyHtml),
    };
  });
}

// ─────────────────────────── Main entry ───────────────────────────

export interface ImportOptions {
  detection?: DetectionConfig;
  order?: OrderRule;
  onProgress?: OnProgress;
}

export async function importManuscriptFile(
  file: File,
  opts: ImportOptions = {},
): Promise<ImportedManuscript> {
  const detection = opts.detection ?? DEFAULT_DETECTION;
  const order = opts.order ?? 'as-detected';
  const onProgress = opts.onProgress;

  const name = file.name.toLowerCase();
  const ext = name.split('.').pop() || '';
  const baseTitle = file.name.replace(/\.[^.]+$/, '');

  onProgress?.({ stage: 'reading', progress: 0.05, message: `Lendo "${file.name}"…` });

  if (ext === 'epub' || file.type === 'application/epub+zip') {
    const docs = await loadEpubDocs(file, onProgress);
    onProgress?.({ stage: 'splitting', progress: 0.85, message: 'Organizando capítulos do EPUB…' });
    let chapters = epubDocsToChapters(docs, detection);
    // For EPUB with auto/regex/separator, re-split each doc's plain text too.
    if (detection.mode === 'regex' || detection.mode === 'separator' || detection.mode === 'auto') {
      const merged: ImportedChapter[] = [];
      for (const ch of chapters) {
        const parts = splitByDetector(ch.content, detection);
        if (parts.length <= 1) merged.push(ch);
        else {
          // If the doc had a title, keep it as first sub-chapter's title if it lacked one.
          for (const p of parts) merged.push(p);
        }
      }
      chapters = merged;
    }
    chapters = normalizeChapters(chapters, baseTitle);
    onProgress?.({ stage: 'ordering', progress: 0.95, message: 'Aplicando ordenação…' });
    chapters = applyOrderRule(chapters, order);
    onProgress?.({ stage: 'done', progress: 1, message: 'Pronto.' });
    return { title: baseTitle, chapters, sourceType: 'epub' };
  }

  let rawText = '';
  let sourceType: 'pdf' | 'docx' | 'txt' = 'txt';

  if (ext === 'pdf' || file.type === 'application/pdf') {
    rawText = await extractPdf(file, onProgress);
    sourceType = 'pdf';
  } else if (
    ext === 'docx' ||
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    rawText = await extractDocx(file, onProgress);
    sourceType = 'docx';
  } else {
    onProgress?.({ stage: 'extracting', progress: 0.4, message: 'Lendo texto…' });
    rawText = await file.text();
    sourceType = 'txt';
  }

  onProgress?.({ stage: 'splitting', progress: 0.85, message: 'Detectando capítulos…' });
  rawText = cleanExtractedText(rawText);
  let chapters = splitByDetector(rawText, detection);
  chapters = normalizeChapters(chapters, baseTitle);
  onProgress?.({ stage: 'ordering', progress: 0.95, message: 'Aplicando ordenação…' });
  chapters = applyOrderRule(chapters, order);
  onProgress?.({ stage: 'done', progress: 1, message: 'Pronto.' });

  return { title: baseTitle, chapters, sourceType };
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
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Word count for plain text. */
export function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

// ─────────────────────────── Smart auto-detection ───────────────────────────

const CANDIDATE_DETECTIONS: DetectionConfig[] = [
  { mode: 'auto' },
  { mode: 'regex', regex: '^\\s*(?:cap[ií]tulo|chapter)\\s+[\\dIVXLCM]+\\b.*$' },
  { mode: 'regex', regex: '^\\s*(?:cap[ií]tulo|chapter|pr[oó]logo|prologue|ep[ií]logo|epilogue|parte|part|book|livro)\\b[^\\n]*$' },
  { mode: 'regex', regex: '^\\s*[\\dIVXLCM]+\\s*[\\.\\-\\—:]\\s+.{0,80}$' },
  { mode: 'separator', separator: '***' },
  { mode: 'separator', separator: '---' },
  { mode: 'separator', separator: '###' },
];

function scoreCandidate(count: number, expected?: number): number {
  if (count <= 1) return -1000;
  if (expected && expected > 0) return -Math.abs(count - expected);
  if (count > 500) return -100 - count;
  return Math.min(count, 60);
}

export interface SmartImportOptions {
  expectedChapterCount?: number;
  onProgress?: OnProgress;
}

/**
 * "One-click" importer: extracts the file, then tries multiple detection strategies
 * and picks the one that best matches expectedChapterCount (or a sensible default).
 */
export async function smartImportManuscript(
  file: File,
  opts: SmartImportOptions = {},
): Promise<ImportedManuscript & { detectionUsed: DetectionConfig }> {
  const { expectedChapterCount, onProgress } = opts;
  const name = file.name.toLowerCase();
  const ext = name.split('.').pop() || '';
  const baseTitle = file.name.replace(/\.[^.]+$/, '');

  onProgress?.({ stage: 'reading', progress: 0.05, message: `Lendo "${file.name}"…` });

  if (ext === 'epub' || file.type === 'application/epub+zip') {
    const docs = await loadEpubDocs(file, onProgress);
    onProgress?.({ stage: 'splitting', progress: 0.8, message: 'Testando estratégias…' });

    const candidates: Array<{ detection: DetectionConfig; chapters: ImportedChapter[]; score: number }> = [];

    const spineChs = normalizeChapters(epubDocsToChapters(docs, { mode: 'auto' }), baseTitle);
    candidates.push({ detection: { mode: 'auto' }, chapters: spineChs, score: scoreCandidate(spineChs.length, expectedChapterCount) });

    for (const lvl of [1, 2, 3] as const) {
      const chs = normalizeChapters(epubDocsToChapters(docs, { mode: 'heading', headingLevel: lvl }), baseTitle);
      candidates.push({ detection: { mode: 'heading', headingLevel: lvl }, chapters: chs, score: scoreCandidate(chs.length, expectedChapterCount) });
    }

    for (const cand of CANDIDATE_DETECTIONS) {
      const merged: ImportedChapter[] = [];
      for (const ch of spineChs) {
        const parts = splitByDetector(ch.content, cand);
        if (parts.length <= 1) merged.push(ch);
        else for (const p of parts) merged.push(p);
      }
      const chs = normalizeChapters(merged, baseTitle);
      candidates.push({ detection: cand, chapters: chs, score: scoreCandidate(chs.length, expectedChapterCount) });
    }

    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];
    onProgress?.({ stage: 'done', progress: 1, message: 'Pronto.' });
    return { title: baseTitle, chapters: best.chapters, sourceType: 'epub', detectionUsed: best.detection };
  }

  let rawText = '';
  let sourceType: 'pdf' | 'docx' | 'txt' = 'txt';
  if (ext === 'pdf' || file.type === 'application/pdf') {
    rawText = await extractPdf(file, onProgress);
    sourceType = 'pdf';
  } else if (
    ext === 'docx' ||
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    rawText = await extractDocx(file, onProgress);
    sourceType = 'docx';
  } else {
    onProgress?.({ stage: 'extracting', progress: 0.4, message: 'Lendo texto…' });
    rawText = await file.text();
    sourceType = 'txt';
  }
  rawText = cleanExtractedText(rawText);

  onProgress?.({ stage: 'splitting', progress: 0.85, message: 'Testando estratégias de detecção…' });

  const candidates = CANDIDATE_DETECTIONS.map((det) => {
    const chapters = normalizeChapters(splitByDetector(rawText, det), baseTitle);
    return { detection: det, chapters, score: scoreCandidate(chapters.length, expectedChapterCount) };
  });

  candidates.sort((a, b) => b.score - a.score);
  let best = candidates[0];

  if (best.score <= -900 && expectedChapterCount && expectedChapterCount > 1) {
    const paragraphs = rawText.split(/\n{2,}/).filter((p) => p.trim());
    const perChunk = Math.max(1, Math.ceil(paragraphs.length / expectedChapterCount));
    const chs: ImportedChapter[] = [];
    for (let i = 0; i < paragraphs.length; i += perChunk) {
      chs.push({
        title: `Capítulo ${chs.length + 1}`,
        content: paragraphs.slice(i, i + perChunk).join('\n\n'),
      });
    }
    best = { detection: { mode: 'none' }, chapters: normalizeChapters(chs, baseTitle), score: 0 };
  }

  onProgress?.({ stage: 'done', progress: 1, message: 'Pronto.' });
  return { title: baseTitle, chapters: best.chapters, sourceType, detectionUsed: best.detection };
}
