// features/meu-mundo/noturno/engine/biomes/index.ts — ROLÊ NOTURNO 2.0: qual cenário cada fase monta.
//
// Fase nova = um arquivo aqui (cenário, pista, luz) + as peças no
// build_rn2.py (obstáculos nas medidas da regra, nervura do loop, portal) +
// as regras de traçado em sim/track.ts (TRACK_RULES) + a arte do menu
// (phase-art.ts). A regra do jogo (sim/run.ts) é a mesma em todas.

import type { Scene } from "@babylonjs/core/scene"
import type { QualityTier } from "../../../engine/quality"
import type { RunPhase } from "../../sim/track"
import { buildCanyon } from "./canion"
import { buildForest } from "./floresta"
import { buildOrbital } from "./orbital"
import { buildForge } from "./forja"
import { buildFactory } from "./fabrica"
import type { Biome } from "./types"

export type { Biome } from "./types"

type Builder = (scene: Scene, tier: QualityTier, isAlive: () => boolean) => Biome

const BUILDERS: Record<Exclude<RunPhase, "classica">, Builder> = {
  floresta: buildForest,
  canion: buildCanyon,
  orbital: buildOrbital,
  forja: buildForge,
  fabrica: buildFactory,
}

/** O cenário da fase (null na Clássica: a rua de sempre). */
export function buildBiome(scene: Scene, phase: RunPhase, tier: QualityTier, isAlive: () => boolean): Biome | null {
  if (phase === "classica") return null
  return BUILDERS[phase](scene, tier, isAlive)
}
