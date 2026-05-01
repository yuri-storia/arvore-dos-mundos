// Lightweight client-side text extraction for PDF, DOCX, TXT, MD.
// PDF: uses pdfjs-dist with a CDN worker (avoids Vite worker bundling pain).
// DOCX: uses mammoth (raw text only).

import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth/mammoth.browser';

// Use CDN worker to keep bundle small and avoid Vite worker config.
// pdfjs-dist v5 uses .mjs worker; pinned to installed version.
(pdfjsLib as unknown as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc =
  `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export type ImportSourceType = 'pdf' | 'docx' | 'txt' | 'texto';

export async function extractTextFromFile(file: File): Promise<{ text: string; sourceType: ImportSourceType }> {
  const name = file.name.toLowerCase();
  const ext = name.split('.').pop() || '';

  if (ext === 'pdf' || file.type === 'application/pdf') {
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    let text = '';
    const maxPages = Math.min(pdf.numPages, 80);
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((it: unknown) => {
        const item = it as { str?: string };
        return item.str || '';
      }).join(' ');
      text += pageText + '\n\n';
      if (text.length > 200000) break;
    }
    return { text: text.slice(0, 200000), sourceType: 'pdf' };
  }

  if (ext === 'docx' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const buf = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buf });
    return { text: (result.value || '').slice(0, 200000), sourceType: 'docx' };
  }

  // Plain text / markdown / fallback
  const text = await file.text();
  return { text: text.slice(0, 200000), sourceType: 'txt' };
}
