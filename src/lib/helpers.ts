import { AppState, FRUITS } from './data';
import jsPDF from 'jspdf';

// ... keep existing code (daily limits + fruit progress helpers lines 4-57)

// Daily limits
const getLimitKey = () => {
  const d = new Date();
  return `adm_${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

export function getDailyUsage(): { text: number; img: number } {
  try {
    const raw = localStorage.getItem(getLimitKey());
    if (raw) return JSON.parse(raw);
  } catch {}
  return { text: 0, img: 0 };
}

export function incrementUsage(type: 'text' | 'img') {
  const usage = getDailyUsage();
  usage[type]++;
  localStorage.setItem(getLimitKey(), JSON.stringify(usage));
  return usage;
}

export function canUseAI(type: 'text' | 'img'): boolean {
  const u = getDailyUsage();
  return type === 'text' ? u.text < 15 : u.img < 3;
}

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

  // Background
  addPageBg();

  // Title
  doc.setTextColor(220, 230, 245);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(worldName || 'Mundo Sem Nome', pageW / 2, y, { align: 'center' });
  y += 10;

  // Subtitle
  doc.setFontSize(10);
  doc.setTextColor(140, 160, 190);
  doc.setFont('helvetica', 'italic');
  doc.text(`Metodologia: ${method === 'top-down' ? 'Cima para Baixo' : 'Baixo para Cima'}`, pageW / 2, y, { align: 'center' });
  y += 4;

  // Decorative line
  doc.setDrawColor(33, 150, 243);
  doc.setLineWidth(0.5);
  doc.line(pageW / 2 - 20, y, pageW / 2 + 20, y);
  y += 10;

  // Fruits
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

    // Underline
    doc.setDrawColor(33, 150, 243);
    doc.setLineWidth(0.3);
    doc.line(margin, y, margin + 50, y);
    y += 6;

    filledFields.forEach(field => {
      const val = data[field.id] || '';
      checkPage(15);

      // Field label
      doc.setFontSize(9);
      doc.setTextColor(200, 146, 42);
      doc.setFont('helvetica', 'bold');
      doc.text(field.label.toUpperCase(), margin, y);
      y += 4;

      // Field value - wrap text
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

  // Footer on last page
  doc.setFontSize(7);
  doc.setTextColor(100, 120, 150);
  doc.text('A Árvore dos Mundos · Universo STORIA', pageW / 2, pageH - 10, { align: 'center' });

  doc.save(`${(worldName || 'mundo').toLowerCase().replace(/\s+/g, '-')}-worldbuilding.pdf`);
}

// OpenAI helpers
export async function callGPT(apiKey: string, messages: { role: string; content: string }[]) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: 'gpt-4o-mini', messages, max_tokens: 900 }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

export async function callDALLE(apiKey: string, prompt: string) {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: 'dall-e-3', prompt, size: '1024x1024', quality: 'standard', n: 1 }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return data.data?.[0]?.url || '';
}
