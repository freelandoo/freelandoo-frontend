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

/** 0 parado, 1 andando, 2 correndo, 3 sentado (só dentro das casas). */
export type MoveState = 0 | 1 | 2 | 3

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
  return intent.run && speed > (speeds.walk + speeds.run) / 2 - 0.4 ? 2 : 1
}

export function lerpAngle(a: number, b: number, t: number) {
  let d = b - a
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return a + d * t
}
