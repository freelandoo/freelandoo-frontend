// features/meu-mundo/engine/ride.ts
//
// Quem está MONTADO numa bicicleta, num skate ou nos patins (mm3d-14), na rua
// (game.ts) e dentro de casa (house-game.ts, mm3d-15) — peça única: o boneco
// vai junto com o veículo desenhado, com a pose da modalidade; a bike recebe
// a pedivela da pedalada e os patins vão para baixo dos pés.

import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import { RIDE_KINDS, type MoveState, type RideKind } from "./motion"
import { SKATES_SOLE, type CarFleet } from "./cars"
import type { Character } from "./player"

/** `y` = altura do chão onde o veículo está (andar da casa; 0 na rua). */
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
) {
  char.place(x, z, facing, y + (kind === "skates" ? SKATES_SOLE : 0))
  char.animate(dt, RIDE_KINDS[kind].move as MoveState, sp)
  if (kind === "bike") fleet.setCrank(key, char.crank)
  else if (kind === "skates") {
    // Tornozelo → chão sob o meio do tênis (um pouco à frente do tornozelo).
    const fx = Math.sin(facing) * 0.05
    const fz = Math.cos(facing) * 0.05
    const drop = char.ankleRest + SKATES_SOLE
    fleet.setFeet(
      key,
      char.feetWorld().map((p) => (p ? new Vector3(p.x + fx, Math.max(y, p.y - drop), p.z + fz) : null)),
    )
  }
}
