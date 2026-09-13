/**
 * Conteúdo das páginas de serviço + o mapa de sintomas.
 *
 * ── Por que existem DUAS listas ──────────────────────────────────────────
 * `SYMPTOMS` é o que o cliente digita no Google ("fogão não acende").
 * `SERVICES` é como o Ricardo organiza o trabalho ("conserto residencial").
 * As duas coisas não são a mesma, e tratá-las como uma só custa tráfego:
 * quem procura "chama amarela" não procura "limpeza de fogões" — descobre
 * que é limpeza DEPOIS. O desenho da home faz essa tradução, e é por isso
 * que os callouts da vista explodida são sintomas, não nomes de serviço.
 *
 * ── Regra de conteúdo ────────────────────────────────────────────────────
 * Nenhum texto é reaproveitado entre páginas. O sistema de conteúdo útil do
 * Google rebaixa página de localidade/serviço "fiada" — o mesmo parágrafo
 * com a cidade trocada é exatamente o padrão que ele detecta. Cada página
 * tem problema, escopo e FAQ próprios.
 *
 * Nenhum prazo de garantia, preço, nº de clientes ou certificação aparece,
 * porque nada disso foi informado.
 */

import type { StaticImageData } from "next/image";

import imgResidencial from "../assets/conserto-de-fogoes-residenciais.webp";
import imgIndustrial from "../assets/conserto-de-fogoes-industriais.webp";
import imgReforma from "../assets/reforma-de-fogoes.webp";
import imgLimpeza from "../assets/limpeza-de-fogoes.webp";
import imgChapas from "../assets/manutencao-de-chapas.webp";
import imgInstalacao from "../assets/instalacao-de-fogoes.webp";

import { whatsappLink } from "./business";

export type Faq = { q: string; a: string };

export type Service = {
  slug: string;
  /** Nome curto — menu, breadcrumb, carimbo. */
  label: string;
  /** H1 da página. Escrito para busca, legível para gente. */
  h1: string;
  metaTitle: string;
  metaDescription: string;
  /** Uma linha no índice de serviços. */
  cardText: string;
  /** Peça do desenho que representa o serviço. */
  part: string;
  /**
   * Foto do card na home.
   *
   * ⚠️ É CAMPO OBRIGATÓRIO de propósito. Serviço sem foto deixaria um
   * buraco no meio de uma grade em que todos os vizinhos têm uma — e o
   * card ficaria com metade da altura dos outros, lendo como defeito.
   * Sendo obrigatório, acrescentar um sétimo serviço sem a imagem é erro
   * de compilação, não uma descoberta na tela depois do deploy.
   *
   * Import estático (nunca caminho em string): é ele que entrega largura e
   * altura ao `next/image` e reserva o espaço antes do download, sem o
   * qual o texto do card pula quando a foto chega.
   */
  image: StaticImageData;
  waMessage: string;
  /** Abertura: o que é, para quem é. */
  intro: string[];
  /** O problema, do ponto de vista de quem liga. */
  problem: { title: string; body: string[] };
  /** O que a visita cobre. Lista fechada, sem promessa. */
  covers: string[];
  /** Perguntas reais. Alimentam o FAQPage. */
  faq: Faq[];
};

/**
 * Sintomas: a porta de entrada de busca.
 *
 * `n` é o número da chamada no desenho. Ele é sequência de verdade
 * (ordem de leitura da prancha), então numerar aqui é honesto.
 */
export type Symptom = {
  n: number;
  /** Como o cliente descreve. */
  label: string;
  /** O que costuma estar por trás — em linguagem de gente. */
  cause: string;
  /** Peça apontada pela chamada. */
  part: string;
  /** Serviço que resolve. */
  service: string;
  /** Quente = risco/urgência (usa o laranja). Frio = regulagem (azul). */
  heat: "hot" | "cold";
};

export const SYMPTOMS: Symptom[] = [
  {
    n: 1,
    label: "Não acende",
    cause: "Faísca fraca, vela suja ou acendimento elétrico interrompido.",
    part: "Vela de acendimento",
    service: "conserto-de-fogoes-residenciais",
    heat: "cold",
  },
  {
    n: 2,
    label: "Chama amarela",
    cause:
      "Combustão irregular. Quase sempre injetor obstruído ou entrada de ar fechada — a chama certa é azul.",
    part: "Injetor",
    service: "limpeza-de-fogoes",
    heat: "hot",
  },
  {
    n: 3,
    label: "Apaga sozinho",
    cause: "Termopar sem contato ou sujo: a válvula de segurança corta o gás.",
    part: "Termopar",
    service: "conserto-de-fogoes-residenciais",
    heat: "cold",
  },
  {
    n: 4,
    label: "Cheiro de gás",
    cause:
      "Vazamento em registro, mangueira ou conexão. Feche o registro e ventile antes de qualquer coisa.",
    part: "Registro e mangueira",
    service: "instalacao-de-fogoes",
    heat: "hot",
  },
  {
    n: 5,
    label: "Forno não esquenta",
    cause: "Queimador do forno, válvula termostática ou vedação da porta.",
    part: "Queimador do forno",
    service: "conserto-de-fogoes-residenciais",
    heat: "cold",
  },
  {
    n: 6,
    label: "Chapa sem calor uniforme",
    cause: "Queimador desregulado ou chapa empenada pelo uso contínuo.",
    part: "Chapa",
    service: "manutencao-de-chapas",
    heat: "hot",
  },
];

export const SERVICES: Service[] = [
  {
    slug: "conserto-de-fogoes-residenciais",
    image: imgResidencial,
    label: "Conserto residencial",
    h1: "Conserto de fogões residenciais",
    metaTitle: "Conserto de Fogão Residencial em Aguaí | Ricardo Fogões",
    metaDescription:
      "Fogão que não acende, apaga sozinho ou com forno frio. Conserto de fogões residenciais multimarcas em Aguaí e região, com hora marcada. Chame no WhatsApp.",
    cardText:
      "Acendimento, forno, válvulas e termopar em fogões de 4, 5 e 6 bocas.",
    part: "Queimador e acendimento",
    waMessage:
      "Olá, Ricardo! Meu fogão residencial está com problema e vi o site. Pode me atender?",
    intro: [
      "O fogão de casa quebra sempre na pior hora: véspera de almoço grande, fim de semana, dia de bolo pronto para ir ao forno. Este é o serviço para quando uma boca parou, o forno esfriou ou a chama não fica acesa.",
      "O atendimento é multimarcas e vale para fogões de piso e cooktops de 4, 5 e 6 bocas.",
    ],
    problem: {
      title: "O que costuma estar acontecendo",
      body: [
        "Três defeitos respondem pela maioria das chamadas. O primeiro é o acendimento: a vela perde faísca quando junta gordura ou quando o cabo se solta, e a boca acende no fósforo mas não no botão.",
        "O segundo é a válvula de segurança. O termopar precisa aquecer para manter o gás liberado — sujo ou fora de posição, ele corta e a chama morre alguns segundos depois de você soltar o botão.",
        "O terceiro é o forno. Ele pode acender e não segurar temperatura por causa da vedação da porta, ou não acender por causa do próprio queimador inferior.",
      ],
    },
    covers: [
      "Diagnóstico do defeito antes de qualquer troca de peça",
      "Acendimento elétrico: velas, cabos e módulo",
      "Válvulas, registros e termopar",
      "Queimador do forno e vedação da porta",
      "Regulagem de chama nas bocas e no forno",
      "Teste de funcionamento na frente do cliente",
    ],
    faq: [
      {
        q: "Meu fogão acende no fósforo mas não no botão. Tem conserto?",
        a: "Tem, e costuma ser o acendimento elétrico — vela suja, cabo solto ou módulo de faísca. O gás está chegando normalmente, já que no fósforo ele acende; o que falhou foi a centelha.",
      },
      {
        q: "A boca acende e apaga quando eu solto o botão. O que é?",
        a: "Normalmente é o termopar, a peça que sente o calor da chama e mantém a válvula de segurança aberta. Se ele está sujo, torto ou fora do alcance da chama, o sistema entende que a boca apagou e corta o gás. É um comportamento de segurança, não um defeito perigoso.",
      },
      {
        q: "Atende cooktop e fogão de embutir?",
        a: "Sim. O atendimento cobre fogões de piso, cooktops e fornos de embutir, em várias marcas.",
      },
      {
        q: "Preciso levar o fogão até a oficina?",
        a: "Não. O atendimento é agendado e feito no endereço, com hora marcada. Só vai para a oficina o serviço que exige bancada, e isso é combinado antes.",
      },
    ],
  },
  {
    slug: "conserto-de-fogoes-industriais",
    image: imgIndustrial,
    label: "Conserto industrial",
    h1: "Conserto de fogões industriais",
    metaTitle: "Conserto de Fogão Industrial em Aguaí e Região | Ricardo",
    metaDescription:
      "Fogão industrial parado para a cozinha inteira. Conserto de queimadores, registros e fornos em bares e restaurantes de Aguaí e região, com hora marcada.",
    cardText:
      "Queimadores de alta pressão, registros e fornos de cozinha profissional.",
    part: "Queimador industrial",
    waMessage:
      "Olá, Ricardo! Tenho um fogão industrial parado no meu estabelecimento. Pode me atender?",
    intro: [
      "Em cozinha profissional o fogão não é um eletrodoméstico, é a linha de produção. Uma boca fora do ar muda o tempo de cada prato, e duas paradas fecham o cardápio.",
      "Este serviço atende bares, restaurantes, lanchonetes e cozinhas industriais em fogões de alta pressão.",
    ],
    problem: {
      title: "Por que o industrial falha diferente",
      body: [
        "O fogão industrial trabalha em alta pressão e em ciclo contínuo. O desgaste não aparece como pane súbita, e sim como perda de rendimento: a água demora mais para ferver, a chapa não recupera temperatura entre um pedido e outro.",
        "A causa mais comum é obstrução. Gordura queimada fecha parcialmente o injetor e a entrada de ar, a chama abre amarela e passa a sujar o fundo das panelas em vez de aquecê-las.",
        "A segunda é o registro. Registros de alta pressão endurecem e começam a vazar pela haste — e aí o problema deixa de ser rendimento e passa a ser segurança.",
      ],
    },
    covers: [
      "Queimadores de alta pressão: desobstrução e regulagem",
      "Registros, mangueiras e conexões",
      "Forno e câmara de assar",
      "Substituição de peças desgastadas pelo uso contínuo",
      "Ajuste de chama por boca, com a panela em cima",
      "Atendimento combinado fora do horário de pico",
    ],
    faq: [
      {
        q: "Dá para atender fora do horário de funcionamento do restaurante?",
        a: "O horário de atendimento é de segunda a sexta, das 08h às 18h, com hora marcada. Dentro dessa janela dá para combinar o melhor momento da cozinha — normalmente o intervalo entre almoço e jantar.",
      },
      {
        q: "A chama do meu fogão industrial está amarela e suja as panelas. É normal?",
        a: "Não é normal e vale chamar. Chama amarela indica combustão incompleta: além de aquecer menos, ela deposita fuligem no fundo da panela. Quase sempre é injetor obstruído ou entrada de ar desregulada.",
      },
      {
        q: "Vocês atendem fogão industrial em outras cidades?",
        a: "Sim: Aguaí, São João da Boa Vista, Casa Branca e Mogi Guaçu.",
      },
    ],
  },
  {
    slug: "reforma-de-fogoes",
    image: imgReforma,
    label: "Reforma",
    h1: "Reforma e restauração de fogões",
    metaTitle: "Reforma e Restauração de Fogões em Aguaí | Ricardo Fogões",
    metaDescription:
      "Fogão antigo que ainda vale a pena. Reforma de estrutura, mesa, trempes e queimadores em Aguaí e região — e também venda de fogões novos e seminovos.",
    cardText:
      "Recuperação de estrutura, mesa e trempes de fogões que valem a pena manter.",
    part: "Estrutura e mesa",
    waMessage:
      "Olá, Ricardo! Quero reformar um fogão. Consegue avaliar para mim?",
    intro: [
      "Fogão bom não se joga fora. Muito fogão antigo tem chassi e queimadores melhores que os de linha atual — o que envelheceu foi a aparência e as peças de desgaste.",
      "A reforma recupera o que está bom e substitui o que não está. Fogões novos e seminovos também podem ser avaliados quando reformar não compensa.",
    ],
    problem: {
      title: "Quando reformar compensa e quando não",
      body: [
        "Compensa quando a estrutura está íntegra. Chassi firme, mesa sem perfuração e forno sem ferrugem passante significam que o fogão tem base — o resto é peça.",
        "Não compensa quando a corrosão chegou ao corpo. Ferrugem que atravessa a chapa não volta com pintura, e um forno furado perde temperatura por onde o calor escapa.",
        "A avaliação é a primeira coisa do serviço, e ela inclui dizer quando o conserto não vale o dinheiro. Trocar é a resposta certa em alguns casos, e ouvir isso antes evita pagar duas vezes.",
      ],
    },
    covers: [
      "Avaliação do que vale recuperar, dita antes do orçamento",
      "Recuperação de estrutura e mesa",
      "Trempes, tampas de queimador e espalhadores",
      "Substituição de botões, puxadores e vedações",
      "Revisão completa de gás e regulagem final",
      "Avaliação de fogões novos e seminovos como alternativa",
    ],
    faq: [
      {
        q: "Vale a pena reformar um fogão antigo?",
        a: "Depende da estrutura. Se o chassi e a mesa estão íntegros, quase sempre vale — fogão antigo costuma ter construção mais robusta. Se a ferrugem já atravessou a chapa ou o forno, a conta muda e a troca passa a fazer mais sentido. A avaliação vem antes do orçamento justamente para isso.",
      },
      {
        q: "A reforma inclui pintura?",
        a: "A recuperação de estrutura e mesa é avaliada caso a caso na visita, porque depende do estado da peça. O que for possível recuperar é dito no orçamento, antes de começar.",
      },
      {
        q: "Vocês vendem fogão?",
        a: "Há fogões novos e seminovos disponíveis. Quando a reforma não compensa, essa é a alternativa apresentada — sem obrigação de fechar na hora.",
      },
    ],
  },
  {
    slug: "limpeza-de-fogoes",
    image: imgLimpeza,
    label: "Limpeza técnica",
    h1: "Limpeza técnica de fogões",
    metaTitle: "Limpeza de Fogões Residencial e Industrial | Aguaí/SP",
    metaDescription:
      "Limpeza que chega no injetor, não só na superfície. Devolve chama azul e rendimento a fogões residenciais e industriais em Aguaí e região.",
    cardText:
      "Desmontagem, desobstrução de injetores e regulagem — a chama volta a ser azul.",
    part: "Injetor e trempe",
    waMessage:
      "Olá, Ricardo! Quero fazer a limpeza técnica do meu fogão. Como funciona?",
    intro: [
      "Limpeza técnica não é a faxina de cima da mesa. É desmontar, desobstruir a passagem de gás e de ar e montar de volta regulado.",
      "É o serviço que devolve rendimento a fogão que passou a demorar para ferver água e a sujar o fundo das panelas.",
    ],
    problem: {
      title: "Por que a chama fica amarela",
      body: [
        "Um queimador só produz chama azul quando gás e ar chegam na proporção certa. O gás passa por um furo muito pequeno — o injetor — e arrasta ar por uma abertura ao lado.",
        "Gordura e resíduo de alimento fecham os dois pontos aos poucos. Com menos ar, a queima fica incompleta: a chama abre amarela, esquenta menos e deposita fuligem preta no fundo da panela.",
        "É por isso que a limpeza é serviço técnico e não estético. O que muda o comportamento da chama está dentro do queimador, num furo que não se alcança com pano.",
      ],
    },
    covers: [
      "Desmontagem das bocas e do espalhador",
      "Desobstrução dos injetores",
      "Limpeza da entrada de ar e do corpo do queimador",
      "Limpeza de trempes, tampas e mesa",
      "Regulagem da chama boca a boca",
      "Conferência de vazamento nas conexões",
    ],
    faq: [
      {
        q: "Com que frequência o fogão precisa de limpeza técnica?",
        a: "Não há um intervalo fixo: depende de quanto o fogão é usado e do que é cozido nele. O sinal confiável é a chama — quando ela começa a abrir amarela ou a água demora mais que o normal para ferver, é hora.",
      },
      {
        q: "A limpeza resolve chama amarela?",
        a: "Na maioria dos casos sim, porque a causa quase sempre é obstrução do injetor ou da entrada de ar. Quando o problema é outro — regulagem de pressão ou peça desgastada — isso aparece no diagnóstico e é dito na hora.",
      },
      {
        q: "Fogão industrial de restaurante também tem esse serviço?",
        a: "Tem, e nele a limpeza pesa mais, porque o uso contínuo satura o queimador bem mais rápido que em casa.",
      },
    ],
  },
  {
    slug: "manutencao-de-chapas",
    image: imgChapas,
    label: "Chapas",
    h1: "Manutenção de chapas",
    metaTitle: "Manutenção de Chapas de Lanchonete em Aguaí | Ricardo",
    metaDescription:
      "Chapa que não aquece por igual atrasa a linha inteira. Manutenção de chapas e queimadores para lanchonetes e bares em Aguaí e região.",
    cardText:
      "Queimadores, calor uniforme e regulagem em chapas de lanchonete e bar.",
    part: "Chapa",
    waMessage:
      "Olá, Ricardo! Preciso de manutenção na chapa do meu estabelecimento.",
    intro: [
      "A chapa é o equipamento mais exigido de uma lanchonete: fica ligada o dia inteiro e recebe choque térmico a cada pedido.",
      "Este serviço trata do que faz a chapa perder desempenho — queimadores abaixo dos pontos frios, regulagem e o que o uso contínuo desgasta.",
    ],
    problem: {
      title: "O ponto frio no meio da chapa",
      body: [
        "A queixa mais comum não é a chapa parar, e sim aquecer desigual. O lanche de um canto sai no ponto e o do outro sai pálido, e a cozinha passa a trabalhar com meia chapa.",
        "Abaixo da superfície há uma fileira de queimadores, e basta um deles obstruído para abrir uma faixa fria. Como a chapa é maciça, ela espalha calor o suficiente para disfarçar o problema — o que se percebe é o tempo de preparo subindo.",
        "Quando o desgaste é da própria chapa, a superfície deixa de encostar por igual na peça. Aí o diagnóstico muda, e a diferença entre um caso e outro é dita na visita.",
      ],
    },
    covers: [
      "Inspeção da fileira de queimadores",
      "Desobstrução e regulagem por queimador",
      "Verificação de registros e conexões de gás",
      "Avaliação da superfície e do apoio",
      "Teste de aquecimento com leitura em pontos diferentes",
    ],
    faq: [
      {
        q: "Minha chapa esquenta mais de um lado. Tem conserto?",
        a: "Tem, e o ponto de partida é a fileira de queimadores embaixo da superfície: um obstruído já abre uma faixa fria. Se os queimadores estiverem bem e a diferença continuar, a avaliação passa para a superfície e o apoio.",
      },
      {
        q: "Atende lanchonete e food truck?",
        a: "O atendimento cobre chapas de lanchonetes, bares e restaurantes nas quatro cidades atendidas. Equipamentos instalados em veículo dependem de avaliação do acesso e da instalação de gás — vale mandar uma foto antes pelo WhatsApp.",
      },
    ],
  },
  {
    slug: "instalacao-de-fogoes",
    image: imgInstalacao,
    label: "Instalação",
    h1: "Instalação de fogões",
    metaTitle: "Instalação de Fogão com Teste de Vazamento | Aguaí/SP",
    metaDescription:
      "Instalação de fogões e cooktops com registro, mangueira e conferência de vazamento. Aguaí, São João da Boa Vista, Casa Branca e Mogi Guaçu.",
    cardText:
      "Registro, mangueira, conexão e conferência de vazamento antes de entregar.",
    part: "Registro e mangueira",
    waMessage:
      "Olá, Ricardo! Preciso instalar um fogão. Consegue fazer a instalação?",
    intro: [
      "Instalar fogão é ligar um equipamento a uma linha de gás. O que separa uma instalação boa de uma arriscada não aparece quando a chama acende — aparece na conferência que vem depois.",
      "O serviço cobre fogões de piso, cooktops e equipamentos industriais.",
    ],
    problem: {
      title: "O que a instalação precisa incluir",
      body: [
        "Mangueira e registro têm validade e especificação. Mangueira vencida endurece e trinca nas dobras, e o vazamento começa exatamente onde ninguém olha — atrás do fogão.",
        "A conexão precisa de vedação correta e de aperto na medida. Apertado demais deforma a rosca e cria o vazamento que se queria evitar.",
        "Por isso a instalação termina com conferência de vazamento em cada conexão, e não com a boca acendendo. A boca acende mesmo com um ponto vazando.",
      ],
    },
    covers: [
      "Avaliação do ponto de gás antes de instalar",
      "Registro, mangueira e conexões dentro da especificação",
      "Posicionamento e nivelamento do equipamento",
      "Conferência de vazamento em cada conexão",
      "Regulagem inicial de chama",
      "Orientação de uso e de quando trocar a mangueira",
    ],
    faq: [
      {
        q: "Sinto cheiro de gás. O que faço antes de chamar?",
        a: "Feche o registro, abra portas e janelas e não acione interruptor nem acenda nada — faísca é o que falta para o gás pegar. Com o ambiente ventilado e o registro fechado, aí sim chame pelo telefone, de preferência fora do cômodo.",
      },
      {
        q: "De quanto em quanto tempo troca a mangueira de gás?",
        a: "A mangueira traz a data de validade impressa nela mesma. Vale conferir essa data e também o estado: se estiver ressecada, trincada ou dobrada permanentemente, a troca não espera o prazo.",
      },
      {
        q: "Instala cooktop já embutido na bancada?",
        a: "Sim, desde que o recorte da bancada e o ponto de gás comportem o equipamento. Uma foto do espaço pelo WhatsApp já adianta essa avaliação.",
      },
    ],
  },
];

export const SERVICE_SLUGS = SERVICES.map((s) => s.slug);

export function getService(slug: string): Service | undefined {
  return SERVICES.find((s) => s.slug === slug);
}

export function serviceWa(s: Service): string {
  return whatsappLink(s.waMessage);
}
