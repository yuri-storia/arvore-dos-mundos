// Camada de inteligência contextual (PT-BR) baseada em regras determinísticas.
//
// Marca em vermelho palavras que estão grafadas corretamente, mas que
// provavelmente foram usadas no contexto errado (parônimos clássicos:
// "sessão" vs "seção", "mau" vs "mal", "tráfego" vs "tráfico" etc.).
//
// O motor é puramente local: zero IA, zero rede. Cada regra é uma RegExp
// com a flag `d` e um grupo nomeado `w` que delimita a palavra a marcar.

export interface ContextIssue {
  /** Offset (UTF-16) dentro do texto recebido onde a palavra problemática começa. */
  from: number;
  /** Offset onde termina (exclusive). */
  to: number;
  /** A palavra exata como aparece no texto. */
  word: string;
  /** Sugestão de substituição já com o casing apropriado. */
  suggestion: string;
  /** Explicação curta, exibida no popover. */
  reason: string;
  /** Identificador da regra, útil para telemetria/depuração. */
  ruleId: string;
}

interface Rule {
  id: string;
  /** Deve usar as flags `giud` e conter um grupo nomeado `(?<w>...)`. */
  pattern: RegExp;
  /** Sugestão fixa ou função baseada na forma encontrada. */
  suggest: string | ((matched: string) => string);
  reason: string;
}

// Helpers ---------------------------------------------------------------------

function matchCase(original: string, suggestion: string): string {
  if (!original) return suggestion;
  // Tudo maiúsculo → mantém tudo maiúsculo.
  if (/^[\p{Lu}\p{M}]+$/u.test(original)) return suggestion.toUpperCase();
  // Primeira letra maiúscula → capitaliza sugestão.
  if (/^\p{Lu}/u.test(original)) {
    return suggestion.charAt(0).toUpperCase() + suggestion.slice(1);
  }
  return suggestion;
}

// Regras ----------------------------------------------------------------------
//
// Convenções:
//   - Use `\b` para fronteiras de palavra.
//   - Capture SEMPRE a palavra a marcar em `(?<w>...)`.
//   - Mantenha as regras de alta precisão (preferir falso-negativo a
//     falso-positivo). Em caso de dúvida, não inclua.

const RULES: Rule[] = [
  // 1. sessão → seção  (divisão/parte de algo escrito ou de uma loja)
  {
    id: "sessao->secao",
    pattern:
      /\b(?<w>sess[ãa]o|sess[õo]es)\b\s+(?:de|do|da|dos|das)\s+(?:livro|c[óo]digo|lei|jornal|revista|site|loja|artigo|cap[íi]tulo|documento|texto|p[áa]gina|not[íi]cias|esportes|economia|brinquedos|eletr[ôo]nicos|comentários)/giu,
    suggest: (m) => (/s$/i.test(m) ? "seções" : "seção"),
    reason:
      '"Sessão" = período/reunião (ex.: sessão de cinema). Para divisão/parte use "seção".',
  },

  // 2. seção → sessão  (período de tempo / encontro)
  {
    id: "secao->sessao",
    pattern:
      /\b(?<w>se[çc][ãa]o|se[çc][õo]es)\b\s+(?:de|do|da|dos|das)\s+(?:cinema|fotos?|terapia|treino|abertura|encerramento|julgamento|cinema|espiritismo|tortura|aut[óo]grafos?|perguntas)/giu,
    suggest: (m) => (/s$/i.test(m) ? "sessões" : "sessão"),
    reason:
      '"Seção" = parte/divisão. Para período/encontro use "sessão" (ex.: sessão de cinema).',
  },

  // 3. tráfego → tráfico  (atividade ilegal)
  {
    id: "trafego->trafico",
    pattern:
      /\b(?<w>tr[áa]fego)\b\s+(?:de|d[oa]s?)\s+(?:drogas?|armas?|pessoas?|influ[êe]ncia|[óo]rg[ãa]os?|animais|escravos?|entorpecentes?)/giu,
    suggest: "tráfico",
    reason:
      '"Tráfego" = movimento (de veículos, dados). Para comércio ilegal use "tráfico".',
  },

  // 4. tráfico → tráfego  (movimento de veículos / dados)
  {
    id: "trafico->trafego",
    pattern:
      /\b(?<w>tr[áa]fico)\b\s+(?:de|d[oa]s?)\s+(?:ve[íi]culos?|carros?|dados|rede|internet|a[ée]reo|rodovi[áa]rio|mar[íi]timo|urbano|pedestres?)/giu,
    suggest: "tráfego",
    reason:
      '"Tráfico" = comércio ilegal. Para fluxo de veículos/dados use "tráfego".',
  },

  // 5. eminente → iminente  (prestes a acontecer)
  {
    id: "eminente->iminente",
    pattern:
      /\b(?<w>eminente)\b\s+(?:perigo|risco|colapso|chegada|amea[çc]a|guerra|cat[áa]strofe|fal[êe]ncia|morte|queda)/giu,
    suggest: "iminente",
    reason:
      '"Eminente" = ilustre, notável. Para algo prestes a ocorrer use "iminente".',
  },

  // 6. iminente → eminente  (pessoa notável)
  {
    id: "iminente->eminente",
    pattern:
      /\b(?<w>iminente)\b\s+(?:jurista|professora?|cientista|pol[íi]tico|figura|personalidade|escritor[a]?|m[ée]dic[oa]|pensador[a]?|fil[óo]sof[oa])/giu,
    suggest: "eminente",
    reason:
      '"Iminente" = prestes a ocorrer. Para pessoa notável/ilustre use "eminente".',
  },

  // 7. afim → a fim (de)  (intenção/propósito)
  {
    id: "afim->a-fim-de",
    pattern: /\b(?<w>afim)\b\s+de\b/giu,
    suggest: "a fim",
    reason:
      '"Afim" = semelhante (almas afins). Para indicar intenção use "a fim de".',
  },

  // 8. "a X anos atrás" → "há X anos" (redundância e troca de verbo)
  {
    id: "a-anos-atras->ha",
    pattern:
      /\b(?<w>a)\b\s+\d+\s+(?:minutos?|horas?|dias?|semanas?|meses|anos?|s[ée]culos?|d[ée]cadas?)\s+atr[áa]s\b/giu,
    suggest: "há",
    reason:
      'Para tempo decorrido use o verbo "haver": "há 5 anos" (não "a 5 anos atrás").',
  },

  // 9. "há X anos atrás" → redundância; sugerir "há X anos" (marcamos "atrás")
  {
    id: "ha-atras-redundante",
    pattern:
      /\bh[áa]\s+\d+\s+(?:minutos?|horas?|dias?|semanas?|meses|anos?|s[ée]culos?|d[ée]cadas?)\s+(?<w>atr[áa]s)\b/giu,
    suggest: "",
    reason:
      'Redundância: "há" já indica passado. Prefira "há 5 anos" em vez de "há 5 anos atrás".',
  },

  // 10. "boa viajem" / "minha viajem" → viagem  (substantivo)
  {
    id: "viajem->viagem",
    pattern:
      /\b(?:boa|m[áa]|minha|sua|nossa|tua|essa|esta|aquela|uma|a|toda|primeira|[úu]ltima)\s+(?<w>viajem)\b/giu,
    suggest: "viagem",
    reason:
      '"Viagem" é substantivo; "viajem" é forma do verbo viajar (que eles viajem).',
  },

  // 11. ratificar → retificar  (corrigir)
  {
    id: "ratificar->retificar",
    pattern:
      /\b(?<w>ratific(?:ar|ou|ando|a|am|aram|ado|ada|ados|adas))\b\s+(?:o|a|os|as|um|uma)?\s*(?:erro|engano|equ[íi]voco|informa[çc][ãa]o|dado|c[áa]lculo|texto|nome|endere[çc]o)/giu,
    suggest: (m) => m.replace(/^rat/i, (s) => (s === "RAT" ? "RET" : "ret")),
    reason:
      '"Ratificar" = confirmar. Para corrigir/consertar use "retificar".',
  },

  // 12. descriminar → discriminar  (separar/distinguir; ou preconceito)
  {
    id: "descriminar->discriminar",
    pattern:
      /\b(?<w>descrimin(?:ar|ou|ando|a|am|aram|ado|ada|ados|adas))\b\s+(?:por|contra|entre|os|as|um|uma|todos|todas|pessoas|negros|mulheres|minorias)/giu,
    suggest: (m) => m.replace(/^des/i, (s) => (s === "DES" ? "DIS" : "dis")),
    reason:
      '"Descriminar" = retirar do rol de crimes. Para distinguir/segregar use "discriminar".',
  },

  // 13. comprimento → cumprimento  (saudação)
  {
    id: "comprimento->cumprimento",
    pattern:
      /\b(?<w>comprimentos?)\b\s+(?:cordia(?:l|is)|caloros[oa]s?|sinceros?|amig[áa]veis?|formais?|do|da|de|aos?|às?|para)/giu,
    suggest: (m) => (/s$/i.test(m) ? "cumprimentos" : "cumprimento"),
    reason:
      '"Comprimento" = medida/extensão. Para saudação use "cumprimento".',
  },

  // 14. cumprimento → comprimento  (medida)
  {
    id: "cumprimento->comprimento",
    pattern:
      /\b(?<w>cumprimentos?)\b\s+(?:de|d[oa])\s+(?:onda|cabo|fio|barra|mesa|pe[çc]a|terreno|sala|tubo|r[ée]gua)/giu,
    suggest: (m) => (/s$/i.test(m) ? "comprimentos" : "comprimento"),
    reason:
      '"Cumprimento" = saudação ou ato de cumprir. Para medida use "comprimento".',
  },

  // 15. "ao encontro de" vs "de encontro a" — marca quando vem "contra"/"oposi[çc][ãa]o"
  {
    id: "ao-encontro-contra",
    pattern: /\b(?<w>ao\s+encontro)\b\s+(?:de|do|da|dos|das)\s+(?:meus|seus|nossos|suas)?\s*(?:cr[íi]ticas?|interesses\s+opostos|oposi[çc][ãa]o)/giu,
    suggest: "de encontro",
    reason:
      '"Ao encontro de" = a favor. Para oposição/choque use "de encontro a".',
  },

  // 16. mal → mau  (substantivo/adjetivo masculino após verbo de ligação ou artigo)
  {
    id: "mal->mau-adj",
    pattern: /\b(?:um|esse|este|aquele|do|de|todo|nenhum)\s+(?<w>mal)\s+(?:car[áa]ter|humor|aluno|exemplo|sujeito|cheiro|gosto|hábito|momento|pressentimento|marido|pai)/giu,
    suggest: "mau",
    reason:
      '"Mal" é advérbio/substantivo (oposto de bem). Como adjetivo (oposto de bom) use "mau".',
  },

  // 17. mau → mal  (advérbio depois de verbo)
  {
    id: "mau->mal-adv",
    pattern:
      /\b(?:passar|sentir|dormir|comer|escrever|falar|cantar|jogar|cheirar|ficar|sair|ir|fazer|agir|comportar(?:-se)?)\s+(?<w>mau)\b/giu,
    suggest: "mal",
    reason:
      '"Mau" é adjetivo (oposto de bom). Como advérbio (oposto de bem) use "mal".',
  },
];

// API pública -----------------------------------------------------------------

/**
 * Varre um trecho de texto e retorna todas as ocorrências de uso contextual
 * provavelmente incorreto. Posições são offsets UTF-16 dentro do texto recebido.
 */
export function findContextIssues(text: string): ContextIssue[] {
  if (!text) return [];
  const out: ContextIssue[] = [];
  for (const r of RULES) {
    r.pattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    // Defensive cap to prevent pathological inputs from spinning.
    let safety = 0;
    while ((m = r.pattern.exec(text)) !== null && safety++ < 2000) {
      // `d` flag fornece `indices` por grupo. Em runtimes sem suporte caímos no fallback.
      const grpIdx = (m as unknown as { indices?: { groups?: Record<string, [number, number]> } })
        .indices?.groups?.w;
      let from: number;
      let to: number;
      let word: string;
      if (grpIdx) {
        [from, to] = grpIdx;
        word = text.slice(from, to);
      } else {
        // Fallback: localiza o grupo nomeado dentro do match completo.
        const groups = (m as RegExpExecArray & { groups?: Record<string, string> }).groups;
        const w = groups?.w;
        if (!w) continue;
        const rel = m[0].indexOf(w);
        if (rel < 0) continue;
        from = m.index + rel;
        to = from + w.length;
        word = w;
      }
      const suggestion =
        typeof r.suggest === "function"
          ? matchCase(word, r.suggest(word))
          : matchCase(word, r.suggest);
      out.push({
        from,
        to,
        word,
        suggestion,
        reason: r.reason,
        ruleId: r.id,
      });
      // Garante avanço mesmo em matches de largura zero (improvável aqui).
      if (m.index === r.pattern.lastIndex) r.pattern.lastIndex++;
    }
  }
  return out;
}

/**
 * Dada uma palavra e seu contexto imediato (antes/depois), retorna o "hint"
 * contextual aplicável, ou null. Usado pelo popover de sugestões.
 */
export function getContextHint(
  word: string,
  before: string,
  after: string,
): { suggestion: string; reason: string; ruleId: string } | null {
  if (!word) return null;
  // Sintetiza um trecho local com o cursor da palavra-alvo.
  // Mantemos os limites estreitos para que o offset seja previsível.
  const beforeTrim = before.slice(-60);
  const snippet = `${beforeTrim}${word}${after.slice(0, 60)}`;
  const wordStart = beforeTrim.length;
  const wordEnd = wordStart + word.length;
  const issues = findContextIssues(snippet);
  // Aceita qualquer issue cujo span cubra exatamente a palavra-alvo.
  const hit = issues.find((i) => i.from === wordStart && i.to === wordEnd);
  if (!hit) return null;
  return { suggestion: hit.suggestion, reason: hit.reason, ruleId: hit.ruleId };
}
