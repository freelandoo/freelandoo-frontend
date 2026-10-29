// features/meu-mundo/gincana/sim/race.ts — GINCANA (mm3d-47): a prova.
//
// Quem corre e como cada um é movido:
//  - "local": o corpo deste aparelho (intenção do controle);
//  - "bot": computador (bots.ts), rodado aqui;
//  - "remote": alguém de fora (a pose chega pela rede; aqui só pisa nos
//    ladrilhos e empurra os outros).
// No treino o aparelho tem o "local" e os computadores; na sala, os
// jogadores são "remote" e os computadores "bot"; no multiplayer, o aparelho
// tem o "local" e todo o resto é "remote" (os computadores vêm da sala).
//
// A ordem de chegada é de quem cruza primeiro; quem não chegou no tempo
// limite fica pela distância. A prova acaba quando todos que contam (os de
// fora e o local; computador não segura a prova) chegaram, caíram fora ou o
// tempo acabou.

import { CHECKPOINTS, FINISH_Z, GINCANA, TILES, TILE_TIME, ballsAt } from "./course"
import { ANIM, IDLE_INTENT, MODE, newRunner, runnerAnim, separate, stepRunner, type RunEvent, type RunIntent, type RunWorld, type Runner } from "./body"
import { botIntent, newBrain, type BotBrain } from "./bots"

export type RunnerCtl = "local" | "bot" | "remote"

export interface RaceSeatDef {
  slot: number
  ctl: RunnerCtl
}

/** Pose que viaja na rede (e que o "remote" recebe). */
export interface RunnerPose {
  x: number
  y: number
  z: number
  f: number
  a: number
  /** Posto alcançado. */
  cp: number
  /** Tempo da chegada (−1 = correndo). */
  fin: number
}

export interface StandingRow {
  slot: number
  /** Tempo de chegada (−1 = não chegou). */
  fin: number
  /** Distância percorrida (m) para quem não chegou. */
  dist: number
}

export class GincanaRace {
  readonly seed: number
  /** s da prova (negativo na contagem). */
  t: number
  readonly runners: Runner[] = []
  readonly ctl: RunnerCtl[] = []
  readonly brains: (BotBrain | null)[] = []
  /** Quem saiu (aba fechada, rede caiu): para de contar. */
  readonly gone: boolean[] = []
  readonly world: RunWorld
  /** Ordem de chegada (vagas). */
  readonly order: number[] = []
  private readonly bySlot = new Map<number, number>()

  constructor(seed: number, seats: RaceSeatDef[], countdown: number = GINCANA.countdown) {
    this.seed = seed >>> 0
    this.t = -countdown
    this.world = { t: this.t, seed: this.seed, tiles: new Float64Array(TILES.length).fill(-1), balls: [] }
    for (const s of seats) {
      this.bySlot.set(s.slot, this.runners.length)
      this.runners.push(newRunner(s.slot))
      this.ctl.push(s.ctl)
      this.brains.push(s.ctl === "bot" ? newBrain(this.seed, s.slot) : null)
      this.gone.push(false)
    }
  }

  runner(slot: number): Runner | null {
    const i = this.bySlot.get(slot)
    return i === undefined ? null : this.runners[i]
  }

  /** Um passo fixo; `local` = intenção do corpo deste aparelho. */
  step(local: RunIntent = IDLE_INTENT, out: RunEvent[] | null = null, dt: number = GINCANA.step) {
    this.t += dt
    const w = this.world
    w.t = this.t
    ballsAt(this.seed, this.t, w.balls)
    // ladrilhos que já voltaram
    for (let i = 0; i < w.tiles.length; i++) if (w.tiles[i] >= 0 && this.t - w.tiles[i] >= TILE_TIME.warn + TILE_TIME.gone) w.tiles[i] = -1
    for (const b of this.runners) {
      b.px = b.x
      b.py = b.y
      b.pz = b.z
    }
    if (this.t < 0) return
    for (let i = 0; i < this.runners.length; i++) {
      const b = this.runners[i]
      const c = this.ctl[i]
      if (this.gone[i]) continue
      if (c === "remote") continue
      const it = c === "local" ? local : botIntent(this.brains[i]!, b, w, dt)
      const wasFin = b.fin >= 0
      stepRunner(b, it, w, out, dt)
      if (!wasFin && b.fin >= 0) this.order.push(b.slot)
    }
    // ninguém atravessa ninguém (quem é movido aqui sai; o de fora não)
    for (let i = 0; i < this.runners.length; i++) {
      if (this.ctl[i] === "remote" || this.gone[i]) continue
      for (let j = 0; j < this.runners.length; j++) {
        if (i === j || this.gone[j]) continue
        if (j < i && this.ctl[j] !== "remote") continue
        separate(this.runners[i], this.runners[j], this.ctl[j] !== "remote")
      }
    }
  }

  /** Avança até o tempo `to` em passos fixos (devolve quantos deu). */
  advance(to: number, local: RunIntent = IDLE_INTENT, out: RunEvent[] | null = null, maxSteps = 30) {
    let n = 0
    while (this.t + GINCANA.step <= to + 1e-9 && n < maxSteps) {
      this.step(n === 0 ? local : { ...local, jump: false, dive: false }, out)
      n++
    }
    return n
  }

  /** Pose de alguém de fora (rede). Pisa nos ladrilhos como os outros. */
  setRemote(slot: number, p: RunnerPose) {
    const i = this.bySlot.get(slot)
    if (i === undefined) return
    const b = this.runners[i]
    b.x = p.x
    b.y = p.y
    b.z = p.z
    b.facing = p.f
    b.cp = p.cp
    b.mode = p.a === ANIM.WATER ? MODE.WATER : p.a === ANIM.WIN ? MODE.DONE : p.a === ANIM.KNOCK ? MODE.KNOCK : MODE.RUN
    b.ground = p.a === ANIM.IDLE || p.a === ANIM.RUN || p.a === ANIM.WIN || p.a === ANIM.SLIDE || p.a === ANIM.RISE
    if (p.fin >= 0 && b.fin < 0) {
      b.fin = p.fin
      this.order.push(slot)
    }
    if (b.ground && b.z > TILES[0].z - 2 && b.z < TILES[TILES.length - 1].z + 2) {
      for (let k = 0; k < TILES.length; k++) {
        const q = TILES[k]
        if (Math.abs(b.x - q.x) <= q.h && Math.abs(b.z - q.z) <= q.h && this.world.tiles[k] < 0) this.world.tiles[k] = this.t
      }
    }
  }

  setGone(slot: number) {
    const i = this.bySlot.get(slot)
    if (i !== undefined) this.gone[i] = true
  }

  pose(slot: number): RunnerPose | null {
    const b = this.runner(slot)
    if (!b) return null
    return { x: b.x, y: b.y, z: b.z, f: b.facing, a: runnerAnim(b), cp: b.cp, fin: b.fin }
  }

  /** Classificação: quem chegou pela ordem; o resto pela distância (posto e z). */
  standings(): StandingRow[] {
    const rows: StandingRow[] = []
    for (const slot of this.order) {
      const b = this.runner(slot)!
      rows.push({ slot, fin: b.fin, dist: FINISH_Z })
    }
    const rest = this.runners
      .filter((b) => b.fin < 0)
      .map((b) => ({ slot: b.slot, fin: -1, dist: Math.max(CHECKPOINTS[b.cp].z, Math.min(FINISH_Z, b.z)) + 0 }))
      .sort((a, b) => b.dist - a.dist || a.slot - b.slot)
    return rows.concat(rest)
  }

  /** Acabou: todos os que contam chegaram (ou saíram) ou o tempo acabou. */
  over(): boolean {
    if (this.t >= GINCANA.timeLimit) return true
    let any = false
    for (let i = 0; i < this.runners.length; i++) {
      if (this.ctl[i] === "bot" || this.gone[i]) continue
      any = true
      if (this.runners[i].fin < 0) return false
    }
    return any
  }
}
