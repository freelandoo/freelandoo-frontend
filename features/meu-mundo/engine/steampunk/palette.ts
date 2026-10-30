// features/meu-mundo/engine/steampunk/palette.ts
//
// Paleta do bairro steampunk (mm3d-51). Ferro grafite, aço, latão, bronze,
// madeira, alvenaria bege, pedra cinza quente, terra e o âmbar das luzes —
// mais as variações de desgaste e contraste. Valores crus (0–1), como o resto
// do mundo: a cor vai no vértice e a textura de detalhe multiplica por cima.
//
// O pipeline das casas 02–09 (MEU MUNDO 3D/pipeline/casas/build_styled.py,
// modo steampunk) usa OS MESMOS números: mexeu aqui, mexe lá.

import type { RGB } from "../geometry"

const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255]

export const SP = {
  // Metais
  iron: hex("#24272B"),
  ironWarm: hex("#2E2A27"),
  ironHi: hex("#3A3E44"),
  steel: hex("#62676C"),
  steelLight: hex("#868B8F"),
  brass: hex("#C69A37"),
  brassDark: hex("#9A7428"),
  bronze: hex("#98642E"),
  copper: hex("#B0683D"),
  copperDark: hex("#7E4A2C"),
  // Madeira e alvenaria
  wood: hex("#64452F"),
  woodLight: hex("#86603F"),
  woodDark: hex("#47311F"),
  masonry: hex("#C9B69A"),
  masonryLight: hex("#D9C9AE"),
  masonryDark: hex("#A8957A"),
  brick: hex("#8E4F37"),
  brickDark: hex("#6F3C2A"),
  stone: hex("#8D8880"),
  stoneLight: hex("#ABA59B"),
  stoneDark: hex("#6A665F"),
  slate: hex("#3B3D44"),
  slateWarm: hex("#4A4440"),
  earth: hex("#80654B"),
  // Natureza (verdes dessaturados, oliva e cinza)
  leafOlive: hex("#5E6B37"),
  leafSage: hex("#6F7C55"),
  leafDeep: hex("#45522E"),
  leafRust: hex("#8A6A3A"),
  leafDry: hex("#7A6F4E"),
  trunk: hex("#4F3A2A"),
  hedge: hex("#4B5A33"),
  // Luz
  amber: hex("#F4B84A"),
  amberDeep: hex("#E39A32"),
  lampGlass: hex("#FFD27A"),
  windowGlow: hex("#E9A84C"),
  glass: hex("#2F3A3F"),
  // Placas e marcas
  board: hex("#E9DCC0"),
  mineBoard: hex("#F2B705"),
  roadLine: hex("#D8C79A"),
  white: [1, 1, 1] as RGB,
} satisfies Record<string, RGB>

/** Mistura duas cores (t = 0 → a, 1 → b). */
export function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

/** Escurece/clareia (k < 1 escurece). */
export function shade(c: RGB, k: number): RGB {
  return [Math.min(1, c[0] * k), Math.min(1, c[1] * k), Math.min(1, c[2] * k)]
}

/** Gerador determinístico (mulberry32): a mesma semente desenha o mesmo bairro em todo aparelho. */
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
