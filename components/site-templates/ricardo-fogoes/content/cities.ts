/**
 * Páginas de cidade.
 *
 * ⚠️ CADA CIDADE TEM ÂNGULO PRÓPRIO, e isso não é capricho de redação.
 * Página de localidade com o mesmo parágrafo e a cidade trocada é o padrão
 * exato que o sistema de conteúdo útil do Google rebaixa. Então cada uma
 * fala de uma coisa diferente e verdadeira daquele lugar:
 *
 *   Aguaí                → é a base; o atendimento sai daqui
 *   São João da Boa Vista→ cidade maior, praça de alimentação e comércio
 *   Casa Branca          → casario antigo, fogão antigo que vale reformar
 *   Mogi Guaçu           → a maior das quatro, cozinha industrial e volume
 *
 * ⚠️ AS DISTÂNCIAS SÃO APROXIMADAS, por estrada, e estão aqui porque o
 * desenho as usa como linha de cota. Alex: confira os quatro números com
 * o Ricardo antes de publicar — número errado num site local é o tipo de
 * detalhe que o cliente percebe e o Google não.
 */

export type City = {
  slug: string;
  name: string;
  /** Como aparece no texto corrido, já flexionado. */
  inName: string;
  state: string;
  /** Distância aproximada até a base, em km. Vira linha de cota no desenho. */
  km: number;
  h1: string;
  metaTitle: string;
  metaDescription: string;
  /** Duas frases de abertura, próprias da cidade. */
  intro: string[];
  /** O que é diferente de atender ali. */
  angle: { title: string; body: string[] };
  /** Bairros e referências. Ajuda busca hiperlocal e prova que conhece a cidade. */
  areas: string[];
  /** Serviços em destaque nesta cidade — ordem importa, é o que ela mais pede. */
  highlight: string[];
  waMessage: string;
};

export const CITIES: City[] = [
  {
    slug: "aguai",
    name: "Aguaí",
    inName: "em Aguaí",
    state: "SP",
    km: 0,
    h1: "Conserto de fogões em Aguaí",
    metaTitle: "Conserto de Fogões em Aguaí/SP | Ricardo Fogões",
    metaDescription:
      "Assistência de fogões em Aguaí: conserto, reforma, limpeza e instalação, residencial e industrial. Atendimento com hora marcada, de segunda a sexta.",
    intro: [
      "Aguaí é a base. O atendimento sai daqui, e é a cidade onde dá para encaixar a visita com menos antecedência.",
      "Residencial e industrial, multimarcas, com hora marcada.",
    ],
    angle: {
      title: "Atendimento na cidade onde a oficina está",
      body: [
        "Estar na mesma cidade muda duas coisas concretas. A primeira é o encaixe: sem deslocamento entre municípios, uma chamada da manhã às vezes cabe na tarde do mesmo dia — dentro da agenda, sem promessa de urgência.",
        "A segunda é a peça. Quando o conserto depende de um item que não está na van, buscar e voltar é uma volta curta, e não um segundo dia de visita.",
        "O endereço fica na Rua Teófilo Fontes Rodrigues. O atendimento é feito no local do cliente; a oficina recebe o que precisa de bancada, combinado antes.",
      ],
    },
    areas: [
      "Centro",
      "Vila Nova",
      "Jardim Aeroporto",
      "Parque Botânico",
      "Vila Santa Isabel",
      "Zona rural e bairros de acesso pela SP-342",
    ],
    highlight: [
      "conserto-de-fogoes-residenciais",
      "limpeza-de-fogoes",
      "reforma-de-fogoes",
    ],
    waMessage:
      "Olá, Ricardo! Sou de Aguaí e preciso de atendimento no meu fogão.",
  },
  {
    slug: "sao-joao-da-boa-vista",
    name: "São João da Boa Vista",
    inName: "em São João da Boa Vista",
    state: "SP",
    km: 22,
    h1: "Conserto de fogões em São João da Boa Vista",
    metaTitle: "Conserto de Fogões em São João da Boa Vista | Ricardo",
    metaDescription:
      "Conserto, limpeza e instalação de fogões em São João da Boa Vista. Atende casa, bar e restaurante — residencial e industrial, com hora marcada.",
    intro: [
      "São João da Boa Vista é a maior das cidades vizinhas atendidas, e a que mais mistura chamada de casa com chamada de cozinha profissional.",
      "O deslocamento é curto e a visita é marcada com hora.",
    ],
    angle: {
      title: "Casa e cozinha profissional na mesma cidade",
      body: [
        "São João tem uma praça de alimentação viva e movimento de estudantes, o que significa muita cozinha ligada o dia inteiro. Fogão industrial e chapa nessas condições envelhecem por saturação, não por idade: o queimador satura de gordura muito antes do que saturaria numa casa.",
        "Ao mesmo tempo, boa parte das chamadas continua sendo residencial clássica — forno que não esquenta, boca que não acende.",
        "Para o estabelecimento, o melhor horário costuma ser o intervalo entre almoço e jantar, e dá para combinar isso dentro da janela de segunda a sexta, das 08h às 18h.",
      ],
    },
    areas: [
      "Centro",
      "Vila Santa Cruz",
      "Jardim Alvorada",
      "Vila Conceição",
      "Jardim Priscila",
      "Distrito de Santa Cruz da Boa Vista",
    ],
    highlight: [
      "conserto-de-fogoes-industriais",
      "manutencao-de-chapas",
      "conserto-de-fogoes-residenciais",
    ],
    waMessage:
      "Olá, Ricardo! Sou de São João da Boa Vista e preciso de atendimento.",
  },
  {
    slug: "casa-branca",
    name: "Casa Branca",
    inName: "em Casa Branca",
    state: "SP",
    km: 25,
    h1: "Conserto de fogões em Casa Branca",
    metaTitle: "Conserto e Reforma de Fogões em Casa Branca/SP | Ricardo",
    metaDescription:
      "Conserto, reforma e limpeza de fogões em Casa Branca. Fogão antigo de boa estrutura costuma valer a recuperação — a avaliação vem antes do orçamento.",
    intro: [
      "Casa Branca tem muita casa de família e muito fogão que já está na segunda geração da mesma cozinha.",
      "É a cidade onde a conversa mais vira reforma em vez de troca.",
    ],
    angle: {
      title: "Fogão antigo costuma ter estrutura melhor",
      body: [
        "Fogão de vinte ou trinta anos atrás foi feito com chapa mais grossa e queimador mais simples de manter. Quando esse fogão chega enferrujado na aparência mas firme na estrutura, recuperar costuma custar menos que substituir por um de linha atual — e o resultado dura mais.",
        "O que decide é a integridade do corpo. Mesa sem perfuração e forno sem ferrugem passante significam que dá para trabalhar; corrosão que atravessou a chapa não volta.",
        "A avaliação é a primeira coisa da visita, e ela inclui dizer quando não compensa. É mais barato ouvir isso antes do que descobrir depois de pagar o conserto.",
      ],
    },
    areas: [
      "Centro",
      "Vila Rosa",
      "Jardim Paulista",
      "Vila Santa Cruz",
      "Distrito de Venda Branca",
      "Distrito de Lagoa Branca",
    ],
    highlight: [
      "reforma-de-fogoes",
      "conserto-de-fogoes-residenciais",
      "limpeza-de-fogoes",
    ],
    waMessage: "Olá, Ricardo! Sou de Casa Branca e preciso de atendimento.",
  },
  {
    slug: "mogi-guacu",
    name: "Mogi Guaçu",
    inName: "em Mogi Guaçu",
    state: "SP",
    km: 27,
    h1: "Conserto de fogões em Mogi Guaçu",
    metaTitle: "Conserto de Fogão Industrial em Mogi Guaçu | Ricardo",
    metaDescription:
      "Conserto de fogões e chapas em Mogi Guaçu, residencial e industrial. Atende cozinha de bar, restaurante e lanchonete, com hora marcada.",
    intro: [
      "Mogi Guaçu é a maior cidade da área atendida, e a que concentra mais cozinha profissional em operação contínua.",
      "O atendimento cobre casa e estabelecimento, com hora marcada.",
    ],
    angle: {
      title: "Volume de cozinha muda o tipo de defeito",
      body: [
        "Em cidade com mais comércio, o padrão de chamada muda. O equipamento raramente para de uma vez: ele perde rendimento devagar, e a cozinha se acostuma. A água passa a demorar mais, a chapa não recupera entre um pedido e outro, e ninguém marca o dia em que começou.",
        "Quando alguém liga, o equipamento já está trabalhando abaixo do que consegue há semanas — e boa parte disso é obstrução de injetor e regulagem, não peça quebrada.",
        "Residência em Mogi segue o padrão de sempre: acendimento, termopar e forno respondem pela maioria das visitas.",
      ],
    },
    areas: [
      "Centro",
      "Jardim Bela Vista",
      "Parque Cidade Nova",
      "Jardim Santa Cecília",
      "Vila São Carlos",
      "Distrito de Martinho Prado Júnior",
    ],
    highlight: [
      "conserto-de-fogoes-industriais",
      "manutencao-de-chapas",
      "limpeza-de-fogoes",
    ],
    waMessage: "Olá, Ricardo! Sou de Mogi Guaçu e preciso de atendimento.",
  },
];

export const CITY_SLUGS = CITIES.map((c) => c.slug);

export function getCity(slug: string): City | undefined {
  return CITIES.find((c) => c.slug === slug);
}

/** Nomes para o `areaServed` do JSON-LD e para a linha de cobertura. */
export const CITY_NAMES = CITIES.map((c) => c.name);
