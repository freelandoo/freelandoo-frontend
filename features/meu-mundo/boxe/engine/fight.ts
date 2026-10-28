// features/meu-mundo/boxe/engine/fight.ts — ARENA DE BOXE (mm3d-44): a luta ao vivo.
//
// mm3d-44: a pessoa CONTROLA o lutador (anda, ATACAR solta um combo sorteado,
// ESQUIVAR). Quem decide é a sala (freelandoo-backend/src/utils/meuMundoBoxe.js,
// classe Match): ela manda a TABELA dos golpes na largada e o ESTADO a cada
// passo (posições, sangue, fôlego, a ação de cada um e os eventos). Os códigos
// abaixo são os MESMOS do servidor; a tabela vem de lá (fonte única).

import type { BoxeCondition, BoxeRecord, BoxeStrategy, BoxeView } from "../../types"

export const EV = { BELL: 0, BREAK: 1, PUNCH: 2, DOWN: 3, COUNT: 4, UP: 5, KO: 6, STUN: 7, END: 8 } as const
export const RES = { MISS: 0, BLOCK: 1, SLIP: 2, HIT: 3, CLEAN: 4 } as const
export const ACT = { NONE: 0, COMBO: 1, DODGE: 2, LIGHT: 3, HEAVY: 4, STAGGER: 5, BLOCK: 6, DOWN: 7, RISE: 8, WIN: 9, LOSE: 10, WARM: 11 } as const
export const PH = { INTRO: 0, ROUND: 1, BREAK: 2, COUNT: 3, END: 4 } as const

/** Um trecho de clipe: [from, to] em 0–1 do clipe, `dur` s no ritmo 1. */
export interface ClipPart {
  clip: string
  from: number
  to: number
  dur: number
}

/** Tabela da sala (Match.table()). */
export interface BoxeTable {
  fps: number
  /** Pedaços de combo; `hits` = [s desde o começo do pedaço, mão 0 esq./1 dir.]. */
  pieces: (ClipPart & { hits: [number, number][] })[]
  weights: number[]
  maxPieces: number
  dodge: ClipPart
  react: Record<"block" | "light" | "heavy" | "stagger", ClipPart>
  ring: number
  minSep: number
  reach: number
  corners: { x: number; z: number }[]
  roundS: number
  breakS: number
  rounds: number
  riseS: number
}

/**
 * Um lutador no estado (Match.snapshot()): x, z, sangue, fôlego, sangue
 * máximo, ação, nº da ação, início, ritmo, id do aparelho, pedaços do combo,
 * pernas (m/s), ritmo do ataque, golpes dados, acertados, quedas provocadas.
 */
export type FighterRow = [number, number, number, number, number, number, number, number, number, number, number[], number, number, number, number, number]

export interface Snap {
  t: number
  /** [fase, round, s que faltam no round/intervalo]. */
  ph: [number, number, number]
  /** [quem está no chão, contagem] ou null. */
  cnt: [number, number] | null
  f: [FighterRow, FighterRow]
  /** Eventos desde o último estado: [t, código, quem, …]. */
  ev: number[][]
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
  table: BoxeTable
  /** O 1º estado (antes do 1º passo). */
  snap: Snap
}

/** Lutador lido de uma linha do estado. */
export interface FighterAt {
  x: number
  z: number
  blood: number
  stam: number
  bloodMax: number
  act: number
  seq: number
  t0: number
  rate: number
  cid: number
  pieces: number[]
  foot: number
  atkRate: number
  thrown: number
  landed: number
  kd: number
}

export function fighterAt(r: FighterRow): FighterAt {
  return { x: r[0], z: r[1], blood: r[2], stam: r[3], bloodMax: r[4], act: r[5], seq: r[6], t0: r[7], rate: r[8], cid: r[9], pieces: r[10], foot: r[11], atkRate: r[12], thrown: r[13], landed: r[14], kd: r[15] }
}

/** Sorteio de um combo (o aparelho prevê e manda; a sala confere). */
export function randomCombo(table: BoxeTable, n: number, rnd: () => number = Math.random): number[] {
  const w = table.weights
  const sum = w.reduce((a, b) => a + b, 0)
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    let k = 0
    for (let tries = 0; tries < 4; tries++) {
      let r = rnd() * sum
      k = 0
      while (k < w.length - 1 && (r -= w[k]) > 0) k++
      if (k !== out[out.length - 1]) break
    }
    out.push(k)
  }
  return out
}

/** Duração do combo (s) no ritmo `rate`. */
export const comboDur = (table: BoxeTable, pieces: number[], rate: number) => pieces.reduce((s, p) => s + (table.pieces[p]?.dur ?? 0), 0) / Math.max(0.1, rate)
