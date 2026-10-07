/**
 * Hologramas colecionáveis da aba RA da Casa Views.
 *
 * A CHAVE e o PREÇO valem no backend (`CasaHologramService.CATALOG`); aqui
 * mora o que só o front usa: modelo 3D, alvo de rastreamento (MindAR, gerado
 * por `scripts/build-casa-ra-target.mjs`) e a arte do card. Personagem novo =
 * uma linha lá e uma aqui, com a mesma chave.
 */
export interface Hologram {
  key: string
  number: string
  name: string
  /** linha curta do card e do pedestal */
  title: string
  rarity: string
  /** GLB normalizável (qualquer escala; o carregador põe altura 1 e pés em y=0) */
  model: string
  /** giro em Y que deixa o modelo de frente para a câmera */
  faceFront: number
  /** arte impressa: é ela que a câmera reconhece */
  art: string
  target: string
  /** pés e altura da figura NA ARTE, em frações da altura do alvo (de baixo para cima) */
  artFeet: number
  artHeight: number
}

const BASE = "/casaviews/ra"

export const HOLOGRAMS: Hologram[] = [
  {
    key: "muay-thai",
    number: "001",
    name: "O Lutador do Coliseu",
    title: "Muay Thai · Kick Boxing",
    rarity: "Edição de estreia",
    model: `${BASE}/muay-thai.glb`,
    faceFront: 0,
    art: `${BASE}/muay-thai.webp`,
    target: `${BASE}/muay-thai.mind`,
    artFeet: 0,
    artHeight: 0.88,
  },
]

/** Posições da vitrine (as sem personagem aparecem trancadas: "próximo drop"). */
export const VAULT_SLOTS = 6

export const hologramByKey = (key: string | null | undefined) => HOLOGRAMS.find((h) => h.key === key) ?? null

/** Fundo do pedestal (1672×941). Medidas do topo do pedestal e da altura da figura na imagem. */
export const COLISEU = {
  src: `${BASE}/coliseu.webp`,
  small: `${BASE}/coliseu-1024.webp`,
  w: 1672,
  h: 941,
  feetX: 836,
  feetY: 548,
  figure: 380,
}

export const MINDAR_LIB = `${BASE}/mindar/mindar-image.prod.js`

/** Cor do holograma (todos são rosa). */
export const HOLO_COLOR = "#ff2b91"
export const HOLO_ACCENT = "#ffd1e8"
