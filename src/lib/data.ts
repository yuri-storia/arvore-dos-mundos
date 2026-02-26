export interface FruitField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select';
  ph?: string;
  opts?: string[];
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
}

export interface GalleryImage {
  id: string;
  src: string;
  name: string;
  cat: string;
}

export type MethodType = 'top-down' | 'bottom-up';
export type TabType = 'construir' | 'visao-geral' | 'galeria' | 'gerar-imagens';

export interface AppState {
  worldName: string;
  db: Record<number, Record<string, string>>;
  currentFruit: number;
  method: MethodType;
  gallery: GalleryImage[];
  activeTab: TabType;
  apiKey: string;
  generatedPrompt: string;
}

export const CATEGORIES = [
  'Todos', 'Geral', 'Mapa do Mundo', 'Personagens', 'Criaturas',
  'Arquitetura', 'Paisagens', 'Artefatos', 'Cultura'
];

export const FRUITS: Fruit[] = [
  {
    id: 0, num: '1º Fruto', name: 'Mapa do Mundo', icon: '🗺',
    gradient: 'from-blue-900 via-cyan-900 to-teal-900',
    desc: 'Geografia, topografia e estrutura física do seu universo.',
    fields: [
      { id: 'continents', label: 'Continentes & Regiões', type: 'textarea', ph: 'Descreva os principais continentes, ilhas ou regiões…' },
      { id: 'climate', label: 'Clima & Biomas', type: 'text', ph: 'Ex: tropical ao sul, tundra ao norte…' },
      { id: 'landmarks', label: 'Locais Icônicos', type: 'textarea', ph: 'Montanhas, rios, cidades lendárias, portais, ruínas…' },
      { id: 'scale', label: 'Escala & Distâncias', type: 'text', ph: 'Tamanho do mundo, dias de viagem entre capitais…' },
    ],
    chips: ['Expandir geografia', 'Criar locais únicos', 'Sugerir nomes', 'Conflitos geográficos'],
  },
  {
    id: 1, num: '2º Fruto', name: 'Sistema Político', icon: '🏛',
    gradient: 'from-indigo-900 via-purple-900 to-blue-900',
    desc: 'Como o poder é distribuído e exercido no seu mundo.',
    fields: [
      { id: 'govtype', label: 'Forma de Governo', type: 'text', ph: 'Ex: monarquia absoluta, república teocrática…' },
      { id: 'factions', label: 'Facções & Potências', type: 'textarea', ph: 'Reinos, impérios, guildas, clãs…' },
      { id: 'conflict', label: 'Tensões Políticas', type: 'textarea', ph: 'Guerras, disputas territoriais, intrigas…' },
      { id: 'laws', label: 'Leis & Tabus', type: 'text', ph: 'O que é proibido? Quais direitos existem?…' },
    ],
    chips: ['Criar intrigas', 'Definir hierarquias', 'Conflitos de poder', 'Desenvolver facções'],
  },
  {
    id: 2, num: '3º Fruto', name: 'Fatos Históricos', icon: '⚔',
    gradient: 'from-amber-900 via-red-900 to-orange-900',
    desc: 'O alicerce que sustenta toda a narrativa atual.',
    fields: [
      { id: 'origin', label: 'Era Primordial & Origem', type: 'textarea', ph: 'Como tudo começou? Houve uma era dourada?…' },
      { id: 'wars', label: 'Guerras & Impérios Caídos', type: 'textarea', ph: 'Conflitos que moldaram o presente…' },
      { id: 'turning', label: 'Eventos Decisivos', type: 'textarea', ph: 'O que mudou o curso da história?…' },
      { id: 'present', label: 'Estado Atual', type: 'text', ph: 'Em que ponto histórico a história começa?…' },
    ],
    chips: ['Criar linha do tempo', 'Gerar eventos', 'Aprofundar eras', 'Mitos históricos'],
  },
  {
    id: 3, num: '4º Fruto', name: 'Cultura', icon: '🎭',
    gradient: 'from-rose-900 via-pink-900 to-fuchsia-900',
    desc: 'Crenças, tradições, arte, língua e costumes dos povos.',
    fields: [
      { id: 'beliefs', label: 'Crenças & Valores', type: 'textarea', ph: 'O que é sagrado? O que é tabu?…' },
      { id: 'arts', label: 'Arte, Música & Literatura', type: 'text', ph: 'Que formas de arte existem?…' },
      { id: 'customs', label: 'Costumes & Ritos', type: 'textarea', ph: 'Nascimento, morte, casamento, guerra…' },
      { id: 'food', label: 'Gastronomia & Vestuário', type: 'text', ph: 'O que comem? Como se vestem?…' },
    ],
    chips: ['Criar tradições', 'Desenvolver rituais', 'Conflitos culturais', 'Aprofundar costumes'],
  },
  {
    id: 4, num: '5º Fruto', name: 'Magia & Tecnologia', icon: '✨',
    gradient: 'from-violet-900 via-blue-900 to-cyan-900',
    desc: 'Forças sobrenaturais e conhecimento científico.',
    fields: [
      { id: 'magictype', label: 'Tipo de Sistema', type: 'select', opts: ['Magia Dura (regras claras)', 'Magia Suave (misteriosa)', 'Híbrido Magia/Ciência'] },
      { id: 'magicrules', label: 'Regras & Limites', type: 'textarea', ph: 'Como se acessa? Qual o custo? O que é impossível?…' },
      { id: 'tech', label: 'Nível Tecnológico', type: 'text', ph: 'Ex: medieval, steampunk, cristais mágicos…' },
      { id: 'magictech', label: 'Magia × Tecnologia', type: 'textarea', ph: 'Conflitam? Coexistem?…' },
    ],
    chips: ['Criar sistema de magia', 'Definir poderes', 'Balancear limitações', 'Integrar à história'],
  },
  {
    id: 5, num: '6º Fruto', name: 'Seres Fantásticos', icon: '🐉',
    gradient: 'from-emerald-900 via-green-900 to-teal-900',
    desc: 'Criaturas, raças e entidades que habitam o universo.',
    fields: [
      { id: 'races', label: 'Raças Inteligentes', type: 'textarea', ph: 'Elfos, anões, criaturas originais…' },
      { id: 'creatures', label: 'Criaturas & Bestiário', type: 'textarea', ph: 'Monstros, animais fantásticos, espíritos…' },
      { id: 'origin2', label: 'Origem dos Seres', type: 'text', ph: 'Foram criados pelos deuses? Evoluíram?…' },
      { id: 'relations', label: 'Relações entre Espécies', type: 'textarea', ph: 'Aliados, inimigos, neutros…' },
    ],
    chips: ['Criar criatura', 'Desenvolver raça', 'Gerar lendas', 'Conflitos entre espécies'],
  },
  {
    id: 6, num: '7º Fruto', name: 'Economia', icon: '💰',
    gradient: 'from-yellow-900 via-amber-900 to-orange-900',
    desc: 'O sistema econômico que movimenta a sociedade.',
    fields: [
      { id: 'currency', label: 'Moeda & Comércio', type: 'text', ph: 'Que moeda usam? Principal mercadoria?…' },
      { id: 'resources', label: 'Recursos & Produção', type: 'textarea', ph: 'O que é raro? Quem controla?…' },
      { id: 'classes', label: 'Classes Sociais', type: 'textarea', ph: 'Como a riqueza é distribuída?…' },
      { id: 'trade', label: 'Rotas Comerciais', type: 'text', ph: 'Cidades comerciais, rotas, cartéis…' },
    ],
    chips: ['Sistema econômico', 'Conflitos por recursos', 'Classes sociais', 'Criar guildas'],
  },
  {
    id: 7, num: '8º Fruto', name: 'Linguagem', icon: '📜',
    gradient: 'from-stone-900 via-neutral-900 to-zinc-900',
    desc: 'Idiomas, escrita e comunicação que tornam o mundo crível.',
    fields: [
      { id: 'languages', label: 'Idiomas Principais', type: 'text', ph: 'Quantos idiomas? Língua franca?…' },
      { id: 'writing', label: 'Sistemas de Escrita', type: 'text', ph: 'Alfabeto, runas, hieróglifos…' },
      { id: 'words', label: 'Vocabulário Único', type: 'textarea', ph: 'Palavras e expressões inventadas…' },
      { id: 'dialects', label: 'Dialetos & Sotaques', type: 'text', ph: 'Como varia por região ou raça?…' },
    ],
    chips: ['Criar palavras', 'Desenvolver idioma', 'Gerar nomes', 'Criar escrita'],
  },
  {
    id: 8, num: '9º Fruto', name: 'Mitologia', icon: '🌟',
    gradient: 'from-sky-900 via-indigo-900 to-violet-900',
    desc: 'Deuses, criação e o significado sagrado do universo.',
    fields: [
      { id: 'gods', label: 'Panteão & Divindades', type: 'textarea', ph: 'Quais deuses existem? Domínios e rivalidades?…' },
      { id: 'creation', label: 'Mito da Criação', type: 'textarea', ph: 'Como o mundo foi criado?…' },
      { id: 'afterlife', label: 'Vida Após a Morte', type: 'text', ph: 'Para onde vão as almas?…' },
      { id: 'sacred', label: 'Textos & Artefatos Sagrados', type: 'textarea', ph: 'Livros sagrados, relíquias, templos…' },
    ],
    chips: ['Mito de criação', 'Desenvolver panteão', 'Gerar profecias', 'Criar religião'],
  },
  {
    id: 9, num: '10º Fruto', name: 'Personagens', icon: '👤',
    gradient: 'from-slate-900 via-gray-900 to-zinc-900',
    desc: 'Os olhos do leitor — o coração da história.',
    fields: [
      { id: 'protagonist', label: 'Protagonista(s)', type: 'textarea', ph: 'Nome, origem, motivação, conflito interno…' },
      { id: 'antagonist', label: 'Antagonista', type: 'textarea', ph: 'Quem ou o que se opõe? Por quê?…' },
      { id: 'supporting', label: 'Personagens de Suporte', type: 'textarea', ph: 'Aliados, mentores, rivais…' },
      { id: 'arcs', label: 'Arcos de Transformação', type: 'text', ph: 'Como cada personagem muda?…' },
    ],
    chips: ['Desenvolver personagem', 'Criar backstory', 'Conflito interno', 'Aprofundar antagonista'],
  },
  {
    id: 10, num: 'Último Fruto', name: 'A Sua Narrativa', icon: '🌳',
    gradient: 'from-blue-900 via-indigo-900 to-purple-900',
    desc: 'O mundo é o palco — a sua história é o que importa.',
    fields: [
      { id: 'premise', label: 'Premissa Central', type: 'textarea', ph: 'Em uma frase: do que trata sua história?…' },
      { id: 'theme', label: 'Temas & Mensagem', type: 'textarea', ph: 'O que você quer explorar?…' },
      { id: 'tone', label: 'Tom & Gênero', type: 'text', ph: 'Ex: dark fantasy épico, aventura leve…' },
      { id: 'hook', label: 'A Cena de Abertura', type: 'textarea', ph: 'Como sua história começa?…' },
    ],
    chips: ['Desenvolver premissa', 'Primeiro capítulo', 'Refinar conflito', 'Gerar sinopse'],
  },
];

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
