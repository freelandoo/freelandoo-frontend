// ⚠️⚠️ DADOS DE PRÉVIA — só aparecem enquanto a Loja da Taiz não tiver NENHUM
// produto ativo (ver `content/catalog.ts`, campo `live`).
//
// Nomes são editoriais e provisórios, preços e estoques são PLACEHOLDER. O
// arquivo leva `.mock` no nome para ninguém confundir com oferta aprovada.
//
// ── A REGRA QUE FAZ AS FOTOS ENTRAREM DEPOIS SEM RECONSTRUIR NADA ─────────
//
// A IMAGEM É CONTEÚDO. A ANIMAÇÃO PERTENCE AO COMPONENTE.
//
// Para pôr a foto definitiva basta preencher `image` (e, se quiser,
// `hoverImage`, `detailImages` e `nails`). Caixa acrílica, tampa, reflexo,
// luz, tilt, takeover, quick view e carrinho são de `AcrylicProductCase` e
// `ProductMedia` — a foto nova herda tudo sozinha.
//
// Como a foto é EXIBIDA é decidido por `media.container` (ver
// `content/display.ts`). Sem dizer nada: sem foto = caixa digital com o
// placeholder; com foto = `hybrid` (a foto já costuma mostrar a caixa).
//
// Arquivo local vai em `public/sites/pinkoracats/…` e é referenciado por
// caminho absoluto (`/sites/pinkoracats/cherry-static.webp`) — funciona nas
// três origens do site sem configuração nenhuma.

/**
 * O ESTÚDIO do placeholder — o fundo dentro da caixa quando ainda não há
 * foto (e atrás de um PNG transparente quando há).
 */
export type PlaceholderVariant =
  | "white-studio"
  | "acrylic-clear"
  | "silver-frame"
  | "chrome-pedestal"
  | "editorial-white"
  | "mirror-display"

export type NailShape = "almond" | "coffin" | "stiletto" | "square" | "duck" | "claw"

/**
 * COMO A FOTO É MOSTRADA:
 *
 *   digital-case  o site desenha a caixa acrílica inteira (tampa que abre)
 *                 ao redor do produto. É o padrão SEM foto.
 *   hybrid        a foto JÁ mostra a caixa: o site põe só luz, reflexo,
 *                 moldura e profundidade — nunca uma segunda caixa por cima.
 *                 É o padrão COM foto.
 *   transparent   PNG sem fundo: a peça flutua dentro da caixa digital.
 *   photo         fotografia comum, composição editorial com moldura prata.
 *   editorial     foto com mão, ambiente ou fundo: composição de revista.
 *   macro         detalhe (charms, pedras, acabamento): recorte aproximado.
 */
export type MediaContainer = "digital-case" | "hybrid" | "transparent" | "photo" | "editorial" | "macro"

export type MediaConfig = {
  container?: MediaContainer
  /** `cover` recorta; `contain` preserva a peça inteira (ideal para PNG sem fundo). */
  fit?: "cover" | "contain"
  position?: string
  scale?: number
  rotation?: number
  /** Proporção da FOTO ("4/5", "1/1", "3/4"). Sem ela, vale a da moldura. */
  aspectRatio?: string
}

export type Product = {
  id: string
  /** O SKU real, quando existir. `number` abaixo é só o rótulo de vitrine. */
  sku?: string | null
  slug: string
  /** "01", "02"… — vira o rótulo de vitrine "PC / 001". Não substitui SKU. */
  number: string
  name: string
  collection: string
  priceCents: number
  /** Preço "de" — só aparece se for maior que o preço atual. */
  compareAtPriceCents?: number | null
  image: string | null
  hoverImage: string | null
  /** A galeria: fotos frontais, abertas, macro, editorial — nesta ordem. */
  detailImages: string[]
  /**
   * As 10 unhas em arquivos separados (PNG sem fundo, da maior para a
   * menor). Futuro: com elas o "explorar o set" tira as unhas da caixa uma a
   * uma. Sem elas, o site funciona com UMA foto.
   */
  nails?: string[]
  stock: number
  featured: boolean
  bestSeller: boolean
  newDrop?: boolean
  variant: PlaceholderVariant
  shape: NailShape
  /**
   * O formato DECLARADO pela dona (linha "Formato …" da descrição) — é ele
   * que decide a categoria. `shape` acima é só o desenho do placeholder.
   */
  form?: import("./shapes").ShapeSlug | null
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

/**
 * Os ACABAMENTOS dos placeholders: nude, cromado, preto, rosa claro e
 * transparente. O produto é quem dá a cor ao site — estes cinco são neutros
 * de propósito, para a prévia não parecer uma loja rosa.
 */
export const FINISHES: Record<"nude" | "chrome" | "black" | "pink" | "clear", [string, string]> = {
  nude: ["#e6c9b6", "#f7e8de"],
  chrome: ["#8e9096", "#f4f5f7"],
  black: ["#0f0f11", "#62646a"],
  pink: ["#efbfcf", "#fbe6ed"],
  clear: ["#dfe3e8", "#ffffff"],
}

const SIZES = ["P", "M", "G"]

export const PRODUCTS: Product[] = [
  {
    id: "pk-001", slug: "cherry-static", number: "01", name: "Cherry Static",
    collection: "new-drop", priceCents: 8900, image: null, hoverImage: null, detailImages: [],
    stock: 6, featured: true, bestSeller: true, newDrop: true, variant: "white-studio", shape: "almond",
    tint: ["#6b1428", "#d9476a"],
    tagline: "Cereja escura com estática rosa na ponta.",
    description: "Set de 10 tips amendoadas com base cereja profunda e uma interferência rosa que só aparece na luz.",
    details: ["10 tips + cola e lixa", "Formato amendoado médio", "Acabamento gel brilho molhado"],
    sizes: SIZES, storeProductId: null,
  },
  {
    id: "pk-002", slug: "chrome-kitten", number: "02", name: "Chrome Kitten",
    collection: "chrome", priceCents: 9900, image: null, hoverImage: null, detailImages: [],
    stock: 4, featured: true, bestSeller: true, variant: "chrome-pedestal", shape: "stiletto",
    tint: FINISHES.chrome,
    tagline: "Prata espelho com orelhinha em relevo.",
    description: "Stiletto em cromado espelho com um detalhe felino em relevo 3D na unha de destaque.",
    details: ["10 tips + cola e lixa", "Formato stiletto", "Pó cromado + relevo em gel"],
    sizes: SIZES, storeProductId: null,
  },
  {
    id: "pk-003", slug: "black-mirror-tip", number: "03", name: "Black Mirror Tip",
    collection: "dark", priceCents: 7900, image: null, hoverImage: null, detailImages: [],
    stock: 9, featured: false, bestSeller: true, variant: "mirror-display", shape: "coffin",
    tint: FINISHES.black,
    tagline: "Preto vidro com francesinha espelhada.",
    description: "Bailarina preto vidro com a ponta em cromado prata — a francesinha virada do avesso.",
    details: ["10 tips + cola e lixa", "Formato bailarina", "Top coat vitrificado"],
    sizes: SIZES, storeProductId: null,
  },
  {
    id: "pk-004", slug: "pink-voltage", number: "04", name: "Pink Voltage",
    collection: "pink", priceCents: 8400, image: null, hoverImage: null, detailImages: [],
    stock: 5, featured: true, bestSeller: false, variant: "silver-frame", shape: "square",
    tint: FINISHES.pink,
    tagline: "Rosa leite com filete cromado.",
    description: "Quadradas curtas em rosa leite com um filete de cromado que corta a unha em diagonal.",
    details: ["10 tips + cola e lixa", "Formato quadrado curto", "Cromado aplicado à mão"],
    sizes: SIZES, storeProductId: null,
  },
  {
    id: "pk-005", slug: "liquid-pearl", number: "05", name: "Liquid Pearl",
    collection: "charms", priceCents: 11900, image: null, hoverImage: null, detailImages: [],
    stock: 3, featured: false, bestSeller: true, variant: "acrylic-clear", shape: "almond",
    tint: FINISHES.nude,
    tagline: "Leite perolado com pérolas soltas.",
    description: "Base leitosa perolada com micro pérolas e um pingente metálico na unha do anelar.",
    details: ["10 tips + cola e lixa", "Formato amendoado longo", "Pérolas e charm aplicados"],
    sizes: SIZES, storeProductId: null,
  },
  {
    id: "pk-006", slug: "holo-claw", number: "06", name: "Holo Claw",
    collection: "new-drop", priceCents: 10900, image: null, hoverImage: null, detailImages: [],
    stock: 4, featured: true, bestSeller: false, newDrop: true, variant: "acrylic-clear", shape: "stiletto",
    tint: ["#c9d6e2", "#f3e6f6"],
    tagline: "Garra holográfica que muda de cor com a mão.",
    description: "Stiletto longo com efeito aurora holográfico: verde, rosa e azul conforme o ângulo.",
    details: ["10 tips + cola e lixa", "Formato stiletto longo", "Pigmento aurora"],
    sizes: SIZES, storeProductId: null,
  },
  {
    id: "pk-007", slug: "midnight-cat-eye", number: "07", name: "Midnight Cat Eye",
    collection: "dark", priceCents: 8900, image: null, hoverImage: null, detailImages: [],
    stock: 7, featured: false, bestSeller: false, variant: "mirror-display", shape: "almond",
    tint: ["#141218", "#7d6a9c"],
    tagline: "Olho de gato meia-noite com fio violeta.",
    description: "Cat eye magnético em fundo preto, com a faixa de luz puxada em violeta no centro da unha.",
    details: ["10 tips + cola e lixa", "Formato amendoado", "Gel magnético"],
    sizes: SIZES, storeProductId: null,
  },
  {
    id: "pk-008", slug: "sugar-glass", number: "08", name: "Sugar Glass",
    collection: "pink", priceCents: 7400, image: null, hoverImage: null, detailImages: [],
    stock: 10, featured: false, bestSeller: true, variant: "acrylic-clear", shape: "coffin",
    tint: FINISHES.clear,
    tagline: "Translúcido açúcar, efeito vitral.",
    description: "Bailarina translúcida com um degradê de vidro que deixa a unha natural aparecer.",
    details: ["10 tips + cola e lixa", "Formato bailarina médio", "Gel jelly translúcido"],
    sizes: SIZES, storeProductId: null,
  },
  {
    id: "pk-009", slug: "silver-whisker", number: "09", name: "Silver Whisker",
    collection: "chrome", priceCents: 9400, image: null, hoverImage: null, detailImages: [],
    stock: 5, featured: false, bestSeller: false, variant: "silver-frame", shape: "square",
    tint: ["#16161a", "#c9cbcf"],
    tagline: "Bigode de gato em prata sobre preto.",
    description: "Quadradas pretas com traços finos em prata líquida desenhados um a um.",
    details: ["10 tips + cola e lixa", "Formato quadrado", "Linhas em prata líquida"],
    sizes: SIZES, storeProductId: null,
  },
  {
    id: "pk-010", slug: "rose-circuit", number: "10", name: "Rose Circuit",
    collection: "new-drop", priceCents: 9900, image: null, hoverImage: null, detailImages: [],
    stock: 2, featured: true, bestSeller: false, newDrop: true, variant: "chrome-pedestal", shape: "coffin",
    tint: ["#3a1220", "#e07aa0"],
    tagline: "Circuito rosa gravado em fundo vinho.",
    description: "Bailarina vinho com linhas de circuito em rosa e pontos cromados nas junções.",
    details: ["10 tips + cola e lixa", "Formato bailarina longo", "Desenho à mão livre"],
    sizes: SIZES, storeProductId: null,
  },
  {
    id: "pk-011", slug: "velvet-noir", number: "11", name: "Velvet Noir",
    collection: "dark", priceCents: 8400, image: null, hoverImage: null, detailImages: [],
    stock: 8, featured: false, bestSeller: false, variant: "white-studio", shape: "square",
    tint: ["#120d0e", "#4c1a24"],
    tagline: "Veludo preto com reflexo vinho.",
    description: "Efeito veludo em preto profundo que acende em vinho quando a luz bate de lado.",
    details: ["10 tips + cola e lixa", "Formato quadrado médio", "Gel veludo"],
    sizes: SIZES, storeProductId: null,
  },
  {
    id: "pk-012", slug: "custom-set", number: "12", name: "Custom Set",
    collection: "custom", priceCents: 14900, image: null, hoverImage: null, detailImages: [],
    stock: 99, featured: false, bestSeller: false, variant: "editorial-white", shape: "almond",
    tint: FINISHES.nude,
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
