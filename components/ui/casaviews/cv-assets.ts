/**
 * Mapa central dos assets da identidade Casa Views usados na /account.
 * Os PNGs originais (pollens/assets profile) foram comprimidos pra webp em
 * public/casaviews/profile via sharp. Centralizar caminho + dimensões aqui
 * deixa next/image feliz (precisa de width/height) e o resto do código limpo.
 */
export const CV_ASSET_BASE = "/casaviews/profile"

export interface CvAsset {
  src: string
  width: number
  height: number
  alt: string
}

export const CV_ASSETS = {
  paperGrain: { src: `${CV_ASSET_BASE}/paper-grain.webp`, width: 760, height: 760, alt: "" },
  darkGrain: { src: `${CV_ASSET_BASE}/dark-grain.webp`, width: 1000, height: 1000, alt: "" },
  tornEdge01: { src: `${CV_ASSET_BASE}/torn-edge-01.webp`, width: 1600, height: 400, alt: "" },
  tornEdge02: { src: `${CV_ASSET_BASE}/torn-edge-02.webp`, width: 1600, height: 400, alt: "" },
  ticket: { src: `${CV_ASSET_BASE}/casa-views-ticket.webp`, width: 440, height: 147, alt: "Casa Views" },
  crown: { src: `${CV_ASSET_BASE}/crown.webp`, width: 240, height: 240, alt: "" },
  arrow: { src: `${CV_ASSET_BASE}/arrow-hand.webp`, width: 260, height: 87, alt: "" },
  underline: { src: `${CV_ASSET_BASE}/underline-gold.webp`, width: 460, height: 153, alt: "" },
} satisfies Record<string, CvAsset>

export type CvDoodle = keyof typeof CV_ASSETS
