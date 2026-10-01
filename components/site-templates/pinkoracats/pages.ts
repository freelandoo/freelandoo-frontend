// O ROTEADOR DO TEMA: endereço → página, e o que cada uma declara ao buscador.
//
// ⚠️ FONTE ÚNICA DA LISTA DE PÁGINAS: ela responde qual endereço existe
// (`resolvePinkoraPage`), o que o sitemap publica (`pinkoraPageSlugs`) e o que
// o `<title>` diz (`pageMeta`). As páginas fixas têm ESPELHO no backend —
// `summarizePinkoracats` em `src/utils/siteTemplates.js`, o resumo que o
// cliente lê antes de aceitar.
//
// ⚠️ PRODUTOS E COLEÇÕES SÃO DA LOJA, AO VIVO (mig 271): eles vêm do `data`
// (ver `content/catalog.ts`), então o roteador recebe o catálogo. Enquanto a
// Loja não tiver produto ativo, é a prévia que responde — e os endereços dela
// continuam existindo.
//
// ⚠️ O NAMESPACE DE SLUG É UM SÓ (`/pagina/<slug>`): produto, coleção e página
// fixa dividem o mesmo espaço. O produto ganha o id no fim do endereço e as
// páginas fixas são endereços reservados no backend, então eles não colidem.

import { BRAND } from "./content/brand"
import { buildCatalog, catalogIndex, type Catalog } from "./content/catalog"
import type { Collection } from "./content/collections"
import type { Product } from "./content/products.mock"
import { PAGE } from "./lib"

export type PinkoraPage =
  | { kind: "product"; product: Product }
  | { kind: "collection"; collection: Collection }
  | { kind: "loja" }
  | { kind: "sobre" }

/** ⚠️ Ordem PRODUTO → COLEÇÃO → FIXA, a mesma do resumo do backend. */
export function resolvePinkoraPage(slug: string, data?: unknown): PinkoraPage | null {
  const cat = buildCatalog(data)
  const { bySlug, colBySlug } = catalogIndex(cat)
  const product = bySlug.get(slug)
  if (product) return { kind: "product", product }
  const collection = colBySlug.get(slug)
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

/** Os endereços internos, para o sitemap do domínio da cliente. */
export function pinkoraPageSlugs(data?: unknown): string[] {
  const cat = buildCatalog(data)
  return [PAGE.loja, ...cat.collections.map((c) => c.slug), ...cat.products.map((p) => p.slug), PAGE.sobre]
}

export function pageMeta(page: PinkoraPage | null, cat?: Catalog): { title: string; description: string } {
  const brand = BRAND.full
  if (!page) {
    const names = (cat?.collections || []).map((c) => c.name)
    return {
      title: `${brand} — nail art como objeto`,
      description: names.length
        ? `Sets autorais de unhas, charms e encomendas desenhadas à mão. Coleções ${names.join(", ")}.`
        : "Sets autorais de unhas, charms e encomendas desenhadas à mão.",
    }
  }
  switch (page.kind) {
    case "product":
      return {
        title: `${page.product.name} | ${brand}`,
        description: `${page.product.tagline} ${page.product.description}`.trim().slice(0, 158),
      }
    case "collection":
      return {
        title: `Coleção ${page.collection.name} | ${brand}`,
        description: page.collection.statement || `Os sets da coleção ${page.collection.name}.`,
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
