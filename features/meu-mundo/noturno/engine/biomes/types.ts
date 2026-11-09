// features/meu-mundo/noturno/engine/biomes/types.ts — ROLÊ NOTURNO 2.0: o que cada fase entrega à cena.

import type { Vector3 } from "@babylonjs/core/Maths/math.vector"
import type { TrackLook } from "../track-mesh"
import type { RunPhase } from "../../sim/track"

export interface BiomeLight {
  /** Cor do fundo e da neblina. */
  clear: string
  fog: string
  fogStart: number
  fogEnd: number
  hemi: { dir: [number, number, number]; sky: string; ground: string; k: number }
  sun: { dir: [number, number, number]; color: string; k: number }
  /** Pós-processamento (PC): limiar e peso do bloom, contraste. */
  bloom: { threshold: number; weight: number }
  contrast: number
  exposure: number
}

export interface Biome {
  phase: Exclude<RunPhase, "classica">
  light: BiomeLight
  /** Pasta dos obstáculos temáticos (rn2-<fase>-<tipo>.glb, nas medidas da regra). */
  obstacleDir: string
  /** Carregou o que precisa para montar a pista. */
  ready: Promise<TrackLook>
  /** Animações do cenário (nuvens que correm, cachoeiras, moinhos). */
  update(dt: number, cam: Vector3, s: number, time: number): void
  dispose(): void
}
