// types/site-template.ts
// A forma dos dados de um SITE FEITO PELA FREELANDOO (mig 241).
//
// ⚠️ ESTE ARQUIVO É ESPELHO de `src/utils/siteTemplates.js` no backend, que é
// quem NORMALIZA. Campo novo entra nos dois — declarado só aqui, ele chega
// sempre `undefined` (o backend descartou); declarado só lá, a página não sabe
// que ele existe. Mesma disciplina de `siteEvents.js` ↔ `site-analytics.tsx`.
//
// Tudo é obrigatório no tipo porque o normalizador SEMPRE devolve o campo —
// string vazia, lista vazia ou `null`. É isso que deixa a página desenhar sem
// uma cascata de `?.`: o que não foi preenchido é vazio, não ausente.

/** Bloco de pergunta e resposta. O backend descarta os que vêm pela metade. */
export type TemplateFaq = { q: string; a: string }

/** Item de lista com título — "o que o serviço cobre", "atendimento em X". */
export type TemplateTitledItem = { title: string; text: string }

/** Bloco de texto com título. */
export type TemplateProse = { title: string; body: string[] }

/** Os dados da empresa (NAP): o que aparece no cabeçalho, rodapé e contato. */
export type TemplateBusiness = {
  name: string
  legalName: string
  tagline: string
  subTagline: string
  owner: string
  /** Retrato do banner. Vazio degrada para o banner tipográfico, nunca quebra. */
  heroPhoto: string
  /**
   * O telefone tem três formas porque tem três empregos: a que se lê, a do
   * `tel:` e a do `wa.me`. Derivar uma da outra erra no primeiro número com
   * nono dígito ausente.
   */
  phoneDisplay: string
  phoneE164: string
  whatsappNumber: string
  street: string
  city: string
  state: string
  stateFull: string
  postalCode: string
  country: string
  /** `null` quando não veio inteira — meia coordenada põe alfinete no oceano. */
  geo: { lat: number; lng: number } | null
  hoursHuman: string
  hoursShort: string
  closedHuman: string
  payments: string[]
}

/** Os desenhos que o tema sabe fazer. Fora da lista, o backend cai no primeiro. */
export type TemplateArt = "burner" | "refit" | "industrial" | "clean" | "griddle" | "install"

/** Uma página de serviço. O `slug` é o endereço dela. */
export type TemplateService = {
  slug: string
  label: string
  h1: string
  metaTitle: string
  metaDescription: string
  eyebrow: string
  cardText: string
  art: TemplateArt
  photo: string
  waMessage: string
  intro: string[]
  problem: TemplateProse
  covers: TemplateProse & { items: TemplateTitledItem[] }
  signs: { title: string; lead: string; items: string[] }
  faq: TemplateFaq[]
  /**
   * "Veja também". Os slugs NÃO são conferidos contra a lista pelo backend — o
   * tema ignora o que não encontrar, que é mais honesto do que recusar o
   * documento inteiro por causa de um ponteiro pendente.
   */
  related: string[]
}

/** Uma página de cidade atendida — é ela que responde em busca local. */
export type TemplateCity = {
  slug: string
  name: string
  /** "em Aguaí", "em São João da Boa Vista": concordância não se concatena. */
  prep: string
  uf: string
  isBase: boolean
  h1: string
  metaTitle: string
  metaDescription: string
  eyebrow: string
  cardText: string
  intro: string[]
  context: TemplateProse
  focus: { title: string; lead: string; items: TemplateTitledItem[] }
  faq: TemplateFaq[]
  waMessage: string
}

/** Depoimento. O backend exige `source` — elogio sem origem não entra. */
export type TemplateReview = { quote: string; source: string }

/** Os dados do tema `oficina-local`. */
export type OficinaLocalData = {
  business: TemplateBusiness
  services: TemplateService[]
  cities: TemplateCity[]
  reviews: TemplateReview[]
  faq: TemplateFaq[]
  googleProfileUrl: string
  waDefault: string
}

/**
 * O tema como ele chega do backend.
 *
 * Hoje há um só, então o tipo é direto. Com o segundo, isto vira uma união
 * discriminada por `slug` — e o registro de componentes é que decide quem
 * desenha, sem `if` espalhado pelas rotas.
 */
export type SiteTemplate =
  | {
      slug: "oficina-local"
      data: OficinaLocalData
    }
  /**
   * Tema AUTORAL de um cliente: o conteúdo mora no código do tema, não no
   * documento. `data` é `null` porque não há nada a gravar — e declarar
   * assim é o que impede alguém de tentar alimentá-lo por fora achando que
   * mudaria a página.
   */
  | {
      slug: "ricardo-fogoes"
      data: null
    }

/**
 * O endereço do site nos TRÊS lugares em que ele é servido.
 *
 * O tema não monta URL sozinho: `/c/<slug>`, o subdomínio e o domínio próprio
 * têm bases diferentes, e um caminho escrito à mão acertaria em um e quebraria
 * nos outros dois — a mesma lição que fez o destino de agendar virar um token
 * no construtor (mig 221).
 */
export type TemplateLinks = {
  /**
   * A origem absoluta por onde ESTA visita chegou (`https://padaria.com.br`).
   *
   * Existe por causa do JSON-LD, que é o produto inteiro desta feature: o
   * `@id` do negócio e os itens da trilha precisam de endereço absoluto, e o
   * mesmo site responde em três origens. Fixar a nossa faria o site no domínio
   * do cliente declarar ao buscador que mora em freelandoo.com.br.
   */
  origin: string
  /**
   * A comunidade dona do site.
   *
   * É o que o contador de visitas do painel de Indicadores precisa saber — o
   * site gerenciado monta o MESMO `SiteAnalytics` do site do construtor, senão
   * o dono ficaria com o painel em zero e sem como saber por quê.
   */
  communityId: string
  /** A home do site. */
  home: string
  /** Prefixo das páginas internas: `${pageBase}/<slug>`. */
  pageBase: string
  /**
   * A página de agendamento, quando este site tem agenda.
   *
   * ⚠️ É ELE que o contador de cliques reconhece (`SiteAnalytics` compara o
   * CAMINHO). Um botão de agendar que aponte para outro lugar funciona e não
   * conta — e o painel de Indicadores diz "zero cliques", que é pior do que
   * não dizer nada, porque parece dado.
   */
  booking: string | null
}
