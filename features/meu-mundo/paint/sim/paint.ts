// features/meu-mundo/paint/sim/paint.ts — PAINT (mm3d-35): o que cada tiro faz.
//
// Um tiro é instantâneo (raio). A MESMA função roda no aparelho (para a tinta
// aparecer na hora) e na sala (que decide): mesmo mundo + mesmo tiro = mesmo
// resultado. O aparelho manda a origem e a direção; a sala confere que a
// origem está perto de onde ela sabe que o jogador está.
//
//  - TURQUESA (ponte): bateu no TOPO de algo ao alcance → poça-plataforma ali.
//    Senão (mirando o vão, ou o lado de uma ilha) → a ponte CRESCE: acha a
//    borda do chão na direção da mira, na altura do último chão pisado, e põe
//    um disco logo depois dela. Segurando o botão, disco atrás de disco.
//  - AMARELO (cama elástica, mm3d-35e): no ar → embaixo do pé (cai nela e é
//    lançado). No chão →
//    onde a mira bate (perto), ou logo à frente.
//  - VERMELHO ESCURO (dano): acerta o jogador do OUTRO time, o chefão, ou
//    apaga tinta do outro time; no chão vira só respingo.

import { PAINT, TUNING, type PaintColor } from "./tuning"
import { raycast, rayBody, supportAt } from "./collide"
import type { Solid, SolidCyl, Vec3 } from "./map"

export interface Shooter {
  slot: number
  team: number
  x: number
  y: number
  z: number
  ground: boolean
  /** Último chão pisado (a ponte nasce nele). */
  gy: number
  facing: number
}

export interface ShotTargetBody {
  slot: number
  team: number
  x: number
  y: number
  z: number
}

export interface ShotWorld {
  solids: readonly Solid[]
  bodies: readonly ShotTargetBody[]
  boss: { x: number; y: number; z: number; r: number; h: number } | null
}

/** Mancha nova (sem id: quem guarda dá). */
export interface NewBlob {
  c: PaintColor
  x: number
  z: number
  y0: number
  y1: number
  r: number
}

export type ShotResult =
  | { kind: "blob"; blob: NewBlob }
  | { kind: "player"; slot: number; point: Vec3 }
  | { kind: "boss"; point: Vec3 }
  | { kind: "erase"; blob: number; point: Vec3 }
  | { kind: "splat"; point: Vec3; normal: Vec3 }
  | { kind: "miss" }

/** Boca da arma: um pouco à direita e na altura do peito de quem atira. */
export function muzzleOf(s: { x: number; y: number; z: number }, yaw: number): Vec3 {
  return { x: s.x + Math.cos(yaw) * 0.32, y: s.y + 1.25, z: s.z - Math.sin(yaw) * 0.32 }
}

const r3 = (v: number) => Math.round(v * 1000) / 1000

function blobOf(c: PaintColor, x: number, z: number, y0: number): NewBlob {
  const r = c === PAINT.STEP ? TUNING.stepR : TUNING.bridgeR
  const h = c === PAINT.STEP ? TUNING.stepH : TUNING.bridgeH
  return { c, x: r3(x), z: r3(z), y0: r3(y0), y1: r3(y0 + h), r }
}

function unit(d: Vec3): Vec3 {
  const l = Math.hypot(d.x, d.y, d.z) || 1
  return { x: d.x / l, y: d.y / l, z: d.z / l }
}

/**
 * Resolve um tiro. `o` = boca da arma, `dir` = mira (não precisa ser
 * unitária). Não mexe no mundo: quem chama aplica o resultado.
 */
export function resolveShot(world: ShotWorld, s: Shooter, c: PaintColor, o: Vec3, dir: Vec3): ShotResult {
  const d = unit(dir)
  const T = TUNING
  if (c === PAINT.HARM) {
    const range = T.range[PAINT.HARM]
    const wall = raycast(world.solids, o, d, range)
    let best: ShotResult | null = null
    let bestT = wall ? wall.t : range
    for (const b of world.bodies) {
      if (b.slot === s.slot || b.team === s.team) continue
      const t = rayBody(o, d, b, T.hitR, T.bodyH, bestT)
      if (t !== null && t < bestT) {
        bestT = t
        best = { kind: "player", slot: b.slot, point: { x: o.x + d.x * t, y: o.y + d.y * t, z: o.z + d.z * t } }
      }
    }
    if (world.boss) {
      const t = rayBody(o, d, world.boss, world.boss.r, world.boss.h, bestT)
      if (t !== null && t < bestT) {
        bestT = t
        best = { kind: "boss", point: { x: o.x + d.x * t, y: o.y + d.y * t, z: o.z + d.z * t } }
      }
    }
    if (best) return best
    if (!wall) return { kind: "miss" }
    const hit = world.solids[wall.index] as SolidCyl
    if (hit.b !== undefined && hit.team !== s.team) return { kind: "erase", blob: hit.b, point: wall.point }
    return { kind: "splat", point: wall.point, normal: wall.normal }
  }

  if (c === PAINT.STEP) {
    if (!s.ground) {
      // Embaixo do pé: apoia no chão de baixo se estiver perto; senão flutua
      // logo abaixo da sola (é assim que se sobe empilhando).
      const below = supportAt(world.solids, s.x, s.z, s.y + 0.05, 0.05)
      const y0 = below > s.y - T.stepH - 0.02 ? below : s.y - T.stepH - 0.02
      return { kind: "blob", blob: blobOf(c, s.x, s.z, y0) }
    }
    const hit = raycast(world.solids, o, d, T.range[PAINT.STEP])
    if (hit && hit.normal.y > 0.5 && Math.hypot(hit.point.x - s.x, hit.point.z - s.z) > T.stepR + T.bodyR * 0.6) {
      return { kind: "blob", blob: blobOf(c, hit.point.x, hit.point.z, hit.point.y) }
    }
    // Logo à frente, no chão em que está.
    const fx = s.x + Math.sin(s.facing) * 1.35
    const fz = s.z + Math.cos(s.facing) * 1.35
    const floor = supportAt(world.solids, fx, fz, s.y + 0.3, 0.05)
    return { kind: "blob", blob: blobOf(c, fx, fz, floor > s.y - 1.5 ? floor : s.gy) }
  }

  // PONTE
  const hit = raycast(world.solids, o, d, T.range[PAINT.BRIDGE])
  if (hit && hit.normal.y > 0.5 && Math.hypot(hit.point.x - s.x, hit.point.z - s.z) <= T.bridgeReach) {
    return { kind: "blob", blob: blobOf(c, hit.point.x, hit.point.z, hit.point.y - T.bridgeH * 0.5) }
  }
  // Crescer: a borda na direção da mira, na altura do último chão.
  let hx = d.x
  let hz = d.z
  const hl = Math.hypot(hx, hz)
  if (hl < 0.2) {
    hx = Math.sin(s.facing)
    hz = Math.cos(s.facing)
  } else {
    hx /= hl
    hz /= hl
  }
  const footY = Math.min(s.y, s.gy)
  for (let k = 0.6; k <= T.bridgeReach; k += 0.35) {
    const px = s.x + hx * k
    const pz = s.z + hz * k
    const sup = supportAt(world.solids, px, pz, footY + 0.3, 0.02)
    if (sup < footY - 0.6) {
      const ahead = k + T.bridgeR * 0.55
      return { kind: "blob", blob: blobOf(c, s.x + hx * ahead, s.z + hz * ahead, footY - T.bridgeH) }
    }
  }
  return { kind: "miss" }
}

/** Tiro conta como mancha nova em `solids` (cilindro com id, cor e time). */
export function blobSolid(b: NewBlob, id: number, team: number): SolidCyl {
  return { k: 0, x: b.x, z: b.z, y0: b.y0, y1: b.y1, r: b.r, b: id, c: b.c, team }
}

/** Quem o soco pega: na frente (cone), perto, na mesma altura; do outro time. */
export function punchTargets(a: { slot: number; team: number; x: number; y: number; z: number; facing: number }, bodies: readonly ShotTargetBody[]) {
  const out: { slot: number; kx: number; kz: number }[] = []
  const fx = Math.sin(a.facing)
  const fz = Math.cos(a.facing)
  for (const b of bodies) {
    if (b.slot === a.slot || b.team === a.team) continue
    const dx = b.x - a.x
    const dz = b.z - a.z
    const d = Math.hypot(dx, dz)
    if (d > TUNING.punchRange || Math.abs(b.y - a.y) > 1.2) continue
    if (d > 0.05 && (dx * fx + dz * fz) / d < TUNING.punchCos) continue
    const ux = d > 0.05 ? dx / d : fx
    const uz = d > 0.05 ? dz / d : fz
    out.push({ slot: b.slot, kx: ux * TUNING.punchKnock, kz: uz * TUNING.punchKnock })
  }
  return out
}

/** O soco alcança o chefão? */
export function punchReachesBoss(a: { x: number; y: number; z: number }, boss: { x: number; y: number; z: number; r: number; h: number }) {
  return Math.hypot(a.x - boss.x, a.z - boss.z) <= boss.r + TUNING.punchRange && a.y >= boss.y - 1 && a.y <= boss.y + boss.h
}
