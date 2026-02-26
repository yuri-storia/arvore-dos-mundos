import { AppState, FRUITS } from './data';

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

// Export markdown
export function exportWorldMarkdown(worldName: string, method: string, db: AppState['db']) {
  let md = `# ${worldName || 'Mundo Sem Nome'} — Worldbuilding Completo\n`;
  md += `Metodologia: ${method === 'top-down' ? 'Cima para Baixo' : 'Baixo para Cima'}\n\n`;

  FRUITS.forEach(fruit => {
    md += `## ${fruit.num}: ${fruit.name}\n`;
    const data = db[fruit.id] || {};
    fruit.fields.forEach(field => {
      const val = data[field.id] || '';
      if (val.trim()) {
        md += `**${field.label}:** ${val}\n\n`;
      }
    });
    md += '\n';
  });

  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(worldName || 'mundo').toLowerCase().replace(/\s+/g, '-')}-worldbuilding.md`;
  a.click();
  URL.revokeObjectURL(url);
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
