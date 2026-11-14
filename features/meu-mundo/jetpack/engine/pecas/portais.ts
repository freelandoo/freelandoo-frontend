// features/meu-mundo/jetpack/engine/pecas/portais.ts — o aro dos anéis de cada fase, em código.
//
// Contrato do obstáculo "rim" (obstacles-view): plano XY, frente −z, furo de raio 1 LIVRE, escala
// (r, r, zScale) pela regra e giro em z. Os dois testes da vitrine (portal-artico, portal-gelo)
// cumprem o contrato; a fase escolhe a forma e a paleta. Fases sem anel na regra também ganham o
// aro (custa nada se não aparece).

import type { Scene } from "@babylonjs/core/scene"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import type { PhaseId } from "../../sim/phases"
import { pecaMesh, type Acabamento } from "./peca"
import { portalArtico } from "./portal-artico"
import { portalGelo } from "./portal-gelo"
import { PAL_CANION, PAL_FLORESTA, PAL_METAL, PAL_ORBITAL } from "./portal-pal"

const METAL: Acabamento = { weather: { grime: 1.1, rustAmt: 0.9 }, spec: [0.55, 0.62, 0.78], power: 40, self: [0.035, 0.045, 0.07] }
const BRONZE: Acabamento = { weather: { grime: 1.2, rustAmt: 0.6, rust: [0.18, 0.24, 0.16], bare: [0.95, 0.75, 0.45] }, spec: [0.7, 0.55, 0.35], power: 32, self: [0.05, 0.03, 0.02] }
const MADEIRA: Acabamento = { weather: { grime: 1.1, rustAmt: 0.5, rust: [0.12, 0.3, 0.16], bare: [0.62, 0.5, 0.34] }, spec: [0.08, 0.1, 0.08], power: 10, self: [0.03, 0.04, 0.035] }

/** O aro da fase (ou null: a fase usa o aro desenhado de sempre). Espessura do teste: ~0,7 m de fundo no raio 1. */
export function aroDaFase(scene: Scene, id: PhaseId): Mesh | null {
  switch (id) {
    case "canion":
      return pecaMesh(scene, "jt-code-aro-canion", portalGelo(PAL_CANION), BRONZE, 2.5)
    case "floresta":
      return pecaMesh(scene, "jt-code-aro-floresta", portalGelo(PAL_FLORESTA), MADEIRA, 2.5)
    case "orbital":
    case "vacuo":
      return pecaMesh(scene, "jt-code-aro-orbital", portalArtico(PAL_ORBITAL), METAL, 2.5)
    case "artico":
    case "forja":
    case "industrial":
      return pecaMesh(scene, "jt-code-aro-artico", portalArtico(PAL_METAL), METAL, 2.5)
    default:
      return null
  }
}
