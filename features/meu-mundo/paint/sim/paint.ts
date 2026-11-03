// features/meu-mundo/paint/sim/paint.ts — PAINT (mm3d-35): o que cada tiro faz.
//
// Um tiro é instantâneo (raio). A MESMA função roda no aparelho (para a tinta
// aparecer na hora) e na sala (que decide): mesmo mundo + mesmo tiro = mesmo
// resultado. O aparelho manda a origem e a direção; a sala confere que a
// origem está perto de onde ela sabe que o jogador está.
//
// mm3d-46: as cores mudaram (ponte LARANJA, dano PRETO, cama elástica
// VERMELHA) e entrou o MURO (turquesa).
//
//  - LARANJA (ponte): bateu no TOPO de algo ao alcance → poça-plataforma ali.
//    Senão (mirando o vão, ou o lado de uma ilha) → a ponte CRESCE: acha a
//    borda do chão na direção da mira, na altura do PÉ de quem atira (no ar,
//    a ponte nasce onde ele está — pular serve para isso, mm3d-35f), e põe
//    um disco logo depois dela. Segurando o botão, disco atrás de disco.
//  - VERMELHO (cama elástica, mm3d-35e): no ar → embaixo do pé (cai nela e é
//    lançado). No chão →
//    onde a mira bate (perto), ou logo à frente.
//  - PRETO (dano): acerta o jogador do OUTRO time, o chefão, ou apaga tinta
//    do outro time (o muro aguenta alguns tiros — quem conta é a partida);
//    no chão vira só respingo.
//  - TURQUESA (muro): placa em pé atravessada na mira, no chão onde a mira
//    bate (perto) ou logo à frente; mirando o topo de um muro, empilha. Barra
//    o corpo e o tiro (é sólido como a ilha) e EMPURRA quem bate (mm3d-62).
//    mm3d-62c: fica NO AR onde a mira aponta (não sobe do chão); ponte,
//    cama elástica e muro são placas QUADRADAS do mesmo tamanho (2,5 m).
//    Pegou um adversário em cheio: nasce na frente dele e ele voa para trás.

import { PAINT, TUNING, type PaintColor } from "./tuning"
import { raycast, rayBody, supportAt } from "./collide"
import type { Solid, SolidCyl, SolidWall, Vec3 } from "./map"

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

/** Mancha nova (sem id: quem guarda dá). No muro `r` é meio comprimento e `a` para onde olha. */
export interface NewBlob {
  c: PaintColor
  x: number
  z: number
  y0: number
  y1: number
  r: number
  a?: number
}

export type ShotResult =
  | { kind: "blob"; blob: NewBlob }
  | { kind: "player"; slot: number; point: Vec3 }
  /** mm3d-62: o muro pegou um adversário em cheio — ele voa para longe e o muro nasce na frente dele. */
  | { kind: "shove"; slot: number; point: Vec3; blob: NewBlob }
  | { kind: "boss"; point: Vec3 }
  | { kind: "erase"; blob: number; point: Vec3 }
  | { kind: "splat"; point: Vec3; normal: Vec3 }
  | { kind: "miss" }

/** Boca da arma: um pouco à direita e na altura do peito de quem atira. */
export function muzzleOf(s: { x: number; y: number; z: number }, yaw: number): Vec3 {
  return { x: s.x + Math.cos(yaw) * 0.32, y: s.y + 1.25, z: s.z - Math.sin(yaw) * 0.32 }
}

const r3 = (v: number) => Math.round(v * 1000) / 1000

/** Placa quadrada (ponte/cama elástica, mm3d-62c) girada para `a`. */
function blobOf(c: PaintColor, x: number, z: number, y0: number, a: number): NewBlob {
  const r = c === PAINT.STEP ? TUNING.stepR : TUNING.bridgeR
  const h = c === PAINT.STEP ? TUNING.stepH : TUNING.bridgeH
  return { c, x: r3(x), z: r3(z), y0: r3(y0), y1: r3(y0 + h), r, a: r3(a) }
}

/** Para onde a mira olha no chão (ou o corpo, mirando reto para cima/baixo). */
function yawOf(d: Vec3, s: Shooter) {
  const hl = Math.hypot(d.x, d.z)
  if (hl < 0.2) return { hx: Math.sin(s.facing), hz: Math.cos(s.facing), a: s.facing }
  return { hx: d.x / hl, hz: d.z / hl, a: Math.atan2(d.x, d.z) }
}

function wallOf(x: number, z: number, y0: number, a: number): NewBlob {
  return { c: PAINT.WALL, x: r3(x), z: r3(z), y0: r3(y0), y1: r3(y0 + TUNING.wallH), r: TUNING.wallLen / 2, a: r3(a) }
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
  const { a: yaw } = yawOf(d, s)
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
    const hit = world.solids[wall.index] as SolidCyl | SolidWall
    if (hit.b !== undefined && hit.team !== s.team) return { kind: "erase", blob: hit.b, point: wall.point }
    return { kind: "splat", point: wall.point, normal: wall.normal }
  }

  if (c === PAINT.WALL) {
    // de frente para quem atira (atravessado na mira)
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
    const a = Math.atan2(hx, hz)
    const hit = raycast(world.solids, o, d, T.range[PAINT.WALL])
    // adversário na mira antes da parede/chão: o muro nasce colado na frente
    // dele (do lado de quem atirou) e ele é empurrado para longe
    let near: ShotResult | null = null
    let nearT = hit ? hit.t : T.range[PAINT.WALL]
    for (const b of world.bodies) {
      if (b.slot === s.slot || b.team === s.team) continue
      const t = rayBody(o, d, b, T.hitR, T.bodyH, nearT)
      if (t === null || t >= nearT) continue
      nearT = t
      const back = T.bodyR + T.wallT / 2 + 0.08
      near = { kind: "shove", slot: b.slot, point: { x: o.x + d.x * t, y: o.y + d.y * t, z: o.z + d.z * t }, blob: wallOf(b.x - hx * back, b.z - hz * back, b.y - 0.4, a) }
    }
    if (near) return near
    // mm3d-62c (pedido do Alex): o muro não nasce do chão — fica NO AR, bem
    // onde a mira aponta. O comprimento de `dir` é a distância da mira (o
    // aparelho manda boca → ponto mirado); bateu em algo antes, fica ali.
    const L = Math.max(1.6, Math.min(T.wallReach, Math.hypot(dir.x, dir.y, dir.z)))
    let cx = o.x + d.x * L
    let cy = o.y + d.y * L
    let cz = o.z + d.z * L
    let y0: number | null = null
    if (hit && hit.t <= L + 0.5) {
      if (hit.normal.y > 0.5) {
        // mirou um chão: em pé em cima dele
        cx = hit.point.x
        cz = hit.point.z
        y0 = hit.point.y
      } else {
        // mirou um lado (ilha, outro muro): encostado, do lado de quem atirou
        const back = T.wallT / 2 + 0.05
        cx = hit.point.x + hit.normal.x * back
        cy = hit.point.y
        cz = hit.point.z + hit.normal.z * back
      }
    }
    // nunca em cima de quem atira (senão empurra o próprio dono)
    const min = T.bodyR + T.wallT / 2 + 0.35
    const ox = cx - s.x
    const oz = cz - s.z
    const along = ox * hx + oz * hz
    if (along < min) {
      cx += hx * (min - along)
      cz += hz * (min - along)
    }
    return { kind: "blob", blob: wallOf(cx, cz, y0 ?? cy - T.wallH / 2, a) }
  }

  if (c === PAINT.STEP) {
    if (!s.ground) {
      // Embaixo do pé: apoia no chão de baixo se estiver perto; senão flutua
      // logo abaixo da sola (é assim que se sobe empilhando).
      const below = supportAt(world.solids, s.x, s.z, s.y + 0.05, 0.05)
      const y0 = below > s.y - T.stepH - 0.02 ? below : s.y - T.stepH - 0.02
      return { kind: "blob", blob: blobOf(c, s.x, s.z, y0, yaw) }
    }
    const hit = raycast(world.solids, o, d, T.range[PAINT.STEP])
    if (hit && hit.normal.y > 0.5 && Math.hypot(hit.point.x - s.x, hit.point.z - s.z) > T.stepR + T.bodyR * 0.6) {
      return { kind: "blob", blob: blobOf(c, hit.point.x, hit.point.z, hit.point.y, yaw) }
    }
    // Logo à frente, no chão em que está.
    const fx = s.x + Math.sin(s.facing) * 1.6
    const fz = s.z + Math.cos(s.facing) * 1.6
    const floor = supportAt(world.solids, fx, fz, s.y + 0.3, 0.05)
    return { kind: "blob", blob: blobOf(c, fx, fz, floor > s.y - 1.5 ? floor : s.gy, yaw) }
  }

  // PONTE
  const hit = raycast(world.solids, o, d, T.range[PAINT.BRIDGE])
  if (hit && hit.normal.y > 0.5 && Math.hypot(hit.point.x - s.x, hit.point.z - s.z) <= T.bridgeReach) {
    return { kind: "blob", blob: blobOf(c, hit.point.x, hit.point.z, hit.point.y - T.bridgeH * 0.5, yaw) }
  }
  // Crescer: a borda na direção da mira, na altura do pé (no ar também: pulou, a ponte sai lá em cima).
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
  const footY = s.y
  for (let k = 0.6; k <= T.bridgeReach; k += 0.35) {
    const px = s.x + hx * k
    const pz = s.z + hz * k
    const sup = supportAt(world.solids, px, pz, footY + 0.3, 0.02)
    if (sup < footY - 0.6) {
      const ahead = k + T.bridgeR * 0.55
      return { kind: "blob", blob: blobOf(c, s.x + hx * ahead, s.z + hz * ahead, footY - T.bridgeH, yaw) }
    }
  }
  return { kind: "miss" }
}

/** Tiro conta como mancha nova em `solids` (cilindro, ou muro girado, com id, cor e time). */
export function blobSolid(b: NewBlob, id: number, team: number): SolidWall {
  // mm3d-62c: tudo caixa girada — o muro em pé (fino), ponte e cama elástica deitadas (quadradas)
  const hz = b.c === PAINT.WALL ? TUNING.wallT / 2 : b.r
  return { k: 2, x: b.x, z: b.z, y0: b.y0, y1: b.y1, hx: b.r, hz, a: b.a ?? 0, b: id, c: b.c, team }
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
