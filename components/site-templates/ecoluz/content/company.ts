// A EMPRESA — o que a EcoLuz já fez, onde ela está e quem fala bem dela.
//
// ═══ ESTE ARQUIVO CONCENTRA, DE PROPÓSITO, TUDO QUE DEPENDE DE DADO REAL ═══
//
// Números de projetos, fotos de obra, avaliações do Google e endereços das
// unidades: nada disso pode ser escrito por quem monta o site. São afirmações
// sobre o mundo, e o site do cliente é quem vai ter que sustentá-las.
//
// ⚠️ POR ISSO AS LISTAS NASCEM VAZIAS, E A PÁGINA NÃO DESENHA SEÇÃO VAZIA.
// A alternativa — semear com "+150 projetos" para ficar bonito enquanto o dado
// real não chega — é a única que produz um estrago irreversível: número
// inventado publicado como fato, com o nome da empresa em cima. Vazio some;
// inventado vai ao ar.
//
// O cliente já avisou que vai mandar (brief de 14/09): "Os números nós vamos
// enviar para você assim que levantarmos". Quando chegarem, é preencher a lista
// daqui e a seção aparece sozinha — não há nenhuma outra edição a fazer.

import { BUSINESS } from "./business";

/* ══════════════════ § 2 — OS NÚMEROS DA ECOLUZ ══════════════════════════ */

export type Stat = {
  /** O número em si, já formatado: "+180", "2,4 MWp", "6". */
  value: string;
  /** O que ele conta. Curto — é rótulo, não frase. */
  label: string;
  /**
   * A ressalva, quando houver. Sai em corpo menor embaixo do rótulo.
   *
   * ⚠️ É AQUI QUE MORA A HONESTIDADE DE UM NÚMERO. "Projetos instalados" sem
   * data envelhece sozinho e vira mentira em silêncio; "até setembro de 2026"
   * continua verdadeiro para sempre.
   */
  note?: string;
};

/**
 * ⚠️ VAZIO ATÉ O CLIENTE LEVANTAR. O brief pede quatro: projetos instalados,
 * kWp instalados, municípios atendidos e anos de experiência.
 *
 * Preencher assim — e a seção aparece na home sozinha:
 *
 *   export const STATS: Stat[] = [
 *     { value: "+180", label: "Projetos instalados", note: "até setembro de 2026" },
 *     { value: "1,9 MWp", label: "Potência instalada" },
 *     { value: "12", label: "Municípios atendidos" },
 *     { value: "7 anos", label: "De operação no Maranhão" },
 *   ];
 */
export const STATS: Stat[] = [];

/* ══════════════════ § 7 — PROJETOS REALIZADOS ═══════════════════════════ */

export type Project = {
  /** O que é: "Residência", "Supermercado", "Sítio". Não é nome de cliente. */
  kind: string;
  /** Onde. Município + UF. */
  place: string;
  /** A potência, como se escreve na proposta: "8,4 kWp". Opcional. */
  power?: string;
  /** Uma linha sobre o que o projeto resolveu. Opcional. */
  note?: string;
  /**
   * A foto REAL da obra, em `public/sites/ecoluz/projetos/`.
   *
   * ⚠️ FOTO DE BANCO DE IMAGENS ESTÁ FORA, e é o ponto inteiro desta seção. O
   * brief é explícito: "Priorizar fotos reais dos nossos projetos e da nossa
   * equipe... queremos que o site tenha cara de Eco Luz, e não pareça um
   * template genérico". Uma foto comprada mostra a obra de OUTRA empresa num
   * telhado que ninguém reconhece — exatamente o que o ramo inteiro faz e o
   * que este site existe para não fazer.
   */
  photo: string;
  /** O texto alternativo da foto. Descreve a obra, não a marca. */
  alt: string;
};

/**
 * ⚠️ VAZIO ATÉ AS FOTOS CHEGAREM. O cliente avisou no brief que as imagens
 * seriam enviadas depois.
 *
 * Quando chegarem: jogar os arquivos em `public/sites/ecoluz/projetos/` e
 * preencher aqui. Três já bastam para a seção existir; o desenho acomoda até
 * seis sem ficar ralo.
 */
export const PROJECTS: Project[] = [];

/* ══════════════════ § 9 — CONHEÇA A ECOLUZ ══════════════════════════════ */

/**
 * O resumo institucional da home. O texto longo continua na página `/sobre` —
 * repetir os dois inteiros faria a home e a página interna disputarem o mesmo
 * resultado de busca.
 */
export const ABOUT_HOME = {
  eyebrow: "Conheça a EcoLuz",
  title: "Tem uma equipe por trás de cada projeto.",
  paragraphs: [
    "A EcoLuz é uma empresa maranhense de energia solar. O trabalho não termina na venda do equipamento: começa no diagnóstico da conta de luz, passa pela visita técnica, pelo projeto elétrico e pela homologação na concessionária, e continua depois que o sistema está gerando.",
    "Quem atende, projeta e instala é gente daqui. É o que permite responder rápido quando alguma coisa muda — e é a diferença entre comprar um sistema e ter alguém por perto para cuidar dele.",
  ],
  /**
   * ⚠️ A FOTO DA EQUIPE É PEDIDO EXPLÍCITO DO BRIEF ("fotos reais da equipe
   * e/ou das nossas unidades"). Vazio: a seção sai só com o texto, que
   * continua de pé. Uma foto de banco aqui seria uma equipe que não existe
   * anunciando uma empresa que existe.
   */
  photo: "",
  alt: "",
};

/* ══════════════════ § 10 — ONDE ESTAMOS ═════════════════════════════════ */

export type Unit = {
  city: string;
  uf: string;
  /** O endereço completo, quando houver. */
  address?: string;
  /** É a base — a que aparece no JSON-LD e no mapa da página de contato. */
  isBase?: boolean;
};

/**
 * As UNIDADES da empresa — que não é a mesma pergunta que a ÁREA ATENDIDA.
 *
 * ⚠️ NÃO CONFUNDIR COM `content/areas.ts`. Aquele arquivo lista os quatro
 * municípios da Ilha do Maranhão, cada um com página própria, e responde
 * *"até onde vocês vão"*. Este responde *"onde vocês estão"*. Vitória do
 * Mearim fica a mais de cem quilômetros de São Luís e **não** é da ilha —
 * jogá-la em `areas.ts` criaria uma página de município prometendo uma
 * cobertura que a lista da ilha não sustenta.
 *
 * ⚠️ SÓ A BASE ENTRA NO JSON-LD. O `schema.tsx` declara UM endereço, que é o
 * da loja do Turu — é ele que o buscador usa para o resultado local e é o
 * único que foi informado por extenso.
 */
export const UNITS: Unit[] = [
  {
    city: BUSINESS.city,
    uf: BUSINESS.state,
    address: `${BUSINESS.street}, ${BUSINESS.complement} — ${BUSINESS.district}`,
    isBase: true,
  },
  {
    city: "Vitória do Mearim",
    uf: "MA",
    // ⚠️ O ENDEREÇO DESTA UNIDADE NÃO FOI INFORMADO. Ela aparece como cidade,
    // sem rua — que é a verdade. Inventar um endereço aqui mandaria cliente
    // para uma porta que não existe.
  },
];

/** A frase que acompanha as unidades. O brief pede que ela exista. */
export const UNITS_NOTE =
  "Atendemos também outras localidades do Maranhão. Se o seu projeto é fora dessas cidades, vale conversar: depende do porte e da distância.";

/* ══════════════════ § 11 — AVALIAÇÕES ═══════════════════════════════════ */

export type Review = {
  /** O nome como a pessoa o publicou. */
  name: string;
  /** O texto da avaliação, palavra por palavra. */
  text: string;
  /** De 1 a 5, como está publicado. */
  stars: number;
  /**
   * A foto de quem avaliou, em `public/sites/ecoluz/avaliacoes/`.
   *
   * ⚠️ NÃO DÁ PARA PUXAR DO GOOGLE POR CÓDIGO: a página do perfil só entrega
   * a casca JavaScript para quem não é navegador, então o endereço da imagem
   * não está ao alcance de nenhum script daqui. Ela precisa ser salva à mão.
   *
   * ⚠️ E O ENDEREÇO DO GOOGLE NÃO SERVE COMO FONTE. Um `<img>` apontando para
   * `lh3.googleusercontent.com` passa na CSP da plataforma, mas é um arquivo
   * de terceiro que muda quando a pessoa troca a foto do perfil e some quando
   * ela apaga a conta — e o dia em que sumir, o card do site do cliente fica
   * com o ícone de imagem quebrada, sem erro nenhum em lugar nenhum.
   *
   * Vazio é um estado LEGÍTIMO, não uma pendência: o card desenha a INICIAL
   * do nome num disco, que é exatamente o que o próprio Google faz com quem
   * não tem foto (é o caso do Matheus no perfil da EcoLuz hoje).
   */
  photo?: string;
};

/**
 * ⚠️ VAZIO, E ESTE É O CAMPO MAIS PERIGOSO DO SITE INTEIRO.
 *
 * Avaliação é fala de outra pessoa. Escrever uma "de exemplo" para ver como
 * fica é publicar um depoimento que ninguém deu, assinado com um nome que
 * ninguém autorizou — e é o tipo de coisa que, além de errado, rende ação
 * manual do Google quando vira marcação estruturada.
 *
 * ⚠️ E POR ISSO O JSON-LD NÃO DECLARA `aggregateRating` NEM `review` — regra
 * do tema, escrita em `schema.tsx`. Nota média inventada é a única afirmação
 * da ficha do negócio que seria mentira sobre a empresa. Quando as avaliações
 * reais entrarem aqui, marcá-las continua sendo uma DECISÃO à parte: o Google
 * só aceita `aggregateRating` de avaliações coletadas pelo próprio site, não
 * de avaliações copiadas do perfil dele.
 *
 * O caminho honesto e que funciona é o de baixo: mostrar as avaliações reais
 * na página e mandar quem quiser conferir para o perfil do Google.
 */
export const REVIEWS: Review[] = [
  {
    name: "Fernando Santos",
    text: "A melhor do Maranhão",
    stars: 5,
  },
  {
    // ⚠️ TRANSCRITA COMO ESTÁ PUBLICADA, sem a vírgula que faltaria depois de
    // "Maranhão". Corrigir a pontuação de uma avaliação é reescrever a fala de
    // outra pessoa — e quem clicar em "Ver todas no Google" vai comparar.
    name: "Matheus Phelipe",
    text: "Melhor empresa de energia solar do Maranhão entrega rápida e confiável",
    stars: 5,
  },
];

/**
 * ⚠️ O LINK DO PERFIL DO GOOGLE PRECISA VIR DO CLIENTE. É o botão "ver todas"
 * que o brief pede, e é ele que torna as avaliações verificáveis — sem o link,
 * as citações da página são só texto que nós escrevemos.
 *
 * Pegar em: Google Maps → perfil da EcoLuz → Compartilhar → Copiar link.
 * Vazio: o botão não é desenhado.
 */
export const REVIEWS_URL = "https://share.google/jPG9ePtwpyh4h1vtp";

/* ══════════════════ O TIME QUE ATENDE ═══════════════════════════════════ */

/**
 * Os cards da página de contato.
 *
 * ⚠️ ESTES TRÊS NOMES NÃO SÃO PESSOAS REAIS DA ECOLUZ. Eles vieram do site
 * original e o Alex decidiu mantê-los (2026-09-14) depois de o problema ter
 * sido apontado: são nomes e cargos fabricados num site comercial, e quem
 * chamar por qualquer um dos três vai falar com o mesmo número — o do
 * Mauricio, que é o dono.
 *
 * ⚠️ POR ISSO OS TRÊS TÊM O MESMO `wa`: não existem três aparelhos. A escolha
 * do card muda só a frase com que a conversa abre, o que ao menos faz o
 * atendimento chegar sabendo qual é o assunto.
 *
 * ⚠️ E É POR ISSO QUE ELES MORAM AQUI, ao lado dos números e das avaliações
 * vazios: tudo neste arquivo é afirmação sobre o mundo real que ainda precisa
 * do aval do cliente. O brief novo pede "fotos reais da equipe" — o dia em que
 * as fotos chegarem é o dia de decidir se estes três continuam existindo.
 *
 * Trocar por um card único com o nome do dono é uma edição só daqui: a página
 * lê esta lista e desenha o que houver nela.
 */
export const TEAM: { name: string; role: string; text: string; wa: string }[] = [
  {
    name: "Rafael Andrade",
    role: "Atendimento inicial",
    text: "Para quem quer começar agora, tirar dúvidas e entender qual é o melhor caminho antes de decidir qualquer coisa.",
    wa: "Olá! Vim pelo site da EcoLuz e quero tirar umas dúvidas sobre energia solar.",
  },
  {
    name: "Mariana Costa",
    role: "Projeto residencial",
    text: "Para casas e famílias que querem reduzir a conta de luz com instalação segura e bem acabada.",
    wa: "Olá! Quero energia solar na minha casa. Podemos analisar a minha conta?",
  },
  {
    name: "Bruno Lima",
    role: "Empresas e negócios",
    text: "Para comércio, clínica, restaurante, escritório ou empresa que precisa de previsibilidade no custo de energia.",
    wa: "Olá! Quero energia solar para a minha empresa. Podemos avaliar o consumo?",
  },
];
