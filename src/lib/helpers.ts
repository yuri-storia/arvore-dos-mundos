import { AppState, FRUITS } from './data';
import { supabase } from '@/integrations/supabase/client';
import jsPDF from 'jspdf';

// Fruit progress helpers
export function getFruitProgress(db: AppState['db'], fruitId: number) {
  const fruit = FRUITS[fruitId];
  if (!fruit) return { filled: 0, total: 0 };
  const data = db[fruitId] || {};
  const filled = fruit.fields.filter(f => (data[f.id] || '').trim().length > 0).length;
  return { filled, total: fruit.fields.length };
}

export function getTotalProgress(db: AppState['db']) {
  let filled = 0, total = 0;
  FRUITS.forEach(f => {
    const p = getFruitProgress(db, f.id);
    filled += p.filled;
    total += p.total;
  });
  return { filled, total, pct: total ? Math.round((filled / total) * 100) : 0 };
}

export function getFruitsStarted(db: AppState['db']) {
  return FRUITS.filter(f => getFruitProgress(db, f.id).filled > 0).length;
}

export function getFruitsComplete(db: AppState['db']) {
  return FRUITS.filter(f => {
    const p = getFruitProgress(db, f.id);
    return p.filled === p.total;
  }).length;
}

// AI helpers via edge functions

/**
 * Traduz erros vindos das edge functions de IA em mensagens claras em pt-BR.
 * Identifica especialmente:
 *  - prompts inválidos / longos demais → orientar a reduzir o texto
 *  - falhas de saldo/AI gateway (402 / credit / balance) → Idriel indisponível
 *  - rate-limit (429)
 */
export function friendlyAIError(rawMessage: string): { title: string; hint: string; kind: 'prompt' | 'balance' | 'rate' | 'generic' } {
  const msg = (rawMessage || '').toLowerCase();

  if (
    msg.includes('prompt must be') ||
    msg.includes('1-2000') ||
    msg.includes('too long') ||
    msg.includes('context length') ||
    msg.includes('maximum context') ||
    msg.includes('token limit') ||
    msg.includes('invalid prompt')
  ) {
    return {
      kind: 'prompt',
      title: 'Sua visão ficou longa demais para Idriel canalizar.',
      hint: 'Reduza a descrição, remova detalhes opcionais ou diminua o número de referências do Códex usadas. Textos mais curtos e diretos costumam gerar resultados melhores.',
    };
  }

  if (
    msg.includes('credit') ||
    msg.includes('balance') ||
    msg.includes('402') ||
    msg.includes('payment required') ||
    msg.includes('ai gateway') ||
    msg.includes('insufficient') ||
    msg.includes('esgotados. entre em contato') ||
    msg.includes('non-2xx') ||
    msg.includes('edge function returned') ||
    msg.includes('functionshttperror') ||
    msg.includes('failed to fetch') ||
    msg.includes('network error') ||
    msg.includes('failedtofetch')
  ) {
    return {
      kind: 'balance',
      title: 'Idriel está indisponível no momento.',
      hint: 'A conexão com o Elixir dos Mundos caiu temporariamente. Aguarde até que a conexão seja reestabelecida — sua quota pessoal de gotas não foi consumida.',
    };
  }

  if (msg.includes('429') || msg.includes('rate') || msg.includes('muitas requisições')) {
    return {
      kind: 'rate',
      title: 'Idriel recebeu pedidos demais ao mesmo tempo.',
      hint: 'Aguarde alguns segundos e tente novamente. Se persistir, espere um minuto antes de uma nova tentativa.',
    };
  }

  return {
    kind: 'generic',
    title: 'Não foi possível completar a visão agora.',
    hint: rawMessage || 'Tente novamente em instantes. Se o erro continuar, use "Reportar problema" para nos avisar.',
  };
}

/**
 * Quando a edge function retorna 4xx/5xx, o cliente Supabase lança um
 * FunctionsHttpError genérico ("Edge Function returned a non-2xx status code")
 * e NÃO lê o corpo. Aqui tentamos extrair o JSON real para entregar a
 * mensagem em pt-BR que a edge function preparou.
 */
async function throwInvokeError(error: unknown, fallback: string): Promise<never> {
  const anyErr = error as { context?: unknown; message?: string } | null;
  const ctx: any = anyErr?.context;
  const resp: Response | undefined =
    ctx && typeof ctx === 'object' && 'json' in ctx ? (ctx as Response) :
    ctx?.response && typeof ctx.response === 'object' && 'json' in ctx.response ? ctx.response as Response :
    undefined;
  if (resp) {
    try {
      const body = await resp.clone().json();
      if (body?.error) throw new Error(String(body.error));
    } catch (parsed) {
      if (parsed instanceof Error && parsed.message && !/json/i.test(parsed.message)) throw parsed;
    }
    try {
      const text = await resp.clone().text();
      if (text) throw new Error(text);
    } catch (parsed) {
      if (parsed instanceof Error && parsed.message) throw parsed;
    }
  }
  throw new Error(anyErr?.message || fallback);
}

export async function callAIText(messages: { role: string; content: string }[], systemPrompt?: string) {
  const { data, error } = await supabase.functions.invoke('ai-text', {
    body: { messages, systemPrompt },
  });
  if (error) await throwInvokeError(error, 'Erro ao chamar IA');
  if (data?.error) throw new Error(data.error);
  return data?.content || '';
}

/**
 * Streaming via SSE para reduzir latência percebida. Chama `ai-text` com
 * `stream:true` e dispara `onChunk(textoAcumulado)` a cada delta.
 * Usa fetch direto pois `supabase.functions.invoke` não suporta streams.
 */
export async function callAITextStream(
  messages: { role: string; content: string }[],
  systemPrompt: string | undefined,
  onChunk: (accumulated: string, delta: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const { data: sess } = await supabase.auth.getSession();
  const token = sess?.session?.access_token;
  if (!token) throw new Error('Sessão expirada. Faça login novamente.');

  const url = `${(import.meta as any).env.VITE_SUPABASE_URL}/functions/v1/ai-text`;
  const apikey = (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(apikey ? { apikey } : {}),
    },
    body: JSON.stringify({ messages, systemPrompt, stream: true }),
    signal,
  });

  if (!res.ok) {
    let msg = `AI error: ${res.status}`;
    try {
      const errBody = await res.json();
      if (errBody?.error) msg = String(errBody.error);
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  if (!res.body) throw new Error('Stream vazio da IA.');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let acc = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    // SSE: events separados por \n\n, cada linha começa com "data: "
    let sep;
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const event = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      for (const line of event.split('\n')) {
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        try {
          const json = JSON.parse(payload);
          const delta = json?.choices?.[0]?.delta?.content
            || json?.choices?.[0]?.message?.content
            || '';
          if (delta) { acc += delta; onChunk(acc, delta); }
        } catch { /* keep going */ }
      }
    }
  }
  return acc;
}


export type ImageQuality = 'draft' | 'standard' | 'premium';
export async function callAIImage(prompt: string, quality: ImageQuality = 'standard') {
  const { data, error } = await supabase.functions.invoke('ai-image', {
    body: { prompt, quality },
  });
  if (error) await throwInvokeError(error, 'Erro ao gerar imagem');
  if (data?.error) throw new Error(data.error);
  return data?.imageUrl || '';
}

// Generate an image using Codex references (text + up to 5 image URLs) for consistency.
// Accepts both plain canon URLs (legacy) and structured per-reference intents (Midjourney-style).
export type ImageRefIntent = 'estilo' | 'composicao' | 'ambientacao' | 'personagem' | 'paleta';
export interface StructuredImageRef { url: string; intent: ImageRefIntent }
export async function callAIImageConsistent(
  prompt: string,
  referenceImageUrls: string[] = [],
  referenceText = '',
  references: StructuredImageRef[] = []
): Promise<string> {
  const { data, error } = await supabase.functions.invoke('ai-image-consistent', {
    body: {
      prompt,
      referenceImageUrls: referenceImageUrls.slice(0, 5),
      referenceText: referenceText.slice(0, 4000),
      references: references.slice(0, 5),
    },
  });
  if (error) await throwInvokeError(error, 'Erro ao gerar imagem consistente');
  if (data?.error) throw new Error(data.error);
  return data?.imageUrl || '';
}

// Send extracted document text to Idriel and receive Codex entry suggestions.
export interface ImportedSuggestion {
  type: 'ficha' | 'artigo';
  title: string;
  fruit_id: number;
  summary: string;
}
export type ImportProgressPhase =
  | 'reading'      // lendo arquivo no navegador
  | 'encoding'     // codificando base64
  | 'uploading'    // enviando para Idriel
  | 'ocr'          // Idriel lendo/transcrevendo (OCR no servidor)
  | 'extracting'   // estruturando fichas/artigos
  | 'done';

export interface ImportProgress {
  phase: ImportProgressPhase;
  pct: number;          // 0..100
  label: string;        // texto pt-BR pronto para UI
}

export type ImportProgressCallback = (p: ImportProgress) => void;

const phaseLabels: Record<ImportProgressPhase, string> = {
  reading: 'Lendo o arquivo...',
  encoding: 'Preparando o documento...',
  uploading: 'Enviando para Idriel...',
  ocr: 'Idriel está lendo o documento (OCR e leitura)...',
  extracting: 'Estruturando fichas, personagens e artigos...',
  done: 'Concluído.',
};

const emit = (cb: ImportProgressCallback | undefined, phase: ImportProgressPhase, pct: number) => {
  cb?.({ phase, pct: Math.max(0, Math.min(100, Math.round(pct))), label: phaseLabels[phase] });
};

export async function importTextWithIdriel(
  text: string,
  sourceType: 'pdf' | 'docx' | 'txt' | 'texto' = 'texto',
  onProgress?: ImportProgressCallback,
  excludeTitles?: string[],
): Promise<ImportedSuggestion[]> {
  emit(onProgress, 'uploading', 20);
  let synthetic = 20;
  const interval = setInterval(() => {
    synthetic = Math.min(synthetic + 2, 88);
    const phase: ImportProgressPhase = synthetic < 55 ? 'uploading' : synthetic < 78 ? 'ocr' : 'extracting';
    emit(onProgress, phase, synthetic);
  }, 700);
  try {
    const { data, error } = await supabase.functions.invoke('idriel-import-text', {
      body: { text, sourceType, excludeTitles },
    });
    if (error) await throwInvokeError(error, 'Erro ao analisar texto');
    if (data?.error) throw new Error(data.error);
    emit(onProgress, 'done', 100);
    return (data?.entries || []) as ImportedSuggestion[];
  } finally {
    clearInterval(interval);
  }
}

/** Codifica um ArrayBuffer/Uint8Array em base64 emitindo progresso. */
export async function encodeFileBase64(
  source: File | Blob | ArrayBuffer,
  onProgress?: ImportProgressCallback,
): Promise<string> {
  emit(onProgress, 'reading', 5);
  const buf = source instanceof ArrayBuffer ? source : await (source as Blob).arrayBuffer();
  emit(onProgress, 'encoding', 15);
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 0x8000;
  const total = bytes.length;
  for (let i = 0; i < total; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
    if (i % (chunk * 16) === 0) {
      emit(onProgress, 'encoding', 15 + (i / total) * 20);
    }
  }
  return btoa(binary);
}

/**
 * Envia o arquivo binário (PDF) para Idriel ler nativamente via Gemini multimodal.
 * Não extrai texto no cliente — o modelo "lê" o PDF inteiro (inclui OCR de páginas escaneadas).
 */
export async function importFileWithIdriel(
  file: File,
  onProgress?: ImportProgressCallback,
  excludeTitles?: string[],
): Promise<ImportedSuggestion[]> {
  const fileData = await encodeFileBase64(file, onProgress);
  emit(onProgress, 'uploading', 40);

  // Server-side phases não têm progresso real — sintetizamos avanço suave.
  let synthetic = 40;
  const interval = setInterval(() => {
    synthetic = Math.min(synthetic + 1.5, 90);
    const phase: ImportProgressPhase = synthetic < 60 ? 'uploading' : synthetic < 80 ? 'ocr' : 'extracting';
    emit(onProgress, phase, synthetic);
  }, 800);

  try {
    const { data, error } = await supabase.functions.invoke('idriel-import-text', {
      body: {
        sourceType: 'pdf',
        fileName: file.name,
        mimeType: file.type || 'application/pdf',
        fileData,
        excludeTitles,
      },
    });
    if (error) await throwInvokeError(error, 'Erro ao analisar arquivo');
    if (data?.error) throw new Error(data.error);
    emit(onProgress, 'done', 100);
    return (data?.entries || []) as ImportedSuggestion[];
  } finally {
    clearInterval(interval);
  }
}

/**
 * Reanalisa um PDF previamente salvo no bucket privado `idriel-imports`,
 * baixando do storage e enviando à edge function. Aceita lista de títulos a excluir.
 */
export async function importStoredPdfWithIdriel(
  storagePath: string,
  fileName: string,
  onProgress?: ImportProgressCallback,
  excludeTitles?: string[],
): Promise<ImportedSuggestion[]> {
  emit(onProgress, 'reading', 3);
  const { data: blob, error } = await supabase.storage.from('idriel-imports').download(storagePath);
  if (error || !blob) throw new Error('Não foi possível recuperar o documento (talvez tenha expirado).');
  const fileData = await encodeFileBase64(blob, onProgress);
  emit(onProgress, 'uploading', 40);
  let synthetic = 40;
  const interval = setInterval(() => {
    synthetic = Math.min(synthetic + 1.5, 90);
    const phase: ImportProgressPhase = synthetic < 60 ? 'uploading' : synthetic < 80 ? 'ocr' : 'extracting';
    emit(onProgress, phase, synthetic);
  }, 800);
  try {
    const { data, error: invokeErr } = await supabase.functions.invoke('idriel-import-text', {
      body: {
        sourceType: 'pdf',
        fileName,
        mimeType: 'application/pdf',
        fileData,
        excludeTitles,
      },
    });
    if (invokeErr) await throwInvokeError(invokeErr, 'Erro ao reanalisar arquivo');
    if (data?.error) throw new Error(data.error);
    emit(onProgress, 'done', 100);
    return (data?.entries || []) as ImportedSuggestion[];
  } finally {
    clearInterval(interval);
  }
}


// Summarize an Idriel response into clean prose suitable for a Codex entry
export async function summarizeIdrielResponse(response: string, kind: 'ficha' | 'artigo'): Promise<string> {
  const sysPrompt = `Você é um editor enxuto. Resuma o conselho de worldbuilding a seguir em ${kind === 'ficha' ? '2-4 parágrafos curtos e diretos, focados nos fatos e ideias concretas (não inclua perguntas retóricas, vocativos como "querido criador" ou linguagem mística)' : '3-5 parágrafos objetivos e bem estruturados (sem trejeitos místicos, vocativos ou repetições). Use um título ## para cada seção temática quando houver mais de uma ideia clara'}. Responda em português brasileiro. NÃO use prefácios — entregue apenas o resumo limpo.`;
  return await callAIText([{ role: 'user', content: response }], sysPrompt);
}

// Export PDF
export function exportWorldMarkdown(worldName: string, method: string, db: AppState['db']) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxW = pageW - margin * 2;
  let y = margin;

  const addPageBg = () => {
    doc.setFillColor(4, 12, 17);
    doc.rect(0, 0, pageW, pageH, 'F');
  };

  const checkPage = (needed: number) => {
    if (y + needed > pageH - margin) {
      doc.addPage();
      addPageBg();
      y = margin;
    }
  };

  addPageBg();

  doc.setTextColor(220, 230, 245);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(worldName || 'Mundo Sem Nome', pageW / 2, y, { align: 'center' });
  y += 10;

  doc.setFontSize(10);
  doc.setTextColor(140, 160, 190);
  doc.setFont('helvetica', 'italic');
  doc.text(`Metodologia: ${method === 'top-down' ? 'Cima para Baixo' : 'Baixo para Cima'}`, pageW / 2, y, { align: 'center' });
  y += 4;

  doc.setDrawColor(33, 150, 243);
  doc.setLineWidth(0.5);
  doc.line(pageW / 2 - 20, y, pageW / 2 + 20, y);
  y += 10;

  FRUITS.forEach(fruit => {
    const data = db[fruit.id] || {};
    const filledFields = fruit.fields.filter(f => (data[f.id] || '').trim());
    if (filledFields.length === 0) return;

    checkPage(20);

    doc.setFontSize(14);
    doc.setTextColor(100, 181, 246);
    doc.setFont('helvetica', 'bold');
    doc.text(`${fruit.num}: ${fruit.name}`, margin, y);
    y += 2;

    doc.setDrawColor(33, 150, 243);
    doc.setLineWidth(0.3);
    doc.line(margin, y, margin + 50, y);
    y += 6;

    filledFields.forEach(field => {
      const val = data[field.id] || '';
      checkPage(15);

      doc.setFontSize(9);
      doc.setTextColor(200, 146, 42);
      doc.setFont('helvetica', 'bold');
      doc.text(field.label.toUpperCase(), margin, y);
      y += 4;

      doc.setFontSize(10);
      doc.setTextColor(200, 210, 225);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(val, maxW);
      lines.forEach((line: string) => {
        checkPage(6);
        doc.text(line, margin, y);
        y += 5;
      });
      y += 3;
    });

    y += 4;
  });

  doc.setFontSize(7);
  doc.setTextColor(100, 120, 150);
  doc.text('A Árvore dos Mundos · Universo STORIA', pageW / 2, pageH - 10, { align: 'center' });

  doc.save(`${(worldName || 'mundo').toLowerCase().replace(/\s+/g, '-')}-worldbuilding.pdf`);
}
