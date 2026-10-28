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
//
// mm3d-46 (pedido do Alex): o DOBRO de ilhas com os mesmos gatinhos — galho
// em toda ilha da espiral, duas ASAS por torre (cadeia baixa no norte e no sul
// indo até o meio) e mais ilhas no meio. As ilhas novas entram DEPOIS das
// antigas (ids, enfeites e gatinhos de antes não mudam). Gatinhos por modo:
// 2×2 tem o dobro e 3×3 o triplo (mais gente pegando). Ícones da Freelandoo
// (cápsula da cor MURO) nas bases e nas asas.

import { PAINT_MODES, TUNING, type PaintMode } from "./tuning"

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
/** Caixa alinhada aos eixos (caixote). */
export interface SolidBox {
  k: 1
  x: number
  z: number
  y0: number
  y1: number
  hx: number
  hz: number
}
/**
 * Caixa girada em y (o MURO, mm3d-46): `hx` ao longo do muro, `hz` a meia
 * espessura, `a` = para onde a frente olha (como `facing`). Sempre tinta.
 */
export interface SolidWall {
  k: 2
  x: number
  z: number
  y0: number
  y1: number
  hx: number
  hz: number
  a: number
  b?: number
  c?: number
  team?: number
}
export type Solid = SolidCyl | SolidBox | SolidWall

export type IslandKind = "base" | "path" | "branch" | "summit" | "center" | "wing" | "boss"
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
  /** 3 = ícone da Freelandoo (munição do muro). */
  c: 0 | 1 | 2 | 3
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
const BOSS = { x: 0, y: 60, z: 320, r: 24 } // mm3d-38c: maior para o chefão de 10 m
/**
 * Asa (mm3d-46): cadeia baixa do lado norte de cada torre até o meio, em
 * coordenadas do time 0 (x espelha para o time 1, z espelha para o sul).
 * A última ilha é do meio (time -1) e só nasce uma vez por lado.
 */
const WING: [number, number, number, number][] = [
  [-41, 33, 2, 3.6],
  [-32, 38, 3.6, 3.2],
  [-23, 34, 5.4, 3.6],
  [-14.5, 39, 3.8, 3],
  [-7, 33.5, 6.4, 3.4],
]
const WING_JOINT: [number, number, number, number] = [0, 39, 8.2, 4.2]
/** Ilhas novas do meio (mm3d-46): duas baixas e duas médias, norte e sul. */
const CENTER_EXTRA: [number, number, number][] = [
  [2.5, 16.5, 4],
  [12, 22, 3.4],
]

const round = (v: number) => Math.round(v * 1000) / 1000

/** Pseudo-aleatório fixo por número (enfeites do mapa). */
function hash01(n: number) {
  let h = (n * 2654435761) >>> 0
  h ^= h >>> 16
  h = Math.imul(h, 2246822519) >>> 0
  h ^= h >>> 13
  return (h >>> 0) / 4294967296
}

export function buildPaintMap(mode: PaintMode = "solo"): PaintMap {
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
  const capsule = (isl: Island, c: PaintCapsule["c"], ang: number, f: number) => {
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

  // ── mm3d-46: o dobro de ilhas (depois das antigas: nada de antes muda) ──
  for (const team of [0, 1]) {
    const sx = team === 0 ? -1 : 1
    const cx = COLUMN_X * sx
    const a0 = team === 0 ? Math.PI / 2 : -Math.PI / 2
    const turn = team === 0 ? 1 : -1
    // galho em toda ilha da espiral que ainda não tinha
    let y = 0
    for (let i = 0; i < SPIRAL_DY.length; i++) {
      y += SPIRAL_DY[i]
      if (BRANCH_AT.includes(i)) continue
      const ang = a0 + turn * SPIRAL_STEP * (i + 1)
      const d = SPIRAL_R + SPIRAL_RADII[i] + 6.5
      const br = island("branch", team, cx + Math.sin(ang) * d, y + 1.4, Math.cos(ang) * d, 2.4)
      decorate(br)
    }
    // asas norte e sul
    const base = islands[bases[team].island]
    capsule(base, 3, a0, 0.7)
    for (const sz of [1, -1]) {
      WING.forEach(([wx, wz, wy, wr], i) => {
        const isl = island("wing", team, -wx * sx, wy, wz * sz, wr)
        decorate(isl)
        if (i === 2) capsule(isl, 3, 0, 0)
        else capsule(isl, (i % 3) as 0 | 1 | 2, Math.PI * (0.25 + i * 0.4), 0.45)
      })
    }
  }
  for (const sz of [1, -1]) {
    const [jx, jz, jy, jr] = WING_JOINT
    const joint = island("center", -1, jx, jy, jz * sz, jr)
    decorate(joint)
    capsule(joint, 3, 0, 0)
    for (const [ey, ez, er] of CENTER_EXTRA) {
      const isl = island("center", -1, 0, ey, ez * sz, er)
      decorate(isl)
      capsule(isl, ((ey | 0) % 3) as 0 | 1 | 2, Math.PI / 2, 0.4)
    }
  }

  // Gatinhos a mais por modo (mm3d-46): cada rodada põe outros 48 (18 por lado
  // + 12 no meio, espelhados) espalhados pelas ilhas, inclusive as novas.
  const rounds = PAINT_MODES[mode]
  const side = [0, 1].map((team) => islands.filter((i) => i.team === team && i.kind !== "base"))
  const middle = islands.filter((i) => i.kind === "center")
  for (let k = 1; k < rounds; k++) {
    for (let j = 0; j < 18; j++) {
      const at = (k * 5 + j * 2) % side[0].length
      const ang = j * 2.39996 + k * 1.1
      cat(side[0][at], ang, 0.42)
      cat(side[1][at], -ang, 0.42)
    }
    for (let j = 0; j < 12; j++) cat(middle[(k * 3 + j) % middle.length], j * 2.39996 + k * 0.7, 0.45)
  }

  // Ilha do chefão (provisório até a etapa do chefão).
  const bossIsl = island("boss", -1, BOSS.x, BOSS.y, BOSS.z, BOSS.r)
  const bossSpawns = [0, 1].flatMap((team) => {
    const sx = team === 0 ? -1 : 1
    return [0, 1, 2].map((i) => ({ x: round(BOSS.x + sx * 12), y: BOSS.y, z: round(BOSS.z + (i - 1) * 2.2), facing: round(Math.atan2(-sx, 0)) }))
  })
  for (const [i, c] of ([0, 1, 2, 1, 1, 2] as const).entries()) {
    const a = (i / 6) * Math.PI * 2 + 0.4
    capsules.push({ id: capSeq++, c, x: round(BOSS.x + Math.sin(a) * 17), y: BOSS.y, z: round(BOSS.z + Math.cos(a) * 17) })
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
