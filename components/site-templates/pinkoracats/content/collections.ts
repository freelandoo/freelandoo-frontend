// As COLEÇÕES. Cada uma é um AMBIENTE DE MATERIAL: a UI continua branca,
// preta e prata, e o que muda é a luz e a placa (`effect` → material, ver
// `PLATE_MATERIAL`). A fotografia, quando existir, é só a superfície e troca
// sem mexer no efeito.

import type { PlaceholderVariant } from "./products.mock"

export type CollectionEffect = "sweep" | "glow" | "glass" | "sparks" | "holo" | "paper"

export type Collection = {
  slug: string
  name: string
  /** A linha curta do portal. */
  kicker: string
  statement: string
  effect: CollectionEffect
  variant: PlaceholderVariant
  /** Imagem do portal. `null` desenha o placeholder da coleção. */
  image: string | null
}

export const COLLECTIONS: Collection[] = [
  {
    slug: "new-drop",
    name: "New Drop",
    kicker: "Drop 001",
    statement: "As peças que acabaram de sair da bancada. Tiragem curta, sem reposição garantida.",
    effect: "holo",
    variant: "acrylic-clear",
    image: null,
  },
  {
    slug: "pink",
    name: "Pink",
    kicker: "Soft signal",
    statement: "Rosa como acento, nunca como fundo: glitter fino, leite, cereja e brilho molhado.",
    effect: "glow",
    variant: "white-studio",
    image: null,
  },
  {
    slug: "dark",
    name: "Dark",
    kicker: "Black glass",
    statement: "Preto espelhado, cat eye profundo e acabamento vidro. Para quem quer a unha como joia escura.",
    effect: "glass",
    variant: "mirror-display",
    image: null,
  },
  {
    slug: "chrome",
    name: "Chrome",
    kicker: "Liquid metal",
    statement: "Prata líquida, cromado espelho e reflexo que atravessa a peça quando a mão se move.",
    effect: "sweep",
    variant: "chrome-pedestal",
    image: null,
  },
  {
    slug: "charms",
    name: "Charms",
    kicker: "Hardware",
    statement: "Pingentes, pérolas e peças metálicas aplicadas uma a uma — a unha como suporte de joalheria.",
    effect: "sparks",
    variant: "silver-frame",
    image: null,
  },
  {
    slug: "custom",
    name: "Custom",
    kicker: "Sob encomenda",
    statement: "Você traz a referência, a gente desenha o set. Formato, tamanho e acabamento combinados antes.",
    effect: "paper",
    variant: "editorial-white",
    image: null,
  },
]

/**
 * O MATERIAL DA PLACA de cada coleção. É a única tradução de "efeito" para
 * superfície do site — a placa da home, o herói da coleção e o menu leem daqui.
 *
 *   sweep  → cromado polido (Chrome)      glow  → prata acetinada (Pink, Nude)
 *   glass  → acrílico fumê (Dark)         sparks → prata escovada (Charms)
 *   holo   → prata espelho (o drop)       paper → branco editorial (Custom)
 */
export const PLATE_MATERIAL: Record<CollectionEffect, "polished" | "satin" | "smoked" | "brushed" | "mirror" | "paper"> = {
  sweep: "polished",
  glow: "satin",
  glass: "smoked",
  sparks: "brushed",
  holo: "mirror",
  paper: "paper",
}

export const COLLECTION_BY_SLUG = new Map(COLLECTIONS.map((c) => [c.slug, c]))
