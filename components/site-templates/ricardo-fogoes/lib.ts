// Os ENDEREÇOS do tema `ricardo-fogoes`.
//
// ⚠️ NENHUM CAMINHO É ESCRITO À MÃO NAS PÁGINAS. O mesmo site responde em três
// origens — `freelandoo.com.br/c/<slug>`, o subdomínio e o domínio próprio do
// cliente — e um `/servicos/x` literal acerta em UMA e dá 404 nas outras duas.
// No projeto de origem esses caminhos eram literais porque lá o site morava numa
// origem só; aqui não moram.
//
// ⚠️ E TODA PÁGINA INTERNA VIVE SOB `/pagina/<slug>`. Não é economia: o
// `proxy.ts` roda em toda requisição com ZERO I/O como regra, e não pode
// consultar o banco para descobrir se `/servicos` é uma página deste site ou
// uma rota da plataforma. `/pagina` é o único prefixo que ele reescreve nas
// três origens sem perguntar nada.

import type { TemplateLinks } from "@/types/site-template"

/**
 * Os endereços que não são de serviço nem de cidade.
 *
 * ⚠️ O NAMESPACE DE SLUG É UM SÓ. Serviços, cidades e estas páginas fixas
 * dividem o mesmo `/pagina/<slug>`: dois com o mesmo nome fariam o endereço
 * abrir um deles por ordem de array, sem erro nenhum. `assertNoSlugClash()`
 * (em `pages.ts`) trava isso.
 */
export const PAGE = {
  servicos: "servicos",
  areas: "areas-atendidas",
  contato: "contato",
  sobre: "sobre",
} as const

/** O endereço de uma página interna, na origem em que o site está sendo servido. */
export function pageHref(links: TemplateLinks, slug: string): string {
  return `${links.pageBase}/${slug}`
}

/**
 * O que cada página recebe.
 *
 * `links` desce por PROP e não por contexto de React: a porta do tema é
 * componente de SERVIDOR (é o que põe fonte, folha e JSON-LD no HTML que o
 * buscador lê), e servidor não tem contexto.
 */
export type Ctx = {
  links: TemplateLinks
}
