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
  currentSaveId: string;
}

export const CATEGORIES = [
  'Todos', 'Geral', 'Mapa do Mundo', 'Personagens', 'Criaturas',
  'Arquitetura', 'Paisagens', 'Artefatos', 'Cultura'
];

export const FRUITS: Fruit[] = [
  {
    id: 0, num: '1º Fruto', name: 'Mapa do Mundo', icon: '🗺',
    gradient: 'from-blue-900 via-cyan-900 to-teal-900',
    desc: 'O mapa é o chão do seu universo. Ele guia a criação, aumenta a imersão e conecta geografia, cultura, história e conflito num único olhar.',
    fields: [
      { id: 'continents', label: 'Regiões & Biomas (3 a 7)', type: 'textarea', ph: 'Liste suas regiões com o clima dominante de cada uma. Ex: "Serra dos Véus — montanhosa, fria, isolada por neblina eterna. Planícies de Areth — áridas, disputadas por três clãs."' },
      { id: 'climate', label: 'Rota Principal', type: 'text', ph: 'Qual é a rota mais importante — comercial, militar ou de peregrinação? Quem a controla e por que ela é disputada?' },
      { id: 'landmarks', label: 'Fronteiras de Tensão', type: 'textarea', ph: 'Aponte 2 fronteiras onde o conflito é inevitável. Ex: "Rio Kael separa o Império do norte dos reinos livres do sul — travessia é proibida após o pôr do sol."' },
      { id: 'scale', label: 'Locais Icônicos & Escala', type: 'text', ph: 'Quantos dias de viagem separam os extremos do mapa? Quais lugares todos conhecem pelo nome, mesmo que nunca tenham visto?' },
    ],
    chips: ['Criar 3 regiões com conflito entre elas', 'Sugerir nomes para regiões e cidades', 'Desenvolver a rota principal', 'Criar fronteira de tensão política'],
    guide: {
      min: '✦ Mínimo Mundo Viável: 3–7 regiões com clima/bioma definido · 1 rota importante (comércio, guerra ou peregrinação) · 2 fronteiras onde o conflito é inevitável.',
      ref: '📖 Westeros (George R. R. Martin): No Norte, o frio intenso e a Muralha forjam um povo resistente. Em Dorne, o clima quente resulta em cultura liberal. O Vale de Arryn é protegido por montanhas, criando isolamento defensivo. Martin usou a fusão dos mapas do Reino Unido e da Irlanda como base — inspiração real não mata originalidade, acelera.\n\nSeu gatilho: que forma geográfica real poderia ser a espinha dorsal do seu mundo?',
      steps: [
        'Defina o Conceito: fantasia, ficção científica ou histórico? Semelhante à Terra ou alienígena?',
        'Esboce a Geografia Geral: desenhe o contorno das massas de terra, oceanos, rios e desertos',
        'Desenvolva Climas e Biomas: zonas climáticas (quentes perto do equador, frias nos polos) e biomas',
        'Crie Regiões e Reinos: divida usando fronteiras naturais e nomeie com a língua local',
        'Cidades e Rotas de Comércio: marque cidades estratégicas e trace rotas de conexão',
        'Integração Narrativa: o mapa deve orientar viagens e planejamento de batalhas',
      ],
      closing: 'Ao tomar deste fruto, o firmamento do seu Mundo será materializado.',
    },
  },
  {
    id: 1, num: '2º Fruto', name: 'Sistema Político', icon: '🏛',
    gradient: 'from-indigo-900 via-purple-900 to-blue-900',
    desc: 'Quem manda, como manda e por que alguém quer derrubar quem manda. Isso é combustível de trama — cria conflito antes mesmo de você escrever a primeira cena.',
    fields: [
      { id: 'govtype', label: 'Governo Dominante + Exceção', type: 'text', ph: 'Defina 1 forma de governo principal e 1 região que funciona diferente. Ex: "Império teocrático no centro, mas as cidades portuárias do sul são repúblicas comerciais independentes."' },
      { id: 'factions', label: '2 Facções em Disputa', type: 'textarea', ph: 'Para cada facção: o que querem, como operam e por que odeiam a outra. Ex: "A Ordem da Chama quer manter o Rei. O Conselho dos Mercadores quer eliminar a monarquia. Ambos usam o povo como peão."' },
      { id: 'conflict', label: 'Tensão Política Atual', type: 'textarea', ph: 'O que está prestes a explodir? Qual segredo político, se revelado, mudaria tudo? Qual facção está crescendo às sombras?' },
      { id: 'laws', label: 'A Lei que Revela o Tom do Poder', type: 'text', ph: '1 lei ou punição que mostra como esse poder realmente funciona. Ex: "Questionar a linhagem real em público é punido com a remoção da língua — mas nunca da vida. Mártires são mais perigosos do que críticos."' },
    ],
    chips: ['Criar conflito entre as 2 facções', 'Desenvolver a exceção política regional', 'Gerar lei reveladora do poder', 'Criar conspiração política em andamento'],
    guide: {
      min: '✦ Mínimo Mundo Viável: 1 forma de governo dominante + 1 exceção regional · 2 facções em disputa (com objetivo e método) · 1 lei que revela o tom do poder.',
      ref: '📖 Diversidade de Poder: Monarquias (Gondor/Rohan em Tolkien), Repúblicas (Roma Antiga com Senado + Assembleias), Impérios (Star Wars — poder centralizado como antagonista), Teocracias (Covenant em Halo — líderes religiosos com poder absoluto). A variedade cria sensação épica e conflitos de valores entre aliados.\n\nSeu gatilho: como dois povos aliados poderiam entrar em atrito por terem formas completamente diferentes de decidir quem lidera?',
      steps: [
        'Determine o Tipo de Governo: monarquia, república, ditadura, teocracia ou original',
        'Defina a Estrutura de Poder: líder único ou conselho? Herdado, eleito ou conquistado?',
        'Estratificação Social: classes (nobres, plebeus, castas) e mobilidade entre elas',
        'Crie Leis e Justiça: leis fundamentais, punições e sistema formal ou comunitário',
        'Relações e Conflitos: intrigas políticas internas e relações com outras nações',
        'Influência Religiosa: papel oficial ou influência política da religião no governo',
      ],
      closing: 'Ao tomar deste fruto, os fios do destino começarão a se ordenar diante do caos.',
    },
  },
  {
    id: 2, num: '3º Fruto', name: 'Fatos Históricos', icon: '⚔',
    gradient: 'from-amber-900 via-red-900 to-orange-900',
    desc: 'História é o que transforma seu mundo em consequência, não invenção aleatória. O presente deve carregar marcas do passado — guerras, catástrofes, descobertas que ainda sangram.',
    fields: [
      { id: 'origin', label: '5 Eventos que Fundaram o Presente', type: 'textarea', ph: '1 fundação · 1 ascensão · 1 queda · 1 tragédia · 1 descoberta. Para cada um: o que aconteceu e qual cicatriz ele deixou no mundo atual.' },
      { id: 'wars', label: 'Relíquias & Documentos do Passado', type: 'textarea', ph: '2 objetos ou textos que "sobraram" dos eventos históricos. Ex: "O Tratado de Cinzas proíbe exércitos acima de mil homens. Ninguém sabe quem o está violando primeiro."' },
      { id: 'turning', label: 'O Herói ou Vilão com Legado Vivo', type: 'textarea', ph: '1 figura do passado cujo nome ainda move pessoas. É celebrada, temida, mal compreendida? O que ela realmente fez versus o que a lenda diz?' },
      { id: 'present', label: 'O Ponto de Partida da História', type: 'text', ph: 'Em que momento da linha do tempo sua narrativa começa? O que acabou de acontecer que todos ainda comentam — e que ninguém ainda entendeu completamente?' },
    ],
    chips: ['Criar os 5 eventos históricos fundamentais', 'Desenvolver relíquia ou documento histórico', 'Expandir o herói/vilão do passado', 'Conectar história ao conflito presente'],
    guide: {
      min: '✦ Mínimo Mundo Viável: 5 eventos históricos (1 fundação, 1 ascensão, 1 queda, 1 tragédia, 1 descoberta) · 2 relíquias ou documentos que sobraram · 1 figura histórica com legado ainda ativo.',
      ref: '📖 The Elder Scrolls (Tamriel): eventos fundadores (guerras divinas), a Grande Guerra entre Império e Domínio Aldmeri gera repercussões em Skyrim, ciclos de poder (ascensão e queda do Império Septim), descobertas como o Aetherium que impulsionam avanços e conflitos, e figuras como Tiber Septim que se tornam mitos.\n\nSeu gatilho: que recurso ou verdade do seu mundo gerou uma disputa histórica que ainda sangra no presente?',
      steps: [
        'Desenvolva a Cronologia: fundação do mundo, grandes guerras, quedas de reinos e catástrofes',
        'Conecte à Narrativa Atual: quais tradições ou conflitos foram moldados por esses eventos?',
        'Crie Documentos e Relíquias: manuscritos, armas lendárias ou coroas com significado especial',
        'Desenvolva Personagens Históricos: heróis e vilões cujas ações ainda impactam o mundo',
        'Adapte à Cultura e Religião: integre fatos históricos em feriados e mitos religiosos',
        'Inspire-se no Mundo Real: revoluções, coroações e batalhas trazem verossimilhança',
      ],
      closing: 'Ao tomar deste fruto, linhas do tempo são criadas e possibilidades se abrem.',
    },
  },
  {
    id: 3, num: '4º Fruto', name: 'Cultura', icon: '🎭',
    gradient: 'from-rose-900 via-pink-900 to-fuchsia-900',
    desc: 'Cultura é identidade: o que faz um povo parecer real. No template, você vai transformar "povo genérico" em "povo inesquecível" — o tipo que o leitor reconhece antes mesmo de ler o nome.',
    fields: [
      { id: 'beliefs', label: '3 Valores Centrais do Povo', type: 'textarea', ph: 'O que esse povo valoriza acima de tudo? O que dizem que valorizam versus o que realmente praticam? Ex: "Honra em combate (discurso) + acumulação de terra por qualquer meio (prática) + silêncio sobre fracasso familiar (tabu)."' },
      { id: 'arts', label: '2 Rituais (1 público + 1 íntimo)', type: 'text', ph: 'O ritual público reforça a identidade coletiva. O íntimo revela o que a cultura não mostra para estranhos. Ex: "Festival da Primeira Neve (público) + benção do nome verdadeiro dita apenas entre pais e filhos (íntimo)."' },
      { id: 'customs', label: 'O Tabu — O Que Não Se Faz', type: 'textarea', ph: '1 coisa que esse povo simplesmente não faz — e que revela muito sobre quem eles são. O que acontece com quem viola? Ex: "Nunca se menciona o nome de um morto por 40 dias. Quem viola traz o luto de volta."' },
      { id: 'food', label: 'Como Aparece na Trama', type: 'text', ph: 'Como essa cultura vai aparecer em cenas concretas? Vestuário, cumprimento, forma de comer, de tratar estranhos. Se você consegue ver e ouvir esse povo, a cultura está viva.' },
    ],
    chips: ['Criar os 3 valores centrais com contradição', 'Desenvolver o ritual público do povo', 'Criar o tabu e suas consequências', 'Gerar cena que mostra a cultura em ação'],
    guide: {
      min: '✦ Mínimo Mundo Viável: 3 valores centrais do povo · 2 rituais (1 público e 1 íntimo) · 1 tabu com consequência real.',
      ref: '📖 Avatar: A Lenda de Aang: cada nação (Fogo, Água, Terra, Ar) tem estrutura, valores, rituais e arte distintos — o espectador identifica o povo pelo comportamento antes de ler qualquer nome. Nação do Fogo valoriza força e disciplina; Tribo da Água, comunidade e cooperação; Reino da Terra, resiliência; Nômades do Ar, desapego e paz.\n\nSeu checklist: o povo do seu mundo pode ser identificado só pelo comportamento em cena, sem legenda?',
      steps: [
        'Defina as Bases Culturais: como geografia e história influenciam a identidade do povo',
        'Desenvolva Crenças e Valores: deuses, rituais, festivais e valores éticos centrais',
        'Crie Costumes e Tradições: rituais de passagem, alimentos típicos e práticas culinárias',
        'Desenvolva Arte e Literatura: estilos musicais, danças e contos que refletem a visão de mundo',
        'Estabeleça Língua e Dialetos: vocabulário principal e dialetos regionais',
        'Defina a Estrutura Social: classes, papel de gênero e mobilidade social',
        'Integre na Narrativa: use cultura em diálogos e descrições concretas',
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
      { id: 'magicrules', label: 'Custo, Limite & Risco', type: 'textarea', ph: 'Toda magia interessante tem custo. O que se perde ao usá-la — energia, vida, sanidade, fé, anos? Quem pode acessá-la e por quê? Escreva os limites antes dos poderes.' },
      { id: 'tech', label: 'Nível Tecnológico', type: 'text', ph: 'Qual o equivalente histórico? Medieval puro, renascentista, industrializando? Existe tecnologia que usa magia como combustível — ou que a substitui? Ex: "Balistas movidas a vapor que caçam magos."' },
      { id: 'magictech', label: 'A Tensão entre Magia e Tecnologia', type: 'textarea', ph: 'Elas coexistem, competem ou se fundem? Existe grupo que rejeita uma em favor da outra por razão filosófica, religiosa ou econômica? Quem se beneficia se a magia sumir?' },
    ],
    chips: ['Definir o custo e limite do sistema de magia', 'Criar item híbrido (tecnologia + magia)', 'Gerar conflito político em torno da magia', 'Desenvolver grupo que rejeita a magia'],
    guide: {
      min: '✦ Mínimo Mundo Viável: a magia é rara ou comum? · Tem custo/limitação real? · Existe tensão ou hibridismo com tecnologia?',
      ref: '📖 Game of Thrones (Martin): balistas vs. dragões como tensão magia vs. engenhosidade. Fogovivo como híbrido químico-mágico. Magia Suave (Senhor da Luz — misteriosa) + Magia Dura (vidro de dragão — regra clara). A raridade da magia, seu alto custo e suas limitações mantêm o equilíbrio.\n\nSeu gatilho: quem perde poder político se a magia se tornar acessível a todos?',
      steps: [
        'Nível Tecnológico: Idade da Pedra, Medieval, Industrial ou futuro?',
        'Prevalência e Importância: magia/tecnologia acessíveis a todos ou restritas a uma elite?',
        'Escolha o Sistema de Magia: Dura (regras claras), Suave (misteriosa) ou mescla',
        'Crie Interações: magia e tecnologia se complementam ou entram em conflito?',
        'Integre na Narrativa: origem da magia e precursores da tecnologia impulsionam a trama',
      ],
      closing: 'Ao tomar deste fruto, fantasia e ciência dançam ao redor da existência.',
    },
  },
  {
    id: 5, num: '6º Fruto', name: 'Seres Fantásticos', icon: '🐉',
    gradient: 'from-emerald-900 via-green-900 to-teal-900',
    desc: 'Seres fantásticos não estão lá para enfeitar — eles mudam política, história e cultura. Uma criatura bem construída sustenta trama longa e revela o que o mundo teme ou deseja.',
    fields: [
      { id: 'races', label: '3 Criaturas ou Raças (+ papel no mundo)', type: 'textarea', ph: 'Para cada uma: origem + como humanos lidam com ela (aliança, medo, exploração?) + o que mudaria se ela desaparecesse. Ex: "Os Cinzeiros — humanos tocados pelo Véu, incapazes de sentir dor. São usados como soldados por quem os alimenta."' },
      { id: 'creatures', label: 'A Criatura que Muda Tudo', type: 'textarea', ph: 'Qual ser, se revelado ou extinto, mudaria o equilíbrio de poder? Sua existência é pública ou segredo? Ela interfere em política, economia ou crença religiosa?' },
      { id: 'origin2', label: 'Origem dos Seres', type: 'text', ph: 'Foram criados pelos deuses, evoluíram, vieram de outro plano, são humanos corrompidos? A origem importa porque define quem se sente superior a quem — e por quê.' },
      { id: 'relations', label: 'Relações entre Espécies', type: 'textarea', ph: 'Existe preconceito institucionalizado? Guerra histórica que ainda gera desconfiança? Aliança frágil mantida por interesse mútuo? Um grupo misto que ambos os lados rejeitam?' },
    ],
    chips: ['Criar criatura com papel político no mundo', 'Desenvolver raça com cultura própria', 'Gerar conflito entre espécies', 'Criar ser cuja origem é mistério central'],
    guide: {
      min: '✦ Mínimo Mundo Viável: 3 criaturas/raças · Para cada uma: origem + papel no mundo + como humanos lidam com ela.',
      ref: '📖 Tolkien (raças com culturas ricas: Elfos imortais, Anões ferreiros, Hobbits pacíficos, Ents e Nazgûl) + Attack on Titan (Titãs são humanos transformados — muda a percepção da guerra de conflito simples para trama de poder e manipulação). Criaturas bem integradas mudam política e história.\n\nSeu gatilho: e se a criatura mais temida fosse o que a humanidade se torna quando perde algo essencial?',
      steps: [
        'Colete Referências: estude mitologias e folclores, misture com elementos da sua realidade',
        'Defina o Papel dos Seres: aliados, antagonistas ou neutros? Como influenciam os protagonistas?',
        'Origem e História: parte do mito fundador ou fruto de acontecimentos recentes?',
        'Características e Habilidades: aparência, poderes e fraquezas coerentes com o sistema de magia',
        'Cultura e Sociedade: são racionais? Têm linguagem, tradições e valores próprios?',
        'Adapte Conforme Necessidade: ajuste habilidades mantendo lógica interna do mundo',
      ],
      closing: 'Ao tomar deste fruto, a vida fantástica se materializa diante de seus olhos.',
    },
  },
  {
    id: 6, num: '7º Fruto', name: 'Economia', icon: '💰',
    gradient: 'from-yellow-900 via-amber-900 to-orange-900',
    desc: 'Economia é o que impede seu mundo de virar cenário de papelão. Ela explica rotas, guerras, desigualdades e alianças — e é onde a maioria dos escritores deixa um buraco que o leitor atento vai encontrar.',
    fields: [
      { id: 'currency', label: 'Moeda, Bancos & Quem Controla', type: 'text', ph: 'Usam moedas físicas, troca direta ou magia como valor? Quem emite e controla a moeda? Existe banco? A quem ele deve lealdade?' },
      { id: 'resources', label: 'Recursos Naturais & Geografia', type: 'textarea', ph: 'O que produz este mundo e onde fica? Que recurso é mais raro — e quem o controla? Ex: "O Minério Negro só existe nas Minas do Norte, controladas pela guilda que financiou o último rei."' },
      { id: 'classes', label: 'Quem Produz, Quem Distribui, Quem Lucra', type: 'textarea', ph: 'Descreva o ciclo econômico real — não o oficial. Quem faz o trabalho pesado? Quem fica com a maior parte? Existe mobilidade social ou as classes são fixas por nascimento, raça ou magia?' },
      { id: 'trade', label: 'Rotas & O Que Circula por Elas', type: 'text', ph: 'Por onde o dinheiro realmente flui? Quais cidades são ricas por controlar passagem — não por produzir? Existe mercado negro com economia paralela relevante?' },
    ],
    chips: ['Criar o recurso raro e quem o controla', 'Desenvolver rota comercial com conflito', 'Gerar crise econômica em andamento', 'Criar guilda ou banco com agenda própria'],
    guide: {
      min: '✦ Mínimo Mundo Viável: recursos naturais ligados à geografia · sistema econômico com quem controla produção e distribuição · moeda ou forma de troca.',
      ref: '📖 O Nome do Vento (Rothfuss): Kvothe conta moedas antes de decidir o que comer. A Universidade cobra mensalidades — dinheiro é pré-requisito para conhecimento e poder. Dívida e desigualdade humanizam o protagonista. Locais como a taverna Eolio funcionam como centros de comércio.\n\nSeu gatilho: o que seu protagonista não consegue comprar — e como isso muda uma decisão importante?',
      steps: [
        'Recursos e Geografia: quais recursos são abundantes ou escassos? Como o clima afeta produção?',
        'Sistema Econômico: feudalismo, mercado livre ou original? Quem controla? Existem guildas?',
        'Sistema Monetário: tipo de moeda, impostos, sistema bancário ou de crédito',
        'Setores e Tecnologia: como agricultura, indústria e comércio interagem?',
        'Classes Sociais e Desigualdade: como a riqueza é distribuída? Existe classe média?',
        'Rotas Comerciais: caminhos por terra, mar ou ar — perigos e taxas dessas rotas',
      ],
      closing: 'Ao tomar deste fruto, moedas de ouro cintilam e sibilam: o bem e o mal lutam por poder.',
    },
  },
  {
    id: 7, num: '8º Fruto', name: 'Linguagem', icon: '📜',
    gradient: 'from-stone-900 via-neutral-900 to-zinc-900',
    desc: 'Linguagem não é só inventar palavras: é criar consistência de nomes, termos e expressões que fazem o leitor sentir que esse mundo existia antes da primeira página.',
    fields: [
      { id: 'languages', label: 'Padrão de Nomes & Sons', type: 'text', ph: 'Que sons caracterizam os nomes desse povo? Defina 2 ou 3 regras fonéticas. Ex: "Nomes do norte terminam em consoante + vogal curta (Varn, Aste). Nomes do sul são polissílabos suaves (Aelindra, Savouri)."' },
      { id: 'writing', label: '10 Termos Culturais', type: 'text', ph: 'Saudações, ofensas, títulos, nomes de lugares, expressões idiomáticas. Ex: "Vel\'atar = honra merecida em combate. Shar = insulto para quem vende ancestrais por conveniência."' },
      { id: 'words', label: '3 Frases Típicas', type: 'textarea', ph: 'Uma saudação formal, uma expressão cotidiana e um dito popular. Elas revelam valores sem precisar de explicação. Ex: "Que o fogo te encontre antes do frio." (morte em batalha é preferível ao inverno sem honra)' },
      { id: 'dialects', label: 'Variações por Região ou Classe', type: 'text', ph: 'Como o mesmo idioma muda entre regiões, classes sociais ou raças? Um sotaque específico carrega preconceito? Existe língua morta usada em rituais que poucos entendem?' },
    ],
    chips: ['Criar padrão fonético para 2 povos', 'Gerar 10 termos culturais com significado', 'Criar expressão idiomática reveladora', 'Desenvolver variação de dialeto com preconceito'],
    guide: {
      min: '✦ Mínimo Mundo Viável: padrões de nomes com sons consistentes · 10 termos culturais (saudações, ofensas, cargos, lugares) · 3 frases típicas.',
      ref: '📖 Tolkien (linguista): Quenya (erudita e cerimonial), Sindarin (élfico falado), Khuzdul (secreta dos Anões), Rohanese (inspirado no anglo-saxão). Tolkien criou regras fonéticas antes de criar palavras — e isso é perceptível mesmo sem estudo. Consistência > quantidade.\n\nSeu gatilho: crie 3 nomes de lugares com o mesmo padrão sonoro. Se soam como vieram do mesmo povo, você acertou.',
      steps: [
        'Defina o Propósito: língua sagrada, comum ou código secreto?',
        'Defina o Escopo: quantas línguas, dialetos e nível de detalhamento',
        'Escolha uma Base Fonética: inspire-se em idiomas reais para criar fonemas únicos e pronunciáveis',
        'Crie um Vocabulário: comece por palavras essenciais e expanda conforme a história exige',
        'Integre a Cultura: o idioma deve refletir geografia e valores do povo',
        'Escrita (Opcional): sistema de símbolos, alfabeto próprio ou escrita ideográfica',
      ],
      closing: 'Ao tomar deste fruto, palavras ganham vida e culturas recebem a voz de muitas almas.',
    },
  },
  {
    id: 8, num: '9º Fruto', name: 'Mitologia', icon: '🌟',
    gradient: 'from-sky-900 via-indigo-900 to-violet-900',
    desc: 'Mitologia dá peso metafísico ao mundo: origem, propósito, destino. No template, ela serve para explicar o inexplicável — e gerar conflito, artefatos e rituais que a história vai precisar.',
    fields: [
      { id: 'gods', label: 'Panteão & Sistema de Crenças', type: 'textarea', ph: 'Quais deuses existem — e como influenciam a vida real? Seu sistema tem hierarquia interna, heresias, profetas falsos? Existe um deus que a maioria das culturas reconhece com nomes diferentes?' },
      { id: 'creation', label: 'Mito de Criação & Profecia de Fim', type: 'textarea', ph: 'Como o mundo foi criado segundo a crença do povo — e como a lenda diz que vai terminar? Essa resposta define o tom moral do mundo.' },
      { id: 'afterlife', label: 'Vida Após a Morte & Rituais Religiosos', type: 'text', ph: 'Para onde vão os mortos? Como isso afeta como os vivos tomam decisões? Que práticas religiosas estruturam o cotidiano — não só as festas, mas os pequenos gestos diários?' },
      { id: 'sacred', label: 'Relíquias, Artefatos & Lugares Sagrados', type: 'textarea', ph: 'Que objetos ou lugares concentram poder ou crença? Uma relíquia pode ser arma de conflito — quem a possui tem legitimidade política?' },
    ],
    chips: ['Criar mito de criação com tom moral definido', 'Desenvolver heresia e seus seguidores', 'Gerar profecia que move a trama', 'Criar relíquia com disputa política'],
    guide: {
      min: '✦ Mínimo Mundo Viável: mito de criação · sistema de crenças com influência na vida real · rituais e práticas religiosas · relíquias e locais sagrados.',
      ref: '📖 Mitologia Nórdica (Ciclo da Existência): Ginnungagap (vazio primordial) como origem, Ragnarök como fim e renovação — diferente de mitologias focadas só na criação. As lendas de Odin, Thor e as Nornas explicam destino e moldam a bravura viking. A mitologia pode traçar a linha do tempo total do universo.\n\nSeu gatilho: em que "era" seu mundo está — e quem sabe que a próxima queda está chegando?',
      steps: [
        'Crie o Mito de Origem: como o mundo surgiu e qual a natureza das forças criadoras',
        'Explique Fenômenos Naturais: use lendas para dar significado a tempestades e eclipses',
        'Estabeleça Valores e Crenças: como histórias de heróis e deuses reforçam certo/errado',
        'Desenvolva a Natureza dos Deuses: distantes, guias espirituais ou interferem no destino?',
        'Trace o Prelúdio do Fim: profecia de destruição ou renovação que dá peso às ações do presente',
      ],
      closing: 'Ao tomar deste fruto, o destino do seu mundo estará traçado nas linhas da eternidade.',
    },
  },
  {
    id: 9, num: '10º Fruto', name: 'Personagens', icon: '👤',
    gradient: 'from-slate-900 via-gray-900 to-zinc-900',
    desc: 'Personagens são o ponto de contato do leitor com o mundo. Eles devem nascer do mundo — moldados pela cultura, política e história que você já construiu — e também mexer nele.',
    fields: [
      { id: 'protagonist', label: 'Protagonista: Desejo + Medo + Ferida', type: 'textarea', ph: 'O que ele/ela quer conscientemente? O que teme acima de tudo? Qual ferida do passado distorce sua visão? Virtude forte + falha forte + decisão difícil = personagem que não se esquece.' },
      { id: 'antagonist', label: 'Antagonista: Objetivo + Método + Justificativa', type: 'textarea', ph: 'O antagonista acredita que está certo. Qual é a lógica interna dele? O que o tornou assim? Seu objetivo tem alguma parte que o protagonista secretamente entende — ou até concorda?' },
      { id: 'supporting', label: '2 Aliados + 1 Rival', type: 'textarea', ph: 'Cada aliado com função narrativa única: o cético (questiona), o crente (inspira), o experiente (alerta). O rival não é inimigo — é espelho do que o protagonista pode se tornar se errar as escolhas certas.' },
      { id: 'arcs', label: 'Transformação: Como Cada Um Muda', type: 'text', ph: 'Como o protagonista começa e como termina — internamente? O que ele aprende — ou se recusa a aprender?' },
    ],
    chips: ['Desenvolver a ferida do protagonista', 'Criar antagonista que o leitor quase defende', 'Gerar conflito entre aliados', 'Definir o arco de transformação completo'],
    guide: {
      min: '✦ Mínimo Mundo Viável: 1 protagonista (desejo + medo + ferida) · 1 antagonista (objetivo + método + justificativa) · 2 aliados com funções diferentes + 1 rival.',
      ref: '📖 George R. R. Martin (personagens cinzas): seres que não são puramente bons ou maus. Heróis cometem erros terríveis e vilões amam e sentem dor. A verossimilhança permite conexão emocional — quando personagens agem com lógica interna, o público desenvolve empatia.\n\nExercícios: O Espelho de Sombras (3 qualidades + 3 falhas), Raízes do Agora (eventos que moldaram a personalidade), A Prova de Fogo (comportamento sob estresse), Agente de Mudança (como suas decisões mudam a história).\n\nSeu gatilho: qual é a maior virtude do protagonista — e como ela vai causar sua maior derrota?',
      steps: [
        'O Espelho de Sombras: defina 3 qualidades admiráveis e 3 falhas graves do personagem',
        'Raízes do Agora: quais eventos traumáticos moldaram a personalidade atual?',
        'A Prova de Fogo: como o personagem se comporta sob estresse? Agressivo, diplomático?',
        'Agente de Mudança: como as decisões dele influenciam o rumo da história?',
        'Garanta Verossimilhança: ações devem ser lógicas dentro das motivações do personagem',
      ],
      closing: 'Ao tomar deste fruto, a alma do seu mundo despertará através dos olhos de quem o habita.',
    },
  },
  {
    id: 10, num: 'Último Fruto', name: 'A Sua Narrativa', icon: '🌳',
    gradient: 'from-blue-900 via-indigo-900 to-purple-900',
    desc: 'Agora você conecta tudo em história. Em vez de explicar o mundo, você faz o mundo agir sobre as pessoas — e as pessoas causarem reação em cadeia.',
    fields: [
      { id: 'premise', label: 'Premissa: Quem Quer o Quê e o Que Impede', type: 'textarea', ph: 'Em uma frase direta: quem é o protagonista, o que ele quer desesperadamente, o que o impede e o que está em jogo se ele falhar.' },
      { id: 'theme', label: 'Tema: O Que a História Pergunta', type: 'textarea', ph: 'Uma boa história não responde — ela pergunta. Qual é a pergunta central da sua narrativa? Ex: "Até onde a lealdade justifica a traição?" O tema aparece nas escolhas dos personagens, não no narrador.' },
      { id: 'tone', label: 'Tom & Gênero', type: 'text', ph: 'Tom é promessa ao leitor — e deve ser mantido. Dark fantasy épico com doses de tragédia grega? Aventura de formação com humor ácido? Defina o tom e use-o como filtro para cada cena.' },
      { id: 'hook', label: 'A Cena de Abertura', type: 'textarea', ph: 'Onde e como começa? A primeira cena deve: estabelecer o tom, apresentar o protagonista em ação (não em reflexão), criar uma pergunta que o leitor precisa ver respondida.' },
    ],
    chips: ['Escrever a premissa em uma frase', 'Definir a pergunta-tema da história', 'Criar a cena de abertura', 'Gerar sinopse de 3 parágrafos'],
    guide: {
      min: '✦ Método camadas: detalhe alto no ponto de partida, menos detalhe nas bordas — o mundo cresce conforme a história exige. Não construa o que ainda não é necessário.',
      ref: '📖 O "Mundo Autorregente": um universo tão vivo que as ideias se encaixam naturalmente. Servidão do Cenário (mapa e leis servem à história), Show Don\'t Tell (exponha os personagens ao mundo e descreva reações), Percepção da Realidade (a imersão acontece quando o leitor descobre o mundo organicamente, através das ações dos protagonistas).\n\nRegra de ouro: cultura não é texto — é comportamento em cena. Mostre um personagem recusando uma oferta porque a fonte é desonrosa, em vez de explicar que o povo valoriza honra.',
      steps: [
        'Servidão do Cenário: mapa e leis devem servir à história, não ao contrário',
        'Show, Don\'t Tell: exponha personagens ao mundo e descreva como reagem',
        'Percepção da Realidade: o leitor descobre o mundo organicamente, pelas ações',
        'Integre todos os Frutos: cada pilar deve dialogar com os outros',
        'Não construa o que ainda não é necessário: detalhamento segue a demanda narrativa',
      ],
      closing: 'Ao tomar deste fruto, a sua voz ecoará por mundos que agora possuem vida própria.',
    },
  },
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
