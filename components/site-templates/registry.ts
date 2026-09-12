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
  resolveOficinaPage,
  type OficinaPage,
} from "./oficina-local"

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
  metadata: (props: TemplateProps) => Metadata
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
}

const TEMPLATES: Record<string, TemplateEntry> = {
  "oficina-local": OFICINA_LOCAL,
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
