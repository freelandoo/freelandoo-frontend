// features/meu-mundo/engine/motion.ts
//
// A REGRA de deslocamento, espelho exato de freelandoo-backend/src/utils/
// meuMundoMotion.js. O servidor valida e aplica o movimento com ela; o cliente
// roda a MESMA conta para o próprio personagem responder na hora (predição) e
// depois converge suavemente para a posição que o servidor confirmou.
// Mexeu num lado, mexe no outro.
//
// Velocidades vêm do servidor no payload (`motion`); os valores aqui são só a
// queda segura caso o campo falte.

import { resolveCircle, type Box2 } from "./collision"

export const MOTION = {
  WALK_SPEED: 1.9,
  RUN_SPEED: 3.5,
  ACCEL: 14,
  RADIUS: 0.42,
  SUBSTEP: 0.025,
  STOP_EPS: 0.02,
  // mm3d-13: abaixo deste ritmo (exausto) não se corre — "correr" anda.
  PACE_RUN_MIN: 0.6,
}

/**
 * Velocidades a pé pelo RITMO do corpo que a sala manda (`pace`: 1 normal,
 * 0,7 cansado, 0,42 exausto). Espelho de paceSpeeds em
 * freelandoo-backend/src/utils/meuMundoMotion.js.
 */
export function paceSpeeds(pace = 1, base = { walk: MOTION.WALK_SPEED, run: MOTION.RUN_SPEED }) {
  const p = Number.isFinite(pace) && pace > 0 ? Math.min(1, pace) : 1
  const walk = base.walk * p
  return { walk, run: p >= MOTION.PACE_RUN_MIN ? base.run * p : walk }
}

/**
 * Carro: o que é do BAIRRO (caixa, entrar, sair, recuperar) — espelho de
 * freelandoo-backend/src/utils/meuMundoCars.js. A física do carro está em
 * vehicle.ts (mm3d-12).
 */
export const CAR = {
  HX: 1.0,
  HZ: 2.12,
  ENTER_RADIUS: 3.4,
  EXIT_MAX_SPEED: 1.5,
  RECOVER_MAX_SPEED: 2,
  RECOVER_COOLDOWN_MS: 15000,
}

/**
 * Modalidades de veículo (mm3d-14) — espelho de RIDE_KINDS em
 * freelandoo-backend/src/utils/meuMundoCars.js (o teste confere). Id = lote +
 * offset; `move` é o estado de quem usa (o carro esconde a pessoa: 0).
 */
export const RIDE_KINDS = {
  car: { offset: 0, enter: 3.4, ownerOnly: true, parkedBlocks: true, move: 0 },
  bike: { offset: 20, enter: 1.8, ownerOnly: false, parkedBlocks: true, move: 6 },
  skate: { offset: 40, enter: 1.5, ownerOnly: false, parkedBlocks: false, move: 7 },
  skates: { offset: 60, enter: 1.5, ownerOnly: false, parkedBlocks: false, move: 8 },
} as const
export type RideKind = keyof typeof RIDE_KINDS
export const RIDE_KIND_NAMES = ["car", "bike", "skate", "skates"] as const satisfies readonly RideKind[]
/** Modalidade pelo id do veículo (1–80); null fora da faixa. */
export function kindOfId(id: number): RideKind | null {
  if (!Number.isInteger(id) || id < 1 || id > 80) return null
  return RIDE_KIND_NAMES[Math.floor((id - 1) / 20)]
}

/** Perfil opcional de `step`; sem ele, a pé. */
export interface MotionProfile {
  accel: number
  radius: number
}

/** Velocidade natural das animações (medida no Blender, ver REGISTRO.md). */
export const ANIM_NATURAL_SPEED = { walk: 1.267, run: 2.221 }

export interface Intent {
  x: number
  z: number
  run: boolean
}

export interface Body {
  x: number
  z: number
  vx: number
  vz: number
  facing: number
}

/**
 * 0 parado, 1 andando, 2 correndo; só dentro das casas: 3 sentado, 4 deitado,
 * 5 dormindo (mm3d-13).
 */
// 0 parado, 1 andando, 2 correndo, 3 sentado, 4 deitado, 5 dormindo (casa);
// 6 de bicicleta, 7 de skate, 8 de patins (mm3d-14, rua).
export type MoveState = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

export function step(
  body: Body,
  intent: Intent,
  dt: number,
  boxes: Box2[],
  limit: number,
  speeds = { walk: MOTION.WALK_SPEED, run: MOTION.RUN_SPEED },
  shape: MotionProfile | null = null,
): MoveState {
  const speedMax = intent.run ? speeds.run : speeds.walk
  const radius = shape ? shape.radius : MOTION.RADIUS
  const k = 1 - Math.exp(-(shape ? shape.accel : MOTION.ACCEL) * dt)
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
    const next = resolveCircle(body.x + body.vx * h, body.z + body.vz * h, radius, boxes)
    body.x = Math.max(-limit, Math.min(limit, next.x))
    body.z = Math.max(-limit, Math.min(limit, next.z))
  }
  if (speed > 0.25) body.facing = Math.atan2(body.vx, body.vz)
  if (speed < 0.25) return 0
  return intent.run && speeds.run > speeds.walk && speed > (speeds.walk + speeds.run) / 2 - 0.4 ? 2 : 1
}

export function lerpAngle(a: number, b: number, t: number) {
  let d = b - a
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return a + d * t
}
