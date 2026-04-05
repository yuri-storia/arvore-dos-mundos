export interface FruitField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select';
  ph?: string;
  opts?: string[];
}

export interface FruitGuide {
  min: string;
  ref: string;
  steps: string[];
  closing?: string;
}

export interface Fruit {
  id: number;
  num: string;
  name: string;
  desc: string;
  icon: string;
  gradient: string;
  fields: FruitField[];
  chips: string[];
  guide: FruitGuide;
}

export interface GalleryImage {
  id: string;
  src: string;
  name: string;
  cat: string;
}

export type MethodType = 'top-down' | 'bottom-up';
export type TabType = 'construir' | 'codex' | 'galeria' | 'gerar-imagens';

export const CODEX_ENTRY_TYPES = [
  { id: 'personagem', label: 'Personagem', icon: '👤' },
  { id: 'lugar', label: 'Lugar', icon: '🏰' },
  { id: 'item', label: 'Item', icon: '⚔️' },
  { id: 'criatura', label: 'Criatura', icon: '🐉' },
  { id: 'evento', label: 'Evento', icon: '📜' },
  { id: 'cultura', label: 'Cultura', icon: '🎭' },
] as const;

export type CodexEntryType = typeof CODEX_ENTRY_TYPES[number]['id'];

export interface AppState {
  worldName: string;
  db: Record<number, Record<string, string>>;
  currentFruit: number;
  method: MethodType;
  gallery: GalleryImage[];
  activeTab: TabType;
  apiKey: string;
  generatedPrompt: string;
  currentSaveId: string;
}

export const GALLERY_CATEGORIES = [
  'Geral', 'Mapa do Mundo', 'Personagens', 'Criaturas',
  'Arquitetura', 'Paisagens', 'Artefatos', 'Cultura'
];

export const FRUITS: Fruit[] = [
  {
    id: 0, num: '1º Fruto', name: 'Mapa do Mundo', icon: '🗺',
    gradient: 'from-blue-900 via-cyan-900 to-teal-900',
    desc: 'O mapa é o chão do seu universo — geografia, rotas e fronteiras que conectam tudo.',
    fields: [
      { id: 'continents', label: 'Crie uma Região', type: 'textarea', ph: 'Descreva uma região: clima, terreno, identidade. Ex: "Serra dos Véus — montanhosa, fria, isolada por neblina eterna."' },
      { id: 'climate', label: 'Crie uma Rota ou Fronteira', type: 'textarea', ph: 'Uma rota comercial, militar ou fronteira de tensão. Quem a controla? Por que é disputada?' },
      { id: 'landmarks', label: 'Crie um Local Icônico', type: 'textarea', ph: 'Um lugar que todos conhecem pelo nome. Onde fica? O que o torna lendário?' },
    ],
    chips: ['Criar uma região com conflito', 'Sugerir nome para esta região', 'Desenvolver uma rota perigosa', 'Criar uma fronteira disputada'],
    guide: {
      min: 'O mapa é o alicerce visual do seu universo. Ele situa montanhas e rios, mas também guia a posição de cidades em lugares estratégicos.\n\nCrie regiões, rotas e locais icônicos — cada entrada pode virar uma ficha no Codex.',
      ref: '📖 Westeros (Game of Thrones)\n\nA construção de Westeros demonstra como a geografia dita a narrativa:\n\n• No Norte, o frio e a Muralha forjam um povo resistente. Em Dorne, o clima quente resulta em cultura mais liberal.\n\n• O Vale de Arryn é protegido por montanhas, criando sociedade isolada e defensiva.\n\n• O autor usou a fusão e inversão dos mapas do Reino Unido e Irlanda como base.',
      steps: [
        'Defina o conceito: fantasia, ficção científica ou histórico.',
        'Esboce a geografia geral: massas de terra, oceanos, rios e desertos.',
        'Crie regiões e reinos com fronteiras naturais.',
        'Marque cidades em locais estratégicos e trace rotas.',
        'Integre o mapa à narrativa: viagens, batalhas, comércio.',
      ],
      closing: 'Ao tomar deste fruto, o firmamento do seu Mundo será materializado.',
    },
  },
  {
    id: 1, num: '2º Fruto', name: 'Sistema Político', icon: '🏛',
    gradient: 'from-indigo-900 via-purple-900 to-blue-900',
    desc: 'Quem manda, como manda e por que alguém quer derrubar quem manda. Combustível de trama.',
    fields: [
      { id: 'govtype', label: 'Crie um Governo ou Facção', type: 'textarea', ph: 'Forma de governo ou facção política: como funciona, quem está no topo, como o poder é mantido.' },
      { id: 'conflict', label: 'Crie uma Tensão Política', type: 'textarea', ph: 'Algo prestes a explodir: segredo político, facção crescendo às sombras, lei reveladora do poder.' },
      { id: 'laws', label: 'Crie uma Lei ou Punição', type: 'textarea', ph: 'Uma lei que mostra como o poder realmente funciona. Ex: "Questionar a linhagem real em público é punido com a remoção da língua."' },
    ],
    chips: ['Criar um sistema de governo original', 'Desenvolver facção com agenda secreta', 'Gerar uma lei que revela o tom do poder', 'Criar uma conspiração política'],
    guide: {
      min: 'O sistema político define como o poder é distribuído, moldando conflitos e camadas sociais.\n\nCrie governos, facções e tensões — cada entrada enriquece o Codex.',
      ref: '📖 Diversidade de Poder\n\n• Monarquias (O Senhor dos Anéis): Gondor e Rohan, onde linhagem real é motor da esperança.\n\n• Impérios (Star Wars): Poder centralizado, opressão como norma.\n\n• Teocracias (Halo): Líderes religiosos com poder absoluto.',
      steps: [
        'Determine o tipo de governo: monarquia, república, teocracia ou misto.',
        'Defina a estrutura de poder e quem realmente manda.',
        'Crie leis fundamentais e sistema de justiça.',
        'Identifique intrigas internas e facções rivais.',
        'Defina se religião tem papel oficial no governo.',
      ],
      closing: 'Ao tomar deste fruto, os fios do destino começarão a se ordenar diante do caos.',
    },
  },
  {
    id: 2, num: '3º Fruto', name: 'Fatos Históricos', icon: '⚔',
    gradient: 'from-amber-900 via-red-900 to-orange-900',
    desc: 'História transforma seu mundo em consequência. O presente carrega marcas do passado.',
    fields: [
      { id: 'origin', label: 'Crie um Evento Histórico', type: 'textarea', ph: 'Um evento do passado que ainda marca o presente: fundação, guerra, queda ou descoberta.' },
      { id: 'turning', label: 'Crie uma Figura ou Relíquia', type: 'textarea', ph: 'Uma pessoa do passado cujo nome ainda move pessoas, ou um objeto/documento que sobreviveu ao tempo.' },
      { id: 'present', label: 'Crie o Ponto de Partida', type: 'textarea', ph: 'Em que momento da linha do tempo sua narrativa começa? O que acabou de acontecer que todos comentam?' },
    ],
    chips: ['Criar evento histórico fundador', 'Desenvolver relíquia com significado oculto', 'Expandir uma figura lendária', 'Conectar passado ao conflito presente'],
    guide: {
      min: 'Eventos passados moldam cultura, política e relações entre personagens e nações.\n\nCrie eventos, figuras e marcos temporais que dão profundidade ao mundo.',
      ref: '📖 "The Elder Scrolls" (Tamriel)\n\n• Eventos Fundadores: Guerras divinas que estabeleceram a cosmologia.\n\n• A "Grande Guerra" entre Império e Domínio Aldmeri gera repercussões diretas em Skyrim.\n\n• Tiber Septim tornou-se mito cujas ações são contadas gerações depois.',
      steps: [
        'Crie uma linha do tempo com fundação, guerras e catástrofes.',
        'Conecte tradições presentes a eventos passados.',
        'Introduza manuscritos e artefatos com significado especial.',
        'Crie heróis e vilões cujas linhagens ainda impactem o mundo.',
        'Integre fatos históricos em feriados e mitos.',
      ],
      closing: 'Ao tomar deste fruto, linhas do tempo são criadas e possibilidades se abrem.',
    },
  },
  {
    id: 3, num: '4º Fruto', name: 'Cultura', icon: '🎭',
    gradient: 'from-rose-900 via-pink-900 to-fuchsia-900',
    desc: 'Cultura é identidade: o que faz um povo parecer real e inesquecível.',
    fields: [
      { id: 'beliefs', label: 'Crie um Valor ou Ritual', type: 'textarea', ph: 'Um valor central, ritual ou festival que define a identidade desse povo. O que praticam vs. o que pregam?' },
      { id: 'customs', label: 'Crie um Tabu ou Costume', type: 'textarea', ph: 'Algo que esse povo simplesmente não faz — ou um detalhe cotidiano: vestuário, cumprimento, forma de tratar estranhos.' },
      { id: 'items', label: 'Crie um Item Cultural', type: 'textarea', ph: 'Vestimenta cerimonial, arma tradicional, instrumento musical ou artefato do cotidiano.' },
    ],
    chips: ['Criar valor com contradição oculta', 'Desenvolver ritual com significado profundo', 'Criar um tabu e suas consequências', 'Gerar cena que mostra a cultura em ação'],
    guide: {
      min: 'Uma cultura bem desenvolvida confere profundidade e autenticidade ao universo.\n\nCrie valores, rituais, tabus e itens que definam a identidade de cada povo.',
      ref: '📖 "Avatar: O Último Mestre do Ar"\n\n• Nação do Fogo: Hierarquia rígida, valoriza força e honra.\n\n• Tribo da Água: Comunidade e cooperação, espiritualidade com Lua e Água.\n\n• Nômades do Ar: Pacifistas, cultura focada no desapego.',
      steps: [
        'Defina como geografia e história influenciam a identidade.',
        'Desenvolva crenças, rituais e festivais centrais.',
        'Crie costumes de passagem: casamentos, funerais.',
        'Desenvolva arte, música e contos que refletem a visão de mundo.',
        'Integre cultura em diálogos e descrições concretas.',
      ],
      closing: 'Ao tomar deste fruto, povos e raças cantam e dançam ao redor da própria identidade.',
    },
  },
  {
    id: 4, num: '5º Fruto', name: 'Magia & Tecnologia', icon: '✨',
    gradient: 'from-violet-900 via-blue-900 to-cyan-900',
    desc: 'O que é possível — e impossível — no seu mundo. Magia e tecnologia criam tensão quando controladas por grupos diferentes.',
    fields: [
      { id: 'magictype', label: 'Tipo de Sistema', type: 'select', opts: ['Magia Dura (regras claras)', 'Magia Suave (misteriosa)', 'Híbrido Magia/Ciência'] },
      { id: 'magicrules', label: 'Crie uma Regra ou Tecnologia', type: 'textarea', ph: 'Uma regra do sistema mágico (custo, limite, risco) ou uma tecnologia/invenção do seu mundo.' },
      { id: 'magicitems', label: 'Crie um Item Mágico ou Tecnológico', type: 'textarea', ph: 'Arma encantada, artefato antigo, dispositivo tecnológico. Poder, origem e custo de uso.' },
    ],
    chips: ['Definir custo e limite de um feitiço', 'Criar item híbrido (tecnologia + magia)', 'Gerar conflito político sobre a magia', 'Desenvolver grupo que rejeita a magia'],
    guide: {
      min: 'Este fruto explora a balança entre forças místicas e conhecimento técnico.\n\nCrie regras mágicas, tecnologias e itens que definam os limites do possível.',
      ref: '📖 "Game of Thrones"\n\n• Tecnologia: Balistas, construção naval, Fogovivo como "híbrido".\n\n• Magia Suave: O Senhor da Luz — regras vagas, efeitos imprevisíveis.\n\n• Magia Dura: Vidro de dragão — propriedade clara e consistente contra White Walkers.',
      steps: [
        'Defina o nível tecnológico: Pedra, Medieval, Industrial ou futuro.',
        'Magia acessível a todos ou restrita a uma elite?',
        'Escolha: Dura (regras claras), Suave (misteriosa) ou mescla.',
        'Como magia e tecnologia se complementam ou conflitam?',
        'Integre na narrativa: origem da magia impulsiona a trama.',
      ],
      closing: 'Ao tomar deste fruto, fantasia e ciência dançam ao redor da existência.',
    },
  },
  {
    id: 5, num: '6º Fruto', name: 'Seres Fantásticos', icon: '🐉',
    gradient: 'from-emerald-900 via-green-900 to-teal-900',
    desc: 'Seres que mudam política, história e cultura. Bem construídos, sustentam tramas longas.',
    fields: [
      { id: 'races', label: 'Crie uma Criatura ou Raça', type: 'textarea', ph: 'Origem, aparência, papel no mundo. Como humanos lidam com ele: aliança, medo ou exploração?' },
      { id: 'origin2', label: 'Crie uma Origem ou Relação', type: 'textarea', ph: 'De onde veio esse ser? Como duas espécies se relacionam? Existe preconceito, guerra ou aliança?' },
    ],
    chips: ['Criar criatura com papel político', 'Desenvolver raça com cultura própria', 'Gerar conflito entre espécies', 'Criar ser cuja origem é mistério'],
    guide: {
      min: 'Seres fantásticos estão ligados à magia e tecnologia, mas podem existir sem magia explícita.\n\nCrie criaturas, raças e suas relações com o mundo.',
      ref: '📖 Diversidade e Mistério\n\n• Tolkien: Elfos imortais, Anões ferreiros, Ents, Nazgûl — cada raça com cultura própria.\n\n• Attack on Titan: Titãs como fusão de horror e mistério — humanos transformados.',
      steps: [
        'Defina o papel: aliados, antagonistas ou neutros.',
        'Origem: parte do mito fundador ou fruto de acontecimentos recentes?',
        'Características e habilidades coerentes com o sistema de magia.',
        'Cultura própria: linguagem, tradições e valores.',
        'Ajuste habilidades mantendo lógica interna.',
      ],
      closing: 'Ao tomar deste fruto, a vida fantástica se materializa diante de seus olhos.',
    },
  },
  {
    id: 6, num: '7º Fruto', name: 'Economia', icon: '💰',
    gradient: 'from-yellow-900 via-amber-900 to-orange-900',
    desc: 'Economia explica rotas, guerras, desigualdades e alianças do seu mundo.',
    fields: [
      { id: 'currency', label: 'Crie um Sistema ou Recurso', type: 'textarea', ph: 'Moeda, forma de troca ou recurso valioso. Quem controla? Onde fica? Por que é disputado?' },
      { id: 'classes', label: 'Crie uma Dinâmica Econômica', type: 'textarea', ph: 'Classes sociais, rotas comerciais ou mercado negro. Quem faz o trabalho pesado e quem lucra?' },
    ],
    chips: ['Criar recurso raro e quem o controla', 'Desenvolver rota comercial com perigos', 'Gerar crise econômica em andamento', 'Criar guilda com agenda própria'],
    guide: {
      min: 'A economia é moldada pela geografia e pelo sistema político.\n\nCrie moedas, recursos, classes e rotas que dão realismo ao mundo.',
      ref: '📖 "O Nome do Vento" (Patrick Rothfuss)\n\n• A Universidade cobra mensalidades — dinheiro é pré-requisito para conhecimento.\n\n• A luta contra dívidas humaniza o protagonista.',
      steps: [
        'Quais recursos são abundantes ou escassos?',
        'Sistema econômico: feudalismo, mercado livre ou original?',
        'Tipo de moeda, impostos e sistema bancário.',
        'Como a riqueza é distribuída entre classes?',
        'Rotas comerciais por terra, mar ou ar.',
      ],
      closing: 'Ao tomar deste fruto, moedas de ouro cintilam e sibilam: o bem e o mal lutam por poder.',
    },
  },
  {
    id: 7, num: '8º Fruto', name: 'Linguagem', icon: '📜',
    gradient: 'from-stone-900 via-neutral-900 to-zinc-900',
    desc: 'Consistência de nomes, termos e expressões que fazem o mundo parecer real.',
    fields: [
      { id: 'languages', label: 'Crie um Padrão Fonético', type: 'textarea', ph: 'Sons que caracterizam os nomes de um povo. 2-3 regras. Ex: "Nomes do norte terminam em consoante curta (Varn, Aste)."' },
      { id: 'writing', label: 'Crie Termos ou Expressões', type: 'textarea', ph: 'Saudação, insulto, título ou expressão idiomática com significado cultural. Ex: "Que o fogo te encontre antes do frio."' },
    ],
    chips: ['Criar padrão fonético para um povo', 'Gerar termos culturais com significado', 'Criar expressão idiomática reveladora', 'Desenvolver variação de dialeto'],
    guide: {
      min: 'A linguagem diferencia tradições e culturas de forma autêntica.\n\nCrie padrões fonéticos, termos e expressões que dão voz ao seu mundo.',
      ref: '📖 Tolkien (O Senhor dos Anéis)\n\n• Quenya: Língua antiga dos Altos Elfos, cerimonial.\n• Sindarin: Língua élfica mais falada.\n• Khuzdul: Língua secreta dos Anões.',
      steps: [
        'Defina o propósito: língua sagrada, comum ou código?',
        'Escolha uma base fonética inspirada em idiomas reais.',
        'Comece por palavras essenciais e expanda conforme necessário.',
        'O idioma deve refletir geografia e valores do povo.',
      ],
      closing: 'Ao tomar deste fruto, palavras ganham vida e culturas recebem a voz de muitas almas.',
    },
  },
  {
    id: 8, num: '9º Fruto', name: 'Mitologia', icon: '🌟',
    gradient: 'from-sky-900 via-indigo-900 to-violet-900',
    desc: 'Origem, propósito e destino do mundo. Explica o inexplicável e gera conflito.',
    fields: [
      { id: 'gods', label: 'Crie uma Divindade ou Mito', type: 'textarea', ph: 'Um deus, espírito ou mito de criação: domínio, personalidade, como influencia a vida real.' },
      { id: 'afterlife', label: 'Crie uma Crença ou Relíquia', type: 'textarea', ph: 'Crença sobre o pós-morte, prática religiosa cotidiana, ou objeto/lugar sagrado disputado.' },
    ],
    chips: ['Criar mito de criação com tom moral', 'Desenvolver heresia e seus seguidores', 'Gerar profecia que move a trama', 'Criar relíquia com disputa política'],
    guide: {
      min: 'A mitologia dá sentido aos fenômenos naturais e estabelece valores fundamentais.\n\nCrie divindades, mitos, crenças e relíquias sagradas.',
      ref: '📖 Mitologia Nórdica\n\n• O Início (Ginnungagap): Surgimento do vazio primordial.\n\n• O Fim (Ragnarök): Destruição e renovação cíclica.\n\n• Odin e as Nornas explicam destino e bravura.',
      steps: [
        'Crie o mito de origem e as forças criadoras.',
        'Use lendas para explicar fenômenos naturais.',
        'Como histórias de deuses reforçam certo/errado.',
        'Trace o prelúdio do fim: profecia de destruição ou renovação.',
      ],
      closing: 'Ao tomar deste fruto, o destino do seu mundo estará traçado nas linhas da eternidade.',
    },
  },
  {
    id: 9, num: '10º Fruto', name: 'Personagens', icon: '👤',
    gradient: 'from-slate-900 via-gray-900 to-zinc-900',
    desc: 'O ponto de contato do leitor com o mundo. Nascem dele e também o transformam.',
    fields: [
      { id: 'protagonist', label: 'Crie um Protagonista ou Antagonista', type: 'textarea', ph: 'O que quer, o que teme, qual ferida do passado distorce sua visão. Virtude + falha + decisão difícil.' },
      { id: 'supporting', label: 'Crie um Aliado, Rival ou Arco', type: 'textarea', ph: 'Um aliado que questiona, um rival que espelha, ou um arco de transformação: como começa e termina.' },
    ],
    chips: ['Desenvolver a ferida do protagonista', 'Criar antagonista que o leitor quase defende', 'Gerar conflito entre aliados', 'Definir arco de transformação'],
    guide: {
      min: 'Personagens bem construídos tornam a história inesquecível.\n\nCrie protagonistas, antagonistas e aliados — cada um pode virar uma ficha no Codex.',
      ref: '📖 "Personagens Cinzas" (George R. R. Martin)\n\nSeres que não são puramente bons ou maus. Heróis cometem erros terríveis, vilões são capazes de amar.',
      steps: [
        'Defina 3 qualidades admiráveis e 3 falhas graves.',
        'Quais eventos do passado moldaram a personalidade?',
        'Como se comporta sob estresse?',
        'Como as decisões dele influenciam a história?',
      ],
      closing: 'Ao tomar deste fruto, a alma do seu mundo despertará através dos olhos de quem o habita.',
    },
  },
  {
    id: 10, num: 'Último Fruto', name: 'A Sua Narrativa', icon: '🌳',
    gradient: 'from-blue-900 via-indigo-900 to-purple-900',
    desc: 'Conecte tudo em história. O mundo age sobre as pessoas e elas causam reação em cadeia.',
    fields: [
      { id: 'premise', label: 'Crie a Premissa e Tema', type: 'textarea', ph: 'Quem é o protagonista, o que quer, o que o impede. E a pergunta central: "Até onde a lealdade justifica a traição?"' },
      { id: 'tone', label: 'Tom, Gênero e Cena de Abertura', type: 'textarea', ph: 'Dark fantasy épico? Aventura com humor ácido? Onde e como começa? A primeira cena deve criar uma pergunta.' },
    ],
    chips: ['Escrever a premissa em uma frase', 'Definir a pergunta-tema', 'Criar a cena de abertura', 'Gerar sinopse de 3 parágrafos'],
    guide: {
      min: 'O último pilar une todos os frutos, transformando cenário em "Mundo Autorregente".\n\nCrie premissa, tema, tom e a cena que abre sua história.',
      ref: '📖 O "Mundo Autorregente"\n\n• Servidão do Cenário: O mapa e as leis devem servir à história.\n\n• Show, Don\'t Tell: Exponha personagens ao mundo e descreva reações.\n\n• O leitor descobre o mundo organicamente, pelas ações.',
      steps: [
        'Mapa e leis devem servir à história, não ao contrário.',
        'Show, Don\'t Tell: personagens reagem ao mundo.',
        'Integre todos os Frutos em diálogo.',
        'Não construa o que ainda não é necessário.',
      ],
      closing: 'Ao tomar deste fruto, a sua voz ecoará por mundos que agora possuem vida própria.',
    },
  },
];

// Fruit names for gallery cataloging
export const FRUIT_CATEGORIES = FRUITS.map(f => `Fruto: ${f.name}`);

export const CATEGORIES = [
  'Todos', ...GALLERY_CATEGORIES, ...FRUIT_CATEGORIES
];

// Top-down: world → details → characters (default order)
export const TOP_DOWN_ORDER = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// Bottom-up: characters → local → expand world
export const BOTTOM_UP_ORDER = [9, 10, 0, 3, 4, 5, 8, 2, 1, 6, 7];

export function getOrderedFruits(method: MethodType): Fruit[] {
  const order = method === 'top-down' ? TOP_DOWN_ORDER : BOTTOM_UP_ORDER;
  return order.map(id => FRUITS[id]);
}

export const METHOD_DESCRIPTIONS: Record<MethodType, { title: string; desc: string }> = {
  'top-down': {
    title: '⬇ Cima para Baixo',
    desc: 'Começa pela visão geral — continentes, nações, história — e vai detalhando até personagens e cenas.',
  },
  'bottom-up': {
    title: '⬆ Baixo para Cima',
    desc: 'Começa pelos personagens e um local central, expandindo o mundo conforme a história exige.',
  },
};

export const STYLE_OPTIONS = [
  'Fantasy épico (estilo Tolkien)', 'Dark Fantasy (sombrio)', 'Anime / Mangá',
  'Realista / Fotográfico', 'Ilustração medieval', 'Concept art de videogame',
  'Aquarela / Arte digital', 'Steampunk', 'Horror cósmico',
];

export const IMAGE_TYPE_OPTIONS = [
  'Cenário / Paisagem', 'Personagem (corpo inteiro)', 'Retrato de personagem',
  'Criatura / Monstro', 'Objeto / Artefato mágico', 'Cidade / Arquitetura',
  'Batalha / Cena de ação', 'Mapa / Cartografia',
];

export const TONE_OPTIONS = [
  'Épico e grandioso', 'Sombrio e ominoso', 'Místico e etéreo',
  'Quente e acolhedor', 'Frio e desolado', 'Dramático (luz e sombra)',
];
