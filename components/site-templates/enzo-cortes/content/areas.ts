/**
 * OS BAIRROS — as páginas que respondem em busca local.
 *
 * ── POR QUE BAIRRO E NÃO CIDADE ──────────────────────────────────────────
 * O site do Ricardo tem uma página por CIDADE porque ele se desloca: Aguaí,
 * São João, Casa Branca, Mogi Guaçu são onde ele vai. Uma barbearia não vai
 * a lugar nenhum — quem se desloca é o cliente. E São Bernardo do Campo é
 * uma cidade de ~800 mil habitantes: disputar "barbearia em São Bernardo do
 * Campo" é disputar com o município inteiro, enquanto "barbearia no Jardim
 * Represa" é uma disputa que se ganha.
 *
 * Por isso o recorte é o BAIRRO, e o enquadramento é honesto: estas páginas
 * falam de ONDE A PESSOA VEM e COMO CHEGAR, nunca "atendemos a região".
 * Prometer atendimento em bairro nenhum seria inventar um serviço que não
 * existe.
 *
 * ── O QUE É FATO CONFERIDO ───────────────────────────────────────────────
 * Os quatro bairros abaixo são reais e são da MESMA região de São Bernardo.
 * A checagem não foi por mapa de chute: a Assembleia Legislativa de SP, ao
 * anunciar o 8º Distrito Policial na Estrada dos Alvarengas, descreve a
 * região do Alvarenga como abrangendo Jardim Represa, Jardim Pinheiros e
 * Batistini — que são exatamente estes. O CEP 09854-740 da Av. Vitória
 * também confere com o Jd. Pinheiros / Alvarenga.
 *
 * ⚠️ NENHUMA DISTÂNCIA EM MINUTOS OU QUILÔMETROS APARECE AQUI. Não foram
 * medidas, e "5 minutos de carro" é o tipo de número que parece inofensivo
 * e vira reclamação de quem levou vinte. O que se afirma é o que se sabe:
 * mesma região, mesma via principal.
 */


export type Faq = { q: string; a: string };

export type Area = {
  slug: string;
  /** Nome do bairro, como se escreve. */
  name: string;
  /** "no Jardim Represa", "no Batistini" — preposição pronta, porque concordância não se resolve com concatenação. */
  prep: string;
  /** O bairro em que a barbearia FICA. Só um é. */
  isBase?: boolean;
  h1: string;
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  /** Uma linha no índice de bairros. */
  cardText: string;
  intro: string[];
  /** Bloco próprio de cada bairro — o que ele tem de diferente. */
  context: { title: string; body: string[] };
  faq: Faq[];
  waMessage: string;
};

export const AREAS: Area[] = [
  {
    slug: "jardim-pinheiros",
    name: "Jardim Pinheiros",
    prep: "no Jardim Pinheiros",
    isBase: true,
    h1: "Barbearia no Jardim Pinheiros, São Bernardo do Campo",
    metaTitle: "Barbearia no Jardim Pinheiros — Av. Vitória, 144 | Enzo Cortes",
    metaDescription:
      "Barbearia no Jardim Pinheiros, São Bernardo do Campo: Av. Vitória, 144. Corte R$ 40, barba R$ 25, sobrancelha R$ 15. Seg a sáb, 09h às 19h.",
    eyebrow: "Onde a barbearia fica",
    cardText: "O endereço da casa: Av. Vitória, 144. É aqui que tudo acontece.",
    intro: [
      "A barbearia fica na Av. Vitória, 144, no Jardim Pinheiros. Este é o bairro da casa — não é área atendida, é endereço: é aqui que a cadeira está, de segunda a sábado, das 09h às 19h.",
      "Para quem mora no Jardim Pinheiros, a vantagem óbvia é não precisar de condução para cortar o cabelo. A menos óbvia é a que aparece com o tempo: barbearia perto de casa é a que você consegue manter na frequência certa, em vez de deixar o corte passar do ponto porque o deslocamento não cabia na semana.",
    ],
    context: {
      title: "O endereço, sem mistério",
      body: [
        "Av. Vitória, 144 — Jardim Pinheiros, São Bernardo do Campo/SP, CEP 09854-740. O Jardim Pinheiros faz parte da região do Alvarenga, na zona sul do município, e a Av. Vitória é uma das vias do bairro.",
        "O horário é o mesmo todos os dias úteis e no sábado: das 09h às 19h. Domingo fecha. O jeito mais seguro de não pegar a cadeira ocupada é mandar uma mensagem antes de sair — especialmente no sábado, que é o dia mais cheio de qualquer barbearia.",
      ],
    },
    faq: [
      {
        q: "Qual o endereço da barbearia?",
        a: "Av. Vitória, 144 — Jardim Pinheiros, São Bernardo do Campo/SP, CEP 09854-740.",
      },
      {
        q: "Qual o horário de funcionamento?",
        a: "De segunda a sábado, das 09h às 19h. Domingo não abre.",
      },
      {
        q: "Preciso marcar horário?",
        a: "Não é obrigatório, mas chamar no WhatsApp antes de sair de casa evita esperar — e no sábado faz bastante diferença.",
      },
    ],
    waMessage: "Olá, Enzo! Sou aqui do Jardim Pinheiros e queria marcar um horário.",
  },

  {
    slug: "alvarenga",
    name: "Alvarenga",
    prep: "no Alvarenga",
    h1: "Barbearia na região do Alvarenga — São Bernardo do Campo",
    metaTitle: "Barbearia no Alvarenga, São Bernardo do Campo | Enzo Cortes",
    metaDescription:
      "Barbearia na região do Alvarenga, em São Bernardo do Campo: Av. Vitória, 144, Jd. Pinheiros. Corte R$ 40, corte e barba R$ 60. Seg a sáb, 09h às 19h.",
    eyebrow: "Região",
    cardText: "A região a que o Jardim Pinheiros pertence — a segunda mais populosa de São Bernardo.",
    intro: [
      "O Alvarenga é a região da zona sul de São Bernardo do Campo em que a barbearia está. O Jardim Pinheiros faz parte dela, assim como o Jardim Represa e o Batistini — é o conjunto de bairros que se organiza em torno da Estrada dos Alvarengas, entre a represa Billings e a divisa com Diadema.",
      "É também uma das regiões mais populosas do município, com mais de duzentos mil moradores segundo o levantamento usado para justificar o distrito policial instalado na própria Estrada dos Alvarengas. Muita gente, e historicamente pouco serviço por morador — o que explica por que tanta coisa por aqui ainda é resolvida no centro, a uma viagem de distância.",
    ],
    context: {
      title: "Por que isso importa para quem vai cortar o cabelo",
      body: [
        "Região populosa e com a vida concentrada em um eixo só significa uma coisa prática: a maior parte do deslocamento local acontece pela mesma via. Quem já passa pela Estrada dos Alvarengas no caminho de casa não precisa inventar um trajeto novo para passar aqui.",
        "A barbearia fica na Av. Vitória, 144, no Jardim Pinheiros — dentro da região, não do outro lado da cidade. Para quem mora no Alvarenga, cortar cabelo deixa de ser um programa de sábado de manhã e vira uma parada no caminho.",
      ],
    },
    faq: [
      {
        q: "A barbearia fica no Alvarenga?",
        a: "Fica no Jardim Pinheiros, que é um dos bairros da região do Alvarenga, em São Bernardo do Campo. O endereço é Av. Vitória, 144.",
      },
      {
        q: "Quais bairros ficam na mesma região?",
        a: "Jardim Pinheiros, Jardim Represa e Batistini são da mesma região do Alvarenga, na zona sul de São Bernardo do Campo.",
      },
      {
        q: "Quanto custa um corte?",
        a: "Corte R$ 40, barba R$ 25 e sobrancelha R$ 15. Corte e barba juntos saem por R$ 60, e os três por R$ 70.",
      },
    ],
    waMessage: "Olá, Enzo! Sou aqui do Alvarenga e queria marcar um horário.",
  },

  {
    slug: "jardim-represa",
    name: "Jardim Represa",
    prep: "no Jardim Represa",
    h1: "Barbearia perto do Jardim Represa, em São Bernardo",
    metaTitle: "Barbearia perto do Jardim Represa, SBC | Enzo Cortes",
    metaDescription:
      "Barbearia na mesma região do Jardim Represa, em São Bernardo do Campo: Av. Vitória, 144, Jd. Pinheiros. Corte R$ 40. Seg a sáb, 09h às 19h.",
    eyebrow: "Bairro vizinho",
    cardText: "Mesma região do Alvarenga — sem precisar atravessar a cidade para cortar o cabelo.",
    intro: [
      "O Jardim Represa é um dos bairros da região do Alvarenga, em São Bernardo do Campo, e faz parte do mesmo conjunto que o Jardim Pinheiros, onde a barbearia fica. Quem mora lá não precisa sair da região para cortar o cabelo.",
      "O nome não é decorativo: o bairro está na parte do município que se organiza junto da represa Billings, do mesmo lado da cidade. A referência histórica registrada pela própria prefeitura o situa junto ao Batistini, o que dá bem a medida de como esses bairros são vizinhos entre si.",
    ],
    context: {
      title: "Chegando até aqui",
      body: [
        "A barbearia está na Av. Vitória, 144, no Jardim Pinheiros — mesma região, mesmo lado da cidade. O trajeto entre os dois bairros não passa pelo centro nem pela Anchieta: é deslocamento interno da zona sul.",
        "Se você está vindo pela primeira vez, mande o endereço no WhatsApp antes: dá para confirmar o horário e já garantir que a cadeira vai estar livre quando você chegar.",
      ],
    },
    faq: [
      {
        q: "Tem barbearia perto do Jardim Represa?",
        a: "A Enzo Cortes fica na Av. Vitória, 144, no Jardim Pinheiros — mesma região do Alvarenga, em São Bernardo do Campo.",
      },
      {
        q: "Qual o horário?",
        a: "Segunda a sábado, das 09h às 19h. Domingo fecha.",
      },
      {
        q: "Quanto custa corte e barba?",
        a: "R$ 60 os dois no mesmo atendimento. Avulsos seriam R$ 65.",
      },
    ],
    waMessage: "Olá, Enzo! Sou do Jardim Represa e queria marcar um horário.",
  },

  {
    slug: "batistini",
    name: "Batistini",
    prep: "no Batistini",
    h1: "Barbearia perto do Batistini, São Bernardo do Campo",
    metaTitle: "Barbearia perto do Batistini, SBC | Enzo Cortes",
    metaDescription:
      "Barbearia na mesma região do Batistini, em São Bernardo do Campo: Av. Vitória, 144, Jd. Pinheiros. Corte R$ 40, combinado R$ 70. Seg a sáb, 09h às 19h.",
    eyebrow: "Bairro vizinho",
    cardText: "Também na região do Alvarenga — o corte resolvido do lado de casa.",
    intro: [
      "O Batistini é um bairro residencial de São Bernardo do Campo e integra a mesma região do Alvarenga em que a barbearia está. É o tipo de bairro em que quase tudo se resolve a pé ou com um deslocamento curto — e cortar o cabelo devia entrar nessa lista.",
      "A barbearia fica na Av. Vitória, 144, no Jardim Pinheiros: mesma região, sem subir para o centro de São Bernardo e sem atravessar para o outro lado da Anchieta.",
    ],
    context: {
      title: "O que você encontra aqui",
      body: [
        "A tabela inteira está publicada, o que é a coisa mais útil que um site de barbearia pode fazer por quem está decidindo: corte R$ 40, barba R$ 25, sobrancelha R$ 15, risco a partir de R$ 5. Corte e barba juntos, R$ 60. Os três, R$ 70.",
        "Nenhum desses valores depende de pacote, fidelidade ou primeira visita. É o preço, e ele está aqui justamente para você não precisar ligar para perguntar.",
      ],
    },
    faq: [
      {
        q: "Tem barbearia perto do Batistini?",
        a: "A Enzo Cortes fica na Av. Vitória, 144, Jardim Pinheiros — mesma região do Alvarenga, em São Bernardo do Campo.",
      },
      {
        q: "Precisa agendar?",
        a: "Não é obrigatório, mas mandar uma mensagem antes evita esperar, principalmente aos sábados.",
      },
      {
        q: "Qual o combinado mais em conta?",
        a: "Corte, barba e sobrancelha por R$ 70 — avulsos dariam R$ 80, então é o maior desconto da tabela.",
      },
    ],
    waMessage: "Olá, Enzo! Sou do Batistini e queria marcar um horário.",
  },
];

export const AREA_SLUGS = AREAS.map((a) => a.slug);
export const AREA_NAMES = AREAS.map((a) => a.name);

export function getArea(slug: string): Area | undefined {
  return AREAS.find((a) => a.slug === slug);
}

/** O bairro da casa. Usado no endereço e no JSON-LD. */
export const BASE_AREA = AREAS.find((a) => a.isBase) ?? AREAS[0];

// ⚠️ `areaWaLink` FOI REMOVIDA de propósito (e não é resquício): ela montava o
// link de WhatsApp do bairro por fora, e com o CTA decidido em um lugar só
// (`bookingCta`, em `content/business`) ela seria a porta que devolve o botão
// antigo a quem a encontrasse. A mensagem do bairro continua onde sempre
// esteve — `area.waMessage` — e é ela que o decisor recebe.
