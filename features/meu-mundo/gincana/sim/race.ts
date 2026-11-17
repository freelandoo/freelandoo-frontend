// features/meu-mundo/gincana/sim/race.ts — GINCANA (mm3d-47): a prova.
//
// Quem corre e como cada um é movido:
//  - "local": o corpo deste aparelho (intenção do controle);
//  - "bot": computador (bots.ts), rodado aqui;
//  - "remote": alguém de fora (a pose chega pela rede; aqui só pisa nos
//    ladrilhos, abre portas e empurra os outros).
// No treino o aparelho tem o "local" e os computadores; na sala, os
// jogadores são "remote" e os computadores "bot"; no multiplayer, o aparelho
// tem o "local" e todo o resto é "remote" (os computadores vêm da sala).
//
// Gincana 2.0 (2026-11-16): a prova é de uma FASE (courses.ts). CLASSIFICAÇÃO
// como nas provas de corrida dos party games: só os primeiros `quota`
// (GINCANA.qualify das vagas) passam — quando esse tanto chega, a prova fecha
// e o resto está eliminado. AGARRAR: quem segura a vaga de alguém na frente
// (pose `g`) deixa os dois devagar; o efeito em quem é segurado é aplicado por
// quem move aquele corpo (o aparelho dele ou a sala, para os computadores) —
// por isso o `g` viaja na pose e nada mais precisa de mensagem nova.
//
// A ordem de chegada é de quem cruza primeiro; quem não chegou fica pela
// distância. A prova acaba quando a vaga dos classificados enche, quando todos
// que contam (os de fora e o local; computador não segura a prova) chegaram ou
// saíram, ou o tempo acabou.

import { GINCANA, ballsAt, onTile, type Course } from "./course"
import { courseOf } from "./courses"
import { ANIM, IDLE_INTENT, MODE, knock, newRunner, newWorld, runnerAnim, separate, stepRunner, type RunEvent, type RunIntent, type RunWorld, type Runner } from "./body"
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
  /** Vaga que está agarrando (−1 = ninguém). */
  g?: number
}

export interface StandingRow {
  slot: number
  /** Tempo de chegada (−1 = não chegou). */
  fin: number
  /** Distância percorrida (m) para quem não chegou. */
  dist: number
  /** Classificou (chegou dentro da vaga). */
  q: boolean
}

/** Quantos classificam numa prova de `n` vagas. */
export function qualifyOf(n: number) {
  return Math.max(1, Math.ceil(n * GINCANA.qualify))
}

export class GincanaRace {
  readonly seed: number
  readonly course: Course
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
  /** Classificam os primeiros `quota`. */
  readonly quota: number
  private readonly bySlot = new Map<number, number>()

  constructor(seed: number, seats: RaceSeatDef[], countdown: number = GINCANA.countdown, phase: string = "cidade") {
    this.seed = seed >>> 0
    this.course = courseOf(phase)
    this.t = -countdown
    this.world = newWorld(this.course, this.seed, this.t)
    for (const s of seats) {
      this.bySlot.set(s.slot, this.runners.length)
      this.runners.push(newRunner(this.course, s.slot))
      this.ctl.push(s.ctl)
      this.brains.push(s.ctl === "bot" ? newBrain(this.world, this.seed, s.slot) : null)
      this.gone.push(false)
    }
    this.quota = qualifyOf(seats.length)
  }

  runner(slot: number): Runner | null {
    const i = this.bySlot.get(slot)
    return i === undefined ? null : this.runners[i]
  }

  /** A vaga dos classificados encheu. */
  closed() {
    return this.order.length >= this.quota
  }

  /** Um passo fixo; `local` = intenção do corpo deste aparelho. */
  step(local: RunIntent = IDLE_INTENT, out: RunEvent[] | null = null, dt: number = GINCANA.step) {
    this.t += dt
    const w = this.world
    const C = this.course
    w.t = this.t
    ballsAt(C, this.seed, this.t, w.balls)
    // ladrilhos que já voltaram
    for (let i = 0; i < w.tiles.length; i++) if (w.tiles[i] >= 0 && this.t - w.tiles[i] >= C.tileTime.warn + C.tileTime.gone) w.tiles[i] = -1
    for (const b of this.runners) {
      b.px = b.x
      b.py = b.y
      b.pz = b.z
    }
    if (this.t < 0) return
    // quem está sendo segurado (por qualquer um, de fora também) anda devagar
    for (let j = 0; j < this.runners.length; j++) {
      const a = this.runners[j]
      if (a.grab < 0 || this.gone[j]) continue
      const v = this.runner(a.grab)
      if (!v || this.ctl[this.bySlot.get(a.grab)!] === "remote") continue
      if (Math.hypot(v.x - a.x, v.z - a.z) < GINCANA.grabR + 0.7 && Math.abs(v.y - a.y) < 1.2) v.held = 0.15
    }
    const closed = this.closed()
    for (let i = 0; i < this.runners.length; i++) {
      const b = this.runners[i]
      const c = this.ctl[i]
      if (this.gone[i]) continue
      if (c === "remote") continue
      const it = c === "local" ? local : botIntent(this.brains[i]!, b, w, dt)
      const wasFin = b.fin >= 0
      stepRunner(b, it, w, out, dt)
      if (!wasFin && b.fin >= 0) {
        // chegou depois de a vaga encher: não conta (a prova já fechou)
        if (closed) b.fin = -1
        else this.order.push(b.slot)
      }
      this.grab(i, !!it.grab, out, dt)
    }
    // ninguém atravessa ninguém (quem é movido aqui sai; o de fora não); mergulho em cima empurra
    for (let i = 0; i < this.runners.length; i++) {
      if (this.ctl[i] === "remote" || this.gone[i]) continue
      for (let j = 0; j < this.runners.length; j++) {
        if (i === j || this.gone[j]) continue
        if (j < i && this.ctl[j] !== "remote") continue
        const a = this.runners[i]
        const b = this.runners[j]
        if (!separate(a, b, this.ctl[j] !== "remote")) continue
        // mergulho que acerta alguém (movido aqui): empurrão
        for (const [p, q, k] of [[a, b, j], [b, a, i]] as [Runner, Runner, number][]) {
          if (p.mode !== MODE.DIVE || this.ctl[k] === "remote" || q.mode === MODE.DONE) continue
          const sp = Math.hypot(p.vx, p.vz) || 1
          knock(q, (p.vx / sp) * GINCANA.tackle, 3, (p.vz / sp) * GINCANA.tackle, "tackle", out)
        }
      }
    }
  }

  /** Segurar AGARRAR: pega a vaga da frente ao alcance; solta ao soltar, longe ou no tempo. */
  private grab(i: number, held: boolean, out: RunEvent[] | null, dt: number) {
    const a = this.runners[i]
    if (a.grab >= 0) {
      const v = this.runner(a.grab)
      a.grabT += dt
      const far = !v || Math.hypot(v.x - a.x, v.z - a.z) > GINCANA.grabR + 0.9 || v.mode === MODE.WATER || v.mode === MODE.DONE
      if (!held || far || a.grabT > GINCANA.grabMax || a.mode !== MODE.RUN) {
        a.grab = -1
        a.grabCool = GINCANA.grabCool
      }
      return
    }
    if (!held || a.grabCool > 0 || a.mode !== MODE.RUN) return
    const fx = Math.sin(a.facing)
    const fz = Math.cos(a.facing)
    let best = -1
    let bestD = Infinity
    for (let j = 0; j < this.runners.length; j++) {
      if (j === i || this.gone[j]) continue
      const v = this.runners[j]
      if (v.mode === MODE.WATER || v.mode === MODE.DONE || Math.abs(v.y - a.y) > 1.2) continue
      const dx = v.x - a.x
      const dz = v.z - a.z
      const d = Math.hypot(dx, dz)
      if (d > GINCANA.grabR || (dx * fx + dz * fz) / (d || 1) < 0.2) continue
      if (d < bestD) {
        bestD = d
        best = v.slot
      }
    }
    if (best >= 0) {
      a.grab = best
      a.grabT = 0
      out?.push({ type: "grab", slot: a.slot, other: best })
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

  /** Pose de alguém de fora (rede). Pisa nos ladrilhos e abre portas como os outros. */
  setRemote(slot: number, p: RunnerPose) {
    const i = this.bySlot.get(slot)
    if (i === undefined) return
    const b = this.runners[i]
    const C = this.course
    b.x = p.x
    b.y = p.y
    b.z = p.z
    b.facing = p.f
    b.cp = p.cp
    b.grab = p.g === undefined || !Number.isFinite(p.g) ? -1 : p.g
    b.mode = p.a === ANIM.WATER ? MODE.WATER : p.a === ANIM.WIN ? MODE.DONE : p.a === ANIM.KNOCK ? MODE.KNOCK : p.a === ANIM.DIVE ? MODE.DIVE : MODE.RUN
    b.ground = p.a === ANIM.IDLE || p.a === ANIM.RUN || p.a === ANIM.WIN || p.a === ANIM.SLIDE || p.a === ANIM.RISE
    if (p.fin >= 0 && b.fin < 0 && !this.closed()) {
      b.fin = p.fin
      this.order.push(slot)
    }
    if (b.ground) {
      for (let k = 0; k < C.tiles.length; k++) {
        const q = C.tiles[k]
        if (Math.abs(b.y - q.y) < 0.3 && onTile(q, b.x, b.z, 0) && this.world.tiles[k] < 0) this.world.tiles[k] = this.t
      }
    }
    for (let k = 0; k < C.doors.length; k++) {
      const d = C.doors[k]
      if (this.world.open[k] && this.world.doors[k] < 0 && Math.abs(b.z - d.z) < 0.8 && Math.abs(b.x - d.x) < d.hw) this.world.doors[k] = this.t
    }
  }

  setGone(slot: number) {
    const i = this.bySlot.get(slot)
    if (i !== undefined) this.gone[i] = true
  }

  pose(slot: number): RunnerPose | null {
    const b = this.runner(slot)
    if (!b) return null
    return { x: b.x, y: b.y, z: b.z, f: b.facing, a: runnerAnim(b), cp: b.cp, fin: b.fin, g: b.grab }
  }

  /** Progresso de quem não chegou (posto e z). */
  distOf(b: Runner) {
    const C = this.course
    return Math.max(C.checkpoints[b.cp].z, Math.min(C.finishZ, b.z))
  }

  /** Classificação: quem chegou pela ordem; o resto pela distância (posto e z). */
  standings(): StandingRow[] {
    const C = this.course
    const rows: StandingRow[] = []
    this.order.forEach((slot, k) => {
      const b = this.runner(slot)!
      rows.push({ slot, fin: b.fin, dist: C.finishZ, q: k < this.quota })
    })
    const rest = this.runners
      .filter((b) => b.fin < 0 || !this.order.includes(b.slot))
      .map((b) => ({ slot: b.slot, fin: -1, dist: this.distOf(b), q: false }))
      .sort((a, b) => b.dist - a.dist || a.slot - b.slot)
    return rows.concat(rest)
  }

  /** Acabou: a vaga encheu, todos os que contam chegaram (ou saíram) ou o tempo acabou. */
  over(): boolean {
    if (this.t >= GINCANA.timeLimit || this.closed()) return true
    let any = false
    for (let i = 0; i < this.runners.length; i++) {
      if (this.ctl[i] === "bot" || this.gone[i]) continue
      any = true
      if (this.runners[i].fin < 0) return false
    }
    return any
  }
}
