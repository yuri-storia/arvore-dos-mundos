# Árvore dos Mundos | Template Definitivo do Worldbuilding

Quero transformar o meu e-book, A Árvore dos Mundos: O Guia Definitivo do Worldbuilding.

Crie um app React completo em português do Brasil chamado "A Árvore dos Mundos" — um template interativo de worldbuilding para escritores de ficção. Todo o texto da interface deve estar em português do Brasil.

IDENTIDADE VISUAL
Paleta de cores (use exatamente estes valores):

Fundo principal: #04080f
Cards/painéis: rgba(6,14,28,0.92) com backdrop-filter: blur(12px)
Azul principal: #1565c0
Azul brilhante (destaque, bordas ativas): #2196f3
Azul claro (texto secundário): #64b5f6
Azul glow: #90caf9
Dourado (acentos): #c8922a
Dourado claro: #e8b84b
Texto principal: #e8f4fd
Texto secundário: #b0c8e4
Texto apagado: #607d9b
Borda sutil: rgba(33,150,243,0.18)
Borda ativa: rgba(100,181,246,0.35)
Vermelho alerta: #e53935

Tipografia:

Títulos e nomes dos Frutos: fonte Cinzel (Google Fonts) — serif elegante, estilo fantasia
Interface geral (labels, botões, abas): Montserrat — sans-serif, peso 700-900
Campos de texto e conteúdo narrativo: Merriweather — serif, peso 400/700, com itálico

Estilo geral:

Visual escuro, atmosférico, de fantasia épica — como um grimório digital
Bordas finas com glow azulado
Cards com borda superior 2px solid #2196f3
Animação de entrada nos painéis: fadeUp (opacity 0→1 + translateY 10px→0, 0.33s)
Background: imagem de árvore mística noturna com brilho azulado, opacity 0.22, com overlay radial-gradient(ellipse 100% 80% at 50% 0%, rgba(4,8,15,0.3) 0%, rgba(4,8,15,0.85) 60%, rgba(4,8,15,0.97) 100%)


ESTRUTURA DO APP
O app tem 4 abas principais em navegação sticky no topo:

🌿 Construir — editor principal dos Frutos
🗺 Visão Geral — dashboard de progresso
🖼 Galeria — galeria de imagens de referência
✨ Gerar Imagens — geração de imagens com IA


COMPONENTES GLOBAIS (aparecem em todas as abas)
Cabeçalho (Header)

Badge de marca: ✦ Universo STORIA · Template Oficial ✦ — fonte Cinzel, borda fina azul, fundo rgba(33,150,243,0.06)
Imagem decorativa central: árvore mística noturna com animação flutuante suave (translateY 0 → -8px → 0 em loop de 5s) e drop-shadow azulado pulsante
Título H1: A Árvore (branco) + dos Mundos (azul claro #64b5f6) — fonte Cinzel, tamanho fluido clamp(1.6rem, 5vw, 2.8rem)
Subtítulo em itálico: "Construa universos ricos e sem furos — fruto a fruto — com o auxílio da Inteligência Artificial" — fonte Merriweather, cor #b0c8e4
Linha decorativa: 60px width, 2px height, linear-gradient(90deg, transparent, #2196f3, transparent)

Banner de Limite Diário

Fundo: rgba(21,101,192,0.1), borda 1px solid rgba(33,150,243,0.25), borda superior 2px solid #2196f3
Layout flex: ícone ⚡ + texto "Uso Diário de IA" + subtexto "Resets à meia-noite" à esquerda
Dois medidores à direita:

Textos — mostra X/15 (amarelo #e8b84b quando ≤3 restantes, vermelho #e53935 quando 0)
Imagens — mostra X/3 (mesma lógica de cores)


Limites controlados por localStorage com chave baseada na data atual (YYYY-MM-DD). Reseta automaticamente em novo dia.

Barra de Chave API

Fundo var(--bg-card), borda superior dourada 2px solid #c8922a
Ponto animado dourado pulsante (opacity 1→0.2→1 em 2.2s)
Label: 🔑 Chave OpenAI — Texto (GPT-4o mini) + Imagens (DALL-E 3)
Input type="password" para a chave, placeholder: Cole aqui sua chave OpenAI (sk-…)
Status visual à direita do input:

Chave válida (começa com sk-): badge verde ✓ Chave configurada
Vazio/inválido: badge âmbar Sem chave


Três pills de custo abaixo: GPT-4o mini: ~R$0,005/consulta · DALL-E 3: ~R$0,22/imagem · Limite diário: 15 textos / 3 imagens por dia
Nota em itálico: Sua chave é usada localmente — nunca enviada a servidor algum. + link para platform.openai.com/api-keys

Campo Nome do Mundo

Fundo var(--bg-card), borda superior 2px solid #2196f3
Label pequena: ✦ Nome do seu mundo — fonte Cinzel, cor azul claro
Input grande em fonte Cinzel, sem borda lateral, apenas borda inferior sutil azulada
Placeholder: Ex: Aetherion, Valdris, Nyrmhael…

Navegação de Abas (sticky no topo ao scrollar)

Fundo rgba(4,8,15,0.7) com backdrop-filter: blur(10px)
Borda inferior 1px solid rgba(100,181,246,0.35)
Cada aba: texto uppercase, letra-espaçamento 0.14em, fonte Montserrat 700
Aba ativa: cor #2196f3, border-bottom: 2px solid #2196f3
Aba inativa: cor #607d9b, sem borda inferior


ABA 1 — CONSTRUIR
Controles de metodologia
Dois botões toggle:

⬇ Cima para Baixo — começa pelo mundo, depois personagens
⬆ Baixo para Cima — começa por personagens, depois expande o mundo
Botão ativo tem borda e texto azul, fundo rgba(21,101,192,0.2)

Barra de progresso

Barra fina (3px) com gradiente linear-gradient(90deg, #1565c0, #2196f3) e box-shadow: 0 0 10px rgba(33,150,243,0.5)
Largura animada conforme frutos preenchidos (transition: width 0.5s cubic-bezier(0.4,0,0.2,1))
Texto abaixo: X de 11 frutos iniciados à esquerda + percentual em azul à direita

Grid de Frutos
Grid responsivo repeat(auto-fill, minmax(130px, 1fr)) com 11 cards de Fruto.
Cada card de Fruto é um botão com:

Aspect ratio 3:4 (retrato)
Imagem de capa do Fruto como background (cover), opacity 0.6 por padrão, 1.0 quando hover/ativo
Overlay gradiente escuro na parte inferior
Nome do Fruto em branco bold (uppercase, fonte Montserrat)
Número do Fruto em azul claro (fonte Cinzel)
Contador de progresso em dourado quando parcialmente preenchido: X/4 campos
Badge verde ✓ no canto superior direito quando completamente preenchido
Borda inferior 2px solid #2196f3 animada (scaleX 0→1) no hover e quando ativo
Card ativo: border: 1px solid #2196f3, box-shadow: 0 0 20px rgba(33,150,243,0.3), inset 0 0 30px rgba(33,150,243,0.1)

Imagens dos Frutos: use imagens placeholder atmosféricas com tema de fantasia para cada fruto (podem ser gradientes + ícone se imagens reais não estiverem disponíveis). Cada fruto tem uma imagem temática:

Fruto 1 (Mapa): globo/mapa
Fruto 2 (Político): templo/colunata
Fruto 3 (História): batalha/guerreiros
Fruto 4 (Cultura): pessoas lendo/celebrando
Fruto 5 (Magia): tecnologia/circuitos brilhantes
Fruto 6 (Seres): dragão/criatura fantástica
Fruto 7 (Economia): moedas/esferas de ouro
Fruto 8 (Linguagem): livro/manuscrito antigo
Fruto 9 (Mitologia): figura divina/frutos místicos
Fruto 10 (Personagens): silhueta humana/figura épica
Fruto 11 (Narrativa): globo/ovo do mundo

Painel do Fruto Selecionado
Aparece abaixo do grid com animação fadeUp. Contém:
a) Imagem hero do Fruto no topo (width 100%, height 200px, object-fit: cover, opacity 0.5) com overlay gradiente escurecendo a parte inferior
b) Cabeçalho do painel:

Número do Fruto em azul claro pequeno (ex: ✦ 1º Fruto)
Nome em H2 branco bold, fonte Cinzel
Descrição em itálico, fonte Merriweather, cor #607d9b

c) Grid de campos — 2 colunas, gap 15px. Campos textarea ocupam coluna inteira. Cada campo tem:

Label uppercase pequena em azul claro
Input/textarea com fundo rgba(4,12,24,0.6), borda lateral sutil, borda inferior azulada mais visível
Placeholder em itálico descritivo
onchange que salva no estado global do app

d) Seção do Assistente de IA:

Linha divisória + label GPT-4o mini — Assistente de Worldbuilding com ponto azul pulsante
Chips de sugestão rápida — 4 botões por Fruto (ver lista abaixo). Clicar popula o input de pergunta. Chip ativo: borda e texto azul
Input de pergunta com botão ✦ Consultar
Área de resposta — oculta inicialmente, aparece com animação fadeUp quando há resposta. Tem label ✦ Resposta do GPT-4o mini, texto em Merriweather, borda esquerda 3px solid #2196f3
Estado de loading: três dots animados (bounce keyframe) + texto "Consultando GPT-4o mini…"

e) Navegação inferior:

Botão ← Anterior (transparente) à esquerda
Botão Próximo Fruto → (azul) à direita
No último Fruto, substituir "Próximo" por botão dourado 🌳 Exportar Mundo que baixa um arquivo .md com todo o conteúdo preenchido


DADOS DOS 11 FRUTOS
javascriptconst FRUITS = [
  {
    id: 0, num: '1º Fruto', name: 'Mapa do Mundo',
    desc: 'Geografia, topografia e estrutura física do seu universo.',
    fields: [
      { id: 'continents', label: 'Continentes & Regiões', type: 'textarea', ph: 'Descreva os principais continentes, ilhas ou regiões…' },
      { id: 'climate', label: 'Clima & Biomas', type: 'text', ph: 'Ex: tropical ao sul, tundra ao norte…' },
      { id: 'landmarks', label: 'Locais Icônicos', type: 'textarea', ph: 'Montanhas, rios, cidades lendárias, portais, ruínas…' },
      { id: 'scale', label: 'Escala & Distâncias', type: 'text', ph: 'Tamanho do mundo, dias de viagem entre capitais…' }
    ],
    chips: ['Expandir geografia', 'Criar locais únicos', 'Sugerir nomes', 'Conflitos geográficos']
  },
  {
    id: 1, num: '2º Fruto', name: 'Sistema Político',
    desc: 'Como o poder é distribuído e exercido no seu mundo.',
    fields: [
      { id: 'govtype', label: 'Forma de Governo', type: 'text', ph: 'Ex: monarquia absoluta, república teocrática…' },
      { id: 'factions', label: 'Facções & Potências', type: 'textarea', ph: 'Reinos, impérios, guildas, clãs…' },
      { id: 'conflict', label: 'Tensões Políticas', type: 'textarea', ph: 'Guerras, disputas territoriais, intrigas…' },
      { id: 'laws', label: 'Leis & Tabus', type: 'text', ph: 'O que é proibido? Quais direitos existem?…' }
    ],
    chips: ['Criar intrigas', 'Definir hierarquias', 'Conflitos de poder', 'Desenvolver facções']
  },
  {
    id: 2, num: '3º Fruto', name: 'Fatos Históricos',
    desc: 'O alicerce que sustenta toda a narrativa atual.',
    fields: [
      { id: 'origin', label: 'Era Primordial & Origem', type: 'textarea', ph: 'Como tudo começou? Houve uma era dourada?…' },
      { id: 'wars', label: 'Guerras & Impérios Caídos', type: 'textarea', ph: 'Conflitos que moldaram o presente…' },
      { id: 'turning', label: 'Eventos Decisivos', type: 'textarea', ph: 'O que mudou o curso da história?…' },
      { id: 'present', label: 'Estado Atual', type: 'text', ph: 'Em que ponto histórico a história começa?…' }
    ],
    chips: ['Criar linha do tempo', 'Gerar eventos', 'Aprofundar eras', 'Mitos históricos']
  },
  {
    id: 3, num: '4º Fruto', name: 'Cultura',
    desc: 'Crenças, tradições, arte, língua e costumes dos povos.',
    fields: [
      { id: 'beliefs', label: 'Crenças & Valores', type: 'textarea', ph: 'O que é sagrado? O que é tabu?…' },
      { id: 'arts', label: 'Arte, Música & Literatura', type: 'text', ph: 'Que formas de arte existem?…' },
      { id: 'customs', label: 'Costumes & Ritos', type: 'textarea', ph: 'Nascimento, morte, casamento, guerra…' },
      { id: 'food', label: 'Gastronomia & Vestuário', type: 'text', ph: 'O que comem? Como se vestem?…' }
    ],
    chips: ['Criar tradições', 'Desenvolver rituais', 'Conflitos culturais', 'Aprofundar costumes']
  },
  {
    id: 4, num: '5º Fruto', name: 'Magia & Tecnologia',
    desc: 'Forças sobrenaturais e conhecimento científico.',
    fields: [
      { id: 'magictype', label: 'Tipo de Sistema', type: 'select', opts: ['Magia Dura (regras claras)', 'Magia Suave (misteriosa)', 'Híbrido Magia/Ciência'] },
      { id: 'magicrules', label: 'Regras & Limites', type: 'textarea', ph: 'Como se acessa? Qual o custo? O que é impossível?…' },
      { id: 'tech', label: 'Nível Tecnológico', type: 'text', ph: 'Ex: medieval, steampunk, cristais mágicos…' },
      { id: 'magictech', label: 'Magia × Tecnologia', type: 'textarea', ph: 'Conflitam? Coexistem?…' }
    ],
    chips: ['Criar sistema de magia', 'Definir poderes', 'Balancear limitações', 'Integrar à história']
  },
  {
    id: 5, num: '6º Fruto', name: 'Seres Fantásticos',
    desc: 'Criaturas, raças e entidades que habitam o universo.',
    fields: [
      { id: 'races', label: 'Raças Inteligentes', type: 'textarea', ph: 'Elfos, anões, criaturas originais…' },
      { id: 'creatures', label: 'Criaturas & Bestiário', type: 'textarea', ph: 'Monstros, animais fantásticos, espíritos…' },
      { id: 'origin2', label: 'Origem dos Seres', type: 'text', ph: 'Foram criados pelos deuses? Evoluíram?…' },
      { id: 'relations', label: 'Relações entre Espécies', type: 'textarea', ph: 'Aliados, inimigos, neutros…' }
    ],
    chips: ['Criar criatura', 'Desenvolver raça', 'Gerar lendas', 'Conflitos entre espécies']
  },
  {
    id: 6, num: '7º Fruto', name: 'Economia',
    desc: 'O sistema econômico que movimenta a sociedade.',
    fields: [
      { id: 'currency', label: 'Moeda & Comércio', type: 'text', ph: 'Que moeda usam? Principal mercadoria?…' },
      { id: 'resources', label: 'Recursos & Produção', type: 'textarea', ph: 'O que é raro? Quem controla?…' },
      { id: 'classes', label: 'Classes Sociais', type: 'textarea', ph: 'Como a riqueza é distribuída?…' },
      { id: 'trade', label: 'Rotas Comerciais', type: 'text', ph: 'Cidades comerciais, rotas, cartéis…' }
    ],
    chips: ['Sistema econômico', 'Conflitos por recursos', 'Classes sociais', 'Criar guildas']
  },
  {
    id: 7, num: '8º Fruto', name: 'Linguagem',
    desc: 'Idiomas, escrita e comunicação que tornam o mundo crível.',
    fields: [
      { id: 'languages', label: 'Idiomas Principais', type: 'text', ph: 'Quantos idiomas? Língua franca?…' },
      { id: 'writing', label: 'Sistemas de Escrita', type: 'text', ph: 'Alfabeto, runas, hieróglifos…' },
      { id: 'words', label: 'Vocabulário Único', type: 'textarea', ph: 'Palavras e expressões inventadas…' },
      { id: 'dialects', label: 'Dialetos & Sotaques', type: 'text', ph: 'Como varia por região ou raça?…' }
    ],
    chips: ['Criar palavras', 'Desenvolver idioma', 'Gerar nomes', 'Criar escrita']
  },
  {
    id: 8, num: '9º Fruto', name: 'Mitologia',
    desc: 'Deuses, criação e o significado sagrado do universo.',
    fields: [
      { id: 'gods', label: 'Panteão & Divindades', type: 'textarea', ph: 'Quais deuses existem? Domínios e rivalidades?…' },
      { id: 'creation', label: 'Mito da Criação', type: 'textarea', ph: 'Como o mundo foi criado?…' },
      { id: 'afterlife', label: 'Vida Após a Morte', type: 'text', ph: 'Para onde vão as almas?…' },
      { id: 'sacred', label: 'Textos & Artefatos Sagrados', type: 'textarea', ph: 'Livros sagrados, relíquias, templos…' }
    ],
    chips: ['Mito de criação', 'Desenvolver panteão', 'Gerar profecias', 'Criar religião']
  },
  {
    id: 9, num: '10º Fruto', name: 'Personagens',
    desc: 'Os olhos do leitor — o coração da história.',
    fields: [
      { id: 'protagonist', label: 'Protagonista(s)', type: 'textarea', ph: 'Nome, origem, motivação, conflito interno…' },
      { id: 'antagonist', label: 'Antagonista', type: 'textarea', ph: 'Quem ou o que se opõe? Por quê?…' },
      { id: 'supporting', label: 'Personagens de Suporte', type: 'textarea', ph: 'Aliados, mentores, rivais…' },
      { id: 'arcs', label: 'Arcos de Transformação', type: 'text', ph: 'Como cada personagem muda?…' }
    ],
    chips: ['Desenvolver personagem', 'Criar backstory', 'Conflito interno', 'Aprofundar antagonista']
  },
  {
    id: 10, num: 'Último Fruto', name: 'A Sua Narrativa',
    desc: 'O mundo é o palco — a sua história é o que importa.',
    fields: [
      { id: 'premise', label: 'Premissa Central', type: 'textarea', ph: 'Em uma frase: do que trata sua história?…' },
      { id: 'theme', label: 'Temas & Mensagem', type: 'textarea', ph: 'O que você quer explorar?…' },
      { id: 'tone', label: 'Tom & Gênero', type: 'text', ph: 'Ex: dark fantasy épico, aventura leve…' },
      { id: 'hook', label: 'A Cena de Abertura', type: 'textarea', ph: 'Como sua história começa?…' }
    ],
    chips: ['Desenvolver premissa', 'Primeiro capítulo', 'Refinar conflito', 'Gerar sinopse']
  }
];

LÓGICA DO ASSISTENTE DE IA (Aba Construir)
Ao clicar em ✦ Consultar:

Verificar se a chave OpenAI está configurada (começa com sk-). Se não, mostrar erro na área de resposta.
Verificar se o limite diário de textos não foi atingido (máx 15/dia via localStorage). Se atingido, mostrar aviso.
Montar o prompt com:

System prompt: "Você é um especialista em worldbuilding criativo, metodologia 'A Árvore dos Mundos' do Universo STORIA. Mundo: '[nome do mundo]'. Fruto atual: [número] — [nome]. Metodologia: [Cima para Baixo / Baixo para Cima]. Responda em português brasileiro. Seja específico, criativo e direto."
User message: contexto dos campos já preenchidos naquele Fruto + a pergunta do usuário


Chamar https://api.openai.com/v1/chat/completions com model: "gpt-4o-mini", max_tokens: 900
Mostrar loading com dots animados durante a chamada
Exibir resposta com animação fadeUp
Incrementar contador de textos no localStorage


ABA 2 — VISÃO GERAL
Dashboard com animação fadeUp. Contém:
Cabeçalho

Nome do mundo em H1 (Cinzel) + subtítulo "Visão geral do seu worldbuilding" em itálico

Cards de estatísticas
Grid responsivo com 5 cards (borda superior azul, fundo card escuro):

Frutos Iniciados — número grande em azul, fonte Cinzel
Completos — idem
Campos Preenchidos — total de campos não-vazios em todos os Frutos
Progresso Total — percentual (campos preenchidos / total de campos × 100)
Imagens na Galeria — count da galeria

Resumo do Mundo
Bloco com borda superior dourada. Mostra até 6 campos-chave já preenchidos em formato label: valor:

Regiões (do Fruto 1)
Governo (do Fruto 2)
Magia (do Fruto 5)
Protagonista (do Fruto 10)
Deuses (do Fruto 9)
Tom (do Fruto 11)
Só aparece se ao menos um desses campos tiver conteúdo.

Grid de progresso por Fruto
Grid responsivo de cards clicáveis. Cada card mostra:

Nome e número do Fruto
Imagem temática como fundo com opacity 0.1
Barra de progresso fina (2px) colorida:

Azul #2196f3 se completo
Dourado #c8922a se parcial
Quase invisível se vazio


Badge no canto: Completo (azul) / Em andamento (âmbar) / Não iniciado (cinza)
X de 4 campos em texto pequeno
Borda esquerda colorida: 3px solid azul/dourado/transparente conforme status
Clicar navega para aquele Fruto na aba Construir

Botões de ação

✏️ Continuar Construindo → volta para aba Construir
🌳 Exportar (.md) → download do arquivo Markdown


ABA 3 — GALERIA
Cabeçalho
Título "🖼 Galeria de Referências" + subtítulo em itálico + botão + Adicionar (azul) à direita
Zona de upload
Área tracejada clicável com ícone 🖼, texto "Clique para adicionar imagens" e subtexto "PNG, JPG, WEBP — múltiplos arquivos". Abre seletor de múltiplos arquivos.
Filtros por categoria
Botões horizontais roláveis:
Todos · Geral · Mapa do Mundo · Personagens · Criaturas · Arquitetura · Paisagens · Artefatos · Cultura
Botão ativo: borda azul, texto azul claro, fundo rgba(33,150,243,0.07)
Modal de upload
Ao selecionar arquivos, abre um modal para cada imagem com:

Preview da imagem (height 155px, object-fit cover)
Input para nome (pré-preenchido com nome do arquivo sem extensão)
Select de categoria (as mesmas do filtro)
Botões Cancelar e Salvar
Se múltiplos arquivos: ao salvar um, o modal fecha e reabre automaticamente para o próximo

Grid da galeria
Grid repeat(auto-fill, minmax(170px, 1fr)). Cada item:

Imagem (height 136px, object-fit cover)
Nome e categoria abaixo
Botão ✕ de exclusão aparece no hover (canto superior direito)
Hover: border-color ativa, translateY(-2px), box-shadow


ABA 4 — GERAR IMAGENS
Cabeçalho
Título + subtítulo: "GPT-4o mini cria o prompt perfeito · DALL-E 3 gera a imagem · Uma só chave OpenAI"
Caixa de limite
Painel com borda esquerda azul mostrando imagens restantes do dia + sugestão: "Você também pode copiar o prompt e usar no Midjourney, Leonardo AI ou Bing Image Creator."
Formulário de geração (painel com borda superior azul)
Campos:

Descreva em português (textarea obrigatório) — placeholder: "Ex: A capital do meu reino élfico ao entardecer, com torres de cristal…"
Estilo Visual (select): Fantasy épico (estilo Tolkien) · Dark Fantasy (sombrio) · Anime / Mangá · Realista / Fotográfico · Ilustração medieval · Concept art de videogame · Aquarela / Arte digital · Steampunk · Horror cósmico
Tipo de Imagem (select): Cenário / Paisagem · Personagem (corpo inteiro) · Retrato de personagem · Criatura / Monstro · Objeto / Artefato mágico · Cidade / Arquitetura · Batalha / Cena de ação · Mapa / Cartografia
Tom / Iluminação (select): Épico e grandioso · Sombrio e ominoso · Místico e etéreo · Quente e acolhedor · Frio e desolado · Dramático (luz e sombra)
Detalhes extras (input opcional) — placeholder: "Cores, elementos obrigatórios…"

Botões de ação (em linha)

✦ 1. Criar Prompt com GPT (azul outline)
🎨 2. Gerar com DALL-E 3 (dourado, desabilitado até ter prompt criado)
Nota de custo em itálico: Texto: ~$0,001 · Imagem: ~$0,04

Área do prompt criado
Aparece após etapa 1 com animação fadeUp:

Label ✦ Prompt criado pelo GPT-4o mini
Texto do prompt em Merriweather
Dois botões: 📋 Copiar para Midjourney / Leonardo e 🎨 Gerar com DALL-E 3
Copiar: usa navigator.clipboard.writeText(), botão muda para ✓ Copiado! por 2s

Área de resultado
Aparece após etapa 2 com animação fadeUp:

Imagem gerada em grid
Botão 💾 Salvar na Galeria — adiciona à galeria com categoria "Geral"
Botão ⬇ Baixar — link direto para a URL da imagem gerada


LÓGICA DE GERAÇÃO DE IMAGENS
Etapa 1 — Criar Prompt:

Verificar chave e limite de texto
Montar prompt para GPT: "You are an expert at writing image generation prompts for DALL-E 3 and Midjourney. Respond ONLY with the prompt in English. Be specific about visual details, lighting, composition, and artistic style."
User message inclui: nome do mundo, contexto dos primeiros 6 frutos preenchidos, descrição do usuário, estilo, tipo, tom e extras
Chamar GPT-4o mini, salvar o prompt gerado no estado
Habilitar botão de geração

Etapa 2 — Gerar Imagem:

Verificar chave e limite de imagens
Chamar https://api.openai.com/v1/images/generations com model: "dall-e-3", size: "1024x1024", quality: "standard", n: 1
Exibir imagem retornada
Incrementar contador de imagens no localStorage


EXPORT PARA MARKDOWN
Função exportWorld() gera um arquivo .md com:
# [Nome do Mundo] — Worldbuilding Completo
Metodologia: [Cima para Baixo / Baixo para Cima]

## 1º Fruto: Mapa do Mundo
**Continentes & Regiões:** [conteúdo]
**Clima & Biomas:** [conteúdo]
...

## 2º Fruto: Sistema Político
...
Download via URL.createObjectURL(new Blob([conteúdo], { type: 'text/markdown' })) com nome [nome-do-mundo]-worldbuilding.md

RESPONSIVIDADE

Mobile (< 600px): grid de Frutos com 3 colunas, campos em 1 coluna, padding reduzido
Tablet (600–900px): grid de Frutos com 4–5 colunas, campos em 2 colunas
Desktop (> 900px): layout completo conforme descrito, max-width 1060px centralizado


ESTADO GLOBAL DO APP
Use React useState ou useReducer para manter:

worldName — nome do mundo
db — objeto com { [fruitId]: { [fieldId]: valor } } para todos os campos
currentFruit — índice do Fruto selecionado (0–10)
method — 'top-down' ou 'bottom-up'
gallery — array de { id, src, name, cat } para as imagens
activeTab — aba ativa
apiKey — chave da API (nunca persistida em localStorage por segurança)
generatedPrompt — prompt criado na etapa 1 do gerador

Use localStorage APENAS para:

Limites diários de uso da API (chave adm_YYYY-MM-DD, valor { text: N, img: N })

Não persistir dados do worldbuilding ou da galeria em localStorage (o app é stateless por sessão — o usuário exporta para salvar).

DETALHES DE ANIMAÇÃO
css@keyframes fadeUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes heroFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.2; }
}

@keyframes bounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.35; }
  30% { transform: translateY(-5px); opacity: 1; }
}

FOOTER
Texto centrado, pequeno, uppercase, com opacity 0.4:
A Árvore dos Mundos · Template com IA · Universo STORIA

Construa o app completo, funcional, com todos os 11 Frutos, as 4 abas, o sistema de limites, a integração com OpenAI, a galeria e o export. Priorize fidelidade visual ao estilo descrito — fundo escuro quase preto, glow azulado, atmosfera de fantasia épica noturna. Todo texto da interface em português do Brasil.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://arvore-dos-mundos.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1f6a0aa0-e280-49a4-b3e0-f0b7e02aaf11).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
