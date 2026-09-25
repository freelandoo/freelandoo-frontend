// components/site-templates/registry.ts
// O REGISTRO DE TEMAS — espelho do `src/utils/siteTemplates.js` do backend.
//
// Um site publicado tem duas naturezas possíveis, e quem decide é UMA coluna:
//
//   template = NULL  → o canvas de seções do construtor (`PublicSiteView`)
//   template = slug  → um tema autoral, desenhado por nós (aqui)
//
// ⚠️ TEMA NOVO ENTRA NOS DOIS LADOS: aqui e no registro do backend. Só aqui, o
// save é recusado e o tema nunca recebe dados; só lá, a página recebe um tema
// que não sabe montar — e é por isso que `templateFor` devolve `null` em vez de
// escolher um qualquer: desenhar dados de barbearia com o tema de oficina
// publicaria uma página com os campos trocados, sem erro nenhum.
//
// ⚠️ AS PÁGINAS INTERNAS DE TODO TEMA VIVEM SOB O MESMO PREFIXO `/pagina/<slug>`
// das sub-páginas do construtor, e isso não é economia: é o que o `proxy.ts`
// sabe reescrever nos TRÊS endereços sem consultar nada (a regra de ZERO I/O
// dele). Um `/servicos/<slug>` próprio do tema responderia na plataforma e
// daria 404 no subdomínio.
//
// ⚠️ E AS ROTAS FALAM SÓ COM ESTA INTERFACE. Elas não importam componente de
// tema nenhum: a bifurcação continua sendo UMA linha por rota quando houver
// seis temas, em vez de um `if` por tema em quatro arquivos — que é como um
// deles ficaria para trás, servindo a home certa e a sub-página errada.

import type { Metadata } from "next"

import type { OficinaLocalData, SiteTemplate, TemplateLinks } from "@/types/site-template"
import {
  OficinaLocalSite,
  oficinaMetadata,
  oficinaPageSlugs,
  resolveOficinaPage,
  type OficinaPage,
} from "./oficina-local"
import {
  RicardoFogoesSite,
  ricardoMetadata,
  ricardoPageSlugs,
  resolveRicardoPage,
  type RicardoPage,
} from "./ricardo-fogoes"
import {
  EnzoCortesSite,
  enzoMetadata,
  enzoPageSlugs,
  resolveEnzoPage,
  type EnzoPage,
} from "./enzo-cortes"
import {
  EcoluzSite,
  ecoluzMetadata,
  ecoluzPageSlugs,
  resolveEcoluzPage,
  type EcoluzPage,
} from "./ecoluz"

/**
 * O que a rota entrega ao tema.
 *
 * `data` e `page` são `unknown` DE PROPÓSITO: quem resolveu a página é o tema,
 * quem a desenha é o mesmo tema, e a rota só carrega o valor de um para o outro
 * sem nunca abrir. É isso que permite ao segundo tema ter outro formato de
 * dados sem uma linha de mudança em rota nenhuma.
 */
export type TemplateProps = {
  data: unknown
  links: TemplateLinks
  /** `null` é a home. */
  page: unknown
}

export type TemplateEntry = {
  slug: SiteTemplate["slug"]
  /** O site inteiro: casca, conteúdo e dados estruturados. */
  Site: (props: TemplateProps) => React.ReactElement
  /** Endereço → página, ou `null` quando ela não existe (a rota dá 404). */
  resolvePage: (data: unknown, slug: string) => unknown | null
  /** `<title>`, descrição, canônico e preview — o que o buscador lê. */
  metadata: (props: TemplateProps) => Metadata | Promise<Metadata>
  /**
   * Os endereços internos do site, sem a home — é o que o `app/sitemap.ts`
   * publica no domínio do cliente.
   *
   * ⚠️ NASCE NO TEMA, e não numa lista à parte, pela mesma razão de
   * `resolvePage`: os dois respondem sobre o MESMO conjunto de páginas. Numa
   * segunda lista, a página nova entraria no site e ficaria fora do mapa — e o
   * jeito de descobrir seria notar, meses depois, que ela nunca foi indexada.
   *
   * Recebe `data` porque num tema do construtor as páginas vêm do documento;
   * nos temas autorais elas moram no código e o argumento é ignorado.
   */
  pageSlugs: (data: unknown) => string[]
}

const OFICINA_LOCAL: TemplateEntry = {
  slug: "oficina-local",
  Site: ({ data, links, page }) =>
    OficinaLocalSite({
      data: data as OficinaLocalData,
      links,
      page: (page as OficinaPage | null) ?? null,
    }),
  resolvePage: (data, slug) => resolveOficinaPage(data as OficinaLocalData, slug),
  metadata: ({ data, links, page }) =>
    oficinaMetadata({
      data: data as OficinaLocalData,
      links,
      page: (page as OficinaPage | null) ?? null,
    }),
  pageSlugs: (data) => oficinaPageSlugs(data as OficinaLocalData),
}

/**
 * Tema AUTORAL, escrito para UM cliente: todo o conteúdo mora no código dele.
 *
 * ⚠️ Ele ignora `data` de propósito — o documento é `{}` (o `normalize` do
 * backend devolve vazio). Ligar qualquer entrada de dados aqui acrescentaria
 * conteúdo que o cliente não aprovou.
 */
const RICARDO_FOGOES: TemplateEntry = {
  slug: "ricardo-fogoes",
  Site: ({ links, page }) =>
    RicardoFogoesSite({ links, page: (page as RicardoPage | null) ?? null }),
  resolvePage: (_data, slug) => resolveRicardoPage(slug),
  metadata: ({ links, page }) =>
    ricardoMetadata({ links, page: (page as RicardoPage | null) ?? null }),
  pageSlugs: () => ricardoPageSlugs,
}

/**
 * Tema AUTORAL, escrito para UM cliente: barbearia no Jardim Pinheiros, em
 * São Bernardo do Campo.
 *
 * ⚠️ Ele ignora `data` de propósito, pela mesma razão do `ricardo-fogoes`: o
 * documento é `{}` (o `normalize` do backend devolve vazio) e a tabela de
 * preços que o site publica é a do CÓDIGO do tema. Alimentá-lo pelo documento
 * poria duas tabelas de preço na mesma página — a escrita e a gravada —, que
 * é a segunda verdade sobre preço que a vitrine do construtor já teve de
 * desfazer uma vez (back `5782dd1`).
 *
 * ⚠️ ATUALIZADO EM 2026-09-25: os PREÇOS deste site passaram a vir do
 * cadastro de serviços do Enzo ("caso altere lá, altera no site"). Continua
 * sem `services` e sem `data`: o tema lê o cadastro sozinho, pelo ID de cada
 * serviço, e troca só o número — texto e layout seguem os do código. Ver
 * `enzo-cortes/content/prices.ts`. Por isso `metadata` pode devolver Promise.
 */
const ENZO_CORTES: TemplateEntry = {
  slug: "enzo-cortes",
  Site: ({ links, page }) =>
    EnzoCortesSite({ links, page: (page as EnzoPage | null) ?? null }),
  resolvePage: (_data, slug) => resolveEnzoPage(slug),
  metadata: ({ links, page }) =>
    enzoMetadata({ links, page: (page as EnzoPage | null) ?? null }),
  pageSlugs: () => enzoPageSlugs,
}

/**
 * Tema AUTORAL, escrito para UM cliente: energia solar em São Luís, no
 * Maranhão.
 *
 * ⚠️ Ele ignora `data` e `services` de propósito, pela mesma razão dos dois
 * anteriores: o documento é `{}` (o `normalize` do backend devolve vazio) e
 * todo o conteúdo — os cinco serviços, os quatro municípios, o FAQ — mora no
 * código do tema.
 *
 * ⚠️ E LIGAR `services` AQUI SERIA PIOR QUE INÚTIL: a vitrine do cadastro
 * desenha PREÇO, e este negócio não publica preço em lugar nenhum de
 * propósito — sistema solar depende de consumo, telhado e arranjo, e um
 * número na página seria chute publicado como fato. Ver a nota no JSON-LD
 * (`schema.tsx`), que pela mesma razão não declara `priceRange`.
 */
const ECOLUZ: TemplateEntry = {
  slug: "ecoluz",
  Site: ({ links, page }) =>
    EcoluzSite({ links, page: (page as EcoluzPage | null) ?? null }),
  resolvePage: (_data, slug) => resolveEcoluzPage(slug),
  metadata: ({ links, page }) =>
    ecoluzMetadata({ links, page: (page as EcoluzPage | null) ?? null }),
  pageSlugs: () => ecoluzPageSlugs,
}

const TEMPLATES: Record<string, TemplateEntry> = {
  "oficina-local": OFICINA_LOCAL,
  "ricardo-fogoes": RICARDO_FOGOES,
  "enzo-cortes": ENZO_CORTES,
  ecoluz: ECOLUZ,
}

/**
 * O tema que sabe desenhar este site.
 *
 * `null` significa "não sei desenhar isto": ou o site é do construtor (o caso
 * de todo mundo), ou o backend já conhece um tema que este deploy do front
 * ainda não tem. Os dois casos são tratados por quem chama, e nenhum deles
 * desenha nada por conta própria.
 */
export function templateFor(slug: string | null | undefined): TemplateEntry | null {
  if (!slug) return null
  return TEMPLATES[slug] || null
}
