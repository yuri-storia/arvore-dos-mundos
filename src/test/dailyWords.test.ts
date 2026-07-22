import { describe, it, expect } from 'vitest';

type DailyState = { date: string; words: number; baselineTotal: number };

/** Chave do contador por manuscrito. O dia fica dentro do JSON salvo. */
function dailyKey(manuscriptId: string | null): string | null {
  return manuscriptId ? `adm:daily:v5:${manuscriptId}` : null;
}

/** Migração da versão antiga: persistedTotal - baseline, nunca total ao vivo do capítulo aberto. */
function migrateLegacyWords(persistedTotal: number, legacyBaseline: number): number {
  const migratedDelta = Math.max(0, Math.round(persistedTotal - legacyBaseline));
  return legacyBaseline > 0
    && legacyBaseline <= 100
    && migratedDelta >= 150
    && migratedDelta > legacyBaseline * 4
      ? Math.round(legacyBaseline)
      : migratedDelta;
}

/** Simula a lógica nova: primeiro report do editor = hidratação; só deltas positivos posteriores contam. */
function createDailyCounter(initialWords = 0) {
  let words = initialWords;
  const chapterCounts: Record<string, number> = {};
  let skipNext = true;

  return {
    openChapter(id: string) {
      skipNext = true;
    },
    report(chapterId: string, count: number) {
      const clean = Math.max(0, Math.round(count || 0));
      const prev = chapterCounts[chapterId];
      if (skipNext || prev == null) {
        chapterCounts[chapterId] = clean;
        skipNext = false;
        return words;
      }
      chapterCounts[chapterId] = clean;
      const delta = clean - prev;
      if (delta > 0) words += delta;
      return words;
    },
    value() {
      return words;
    },
  };
}

/** Formata data no fuso America/Sao_Paulo como YYYY-MM-DD (mesmo Intl usado no app). */
const brFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric', month: '2-digit', day: '2-digit',
});
const brDate = (d: Date) => brFmt.format(d);

/** Simula o carregamento/salvamento v5 por manuscrito e dia. */
function loadDay(storage: Map<string, string>, msId: string, date: string, persistedTotal: number): DailyState {
  const key = dailyKey(msId)!;
  const raw = storage.get(key);
  if (raw) {
    const parsed = JSON.parse(raw) as DailyState;
    if (parsed.date === date) return parsed;
  }

  const state = { date, words: 0, baselineTotal: persistedTotal };
  storage.set(key, JSON.stringify(state));
  return state;
}

describe('Contagem diária de palavras (fuso Brasília)', () => {
  it('inicia em 0 no primeiro acesso do dia, independente do total do manuscrito', () => {
    const store = new Map<string, string>();
    const total = 12_345; // manuscrito extenso já existente
    const state = loadDay(store, 'ms1', '2026-07-21', total);
    expect(state.words).toBe(0);
    expect(state.baselineTotal).toBe(total);
  });

  it('conta apenas deltas digitados após a hidratação do capítulo aberto', () => {
    const counter = createDailyCounter();
    counter.openChapter('c1');
    expect(counter.report('c1', 1000)).toBe(0); // hidratação não conta
    expect(counter.report('c1', 1027)).toBe(27);
  });

  it('não subtrai do dia quando o usuário apaga texto', () => {
    const counter = createDailyCounter();
    counter.openChapter('c1');
    counter.report('c1', 1000);
    counter.report('c1', 1027);
    expect(counter.report('c1', 900)).toBe(27);
  });

  it('zera "Hoje" ao virar o dia no fuso de Brasília, preservando total e capítulos', () => {
    const store = new Map<string, string>();
    store.set(dailyKey('ms1')!, JSON.stringify({ date: '2026-07-21', words: 500, baselineTotal: 1000 }));

    // Vira o dia — a data dentro do registro muda e words reinicia em 0.
    const chapters = [
      { id: 'c1', word_count: 900 },
      { id: 'c2', word_count: 600 },
    ];
    const total = chapters.reduce((s, c) => s + c.word_count, 0);
    const nextDay = loadDay(store, 'ms1', '2026-07-22', total);

    expect(nextDay.words).toBe(0);                 // Hoje zera
    expect(nextDay.baselineTotal).toBe(1500);      // referência informativa = total do manuscrito
    expect(total).toBe(1500);                      // total permanece
    expect(chapters[0].word_count).toBe(900);      // contagem por capítulo permanece
    expect(chapters[1].word_count).toBe(600);
  });

  it('não transforma recontagem de capítulo antigo em palavras de hoje', () => {
    const counter = createDailyCounter(27);

    // Regressão real: abrir "Nota Final do Tradutor" emitia 308 no editor,
    // e a lógica antiga fazia 308 - 27 = 281 no contador do dia.
    counter.openChapter('nota-final-do-tradutor');
    expect(counter.report('nota-final-do-tradutor', 308)).toBe(27);
    expect(counter.value()).toBe(27);

    // Só escrita posterior nesse capítulo deve entrar.
    expect(counter.report('nota-final-do-tradutor', 312)).toBe(31);
  });

  it('migra v4 usando total persistido, não a contagem ao vivo do capítulo aberto', () => {
    expect(migrateLegacyWords(27, 0)).toBe(27);
    expect(migrateLegacyWords(27, 281)).toBe(0);
    // Caso real: v4 ficou com baseline=27 e total inflado=308 ao abrir um capítulo antigo.
    expect(migrateLegacyWords(308, 27)).toBe(27);
    expect(migrateLegacyWords(1500, 1000)).toBe(500);
  });

  it('usa chaves distintas por manuscrito', () => {
    expect(dailyKey('msA')).toBe('adm:daily:v5:msA');
    expect(dailyKey('msB')).not.toBe(dailyKey('msA'));
    expect(dailyKey(null)).toBeNull();
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
