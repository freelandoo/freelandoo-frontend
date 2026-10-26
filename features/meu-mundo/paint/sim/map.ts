// features/meu-mundo/paint/sim/map.ts — PAINT (mm3d-35): o mapa das ilhas.
//
// UM mapa fixo (igual em toda partida, navegador e sala). Dois lados
// espelhados em x: o time 0 nasce a oeste (x < 0), o time 1 a leste.
//
//  - Cada lado é uma TORRE: a ilha-base (y 0) e 11 ilhas em espiral em volta
//    dela, cada uma mais alta, até o TOPO sobre a base (onde abre o portal do
//    time). Entre uma ilha e a próxima há um vão (precisa de ponte turquesa)
//    e/ou um degrau alto demais para o pulo (precisa de degrau amarelo).
//  - No meio (x = 0) a COLUNA DISPUTADA: 4 ilhas com mais gatinhos, longe das
//    duas torres (ponte comprida).
//  - Ilhotas laterais com um gatinho cada.
//  - A ilha do chefão fica longe (z 320), fora da vista da arena.
//
// Gatinhos: 18 de cada lado + 12 no meio = 48; o portal pede 20 do time, então
// quem só ficar no próprio lado não chega lá.

import { TUNING } from "./tuning"

export interface Vec3 {
  x: number
  y: number
  z: number
}

/** Cilindro vertical (ilha, pilar, mancha de tinta) — `y1` é o topo (o chão). */
export interface SolidCyl {
  k: 0
  x: number
  z: number
  y0: number
  y1: number
  r: number
  /** Mancha de tinta: id (a sala dá; o aparelho usa negativo enquanto prevê), cor e time. */
  b?: number
  c?: number
  team?: number
}
/** Caixa alinhada aos eixos (caixote, muro). */
export interface SolidBox {
  k: 1
  x: number
  z: number
  y0: number
  y1: number
  hx: number
  hz: number
}
export type Solid = SolidCyl | SolidBox

export type IslandKind = "base" | "path" | "branch" | "summit" | "center" | "boss"
export interface Island {
  id: number
  kind: IslandKind
  /** Time dono do lado (-1 = meio/chefão). */
  team: number
  x: number
  y: number
  z: number
  r: number
  /** Profundidade da pedra embaixo (desenho). A colisão usa `colliderDepth`. */
  depth: number
}
export interface PaintProp {
  kind: "pillar" | "crate"
  x: number
  y: number
  z: number
  /** Raio (pilar) ou meia-largura (caixote). */
  s: number
  h: number
  rot: number
}
export interface PaintCat {
  id: number
  x: number
  y: number
  z: number
  /** Branco ou preto (o NPC do Cat Demon) e para onde olha. */
  skin: 0 | 1
  facing: number
}
export interface PaintCapsule {
  id: number
  c: 0 | 1 | 2
  x: number
  y: number
  z: number
}
export interface PaintBase {
  team: number
  island: number
  /** Lugares de nascer (um por vaga do time) e para onde olham. */
  spawns: { x: number; y: number; z: number; facing: number }[]
}
export interface PaintMap {
  islands: Island[]
  props: PaintProp[]
  /** Colisão parada (ilhas + pilares + caixotes). Tinta entra por cima, na partida. */
  solids: Solid[]
  cats: PaintCat[]
  capsules: PaintCapsule[]
  bases: PaintBase[]
  portals: Vec3[]
  boss: { x: number; y: number; z: number; island: number; spawns: { x: number; y: number; z: number; facing: number }[] }
}

/** A pedra que colide embaixo do topo (o desenho desce mais). */
const COLLIDER_DEPTH = 2.6

const COLUMN_X = 34
const SPIRAL_R = 14
const SPIRAL_STEP = 0.95
/** Subida de cada ilha da espiral: alterna "vão com pulo" e "degrau alto". */
const SPIRAL_DY = [1.2, 3.0, 1.4, 3.4, 1.2, 3.2, 1.6, 3.6, 1.2, 3.4, 1.6]
const SPIRAL_RADII = [4.2, 3.6, 4.4, 3.4, 4.0, 3.6, 4.4, 3.4, 4.0, 3.6, 4.2]
const BRANCH_AT = [2, 5, 8, 10]
const SUMMIT_Y = 30
const CENTER_Y = [7, 14, 21, 28]
const CENTER_Z = [5, -5, 5, -5]
const BOSS = { x: 0, y: 60, z: 320, r: 18 }

const round = (v: number) => Math.round(v * 1000) / 1000

/** Pseudo-aleatório fixo por número (enfeites do mapa). */
function hash01(n: number) {
  let h = (n * 2654435761) >>> 0
  h ^= h >>> 16
  h = Math.imul(h, 2246822519) >>> 0
  h ^= h >>> 13
  return (h >>> 0) / 4294967296
}

export function buildPaintMap(): PaintMap {
  const islands: Island[] = []
  const props: PaintProp[] = []
  const cats: PaintCat[] = []
  const capsules: PaintCapsule[] = []
  const bases: PaintBase[] = []
  const portals: Vec3[] = []
  let catSeq = 0
  let capSeq = 0

  const island = (kind: IslandKind, team: number, x: number, y: number, z: number, r: number) => {
    const isl: Island = { id: islands.length, kind, team, x: round(x), y: round(y), z: round(z), r, depth: round(r * 1.25 + 1.5) }
    islands.push(isl)
    return isl
  }
  /** Ponto no topo da ilha: ângulo e fração do raio. */
  const on = (isl: Island, ang: number, f: number): Vec3 => ({ x: round(isl.x + Math.sin(ang) * isl.r * f), y: isl.y, z: round(isl.z + Math.cos(ang) * isl.r * f) })
  const cat = (isl: Island, ang: number, f: number) => {
    const p = on(isl, ang, f)
    cats.push({ id: catSeq++, ...p, skin: (catSeq % 3 === 0 ? 1 : 0) as 0 | 1, facing: round(hash01(catSeq * 7 + 3) * Math.PI * 2) })
  }
  const capsule = (isl: Island, c: 0 | 1 | 2, ang: number, f: number) => {
    const p = on(isl, ang, f)
    capsules.push({ id: capSeq++, c, ...p })
  }
  /** Enfeites na borda (pilar com corda, caixote) — longe do meio, onde ficam gatinho e cápsula. */
  const decorate = (isl: Island) => {
    const n = isl.r >= 8 ? 4 : isl.r >= 4 ? 2 : 1
    for (let i = 0; i < n; i++) {
      const a = hash01(isl.id * 31 + i * 7) * Math.PI * 2
      const p = on(isl, a, 0.78)
      if (hash01(isl.id * 13 + i) < 0.6) props.push({ kind: "pillar", ...p, s: 0.32, h: 1.3 + round(hash01(isl.id + i * 5) * 0.5), rot: 0 })
      else props.push({ kind: "crate", ...p, s: 0.45, h: 0.9, rot: round(a) })
    }
  }

  for (const team of [0, 1]) {
    const sx = team === 0 ? -1 : 1
    const cx = COLUMN_X * sx
    // A espiral começa virada para o meio do mapa e gira no sentido que
    // espelha entre os times.
    const a0 = team === 0 ? Math.PI / 2 : -Math.PI / 2
    const turn = team === 0 ? 1 : -1

    const base = island("base", team, cx, 0, 0, 9)
    decorate(base)
    const facingIn = round(Math.atan2(-sx, 0))
    const spawns = [0, 1, 2].map((i) => ({ x: round(cx - sx * 2.5), y: 0, z: round((i - 1) * 2.2), facing: facingIn }))
    bases.push({ team, island: base.id, spawns })
    cat(base, a0 + Math.PI * 0.8, 0.55)
    cat(base, a0 - Math.PI * 0.8, 0.55)
    capsule(base, 0, a0 + Math.PI * 0.35, 0.6)
    capsule(base, 1, a0 + Math.PI, 0.45)
    capsule(base, 2, a0 - Math.PI * 0.35, 0.6)

    let y = 0
    for (let i = 0; i < SPIRAL_DY.length; i++) {
      y += SPIRAL_DY[i]
      const ang = a0 + turn * SPIRAL_STEP * (i + 1)
      const r = SPIRAL_RADII[i]
      const isl = island("path", team, cx + Math.sin(ang) * SPIRAL_R, y, Math.cos(ang) * SPIRAL_R, r)
      decorate(isl)
      cat(isl, ang + Math.PI * 0.5, 0.35)
      capsule(isl, (i % 3) as 0 | 1 | 2, ang - Math.PI * 0.5, 0.4)
      if (BRANCH_AT.includes(i)) {
        const br = island("branch", team, cx + Math.sin(ang) * (SPIRAL_R + r + 6.5), y + 1.4, Math.cos(ang) * (SPIRAL_R + r + 6.5), 2.4)
        cat(br, 0, 0)
      }
    }
    const summit = island("summit", team, cx, SUMMIT_Y, 0, 6)
    decorate(summit)
    cat(summit, a0 + Math.PI, 0.5)
    portals.push({ x: round(cx), y: SUMMIT_Y, z: 0 })
  }

  // Coluna disputada no meio.
  for (let i = 0; i < CENTER_Y.length; i++) {
    const isl = island("center", -1, 0, CENTER_Y[i], CENTER_Z[i], 5)
    decorate(isl)
    for (let k = 0; k < 3; k++) cat(isl, (k / 3) * Math.PI * 2 + i, 0.55)
    capsule(isl, (i % 3) as 0 | 1 | 2, i * 1.3 + Math.PI / 3, 0.15)
  }

  // Ilha do chefão (provisório até a etapa do chefão).
  const bossIsl = island("boss", -1, BOSS.x, BOSS.y, BOSS.z, BOSS.r)
  const bossSpawns = [0, 1].flatMap((team) => {
    const sx = team === 0 ? -1 : 1
    return [0, 1, 2].map((i) => ({ x: round(BOSS.x + sx * 12), y: BOSS.y, z: round(BOSS.z + (i - 1) * 2.2), facing: round(Math.atan2(-sx, 0)) }))
  })
  for (const [i, c] of ([0, 1, 2, 1, 1, 2] as const).entries()) {
    const a = (i / 6) * Math.PI * 2 + 0.4
    capsules.push({ id: capSeq++, c, x: round(BOSS.x + Math.sin(a) * 13), y: BOSS.y, z: round(BOSS.z + Math.cos(a) * 13) })
  }

  const solids: Solid[] = []
  for (const isl of islands) solids.push({ k: 0, x: isl.x, z: isl.z, y0: round(isl.y - COLLIDER_DEPTH), y1: isl.y, r: isl.r })
  for (const p of props) {
    if (p.kind === "pillar") solids.push({ k: 0, x: p.x, z: p.z, y0: p.y, y1: round(p.y + p.h), r: p.s })
    else solids.push({ k: 1, x: p.x, z: p.z, y0: p.y, y1: round(p.y + p.h), hx: p.s, hz: p.s })
  }

  return {
    islands,
    props,
    solids,
    cats,
    capsules,
    bases,
    portals,
    boss: { x: BOSS.x, y: BOSS.y, z: BOSS.z, island: bossIsl.id, spawns: bossSpawns },
  }
}

/** Caiu nas nuvens? (abaixo da arena, ou abaixo da ilha do chefão estando lá.) */
export function fellOut(y: number, inBoss: boolean) {
  return y < (inBoss ? BOSS.y : 0) + TUNING.fallY
}

/** Lugar de nascer: base do time (ou ilha do chefão), vaga dentro do time. */
export function spawnPoint(map: PaintMap, team: number, slotInTeam: number, inBoss: boolean) {
  if (inBoss) return map.boss.spawns[team * 3 + (slotInTeam % 3)]
  return map.bases[team].spawns[slotInTeam % 3]
}
