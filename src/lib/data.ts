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
    desc: 'O mapa é o chão do seu universo. Ele guia a criação, aumenta a imersão e conecta geografia, cultura, história e conflito num único olhar.',
    fields: [
      { id: 'continents', label: 'Crie uma Região', type: 'textarea', ph: 'Descreva uma região do seu mundo com clima, terreno e identidade. Ex: "Serra dos Véus — montanhosa, fria, isolada por neblina eterna. Abriga monastérios antigos e trilhas traiçoeiras."' },
      { id: 'climate', label: 'Crie uma Rota', type: 'textarea', ph: 'Descreva uma rota importante — comercial, militar ou de peregrinação. Quem a controla? Por que ela é disputada? O que acontece com quem viaja por ela?' },
      { id: 'landmarks', label: 'Crie uma Fronteira de Tensão', type: 'textarea', ph: 'Descreva uma fronteira onde o conflito é inevitável. Ex: "O Rio Kael separa o Império do norte dos reinos livres do sul — travessia é proibida após o pôr do sol."' },
      { id: 'scale', label: 'Crie um Local Icônico', type: 'textarea', ph: 'Descreva um lugar que todos conhecem pelo nome, mesmo que nunca tenham visto. Onde fica? O que o torna lendário? Que histórias contam sobre ele?' },
    ],
    chips: ['Criar uma região com conflito interno', 'Sugerir nome para esta região', 'Desenvolver uma rota perigosa', 'Criar uma fronteira disputada'],
    guide: {
      min: 'O mapa é o alicerce visual do seu universo. Ele não apenas situa montanhas e rios, mas serve como um guia vital para compreender a geografia e a topografia, ajudando a posicionar cidades em lugares estratégicos. É a ferramenta que permite materializar o firmamento do seu Mundo.\n\nUse os campos abaixo para criar, um por vez, as regiões, rotas, fronteiras e locais icônicos do seu mapa. Cada entrada pode ser salva como uma ficha no Codex.',
      ref: '📖 Westeros (Game of Thrones)\n\nA construção de Westeros demonstra como a geografia dita a narrativa:\n\n• Influência Geográfica e Cultural: No Norte, o frio intenso e a Muralha forjam um povo resistente focado na sobrevivência. Em Dorne, o clima quente e o isolamento resultam em uma cultura mais liberal e descontraída.\n\n• Geografia Defensiva: O Vale de Arryn é protegido por montanhas imponentes, o que cria uma sociedade isolada e defensiva, impedindo invasões externas.\n\n• Inspiração Real: O autor utilizou a fusão e inversão dos mapas do Reino Unido e da Irlanda como base para o continente, transformando elementos reais em ficção.',
      steps: [
        'Defina o Conceito: Estabeleça se o cenário é de fantasia, ficção científica ou histórico, e se será semelhante à Terra ou alienígena.',
        'Esboce a Geografia Geral: Desenhe o contorno das massas de terra e oceanos. Adicione elementos naturais como rios e desertos, pois eles moldarão a cultura futura.',
        'Desenvolva Climas e Biomas: Defina zonas climáticas (quentes perto do equador, frias nos polos) e adicione biomas como tundras ou savanas.',
        'Crie Regiões e Reinos: Divida o mapa usando fronteiras naturais (rios e montanhas) e dê nomes que reflitam a língua local.',
        'Cidades e Rotas de Comércio: Marque cidades em locais estratégicos e trace as rotas que as conectam, pois isso define a economia e a política regional.',
        'Integração Narrativa: O mapa deve orientar a viagem dos personagens e o planejamento de batalhas.',
      ],
      closing: 'Ao tomar deste fruto, o firmamento do seu Mundo será materializado.',
    },
  },
  {
    id: 1, num: '2º Fruto', name: 'Sistema Político', icon: '🏛',
    gradient: 'from-indigo-900 via-purple-900 to-blue-900',
    desc: 'Quem manda, como manda e por que alguém quer derrubar quem manda. Isso é combustível de trama — cria conflito antes mesmo de você escrever a primeira cena.',
    fields: [
      { id: 'govtype', label: 'Crie um Governo', type: 'textarea', ph: 'Descreva uma forma de governo do seu mundo. Como funciona? Quem está no topo? O poder é herdado, eleito ou conquistado? Ex: "Império teocrático onde o sumo-sacerdote governa até a morte."' },
      { id: 'factions', label: 'Crie uma Facção Política', type: 'textarea', ph: 'Descreva uma facção: o que querem, como operam e quem são seus inimigos. Ex: "A Ordem da Chama quer manter o Rei e elimina dissidentes com assassinos sagrados."' },
      { id: 'conflict', label: 'Crie uma Tensão Política', type: 'textarea', ph: 'Descreva algo que está prestes a explodir. Qual segredo político, se revelado, mudaria tudo? Qual facção está crescendo às sombras?' },
      { id: 'laws', label: 'Crie uma Lei Reveladora', type: 'textarea', ph: 'Descreva uma lei ou punição que mostra como o poder realmente funciona. Ex: "Questionar a linhagem real em público é punido com a remoção da língua — mas nunca da vida. Mártires são mais perigosos do que críticos."' },
    ],
    chips: ['Criar um sistema de governo original', 'Desenvolver uma facção com agenda secreta', 'Gerar uma lei que revela o tom do poder', 'Criar uma conspiração política'],
    guide: {
      min: 'O sistema político define como o poder é distribuído e exercido, moldando profundamente os conflitos e as camadas sociais do mundo. É o fruto que ordena o caos e define os fios do destino da sua sociedade.\n\nUse os campos abaixo para criar, um por vez, governos, facções, tensões e leis do seu mundo político.',
      ref: '📖 Diversidade de Poder\n\nPara criar tramas complexas, inspire-se em diferentes modelos:\n\n• Monarquias (O Senhor dos Anéis): Gondor (monarquia hereditária centralizada) e Rohan (povo guerreiro com independência própria), onde a linhagem real é motor da esperança ou tensão política.\n\n• Repúblicas (Roma Antiga): Senado controlava política externa e finanças; Magistrados executavam funções; Assembleias aprovavam leis e elegiam líderes.\n\n• Impérios e Ditaduras (Star Wars): Poder centralizado na figura de um imperador, onde a opressão é norma e o governo serve como grande antagonista.\n\n• Teocracias (Halo): No "Covenant", líderes religiosos detêm poder absoluto, ditando leis e lançando campanhas militares baseadas na fé.',
      steps: [
        'Determine o Tipo de Governo: Escolha entre monarquia, república, ditadura, teocracia ou uma mistura original.',
        'Defina a Estrutura de Poder: O poder é de um único líder ou conselho? É herdado, eleito ou conquistado por força?',
        'Estratificação Social: Estabeleça as classes (nobres, plebeus, castas) e se existe mobilidade entre elas.',
        'Crie Leis e Justiça: Desenvolva as leis fundamentais e defina as punições. O sistema de justiça é formal ou comunitário?',
        'Relações e Conflitos: Identifique intrigas políticas internas e como o governo lida com outras nações.',
        'Influência Religiosa: Defina se a religião tem papel oficial no governo ou se líderes espirituais possuem influência política direta.',
      ],
      closing: 'Ao tomar deste fruto, os fios do destino começarão a se ordenar diante do caos.',
    },
  },
  {
    id: 2, num: '3º Fruto', name: 'Fatos Históricos', icon: '⚔',
    gradient: 'from-amber-900 via-red-900 to-orange-900',
    desc: 'História é o que transforma seu mundo em consequência, não invenção aleatória. O presente deve carregar marcas do passado — guerras, catástrofes, descobertas que ainda sangram.',
    fields: [
      { id: 'origin', label: 'Crie um Evento Histórico', type: 'textarea', ph: 'Descreva um evento do passado que ainda marca o presente. Pode ser uma fundação, guerra, queda ou descoberta. O que aconteceu e qual cicatriz ele deixou no mundo atual?' },
      { id: 'wars', label: 'Crie uma Relíquia ou Documento', type: 'textarea', ph: 'Descreva um objeto ou texto que sobreviveu ao passado. Ex: "O Tratado de Cinzas proíbe exércitos acima de mil homens. Ninguém sabe quem o está violando primeiro."' },
      { id: 'turning', label: 'Crie uma Figura Histórica', type: 'textarea', ph: 'Descreva uma pessoa do passado cujo nome ainda move pessoas. É celebrada, temida ou mal compreendida? O que realmente fez versus o que a lenda diz?' },
      { id: 'present', label: 'Crie o Ponto de Partida', type: 'textarea', ph: 'Em que momento da linha do tempo sua narrativa começa? O que acabou de acontecer que todos comentam — e que ninguém ainda entendeu completamente?' },
    ],
    chips: ['Criar um evento histórico fundador', 'Desenvolver uma relíquia com significado oculto', 'Expandir uma figura lendária', 'Conectar o passado ao conflito presente'],
    guide: {
      min: 'A história de um mundo fictício é o alicerce que sustenta a narrativa atual. Eventos passados não são apenas "fatos" — eles moldam a cultura, a política e as relações entre personagens e nações, criando um pano de fundo coerente. Desenvolver um "lore" sólido une informações, tradições, lendas e crenças que dão profundidade à obra.\n\nUse os campos abaixo para criar, um por vez, eventos, relíquias, figuras históricas e marcos temporais.',
      ref: '📖 "The Elder Scrolls" (Tamriel)\n\nA série é um exemplo de como o lore detalhado dita o contexto dos eventos imediatos:\n\n• Eventos Fundadores: A história de Tamriel começa com a criação do mundo pelos deuses e as guerras divinas que se seguiram, estabelecendo a cosmologia.\n\n• Guerras e Conflitos: A "Grande Guerra" entre o Império e o Domínio Aldmeri gera repercussões políticas e sociais diretas em Skyrim.\n\n• Ciclos de Poder: A ascensão e queda do Império Septim ilustra a luta contínua pelo controle e a fragmentação histórica.\n\n• Inovações e Tragédias: Descobertas como o Aetherium impulsionaram avanços e conflitos; catástrofes como a Praga Knahaten dizimaram populações.\n\n• Figuras Lendárias: Tiber Septim tornou-se mito cujas ações são contadas em livros e canções gerações depois.',
      steps: [
        'Desenvolva a Cronologia: Crie uma linha do tempo com fundação do mundo, guerras, quedas de reinos e catástrofes naturais.',
        'Conecte à Narrativa Atual: Determine quais tradições ou conflitos presentes foram moldados por esses eventos passados.',
        'Crie Documentos e Relíquias: Introduza manuscritos e artefatos (armas lendárias, coroas) com significado especial.',
        'Desenvolva Personagens Históricos: Crie heróis e vilões cujas linhagens ou ações ainda impactem o mundo.',
        'Adapte à Cultura e Religião: Integre fatos históricos em feriados, celebrações e mitos religiosos.',
        'Inspire-se no Mundo Real: Estude revoluções, coroações e batalhas para trazer verossimilhança.',
      ],
      closing: 'Ao tomar deste fruto, linhas do tempo são criadas e possibilidades se abrem.',
    },
  },
  {
    id: 3, num: '4º Fruto', name: 'Cultura', icon: '🎭',
    gradient: 'from-rose-900 via-pink-900 to-fuchsia-900',
    desc: 'Cultura é identidade: o que faz um povo parecer real. No template, você vai transformar "povo genérico" em "povo inesquecível" — o tipo que o leitor reconhece antes mesmo de ler o nome.',
    fields: [
      { id: 'beliefs', label: 'Crie um Valor Central', type: 'textarea', ph: 'Descreva um valor que esse povo preza acima de tudo. O que dizem que valorizam vs. o que realmente praticam? Ex: "Honra em combate (discurso) + acumulação de terra por qualquer meio (prática)."' },
      { id: 'arts', label: 'Crie um Ritual', type: 'textarea', ph: 'Descreva um ritual — pode ser público (reforça identidade coletiva) ou íntimo (revela o que a cultura esconde). Ex: "Festival da Primeira Neve (público) — três dias de combates cerimoniais e banquetes nas ruas."' },
      { id: 'customs', label: 'Crie um Tabu', type: 'textarea', ph: 'Descreva algo que esse povo simplesmente não faz — e que revela muito sobre quem eles são. O que acontece com quem viola? Ex: "Nunca se menciona o nome de um morto por 40 dias. Quem viola traz o luto de volta."' },
      { id: 'food', label: 'Crie um Detalhe Cotidiano', type: 'textarea', ph: 'Descreva como essa cultura aparece no dia a dia: vestuário, cumprimento, forma de comer, de tratar estranhos. Se você consegue ver e ouvir esse povo, a cultura está viva.' },
    ],
    chips: ['Criar um valor com contradição oculta', 'Desenvolver um ritual com significado profundo', 'Criar um tabu e suas consequências', 'Gerar uma cena que mostra a cultura em ação'],
    guide: {
      min: 'A cultura é um dos aspectos mais ricos do worldbuilding, pois engloba crenças, tradições, arte, língua e costumes que definem a identidade de um povo. Uma cultura bem desenvolvida confere profundidade e autenticidade ao universo. Ela pode ser influenciada pela geografia, fatos históricos e sistemas políticos.\n\nUse os campos abaixo para criar, um por vez, valores, rituais, tabus e detalhes cotidianos.',
      ref: '📖 "Avatar: O Último Mestre do Ar"\n\nA série exemplifica como diferentes culturas podem coexistir, cada uma moldada por sua filosofia e ambiente:\n\n• Nação do Fogo: Estrutura hierárquica rígida e autocrática. Valoriza força, honra e disciplina, com rituais como o Festival do Solstício de Verão.\n\n• Tribo da Água: Valoriza comunidade e cooperação. Espiritualidade centralizada nos espíritos da Lua e da Água.\n\n• Reino da Terra: Conhecido pela resiliência e adaptabilidade. Destaca-se por grandes obras de engenharia como Ba Sing Se.\n\n• Nômades do Ar: Pacifistas que vivem em harmonia com a natureza. Cultura focada no desapego, meditação e iluminação espiritual.',
      steps: [
        'Defina as Bases Culturais: Como geografia e história influenciam a identidade do povo.',
        'Desenvolva Crenças e Valores: Deuses, rituais, festivais e valores éticos centrais.',
        'Crie Costumes e Tradições: Rituais de passagem (casamentos, funerais), alimentos típicos.',
        'Desenvolva Arte e Literatura: Estilos musicais, danças e contos que refletem a visão de mundo.',
        'Estabeleça Língua e Dialetos: Vocabulário principal e dialetos regionais.',
        'Defina a Estrutura Social: Classes, papel de gênero e mobilidade social.',
        'Integre na Narrativa: Use cultura em diálogos e descrições concretas.',
      ],
      closing: 'Ao tomar deste fruto, povos e raças cantam e dançam ao redor da própria identidade.',
    },
  },
  {
    id: 4, num: '5º Fruto', name: 'Magia & Tecnologia', icon: '✨',
    gradient: 'from-violet-900 via-blue-900 to-cyan-900',
    desc: 'Aqui você define o que é possível no seu mundo — e o que é impossível. Magia e tecnologia se influenciam, se chocam e criam tensão política quando controladas por grupos diferentes.',
    fields: [
      { id: 'magictype', label: 'Tipo de Sistema', type: 'select', opts: ['Magia Dura (regras claras)', 'Magia Suave (misteriosa)', 'Híbrido Magia/Ciência'] },
      { id: 'magicrules', label: 'Crie uma Regra de Magia', type: 'textarea', ph: 'Descreva uma regra do seu sistema mágico: o custo, o limite e o risco. O que se perde ao usá-la — energia, vida, sanidade, fé? Ex: "Cada feitiço consome uma memória — quanto mais poderoso, mais preciosa a lembrança perdida."' },
      { id: 'tech', label: 'Crie uma Tecnologia', type: 'textarea', ph: 'Descreva uma tecnologia ou invenção do seu mundo. Qual o equivalente histórico? Usa magia como combustível ou a substitui? Ex: "Balistas movidas a vapor que caçam magos desertores."' },
      { id: 'magictech', label: 'Crie uma Tensão entre Magia e Tecnologia', type: 'textarea', ph: 'Descreva como magia e tecnologia colidem ou se fundem. Existe grupo que rejeita uma em favor da outra? Quem se beneficia se a magia sumir?' },
    ],
    chips: ['Definir o custo e limite de um feitiço', 'Criar um item híbrido (tecnologia + magia)', 'Gerar conflito político sobre a magia', 'Desenvolver grupo que rejeita a magia'],
    guide: {
      min: 'Este fruto explora a delicada balança entre forças místicas e conhecimento técnico. Enquanto a tecnologia utiliza conhecimentos científicos para criar ferramentas e processos, a magia utiliza forças sobrenaturais para manipular a realidade. O segredo de um bom worldbuilding aqui é gerir como essas duas forças interagem e se equilibram.\n\nUse os campos abaixo para criar, um por vez, regras mágicas, tecnologias e tensões entre elas.',
      ref: '📖 "Game of Thrones"\n\nA obra exemplifica um mundo medieval onde magia e tecnologia coexistem:\n\n• Tecnologia e Engenharia: Balistas (máquinas de cerco para abater dragões), construção naval dos Greyjoys. O Fogovivo atua como "híbrido" — composto químico com processos mágicos.\n\n• Magia Suave: A magia do Senhor da Luz (ressurreições e visões) possui regras vagas e efeitos imprevisíveis, mantendo o mistério.\n\n• Magia Dura: O vidro de dragão (obsidiana) possui propriedade clara e consistente: é letal contra White Walkers.\n\n• Gestão de Equilíbrio: A raridade da magia, seu alto custo (frequentemente exigindo sacrifícios) e suas limitações claras mantêm o equilíbrio.\n\nDica: Você pode usar Magia Dura para uso estratégico na trama e Magia Suave para manter o senso de maravilha — ou mesclar ambos em diferentes contextos.',
      steps: [
        'Nível Tecnológico: Idade da Pedra, Medieval, Industrial ou futuro?',
        'Prevalência e Importância: Magia/tecnologia acessíveis a todos ou restritas a uma elite?',
        'Escolha o Sistema de Magia: Dura (regras claras), Suave (misteriosa) ou mescla.',
        'Crie Interações: Como magia e tecnologia se complementam ou entram em conflito?',
        'Integre na Narrativa: Origem da magia e precursores da tecnologia impulsionam a trama.',
      ],
      closing: 'Ao tomar deste fruto, fantasia e ciência dançam ao redor da existência.',
    },
  },
  {
    id: 5, num: '6º Fruto', name: 'Seres Fantásticos', icon: '🐉',
    gradient: 'from-emerald-900 via-green-900 to-teal-900',
    desc: 'Seres fantásticos não estão lá para enfeitar — eles mudam política, história e cultura. Uma criatura bem construída sustenta trama longa e revela o que o mundo teme ou deseja.',
    fields: [
      { id: 'races', label: 'Crie uma Criatura ou Raça', type: 'textarea', ph: 'Descreva um ser fantástico: origem, aparência, papel no mundo e como humanos lidam com ele (aliança, medo, exploração?). Ex: "Os Cinzeiros — humanos tocados pelo Véu, incapazes de sentir dor. São usados como soldados."' },
      { id: 'creatures', label: 'Crie um Ser que Muda o Equilíbrio', type: 'textarea', ph: 'Descreva uma criatura cuja revelação ou extinção mudaria o equilíbrio de poder. Sua existência é pública ou segredo? Interfere em política, economia ou crença?' },
      { id: 'origin2', label: 'Crie uma Origem para um Ser', type: 'textarea', ph: 'De onde veio esse ser? Criado pelos deuses, evoluiu, veio de outro plano, é humano corrompido? A origem define quem se sente superior a quem — e por quê.' },
      { id: 'relations', label: 'Crie uma Relação entre Espécies', type: 'textarea', ph: 'Descreva como duas espécies se relacionam. Existe preconceito institucionalizado? Guerra histórica? Aliança frágil? Um grupo misto que ambos os lados rejeitam?' },
    ],
    chips: ['Criar uma criatura com papel político', 'Desenvolver uma raça com cultura própria', 'Gerar conflito entre duas espécies', 'Criar ser cuja origem é mistério'],
    guide: {
      min: 'Este fruto pode ser compreendido como extensão do sistema de Magia e Tecnologia, pois seres fantásticos costumam estar ligados a esses elementos. No entanto, podem existir mesmo em mundos sem magia explícita — como extraterrestres, semideuses ou entidades espirituais. Bem construídos, esses seres tornam-se o grande motivo de interesse do público.\n\nUse os campos abaixo para criar, um por vez, criaturas, raças e suas relações com o mundo.',
      ref: '📖 Diversidade e Mistério\n\n• O Senhor dos Anéis (Tolkien): Criaturas mágicas (Smaug, Balrogs), raças humanoides (Elfos imortais, Anões ferreiros, Hobbits pacíficos), híbridos e espíritos (Ents, Nazgûl, Valar). Cada raça possui cultura e história ricas.\n\n• Attack on Titan (Hajime Isayama): Os Titãs representam fusão de horror e mistério.\n  — Origem Genética: Revela-se que Titãs são humanos transformados, mudando a percepção da guerra para trama de poder e manipulação.\n  — Tecnologia como Niveladora: O Equipamento de Manobra Tridimensional permite que humanos combatam criaturas gigantes, influenciando estratégias militares e política.',
      steps: [
        'Colete Boas Referências: Estude mitologias e folclores; misture com elementos da sua realidade.',
        'Defina o Papel dos Seres: Aliados, antagonistas ou neutros? Como influenciam os protagonistas?',
        'Origem e História: Parte do mito fundador ou fruto de acontecimentos recentes?',
        'Características e Habilidades: Aparência, poderes e fraquezas coerentes com o sistema de magia.',
        'Cultura e Sociedade: São racionais? Têm linguagem, tradições e valores próprios?',
        'Adapte Conforme Necessidade: Ajuste habilidades mantendo lógica interna do mundo.',
      ],
      closing: 'Ao tomar deste fruto, a vida fantástica se materializa diante de seus olhos.',
    },
  },
  {
    id: 6, num: '7º Fruto', name: 'Economia', icon: '💰',
    gradient: 'from-yellow-900 via-amber-900 to-orange-900',
    desc: 'Economia é o que impede seu mundo de virar cenário de papelão. Ela explica rotas, guerras, desigualdades e alianças — e é onde a maioria dos escritores deixa um buraco que o leitor atento vai encontrar.',
    fields: [
      { id: 'currency', label: 'Crie um Sistema Monetário', type: 'textarea', ph: 'Descreva a moeda ou forma de troca do seu mundo. Quem emite e controla? Existe banco? A quem ele deve lealdade? Ex: "Pedras-alma — fragmentos de cristal que armazenam energia mágica. A Guilda dos Lapidários controla o suprimento."' },
      { id: 'resources', label: 'Crie um Recurso Valioso', type: 'textarea', ph: 'Descreva um recurso natural e quem o controla. Onde fica? Por que é disputado? Ex: "O Minério Negro só existe nas Minas do Norte, controladas pela guilda que financiou o último rei."' },
      { id: 'classes', label: 'Crie uma Dinâmica de Classe', type: 'textarea', ph: 'Descreva o ciclo econômico real — não o oficial. Quem faz o trabalho pesado? Quem fica com a maior parte? Existe mobilidade social ou as classes são fixas por nascimento, raça ou magia?' },
      { id: 'trade', label: 'Crie uma Rota Comercial', type: 'textarea', ph: 'Descreva um caminho por onde o dinheiro flui. Quais cidades são ricas por controlar passagem? Existe mercado negro com economia paralela? Quais os perigos da rota?' },
    ],
    chips: ['Criar um recurso raro e quem o controla', 'Desenvolver uma rota comercial com perigos', 'Gerar uma crise econômica em andamento', 'Criar uma guilda com agenda própria'],
    guide: {
      min: 'A economia de um mundo fictício é essencial, influenciando desde a alta política até a vida cotidiana. Ela é moldada diretamente pela geografia (disponibilidade de recursos) e pelo sistema político vigente. Lembre-se: nem só de ouro vive um sistema monetário; a troca, o crédito e a dívida são ferramentas narrativas poderosas.\n\nUse os campos abaixo para criar, um por vez, moedas, recursos, dinâmicas de classe e rotas comerciais.',
      ref: '📖 "O Nome do Vento" (Patrick Rothfuss)\n\nA economia não é detalhe de fundo, mas desafio constante para o protagonista Kvothe:\n\n• Geografia e Recursos: Diferentes regiões possuem recursos específicos (minas de cobre, terras férteis) que definem sua riqueza.\n\n• Educação e Mercado: A Universidade cobra mensalidades, refletindo como dinheiro é pré-requisito para conhecimento e poder.\n\n• Dívida e Desigualdade: A narrativa mostra como a pobreza limita oportunidades. O uso constante de crédito e a luta contra dívidas humanizam o protagonista.\n\n• Pontos de Troca Cultural: Locais como a taverna Eolio funcionam como centros de comércio, onde artistas e mercadores negociam itens valiosos e mágicos.',
      steps: [
        'Recursos e Geografia: Quais recursos são abundantes ou escassos? Como o clima afeta a produção?',
        'Sistema Econômico: Feudalismo, mercado livre ou original? Quem controla? Existem guildas?',
        'Sistema Monetário: Tipo de moeda, impostos, sistema bancário ou de crédito.',
        'Setores e Tecnologia: Como agricultura, indústria e comércio interagem?',
        'Classes Sociais e Desigualdade: Como a riqueza é distribuída? Existe classe média?',
        'Rotas Comerciais: Caminhos por terra, mar ou ar — perigos e taxas dessas rotas.',
      ],
      closing: 'Ao tomar deste fruto, moedas de ouro cintilam e sibilam: o bem e o mal lutam por poder.',
    },
  },
  {
    id: 7, num: '8º Fruto', name: 'Linguagem', icon: '📜',
    gradient: 'from-stone-900 via-neutral-900 to-zinc-900',
    desc: 'Linguagem não é só inventar palavras: é criar consistência de nomes, termos e expressões que fazem o leitor sentir que esse mundo existia antes da primeira página.',
    fields: [
      { id: 'languages', label: 'Crie um Padrão Fonético', type: 'textarea', ph: 'Descreva os sons que caracterizam os nomes de um povo. Defina 2 ou 3 regras. Ex: "Nomes do norte terminam em consoante + vogal curta (Varn, Aste). Nomes do sul são polissílabos suaves (Aelindra, Savouri)."' },
      { id: 'writing', label: 'Crie um Termo Cultural', type: 'textarea', ph: 'Descreva uma saudação, ofensa, título ou expressão idiomática com significado. Ex: "Vel\'atar = honra merecida em combate. Shar = insulto para quem vende ancestrais por conveniência."' },
      { id: 'words', label: 'Crie uma Frase Típica', type: 'textarea', ph: 'Descreva uma frase — saudação formal, expressão cotidiana ou dito popular. Ela deve revelar valores sem precisar de explicação. Ex: "Que o fogo te encontre antes do frio." (morte em batalha é preferível ao inverno sem honra)' },
      { id: 'dialects', label: 'Crie uma Variação de Dialeto', type: 'textarea', ph: 'Descreva como o idioma muda entre regiões, classes ou raças. Um sotaque específico carrega preconceito? Existe língua morta usada em rituais que poucos entendem?' },
    ],
    chips: ['Criar um padrão fonético para um povo', 'Gerar termos culturais com significado', 'Criar uma expressão idiomática reveladora', 'Desenvolver variação de dialeto com preconceito'],
    guide: {
      min: 'A linguagem é fundamental para um mundo imersivo, pois permite que personagens expressem ideias e culturas de forma autêntica. Ela não é adereço exótico, mas ferramenta para diferenciar tradições e histórias. Criar uma língua do zero é tarefa demorada, mas essencial para quem busca o máximo de detalhamento.\n\nUse os campos abaixo para criar, um por vez, padrões fonéticos, termos, frases e dialetos.',
      ref: '📖 J.R.R. Tolkien (O Senhor dos Anéis)\n\nTolkien era linguista e usou seu conhecimento em Filologia para criar os idiomas da Terra-média:\n\n• Quenya: Língua antiga dos Altos Elfos, usada como idioma erudito e cerimonial.\n\n• Sindarin: A língua élfica mais falada durante os eventos da trilogia.\n\n• Khuzdul: Língua secreta dos Anões, raramente ensinada a estranhos.\n\n• Rohanese: Idioma dos habitantes de Rohan, inspirado no anglo-saxão antigo.\n\nDica de Ouro: Se criar um dicionário inteiro for demais, foque em desenvolver frases-chave e expressões idiomáticas marcantes para dar o tom da cultura sem precisar de lógica linguística exaustiva.',
      steps: [
        'Defina o Propósito: Língua sagrada, comum ou código secreto?',
        'Defina o Escopo: Quantas línguas, dialetos e nível de detalhamento.',
        'Escolha uma Base Fonética: Inspire-se em idiomas reais para fonemas únicos e pronunciáveis.',
        'Crie um Vocabulário: Comece por palavras essenciais e expanda conforme a história exige.',
        'Integre a Cultura: O idioma deve refletir geografia e valores do povo.',
        'Escrita (Opcional): Sistema de símbolos, alfabeto próprio ou escrita ideográfica.',
      ],
      closing: 'Ao tomar deste fruto, palavras ganham vida e culturas recebem a voz de muitas almas.',
    },
  },
  {
    id: 8, num: '9º Fruto', name: 'Mitologia', icon: '🌟',
    gradient: 'from-sky-900 via-indigo-900 to-violet-900',
    desc: 'Mitologia dá peso metafísico ao mundo: origem, propósito, destino. No template, ela serve para explicar o inexplicável — e gerar conflito, artefatos e rituais que a história vai precisar.',
    fields: [
      { id: 'gods', label: 'Crie uma Divindade ou Entidade', type: 'textarea', ph: 'Descreva um deus, espírito ou entidade: domínio, personalidade, como influencia a vida real. Existem heresias ou profetas falsos ligados a ela?' },
      { id: 'creation', label: 'Crie um Mito de Criação', type: 'textarea', ph: 'Descreva como o mundo foi criado segundo a crença de um povo — e como a lenda diz que vai terminar. Essa resposta define o tom moral do mundo.' },
      { id: 'afterlife', label: 'Crie uma Crença sobre o Pós-Morte', type: 'textarea', ph: 'Para onde vão os mortos? Como isso afeta como os vivos tomam decisões? Que práticas religiosas estruturam o cotidiano — não só as festas, mas os pequenos gestos diários?' },
      { id: 'sacred', label: 'Crie uma Relíquia Sagrada', type: 'textarea', ph: 'Descreva um objeto ou lugar que concentra poder ou crença. Quem o possui tem legitimidade política? Ele é disputado ou protegido?' },
    ],
    chips: ['Criar um mito de criação com tom moral', 'Desenvolver uma heresia e seus seguidores', 'Gerar uma profecia que move a trama', 'Criar uma relíquia com disputa política'],
    guide: {
      min: 'A mitologia representa o começo de todas as coisas e, simultaneamente, o prelúdio do fim. Consiste em histórias, crenças e lendas que buscam explicar a origem do mundo, a natureza de deuses e heróis, e o significado profundo da vida. No worldbuilding, é essencial para dar sentido aos fenômenos naturais e estabelecer os valores fundamentais de uma sociedade.\n\nUse os campos abaixo para criar, um por vez, divindades, mitos, crenças e relíquias sagradas.',
      ref: '📖 Mitologia Nórdica (O Ciclo da Existência)\n\nA Mitologia Nórdica ilustra perfeitamente como os mitos traçam a linha do tempo total de um universo:\n\n• O Início de Tudo (Ginnungagap): Os nórdicos narram o surgimento da realidade a partir do vazio primordial e do sacrifício de seres ancestrais, estabelecendo a cosmologia.\n\n• O Fim de Tudo (Ragnarök): Diferente de mitologias focadas apenas na criação, a nórdica detalha o "fim dos tempos", onde deuses e mundo são destruídos para permitir um novo ciclo.\n\n• Significado e Destino: As lendas de Odin, Thor e as Nornas explicam a natureza dos deuses e o significado da vida e do destino, moldando o comportamento e a bravura da sociedade viking.',
      steps: [
        'Crie o Mito de Origem: Como o mundo surgiu e qual a natureza das forças criadoras.',
        'Explique Fenômenos Naturais: Use lendas para dar significado a tempestades, eclipses ou estações.',
        'Estabeleça Valores e Crenças: Como histórias de heróis e deuses reforçam certo/errado.',
        'Desenvolva a Natureza dos Deuses: Distantes, guias espirituais ou interferem no destino?',
        'Trace o Prelúdio do Fim: Profecia de destruição ou renovação que dá peso às ações do presente.',
      ],
      closing: 'Ao tomar deste fruto, o destino do seu mundo estará traçado nas linhas da eternidade.',
    },
  },
  {
    id: 9, num: '10º Fruto', name: 'Personagens', icon: '👤',
    gradient: 'from-slate-900 via-gray-900 to-zinc-900',
    desc: 'Personagens são o ponto de contato do leitor com o mundo. Eles devem nascer do mundo — moldados pela cultura, política e história que você já construiu — e também mexer nele.',
    fields: [
      { id: 'protagonist', label: 'Crie um Protagonista', type: 'textarea', ph: 'Descreva um protagonista: o que quer conscientemente, o que teme acima de tudo e qual ferida do passado distorce sua visão. Virtude forte + falha forte + decisão difícil = personagem inesquecível.' },
      { id: 'antagonist', label: 'Crie um Antagonista', type: 'textarea', ph: 'Descreva um antagonista que acredita estar certo. Qual é a lógica interna dele? O que o tornou assim? Seu objetivo tem alguma parte que o protagonista secretamente entende?' },
      { id: 'supporting', label: 'Crie um Aliado ou Rival', type: 'textarea', ph: 'Descreva um aliado (o cético que questiona, o crente que inspira, ou o experiente que alerta) ou um rival (espelho do que o protagonista pode se tornar se errar as escolhas certas).' },
      { id: 'arcs', label: 'Crie um Arco de Transformação', type: 'textarea', ph: 'Descreva como um personagem começa e como termina — internamente. O que aprende ou se recusa a aprender? Qual momento o muda para sempre?' },
    ],
    chips: ['Desenvolver a ferida do protagonista', 'Criar um antagonista que o leitor quase defende', 'Gerar conflito entre aliados', 'Definir o arco de transformação'],
    guide: {
      min: 'Todo o seu mundo só fará sentido se seus personagens forem capazes de gerar identificação e interesse. A alma do seu universo desperta através dos olhos de quem o habita, e personagens bem construídos tornam a história verdadeiramente inesquecível.\n\nO Conceito de "Personagens Cinzas" (George R. R. Martin): seres que não são puramente bons ou maus. Heróis cometem erros terríveis e vilões são capazes de amar e sentir dor. A complexidade moral reflete a condição humana.\n\nA Importância da Verossimilhança: Leitores aceitam elementos fantásticos desde que a narrativa seja consistente. Quando personagens agem com lógica interna, o público desenvolve empatia.\n\nUse os campos abaixo para criar, um por vez, protagonistas, antagonistas, aliados e arcos.',
      ref: '📖 Exercícios Práticos para Criar Personagens Densos\n\n• O Espelho de Sombras: Defina o papel do personagem e liste 3 qualidades admiráveis e 3 falhas graves. Como essas falhas atrapalham seus objetivos?\n\n• Raízes do Agora: Crie um histórico detalhado. Quais eventos traumáticos moldaram sua personalidade atual? O que espera do futuro?\n\n• A Prova de Fogo: Descreva como o personagem se comporta sob estresse. Agressivo, diplomático ou se retrai? Como fala nessas situações?\n\n• Agente de Mudança: Determine como as decisões desse personagem influenciam o rumo da história. Ele é motor de transformação ou obstáculo para os outros?',
      steps: [
        'O Espelho de Sombras: Defina 3 qualidades admiráveis e 3 falhas graves do personagem.',
        'Raízes do Agora: Quais eventos traumáticos moldaram a personalidade atual?',
        'A Prova de Fogo: Como o personagem se comporta sob estresse? Agressivo, diplomático?',
        'Agente de Mudança: Como as decisões dele influenciam o rumo da história?',
        'Garanta Verossimilhança: Ações devem ser lógicas dentro das motivações do personagem.',
      ],
      closing: 'Ao tomar deste fruto, a alma do seu mundo despertará através dos olhos de quem o habita.',
    },
  },
  {
    id: 10, num: 'Último Fruto', name: 'A Sua Narrativa', icon: '🌳',
    gradient: 'from-blue-900 via-indigo-900 to-purple-900',
    desc: 'Agora você conecta tudo em história. Em vez de explicar o mundo, você faz o mundo agir sobre as pessoas — e as pessoas causarem reação em cadeia.',
    fields: [
      { id: 'premise', label: 'Crie a Premissa', type: 'textarea', ph: 'Em uma frase direta: quem é o protagonista, o que quer desesperadamente, o que o impede e o que está em jogo se falhar.' },
      { id: 'theme', label: 'Crie o Tema Central', type: 'textarea', ph: 'Uma boa história não responde — ela pergunta. Qual é a pergunta central da sua narrativa? Ex: "Até onde a lealdade justifica a traição?" O tema aparece nas escolhas dos personagens, não no narrador.' },
      { id: 'tone', label: 'Defina o Tom e o Gênero', type: 'textarea', ph: 'Tom é promessa ao leitor — e deve ser mantido. Dark fantasy épico com doses de tragédia grega? Aventura de formação com humor ácido? Defina o tom e use como filtro para cada cena.' },
      { id: 'hook', label: 'Crie a Cena de Abertura', type: 'textarea', ph: 'Onde e como começa? A primeira cena deve: estabelecer o tom, apresentar o protagonista em ação (não em reflexão), criar uma pergunta que o leitor precisa ver respondida.' },
    ],
    chips: ['Escrever a premissa em uma frase', 'Definir a pergunta-tema da história', 'Criar a cena de abertura', 'Gerar sinopse de 3 parágrafos'],
    guide: {
      min: 'O último pilar da Árvore dos Mundos é aquele que poucos autores se atentam, mas que tende a ser o grande diferencial. Ele é a ponte final que une todos os frutos anteriores, transformando o cenário no que o guia chama de "Mundo Autorregente" — um universo tão vivo que as ideias se encaixam naturalmente e a história flui com lógica própria.\n\nUse os campos abaixo para criar, um por vez, premissa, tema, tom e cena de abertura.',
      ref: '📖 O "Mundo Autorregente"\n\nDiferente dos estudos de caso anteriores, o objetivo aqui é a integração total da narrativa ao mundo:\n\n• Servidão do Cenário: O mapa e as leis do mundo devem sempre servir à sua história. Use a geografia para planejar viagens e obstáculos que testem os personagens.\n\n• Show, Don\'t Tell (Mostre, não conte): Um dos maiores segredos do worldbuilding é que você não precisa explicar detalhadamente as leis do mundo durante a narrativa.\n\n• Percepção da Realidade: Basta expor os personagens ao mundo e descrever como eles interagem e reagem. A imersão acontece quando o leitor descobre o mundo organicamente, através das ações dos protagonistas.',
      steps: [
        'Servidão do Cenário: Mapa e leis devem servir à história, não ao contrário.',
        'Show, Don\'t Tell: Exponha personagens ao mundo e descreva como reagem.',
        'Percepção da Realidade: O leitor descobre o mundo organicamente, pelas ações.',
        'Integre todos os Frutos: Cada pilar deve dialogar com os outros.',
        'Não construa o que ainda não é necessário: Detalhamento segue a demanda narrativa.',
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
    desc: 'Começa pela visão geral — continentes, nações, história — e vai detalhando até personagens e cenas. Cria mundos coesos antes de qualquer história existir. Ideal para criadores que precisam do mundo completo para sentir confiança.',
  },
  'bottom-up': {
    title: '⬆ Baixo para Cima',
    desc: 'Começa pelos personagens e um local central com alta densidade de detalhes, expandindo o mundo conforme a história exige. Cada nova região surge de uma necessidade narrativa real.',
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
