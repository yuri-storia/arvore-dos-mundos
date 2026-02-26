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
      ref: '📖 Westeros (George R. R. Martin): o mapa não é decoração — é o coração do mundo. Geografia dita história, cultura e conflito. Martin se inspirou no formato real do Reino Unido e da Irlanda. Inspiração real não mata originalidade — acelera.\n\nSeu gatilho: que forma geográfica real poderia ser a espinha dorsal do seu mundo?',
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
      ref: '📖 Terra-média (Tolkien): um único mundo, múltiplos sistemas políticos — Gondor é monarquia, os Elfos têm conselhos, os Hobbits têm uma Comarca quase anarquista. Essa variedade cria sensação épica e conflitos de valores entre aliados.\n\nSeu gatilho: como dois povos aliados poderiam entrar em atrito por terem formas completamente diferentes de decidir quem lidera?',
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
      ref: '📖 The Elder Scrolls (Bethesda): o Aetherium é o modelo perfeito — uma descoberta rara muda a história, gera avanços tecnológicos e cria conflito entre facções que querem controlar o recurso.\n\nSeu gatilho: que recurso ou verdade do seu mundo gerou uma disputa histórica que ainda sangra no presente?',
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
      ref: '📖 Avatar: A Lenda de Aang (Nickelodeon): cultura como worldbuilding completo — cada nação tem crença, tradição, arte, língua e costumes visíveis em cada cena.\n\nSeu checklist: o povo do seu mundo pode ser identificado só pelo comportamento em cena, sem legenda?',
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
      ref: '📖 Game of Thrones (George R. R. Martin): equilíbrio perfeito — magia com custo e imprevisibilidade, itens híbridos (Aço Valiriano + Fogovivo), e o choque simbólico entre dragões e balistas como tensão magia vs. engenhosidade humana.\n\nSeu gatilho: quem perde poder político se a magia se tornar acessível a todos?',
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
      ref: '📖 Tolkien (coerência) + Attack on Titan (mistério e origem): Tolkien mostra que criaturas mudam política e história. Attack on Titan vai além: a criatura pode ser ameaça e mistério central ao mesmo tempo, com origem ligada ao próprio humano.\n\nSeu gatilho: e se a criatura mais temida do seu mundo fosse o que a humanidade se torna quando perde algo essencial?',
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
      ref: '📖 O Nome do Vento (Patrick Rothfuss): Kvothe conta moedas antes de decidir o que comer — e isso diz mais sobre o mundo do que páginas de lore. Economia aparece em escolhas de personagem, não em explicações.\n\nSeu gatilho: o que seu protagonista não consegue comprar — e como isso muda uma decisão importante da trama?',
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
      ref: '📖 Tolkien (consistência como padrão): o Sindarin e o Quenya existem porque Tolkien criou regras fonéticas antes de criar palavras — e isso é perceptível mesmo sem estudo. Você não precisa criar gramática completa: precisa de consistência.\n\nSeu gatilho: crie 3 nomes para lugares usando o mesmo padrão sonoro. Se soam como vieram do mesmo povo, você acertou.',
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
      ref: '📖 Mitologia Grega (Hesíodo, As Idades do Homem): as eras do homem organizam a história mítica e definem o tom moral de cada época. A Idade de Ferro, de decadência moral, serve de imagem para qualquer mundo em declínio.\n\nSeu gatilho: em que "era" seu mundo está — e quem sabe que a próxima queda está chegando?',
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
      ref: '📖 George R. R. Martin (personagens cinzas): crie personagens que você ama e odeia ao mesmo tempo. Ned Stark é honrado e idiota. Cersei é cruel e está certa sobre algumas coisas. A regra: virtude forte + falha forte + consequência real.\n\nSeu gatilho: qual é a maior virtude do seu protagonista — e como exatamente ela vai causar sua maior derrota?',
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
      ref: '📖 Regra de ouro da metodologia: cultura não é texto — é comportamento em cena. Em vez de explicar que seu povo valoriza honra, mostre um personagem recusando uma oferta vantajosa porque ela vem de uma fonte desonrosa. O mundo age sobre as pessoas. As pessoas causam reação em cadeia. Você escreve as reações.',
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
