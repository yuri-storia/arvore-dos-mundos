import { describe, it, expect } from 'vitest';

/**
 * Espelha a lógica de "palavras hoje" usada em TabEscrever:
 *   wordsToday = max(0, effectiveTotal - snapshot)
 * Onde `snapshot` é a linha-base gravada no início do dia (fuso Brasília).
 */
function wordsToday(effectiveTotal: number, snapshot: number | null): number {
  if (snapshot == null) return 0;
  return Math.max(0, effectiveTotal - snapshot);
}

/** Chave de snapshot por manuscrito+dia. */
function snapKey(manuscriptId: string | null, dateStr: string): string | null {
  return manuscriptId ? `adm:dailySnap:${manuscriptId}:${dateStr}` : null;
}

/** Formata data no fuso America/Sao_Paulo como YYYY-MM-DD (mesmo Intl usado no app). */
const brFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric', month: '2-digit', day: '2-digit',
});
const brDate = (d: Date) => brFmt.format(d);

/** Simula o ciclo de dia: inicializa snapshot se não existir, calcula wordsToday. */
function simulateDay(storage: Map<string, string>, msId: string, date: string, total: number) {
  const key = snapKey(msId, date)!;
  const raw = storage.get(key);
  let snap: number;
  if (raw != null) snap = parseInt(raw, 10) || 0;
  else { snap = total; storage.set(key, String(total)); }
  return { wordsToday: wordsToday(total, snap), snapshot: snap };
}

describe('Contagem diária de palavras (fuso Brasília)', () => {
  it('inicia em 0 no primeiro acesso do dia, independente do total do manuscrito', () => {
    const store = new Map<string, string>();
    const total = 12_345; // manuscrito extenso já existente
    const { wordsToday: today } = simulateDay(store, 'ms1', '2026-07-21', total);
    expect(today).toBe(0);
  });

  it('conta apenas o delta escrito durante o dia', () => {
    const store = new Map<string, string>();
    simulateDay(store, 'ms1', '2026-07-21', 1000); // baseline = 1000
    const after = simulateDay(store, 'ms1', '2026-07-21', 1420);
    expect(after.wordsToday).toBe(420);
  });

  it('não retorna valores negativos se o usuário apagar texto', () => {
    const store = new Map<string, string>();
    simulateDay(store, 'ms1', '2026-07-21', 1000);
    const after = simulateDay(store, 'ms1', '2026-07-21', 800);
    expect(after.wordsToday).toBe(0);
  });

  it('zera "Hoje" ao virar o dia no fuso de Brasília, preservando total e capítulos', () => {
    const store = new Map<string, string>();
    // Dia 1: usuário chegou em 1500 palavras
    simulateDay(store, 'ms1', '2026-07-21', 1000);
    const eod = simulateDay(store, 'ms1', '2026-07-21', 1500);
    expect(eod.wordsToday).toBe(500);

    // Vira o dia — a chave muda, uma nova baseline é criada com o total atual.
    const chapters = [
      { id: 'c1', word_count: 900 },
      { id: 'c2', word_count: 600 },
    ];
    const total = chapters.reduce((s, c) => s + c.word_count, 0);
    const nextDay = simulateDay(store, 'ms1', '2026-07-22', total);

    expect(nextDay.wordsToday).toBe(0);            // Hoje zera
    expect(nextDay.snapshot).toBe(1500);           // baseline = total do manuscrito
    expect(total).toBe(1500);                      // total permanece
    expect(chapters[0].word_count).toBe(900);      // contagem por capítulo permanece
    expect(chapters[1].word_count).toBe(600);
  });

  it('usa chaves distintas por manuscrito e por dia', () => {
    expect(snapKey('msA', '2026-07-21')).toBe('adm:dailySnap:msA:2026-07-21');
    expect(snapKey('msA', '2026-07-22')).not.toBe(snapKey('msA', '2026-07-21'));
    expect(snapKey('msB', '2026-07-21')).not.toBe(snapKey('msA', '2026-07-21'));
    expect(snapKey(null, '2026-07-21')).toBeNull();
  });

  it('formata a data no fuso America/Sao_Paulo (não em UTC)', () => {
    // 22/jul 02:00 UTC == 21/jul 23:00 em São Paulo (UTC-3)
    const d = new Date('2026-07-22T02:00:00Z');
    expect(brDate(d)).toBe('2026-07-21');
    // 22/jul 03:00 UTC == 22/jul 00:00 em São Paulo — vira o dia
    const d2 = new Date('2026-07-22T03:00:00Z');
    expect(brDate(d2)).toBe('2026-07-22');
  });
});
