// O CATÁLOGO — a fonte ÚNICA dos produtos e coleções que o site desenha.
//
// ── DE ONDE VEM ──────────────────────────────────────────────────────────────
//
// Da LOJA DA TAIZ, ao vivo (mig 271): o backend põe `catalog` dentro do `data`
// do tema na hora da leitura — coleções, produtos ATIVOS com todas as fotos e
// o preço de COMPRADORA (`display_price_cents`, o mesmo que o carrinho cobra).
// Nada disso é gravado no documento do tema: copiado para lá, o site viraria
// uma segunda verdade sobre preço.
//
// ── A PRÉVIA ─────────────────────────────────────────────────────────────────
//
// Enquanto a Loja não tiver NENHUM produto ativo, o site mostra a prévia de
// `products.mock.ts` (com a faixa "catálogo em prévia", JSON-LD sem preço e o
// pedido por e-mail). `live` é ESSA decisão, num lugar só — antes ela era uma
// constante escrita à mão (`PLACEHOLDER_CATALOG`), e agora vira sozinha no dia
// em que a Taiz liga o primeiro produto.
//
// ── O QUE A LOJA NÃO TEM, E O TEMA DERIVA ────────────────────────────────────
//
// O produto da Loja tem nome, descrição, preço, estoque, fotos, coleção e
// destaque. O FORMATO da unha é a coleção (as coleções da Taiz são os
// formatos — ver `shapes.ts`). O tema precisa de mais: o desenho do
// placeholder (variante, cor), a linha curta e os detalhes. Os dois primeiros
// só existem enquanto NÃO há foto, e saem do id de forma DETERMINÍSTICA (o
// mesmo produto sempre desenha igual); os outros dois saem da descrição:
//   1º parágrafo → a linha curta · 2º → a descrição · linhas "• " → detalhes.
//
// ⚠️ ESTE ARQUIVO É PURO (sem React): é lido pelo servidor (páginas, JSON-LD,
// roteador) e pelo cliente (carrinho, busca). Os objetos que viajam do servidor
// para o cliente são planos — `Map` não atravessa essa fronteira; o índice é
// montado de cada lado por `catalogIndex`.

import { COLLECTIONS, type Collection, type CollectionEffect } from "./collections"
import { PRODUCTS, type NailShape, type PlaceholderVariant, type Product } from "./products.mock"
import { collectionShape, declaredShape, shapeCat, type ShapeSlug } from "./shapes"

export type Catalog = {
  /** `true` = Loja de verdade; `false` = prévia. */
  live: boolean
  /** O perfil dono da Loja (no live). */
  storeProfileId: string | null
  products: Product[]
  collections: Collection[]
}

/** O formato que o backend manda em `data.catalog` (CommunitySiteService.loadCatalog). */
type LiveProduct = {
  id_profile_product: number
  id_collection: number | null
  name: string
  description: string
  price_cents: number
  stock: number
  is_featured: boolean
  images: string[]
}
type LiveCollection = {
  id_collection: number
  name: string
  slug: string
  kicker: string
  description: string
  cover_url: string | null
}
type LiveCatalog = { store_profile_id: string | null; collections: LiveCollection[]; products: LiveProduct[] }

const VARIANTS: PlaceholderVariant[] = [
  "holographic",
  "pink-chrome",
  "black-glass",
  "mirror",
  "transparent-glass",
  "editorial-white",
]
const EFFECTS: CollectionEffect[] = ["holo", "glow", "glass", "sweep", "sparks", "paper"]
const SHAPES: NailShape[] = ["almond", "coffin", "stiletto", "square"]
const TINTS: [string, string][] = [
  ["#5a0f24", "#ff4f9a"],
  ["#2c2c2c", "#ff8dc2"],
  ["#0b0b0b", "#b8b8b8"],
  ["#ff8dc2", "#ff4f9a"],
  ["#efe4dc", "#ffffff"],
  ["#8fd8ff", "#ff8dc2"],
  ["#1a1030", "#b58cff"],
  ["#ffd3e6", "#ff4f9a"],
]

/** Os tamanhos de tip que a compradora escolhe — vão no pedido como observação. */
export const SIZES = ["P", "M", "G"]

/** Sem coleção: a página de produto e os filtros precisam de um rótulo. */
export const LOOSE_COLLECTION = "pecas"

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/**
 * O endereço do produto: nome + id. O id no fim é o que faz renomear não
 * quebrar o link antigo de forma silenciosa (o roteador acha pelo id e
 * confere o nome), e o que impede dois produtos com o mesmo nome de dividirem
 * a mesma página.
 */
export function productSlug(name: string, id: number): string {
  return `${slugify(name).slice(0, 60) || "set"}-${id}`
}

/** Linha curta, descrição e detalhes, a partir do texto único da Loja. */
function splitDescription(text: string): { tagline: string; description: string; details: string[] } {
  const lines = String(text || "").replace(/\r\n/g, "\n").split("\n")
  const details = lines
    .map((l) => l.trim())
    .filter((l) => /^[•\-*]\s+/.test(l))
    .map((l) => l.replace(/^[•\-*]\s+/, ""))
  const prose = lines
    .filter((l) => !/^\s*[•\-*]\s+/.test(l))
    .join("\n")
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean)
  if (prose.length >= 2) return { tagline: prose[0], description: prose.slice(1).join(" "), details }
  return { tagline: "", description: prose[0] || "", details }
}

function isLive(data: unknown): data is { catalog: LiveCatalog } {
  const c = (data as { catalog?: LiveCatalog } | null)?.catalog
  return !!c && Array.isArray(c.products) && Array.isArray(c.collections)
}

function preview(): Catalog {
  return PREVIEW
}

/** Uma montagem por objeto de dados: a página, o roteador e o JSON-LD leem o MESMO. */
const built = new WeakMap<object, Catalog>()
/** A prévia não tem coleções de formato: o formato dela sai da linha "Formato …" dos detalhes. */
const PREVIEW: Catalog = {
  live: false,
  storeProfileId: null,
  products: PRODUCTS.map((p) => {
    const form = declaredShape(p.details)
    return { ...p, form, shape: form ? shapeCat(form)!.draw : p.shape }
  }),
  collections: COLLECTIONS,
}

export function buildCatalog(data: unknown): Catalog {
  if (!data || typeof data !== "object") return PREVIEW
  const hit = built.get(data)
  if (hit) return hit
  const cat = assemble(data)
  built.set(data, cat)
  return cat
}

function assemble(data: unknown): Catalog {
  if (!isLive(data)) return preview()
  const raw = data.catalog
  const sellable = raw.products.filter((p) => p && p.id_profile_product && p.name)
  // Loja sem nenhum produto ativo: a prévia continua no ar. Um site vazio
  // seria pior do que um site que diz que está em prévia.
  if (sellable.length === 0) return preview()

  const used = new Set(sellable.map((p) => p.id_collection).filter((x): x is number => x != null))
  const collections: Collection[] = raw.collections
    .filter((c) => used.has(c.id_collection))
    .map((c, i) => ({
      slug: c.slug,
      name: c.name,
      kicker: c.kicker || c.name,
      statement: c.description || "",
      effect: EFFECTS[i % EFFECTS.length],
      variant: VARIANTS[i % VARIANTS.length],
      image: c.cover_url || null,
    }))
  const colById = new Map(raw.collections.map((c) => [c.id_collection, c.slug]))
  // O formato do produto É a coleção dele (Stiletto, Bailarina…), não uma
  // linha da descrição.
  const colShape = new Map<number, ShapeSlug | null>(
    raw.collections.map((c) => [c.id_collection, collectionShape(c.name, c.slug)])
  )
  const colVariant = new Map(collections.map((c) => [c.slug, c.variant]))
  const hasLoose = sellable.some((p) => p.id_collection == null || !colById.has(p.id_collection))
  if (hasLoose) {
    collections.push({
      slug: LOOSE_COLLECTION,
      name: "Peças",
      kicker: "Avulsas",
      statement: "Sets que não estão em nenhuma coleção.",
      effect: "paper",
      variant: "editorial-white",
      image: null,
    })
  }

  const anyFeatured = sellable.some((p) => p.is_featured)
  const products: Product[] = sellable.map((p, i) => {
    const id = Number(p.id_profile_product)
    const collection = (p.id_collection != null && colById.get(p.id_collection)) || LOOSE_COLLECTION
    const text = splitDescription(p.description)
    const form = (p.id_collection != null && colShape.get(p.id_collection)) || null
    const images = (p.images || []).filter(Boolean)
    // Sem destaque escolhido, os quatro primeiros fazem o papel — a home
    // precisa de alguém no palco.
    const featured = anyFeatured ? p.is_featured : i < 4
    return {
      id: `s${id}`,
      slug: productSlug(p.name, id),
      number: String(i + 1).padStart(2, "0"),
      name: p.name,
      collection,
      priceCents: Math.max(0, Number(p.price_cents) || 0),
      image: images[0] || null,
      hoverImage: images[1] || null,
      detailImages: images.slice(1),
      stock: Math.max(0, Number(p.stock) || 0),
      featured,
      bestSeller: featured,
      variant: colVariant.get(collection) || VARIANTS[id % VARIANTS.length],
      // o desenho segue o formato declarado; sem declaração, é só placeholder
      shape: form ? shapeCat(form)!.draw : SHAPES[id % SHAPES.length],
      form,
      tint: TINTS[id % TINTS.length],
      media: images.length ? { fit: "cover" } : undefined,
      tagline: text.tagline,
      description: text.description,
      details: text.details,
      sizes: SIZES,
      storeProductId: String(id),
    }
  })

  return { live: true, storeProfileId: raw.store_profile_id || null, products, collections }
}

type Index = {
  byId: Map<string, Product>
  bySlug: Map<string, Product>
  colBySlug: Map<string, Collection>
}

const cache = new WeakMap<Catalog, Index>()

/** Os índices do catálogo, montados uma vez por objeto (servidor e cliente). */
export function catalogIndex(cat: Catalog): Index {
  let idx = cache.get(cat)
  if (!idx) {
    idx = {
      byId: new Map(cat.products.map((p) => [p.id, p])),
      bySlug: new Map(cat.products.map((p) => [p.slug, p])),
      colBySlug: new Map(cat.collections.map((c) => [c.slug, c])),
    }
    cache.set(cat, idx)
  }
  return idx
}

export function productsIn(cat: Catalog, collection: string): Product[] {
  return cat.products.filter((p) => p.collection === collection)
}

/**
 * A coleção que faz o papel de "drop" (o primeiro chamado da home), se existir
 * uma chamada "new-drop". Sem fallback para a primeira coleção: na Loja as
 * coleções são formatos, e o menu chamaria "Stiletto" de drop.
 */
export function dropCollection(cat: Catalog): Collection | null {
  return catalogIndex(cat).colBySlug.get("new-drop") || null
}
