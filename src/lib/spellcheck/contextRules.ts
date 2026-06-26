// Camada de inteligência contextual (PT-BR) baseada em regras determinísticas.
//
// Marca em vermelho palavras que estão grafadas corretamente, mas usadas
// no contexto errado: parônimos (sessão/seção), concordância de gênero
// e número (o pessoa / as aluno), colocações típicas e regência básica.
//
// Engine 100% local: zero IA, zero rede. Cada regra é uma RegExp com a
// flag `d` e um grupo nomeado `w` que delimita a palavra a marcar.
//
// Convenções:
//   - Use `\b` para fronteiras de palavra.
//   - Capture SEMPRE a palavra a marcar em `(?<w>...)`.
//   - Prefira falso-negativo a falso-positivo: na dúvida, peça mais contexto
//     na própria regex (preposição/substantivo adjacente).

export interface ContextIssue {
  from: number;
  to: number;
  word: string;
  suggestion: string;
  reason: string;
  ruleId: string;
}

interface Rule {
  id: string;
  pattern: RegExp; // flags devem incluir `giud`
  suggest: string | ((matched: string) => string);
  reason: string;
}

// Helpers ---------------------------------------------------------------------

function matchCase(original: string, suggestion: string): string {
  if (!original) return suggestion;
  if (/^[\p{Lu}\p{M}]+$/u.test(original)) return suggestion.toUpperCase();
  if (/^\p{Lu}/u.test(original)) {
    return suggestion.charAt(0).toUpperCase() + suggestion.slice(1);
  }
  return suggestion;
}

// Regras ----------------------------------------------------------------------

const RULES: Rule[] = [
  // ============================================================
  // PARÔNIMOS / HOMÓFONOS CLÁSSICOS
  // ============================================================

  // sessão → seção  (divisão/parte de algo escrito ou de uma loja)
  {
    id: "sessao->secao",
    pattern:
      /\b(?<w>sess[ãa]o|sess[õo]es)\b\s+(?:de|do|da|dos|das)\s+(?:livro|c[óo]digo|lei|jornal|revista|site|loja|artigo|cap[íi]tulo|documento|texto|p[áa]gina|not[íi]cias|esportes|economia|brinquedos|eletr[ôo]nicos|coment[áa]rios)/giu,
    suggest: (m) => (/s$/i.test(m) ? "seções" : "seção"),
    reason: '"Sessão" = período/reunião. Para divisão/parte use "seção".',
  },
  // seção → sessão  (período de tempo / encontro)
  {
    id: "secao->sessao",
    pattern:
      /\b(?<w>se[çc][ãa]o|se[çc][õo]es)\b\s+(?:de|do|da|dos|das)\s+(?:cinema|fotos?|terapia|treino|abertura|encerramento|julgamento|espiritismo|tortura|aut[óo]grafos?|perguntas|cinema|p[ôo]quer)/giu,
    suggest: (m) => (/s$/i.test(m) ? "sessões" : "sessão"),
    reason: '"Seção" = parte/divisão. Para período/encontro use "sessão".',
  },
  // cessão → sessão/seção (transferência de direito)
  {
    id: "cessao->context",
    pattern: /\b(?<w>cess[ãa]o)\b\s+(?:de|do|da)\s+(?:cinema|fotos?|treino|abertura)/giu,
    suggest: "sessão",
    reason: '"Cessão" = ato de ceder/transferir. Para encontro use "sessão".',
  },

  // tráfego → tráfico  (atividade ilegal)
  {
    id: "trafego->trafico",
    pattern:
      /\b(?<w>tr[áa]fego)\b\s+(?:de|d[oa]s?)\s+(?:drogas?|armas?|pessoas?|influ[êe]ncia|[óo]rg[ãa]os?|animais|escravos?|entorpecentes?|crian[çc]as?|mulheres)/giu,
    suggest: "tráfico",
    reason: '"Tráfego" = movimento (veículos, dados). Para comércio ilegal use "tráfico".',
  },
  // tráfico → tráfego
  {
    id: "trafico->trafego",
    pattern:
      /\b(?<w>tr[áa]fico)\b\s+(?:de|d[oa]s?)\s+(?:ve[íi]culos?|carros?|dados|rede|internet|a[ée]reo|rodovi[áa]rio|mar[íi]timo|urbano|pedestres?|caminh[õo]es?)/giu,
    suggest: "tráfego",
    reason: '"Tráfico" = comércio ilegal. Para fluxo de veículos/dados use "tráfego".',
  },

  // eminente → iminente  (prestes a acontecer)
  {
    id: "eminente->iminente",
    pattern:
      /\b(?<w>eminente)\b\s+(?:perigo|risco|colapso|chegada|amea[çc]a|guerra|cat[áa]strofe|fal[êe]ncia|morte|queda|ru[íi]na|fim)/giu,
    suggest: "iminente",
    reason: '"Eminente" = ilustre, notável. Para algo prestes a ocorrer use "iminente".',
  },
  // iminente → eminente
  {
    id: "iminente->eminente",
    pattern:
      /\b(?<w>iminente)\b\s+(?:jurista|professora?|cientista|pol[íi]tico|figura|personalidade|escritor[a]?|m[ée]dic[oa]|pensador[a]?|fil[óo]sof[oa]|autoridade|advogad[oa])/giu,
    suggest: "eminente",
    reason: '"Iminente" = prestes a ocorrer. Para pessoa notável/ilustre use "eminente".',
  },
  // imanente → imanente vs iminente/eminente: pular (raro, alto risco de FP)

  // afim → a fim de (intenção)
  {
    id: "afim->a-fim-de",
    pattern: /\b(?<w>afim)\b\s+de\b/giu,
    suggest: "a fim",
    reason: '"Afim" = semelhante. Para indicar intenção use "a fim de".',
  },

  // "a X anos atrás" → "há X anos"
  {
    id: "a-anos-atras->ha",
    pattern:
      /\b(?<w>a)\b\s+\d+\s+(?:minutos?|horas?|dias?|semanas?|meses|anos?|s[ée]culos?|d[ée]cadas?)\s+atr[áa]s\b/giu,
    suggest: "há",
    reason: 'Para tempo decorrido use "há": "há 5 anos" (não "a 5 anos atrás").',
  },
  // "há X anos atrás" → redundância
  {
    id: "ha-atras-redundante",
    pattern:
      /\bh[áa]\s+\d+\s+(?:minutos?|horas?|dias?|semanas?|meses|anos?|s[ée]culos?|d[ée]cadas?)\s+(?<w>atr[áa]s)\b/giu,
    suggest: "",
    reason: 'Redundância: "há" já indica passado. Use "há 5 anos" (sem "atrás").',
  },

  // viajem (verbo) → viagem (substantivo)
  {
    id: "viajem->viagem",
    pattern:
      /\b(?:boa|m[áa]|minha|sua|nossa|tua|essa|esta|aquela|uma|a|toda|primeira|[úu]ltima|longa|curta|pr[óo]xima)\s+(?<w>viajem)\b/giu,
    suggest: "viagem",
    reason: '"Viagem" é substantivo; "viajem" é forma do verbo viajar.',
  },

  // ratificar → retificar (corrigir)
  {
    id: "ratificar->retificar",
    pattern:
      /\b(?<w>ratific(?:ar|ou|ando|a|am|aram|ado|ada|ados|adas))\b\s+(?:o|a|os|as|um|uma)?\s*(?:erro|engano|equ[íi]voco|informa[çc][ãa]o|dado|c[áa]lculo|texto|nome|endere[çc]o|imposto|nota)/giu,
    suggest: (m) => m.replace(/^rat/i, (s) => (s === "RAT" ? "RET" : "ret")),
    reason: '"Ratificar" = confirmar. Para corrigir/consertar use "retificar".',
  },
  // retificar → ratificar (confirmar)
  {
    id: "retificar->ratificar",
    pattern:
      /\b(?<w>retific(?:ar|ou|ando|a|am|aram|ado|ada|ados|adas))\b\s+(?:o|a|os|as)?\s*(?:acordo|tratado|contrato|decis[ãa]o|posi[çc][ãa]o|apoio|compromisso)/giu,
    suggest: (m) => m.replace(/^ret/i, (s) => (s === "RET" ? "RAT" : "rat")),
    reason: '"Retificar" = corrigir. Para confirmar use "ratificar".',
  },

  // descriminar → discriminar (separar/preconceito)
  {
    id: "descriminar->discriminar",
    pattern:
      /\b(?<w>descrimin(?:ar|ou|ando|a|am|aram|ado|ada|ados|adas))\b\s+(?:por|contra|entre|os|as|um|uma|todos|todas|pessoas|negros|mulheres|minorias)/giu,
    suggest: (m) => m.replace(/^des/i, (s) => (s === "DES" ? "DIS" : "dis")),
    reason: '"Descriminar" = retirar do rol de crimes. Para distinguir/segregar use "discriminar".',
  },

  // comprimento → cumprimento (saudação)
  {
    id: "comprimento->cumprimento",
    pattern:
      /\b(?<w>comprimentos?)\b\s+(?:cordia(?:l|is)|caloros[oa]s?|sinceros?|amig[áa]veis?|formais?|do|da|de|aos?|às?|para)/giu,
    suggest: (m) => (/s$/i.test(m) ? "cumprimentos" : "cumprimento"),
    reason: '"Comprimento" = medida. Para saudação use "cumprimento".',
  },
  // cumprimento → comprimento (medida)
  {
    id: "cumprimento->comprimento",
    pattern:
      /\b(?<w>cumprimentos?)\b\s+(?:de|d[oa])\s+(?:onda|cabo|fio|barra|mesa|pe[çc]a|terreno|sala|tubo|r[ée]gua|corda|tecido)/giu,
    suggest: (m) => (/s$/i.test(m) ? "comprimentos" : "comprimento"),
    reason: '"Cumprimento" = saudação. Para medida use "comprimento".',
  },

  // ao encontro de → de encontro a (oposição)
  {
    id: "ao-encontro-contra",
    pattern:
      /\b(?<w>ao\s+encontro)\b\s+(?:de|do|da|dos|das)\s+(?:meus|seus|nossos|suas)?\s*(?:cr[íi]ticas?|interesses\s+opostos|oposi[çc][ãa]o|expectativa\s+contr[áa]ria)/giu,
    suggest: "de encontro",
    reason: '"Ao encontro de" = a favor. Para oposição/choque use "de encontro a".',
  },

  // mau (adj) ↔ mal (adv/subst)
  {
    id: "mal->mau-adj",
    pattern:
      /\b(?:um|esse|este|aquele|do|de|todo|nenhum|qualquer)\s+(?<w>mal)\s+(?:car[áa]ter|humor|aluno|exemplo|sujeito|cheiro|gosto|h[áa]bito|momento|pressentimento|marido|pai|filho|chefe|professor|amigo|vizinho|dia)/giu,
    suggest: "mau",
    reason: '"Mal" é advérbio/substantivo. Como adjetivo (oposto de bom) use "mau".',
  },
  {
    id: "mau->mal-adv",
    pattern:
      /\b(?:passar|sentir|dormir|comer|escrever|falar|cantar|jogar|cheirar|ficar|sair|ir|fazer|agir|comportar(?:-se)?|ouvir|ver|andar|cheirar)\s+(?<w>mau)\b/giu,
    suggest: "mal",
    reason: '"Mau" é adjetivo (oposto de bom). Como advérbio (oposto de bem) use "mal".',
  },

  // ============================================================
  // NOVOS PARÔNIMOS (alta confiança)
  // ============================================================

  // conserto (reparo) ↔ concerto (música)
  {
    id: "concerto->conserto",
    pattern:
      /\b(?<w>concertos?)\b\s+(?:d[eo]|do|da|dos|das)\s+(?:carro|moto|geladeira|computador|celular|televis[ãa]o|tv|m[áa]quina|rel[óo]gio|sapatos?|roupa|encanamento|telhado|motor|bicicleta|sof[áa]|cano|torneira)/giu,
    suggest: (m) => (/s$/i.test(m) ? "consertos" : "conserto"),
    reason: '"Concerto" = espetáculo musical. Para reparo use "conserto".',
  },
  {
    id: "conserto->concerto",
    pattern:
      /\b(?<w>consertos?)\b\s+(?:d[eo]|musical|sinf[ôo]nico|de\s+(?:rock|jazz|m[úu]sica|piano|viol[ãa]o|orquestra|c[âa]mara|natal))/giu,
    suggest: (m) => (/s$/i.test(m) ? "concertos" : "concerto"),
    reason: '"Conserto" = reparo. Para apresentação musical use "concerto".',
  },

  // cheque (papel/banco) ↔ xeque (xadrez/perigo)
  {
    id: "xeque->cheque",
    pattern: /\b(?<w>xeques?)\b\s+(?:banc[áa]rio|sem\s+fundo|pr[ée]-?datado|nominal|cruzado|administrativ[oa])/giu,
    suggest: (m) => (/s$/i.test(m) ? "cheques" : "cheque"),
    reason: '"Xeque" = jogada/perigo. Para papel bancário use "cheque".',
  },
  {
    id: "cheque->xeque",
    pattern: /\bem\s+(?<w>cheque)\b/giu,
    suggest: "xeque",
    reason: '"Pôr em xeque" = colocar em risco/dúvida (do xadrez), não "em cheque".',
  },

  // censo (recenseamento) ↔ senso (juízo)
  {
    id: "censo->senso",
    pattern:
      /\b(?<w>censos?)\b\s+(?:comum|cr[íi]tico|de\s+(?:justi[çc]a|humor|responsabilidade|dever))/giu,
    suggest: (m) => (/s$/i.test(m) ? "sensos" : "senso"),
    reason: '"Censo" = recenseamento. Para juízo/discernimento use "senso".',
  },
  {
    id: "senso->censo",
    pattern: /\b(?<w>senso)\s+(?:demogr[áa]fico|do\s+IBGE|populacional|escolar|agropecu[áa]rio)/giu,
    suggest: "censo",
    reason: '"Senso" = juízo. Para recenseamento populacional use "censo".',
  },

  // caçar (perseguir) ↔ cassar (anular)
  {
    id: "cacar->cassar-mandato",
    pattern:
      /\b(?<w>ca[çc](?:ar|ou|ando|aram|ado|ada))\b\s+(?:o|a|os|as)?\s*(?:mandato|registro|licen[çc]a|direitos?|diploma|habilita[çc][ãa]o)/giu,
    suggest: (m) => m.replace(/ç/gi, (s) => (s === "Ç" ? "SS" : "ss")),
    reason: '"Caçar" = perseguir. Para anular/revogar use "cassar".',
  },

  // mandato (período) ↔ mandado (ordem judicial)
  {
    id: "mandato->mandado",
    pattern:
      /\b(?<w>mandatos?)\b\s+(?:de\s+(?:busca|pris[ãa]o|seguran[çc]a|reintegra[çc][ãa]o|cita[çc][ãa]o|despejo))/giu,
    suggest: (m) => m.replace(/to(s?)$/i, (_a, s) => `do${s}`),
    reason: '"Mandato" = período de cargo. Para ordem judicial use "mandado".',
  },
  {
    id: "mandado->mandato",
    pattern:
      /\b(?<w>mandados?)\b\s+(?:presidencial|parlamentar|de\s+(?:vereador|deputado|senador|prefeito|governador|presidente))/giu,
    suggest: (m) => m.replace(/do(s?)$/i, (_a, s) => `to${s}`),
    reason: '"Mandado" = ordem judicial. Para período no cargo use "mandato".',
  },

  // tachar (acusar) ↔ taxar (cobrar imposto)
  {
    id: "taxar->tachar",
    pattern:
      /\b(?<w>tax(?:ar|ou|ando|aram|ado|ada))\b\s+(?:de|como)\s+(?:mentiroso|burro|incompetente|tra[íi]dor|covarde|inv[ée]ja|racista|hip[óo]crita)/giu,
    suggest: (m) => m.replace(/x/gi, (s) => (s === "X" ? "CH" : "ch")),
    reason: '"Taxar" = cobrar imposto. Para acusar/qualificar use "tachar".',
  },

  // infligir (aplicar pena) ↔ infringir (violar)
  {
    id: "infringir->infligir",
    pattern:
      /\b(?<w>infring(?:ir|iu|indo|iram|ido|ida))\b\s+(?:uma|a|o|um)?\s*(?:puni[çc][ãa]o|castigo|pena|dor|sofrimento|derrota)/giu,
    suggest: (m) => m.replace(/ring/gi, (s) => (s === "RING" ? "LIG" : "lig")),
    reason: '"Infringir" = violar lei. Para aplicar pena/castigo use "infligir".',
  },
  {
    id: "infligir->infringir",
    pattern:
      /\b(?<w>inflig(?:ir|iu|indo|iram|ido|ida))\b\s+(?:uma|a|o|um|as|os)?\s*(?:lei|norma|regra|c[óo]digo|regulamento|contrato|tratado|constitui[çc][ãa]o)/giu,
    suggest: (m) => m.replace(/lig/gi, (s) => (s === "LIG" ? "RING" : "ring")),
    reason: '"Infligir" = aplicar castigo. Para violar norma use "infringir".',
  },

  // emergir (vir à tona) ↔ imergir (mergulhar)
  {
    id: "emergir->imergir",
    pattern:
      /\b(?<w>emerg(?:ir|iu|indo|iram|ido))\b\s+(?:n[oa]|nas|nos)\s+(?:[áa]gua|mar|piscina|rio|profundezas|escurid[ãa]o|sonho|leitura)/giu,
    suggest: (m) => m.replace(/^em/i, (s) => (s === "EM" ? "IM" : "im")),
    reason: '"Emergir" = vir à tona. Para mergulhar/submergir use "imergir".',
  },

  // estada (permanência) ↔ estadia (estacionamento/hotel pago por tempo)
  {
    id: "estadia->estada",
    pattern:
      /\b(?<w>estadias?)\b\s+(?:em|na|no|nas|nos)\s+(?:casa|fam[íi]lia|cidade|pa[íi]s|exterior|Brasil|Europa|Lisboa|Paris)/giu,
    suggest: (m) => m.replace(/dia/gi, (s) => (s === "DIA" ? "DA" : "da")),
    reason: '"Estadia" = tempo pago em hotel/porto. Para permanência em geral use "estada".',
  },

  // previdência (seguro) ↔ providência (medida)
  {
    id: "previdencia->providencia",
    pattern:
      /\btomar\s+(?:uma|as|alguma)?\s*(?<w>previd[êe]ncias?)\b/giu,
    suggest: (m) => (/s$/i.test(m) ? "providências" : "providência"),
    reason: '"Previdência" = seguro/INSS. Para medida/iniciativa use "providência".',
  },

  // fluir (correr) ↔ fruir (desfrutar)
  {
    id: "fruir->fluir",
    pattern:
      /\b(?<w>fru(?:ir|iu|indo|iram|[íi]da?))\b\s+(?:livremente|naturalmente|pelas?|pelo|com\s+facilidade)/giu,
    suggest: (m) => m.replace(/^fr/i, (s) => (s === "FR" ? "FL" : "fl")),
    reason: '"Fruir" = desfrutar. Para escoar/correr use "fluir".',
  },

  // soar (fazer som) ↔ suar (transpirar)
  {
    id: "suar->soar",
    pattern: /\b(?<w>su(?:a|am|ou|aram|ando))\b\s+(?:bem|mal|estranho|falso|familiar|grave|alto|baixo|como)/giu,
    suggest: (m) => m.replace(/^su/i, (s) => (s === "SU" ? "SO" : "so")),
    reason: '"Suar" = transpirar. Para fazer som use "soar".',
  },

  // sortir (abastecer) ↔ surtir (produzir efeito)
  {
    id: "sortir->surtir-efeito",
    pattern: /\b(?<w>sort(?:ir|iu|indo|iram|ido|ida))\b\s+efeito/giu,
    suggest: (m) => m.replace(/^sort/i, (s) => (s === "SORT" ? "SURT" : "surt")),
    reason: '"Sortir" = abastecer. Para produzir efeito use "surtir".',
  },

  // vultoso (volumoso, grande) ↔ vultuoso (face inchada)
  {
    id: "vultuoso->vultoso",
    pattern:
      /\b(?<w>vultuos[oa]s?)\b\s+(?:quantia|soma|valor|investimento|recurso|montante|capital|despesa|lucro)/giu,
    suggest: (m) => m.replace(/tu/i, (s) => (s === "TU" ? "T" : "t")),
    reason: '"Vultuoso" = face inchada. Para grande/volumoso use "vultoso".',
  },

  // esperto (inteligente) ↔ experto (especialista) — geralmente "experto" é um erro.
  {
    id: "experto->especialista",
    pattern: /\b(?<w>experto)\b\s+(?:em|no|na)/giu,
    suggest: "especialista",
    reason: '"Experto" é raro em PT-BR. Prefira "especialista" ou "esperto" conforme o sentido.',
  },

  // sob (debaixo) ↔ sobre (acima/sobre o tema)
  {
    id: "sob->sobre-tema",
    pattern: /\bfalar\s+(?<w>sob)\b\s+(?:o|a|os|as|um|uma|isso|esse|esta|este|essa)/giu,
    suggest: "sobre",
    reason: '"Sob" = debaixo. Para "a respeito de" use "sobre".',
  },
  {
    id: "sobre->sob",
    pattern:
      /\b(?<w>sobre)\b\s+(?:pena|press[ãa]o|amea[çc]a|risco|condi[çc][ãa]o\s+de|comando\s+de|tutela|encomenda|medida|controle\s+de|investiga[çc][ãa]o\s+de)/giu,
    suggest: "sob",
    reason: '"Sobre" = acima/sobre o tema. Para "debaixo de" use "sob".',
  },

  // acerca de (a respeito) ↔ a cerca de (aproximadamente, distância)
  {
    id: "a-cerca-de->acerca-de",
    pattern: /\b(?<w>a\s+cerca)\s+de\b\s+(?:quest[õo]es|temas?|assuntos?|isso|disso|fatos?|conceitos?)/giu,
    suggest: "acerca",
    reason: '"A cerca de" = ~aproximadamente. Para "a respeito de" use "acerca de".',
  },

  // a princípio (inicialmente) ↔ em princípio (em tese)
  // (alto risco de FP — pulado)

  // ============================================================
  // CONCORDÂNCIA DE GÊNERO (artigo + substantivo)
  // ============================================================

  // a problema → o problema (substantivos masculinos com aparência feminina)
  {
    id: "gender-fem-masc",
    pattern:
      /\b(?<w>a|essa|esta|aquela|uma|toda|nenhuma|alguma|outra|minha|sua|nossa|tua)\s+(?:problema|sistema|tema|cinema|drama|programa|esquema|dilema|trauma|fonema|teorema|enigma|estigma|carisma|panorama|magma|fant[áa]sma|axioma|aroma|clima|crisma|emblema|sintoma|diafragma|grama(?=\s+(?:do|de\s+pa[íi]s)))\b/giu,
    suggest: (m) => {
      const map: Record<string, string> = {
        a: "o", essa: "esse", esta: "este", aquela: "aquele",
        uma: "um", toda: "todo", nenhuma: "nenhum", alguma: "algum",
        outra: "outro", minha: "meu", sua: "seu", nossa: "nosso", tua: "teu",
      };
      return map[m.toLowerCase()] ?? m;
    },
    reason: "Substantivos terminados em -ma de origem grega são masculinos (o problema, o sistema, o tema).",
  },

  // o pessoa / o crise → a pessoa / a crise (substantivos femininos comuns confundidos)
  {
    id: "gender-masc-fem",
    pattern:
      /\b(?<w>o|esse|este|aquele|um|todo|nenhum|algum|outro|meu|seu|nosso|teu)\s+(?:pessoa|crise|análise|tese|s[íi]ntese|hip[óo]tese|metr[óo]pole|origem|imagem|viagem|coragem|paisagem|garagem|linguagem|massagem|mensagem|aprendizagem|sa[úu]de|raiz|paz|voz|dor|cor|flor|mulher|ordem|nuvem|virtude|magnitude|atitude)\b/giu,
    suggest: (m) => {
      const map: Record<string, string> = {
        o: "a", esse: "essa", este: "esta", aquele: "aquela",
        um: "uma", todo: "toda", nenhum: "nenhuma", algum: "alguma",
        outro: "outra", meu: "minha", seu: "sua", nosso: "nossa", teu: "tua",
      };
      return map[m.toLowerCase()] ?? m;
    },
    reason: "Esse substantivo é feminino em português; o artigo/pronome deve concordar (a pessoa, a crise, a viagem).",
  },

  // ============================================================
  // CONCORDÂNCIA DE NÚMERO (artigo plural + substantivo singular)
  // ============================================================

  {
    id: "plural-art-sing-noun",
    pattern:
      /\b(?<w>os|as|esses|essas|estes|estas|aqueles|aquelas|uns|umas|todos|todas|alguns|algumas|meus|minhas|seus|suas|nossos|nossas|muitos|muitas|poucos|poucas|v[áa]rios|v[áa]rias)\s+(?:menino|menina|aluno|aluna|amigo|amiga|livro|carro|pessoa|crian[çc]a|casa|professor|professora|filho|filha|mulher|homem|dia|ano|m[êe]s|hora|minuto)\b(?!s)/giu,
    suggest: (m) => m, // não altera o artigo; a sugestão aqui é pluralizar o substantivo
    reason: "O artigo está no plural mas o substantivo seguinte está no singular — verifique a concordância de número.",
  },

  // ============================================================
  // REGÊNCIA / PREPOSIÇÕES COMUNS
  // ============================================================

  // "implicar em" → "implicar" (transitivo direto)
  {
    id: "implicar-em",
    pattern: /\b(?<w>implicar[áa]?(?:[aã]o|am|ei|emos|eis)?)\s+em\b/giu,
    suggest: (m) => m,
    reason: '"Implicar" (no sentido de acarretar) é transitivo direto: "implica perdas", não "implica em perdas".',
  },

  // "obedecer o" → "obedecer ao" (regência indireta)
  {
    id: "obedecer-art",
    pattern:
      /\b(?<w>obedec(?:er|i|emos|ia|iam|eu|eram|endo|ido|ida))\b\s+(?:o|a|os|as)\s+(?:lei|regra|norma|c[óo]digo|sinal|pai|m[ãa]e|chefe|professor|professora|regulamento|ordem)/giu,
    suggest: (m) => m,
    reason: '"Obedecer" exige preposição: "obedecer à lei", "obedecer ao pai" (não "obedecer a lei" sem crase).',
  },

  // "preferir do que" → "preferir a"
  {
    id: "preferir-do-que",
    pattern: /\b(?<w>prefiro|prefere|preferem|preferi|preferia|preferiam|preferia)\b[^.;!?\n]{0,40}?\s+do\s+que\b/giu,
    suggest: (m) => m,
    reason: '"Preferir" pede a preposição "a", não "do que": "prefiro café a chá".',
  },

  // "à nível de" → "em nível de" / "no nível de"
  {
    id: "a-nivel-de",
    pattern: /\b(?<w>[àa])\s+n[íi]vel\s+de\b/giu,
    suggest: "em",
    reason: 'Evite "a nível de". Prefira "em nível de" (na esfera) ou reescreva.',
  },
];

// API pública -----------------------------------------------------------------

export function findContextIssues(text: string): ContextIssue[] {
  if (!text) return [];
  const out: ContextIssue[] = [];
  for (const r of RULES) {
    r.pattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    let safety = 0;
    while ((m = r.pattern.exec(text)) !== null && safety++ < 2000) {
      const groups = (m as RegExpExecArray & { groups?: Record<string, string> }).groups;
      const w = groups?.w;
      if (!w) {
        if (m.index === r.pattern.lastIndex) r.pattern.lastIndex++;
        continue;
      }
      const rel = m[0].indexOf(w);
      if (rel < 0) {
        if (m.index === r.pattern.lastIndex) r.pattern.lastIndex++;
        continue;
      }
      const from = m.index + rel;
      const to = from + w.length;
      const word = w;
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
      if (m.index === r.pattern.lastIndex) r.pattern.lastIndex++;
    }
  }
  return out;
}

export function getContextHint(
  word: string,
  before: string,
  after: string,
): { suggestion: string; reason: string; ruleId: string } | null {
  if (!word) return null;
  const beforeTrim = before.slice(-80);
  const snippet = `${beforeTrim}${word}${after.slice(0, 80)}`;
  const wordStart = beforeTrim.length;
  const wordEnd = wordStart + word.length;
  const issues = findContextIssues(snippet);
  const hit = issues.find((i) => i.from === wordStart && i.to === wordEnd);
  if (!hit) return null;
  return { suggestion: hit.suggestion, reason: hit.reason, ruleId: hit.ruleId };
}
