// AS ÁREAS ATENDIDAS — uma página por município da Ilha do Maranhão.
//
// ⚠️ O RECORTE É A ILHA, E ISSO TEM LASTRO: São Luís, São José de Ribamar,
// Paço do Lumiar e Raposa são os QUATRO municípios que ocupam a Ilha do
// Maranhão (Upaon-Açu). É um fato geográfico, não um raio de atendimento
// inventado — e é a razão de a lista ter exatamente esses quatro nomes.
//
// ⚠️ NENHUMA PÁGINA DIZ DISTÂNCIA EM MINUTOS nem promete prazo de
// deslocamento: ninguém mediu, e prometer "atendemos em 30 minutos" é a
// primeira promessa que o site quebra num dia de trânsito.
//
// ⚠️ E NENHUMA É A OUTRA COM O NOME TROCADO. Cada uma fala do que ali é
// verdade — o perfil de ocupação, o tipo de imóvel, o que pesa na conta. Texto
// clonado com a cidade substituída é o padrão que o buscador trata como
// conteúdo duplicado, e o efeito seria o oposto do pretendido.
//
// ⚠️ DIFERENTE DE UMA BARBEARIA, AQUI QUEM SE DESLOCA É A EMPRESA: instalação
// de sistema solar acontece no imóvel do cliente. Por isso a área atendida é
// uma afirmação de serviço, e não só um endereço.

export type Area = {
  slug: string;
  /** O nome do município. */
  name: string;
  /** "em São Luís", "na Raposa" — concordância não se resolve concatenando. */
  prep: string;
  uf: string;
  /** Onde a loja fica de verdade. Só um pode ser a base. */
  isBase: boolean;
  h1: string;
  title: string;
  description: string;
  eyebrow: string;
  /** A frase do card na home e na página de áreas. */
  card: string;
  wa: string;
  intro: string[];
  /** O que é específico dali. */
  focus: { title: string; lead: string; items: { title: string; text: string }[] };
};

export const AREAS: Area[] = [
  {
    slug: "sao-luis",
    name: "São Luís",
    prep: "em São Luís",
    uf: "MA",
    isBase: true,
    h1: "Energia solar em São Luís",
    title: "Energia solar em São Luís/MA | EcoLuz",
    description:
      "Projeto, instalação e homologação de energia solar em São Luís. A EcoLuz fica no Turu e atende residências, comércios e empresas na capital.",
    eyebrow: "Nossa base",
    card: "A loja fica no Turu, na Av. Mário Andreazza — é daqui que os projetos saem.",
    wa: "Olá! Sou de São Luís e quero energia solar. Podemos conversar?",
    intro: [
      "São Luís é a base da EcoLuz: a loja fica no Turu, no Centro Comercial Bougainville, na Av. Mário Andreazza. Quem é da capital consegue resolver presencialmente o que em outros lugares só se resolve por telefone.",
      "A capital concentra os dois perfis que mais procuram energia solar: a casa em que o ar-condicionado domina a conta e o comércio que funciona o dia inteiro com refrigeração ligada. São situações diferentes, e o dimensionamento acompanha essa diferença.",
    ],
    focus: {
      title: "O que pesa na conta em São Luís",
      lead: "Clima quente o ano inteiro e maresia em boa parte da cidade: dois fatores que entram tanto no consumo quanto na manutenção.",
      items: [
        {
          title: "Climatização é a maior carga",
          text: "Em casa e no comércio, o ar-condicionado costuma responder pela maior fatia do consumo — e ele funciona justamente nas horas de maior geração solar.",
        },
        {
          title: "Maresia perto do litoral",
          text: "Em bairros mais próximos do mar, a escolha da estrutura de fixação e o intervalo de limpeza precisam levar a salinidade em conta.",
        },
        {
          title: "Telhado, laje e sombreamento",
          text: "Em áreas mais verticalizadas, a sombra de prédios e árvores muda o posicionamento dos módulos — e isso é decidido na visita, não no mapa.",
        },
        {
          title: "Atendimento presencial",
          text: "Dá para passar na loja, levar a conta de luz e sair com a conversa começada, em vez de mandar foto e esperar.",
        },
      ],
    },
  },

  {
    slug: "sao-jose-de-ribamar",
    name: "São José de Ribamar",
    prep: "em São José de Ribamar",
    uf: "MA",
    isBase: false,
    h1: "Energia solar em São José de Ribamar",
    title: "Energia solar em São José de Ribamar/MA | EcoLuz",
    description:
      "Energia solar para casas, comércios e sítios em São José de Ribamar. Sistemas conectados à rede e off-grid com baterias, com projeto e homologação.",
    eyebrow: "Ilha do Maranhão",
    card: "Do centro urbano às áreas mais afastadas, onde a queda de energia ainda é rotina.",
    wa: "Olá! Sou de São José de Ribamar e quero energia solar.",
    intro: [
      "São José de Ribamar mistura duas realidades no mesmo município: a parte urbana, colada em São Luís e com o mesmo perfil de consumo da capital, e as áreas mais afastadas, onde a rede elétrica é mais frágil e a queda de energia faz parte da rotina.",
      "Essa diferença muda o projeto. Na primeira, o sistema conectado à rede resolve — o objetivo é a conta. Na segunda, a conversa quase sempre passa por baterias, porque o problema não é só o valor: é ficar sem energia.",
    ],
    focus: {
      title: "Dois cenários, dois projetos",
      lead: "O mesmo município comporta o sistema mais simples e o mais completo — o que decide é onde o imóvel está e o que incomoda mais.",
      items: [
        {
          title: "Área urbana",
          text: "Perfil parecido com o da capital: casa com climatização, comércio de rua e a conta de luz como alvo principal.",
        },
        {
          title: "Áreas afastadas e povoados",
          text: "Onde a interrupção é frequente, o sistema híbrido mantém geladeira, iluminação e bomba d'água funcionando com a rede fora.",
        },
        {
          title: "Chácaras e sítios",
          text: "Bombeamento de água e equipamentos que não podem parar são o ponto de partida do dimensionamento off-grid.",
        },
        {
          title: "Visita técnica",
          text: "A avaliação é feita no local: telhado, padrão de entrada e a distância até o ponto de consumo mudam o projeto.",
        },
      ],
    },
  },

  {
    slug: "paco-do-lumiar",
    name: "Paço do Lumiar",
    prep: "em Paço do Lumiar",
    uf: "MA",
    isBase: false,
    h1: "Energia solar em Paço do Lumiar",
    title: "Energia solar em Paço do Lumiar/MA | EcoLuz",
    description:
      "Energia solar para residências e condomínios em Paço do Lumiar. Dimensionamento pelo consumo, instalação e homologação na concessionária.",
    eyebrow: "Ilha do Maranhão",
    card: "Bairro residencial em expansão, telhado próprio e conta que cresce com a família.",
    wa: "Olá! Sou de Paço do Lumiar e quero energia solar.",
    intro: [
      "Paço do Lumiar é vizinho imediato do Turu, onde fica a loja — é uma das áreas mais próximas da base da EcoLuz. O município cresceu como região residencial, com muita casa térrea, telhado próprio e condomínio horizontal.",
      "Esse é o cenário mais favorável que existe para energia solar: área de cobertura disponível, imóvel próprio e uma conta que sobe conforme a família e os equipamentos aumentam.",
    ],
    focus: {
      title: "O perfil residencial",
      lead: "Casa com telhado próprio é o caso em que o projeto costuma ser mais direto — e em que a diferença na conta aparece mais rápido.",
      items: [
        {
          title: "Telhado disponível",
          text: "Casa térrea e sobrado com cobertura livre facilitam o posicionamento dos módulos na melhor orientação.",
        },
        {
          title: "Consumo que cresce com a casa",
          text: "Mais um ar-condicionado, uma piscina, um filho que volta a morar: o consumo muda, e o sistema pode ser dimensionado pensando nisso.",
        },
        {
          title: "Condomínios horizontais",
          text: "Instalação individual por unidade, com atenção às regras de fachada e à convenção do condomínio.",
        },
        {
          title: "Perto da loja",
          text: "Proximidade com o Turu facilita tanto a visita técnica quanto o retorno para manutenção depois.",
        },
      ],
    },
  },

  {
    slug: "raposa",
    name: "Raposa",
    prep: "na Raposa",
    uf: "MA",
    isBase: false,
    h1: "Energia solar na Raposa",
    title: "Energia solar na Raposa/MA | EcoLuz",
    description:
      "Energia solar na Raposa com atenção à maresia: escolha de estrutura, fixação e manutenção para imóvel de litoral. Sistemas com e sem bateria.",
    eyebrow: "Ilha do Maranhão",
    card: "Litoral, maresia e vento: aqui a escolha da estrutura importa tanto quanto a do módulo.",
    wa: "Olá! Sou da Raposa e quero energia solar.",
    intro: [
      "A Raposa é o município mais litorâneo da ilha, e isso muda o projeto de um jeito que não aparece em catálogo: maresia e vento são fatores de instalação, não detalhes.",
      "Um sistema montado ali sem pensar nisso funciona no primeiro ano e começa a dar problema depois — corrosão em fixação inadequada e acúmulo de sal na superfície dos módulos. É a diferença entre um projeto feito para o litoral e um projeto genérico instalado no litoral.",
    ],
    focus: {
      title: "O que muda num imóvel de litoral",
      lead: "A decisão técnica aqui é sobre durabilidade tanto quanto sobre geração.",
      items: [
        {
          title: "Estrutura e fixação",
          text: "Materiais e acabamento escolhidos para ambiente salino, que é onde a estrutura errada cobra o preço mais cedo.",
        },
        {
          title: "Vento",
          text: "A fixação precisa considerar a carga de vento da região — é um cálculo de projeto, não um aperto a mais no parafuso.",
        },
        {
          title: "Limpeza mais frequente",
          text: "O sal que assenta na superfície reduz a geração aos poucos, então o intervalo entre limpezas é mais curto que no interior da ilha.",
        },
        {
          title: "Pousadas e comércio de praia",
          text: "Consumo concentrado em temporada e refrigeração ligada o dia inteiro mudam o dimensionamento em relação a uma residência.",
        },
      ],
    },
  },
];

export const AREA_BY_SLUG = new Map(AREAS.map((a) => [a.slug, a]));
