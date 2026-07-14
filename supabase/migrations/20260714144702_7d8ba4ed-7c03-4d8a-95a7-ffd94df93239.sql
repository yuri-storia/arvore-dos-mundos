
-- 1. Flag is_demo em profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

-- Marca a conta de demonstração
UPDATE public.profiles SET is_demo = true WHERE user_id = 'cb43da6e-2e4a-4e35-a4c2-ed8839315cc7';

-- 2. Helper: is_demo_user
CREATE OR REPLACE FUNCTION public.is_demo_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_demo FROM public.profiles WHERE user_id = _user_id), false);
$$;

-- 3. Função de reset (somente admin)
CREATE OR REPLACE FUNCTION public.reset_demo_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _demo_id uuid := 'cb43da6e-2e4a-4e35-a4c2-ed8839315cc7';
  _world_id uuid;
  _empty_world_id uuid;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Limpa tudo do usuário demo (cascade cuida do resto)
  DELETE FROM public.codex_entries WHERE user_id = _demo_id;
  DELETE FROM public.manuscripts WHERE user_id = _demo_id;
  DELETE FROM public.worlds WHERE user_id = _demo_id;

  -- Mundo 1: Reino de Valdora (parcialmente preenchido)
  INSERT INTO public.worlds (user_id, name, method, db, gallery) VALUES (
    _demo_id,
    'Reino de Valdora',
    'top-down',
    jsonb_build_object(
      '1', jsonb_build_object(
        'conceito', 'Um mundo de fantasia construído sobre ruínas de uma civilização que dominava uma forma antiga de magia ligada à memória. O esquecimento é a moeda mais valiosa e a mais perigosa.',
        'leis', 'A magia exige uma memória como pagamento. Quem esquece demais perde a identidade.',
        'tom', 'Sombrio, melancólico, com pontos de esperança luminosa.'
      ),
      '2', jsonb_build_object(
        'geografia', 'Continente central chamado Valdora, cercado por um mar de névoa constante (o Mar de Lete). Três grandes regiões: as Montanhas de Sarn ao norte, as Planícies de Ehren no centro, e o Deserto de Ossos ao sul.',
        'clima', 'Temperado ao centro; congelante ao norte; árido ao sul.'
      ),
      '3', jsonb_build_object(
        'povos', 'Valdorianos (humanos das planícies), Sarnitas (montanheses de pele acinzentada) e os Sem-Nome (nômades do deserto que renunciam à memória).'
      ),
      '4', jsonb_build_object(
        'culturas', 'Os Valdorianos cultivam a arte da caligrafia como forma de preservar memórias. Os Sarnitas praticam rituais de ferro-e-sangue. Os Sem-Nome vivem apenas o presente.'
      ),
      '5', jsonb_build_object(
        'historia', 'Há 800 anos, o Império de Aureth caiu quando seus magos tentaram esquecer coletivamente a existência da morte. Restaram apenas ruínas e o legado da magia da memória.'
      ),
      '6', jsonb_build_object(
        'politica', 'O Concílio dos Escribas governa Valdora. Sete cadeiras, cada uma representando uma casa nobre. Corrupção e conspirações são a norma.'
      ),
      '7', jsonb_build_object(
        'religiao', 'Culto à Deusa Mnemea, guardiã das memórias esquecidas. Templos são bibliotecas vivas.'
      ),
      '8', jsonb_build_object(
        'magia', 'Magia da Memória: o usuário troca lembranças pessoais por poder. Cada feitiço apaga algo. Grandes feiticeiros são frequentemente pessoas sem passado.'
      ),
      '9', jsonb_build_object(
        'conflitos', 'Tensão crescente entre o Concílio e os Sem-Nome. Rumores de que o Império de Aureth pode ser ressuscitado por alguém que colete memórias suficientes.'
      )
    ),
    '[]'::jsonb
  ) RETURNING id INTO _world_id;

  -- Mundo 2: vazio
  INSERT INTO public.worlds (user_id, name, method, db, gallery) VALUES (
    _demo_id, 'Novo Mundo de Teste', 'top-down', '{}'::jsonb, '[]'::jsonb
  ) RETURNING id INTO _empty_world_id;

  -- Codex entries para o Reino de Valdora
  INSERT INTO public.codex_entries (user_id, world_id, title, content, entry_type, fruit_id) VALUES
    -- Personagens (3)
    (_demo_id, _world_id, 'Lyra Vhen', 'Escriba-mestre do Concílio. Perdeu a lembrança do próprio nome ao aprender a magia da memória, e agora usa o nome que os outros lhe deram. Metódica, silenciosa, guarda um segredo sobre a queda de Aureth.', 'personagem', 11),
    (_demo_id, _world_id, 'Kaen do Ferro', 'Guerreiro sarnita exilado. Carrega um machado forjado com o sangue de seu clã. Busca vingança contra o Concílio por um massacre nas Montanhas de Sarn.', 'personagem', 11),
    (_demo_id, _world_id, 'A Sem-Nome de Olhos Azuis', 'Nômade do Deserto de Ossos que, apesar de renunciar à memória, possui lampejos proféticos. Fala em enigmas.', 'personagem', 11),
    -- Locais (3)
    (_demo_id, _world_id, 'Cidade Alta de Ehren', 'Capital de Valdora. Torres de pedra branca e bibliotecas subterrâneas. Sede do Concílio dos Escribas.', 'local', 2),
    (_demo_id, _world_id, 'Ruínas de Aureth', 'Os restos silenciosos do antigo império, no coração do Deserto de Ossos. Nada cresce lá; sussurros ecoam entre as colunas.', 'local', 2),
    (_demo_id, _world_id, 'Templo de Mnemea', 'Biblioteca-templo escavada em uma montanha. Sacerdotes registram memórias doadas por peregrinos.', 'local', 2),
    -- Culturas (2)
    (_demo_id, _world_id, 'Caligrafia Viva', 'Prática valdoriana de escrever memórias em tinta feita com lágrimas. Textos que "sangram" ao serem lidos por descendentes.', 'cultura', 4),
    (_demo_id, _world_id, 'Ritual do Ferro-e-Sangue', 'Cerimônia sarnita de passagem à vida adulta. O jovem forja sua própria arma com o próprio sangue.', 'cultura', 4),
    -- Povos (2)
    (_demo_id, _world_id, 'Valdorianos', 'Humanos cultos das planícies centrais. Valorizam conhecimento, escrita e diplomacia.', 'povo', 3),
    (_demo_id, _world_id, 'Sarnitas', 'Montanheses de pele acinzentada, resistentes ao frio, orgulhosos e territoriais.', 'povo', 3),
    -- Organizações (2)
    (_demo_id, _world_id, 'Concílio dos Escribas', 'Órgão governante composto por sete casas nobres. Controla o acesso à magia da memória através das bibliotecas.', 'organizacao', 6),
    (_demo_id, _world_id, 'Irmandade da Névoa', 'Sociedade secreta que acredita na volta de Aureth. Recruta magos exilados e Sem-Nome.', 'organizacao', 6),
    -- Conflitos (2)
    (_demo_id, _world_id, 'A Crise das Memórias Perdidas', 'Um número crescente de valdorianos comuns está esquecendo eventos importantes sem terem usado magia. Ninguém sabe por quê.', 'conflito', 9),
    (_demo_id, _world_id, 'Guerra Fria entre Sarn e Ehren', 'Tensões diplomáticas após um assassinato mal explicado envolvendo um embaixador sarnita.', 'conflito', 9),
    -- Sistema de magia
    (_demo_id, _world_id, 'Magia da Memória', 'Cada feitiço exige o pagamento de uma memória. Feitiços menores custam lembranças triviais; feitiços poderosos podem apagar anos de vida. A memória paga não volta.', 'magia', 8),
    -- Religião
    (_demo_id, _world_id, 'Culto de Mnemea', 'Religião principal de Valdora. Mnemea é a deusa que guarda as memórias esquecidas em uma biblioteca eterna. Sacerdotes coletam memórias doadas por peregrinos.', 'religiao', 7),
    -- Linha do tempo (Cronologia)
    (_demo_id, _world_id, 'Ano -800: Ascensão de Aureth', 'O Império de Aureth surge no que hoje é o Deserto de Ossos. Descobrem a magia da memória.', 'cronologia', 5),
    (_demo_id, _world_id, 'Ano -1: A Grande Esquecida', 'Os magos de Aureth tentam esquecer coletivamente a morte. O império colapsa em uma única noite.', 'cronologia', 5),
    (_demo_id, _world_id, 'Ano 0: Fundação do Concílio', 'Sobreviventes valdorianos formam o Concílio dos Escribas. Ehren é fundada.', 'cronologia', 5),
    (_demo_id, _world_id, 'Ano 800: Os dias atuais', 'A campanha começa. Rumores de que Aureth está retornando.', 'cronologia', 5);

END;
$$;

REVOKE ALL ON FUNCTION public.reset_demo_data() FROM public;
GRANT EXECUTE ON FUNCTION public.reset_demo_data() TO authenticated;

-- Popula os dados iniciais chamando a função (bypass do check de auth.uid porque é service role rodando a migração)
DO $$ BEGIN PERFORM public.reset_demo_data(); END $$;
