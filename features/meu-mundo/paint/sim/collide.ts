// features/meu-mundo/paint/sim/collide.ts — PAINT (mm3d-35): perguntas ao mundo.
//
// O mundo é uma lista de sólidos verticais (cilindros e caixas alinhadas): as
// ilhas, os enfeites e a TINTA (ponte e degrau são cilindros). Três perguntas:
//  - apoio: qual o chão mais alto sob um ponto, até uma altura;
//  - empurrão: tirar o corpo de dentro de um sólido de lado;
//  - raio: onde o tiro bate (ponto, normal, sólido).

import type { Solid, Vec3 } from "./map"

/** Raio do "pé": anda até a borda sem cair antes (menor que o corpo). */
export const FOOT_R = 0.18

function inside(s: Solid, x: number, z: number, pad: number) {
  if (s.k === 0) {
    const dx = x - s.x
    const dz = z - s.z
    const r = s.r + pad
    return dx * dx + dz * dz <= r * r
  }
  return Math.abs(x - s.x) <= s.hx + pad && Math.abs(z - s.z) <= s.hz + pad
}

/**
 * Chão mais alto sob (x, z) com topo até `maxY` (pé + subida tolerada).
 * -Infinity = nada embaixo (vão). `skip` = sólido ignorado (o próprio degrau
 * que está nascendo, por exemplo).
 */
export function supportAt(solids: readonly Solid[], x: number, z: number, maxY: number, pad = FOOT_R) {
  let best = -Infinity
  for (const s of solids) {
    if (s.y1 > maxY || s.y1 <= best) continue
    if (inside(s, x, z, pad)) best = s.y1
  }
  return best
}

/** Índice do sólido que dá o chão de `supportAt` (-1 = nenhum). */
export function supportIndex(solids: readonly Solid[], x: number, z: number, maxY: number, pad = FOOT_R) {
  let best = -Infinity
  let idx = -1
  for (let i = 0; i < solids.length; i++) {
    const s = solids[i]
    if (s.y1 > maxY || s.y1 <= best) continue
    if (inside(s, x, z, pad)) {
      best = s.y1
      idx = i
    }
  }
  return idx
}

/**
 * Tira o corpo (círculo de raio r, de `y` a `y + h`) de dentro dos sólidos que
 * ele não consegue subir (topo acima de `y + up`). Mexe em `p` e devolve se
 * encostou em algo.
 */
export function pushOut(solids: readonly Solid[], p: { x: number; y: number; z: number }, r: number, h: number, up: number) {
  let hit = false
  for (let pass = 0; pass < 2; pass++) {
    for (const s of solids) {
      if (s.y1 <= p.y + up || s.y0 >= p.y + h) continue
      if (s.k === 0) {
        const dx = p.x - s.x
        const dz = p.z - s.z
        const R = s.r + r
        const d2 = dx * dx + dz * dz
        if (d2 >= R * R) continue
        const d = Math.sqrt(d2)
        if (d < 1e-6) {
          p.x = s.x + R
        } else {
          p.x = s.x + (dx / d) * R
          p.z = s.z + (dz / d) * R
        }
        hit = true
      } else {
        const ox = s.hx + r - Math.abs(p.x - s.x)
        const oz = s.hz + r - Math.abs(p.z - s.z)
        if (ox <= 0 || oz <= 0) continue
        if (ox < oz) p.x += Math.sign(p.x - s.x || 1) * ox
        else p.z += Math.sign(p.z - s.z || 1) * oz
        hit = true
      }
    }
  }
  return hit
}

/** Teto: o sólido mais baixo cuja base está entre `fromY` e `toY` sobre (x, z). */
export function ceilingAt(solids: readonly Solid[], x: number, z: number, fromY: number, toY: number, pad: number) {
  let best = Infinity
  for (const s of solids) {
    if (s.y0 < fromY || s.y0 > toY || s.y0 >= best) continue
    if (inside(s, x, z, pad)) best = s.y0
  }
  return best
}

export interface RayHit {
  t: number
  point: Vec3
  normal: Vec3
  /** Índice do sólido na lista. */
  index: number
}

/** Raio × cilindro vertical finito: menor t em [0, maxT]. */
function rayCyl(o: Vec3, d: Vec3, s: { x: number; z: number; y0: number; y1: number; r: number }, maxT: number): { t: number; n: Vec3 } | null {
  let best: { t: number; n: Vec3 } | null = null
  // tampas
  if (Math.abs(d.y) > 1e-9) {
    for (const [cy, ny] of [[s.y1, 1], [s.y0, -1]] as const) {
      const t = (cy - o.y) / d.y
      if (t < 0 || t > maxT || (best && t >= best.t)) continue
      // só a tampa que o raio atravessa de fora para dentro
      if ((ny === 1 && d.y >= 0) || (ny === -1 && d.y <= 0)) continue
      const x = o.x + d.x * t - s.x
      const z = o.z + d.z * t - s.z
      if (x * x + z * z <= s.r * s.r) best = { t, n: { x: 0, y: ny, z: 0 } }
    }
  }
  // lado
  const a = d.x * d.x + d.z * d.z
  if (a > 1e-12) {
    const fx = o.x - s.x
    const fz = o.z - s.z
    const b = 2 * (fx * d.x + fz * d.z)
    const c = fx * fx + fz * fz - s.r * s.r
    const disc = b * b - 4 * a * c
    if (disc >= 0) {
      const t = (-b - Math.sqrt(disc)) / (2 * a)
      if (t >= 0 && t <= maxT && (!best || t < best.t)) {
        const y = o.y + d.y * t
        if (y >= s.y0 && y <= s.y1) {
          const nx = fx + d.x * t
          const nz = fz + d.z * t
          const nl = Math.hypot(nx, nz) || 1
          best = { t, n: { x: nx / nl, y: 0, z: nz / nl } }
        }
      }
    }
  }
  return best
}

/** Raio × caixa alinhada (slabs). */
function rayBox(o: Vec3, d: Vec3, s: { x: number; z: number; y0: number; y1: number; hx: number; hz: number }, maxT: number): { t: number; n: Vec3 } | null {
  const mins = [s.x - s.hx, s.y0, s.z - s.hz]
  const maxs = [s.x + s.hx, s.y1, s.z + s.hz]
  const oo = [o.x, o.y, o.z]
  const dd = [d.x, d.y, d.z]
  let t0 = 0
  let t1 = maxT
  let axis = -1
  let sign = 0
  for (let i = 0; i < 3; i++) {
    if (Math.abs(dd[i]) < 1e-12) {
      if (oo[i] < mins[i] || oo[i] > maxs[i]) return null
      continue
    }
    let ta = (mins[i] - oo[i]) / dd[i]
    let tb = (maxs[i] - oo[i]) / dd[i]
    let sg = -1
    if (ta > tb) {
      const tmp = ta
      ta = tb
      tb = tmp
      sg = 1
    }
    if (ta > t0) {
      t0 = ta
      axis = i
      sign = sg
    }
    t1 = Math.min(t1, tb)
    if (t0 > t1) return null
  }
  if (axis < 0) return null // começou dentro
  const n = { x: 0, y: 0, z: 0 }
  if (axis === 0) n.x = sign
  else if (axis === 1) n.y = sign
  else n.z = sign
  return { t: t0, n }
}

/** Primeiro sólido que o raio (d unitário) toca até `maxT`. */
export function raycast(solids: readonly Solid[], o: Vec3, d: Vec3, maxT: number): RayHit | null {
  let best: RayHit | null = null
  let limit = maxT
  for (let i = 0; i < solids.length; i++) {
    const s = solids[i]
    const h = s.k === 0 ? rayCyl(o, d, s, limit) : rayBox(o, d, s, limit)
    if (!h) continue
    limit = h.t
    best = { t: h.t, point: { x: o.x + d.x * h.t, y: o.y + d.y * h.t, z: o.z + d.z * h.t }, normal: h.n, index: i }
  }
  return best
}

/** Raio × cápsula de jogador (cilindro de `y` a `y + h`, raio r). t ou null. */
export function rayBody(o: Vec3, d: Vec3, b: { x: number; y: number; z: number }, r: number, h: number, maxT: number) {
  const hit = rayCyl(o, d, { x: b.x, z: b.z, y0: b.y, y1: b.y + h, r }, maxT)
  return hit ? hit.t : null
}
