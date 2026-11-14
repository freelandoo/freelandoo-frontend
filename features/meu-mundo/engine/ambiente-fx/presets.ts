// features/meu-mundo/engine/ambiente-fx/presets.ts — um preset de ambiente por região (§12 do prompt
// visual premium). Cada região tem até DUAS camadas, desenhadas juntas numa chamada só.
//
// Números em metros e segundos. `n` = quadradinhos por perfil (o teto da camada: nunca nasce mais que
// isso). `day`/`night` = fração que nasce de dia / de noite (a transição mistura os dois). Camada
// "add" (luz: vaga-lume, brasa, brilho) soma cor e não escurece de noite; as outras (folha, poeira,
// neve, cinza) são escurecidas pela luz da cena (`light`).

import type { SkyRegionId } from "../sky/sky-registry"
import type { QualityTier } from "../quality"
import { CELL } from "./atlas"

type C3 = readonly [number, number, number]
type PerTier = Readonly<Record<QualityTier, number>>

export interface AmbientLayer {
  /** Primeira célula do atlas e quantas seguidas formam o flipbook. */
  cell: number
  frames: number
  /** Quadros por segundo do flipbook. */
  fps: number
  add: boolean
  color: C3
  /** Variação da cor por partícula (0–1). */
  colorVar: number
  /** Meio lado do quadradinho (m) e a variação (0–1). */
  size: number
  sizeVar: number
  /** Deriva (vento, queda, subida), m/s. */
  vel: C3
  /** Balanço: amplitude (m) e frequência (Hz). */
  wobble: readonly [number, number]
  /** Cintilar (0 = fixo, 1 = pisca inteiro). */
  flicker: number
  /** Giro no plano da tela (rad/s, sentido sorteado). */
  spin: number
  /** Vida (s): nasce, aparece, some e renasce em outro ponto. */
  life: number
  day: number
  night: number
  n: PerTier
}

export interface AmbientPreset {
  /** Meio lado da caixa que anda com a câmera (m). Longe disso não há partícula (distância de ativação). */
  range: PerTier
  /** Altura da faixa (m) e quanto dela fica abaixo do alvo da câmera (≈ 1,3 = começa no chão). */
  height: number
  below: number
  layers: readonly AmbientLayer[]
}

export type AmbientRegion = SkyRegionId

const T = (low: number, mid: number, high: number): PerTier => ({ low, mid, high })

/** Folhas caindo (centro e bairro). */
const LEAVES = (color: C3, day: number, night: number, n: PerTier): AmbientLayer => ({
  cell: CELL.leafA,
  frames: 3,
  fps: 2.2,
  add: false,
  color,
  colorVar: 0.35,
  size: 0.14,
  sizeVar: 0.35,
  vel: [0.7, -0.55, 0.25],
  wobble: [0.9, 0.25],
  flicker: 0,
  spin: 1.4,
  life: 9,
  day,
  night,
  n,
})

const FIREFLIES = (color: C3, day: number, night: number, n: PerTier): AmbientLayer => ({
  cell: CELL.dot,
  frames: 1,
  fps: 0,
  add: true,
  color,
  colorVar: 0.25,
  size: 0.13,
  sizeVar: 0.4,
  vel: [0.05, 0.04, 0],
  wobble: [0.9, 0.12],
  flicker: 0.85,
  spin: 0,
  life: 7,
  day,
  night,
  n,
})

export const AMBIENT_PRESETS: Readonly<Record<AmbientRegion, AmbientPreset>> = {
  // Floresta Lunar: vaga-lumes ciano-esverdeados + brilhos mágicos violeta subindo devagar
  noctis: {
    range: T(10, 12, 14),
    height: 6,
    below: 1.3,
    layers: [
      FIREFLIES([0.55, 1, 0.75], 0.45, 1, T(36, 80, 150)),
      { cell: CELL.sparkA, frames: 2, fps: 3, add: true, color: [0.78, 0.6, 1], colorVar: 0.3, size: 0.16, sizeVar: 0.5, vel: [0, 0.18, 0], wobble: [0.35, 0.2], flicker: 0.6, spin: 0.5, life: 5, day: 0.4, night: 1, n: T(18, 50, 100) },
    ],
  },
  // Cânion das Tempestades: poeira levada pelo vento + resíduos secos rolando no ar
  zephyra: {
    range: T(10, 12, 14),
    height: 5,
    below: 1.3,
    layers: [
      { cell: CELL.dust, frames: 1, fps: 0, add: false, color: [0.92, 0.72, 0.52], colorVar: 0.25, size: 0.09, sizeVar: 0.5, vel: [3.2, 0.15, 1.1], wobble: [0.35, 0.35], flicker: 0, spin: 2, life: 4.5, day: 1, night: 0.6, n: T(50, 120, 220) },
      { cell: CELL.leafA, frames: 3, fps: 4, add: false, color: [0.66, 0.48, 0.32], colorVar: 0.3, size: 0.1, sizeVar: 0.4, vel: [5, 0.35, 1.6], wobble: [0.5, 0.4], flicker: 0, spin: 4, life: 3.2, day: 1, night: 0.5, n: T(0, 24, 50) },
    ],
  },
  // Mar de Gelo: neve caindo + lascas geladas cintilando
  maru: {
    range: T(10, 12, 14),
    height: 8,
    below: 1.3,
    layers: [
      { cell: CELL.flake, frames: 1, fps: 0, add: false, color: [0.94, 0.97, 1], colorVar: 0.08, size: 0.1, sizeVar: 0.45, vel: [0.45, -1.05, 0.2], wobble: [0.45, 0.3], flicker: 0, spin: 1.2, life: 10, day: 1, night: 1, n: T(70, 170, 320) },
      { cell: CELL.shard, frames: 1, fps: 0, add: true, color: [0.5, 0.95, 1], colorVar: 0.2, size: 0.09, sizeVar: 0.4, vel: [0.1, -0.15, 0], wobble: [0.4, 0.2], flicker: 0.9, spin: 0.6, life: 5, day: 0.6, night: 1, n: T(0, 30, 60) },
    ],
  },
  // Fábrica de Bronze: vapor/fumaça leve subindo + faíscas âmbar
  aeryn: {
    range: T(10, 12, 14),
    height: 7,
    below: 1.3,
    layers: [
      { cell: CELL.smoke, frames: 1, fps: 0, add: false, color: [0.86, 0.8, 0.72], colorVar: 0.15, size: 1.1, sizeVar: 0.4, vel: [0.35, 0.45, 0.15], wobble: [0.4, 0.1], flicker: 0, spin: 0.25, life: 7, day: 0.55, night: 0.45, n: T(10, 22, 40) },
      { cell: CELL.ember, frames: 1, fps: 0, add: true, color: [1, 0.68, 0.28], colorVar: 0.25, size: 0.07, sizeVar: 0.4, vel: [0.25, 0.9, 0.1], wobble: [0.25, 0.8], flicker: 0.7, spin: 0, life: 2.2, day: 0.7, night: 1, n: T(20, 50, 100) },
    ],
  },
  // Vulcão: cinza caindo devagar + brasas subindo
  kragor: {
    range: T(10, 12, 14),
    height: 7,
    below: 1.3,
    layers: [
      { cell: CELL.ash, frames: 1, fps: 0, add: false, color: [0.55, 0.52, 0.5], colorVar: 0.3, size: 0.09, sizeVar: 0.5, vel: [0.6, -0.4, 0.2], wobble: [0.5, 0.25], flicker: 0, spin: 1.5, life: 9, day: 1, night: 1, n: T(36, 100, 190) },
      { cell: CELL.ember, frames: 1, fps: 0, add: true, color: [1, 0.42, 0.12], colorVar: 0.3, size: 0.08, sizeVar: 0.5, vel: [0.3, 1.3, 0.1], wobble: [0.5, 0.5], flicker: 0.6, spin: 0, life: 3.4, day: 0.8, night: 1, n: T(24, 70, 140) },
    ],
  },
  // Cidade Orbital: pontos de luz flutuando + peças tecnológicas (quadrado/losango) subindo
  iris: {
    range: T(10, 12, 14),
    height: 6,
    below: 1.3,
    layers: [
      { ...FIREFLIES([0.5, 0.92, 1], 0.7, 1, T(36, 90, 170)), wobble: [0.25, 0.08], flicker: 0.5, size: 0.1 },
      { cell: CELL.techSq, frames: 2, fps: 1.5, add: true, color: [0.85, 0.6, 1], colorVar: 0.35, size: 0.15, sizeVar: 0.4, vel: [0, 0.3, 0], wobble: [0.15, 0.15], flicker: 0.45, spin: 0, life: 5, day: 0.6, night: 1, n: T(12, 34, 70) },
    ],
  },
  // Centro: folhas de dia (poucas de noite) + poeira dourada no sol / vaga-lumes nas praças à noite
  centro: {
    range: T(10, 12, 14),
    height: 6,
    below: 1.3,
    layers: [LEAVES([0.55, 0.62, 0.28], 1, 0.3, T(24, 60, 110)), FIREFLIES([1, 0.86, 0.5], 0.2, 0.8, T(12, 34, 70))],
  },
  // Bairro: folhas ocasionais de dia, vaga-lumes quentes à noite
  bairro: {
    range: T(10, 12, 14),
    height: 6,
    below: 1.3,
    layers: [LEAVES([0.62, 0.6, 0.26], 1, 0.25, T(24, 60, 110)), FIREFLIES([1, 0.9, 0.45], 0, 1, T(24, 60, 120))],
  },
}

/** Região do céu a partir do id do Domínio no back (quando a cena não tem céu próprio). */
export const DOMAIN_REGION: Readonly<Record<string, AmbientRegion>> = {
  floresta: "noctis",
  canion: "zephyra",
  gelo: "maru",
  fabrica: "aeryn",
  vulcao: "kragor",
  orbital: "iris",
}
