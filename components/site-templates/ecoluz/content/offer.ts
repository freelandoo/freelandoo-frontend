// A OFERTA VISTA DE FORA — por PÚBLICO, não por tecnologia.
//
// ⚠️ ISTO NÃO SUBSTITUI `content/services.ts`, E A DIFERENÇA É A PERGUNTA QUE
// CADA UM RESPONDE. Os cinco serviços são recortados por TECNOLOGIA (on-grid,
// off-grid, projeto e homologação, manutenção) e respondem *"o que exatamente
// vocês instalam"*. Estes quatro segmentos são recortados por QUEM PERGUNTA, e
// respondem *"isso serve para mim?"* — que é a pergunta que vem primeiro.
//
// Quem chega não sabe se quer híbrido ou conectado à rede; sabe que tem uma
// casa, um comércio, um sítio ou uma conta de trinta mil reais. O brief pediu
// exatamente este recorte (§4 "Nossas soluções").

import type { IconName } from "../icons";

/* ══════════════════ § 4 — NOSSAS SOLUÇÕES ═══════════════════════════════ */

export type Segment = {
  icon: IconName;
  label: string;
  text: string;
  /**
   * O slug da página de serviço, quando existe uma.
   *
   * ⚠️ RURAL E MAIOR PORTE AINDA NÃO TÊM PÁGINA — e por isso vão para a
   * conversa. Não é esquecimento: escrever uma página inteira sobre o que a
   * EcoLuz faz num sítio ou numa usina exigiria afirmar detalhe técnico que o
   * cliente ainda não informou, e página de serviço é onde o site faz promessa
   * mais específica. Quando ele descrever essas duas frentes, elas entram em
   * `services.ts` e ganham `page` aqui — o card não muda.
   */
  page?: string;
  /** A mensagem com que a conversa abre, para os que ainda não têm página. */
  wa?: string;
};

export const SEGMENTS: Segment[] = [
  {
    icon: "home",
    label: "Residencial",
    text: "Casas que querem reduzir a conta de luz. O sistema é dimensionado pelo consumo da família e instalado na cobertura existente, com acabamento elétrico organizado.",
    page: "energia-solar-residencial",
  },
  {
    icon: "building",
    label: "Comercial",
    text: "Comércio, clínica, restaurante, escritório. Onde a energia é custo fixo alto, previsibilidade vale tanto quanto economia — e o retorno costuma ser mais rápido que no residencial.",
    page: "energia-solar-para-empresas",
  },
  {
    icon: "grain",
    label: "Rural",
    text: "Sítios, chácaras e produção no campo, inclusive onde a rede é frágil ou não chega. É aqui que o sistema com baterias deixa de ser luxo e passa a ser o que mantém bomba, câmara fria e casa funcionando.",
    wa: "Olá! Vim pelo site da EcoLuz e quero energia solar para uma propriedade rural.",
  },
  {
    icon: "bolt",
    label: "Projetos de maior porte",
    text: "Indústria, agronegócio e múltiplas unidades consumidoras. Projetos em que a conta de energia é uma linha relevante do orçamento e o dimensionamento precisa ser feito sobre o histórico inteiro.",
    wa: "Olá! Vim pelo site da EcoLuz e quero avaliar um projeto de maior porte.",
  },
];

/* ══════════════════ § 8 — FINANCIAMENTO ═════════════════════════════════ */

/**
 * ⚠️ NENHUM VALOR DE PARCELA, EM LUGAR NENHUM. Parcela depende do valor
 * aprovado, do prazo, da taxa do dia e do perfil de crédito de quem pede — o
 * "a partir de R$ 199/mês" que o ramo usa é o número que faz a pessoa se
 * sentir enganada quando a proposta real chega. O site anuncia o PRAZO, que é
 * verdade para todo mundo, e diz em voz alta de que a aprovação depende.
 *
 * Isso também é o que mantém o JSON-LD limpo: o tema não declara `priceRange`
 * nem `offers` com preço, porque não existe preço publicado para declarar.
 */
export const FINANCING = {
  eyebrow: "Financiamento",
  title: "Energia solar pode estar mais perto do que você imagina.",
  lead: "Dá para começar sem o valor cheio à vista. Trabalhamos com linhas de financiamento para energia solar, e a análise entra junto com a proposta técnica — você vê o sistema e a forma de pagar na mesma conversa.",
  points: [
    {
      icon: "wallet" as IconName,
      title: "Em até 120x",
      text: "O prazo máximo das linhas com que trabalhamos. O prazo real sai na análise.",
    },
    {
      icon: "file" as IconName,
      title: "Sem entrada em alguns casos",
      text: "Depende da linha e do perfil aprovado. É uma das coisas que a análise responde.",
    },
    {
      icon: "shield" as IconName,
      title: "A parcela conversa com a economia",
      text: "A ideia é que o que sai da conta de luz ajude a pagar o sistema. Quanto exatamente, só a sua conta diz.",
    },
  ],
  /** A ressalva que precisa estar visível, não em letra miúda. */
  note: "Condições, prazo e taxa sujeitos a análise e aprovação de crédito pela instituição financeira. A EcoLuz não é instituição financeira e não aprova crédito.",
  cta: "Quero simular o financiamento",
  wa: "Olá! Vim pelo site da EcoLuz e quero saber sobre o financiamento do sistema solar.",
};

/* ══════════════════ § 13 — O QUE CABE NA SUA CONTA ══════════════════════ */

/**
 * As situações de consumo, para a pessoa se reconhecer numa delas.
 *
 * ⚠️ A SEÇÃO NÃO PROMETE QUE O SISTEMA "DÁ CONTA" DE CADA ITEM. Ela nomeia o
 * que pesa na conta e diz que o projeto é dimensionado sobre o consumo real —
 * que é a verdade e é a promessa que a empresa consegue cumprir. "Seu
 * ar-condicionado por nossa conta" seria a primeira promessa quebrada na
 * primeira fatura depois da instalação.
 *
 * Foi ideia do próprio cliente (§13 do brief): "A intenção é fazer o visitante
 * se identificar com alguma situação."
 */
export type Load = { icon: IconName; label: string; text: string };

export const LOADS: Load[] = [
  {
    icon: "snow",
    label: "Ar-condicionado",
    text: "O maior vilão da conta na ilha. Quantas horas por dia ele fica ligado é a primeira pergunta do dimensionamento.",
  },
  {
    icon: "shower",
    label: "Chuveiro elétrico",
    text: "Consumo curto e muito intenso. Pesa mais no pico do que na média, e isso muda o arranjo do projeto.",
  },
  {
    icon: "pool",
    label: "Bomba da piscina",
    text: "Roda horas por dia, todo dia, em silêncio. É o tipo de carga que a pessoa esquece que tem — e a conta não.",
  },
  {
    icon: "shower",
    label: "Bomba de poço",
    text: "Em sítio e chácara costuma ser o consumo que não pode parar. É onde a conversa sobre bateria começa a fazer sentido.",
  },
  {
    icon: "building",
    label: "Consumo comercial",
    text: "Câmara fria, forno, vitrine refrigerada, ar-condicionado de salão. Carga alta e previsível — o melhor cenário para o solar.",
  },
  {
    icon: "grain",
    label: "Equipamentos rurais",
    text: "Irrigação, ordenha, resfriador, secador. Consumo de produção, que fica caro exatamente quando a safra aperta.",
  },
];

export const LOADS_NOTE =
  "A EcoLuz dimensiona o sistema de acordo com o seu consumo real — não por um pacote de prateleira.";
