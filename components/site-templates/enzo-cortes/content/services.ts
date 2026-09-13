/**
 * A TABELA DE PREÇOS — e as páginas de serviço que nascem dela.
 *
 * ── POR QUE O PREÇO É A PEÇA CENTRAL DESTE SITE ──────────────────────────
 * Barbearia é decisão de minutos, e a pergunta que decide é "quanto custa".
 * A maioria dos sites do ramo esconde o valor atrás de "consulte" ou de um
 * formulário — e quem procura simplesmente abre o próximo resultado. O Enzo
 * informou a tabela INTEIRA, então ela vira o centro da home em vez de uma
 * nota de rodapé.
 *
 * ── REGRA DE CONTEÚDO ────────────────────────────────────────────────────
 * Nenhum texto é reaproveitado entre páginas. O sistema de conteúdo útil do
 * Google rebaixa página de serviço "fiada" — o mesmo parágrafo com a palavra
 * trocada é exatamente o padrão que ele detecta, e o efeito é o oposto do
 * pretendido.
 *
 * ⚠️ E NENHUM TEXTO PROMETE O QUE NÃO FOI INFORMADO. Não há duração, produto
 * usado, técnica garantida, toalha quente, lavagem inclusa nem política de
 * agendamento — nada disso foi dito. O que as páginas fazem é explicar o que
 * se PODE pedir e quanto custa, e mandar combinar o resto no WhatsApp. É a
 * diferença entre informar e inventar.
 */

import { whatsappLink } from "./business";

export type Faq = { q: string; a: string };

/** O desenho que representa o serviço. Ver `deco.tsx`. */
export type ServiceArt = "scissors" | "razor" | "brow" | "liner" | "duo" | "trio";

export type Service = {
  slug: string;
  /** Nome curto — menu, cardápio de preços, breadcrumb. */
  label: string;
  /** H1 da página. Escrito para busca, legível para gente. */
  h1: string;
  metaTitle: string;
  metaDescription: string;
  /** Rótulo pequeno acima do H1. */
  eyebrow: string;
  /** Uma linha no cardápio e no card. */
  cardText: string;
  art: ServiceArt;
  /** Preço em reais inteiros. */
  price: number;
  /**
   * `true` quando o valor informado é um piso ("a partir de R$ 5").
   *
   * ⚠️ Campo próprio, e não um preço nulo ou um texto solto: é ele que decide
   * o "a partir de" NAS QUATRO superfícies (cardápio, card, página e JSON-LD)
   * de uma vez. Escrito à mão em cada uma, a que esquecesse anunciaria preço
   * fechado para um serviço que varia — e preço anunciado a menos é a
   * reclamação que chega na cadeira, não no site.
   */
  priceFrom?: boolean;
  /** De quais avulsos o combinado é feito. Alimenta `saving()`. */
  sumOf?: string[];
  waMessage: string;
  /** Abertura: o que é, para quem é. */
  intro: string[];
  /** O que dá para pedir. Lista fechada, sem promessa. */
  covers: { title: string; body: string[]; items: { title: string; text: string }[] };
  faq: Faq[];
  /** "Veja também" — escolhido, não o primeiro da lista. */
  related: string[];
};

export const SERVICES: Service[] = [
  {
    slug: "corte-de-cabelo",
    label: "Corte",
    h1: "Corte de cabelo masculino no Jardim Pinheiros",
    metaTitle: "Corte de Cabelo Masculino R$ 40 — Jd. Pinheiros, SBC | Enzo Cortes",
    metaDescription:
      "Corte masculino por R$ 40 na Av. Vitória, 144 — Jardim Pinheiros, São Bernardo do Campo. Degradê, social, máquina ou tesoura. Seg a sáb, 09h às 19h.",
    eyebrow: "Serviço 01",
    cardText: "Degradê, social, na máquina ou na tesoura — o acabamento é combinado na cadeira.",
    art: "scissors",
    price: 40,
    waMessage: "Olá, Enzo! Queria marcar um corte de cabelo.",
    intro: [
      "O corte é o serviço mais pedido da casa e o mais difícil de acertar por telefone: cada cabeça tem um tipo de fio, um redemoinho e um jeito de cair depois que seca. Por isso o combinado é feito na cadeira, antes de a máquina ligar — quanto tirar dos lados, onde começa a transição, como fica o topo e o que você faz com ele no dia a dia.",
      "Vale para quem já sabe o nome do que quer — degradê baixo, médio, navalhado, social, na tesoura — e para quem só sabe que está na hora. As duas conversas terminam no mesmo lugar: o corte que dá para manter até a próxima, e não só o que fica bom na primeira hora.",
    ],
    covers: {
      title: "O que dá para pedir",
      body: [
        "A lista abaixo é do que se conversa antes de começar. Nada aqui é cobrado à parte: o corte é R$ 40, com ou sem acabamento mais trabalhoso.",
      ],
      items: [
        {
          title: "A altura da transição",
          text: "Onde o degradê começa a subir muda a cara do corte inteiro. Baixo é discreto e aguenta mais tempo sem aparecer o crescimento; alto marca mais e pede retorno mais cedo.",
        },
        {
          title: "Máquina, tesoura ou os dois",
          text: "Máquina dá uniformidade e velocidade; tesoura dá textura e deixa o cabelo cair mais solto. Cabelo liso e fino costuma pedir tesoura no topo para não ficar chapado.",
        },
        {
          title: "O contorno",
          text: "A linha da testa, a costeleta e a nuca. É o detalhe que faz o corte parecer recém-feito por mais tempo — ou denunciar que já passou da hora.",
        },
        {
          title: "O que sobra em cima",
          text: "Comprimento do topo decidido pelo que você realmente faz de manhã. Corte que só funciona com dez minutos de secador não é corte, é fantasia.",
        },
      ],
    },
    faq: [
      {
        q: "Quanto custa o corte de cabelo?",
        a: "R$ 40. É o valor do corte avulso. Se você também vai fazer a barba, o combinado dos dois sai por R$ 60 em vez de R$ 65.",
      },
      {
        q: "Dá para fazer sem marcar?",
        a: "O jeito mais seguro é chamar no WhatsApp antes de sair de casa para combinar o horário — assim você não pega a cadeira ocupada. A barbearia abre de segunda a sábado, das 09h às 19h.",
      },
      {
        q: "Quanto tempo demora?",
        a: "Depende do corte: um acabamento simples é rápido, um degradê trabalhado leva mais. Se você tem hora para estar em outro lugar, avise ao combinar o horário que fica mais fácil encaixar.",
      },
      {
        q: "De quanto em quanto tempo devo voltar?",
        a: "Não há regra: depende de quanto o seu cabelo cresce e de quão marcado é o corte. Degradê alto costuma pedir retorno antes que o baixo, porque a transição aparece mais rápido.",
      },
    ],
    related: ["corte-e-barba", "risco-e-desenho", "sobrancelha"],
  },

  {
    slug: "barba",
    label: "Barba",
    h1: "Barba feita e alinhada em São Bernardo do Campo",
    metaTitle: "Barba R$ 25 — Barbearia no Jd. Pinheiros, SBC | Enzo Cortes",
    metaDescription:
      "Barba por R$ 25 na Av. Vitória, 144 — Jardim Pinheiros, São Bernardo do Campo. Desenho, alinhamento e acabamento. Seg a sáb, 09h às 19h.",
    eyebrow: "Serviço 02",
    cardText: "Desenho, alinhamento e acabamento — do aparado curto ao contorno de barba cheia.",
    art: "razor",
    price: 25,
    waMessage: "Olá, Enzo! Queria marcar a barba.",
    intro: [
      "Barba é desenho antes de ser corte. O que muda o rosto não é o comprimento do pelo, é onde as linhas param: a altura do pescoço, a curva da bochecha e a ligação com a costeleta. Errar essas três é o que faz a barba parecer desleixada mesmo recém-feita.",
      "O serviço cobre desde o aparado curto e uniforme até o contorno de barba cheia, que é mantida no comprimento e só tem as bordas desenhadas. Quem está deixando crescer também tem o que fazer aqui: nessa fase o trabalho é justamente segurar as laterais para a barba encher sem ficar quadrada.",
    ],
    covers: {
      title: "O que dá para pedir",
      body: [
        "Por R$ 25, avulso. Quem faz junto com o corte paga R$ 60 pelos dois, em vez de R$ 65.",
      ],
      items: [
        {
          title: "A linha do pescoço",
          text: "O erro mais comum em barba feita em casa. Alta demais encurta o rosto; baixa demais deixa aspecto de barba por fazer. O ponto certo costuma ficar acima do pomo de adão, e é isso que se marca.",
        },
        {
          title: "A curva da bochecha",
          text: "Reta ou acompanhando o crescimento natural. Reta marca mais e exige manutenção mais frequente; a natural é mais discreta e perdoa alguns dias a mais.",
        },
        {
          title: "O comprimento",
          text: "Uniforme na máquina ou com degradê acompanhando o corte. Barba que continua o degradê do cabelo é o acabamento que amarra os dois serviços.",
        },
        {
          title: "O bigode",
          text: "Aparado na linha do lábio ou deixado por cima. Decisão à parte do resto da barba, e que muda bastante a expressão.",
        },
      ],
    },
    faq: [
      {
        q: "Quanto custa fazer a barba?",
        a: "R$ 25 avulso. Com o corte de cabelo junto, os dois saem por R$ 60 — R$ 5 a menos do que pagando separado.",
      },
      {
        q: "Faz barba de quem está deixando crescer?",
        a: "Sim, e é justamente a fase em que mais vale passar na barbearia: o que faz a barba encher bonita é segurar as laterais e o pescoço enquanto o resto cresce.",
      },
      {
        q: "Dá para alinhar só o contorno?",
        a: "Dá. Mantém-se o comprimento como está e trabalha-se só o pescoço, a bochecha e a costeleta. É o pedido de quem quer barba cheia sem parecer descuidada.",
      },
    ],
    related: ["corte-e-barba", "corte-barba-e-sobrancelha", "corte-de-cabelo"],
  },

  {
    slug: "sobrancelha",
    label: "Sobrancelha",
    h1: "Sobrancelha masculina no Jardim Pinheiros",
    metaTitle: "Sobrancelha Masculina R$ 15 — Jd. Pinheiros, SBC | Enzo Cortes",
    metaDescription:
      "Sobrancelha masculina por R$ 15 na Av. Vitória, 144 — Jardim Pinheiros, São Bernardo do Campo. Limpeza e alinhamento discretos. Seg a sáb, 09h às 19h.",
    eyebrow: "Serviço 03",
    cardText: "Limpeza e alinhamento sem tirar o traço masculino — e entra no combinado completo.",
    art: "brow",
    price: 15,
    waMessage: "Olá, Enzo! Queria fazer a sobrancelha.",
    intro: [
      "Sobrancelha masculina é serviço de subtração: o objetivo é tirar o que está fora do desenho, não criar um desenho novo. O que se limpa é o meio, o excesso abaixo da linha e os fios que fogem por cima — mantendo a espessura e o formato que já existem.",
      "É o serviço mais rápido e mais barato da casa, e o que mais muda o rosto por R$ 15. Quem nunca fez costuma pedir o mais discreto possível na primeira vez, e isso é exatamente o que se faz: dá para tirar mais depois, não dá para colocar de volta.",
    ],
    covers: {
      title: "O que dá para pedir",
      body: [
        "R$ 15 avulso. Junto com corte e barba, os três saem por R$ 70 em vez de R$ 80.",
      ],
      items: [
        {
          title: "Só a limpeza do meio",
          text: "O pedido mais comum de quem nunca fez. Abre o espaço entre as duas e não mexe em mais nada. Quase não se nota que foi feito — nota-se que o rosto abriu.",
        },
        {
          title: "Limpeza completa",
          text: "Meio, abaixo da linha e os fios soltos por cima. Mantém a espessura natural e só define a borda.",
        },
        {
          title: "Acompanhando o corte",
          text: "Feita junto com o cabelo e a barba, no mesmo atendimento, para que o acabamento dos três converse.",
        },
      ],
    },
    faq: [
      {
        q: "Quanto custa a sobrancelha?",
        a: "R$ 15 avulso. No combinado com corte e barba, os três saem por R$ 70.",
      },
      {
        q: "Vai ficar com cara de sobrancelha feita?",
        a: "Só se você pedir. O padrão do serviço masculino é discreto: tira-se o excesso e mantém-se a espessura e o formato. Na primeira vez vale pedir o mais leve e ajustar na próxima.",
      },
      {
        q: "Dá para fazer só a sobrancelha?",
        a: "Dá. É um serviço avulso, rápido, e não exige estar fazendo cabelo ou barba no mesmo dia.",
      },
    ],
    related: ["corte-barba-e-sobrancelha", "barba", "corte-de-cabelo"],
  },

  {
    slug: "risco-e-desenho",
    label: "Risco / desenho",
    h1: "Risco e desenho no cabelo — a partir de R$ 5",
    metaTitle: "Risco e Desenho no Cabelo a partir de R$ 5 — SBC | Enzo Cortes",
    metaDescription:
      "Risco simples a partir de R$ 5 e desenhos na navalha na Av. Vitória, 144 — Jardim Pinheiros, São Bernardo do Campo. Seg a sáb, 09h às 19h.",
    eyebrow: "Serviço 04",
    cardText: "Do risco reto de um traço ao desenho trabalhado — o preço acompanha o tamanho.",
    art: "liner",
    price: 5,
    priceFrom: true,
    waMessage: "Olá, Enzo! Queria fazer um risco/desenho no corte.",
    intro: [
      "O risco é o acabamento que transforma um corte comum em um corte com assinatura. Pode ser um traço só, reto, na lateral — o pedido mais frequente, e o que custa R$ 5 — ou um desenho maior, com curvas e mais de uma linha, feito na navalha.",
      "É por isso que o preço deste serviço começa em R$ 5 em vez de ser fechado: um traço é um traço, e um desenho de cinco linhas é outro trabalho. O valor é combinado antes de começar, olhando o que você quer — nunca depois, na hora de pagar.",
    ],
    covers: {
      title: "Como o preço é definido",
      body: [
        "O piso é R$ 5, e é o preço do risco simples. Daí para cima, o que muda é o tempo na navalha.",
      ],
      items: [
        {
          title: "Risco simples — R$ 5",
          text: "Um traço reto, geralmente na lateral ou marcando a divisão do cabelo. É o acréscimo mais barato que se pode fazer num corte.",
        },
        {
          title: "Risco duplo ou com curva",
          text: "Duas linhas, ou uma linha que acompanha a cabeça em vez de ir reta. Mais tempo de navalha, e o valor é combinado antes.",
        },
        {
          title: "Desenho trabalhado",
          text: "Formas, mais de duas linhas, simetria dos dois lados. Aqui o preço depende do desenho; leve uma referência no celular que fica mais fácil combinar.",
        },
      ],
    },
    faq: [
      {
        q: "Por que o preço é 'a partir de' R$ 5?",
        a: "Porque o trabalho varia muito: um risco reto de um traço é rápido, e um desenho com várias linhas leva bem mais tempo na navalha. O R$ 5 é o piso — o valor do seu é combinado antes de começar, nunca depois.",
      },
      {
        q: "Posso levar uma foto do desenho que eu quero?",
        a: "Pode, e ajuda bastante. Mande no WhatsApp junto com o pedido de horário: dá para adiantar se o desenho cabe no tempo e quanto fica.",
      },
      {
        q: "O risco é cobrado junto com o corte?",
        a: "É um acréscimo ao corte, não substitui. O corte é R$ 40 e o risco entra por cima, a partir de R$ 5.",
      },
      {
        q: "Quanto tempo o desenho dura?",
        a: "Enquanto o cabelo não crescer o suficiente para fechar a linha — costuma ser menos tempo que o corte em si, porque o traço depende do contraste com o couro.",
      },
    ],
    related: ["corte-de-cabelo", "corte-e-barba", "sobrancelha"],
  },

  {
    slug: "corte-e-barba",
    label: "Corte + barba",
    h1: "Corte e barba no mesmo atendimento — R$ 60",
    metaTitle: "Corte e Barba R$ 60 — Barbearia no Jd. Pinheiros, SBC | Enzo Cortes",
    metaDescription:
      "Corte e barba por R$ 60 (avulsos custariam R$ 65) na Av. Vitória, 144 — Jardim Pinheiros, São Bernardo do Campo. Seg a sáb, 09h às 19h.",
    eyebrow: "Combinado",
    cardText: "Os dois no mesmo dia por R$ 60 — R$ 5 a menos do que pagando separado.",
    art: "duo",
    price: 60,
    sumOf: ["corte-de-cabelo", "barba"],
    waMessage: "Olá, Enzo! Queria marcar corte e barba.",
    intro: [
      "Corte e barba feitos no mesmo atendimento é o pedido mais comum de uma barbearia, e existe um motivo técnico além do preço: é quando dá para fazer os dois acabamentos conversarem. A costeleta liga o degradê do cabelo ao comprimento da barba, e essa ligação só fica certa quando as duas coisas são decididas juntas.",
      "Feito em dias separados, cada serviço é resolvido no escuro em relação ao outro — a barba é ajustada a um corte que já cresceu, ou o corte é feito sem saber como a barba vai ficar. No mesmo dia, o acabamento é um só.",
    ],
    covers: {
      title: "O que entra",
      body: [
        "Os dois serviços completos, sem versão reduzida de nenhum: o corte como está descrito na página dele, e a barba como está na dela.",
      ],
      items: [
        {
          title: "O corte, inteiro",
          text: "Mesma conversa de sempre: altura da transição, máquina ou tesoura, contorno e o que sobra em cima.",
        },
        {
          title: "A barba, inteira",
          text: "Linha do pescoço, curva da bochecha, comprimento e bigode.",
        },
        {
          title: "A ligação entre os dois",
          text: "O que só existe no combinado: a costeleta desenhada para o degradê do cabelo descer na barba sem degrau.",
        },
      ],
    },
    faq: [
      {
        q: "Quanto custa corte e barba juntos?",
        a: "R$ 60. Avulsos seriam R$ 40 mais R$ 25, ou seja R$ 65 — o combinado economiza R$ 5.",
      },
      {
        q: "Preciso fazer os dois no mesmo dia para pagar R$ 60?",
        a: "Sim, o valor é do atendimento combinado. Em dias separados, cada serviço vale o preço avulso dele.",
      },
      {
        q: "Dá para incluir a sobrancelha também?",
        a: "Dá, e aí é o combinado completo: corte, barba e sobrancelha por R$ 70, em vez dos R$ 80 que os três custariam avulsos.",
      },
    ],
    related: ["corte-barba-e-sobrancelha", "corte-de-cabelo", "barba"],
  },

  {
    slug: "corte-barba-e-sobrancelha",
    label: "Corte + barba + sobrancelha",
    h1: "Corte, barba e sobrancelha — o combinado completo por R$ 70",
    metaTitle: "Corte, Barba e Sobrancelha R$ 70 — Jd. Pinheiros, SBC | Enzo Cortes",
    metaDescription:
      "Corte, barba e sobrancelha por R$ 70 (avulsos custariam R$ 80) na Av. Vitória, 144 — Jardim Pinheiros, São Bernardo do Campo. Seg a sáb, 09h às 19h.",
    eyebrow: "Combinado completo",
    cardText: "Os três de uma vez por R$ 70 — R$ 10 a menos do que avulsos. É o maior desconto da tabela.",
    art: "trio",
    price: 70,
    sumOf: ["corte-de-cabelo", "barba", "sobrancelha"],
    waMessage: "Olá, Enzo! Queria marcar corte, barba e sobrancelha.",
    intro: [
      "É o atendimento inteiro: cabelo, barba e sobrancelha resolvidos de uma vez, com os três acabamentos decididos olhando o rosto ao mesmo tempo. Também é o maior desconto da tabela — R$ 10 abaixo da soma dos avulsos, contra R$ 5 do combinado de dois.",
      "Vale especialmente antes de data marcada: casamento, formatura, entrevista, foto. Não porque seja um pacote especial, mas porque é o único jeito de garantir que os três serviços terminem no mesmo ponto, sem um estar com três semanas a mais que o outro.",
    ],
    covers: {
      title: "O que entra",
      body: [
        "Os três serviços completos, cada um como está descrito na página dele. Nenhum entra em versão reduzida por estar no combinado.",
      ],
      items: [
        {
          title: "Corte — R$ 40 avulso",
          text: "Transição, método, contorno e comprimento do topo.",
        },
        {
          title: "Barba — R$ 25 avulsa",
          text: "Pescoço, bochecha, comprimento e bigode.",
        },
        {
          title: "Sobrancelha — R$ 15 avulsa",
          text: "Limpeza no grau que você pedir, mantendo espessura e formato.",
        },
        {
          title: "A conta",
          text: "Somados, R$ 80. No combinado, R$ 70.",
        },
      ],
    },
    faq: [
      {
        q: "Quanto custa corte, barba e sobrancelha?",
        a: "R$ 70 no combinado. Avulsos seriam R$ 40 + R$ 25 + R$ 15 = R$ 80, então a economia é de R$ 10.",
      },
      {
        q: "É o combinado com maior desconto?",
        a: "É. O de corte e barba economiza R$ 5; este economiza R$ 10.",
      },
      {
        q: "Posso incluir um risco?",
        a: "Pode. O risco é um acréscimo ao corte, a partir de R$ 5, e o valor é combinado antes de começar.",
      },
    ],
    related: ["corte-e-barba", "sobrancelha", "risco-e-desenho"],
  },
];

export const SERVICE_SLUGS = SERVICES.map((s) => s.slug);

export function getService(slug: string): Service | undefined {
  return SERVICES.find((s) => s.slug === slug);
}

/**
 * A soma dos avulsos de um combinado. `0` fora dos combinados.
 */
export function sumOfParts(service: Service): number {
  if (!service.sumOf?.length) return 0;
  return service.sumOf.reduce((acc, slug) => acc + (getService(slug)?.price ?? 0), 0);
}

/**
 * Quanto o combinado economiza, em reais.
 *
 * ⚠️ É CALCULADO, nunca digitado. O número aparece em quatro lugares (card,
 * cardápio, intro do combinado e FAQ); escrito à mão, um reajuste de preço
 * deixaria três deles anunciando uma economia que a conta não confirma — e o
 * cliente refaz essa conta de cabeça, na cadeira.
 *
 * Devolve `0` para serviço avulso, e é isso que as páginas testam antes de
 * desenhar a linha de economia.
 */
export function saving(service: Service): number {
  const sum = sumOfParts(service);
  return sum ? Math.max(0, sum - service.price) : 0;
}

/** Mensagem de WhatsApp padrão, quando a página não tem uma própria. */
export const WA_DEFAULT = whatsappLink(
  "Olá, Enzo! Vi o site e queria marcar um horário.",
);
