// Camada estatística leve: reordena sugestões do dicionário usando bigramas
// de alta frequência do português brasileiro. NÃO baixa modelo externo —
// usa uma tabela curada (~3KB) com as colocações mais comuns.
//
// Inspirado em modelos n-gram (como o que o Google Docs usa em sua camada
// rápida), porém em escala drasticamente reduzida: só os pares de maior
// utilidade para desambiguar sugestões ortográficas.
//
// Exemplo: o dicionário sugere ["seção", "sessão", "cessão"] para uma palavra
// digitada errada. Se o contexto à direita for "de cinema", o bigrama
// "sessão|cinema" pontua mais alto e "sessão" é movido para o topo.

// ---------------------------------------------------------------------------
// Bigramas: (palavra1, palavra2) → peso relativo.
// Curados manualmente a partir das colocações mais comuns em PT-BR.
// Lowercase, sem acentos no índice para robustez.
// ---------------------------------------------------------------------------

type BigramTable = Record<string, number>;

function k(a: string, b: string): string {
  return `${normalize(a)}|${normalize(b)}`;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}'\-]/gu, "");
}

const BIGRAMS: BigramTable = Object.assign(
  Object.create(null),
  {
    // Parônimos clássicos (reforço probabilístico das regras determinísticas)
    [k("sessão", "de")]: 5, [k("sessão", "cinema")]: 8, [k("sessão", "fotos")]: 6,
    [k("sessão", "terapia")]: 6, [k("sessão", "abertura")]: 5,
    [k("seção", "de")]: 4, [k("seção", "esportes")]: 7, [k("seção", "eleitoral")]: 7,
    [k("seção", "do")]: 4, [k("seção", "comentários")]: 6,
    [k("cessão", "de")]: 4, [k("cessão", "direitos")]: 7, [k("cessão", "uso")]: 6,

    [k("tráfego", "de")]: 5, [k("tráfego", "intenso")]: 6, [k("tráfego", "aéreo")]: 7,
    [k("tráfego", "rede")]: 6, [k("tráfego", "dados")]: 6,
    [k("tráfico", "de")]: 6, [k("tráfico", "drogas")]: 8, [k("tráfico", "armas")]: 7,
    [k("tráfico", "pessoas")]: 7, [k("tráfico", "influência")]: 6,

    [k("concerto", "musical")]: 8, [k("concerto", "rock")]: 6, [k("concerto", "piano")]: 6,
    [k("concerto", "natal")]: 5,
    [k("conserto", "carro")]: 7, [k("conserto", "geladeira")]: 6, [k("conserto", "celular")]: 6,
    [k("conserto", "moto")]: 6, [k("conserto", "telhado")]: 5,

    [k("cheque", "banco")]: 6, [k("cheque", "fundos")]: 7, [k("cheque", "nominal")]: 5,
    [k("xeque", "mate")]: 9, [k("xeque", "rei")]: 6, [k("xeque", "perigo")]: 5,
    [k("em", "xeque")]: 7,

    [k("censo", "demográfico")]: 8, [k("censo", "ibge")]: 8, [k("censo", "populacional")]: 7,
    [k("senso", "comum")]: 9, [k("senso", "crítico")]: 8, [k("senso", "humor")]: 7,
    [k("senso", "justiça")]: 6,

    [k("mandato", "presidente")]: 7, [k("mandato", "vereador")]: 6, [k("mandato", "deputado")]: 6,
    [k("mandado", "busca")]: 8, [k("mandado", "prisão")]: 8, [k("mandado", "segurança")]: 6,
    [k("mandado", "judicial")]: 7,

    [k("iminente", "perigo")]: 7, [k("iminente", "risco")]: 7, [k("iminente", "ameaça")]: 6,
    [k("iminente", "colapso")]: 6,
    [k("eminente", "jurista")]: 7, [k("eminente", "figura")]: 6, [k("eminente", "professor")]: 6,
    [k("eminente", "personalidade")]: 6,

    [k("retificar", "erro")]: 7, [k("retificar", "informação")]: 6, [k("retificar", "dados")]: 6,
    [k("ratificar", "acordo")]: 7, [k("ratificar", "tratado")]: 8, [k("ratificar", "decisão")]: 6,

    [k("infligir", "castigo")]: 7, [k("infligir", "pena")]: 7, [k("infligir", "derrota")]: 7,
    [k("infringir", "lei")]: 8, [k("infringir", "regra")]: 7, [k("infringir", "norma")]: 7,
    [k("infringir", "contrato")]: 6,

    [k("emergir", "água")]: 6, [k("emergir", "mar")]: 6,
    [k("imergir", "água")]: 6, [k("imergir", "leitura")]: 5, [k("imergir", "sonho")]: 5,

    [k("cumprimento", "cordial")]: 7, [k("cumprimento", "caloroso")]: 6,
    [k("comprimento", "onda")]: 8, [k("comprimento", "barra")]: 6, [k("comprimento", "cabo")]: 6,

    [k("descriminar", "drogas")]: 6, [k("descriminar", "aborto")]: 6,
    [k("discriminar", "pessoas")]: 7, [k("discriminar", "minorias")]: 7,

    // Colocações de alta frequência (gerais)
    [k("muito", "obrigado")]: 8, [k("muito", "bom")]: 7, [k("muito", "bem")]: 7,
    [k("bom", "dia")]: 9, [k("boa", "tarde")]: 9, [k("boa", "noite")]: 9,
    [k("boa", "viagem")]: 8, [k("feliz", "aniversário")]: 8, [k("feliz", "natal")]: 7,
    [k("ano", "novo")]: 7, [k("muitas", "vezes")]: 6,
    [k("a", "respeito")]: 6, [k("a", "fim")]: 6, [k("por", "exemplo")]: 8,
    [k("de", "acordo")]: 7, [k("em", "vez")]: 6, [k("em", "geral")]: 6,
    [k("na", "verdade")]: 7, [k("no", "entanto")]: 7, [k("sem", "dúvida")]: 6,
    [k("mais", "uma")]: 5, [k("cada", "vez")]: 6, [k("ao", "menos")]: 6,
    [k("pelo", "menos")]: 6, [k("até", "logo")]: 5,

    // Forma vs verbo (viagem vs viajem)
    [k("boa", "viajem")]: 0, [k("minha", "viajem")]: 0,
    [k("eles", "viajem")]: 4, [k("que", "viajem")]: 4,

    // mau/mal
    [k("mau", "humor")]: 8, [k("mau", "caráter")]: 7, [k("mau", "exemplo")]: 6,
    [k("mau", "aluno")]: 6, [k("mau", "cheiro")]: 6,
    [k("passar", "mal")]: 8, [k("sentir", "mal")]: 6, [k("dormir", "mal")]: 6,
    [k("falar", "mal")]: 6,

    // Concordância forte
    [k("o", "problema")]: 8, [k("o", "sistema")]: 8, [k("o", "tema")]: 7,
    [k("a", "pessoa")]: 8, [k("a", "crise")]: 7, [k("a", "viagem")]: 7,
    [k("a", "origem")]: 6, [k("a", "imagem")]: 6,
  } as BigramTable,
);

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

/**
 * Retorna o score do par (palavra, vizinho). 0 se não conhecido.
 * Verifica ambas as direções (palavra antes do vizinho e depois).
 */
function bigramScore(word: string, before: string | null, after: string | null): number {
  let s = 0;
  if (before) s += BIGRAMS[k(before, word)] ?? 0;
  if (after) s += BIGRAMS[k(word, after)] ?? 0;
  return s;
}

function lastTokenOf(text: string): string | null {
  const m = text.match(/[\p{L}\p{M}'\-]+\s*$/u);
  if (!m) return null;
  return m[0].trim().toLowerCase();
}

function firstTokenOf(text: string): string | null {
  const m = text.match(/^\s*[\p{L}\p{M}'\-]+/u);
  if (!m) return null;
  return m[0].trim().toLowerCase();
}

/**
 * Reordena uma lista de sugestões priorizando aquelas com melhor pontuação
 * de bigrama em relação ao contexto imediato. Estável: candidatos sem
 * pontuação mantêm a ordem original.
 */
export function rerankSuggestions(
  suggestions: string[],
  before: string,
  after: string,
): string[] {
  if (suggestions.length < 2) return suggestions;
  const beforeTok = lastTokenOf(before);
  const afterTok = firstTokenOf(after);
  if (!beforeTok && !afterTok) return suggestions;

  // Pontua cada sugestão. Sort estável via Schwartz.
  const scored = suggestions.map((sug, idx) => ({
    sug,
    idx,
    score: bigramScore(sug.toLowerCase(), beforeTok, afterTok),
  }));
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.idx - b.idx; // mantém ordem original em empate
  });
  return scored.map((s) => s.sug);
}

/**
 * Útil para depuração: expõe se há ao menos um bigrama conhecido
 * envolvendo a palavra-alvo no contexto.
 */
export function hasBigramSignal(word: string, before: string, after: string): boolean {
  const b = lastTokenOf(before);
  const a = firstTokenOf(after);
  return bigramScore(word.toLowerCase(), b, a) > 0;
}
