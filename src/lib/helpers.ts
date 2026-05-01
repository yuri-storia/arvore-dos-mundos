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
export async function callAIText(messages: { role: string; content: string }[], systemPrompt?: string) {
  const { data, error } = await supabase.functions.invoke('ai-text', {
    body: { messages, systemPrompt },
  });
  if (error) throw new Error(error.message || 'Erro ao chamar IA');
  if (data?.error) throw new Error(data.error);
  return data?.content || '';
}

export async function callAIImage(prompt: string) {
  const { data, error } = await supabase.functions.invoke('ai-image', {
    body: { prompt },
  });
  if (error) throw new Error(error.message || 'Erro ao gerar imagem');
  if (data?.error) throw new Error(data.error);
  return data?.imageUrl || '';
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
