// features/meu-mundo/paint/sim/body.ts — PAINT (mm3d-35): o corpo de quem joga.
//
// Passo fixo (TUNING.step). Anda pela intenção (direção no mundo, 0–1),
// corre, pula (com uma folga logo depois de sair da borda), cai, sobe sozinho
// degraus baixos, para no teto e é empurrado de lado pelo que não sobe. O
// empurrão de soco/tiro entra como velocidade (`knock`) e se desfaz pela
// própria aceleração de andar.
//
// O movimento é do aparelho (a sala só confere a velocidade); a regra mora
// aqui para os dois lados concordarem sobre o que dá e o que não dá.

import { TUNING } from "./tuning"
import { ceilingAt, pushOut, supportIndex } from "./collide"
import { PAINT } from "./tuning"
import type { Solid } from "./map"

export interface PaintBody {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  /** Pisando agora. */
  ground: boolean
  /** s desde que saiu do chão (folga do pulo). */
  air: number
  /** Altura do último chão em que pisou (a ponte nasce nela, não no ar). */
  gy: number
  /** Para onde olha (rad, 0 = +z). */
  facing: number
  /** Pulos desde que saiu do chão (mm3d-35c: até dois). */
  jumps: number
  /** Quicou numa cama elástica NESTE passo (id da mancha; -1 sem id), senão null. */
  bounce: number | null
}

export interface BodyIntent {
  /** Direção desejada no mundo (|m| ≤ 1). */
  mx: number
  mz: number
  run: boolean
  /** Apertou pular neste passo (borda). */
  jump: boolean
}

export function newBody(x: number, y: number, z: number, facing: number): PaintBody {
  return { x, y, z, vx: 0, vy: 0, vz: 0, ground: true, air: 0, gy: y, facing, jumps: 0, bounce: null }
}

/** Movimento para a animação: 0 parado, 1 andando, 2 correndo, 5 no ar. */
export type BodyMove = 0 | 1 | 2 | 5

export function stepBody(b: PaintBody, it: BodyIntent, solids: readonly Solid[], dt = TUNING.step): BodyMove {
  const T = TUNING
  b.bounce = null
  let mx = it.mx
  let mz = it.mz
  const m = Math.hypot(mx, mz)
  if (m > 1) {
    mx /= m
    mz /= m
  }
  const speed = it.run ? T.run : T.walk
  const tx = mx * speed
  const tz = mz * speed
  const a = T.accel * (b.ground ? 1 : T.airControl) * dt
  const dvx = tx - b.vx
  const dvz = tz - b.vz
  const dl = Math.hypot(dvx, dvz)
  if (dl <= a) {
    b.vx = tx
    b.vz = tz
  } else {
    b.vx += (dvx / dl) * a
    b.vz += (dvz / dl) * a
  }
  if (m > 0.05) b.facing = Math.atan2(mx, mz)

  if (it.jump) {
    if ((b.ground || b.air < T.coyote) && b.vy <= 0.01) {
      b.vy = T.jumpV
      b.ground = false
      b.air = T.coyote
      b.jumps = 1
    } else if (!b.ground && b.jumps < T.maxJumps) {
      // pulo no ar (mm3d-35c): saiu da borda sem pular também tem um
      b.vy = T.airJumpV
      b.jumps = T.maxJumps
    }
  }

  // horizontal + empurrão de lado
  b.x += b.vx * dt
  b.z += b.vz * dt
  pushOut(solids, b, T.bodyR, T.bodyH, T.stepUp)

  // vertical
  const wasGround = b.ground
  if (!b.ground) b.vy -= T.gravity * dt
  const prevY = b.y
  b.y += b.vy * dt
  if (b.vy > 0) {
    const ceil = ceilingAt(solids, b.x, b.z, prevY + T.bodyH - 0.05, b.y + T.bodyH, T.bodyR * 0.6)
    if (ceil < Infinity) {
      b.y = ceil - T.bodyH
      b.vy = 0
    }
  }
  // chão: o mais alto até o pé (+ subida, se já estava pisando)
  const reach = wasGround ? Math.max(prevY, b.y) + T.stepUp : Math.max(prevY, b.y) + 0.02
  const fi = supportIndex(solids, b.x, b.z, reach)
  const fs = fi >= 0 ? solids[fi] : null
  const floor = fs ? fs.y1 : -Infinity
  if (b.vy <= 0 && fs && b.y <= floor + (wasGround ? 0.06 : 0)) {
    b.y = floor
    b.gy = floor
    if (fs.k === 0 && fs.c === PAINT.STEP) {
      // cama elástica (mm3d-35e): lança para cima; no ar ainda tem um pulo
      b.vy = T.bounceV
      b.ground = false
      b.air = T.coyote
      b.jumps = 1
      b.bounce = fs.b ?? -1
      return 5
    }
    b.vy = 0
    b.ground = true
    b.air = 0
    b.jumps = 0
  } else if (wasGround && b.vy <= 0 && floor > -Infinity && b.y - floor <= 0.25) {
    // descendo rampa/degrau baixo: gruda
    b.y = floor
    b.vy = 0
    b.gy = floor
  } else {
    if (b.ground) b.vy = Math.min(b.vy, 0)
    b.ground = false
    b.air += dt
  }

  if (!b.ground) return 5
  const hs = Math.hypot(b.vx, b.vz)
  return hs < 0.3 ? 0 : hs > (T.walk + T.run) / 2 ? 2 : 1
}

/**
 * Empurrão (soco, tiro): soma na velocidade e tira do chão. Quem leva um soco
 * na beira pode cair da ilha — é o jogo.
 */
export function knockBody(b: PaintBody, kx: number, ky: number, kz: number) {
  b.vx += kx
  b.vz += kz
  if (ky > 0) {
    b.vy = Math.max(b.vy, ky)
    b.ground = false
    b.air = TUNING.coyote
  }
}

/** Uma mancha nasceu embaixo de quem está aqui: sobe para o topo (até 1,1 m). */
export function liftOnto(b: PaintBody, x: number, z: number, r: number, top: number) {
  if (Math.hypot(b.x - x, b.z - z) > r + TUNING.bodyR * 0.5) return false
  if (top <= b.y || top - b.y > 1.1) return false
  b.y = top
  b.vy = Math.max(0, b.vy)
  b.ground = b.vy <= 0
  b.gy = top
  return true
}
