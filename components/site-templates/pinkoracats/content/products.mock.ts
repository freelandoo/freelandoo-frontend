// ⚠️⚠️ DADOS DE PRÉVIA — o catálogo real ainda não existe.
//
// Nomes são editoriais e provisórios, preços e estoques são PLACEHOLDER
// (ver `PLACEHOLDER_CATALOG` em `brand.ts`). O arquivo leva `.mock` no nome
// para ninguém confundir com oferta aprovada.
//
// ── A REGRA QUE FAZ AS FOTOS ENTRAREM DEPOIS SEM RECONSTRUIR NADA ─────────
//
// A ANIMAÇÃO PERTENCE AO COMPONENTE (`ProductMedia`), A IMAGEM PERTENCE AOS
// DADOS. Para pôr a foto definitiva basta preencher `image` (e, se quiser,
// `hoverImage` e `detailImages`) — proporção, máscara, tilt, reveal, órbita e
// quick view continuam os mesmos. PNG/WEBP/AVIF com fundo transparente
// funcionam melhor ainda: com `media.fit = "contain"` a peça flutua sobre o
// placeholder da coleção.
//
// Arquivo local vai em `public/sites/pinkoracats/…` e é referenciado por
// caminho absoluto (`/sites/pinkoracats/cherry-static.webp`) — funciona nas
// três origens do site sem configuração nenhuma.

export type PlaceholderVariant =
  | "black-glass"
  | "pink-chrome"
  | "mirror"
  | "holographic"
  | "editorial-white"
  | "transparent-glass"

export type NailShape = "almond" | "coffin" | "stiletto" | "square"

export type MediaConfig = {
  /** `cover` recorta; `contain` preserva a peça inteira (ideal para PNG sem fundo). */
  fit?: "cover" | "contain"
  position?: string
  scale?: number
  rotation?: number
}

export type Product = {
  id: string
  slug: string
  /** "01", "02"… — o número de catálogo que o placeholder estampa. */
  number: string
  name: string
  collection: string
  priceCents: number
  image: string | null
  hoverImage: string | null
  detailImages: string[]
  stock: number
  featured: boolean
  bestSeller: boolean
  variant: PlaceholderVariant
  shape: NailShape
  /** Cores do desenho do placeholder (unha): base e detalhe. */
  tint: [string, string]
  media?: MediaConfig
  tagline: string
  description: string
  details: string[]
  sizes: string[]
  /** O produto cadastrado na Loja da Freelandoo. `null` = ainda não comprável online. */
  storeProductId: string | null
}

const SIZES = ["P", "M", "G"]

export const PRODUCTS: Product[] = [
  {
    id: "pk-001", slug: "cherry-static", number: "01", name: "Cherry Static",
    collection: "new-drop", priceCents: 8900, image: null, hoverImage: null, detailImages: [],
    stock: 6, featured: true, bestSeller: true, variant: "holographic", shape: "almond",
    tint: ["#5a0f24", "#ff4f9a"],
    tagline: "Cereja escura com estática rosa na ponta.",
    description: "Set de 10 tips amendoadas com base cereja profunda e uma interferência rosa que só aparece na luz.",
    details: ["10 tips + cola e lixa", "Formato amendoado médio", "Acabamento gel brilho molhado"],
    sizes: SIZES, storeProductId: null,
  },
  {
    id: "pk-002", slug: "chrome-kitten", number: "02", name: "Chrome Kitten",
    collection: "chrome", priceCents: 9900, image: null, hoverImage: null, detailImages: [],
    stock: 4, featured: true, bestSeller: true, variant: "mirror", shape: "stiletto",
    tint: ["#2c2c2c", "#ff8dc2"],
    tagline: "Prata espelho com orelhinha em relevo.",
    description: "Stiletto em cromado espelho com um detalhe felino em relevo 3D na unha de destaque.",
    details: ["10 tips + cola e lixa", "Formato stiletto", "Pó cromado + relevo em gel"],
    sizes: SIZES, storeProductId: null,
  },
  {
    id: "pk-003", slug: "black-mirror-tip", number: "03", name: "Black Mirror Tip",
    collection: "dark", priceCents: 7900, image: null, hoverImage: null, detailImages: [],
    stock: 9, featured: false, bestSeller: true, variant: "black-glass", shape: "coffin",
    tint: ["#0b0b0b", "#b8b8b8"],
    tagline: "Preto vidro com francesinha espelhada.",
    description: "Bailarina preto vidro com a ponta em cromado prata — a francesinha virada do avesso.",
    details: ["10 tips + cola e lixa", "Formato bailarina", "Top coat vitrificado"],
    sizes: SIZES, storeProductId: null,
  },
  {
    id: "pk-004", slug: "pink-voltage", number: "04", name: "Pink Voltage",
    collection: "pink", priceCents: 8400, image: null, hoverImage: null, detailImages: [],
    stock: 5, featured: true, bestSeller: false, variant: "pink-chrome", shape: "square",
    tint: ["#ff8dc2", "#ff4f9a"],
    tagline: "Rosa elétrico com filete cromado.",
    description: "Quadradas curtas em rosa aurora com um filete de cromado rosa que corta a unha em diagonal.",
    details: ["10 tips + cola e lixa", "Formato quadrado curto", "Cromado rosa aplicado à mão"],
    sizes: SIZES, storeProductId: null,
  },
  {
    id: "pk-005", slug: "liquid-pearl", number: "05", name: "Liquid Pearl",
    collection: "charms", priceCents: 11900, image: null, hoverImage: null, detailImages: [],
    stock: 3, featured: false, bestSeller: true, variant: "transparent-glass", shape: "almond",
    tint: ["#efe4dc", "#ffffff"],
    tagline: "Leite perolado com pérolas soltas.",
    description: "Base leitosa perolada com micro pérolas e um pingente metálico na unha do anelar.",
    details: ["10 tips + cola e lixa", "Formato amendoado longo", "Pérolas e charm aplicados"],
    sizes: SIZES, storeProductId: null,
  },
  {
    id: "pk-006", slug: "holo-claw", number: "06", name: "Holo Claw",
    collection: "new-drop", priceCents: 10900, image: null, hoverImage: null, detailImages: [],
    stock: 4, featured: true, bestSeller: false, variant: "holographic", shape: "stiletto",
    tint: ["#8fd8ff", "#ff8dc2"],
    tagline: "Garra holográfica que muda de cor com a mão.",
    description: "Stiletto longo com efeito aurora holográfico: verde, rosa e azul conforme o ângulo.",
    details: ["10 tips + cola e lixa", "Formato stiletto longo", "Pigmento aurora"],
    sizes: SIZES, storeProductId: null,
  },
  {
    id: "pk-007", slug: "midnight-cat-eye", number: "07", name: "Midnight Cat Eye",
    collection: "dark", priceCents: 8900, image: null, hoverImage: null, detailImages: [],
    stock: 7, featured: false, bestSeller: false, variant: "black-glass", shape: "almond",
    tint: ["#1a1030", "#b58cff"],
    tagline: "Olho de gato meia-noite com fio violeta.",
    description: "Cat eye magnético em fundo preto, com a faixa de luz puxada em violeta no centro da unha.",
    details: ["10 tips + cola e lixa", "Formato amendoado", "Gel magnético"],
    sizes: SIZES, storeProductId: null,
  },
  {
    id: "pk-008", slug: "sugar-glass", number: "08", name: "Sugar Glass",
    collection: "pink", priceCents: 7400, image: null, hoverImage: null, detailImages: [],
    stock: 10, featured: false, bestSeller: true, variant: "transparent-glass", shape: "coffin",
    tint: ["#ffd3e6", "#ff4f9a"],
    tagline: "Rosa açúcar translúcido, efeito vitral.",
    description: "Bailarina translúcida rosa com um degradê de vidro que deixa a unha natural aparecer.",
    details: ["10 tips + cola e lixa", "Formato bailarina médio", "Gel jelly translúcido"],
    sizes: SIZES, storeProductId: null,
  },
  {
    id: "pk-009", slug: "silver-whisker", number: "09", name: "Silver Whisker",
    collection: "chrome", priceCents: 9400, image: null, hoverImage: null, detailImages: [],
    stock: 5, featured: false, bestSeller: false, variant: "mirror", shape: "square",
    tint: ["#c9c9c9", "#070707"],
    tagline: "Bigode de gato em prata sobre preto.",
    description: "Quadradas pretas com traços finos em prata líquida desenhados um a um.",
    details: ["10 tips + cola e lixa", "Formato quadrado", "Linhas em prata líquida"],
    sizes: SIZES, storeProductId: null,
  },
  {
    id: "pk-010", slug: "rose-circuit", number: "10", name: "Rose Circuit",
    collection: "new-drop", priceCents: 9900, image: null, hoverImage: null, detailImages: [],
    stock: 2, featured: true, bestSeller: false, variant: "pink-chrome", shape: "coffin",
    tint: ["#2b0a17", "#ff4f9a"],
    tagline: "Circuito rosa gravado em fundo vinho.",
    description: "Bailarina vinho com linhas de circuito em rosa neon e pontos cromados nas junções.",
    details: ["10 tips + cola e lixa", "Formato bailarina longo", "Desenho à mão livre"],
    sizes: SIZES, storeProductId: null,
  },
  {
    id: "pk-011", slug: "velvet-noir", number: "11", name: "Velvet Noir",
    collection: "dark", priceCents: 8400, image: null, hoverImage: null, detailImages: [],
    stock: 8, featured: false, bestSeller: false, variant: "black-glass", shape: "square",
    tint: ["#120d0e", "#5a0f24"],
    tagline: "Veludo preto com reflexo vinho.",
    description: "Efeito veludo em preto profundo que acende em vinho quando a luz bate de lado.",
    details: ["10 tips + cola e lixa", "Formato quadrado médio", "Gel veludo"],
    sizes: SIZES, storeProductId: null,
  },
  {
    id: "pk-012", slug: "custom-set", number: "12", name: "Custom Set",
    collection: "custom", priceCents: 14900, image: null, hoverImage: null, detailImages: [],
    stock: 99, featured: false, bestSeller: false, variant: "editorial-white", shape: "almond",
    tint: ["#f5f2ef", "#ff4f9a"],
    tagline: "Seu set, desenhado a partir da sua referência.",
    description: "Você manda a referência, a gente combina formato, tamanho e acabamento e produz o set sob encomenda.",
    details: ["Briefing antes da produção", "Qualquer formato", "Prazo combinado no pedido"],
    sizes: SIZES, storeProductId: null,
  },
]

export const PRODUCT_BY_SLUG = new Map(PRODUCTS.map((p) => [p.slug, p]))
export const PRODUCT_BY_ID = new Map(PRODUCTS.map((p) => [p.id, p]))

export function productsIn(collection: string): Product[] {
  return PRODUCTS.filter((p) => p.collection === collection)
}
