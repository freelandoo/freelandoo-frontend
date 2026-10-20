// features/meu-mundo/engine/vehicle.ts
//
// Física do carro (mm3d-12): espelho EXATO de freelandoo-backend/src/utils/
// meuMundoVehicle.js. O servidor é a autoridade; o cliente roda a mesma conta
// para o seu carro responder na hora (previsão) e converge suavemente para o
// estado da sala. Mexeu num lado, mexe no outro — test/unit/
// meuMundoVehicle.test.js confere constantes, faixas e passo fixo.
//
// Corpo rígido no plano (o bairro é plano), quatro pontos de contato, força
// de pneu pela velocidade do ponto de contato, círculo de atrito, tração
// traseira, freio de mão, assistência arcade. Passo FIXO de 1/60 s com
// acumulador e teto de 8 passos por chamada.

import { resolveCircle, type Box2 } from "./collision"

export const STEP = 1 / 60
export const MAX_STEPS = 8
const G = 9.81

export const VEHICLE = {
  MASS: 1150,
  INERTIA: 1750,
  CG_FRONT: 1.22,
  CG_REAR: 1.38,
  TRACK: 1.72,
  CG_HEIGHT: 0.42,
  WHEEL_RADIUS: 0.42,
  ENGINE: 6200,
  MAX_SPEED: 19,
  REVERSE_FORCE: 3000,
  REVERSE_SPEED: 5,
  BRAKE: 11000,
  ROLL: 140,
  ROLL_LIN: 35,
  DRAG: 0.42,
  STIFF: 13000,
  GRIP_FRONT: 1.08,
  GRIP_REAR: 1.3,
  HB_GRIP: 0.32,
  HB_BRAKE: 2600,
  HB_RISE: 3,
  HB_FALL: 2.2,
  STEER_MAX: 0.6,
  STEER_FALL: 6,
  STEER_RATE: 2.6,
  STEER_RETURN: 3.6,
  REVERSE_DELAY: 0.35,
  THROTTLE_RISE: 3,
  THROTTLE_FALL: 7,
  ASSIST: 0.5,
  CS_GAIN: 0.8,
  YAW_DAMP: 3,
  COL_OFFSET: 1.2,
  COL_RADIUS: 0.98,
  RESTITUTION: 0.18,
  COL_FRICTION: 0.25,
  HX: 1.0,
  HZ: 2.12,
}

export type VehicleParams = typeof VEHICLE
export type TuningKey =
  | "ENGINE"
  | "MAX_SPEED"
  | "REVERSE_SPEED"
  | "BRAKE"
  | "GRIP_FRONT"
  | "GRIP_REAR"
  | "HB_GRIP"
  | "STEER_MAX"
  | "STEER_FALL"
  | "STEER_RATE"
  | "ASSIST"
  | "STIFF"

/** Faixas do painel de ajuste (o servidor fixa o que vier fora). */
export const TUNING_RANGES: Record<TuningKey, [number, number]> = {
  ENGINE: [2500, 12000],
  MAX_SPEED: [8, 30],
  REVERSE_SPEED: [2, 8],
  BRAKE: [4000, 20000],
  GRIP_FRONT: [0.6, 2],
  GRIP_REAR: [0.6, 2],
  HB_GRIP: [0.15, 0.9],
  STEER_MAX: [0.3, 0.8],
  STEER_FALL: [3, 20],
  STEER_RATE: [1, 6],
  ASSIST: [0, 1],
  STIFF: [5000, 25000],
}

export type Tuning = Partial<Record<TuningKey, number>>

export function tuned(overrides: Tuning | null): VehicleParams {
  if (!overrides) return VEHICLE
  return { ...VEHICLE, ...overrides }
}

export function sanitizeTuning(m: Tuning): Tuning {
  const out: Tuning = {}
  for (const k of Object.keys(TUNING_RANGES) as TuningKey[]) {
    const v = m[k]
    if (v === undefined || !Number.isFinite(v)) continue
    const [lo, hi] = TUNING_RANGES[k]
    out[k] = Math.max(lo, Math.min(hi, v))
  }
  return out
}

/** Entrada de direção: acelerador, freio/ré, volante (−1 esq … 1 dir), freio de mão. */
export interface DriveInput {
  t: number
  b: number
  s: number
  h: boolean
}
export const IDLE_DRIVE: DriveInput = { t: 0, b: 0, s: 0, h: false }

export interface VehicleState {
  x: number
  z: number
  yaw: number
  vx: number
  vz: number
  w: number
  steer: number
  thr: number
  hb: number
  ax: number
  ay: number
  u: number
  slip: number
  beta: number
  gear: number
  stopT: number
  acc: number
}

export function createVehicle(x: number, z: number, facing: number): VehicleState {
  return { x, z, yaw: facing, vx: 0, vz: 0, w: 0, steer: 0, thr: 0, hb: 0, ax: 0, ay: 0, u: 0, slip: 0, beta: 0, gear: 0, stopT: 0, acc: 0 }
}

function approach(cur: number, target: number, rate: number) {
  if (cur < target) return Math.min(target, cur + rate)
  return Math.max(target, cur - rate)
}

const tmpTire = { flong: 0, flat: 0, slide: 0 }

function tire(vlong: number, vlat: number, drive: number, brake: number, grip: number, stiff: number, load: number, kStop: number) {
  let flat = -stiff * vlat
  let flong = drive
  if (brake > 0) {
    const stop = Math.min(brake, kStop * Math.abs(vlong))
    flong -= Math.sign(vlong) * stop
  }
  const latCap = kStop * Math.abs(vlat)
  if (Math.abs(flat) > latCap) flat = Math.sign(flat) * latCap
  const max = grip * load
  const mag = Math.hypot(flong, flat)
  let slide = 0
  if (mag > max && mag > 1e-6) {
    const k = max / mag
    flong *= k
    flat *= k
    slide = 1 - k
  }
  tmpTire.flong = flong
  tmpTire.flat = flat
  tmpTire.slide = slide
  return tmpTire
}

function integrate(c: VehicleState, input: DriveInput, P: VehicleParams) {
  const dt = STEP
  const fx = Math.sin(c.yaw)
  const fz = Math.cos(c.yaw)
  const rx = fz
  const rz = -fx
  const vu = c.vx * fx + c.vz * fz
  const vs = c.vx * rx + c.vz * rz
  const speed = Math.hypot(c.vx, c.vz)

  let drive = 0
  let brake = 0
  c.thr = approach(c.thr, input.t, (input.t > c.thr ? P.THROTTLE_RISE : P.THROTTLE_FALL) * dt)
  if (input.t > 0) {
    if (vu < -0.5) brake = input.t * P.BRAKE
    else {
      const k = Math.max(0, 1 - (Math.max(0, vu) / P.MAX_SPEED) ** 2)
      drive = c.thr * P.ENGINE * k
    }
  }
  if (input.b > 0) {
    if (vu > 0.05) brake = Math.max(brake, input.b * P.BRAKE)
    else if (input.t === 0 && c.stopT >= P.REVERSE_DELAY && vu > -P.REVERSE_SPEED) {
      const k = 1 - Math.max(0, -vu) / P.REVERSE_SPEED
      drive = -input.b * P.REVERSE_FORCE * k
    }
  }
  if (input.b > 0 && input.t === 0 && Math.abs(vu) < 0.3) c.stopT += dt
  else if (input.b === 0 || vu > 0.6) c.stopT = 0
  c.gear = vu > 0.3 ? 1 : vu < -0.3 ? -1 : drive < 0 ? -1 : drive > 0 ? 1 : 0

  c.hb = approach(c.hb, input.h ? 1 : 0, (input.h ? P.HB_RISE : P.HB_FALL) * dt)

  const maxSteer = P.STEER_MAX / (1 + Math.max(0, Math.abs(vu)) / P.STEER_FALL)
  let target = input.s * maxSteer
  const beta = speed > 3 ? Math.atan2(vs, Math.abs(vu)) : 0
  if (speed > 3 && vu > 0) target += P.ASSIST * P.CS_GAIN * beta
  target = Math.max(-P.STEER_MAX, Math.min(P.STEER_MAX, target))
  const rate = input.s === 0 ? P.STEER_RETURN : P.STEER_RATE
  c.steer = approach(c.steer, target, rate * dt)

  const L = P.CG_FRONT + P.CG_REAR
  const mg = P.MASS * G
  const half = P.TRACK / 2
  const staticF = (mg * P.CG_REAR) / L / 2
  const staticR = (mg * P.CG_FRONT) / L / 2
  const dLong = (P.MASS * c.ax * P.CG_HEIGHT) / L / 2
  const dLat = (P.MASS * c.ay * P.CG_HEIGHT) / P.TRACK / 2
  const kStop = (P.MASS / 4 / dt) * 0.5
  const rearGrip = P.GRIP_REAR * (1 - c.hb * (1 - P.HB_GRIP))

  let Fs = 0
  let Fu = 0
  let tq = 0
  let rearSlide = 0
  for (let i = 0; i < 4; i++) {
    const front = i < 2
    const side = i % 2 === 0 ? -1 : 1
    const ps = side * half
    const pu = front ? P.CG_FRONT : -P.CG_REAR
    const load = Math.max(0.15 * (front ? staticF : staticR), (front ? staticF : staticR) - (front ? dLong : -dLong) - side * dLat)
    const d = front ? c.steer : 0
    const sd = Math.sin(d)
    const cd = Math.cos(d)
    const ws = vs + c.w * pu
    const wu = vu - c.w * ps
    const vlong = ws * sd + wu * cd
    const vlat = ws * cd - wu * sd
    const wDrive = front ? 0 : drive / 2
    let wBrake = brake / 4
    if (!front) wBrake += (c.hb * P.HB_BRAKE) / 2
    wBrake += (P.ROLL + P.ROLL_LIN * Math.abs(vlong)) / 4
    const tr = tire(vlong, vlat, wDrive, wBrake, front ? P.GRIP_FRONT : rearGrip, P.STIFF, load, kStop)
    if (!front) rearSlide = Math.max(rearSlide, tr.slide)
    const fs = tr.flong * sd + tr.flat * cd
    const fu = tr.flong * cd - tr.flat * sd
    Fs += fs
    Fu += fu
    tq += pu * fs - ps * fu
  }
  Fu -= P.DRAG * vu * Math.abs(vu)

  if (Math.abs(beta) > 0.12) {
    const k = Math.min(1, Math.abs(beta) * 2) + Math.max(0, Math.abs(beta) - 0.6) * 4
    tq -= P.ASSIST * P.YAW_DAMP * P.INERTIA * c.w * k
  }

  const au = Fu / P.MASS
  const as = Fs / P.MASS
  c.vx += (au * fx + as * rx) * dt
  c.vz += (au * fz + as * rz) * dt
  c.w += (tq / P.INERTIA) * dt
  c.yaw += c.w * dt
  if (c.yaw > Math.PI) c.yaw -= Math.PI * 2
  else if (c.yaw < -Math.PI) c.yaw += Math.PI * 2
  const kA = 1 - Math.exp(-10 * dt)
  c.ax += (au - c.ax) * kA
  c.ay += (as - c.ay) * kA

  if (input.t === 0 && input.b === 0 && Math.hypot(c.vx, c.vz) < 0.06 && Math.abs(c.w) < 0.05) {
    c.vx = 0
    c.vz = 0
    c.w = 0
  }
  c.slip = rearSlide
  c.beta = beta
}

const OFFSETS = (P: VehicleParams) => [P.COL_OFFSET, -P.COL_OFFSET, 0]

function collide(c: VehicleState, boxes: Box2[], limit: number, P: VehicleParams) {
  for (let iter = 0; iter < 2; iter++) {
    let hit = false
    const fx = Math.sin(c.yaw)
    const fz = Math.cos(c.yaw)
    const rx = fz
    const rz = -fx
    for (const off of OFFSETS(P)) {
      const cx = c.x + fx * off
      const cz = c.z + fz * off
      const p = resolveCircle(cx, cz, P.COL_RADIUS, boxes, 1)
      let nx = p.x - cx
      let nz = p.z - cz
      const dist = Math.hypot(nx, nz)
      if (dist < 1e-6) continue
      hit = true
      c.x += nx
      c.z += nz
      nx /= dist
      nz /= dist
      const ox = fx * off - nx * P.COL_RADIUS
      const oz = fz * off - nz * P.COL_RADIUS
      const ps = ox * rx + oz * rz
      const pu = ox * fx + oz * fz
      const pvx = c.vx + c.w * (pu * rx - ps * fx)
      const pvz = c.vz + c.w * (pu * rz - ps * fz)
      const vn = pvx * nx + pvz * nz
      if (vn >= 0) continue
      const ns = nx * rx + nz * rz
      const nu = nx * fx + nz * fz
      const tn = pu * ns - ps * nu
      const j = (-(1 + P.RESTITUTION) * vn) / (1 / P.MASS + (tn * tn) / P.INERTIA)
      c.vx += (j * nx) / P.MASS
      c.vz += (j * nz) / P.MASS
      c.w += (j * tn) / P.INERTIA
      const tx = -nz
      const tz = nx
      const vt = pvx * tx + pvz * tz
      const ts = tx * rx + tz * rz
      const tu = tx * fx + tz * fz
      const tt = pu * ts - ps * tu
      let jt = -vt / (1 / P.MASS + (tt * tt) / P.INERTIA)
      const cap = P.COL_FRICTION * j
      jt = Math.max(-cap, Math.min(cap, jt))
      c.vx += (jt * tx) / P.MASS
      c.vz += (jt * tz) / P.MASS
      c.w += (jt * tt) / P.INERTIA
    }
    if (!hit) break
  }
  if (c.x > limit || c.x < -limit) {
    c.x = Math.max(-limit, Math.min(limit, c.x))
    c.vx = 0
  }
  if (c.z > limit || c.z < -limit) {
    c.z = Math.max(-limit, Math.min(limit, c.z))
    c.vz = 0
  }
}

export function stepVehicle(c: VehicleState, input: DriveInput, boxes: Box2[], limit: number, P: VehicleParams = VEHICLE) {
  integrate(c, input, P)
  c.x += c.vx * STEP
  c.z += c.vz * STEP
  collide(c, boxes, limit, P)
  c.u = c.vx * Math.sin(c.yaw) + c.vz * Math.cos(c.yaw)
}

/** Avança `dt` em passos fixos (o que passar de MAX_STEPS é descartado). */
export function advanceVehicle(c: VehicleState, input: DriveInput, dt: number, boxes: Box2[], limit: number, P: VehicleParams = VEHICLE) {
  c.acc = Math.min(c.acc + Math.max(0, dt), STEP * MAX_STEPS)
  let n = 0
  while (c.acc >= STEP) {
    stepVehicle(c, input, boxes, limit, P)
    c.acc -= STEP
    n++
  }
  return n
}
