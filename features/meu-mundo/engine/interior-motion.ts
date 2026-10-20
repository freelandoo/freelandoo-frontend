// features/meu-mundo/engine/interior-motion.ts
//
// A REGRA de deslocamento dentro das casas (mm3d-09): espelho exato de
// freelandoo-backend/src/utils/meuMundoInteriorMotion.js. É a regra do bairro
// (motion.ts) mais o ANDAR e as ESCADAS. A sala da casa valida e aplica o
// movimento com ela; o cliente roda a MESMA conta para responder na hora.
// Mexeu num lado, mexe no outro.

import { resolveCircle, type Box2 } from "./collision"
import { MOTION, type Intent, type MoveState } from "./motion"
import type { InteriorDef, InteriorStair } from "../types"

const STAIR_MARGIN = MOTION.RADIUS + 0.02

export interface InteriorBody {
  x: number
  z: number
  vx: number
  vz: number
  facing: number
  floor: number
  y: number
}

/** Avanço (0 embaixo … 1 em cima) dentro do retângulo, ou null se fora. */
export function stairProgress(st: InteriorStair, x: number, z: number): number | null {
  if (x < st.x0 || x > st.x1 || z < st.z0 || z > st.z1) return null
  const alongZ = st.dir === "+z" || st.dir === "-z"
  const len = alongZ ? st.z1 - st.z0 : st.x1 - st.x0
  const along =
    st.dir === "+z" ? z - st.z0 : st.dir === "-z" ? st.z1 - z : st.dir === "+x" ? x - st.x0 : st.x1 - x
  const m = STAIR_MARGIN / len
  return Math.max(0, Math.min(1, (along / len - m) / (1 - 2 * m)))
}

export function heightAt(body: InteriorBody, def: InteriorDef) {
  for (const st of def.stairs) {
    if (body.floor !== st.from && body.floor !== st.to) continue
    const t = stairProgress(st, body.x, body.z)
    if (t === null) continue
    return def.floors[st.from].y + t * (def.floors[st.to].y - def.floors[st.from].y)
  }
  return def.floors[body.floor].y
}

function updateFloor(body: InteriorBody, def: InteriorDef) {
  for (const st of def.stairs) {
    const t = stairProgress(st, body.x, body.z)
    if (t === null) continue
    if (body.floor === st.from && t >= 1) {
      body.floor = st.to
      return
    }
    if (body.floor === st.to && t <= 0) {
      body.floor = st.from
      return
    }
  }
}

export function stepInterior(
  body: InteriorBody,
  intent: Intent,
  dt: number,
  def: InteriorDef,
  speeds = { walk: MOTION.WALK_SPEED, run: MOTION.RUN_SPEED },
): MoveState {
  const speedMax = intent.run ? speeds.run : speeds.walk
  const k = 1 - Math.exp(-MOTION.ACCEL * dt)
  body.vx += (intent.x * speedMax - body.vx) * k
  body.vz += (intent.z * speedMax - body.vz) * k
  let speed = Math.hypot(body.vx, body.vz)
  if (speed < MOTION.STOP_EPS) {
    body.vx = 0
    body.vz = 0
    speed = 0
  }
  const steps = Math.max(1, Math.ceil(dt / MOTION.SUBSTEP))
  const h = dt / steps
  for (let i = 0; i < steps; i++) {
    const fl = def.floors[body.floor]
    const b = fl.bounds
    const next = resolveCircle(body.x + body.vx * h, body.z + body.vz * h, MOTION.RADIUS, fl.boxes as Box2[])
    body.x = Math.max(b.minX, Math.min(b.maxX, next.x))
    body.z = Math.max(b.minZ, Math.min(b.maxZ, next.z))
    updateFloor(body, def)
  }
  body.y = heightAt(body, def)
  if (speed > 0.25) body.facing = Math.atan2(body.vx, body.vz)
  if (speed < 0.25) return 0
  return intent.run && speeds.run > speeds.walk && speed > (speeds.walk + speeds.run) / 2 - 0.4 ? 2 : 1
}
