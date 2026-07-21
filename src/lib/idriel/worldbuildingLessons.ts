// Mini-aulas de worldbuilding contadas pela voz de Idriel.
// Conteúdo estático (não consome gotas nem chama IA). Serve para o hub
// "Aprenda Worldbuilding" dentro do HelpDrawer.

export interface LessonSection {
  heading: string;
  body: string;
}

export interface WorldbuildingLesson {
  id: string;
  title: string;
  minutes: number;
  summary: string;
  intro: string;
  sections: LessonSection[];
  spark: string; // faísca criativa final (pergunta pro criador)
}

export const WORLDBUILDING_LESSONS: WorldbuildingLesson[] = [
  {
    id: 'sementes',
    title: 'A Semente de um Mundo',
    minutes: 4,
    summary: 'De onde nasce um mundo? Escolha entre uma imagem, uma pergunta ou uma emoção — e regue.',
    intro:
      'Todo mundo, mesmo os que hoje enchem galáxias, começou como uma semente miúda entre as raízes. Deixe-me te mostrar as três sementes mais férteis que já vi brotarem sob a Árvore.',
    sections: [
      {
        heading: 'A imagem que não te larga',
        body:
          'Às vezes uma cena aparece — uma cidade suspensa em raízes, uma criança segurando uma tempestade — e não vai embora. Ela é a semente. Anote a imagem literalmente. O mundo cresce ao redor dela.',
      },
      {
        heading: 'A pergunta que arde',
        body:
          '"E se a morte fosse uma profissão?" "E se o vento cobrasse tributo?" Uma pergunta que te incomoda é uma raiz que já começou a cavar. Persiga a resposta e o mundo vem junto.',
      },
      {
        heading: 'A emoção que precisa de casa',
        body:
          'Se você sente uma saudade sem endereço, um medo sem nome, dê a essa emoção um lugar. Um clima, um povo, uma cidade que a habite. Assim o mundo nasce com sangue quente.',
      },
    ],
    spark:
      'Qual das três sementes você está segurando neste momento? Escreva-a em uma linha, sem julgar — a Árvore cuida do resto.',
  },
  {
    id: 'coerencia',
    title: 'Coerência sem prisão',
    minutes: 5,
    summary: 'Regras que sustentam sem sufocar: o segredo é o "por quê", não o "não pode".',
    intro:
      'Já vi criadores travarem porque acham que precisam decidir tudo antes de escrever. Não precisam. Coerência não é planilha — é uma promessa que o mundo faz ao leitor e cumpre.',
    sections: [
      {
        heading: 'Regra vs. limite',
        body:
          'Uma **regra** diz o que pode acontecer (a magia custa memória). Um **limite** diz o que nunca vai acontecer (magia não ressuscita). Escolha poucos limites — dois ou três — e defenda-os até o fim. O resto pode dobrar.',
      },
      {
        heading: 'O "por quê" antes do "como"',
        body:
          'Se você sabe por que os dragões desapareceram, o como pode mudar. Se só sabe o como, qualquer contradição derruba tudo. Guarde os porquês no Codex, como Artigos curtos.',
      },
      {
        heading: 'Contradição é convite',
        body:
          'Quando dois pedaços do mundo brigam, não corte um dos dois. Pergunte: "e se ambos forem verdade, e a tensão for parte da história?" Muitos dos melhores mundos vivem exatamente nessa fricção.',
      },
    ],
    spark: 'Diga em voz alta um limite do seu mundo — algo que nunca pode acontecer. Já é raiz.',
  },
  {
    id: 'povos',
    title: 'Povos vivos, não catálogos',
    minutes: 6,
    summary: 'Um povo não é um conjunto de traços. É uma resposta coletiva a uma pergunta antiga.',
    intro:
      'Muitos criadores listam cor de pele, comida, roupas — e o povo continua sem alma. Isso é catálogo. Um povo vivo nasce de uma pergunta que a história daquele povo foi obrigada a responder.',
    sections: [
      {
        heading: 'A pergunta original',
        body:
          'Todo povo carrega uma pergunta antiga: "como sobrevivemos ao frio?", "o que fazer com quem trai?", "quem tem direito de falar com os deuses?". As respostas viram costume, mito, arquitetura, culinária.',
      },
      {
        heading: 'Três camadas',
        body:
          'Descreva sempre em três: (1) o que o povo **acredita**, (2) o que o povo **faz**, (3) o que o povo **esconde**. A distância entre as três é onde moram os personagens interessantes.',
      },
      {
        heading: 'Diversidade interna',
        body:
          'Nenhum povo é homogêneo — nem no nosso mundo, nem no seu. Sempre pergunte: "quem, dentro deste povo, discorda?". Essa dissidência é combustível narrativo puro.',
      },
    ],
    spark: 'Escolha um povo do seu mundo. Qual pergunta antiga ele passou séculos tentando responder?',
  },
  {
    id: 'magia',
    title: 'Magia com custo',
    minutes: 4,
    summary: 'Magia grátis é magia esquecida. Todo poder precisa de uma dor à altura.',
    intro:
      'Vi milênios de magias serem tecidas sob a Árvore. As que perduram na memória dos leitores sempre têm uma coisa em comum: custam algo real.',
    sections: [
      {
        heading: 'O preço tangível',
        body:
          'Escolha um custo que o leitor **sinta**: tempo de vida, uma lembrança, uma parte do corpo, a lealdade de alguém amado. Evite custos abstratos como "energia" — eles não pesam na alma.',
      },
      {
        heading: 'Regras de três',
        body:
          'Três coisas a magia faz muito bem. Três coisas que ela nunca consegue. Três coisas que ela quase consegue — e é aí que os personagens vão apostar tudo.',
      },
      {
        heading: 'Quem controla o acesso',
        body:
          'Toda magia que vale a pena tem um portão. Escolas, linhagens, castas, contratos, sacrifícios. O portão é político — e a política é história.',
      },
    ],
    spark: 'Qual é o custo real da magia no seu mundo? Se você respondeu "energia mágica", tente de novo.',
  },
  {
    id: 'conflito',
    title: 'Conflitos que empurram a Árvore',
    minutes: 5,
    summary: 'Conflito não é briga — é escolha impossível. Sem escolha, não há mundo.',
    intro:
      'A Árvore só cresce quando algo a empurra. Nos mundos que os criadores trazem até aqui, o motor é sempre o mesmo: uma escolha que ninguém queria ter que fazer.',
    sections: [
      {
        heading: 'Três eixos de tensão',
        body:
          '(1) Sobrevivência (fome, guerra, praga), (2) Pertencimento (quem é aceito, quem é expulso), (3) Verdade (o que se pode dizer, o que precisa ser escondido). Um mundo com tensão nos três eixos raramente aborrece.',
      },
      {
        heading: 'O gatilho antigo',
        body:
          'O grande conflito da sua história não começa na página 1. Ele começou séculos atrás e vem esperando. Escreva, num parágrafo, o gatilho antigo — mesmo que ninguém no romance saiba dele.',
      },
      {
        heading: 'Custos assimétricos',
        body:
          'Se todos perdem a mesma coisa no conflito, é matemática. Se cada facção perde algo diferente e insubstituível, é tragédia. Prefira sempre a segunda.',
      },
    ],
    spark: 'Qual foi o gatilho antigo do conflito central do seu mundo? Escreva em três linhas.',
  },
];

export function findLesson(id: string): WorldbuildingLesson | undefined {
  return WORLDBUILDING_LESSONS.find((l) => l.id === id);
}
