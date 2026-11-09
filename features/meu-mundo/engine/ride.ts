// features/meu-mundo/engine/ride.ts
//
// Quem está MONTADO numa bicicleta, num skate ou nos patins (mm3d-14), na rua
// (game.ts) e dentro de casa (house-game.ts, mm3d-15) — peça única: o boneco
// vai junto com o veículo desenhado, com a pose da modalidade; a bike recebe
// a pedivela da pedalada e os patins vão para baixo dos pés.

import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode"
import { RIDE_KINDS, type MoveState, type RideKind } from "./motion"
import { SKATES_SOLE, type CarFleet } from "./cars"
import type { Character } from "./player"

/**
 * `y` = altura do chão onde o veículo está (andar da casa; 0 na rua).
 * `pitch` = giro em torno do eixo lateral (mortal do Rolê Noturno, mm3d-40d);
 * sem ele a inclinação do boneco não é tocada.
 * `frame` (Rolê Noturno 2.0): o nó em que boneco e veículo estão pendurados —
 * x/z/y são locais a ele, e os pés dos patins voltam ao mundo por ele.
 */
export function placeRider(
  fleet: CarFleet,
  char: Character,
  key: string,
  kind: RideKind,
  x: number,
  z: number,
  facing: number,
  sp: number,
  dt: number,
  y = 0,
  pitch?: number,
  frame?: TransformNode | null,
) {
  char.place(x, z, facing, y + (kind === "skates" ? SKATES_SOLE : 0))
  if (pitch !== undefined) char.holder.rotation.x = pitch
  const pc = Math.cos(pitch ?? 0)
  const ps = Math.sin(pitch ?? 0)
  char.animate(dt, RIDE_KINDS[kind].move as MoveState, sp)
  if (kind === "bike") fleet.setCrank(key, char.crank)
  else if (kind === "skates") {
    // Tornozelo → chão sob o meio do tênis (um pouco à frente do tornozelo).
    // A pose vem no referencial do personagem e vai para a posição e o rumo
    // de AGORA (mm3d-23: com a posição de mundo do quadro anterior, a bota
    // ficava para trás/de lado nas curvas).
    const c = Math.cos(facing)
    const s = Math.sin(facing)
    const base = y + SKATES_SOLE
    const world = frame ? frame.computeWorldMatrix(true) : null
    fleet.setFeet(
      key,
      char.feetLocal().map((p) => {
        const out = footAt(p, c, s, x, y, z, base, ps, pc, char.ankleRest)
        return out && world ? Vector3.TransformCoordinates(out, world) : out
      }),
    )
  }
}

/** Chão sob o meio do tênis, na posição e no rumo de agora (locais a `frame`, se houver). */
function footAt(p: Vector3 | null, c: number, s: number, x: number, y: number, z: number, base: number, ps: number, pc: number, ankleRest: number) {
  if (!p) return null
  const lz0 = p.z + 0.05
  if (!ps) return new Vector3(x + p.x * c + lz0 * s, Math.max(y, base + p.y - ankleRest - SKATES_SOLE), z - p.x * s + lz0 * c)
  // no mortal: o pé gira com o boneco (eixo lateral, depois o rumo)
  const ly0 = p.y - ankleRest - SKATES_SOLE
  const ly = ly0 * pc - lz0 * ps
  const lz = ly0 * ps + lz0 * pc
  return new Vector3(x + p.x * c + lz * s, base + ly, z - p.x * s + lz * c)
}
