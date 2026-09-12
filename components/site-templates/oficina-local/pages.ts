// As páginas internas do tema `oficina-local`.
//
// Serviços e cidades dividem UM namespace de endereços — `/pagina/conserto` e
// `/pagina/aguai` são vizinhos, não primos. Não é acaso: o prefixo `/pagina` é
// o único que o `proxy.ts` sabe reescrever nos três endereços sem consultar
// nada, e inventar um `/servicos/<slug>` daria uma página que responde na
// plataforma e dá 404 no subdomínio.
//
// ⚠️ O preço é que um serviço e uma cidade NÃO podem ter o mesmo endereço. Quem
// impede é o backend (o dedupe é global, com serviço primeiro); aqui a ordem de
// busca é a mesma, para que os dois lados concordem sobre quem ganha se um dia
// um documento antigo trouxer a colisão.

import type { OficinaLocalData, TemplateCity, TemplateService } from "@/types/site-template"

export type OficinaPage =
  | { kind: "service"; service: TemplateService }
  | { kind: "city"; city: TemplateCity }

export function resolveOficinaPage(
  data: OficinaLocalData | null | undefined,
  slug: string
): OficinaPage | null {
  if (!data || !slug) return null
  const service = data.services?.find((s) => s.slug === slug)
  if (service) return { kind: "service", service }
  const city = data.cities?.find((c) => c.slug === slug)
  if (city) return { kind: "city", city }
  return null
}

/**
 * Os serviços que uma página aponta em "veja também".
 *
 * Ponteiro pendente é IGNORADO, não quebra: apagar um serviço não pode derrubar
 * a página dos outros três que o citavam. E a própria página nunca aparece na
 * lista — "veja também: esta mesma página" é o tipo de detalhe que passa em
 * revisão e salta aos olhos de quem visita.
 */
export function relatedServices(
  data: OficinaLocalData,
  service: TemplateService
): TemplateService[] {
  return (service.related || [])
    .filter((slug) => slug !== service.slug)
    .map((slug) => data.services.find((s) => s.slug === slug))
    .filter((s): s is TemplateService => !!s)
}

/**
 * As outras cidades, nunca a própria.
 *
 * Sem isto as cidades ficariam ilhadas umas das outras — e são elas que
 * respondem em busca local, onde o buscador mede o cluster geográfico pelos
 * links que ligam as páginas entre si.
 */
export function otherCities(data: OficinaLocalData, city: TemplateCity): TemplateCity[] {
  return data.cities.filter((c) => c.slug !== city.slug)
}
