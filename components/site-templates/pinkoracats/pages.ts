// O ROTEADOR DO TEMA: endereço → página, e o que cada uma declara ao buscador.
//
// ⚠️ FONTE ÚNICA DA LISTA DE PÁGINAS: ela responde qual endereço existe
// (`resolvePinkoraPage`), o que o sitemap publica (`PAGE_SLUGS`) e o que o
// `<title>` diz (`pageMeta`). E tem ESPELHO no backend — `summarizePinkoracats`
// em `src/utils/siteTemplates.js`, o resumo que o cliente lê antes de aceitar.
//
// ⚠️ O NAMESPACE DE SLUG É UM SÓ (`/pagina/<slug>`): produto, coleção e
// página fixa não podem repetir nome. `assertNoSlugClash` trava isso no import.

import { BRAND } from "./content/brand"
import { COLLECTIONS, COLLECTION_BY_SLUG, type Collection } from "./content/collections"
import { PRODUCTS, PRODUCT_BY_SLUG, type Product } from "./content/products.mock"
import { PAGE } from "./lib"

export type PinkoraPage =
  | { kind: "product"; product: Product }
  | { kind: "collection"; collection: Collection }
  | { kind: "loja" }
  | { kind: "sobre" }

function assertNoSlugClash() {
  const all = [...PRODUCTS.map((p) => p.slug), ...COLLECTIONS.map((c) => c.slug), PAGE.loja, PAGE.sobre]
  const seen = new Set<string>()
  for (const s of all) {
    if (seen.has(s)) throw new Error(`[pinkoracats] endereço repetido: ${s}`)
    seen.add(s)
  }
}
assertNoSlugClash()

/** ⚠️ Ordem PRODUTO → COLEÇÃO → FIXA, a mesma do resumo do backend. */
export function resolvePinkoraPage(slug: string): PinkoraPage | null {
  const product = PRODUCT_BY_SLUG.get(slug)
  if (product) return { kind: "product", product }
  const collection = COLLECTION_BY_SLUG.get(slug)
  if (collection) return { kind: "collection", collection }
  if (slug === PAGE.loja) return { kind: "loja" }
  if (slug === PAGE.sobre) return { kind: "sobre" }
  return null
}

export function pageSlug(page: PinkoraPage | null): string | null {
  if (!page) return null
  switch (page.kind) {
    case "product":
      return page.product.slug
    case "collection":
      return page.collection.slug
    case "loja":
      return PAGE.loja
    case "sobre":
      return PAGE.sobre
  }
}

export const PAGE_SLUGS: string[] = [
  PAGE.loja,
  ...COLLECTIONS.map((c) => c.slug),
  ...PRODUCTS.map((p) => p.slug),
  PAGE.sobre,
]

export function pageMeta(page: PinkoraPage | null): { title: string; description: string } {
  const brand = BRAND.full
  if (!page) {
    return {
      title: `${brand} — nail art como objeto`,
      description:
        "Sets autorais de unhas, charms e encomendas desenhadas à mão. Coleções New Drop, Pink, Dark, Chrome, Charms e Custom.",
    }
  }
  switch (page.kind) {
    case "product":
      return {
        title: `${page.product.name} | ${brand}`,
        description: `${page.product.tagline} ${page.product.description}`.slice(0, 158),
      }
    case "collection":
      return {
        title: `Coleção ${page.collection.name} | ${brand}`,
        description: page.collection.statement,
      }
    case "loja":
      return {
        title: `Loja — todo o catálogo | ${brand}`,
        description: "Todos os sets de unhas da Pinkoracats em um lugar: filtre por coleção e veja em grade, editorial ou compacto.",
      }
    case "sobre":
      return {
        title: `Sobre a marca | ${brand}`,
        description: `A ${brand} é nail art autoral de ${BRAND.owner}, em ${BRAND.city}/${BRAND.state}.`,
      }
  }
}
