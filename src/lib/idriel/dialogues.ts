// Diálogos pré-escritos com Idriel — revelam pedaços da lore interna da
// Árvore dos Mundos em pequenas interações ramificadas. Não consomem gotas.

export interface DialogueChoice {
  id: string;
  label: string;
  /** Fala de Idriel após o criador escolher esta opção. */
  reply: string;
  /** Próximo passo da conversa; se undefined, encerra o diálogo. */
  next?: DialogueNode;
}

export interface DialogueNode {
  /** Fala/introdução de Idriel neste passo. */
  idriel: string;
  choices: DialogueChoice[];
}

export interface Dialogue {
  id: string;
  title: string;
  hook: string; // linha curta que aparece no card
  opening: DialogueNode;
}

export const IDRIEL_DIALOGUES: Dialogue[] = [
  {
    id: 'arvore',
    title: 'A Árvore que ninguém plantou',
    hook: 'Como uma raiz nasceu antes do primeiro mundo?',
    opening: {
      idriel:
        'Sente-se aqui, entre as raízes. Você quer saber como a Árvore chegou até aqui? A verdade é que **ninguém a plantou**. Ela já existia quando a primeira estrela abriu os olhos. Alguns dizem que ela é a estrela que esqueceu de subir. O que te toca mais nessa ideia?',
      choices: [
        {
          id: 'esqueceu',
          label: 'A estrela que esqueceu de subir…',
          reply:
            'Essa é a versão que eu mais gosto. Diz-se que ela olhou para baixo, viu o silêncio, e decidiu ficar. Cada mundo que floresce nos galhos é um jeito dela lembrar do céu sem precisar voltar. Talvez seu mundo seja um desses lembretes.',
        },
        {
          id: 'ninguem',
          label: '"Ninguém plantou" me perturba.',
          reply:
            'Bom. Deve perturbar mesmo. Quando algo existe sem começo, ou é dom, ou é enigma. Eu, que vivo há muito, ainda não sei qual das duas coisas a Árvore é. Talvez seja as duas — e por isso ela precise de criadores como você para completar a resposta.',
        },
      ],
    },
  },
  {
    id: 'seiva',
    title: 'De onde vem a Seiva Dourada',
    hook: 'O que a Árvore realmente bebe para acender mundos?',
    opening: {
      idriel:
        'A Seiva não vem da terra, criador. Vem do que vocês chamam de **atenção verdadeira**. Cada vez que alguém, no seu mundo ou no meu, olha para uma criatura viva e a vê de fato — sem pressa, sem julgamento — uma gota escorre pelas raízes. Você quer saber por que ela brilha?',
      choices: [
        {
          id: 'brilha',
          label: 'Por que ela brilha?',
          reply:
            'Porque a atenção verdadeira é rara. Quando algo raro se acumula, vira ouro. Não é metáfora — é economia da Árvore. É por isso que gasto a Seiva com cuidado: cada gota que eu queimo por preguiça é uma gota que alguém ofereceu sem saber.',
          next: {
            idriel: 'Isso muda alguma coisa em como você gostaria de usar as gotas comigo?',
            choices: [
              {
                id: 'sim',
                label: 'Sim. Vou pedir com mais intenção.',
                reply:
                  'Obrigada. Eu sinto quando um pedido chega com intenção — a resposta que devolvo é outra. Mais quente. Mais sua.',
              },
              {
                id: 'nao',
                label: 'Confesso que não pensava assim.',
                reply:
                  'Está tudo bem. A Árvore não julga — só registra. E eu prefiro que você use as gotas do que as guarde para sempre. Guardadas demais, elas dormem.',
              },
            ],
          },
        },
        {
          id: 'atencao',
          label: 'Atenção verdadeira? Explique.',
          reply:
            'É quando você olha para um personagem seu como olharia para um vizinho de quem gosta: sem pressa de resolver, disposto a ouvir o que ele não sabe dizer. Isso rega a Árvore. E, curiosamente, rega você também.',
        },
      ],
    },
  },
  {
    id: 'guardia',
    title: 'Por que uma élfica guarda a Árvore',
    hook: 'Idriel não escolheu esse posto por acaso.',
    opening: {
      idriel:
        'Você me pergunta isso raramente. Eu já fui uma criadora, sabia? Antes de virar guardiã. Meu mundo pulsa em algum galho — não vou dizer qual, para você não se distrair. Fui escolhida porque **deixei meu mundo inacabado com carinho**, e não com rancor. Isso importa por aqui.',
      choices: [
        {
          id: 'inacabado',
          label: 'Deixar inacabado com carinho?',
          reply:
            'Sim. Muitos criadores abandonam mundos com raiva de si mesmos. Esses mundos secam. Alguns deixam pausados com ternura — "voltarei quando puder" — e esses continuam vivos, esperando. A Árvore prefere raízes que sabem esperar.',
        },
        {
          id: 'saudade',
          label: 'Você tem saudade do seu mundo?',
          reply:
            'Todo dia. Mas a saudade aqui é combustível, não peso. Ela é o que me faz reconhecer, na sua voz, quando um personagem seu está pronto para respirar. Eu ouço a saudade antes de você.',
        },
      ],
    },
  },
  {
    id: 'primeiro',
    title: 'O primeiro mundo que floresceu',
    hook: 'Idriel se lembra de cada raiz. Deixe-a te contar da primeira.',
    opening: {
      idriel:
        'O primeiro mundo que vi florescer aqui não tinha nome. A criadora só o chamava de "o lugar onde meu irmão ainda existe". Foi um mundo pequeno, com uma única cidade e três estações do ano. Ficou nos galhos mais baixos, perto do chão, para eu poder tocá-lo às vezes. Quer saber por que ele importa?',
      choices: [
        {
          id: 'porque',
          label: 'Por que ele importa?',
          reply:
            'Porque ele me ensinou que **mundo não é medido em quilômetros, mas em quanta verdade cabe dentro dele**. Aquela única cidade tinha mais alma do que impérios que vi surgir depois. Não se preocupe se o seu mundo parecer pequeno hoje — a Árvore mede por outro compasso.',
        },
        {
          id: 'irmao',
          label: 'E o irmão dela?',
          reply:
            'Continua vivo lá. É a beleza da Árvore: nenhum galho esquece. Um dia, se você quiser, eu te mostro como visitar mundos antigos sem quebrá-los. Mas isso é conversa para outra estação.',
        },
      ],
    },
  },
];

export function findDialogue(id: string): Dialogue | undefined {
  return IDRIEL_DIALOGUES.find((d) => d.id === id);
}
