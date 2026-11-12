// features/meu-mundo/engine/audio/footsteps.ts — passos de quem joga (áudio S1, 2026-11-11).
//
// Um laço por piso e por passo (andar / correr), trocado com cruzamento curto quando muda o
// MoveState (motion.ts: 1 andando, 2 correndo) ou o piso; a velocidade do arquivo acompanha a
// velocidade do corpo (mesma referência da animação, ANIM_NATURAL_SPEED). Parado, sentado,
// deitado, de bicicleta/skate/patins: sem passos. Sem arquivo aprovado: silêncio.
// Só os passos de QUEM JOGA (com ~20 pessoas na sala, passos de todos virariam ruído).

import type { FloorMat, InteriorDef } from "../../types"
import { ANIM_NATURAL_SPEED, type MoveState } from "../motion"
import { loadSample, playSample, type Voice } from "./bank"
import { steps, type Floor } from "./cues"

export interface Footsteps {
  update(move: MoveState, speed: number, floor: Floor): void
  dispose(): void
}

// 0.5 → 0.22 (2026-11-12): o Alex achou os passos altos demais
export function createFootsteps(gain = 0.22): Footsteps {
  let voice: Voice | null = null
  let key = ""
  return {
    update(move, speed, floor) {
      const run = move === 2
      const want = move === 1 || move === 2 ? steps(floor, run) : ""
      if (want !== key) {
        voice?.stop(0.12)
        voice = null
        key = want
        if (want) {
          void loadSample(want)
          void loadSample(steps(floor, !run))
        }
      }
      if (!want) return
      if (!voice || voice.ended) voice = playSample(want, { loop: true, fadeIn: 0.08, gain, vary: 0 })
      const ref = run ? ANIM_NATURAL_SPEED.run : ANIM_NATURAL_SPEED.walk
      voice?.setRate(Math.max(0.8, Math.min(1.3, speed / ref)))
    },
    dispose() {
      voice?.stop(0.08)
      voice = null
      key = ""
    },
  }
}

/** Piso do cômodo onde (x, z) está, no andar `floor` (mat das salas; quintal = grama). */
export function interiorFloor(def: InteriorDef, floor: number, x: number, z: number): Floor {
  const rooms = def.floors[floor]?.rooms ?? []
  const r = rooms.find((q) => x >= Math.min(q.x0, q.x1) && x <= Math.max(q.x0, q.x1) && z >= Math.min(q.z0, q.z1) && z <= Math.max(q.z0, q.z1))
  if (!r) return "wood"
  if (r.outdoor) return "grama"
  return r.mat as FloorMat
}
