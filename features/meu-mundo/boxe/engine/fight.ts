// features/meu-mundo/boxe/engine/fight.ts — ARENA DE BOXE (mm3d-43): a linha do tempo.
//
// A luta é calculada INTEIRA no servidor (freelandoo-backend/src/utils/
// meuMundoBoxe.js) na largada — ela mexe na vida da pessoa. O aparelho recebe
// a linha do tempo e só desenha: eventos (golpe com o resultado, queda,
// contagem, levantou, nocaute, sinos) e amostras a cada 0,2 s de posição,
// sangue e fôlego dos dois. Os códigos abaixo são os MESMOS do servidor.

import type { BoxeCondition, BoxeRecord, BoxeStrategy, BoxeView } from "../../types"

export const EV = { BELL: 0, BREAK: 1, PUNCH: 2, DOWN: 3, COUNT: 4, UP: 5, KO: 6, STUN: 7, END: 8 } as const
export const RES = { MISS: 0, BLOCK: 1, SLIP: 2, HIT: 3, CLEAN: 4 } as const
export const PUNCH_KINDS = ["jab", "cross", "hook", "upper", "combo"] as const
export type PunchKind = (typeof PUNCH_KINDS)[number]
/** Tempo de cada golpe (s) e onde cai o impacto — espelho de PUNCHES do servidor. */
export const PUNCHES: Record<PunchKind, { dur: number; hits: number[] }> = {
  jab: { dur: 0.5, hits: [0.2] },
  cross: { dur: 0.62, hits: [0.27] },
  hook: { dur: 0.72, hits: [0.34] },
  upper: { dur: 0.78, hits: [0.36] },
  combo: { dur: 1.55, hits: [0.22, 0.6, 1.0] },
}
/** Meia largura útil do ringue (m) e onde cada um fica no intervalo. */
export const RING = 2.7
export const CORNERS = [
  { x: -1.6, z: -0.4 },
  { x: 1.6, z: 0.4 },
] as const

/** Um evento: [t, quem, código, ...dados]. */
export type FightEvent = number[]

export interface Fight {
  v: number
  seed: number
  sample: number
  rounds: number
  roundS: number
  breakS: number
  /** Duração do desenho (até a sala fechar a luta). */
  dur: number
  ev: FightEvent[]
  /** Por lutador: [x, z, sangue, fôlego] a cada `sample` s, de t = 0. */
  smp: [number[], number[]]
  cards: [number, number][]
  result: { winner: number; method: "ko" | "tko" | "points" | "draw"; round: number; t: number; score: [number, number] }
  stats: { thrown: number; landed: number; kd: number; dmg: number; taken: number }[]
  view: (BoxeView & { conditions: BoxeCondition[]; strategy: BoxeStrategy })[]
}

export interface Corner {
  slot: number
  name: string
  body: string
  look: string
  cpu: boolean
  strategy: BoxeStrategy
  record: BoxeRecord | null
  view: BoxeView & { conditions: BoxeCondition[]; strategy: BoxeStrategy }
}

export interface FightStart {
  me: number
  /** Multiplayer sem ninguém: virou luta contra o computador. */
  nobody: boolean
  /** s de apresentação antes do 1º sino. */
  intro: number
  corners: [Corner, Corner]
  fight: Fight
}

export interface FighterAt {
  x: number
  z: number
  blood: number
  stam: number
}

/** Posição, sangue e fôlego de `who` em `t` (interpolado entre as amostras). */
export function sampleAt(f: Fight, who: number, t: number): FighterAt {
  const a = f.smp[who]
  const n = a.length / 4
  const u = Math.max(0, Math.min(n - 1, t / f.sample))
  const i = Math.min(n - 2, Math.floor(u))
  if (i < 0) return { x: a[0], z: a[1], blood: a[2], stam: a[3] }
  const k = u - i
  const j = i * 4
  const l = (o: number) => a[j + o] + (a[j + 4 + o] - a[j + o]) * k
  return { x: l(0), z: l(1), blood: l(2), stam: l(3) }
}

/** Fases do relógio: apresentação, round (com o relógio que conta) ou intervalo. */
export interface Phase {
  kind: "intro" | "round" | "break" | "end"
  round: number
  /** s que faltam no round (para a contagem regressiva do placar) ou no intervalo. */
  left: number
  /** s desde o começo do intervalo (para andar até o canto). */
  since: number
}

/** Em que parte da luta está `t` (o relógio do round para durante a contagem). */
export function phaseAt(f: Fight, t: number): Phase {
  if (t < 0) return { kind: "intro", round: 1, left: f.roundS, since: 0 }
  let round = 1
  let bell = 0
  let brk: number | null = null
  let paused = 0
  let down: number | null = null
  for (const e of f.ev) {
    if (e[0] > t) break
    const c = e[2]
    if (c === EV.BELL) {
      round = e[1]
      bell = e[0]
      brk = null
      paused = 0
    } else if (c === EV.BREAK) brk = e[0]
    else if (c === EV.DOWN) down = e[0]
    else if (c === EV.UP && down !== null) {
      paused += e[0] - down
      down = null
    } else if (c === EV.END || c === EV.KO) return { kind: "end", round, left: 0, since: t - e[0] }
  }
  if (brk !== null) return { kind: "break", round, left: Math.max(0, f.breakS - (t - brk)), since: t - brk }
  const run = (down !== null ? down : t) - bell - paused
  return { kind: "round", round, left: Math.max(0, f.roundS - run), since: 0 }
}

/** Contagem do árbitro agora (0 = ninguém no chão). */
export function countAt(f: Fight, t: number): { who: number; n: number; down: boolean } {
  let out = { who: -1, n: 0, down: false }
  for (const e of f.ev) {
    if (e[0] > t) break
    if (e[2] === EV.DOWN) out = { who: e[1], n: 0, down: true }
    else if (e[2] === EV.COUNT) out = { who: e[1], n: e[3], down: true }
    else if (e[2] === EV.UP) out = { who: -1, n: 0, down: false }
  }
  return out
}

/** Golpes dados e acertados por cada um até `t` (o placar do intervalo). */
export function tallyAt(f: Fight, t: number) {
  const out = [
    { thrown: 0, landed: 0, kd: 0 },
    { thrown: 0, landed: 0, kd: 0 },
  ]
  for (const e of f.ev) {
    if (e[0] > t) break
    if (e[2] === EV.PUNCH) {
      out[e[1]].thrown++
      if (e[4] >= RES.HIT) out[e[1]].landed++
    } else if (e[2] === EV.DOWN) out[1 - e[1]].kd++
  }
  return out
}
