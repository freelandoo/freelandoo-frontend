// features/meu-mundo/corrida/sim/race.ts — CORRIDA ANTIGRAVIDADE (mm3d-39): a partida.
//
// Naves em coordenadas da pista: `dist` (metros andados ao longo do eixo, sem
// dar a volta — a volta sai dele), `u` (metros para a direita) e a altura Y
// absoluta. O rumo é do MUNDO: na curva a pista gira por baixo e é preciso
// esterçar (com uma ajuda leve que alinha a nave quando ninguém mexe).
//
// No chão a nave flutua colada à pista e herda a inclinação; quando o chão
// some (fim da rampa, crista) vira voo balístico. Segurar o acelerador no ar
// é a antigravidade: a queda fica mais lenta (planar). Caiu no vão = volta
// no pouso, parada por um instante.
//
// Turbo: faixas na pista (na hora) e cápsulas (cargas, até 3, usadas pelo
// botão). Rivais seguem a linha de corrida com uma habilidade cada.
//
// Três tipos de nave (mm3d-39b, multiplayer): "local" (a deste aparelho, pela
// entrada), "bot" (o computador dirige) e "remote" (outro jogador: o estado
// vem de fora, por `applyRemote`, e a regra só conta as voltas dela). Sozinho
// = 1 local + 5 bots; no servidor = jogadores remote + bots; no aparelho de
// quem joga em grupo = 1 local + o resto remote (os bots vêm do servidor).
//
// Passo fixo de 1/120 s; sem Babylon.

import { STEP, trackAt, surfaceY, worldAt, wrapAngle, wrapS, type Track, type TrackPoint } from "./track"

export const TUNING = {
  step: 1 / 120,
  laps: 3,
  countdown: 3,
  vmax: 62,
  boostMax: 94,
  accel: 26,
  boostAccel: 70,
  brake: 48,
  coast: 7,
  /** rad/s parado → em velocidade máxima. */
  turnLow: 2.1,
  turnHigh: 1.15,
  /** Ajuda que alinha a nave com a pista sem volante (1/s). */
  assist: 0.7,
  gravity: 26,
  /** Gravidade segurando o acelerador no ar (antigravidade). */
  glideGravity: 16,
  airTurn: 0.55,
  /** Metade da largura da nave (parede). */
  half: 1.25,
  wallKeep: 0.9,
  /** Faixa de turbo e carga do botão (s). */
  padBoost: 1.25,
  turboBoost: 1.8,
  padKick: 16,
  maxCharges: 3,
  orbBack: 5,
  /** Caiu: tempo parado antes de voltar e velocidade de volta. */
  respawn: 1.4,
  respawnV: 34,
  /** Fora da pista tantos metros abaixo do pouso = caiu. */
  fallDepth: 14,
  /** Tempo máximo depois que o jogador cruza a chegada. */
  tail: 12,
} as const

export interface CarInput {
  /** −1 esquerda … 1 direita. */
  steer: number
  /** 0…1. */
  throttle: number
  /** 0…1. */
  brake: number
  /** Apertou o turbo neste passo. */
  turbo: boolean
}

export type CarKind = "local" | "remote" | "bot"

export interface Car {
  id: number
  name: string
  color: string
  kind: CarKind
  /** Jogador que saiu no meio (fica parado fora da pista, no fim da classificação). */
  gone: boolean
  /** Metros andados ao longo do eixo (com as voltas). */
  dist: number
  u: number
  yaw: number
  v: number
  Y: number
  vy: number
  air: boolean
  boost: number
  charges: number
  /** s parado depois de cair (0 = correndo). */
  down: number
  /** Batendo na parede (para som/faísca). */
  scrape: number
  finished: number | null
  lapStart: number
  laps: number[]
  /** Último pouso firme (para onde volta se cair fora de um vão). */
  safeDist: number
  /** Habilidade do rival (fração da velocidade máxima) e a de nascença. */
  skill: number
  base: number
  lane: number
  laneT: number
  /** Para a interface: o que a nave está fazendo. */
  steerNow: number
  throttleNow: number
}

export type RaceEvent =
  | { type: "pad"; car: number }
  | { type: "turbo"; car: number }
  | { type: "orb"; car: number; orb: number }
  | { type: "takeoff"; car: number }
  | { type: "land"; car: number; hard: boolean }
  | { type: "fell"; car: number }
  | { type: "wall"; car: number }
  | { type: "bump"; a: number; b: number }
  | { type: "lap"; car: number; lap: number; time: number; best: boolean }
  | { type: "finish"; car: number; place: number; time: number }
  | { type: "go" }
  | { type: "end" }

export type RacePhase = "countdown" | "race" | "end"

export const CAR_COLORS = ["#C8102E", "#1F7AE0", "#F2B705", "#16A37F", "#8E44D9", "#F26B1D"] as const
const RIVALS = ["Faísca", "Cometa", "Vulcão", "Neblina", "Trovão"] as const

export interface RaceSeat {
  name: string
  kind: CarKind
}

export interface RaceOptions {
  track: Track
  /** Rivais (0 = contra o relógio). Ignorado com `seats`. */
  rivals?: number
  /** As naves na ordem da largada (0 = última fila). Sem isto: 1 local + `rivals` bots. */
  seats?: RaceSeat[]
  /** Qual nave é a deste aparelho (−1 = nenhuma: o servidor). */
  me?: number
  laps?: number
  playerName?: string
  seed?: number
  /** A regra encerra sozinha (sozinho/servidor). No aparelho do multiplayer quem encerra é a sala. */
  autoEnd?: boolean
}

/** Estado de uma nave que veio da rede. */
export interface RemoteCar {
  dist: number
  u: number
  Y: number
  yaw: number
  v: number
  vy: number
  air: boolean
  boost: boolean
  down: boolean
  steer: number
  throttle: number
}

/** Gerador pequeno e determinístico (os rivais variam igual em toda partida com a mesma semente). */
function rng(seed: number) {
  let s = seed >>> 0 || 1
  return () => {
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    return ((s >>> 0) % 100000) / 100000
  }
}

export class Race {
  readonly track: Track
  readonly laps: number
  readonly cars: Car[] = []
  phase: RacePhase = "countdown"
  /** s desde a largada (negativo na contagem). */
  time: number
  /** Cápsulas fora (id → s até voltar). */
  readonly orbOut = new Map<number, number>()
  private readonly rand: () => number
  private readonly p: TrackPoint = {} as TrackPoint
  private readonly q: TrackPoint = {} as TrackPoint
  private padCool = new Map<string, number>()
  private endAt: number | null = null
  private finishedCount = 0
  readonly me: number
  readonly autoEnd: boolean
  bestLap: number | null = null

  constructor(opts: RaceOptions) {
    this.track = opts.track
    this.laps = opts.laps ?? TUNING.laps
    this.time = -TUNING.countdown
    this.rand = rng(opts.seed ?? 7)
    this.me = opts.me ?? 0
    this.autoEnd = opts.autoEnd ?? true
    let bots = 0
    const seats: RaceSeat[] =
      opts.seats ?? [{ name: opts.playerName ?? "Você", kind: "local" }, ...Array.from({ length: opts.rivals ?? 0 }, (): RaceSeat => ({ name: "", kind: "bot" }))]
    const n = seats.length
    const W = this.track.width
    for (let i = 0; i < n; i++) {
      const seat = seats[i]
      // grid em duas colunas atrás da linha; o jogador larga no fim do pelotão
      const slot = n - 1 - i
      const row = Math.floor(slot / 2)
      const col = slot % 2 === 0 ? -1 : 1
      const dist = this.track.startS - 8 - row * 9 - (col > 0 ? 4 : 0)
      const pt = trackAt(this.track, dist, this.p)
      const u = col * W * 0.2
      const bot = seat.kind === "bot"
      const base = bot ? 0.9 + 0.075 * (i / Math.max(1, n - 1)) + this.rand() * 0.02 : 1
      this.cars.push({
        id: i,
        name: bot ? seat.name || RIVALS[bots++ % RIVALS.length] : seat.name,
        color: CAR_COLORS[i % CAR_COLORS.length],
        kind: seat.kind,
        gone: false,
        dist,
        u,
        yaw: pt.yaw,
        v: 0,
        Y: surfaceY(pt, u),
        vy: 0,
        air: false,
        boost: 0,
        charges: bot ? 0 : 1,
        down: 0,
        scrape: 0,
        finished: null,
        lapStart: 0,
        laps: [],
        safeDist: dist,
        skill: base,
        base,
        lane: (this.rand() - 0.5) * 6,
        laneT: 0,
        steerNow: 0,
        throttleNow: 0,
      })
    }
  }

  /** A nave deste aparelho (no servidor não há: a primeira). */
  get player(): Car {
    return this.cars[Math.max(0, this.me)]
  }

  /** Volta em andamento (1…laps) de uma nave. */
  lapOf(c: Car): number {
    return Math.min(this.laps, Math.max(1, Math.floor((c.dist - this.track.startS) / this.track.length) + 1))
  }

  /** Progresso para a classificação (quem terminou vem antes, pela ordem de chegada). */
  private score(c: Car): number {
    if (c.gone && c.finished === null) return -1e9 + c.dist
    return c.finished !== null ? 1e9 - c.finished : c.dist
  }

  standings(): Car[] {
    return [...this.cars].sort((a, b) => this.score(b) - this.score(a))
  }

  placeOf(c: Car): number {
    return this.standings().indexOf(c) + 1
  }

  step(input: CarInput, out: RaceEvent[]) {
    const dt = TUNING.step
    this.time += dt
    if (this.phase === "countdown" && this.time >= 0) {
      this.phase = "race"
      out.push({ type: "go" })
    }
    if (this.phase === "countdown") return
    for (const [id, t] of this.orbOut) {
      if (t - dt <= 0) this.orbOut.delete(id)
      else this.orbOut.set(id, t - dt)
    }
    for (const [k, t] of this.padCool) {
      if (t - dt <= 0) this.padCool.delete(k)
      else this.padCool.set(k, t - dt)
    }
    for (const c of this.cars) {
      if (c.kind === "remote" || c.gone) continue
      const inp = c.finished !== null ? FINISHED_INPUT : c.kind === "bot" ? this.drive(c) : input
      this.move(c, inp, dt, out)
    }
    this.collide(out)
    if (this.phase === "race" && this.endAt !== null && this.time >= this.endAt) {
      this.phase = "end"
      out.push({ type: "end" })
    }
  }

  // ── uma nave ──────────────────────────────────────────────────────────────
  private move(c: Car, inp: CarInput, dt: number, out: RaceEvent[]) {
    const T = this.track
    c.steerNow = inp.steer
    c.throttleNow = inp.throttle
    if (c.scrape > 0) c.scrape = Math.max(0, c.scrape - dt)
    if (c.down > 0) {
      c.down -= dt
      if (c.down <= 0) this.respawn(c)
      return
    }
    const p = trackAt(T, c.dist, this.p)
    const halfW = T.width / 2 - TUNING.half
    // turbo pelo botão (carga)
    if (inp.turbo && c.charges > 0 && c.boost < 0.3) {
      c.charges--
      c.boost = TUNING.turboBoost
      c.v = Math.min(TUNING.boostMax, c.v + TUNING.padKick * 0.6)
      out.push({ type: "turbo", car: c.id })
    }
    if (c.boost > 0) c.boost = Math.max(0, c.boost - dt)
    const vmax = (c.boost > 0 ? TUNING.boostMax : TUNING.vmax) * c.skill
    // velocidade
    if (c.boost > 0) c.v += TUNING.boostAccel * dt * (1 - c.v / TUNING.boostMax)
    else if (inp.throttle > 0) c.v += TUNING.accel * inp.throttle * dt * Math.max(0, 1 - c.v / vmax) * 1.6
    if (c.v > vmax) c.v = Math.max(vmax, c.v - TUNING.coast * 3 * dt)
    if (inp.brake > 0) c.v = Math.max(0, c.v - TUNING.brake * inp.brake * dt)
    if (inp.throttle <= 0 && c.boost <= 0 && !c.air) c.v = Math.max(0, c.v - TUNING.coast * dt)
    // direção
    const t = Math.min(1, c.v / TUNING.vmax)
    const rate = (TUNING.turnLow + (TUNING.turnHigh - TUNING.turnLow) * t) * (c.air ? TUNING.airTurn : 1)
    if (c.v > 0.5) c.yaw += inp.steer * rate * dt * Math.min(1, c.v / 8)
    let a = wrapAngle(c.yaw - p.yaw)
    if (!c.air && Math.abs(inp.steer) < 0.05) a -= a * Math.min(1, TUNING.assist * dt)
    c.yaw = p.yaw + a
    // avança
    const ds = c.v * Math.cos(a) * dt
    c.dist += ds
    c.u += c.v * Math.sin(a) * dt
    // parede (também no ar: os vãos têm a mesma largura)
    if (Math.abs(c.u) > halfW) {
      c.u = Math.sign(c.u) * halfW
      const hit = Math.abs(a) > 0.05
      a = -a * 0.35
      c.yaw = p.yaw + a
      if (hit && c.scrape <= 0) {
        c.v *= TUNING.wallKeep
        out.push({ type: "wall", car: c.id })
      }
      c.scrape = 0.25
    }
    const q = trackAt(T, c.dist, this.q)
    const ground = surfaceY(q, c.u)
    if (c.air) {
      const g = inp.throttle > 0 ? TUNING.glideGravity : TUNING.gravity
      c.vy -= g * dt
      c.Y += c.vy * dt
      if (!q.gap && c.Y <= ground) {
        if (c.Y < ground - 2.2) {
          this.fall(c, out) // passou por baixo da pista
          return
        }
        const hard = c.vy < -14
        c.air = false
        c.Y = ground
        c.vy = c.v * q.slope
        c.v *= hard ? 0.9 : 0.97
        c.safeDist = c.dist
        out.push({ type: "land", car: c.id, hard })
      } else if (c.Y < this.fallFloor(c.dist)) {
        this.fall(c, out)
        return
      }
    } else {
      // crista ou fim da rampa: o balístico fica acima do chão → decola
      const vy = c.v * p.slope
      const next = c.Y + vy * dt - 0.5 * TUNING.gravity * dt * dt
      if (q.gap || next > ground + 0.04) {
        c.air = true
        c.vy = vy
        c.Y = next
        out.push({ type: "takeoff", car: c.id })
      } else {
        c.Y = ground
        c.vy = c.v * q.slope
        if (!q.ramp) c.safeDist = c.dist
      }
    }
    if (!c.air) this.pickups(c, out)
    this.laps_(c, out)
  }

  /** Abaixo disto a nave não volta mais (pouso do vão menos a folga, ou o chão). */
  private fallFloor(dist: number): number {
    const s = wrapS(this.track, dist)
    for (const g of this.track.gaps) {
      if (s >= g.s0 - STEP && s <= g.s1 + STEP) return g.landY - TUNING.fallDepth
    }
    return trackAt(this.track, dist, this.q).y - TUNING.fallDepth
  }

  private fall(c: Car, out: RaceEvent[]) {
    c.down = TUNING.respawn
    c.v = 0
    c.boost = 0
    out.push({ type: "fell", car: c.id })
  }

  /** Volta no pouso do vão onde caiu (ou no último chão firme). */
  private respawn(c: Car) {
    const T = this.track
    const s = wrapS(T, c.dist)
    let to = c.safeDist
    for (const g of T.gaps) {
      if (s >= g.s0 - g.ramp - STEP * 2 && s <= g.s1 + 40) {
        const lapBase = c.dist - s
        to = lapBase + g.s1 + 12
        break
      }
    }
    c.down = 0
    c.dist = to
    const p = trackAt(T, to, this.p)
    c.u = 0
    c.yaw = p.yaw
    c.v = TUNING.respawnV
    c.Y = p.y
    c.vy = 0
    c.air = false
    c.safeDist = to
  }

  private pickups(c: Car, out: RaceEvent[]) {
    const T = this.track
    const s = wrapS(T, c.dist)
    for (let i = 0; i < T.pads.length; i++) {
      const pd = T.pads[i]
      const ds = s - pd.s
      if (ds < 0 || ds > pd.len || c.u < pd.u0 - 0.6 || c.u > pd.u1 + 0.6) continue
      const k = `${c.id}:${i}`
      if (this.padCool.has(k)) continue
      this.padCool.set(k, 1)
      c.boost = Math.max(c.boost, TUNING.padBoost)
      c.v = Math.min(TUNING.boostMax, c.v + TUNING.padKick)
      out.push({ type: "pad", car: c.id })
    }
    for (const o of T.orbs) {
      if (this.orbOut.has(o.id)) continue
      let ds = Math.abs(s - o.s)
      ds = Math.min(ds, T.length - ds)
      if (ds > 2.6 || Math.abs(c.u - o.u) > 2.2) continue
      this.orbOut.set(o.id, TUNING.orbBack)
      if (c.charges < TUNING.maxCharges) c.charges++
      out.push({ type: "orb", car: c.id, orb: o.id })
    }
  }

  private laps_(c: Car, out: RaceEvent[]) {
    if (c.finished !== null) return
    const T = this.track
    const done = Math.floor((c.dist - T.startS) / T.length)
    while (c.laps.length < done && c.laps.length < this.laps) {
      const lapTime = this.time - c.lapStart
      c.lapStart = this.time
      c.laps.push(lapTime)
      let best = false
      if (c.id === this.me && (this.bestLap === null || lapTime < this.bestLap)) {
        this.bestLap = lapTime
        best = true
      }
      out.push({ type: "lap", car: c.id, lap: c.laps.length, time: lapTime, best })
      if (c.laps.length >= this.laps) {
        c.finished = this.time
        this.finishedCount++
        out.push({ type: "finish", car: c.id, place: this.finishedCount, time: this.time })
        this.checkEnd()
      }
    }
  }

  /** Todos os jogadores terminaram (ou saíram): mais um tempo para os bots; todo mundo: fim logo. */
  private checkEnd() {
    if (!this.autoEnd) return
    const live = this.cars.filter((c) => !c.gone)
    if (live.length && live.every((c) => c.finished !== null)) {
      this.endAt = Math.min(this.endAt ?? Infinity, this.time + 1.5)
      return
    }
    const humans = this.cars.filter((c) => c.kind !== "bot")
    if (humans.every((c) => c.finished !== null || c.gone) && this.endAt === null) this.endAt = this.time + TUNING.tail
  }

  // ── multiplayer ──────────────────────────────────────────────────────────
  /** Estado de outro jogador (ou de um bot do servidor) que chegou pela rede; conta as voltas. */
  applyRemote(id: number, r: RemoteCar, out: RaceEvent[]) {
    const c = this.cars[id]
    if (!c || c.kind !== "remote" || c.gone) return
    c.dist = r.dist
    c.u = r.u
    c.Y = r.Y
    c.yaw = r.yaw
    c.v = r.v
    c.vy = r.vy
    c.air = r.air
    c.boost = r.boost ? Math.max(c.boost, 0.1) : 0
    c.down = r.down ? Math.max(c.down, 0.1) : 0
    c.steerNow = r.steer
    c.throttleNow = r.throttle
    if (this.phase === "race") this.laps_(c, out)
  }

  /** Estado para mandar pela rede. */
  remoteOf(c: Car): RemoteCar {
    return { dist: c.dist, u: c.u, Y: c.Y, yaw: c.yaw, v: c.v, vy: c.vy, air: c.air, boost: c.boost > 0, down: c.down > 0, steer: c.steerNow, throttle: c.throttleNow }
  }

  /** O jogador saiu no meio: some da pista e vai para o fim da classificação. */
  markGone(id: number) {
    const c = this.cars[id]
    if (!c || c.gone) return
    c.gone = true
    c.v = 0
    this.checkEnd()
  }

  /** Cápsula pedida por um jogador remoto (o servidor decide quem leva). */
  claimOrb(car: number, orb: number, out: RaceEvent[]): boolean {
    const c = this.cars[car]
    const o = this.track.orbs.find((k) => k.id === orb)
    if (!c || !o || this.orbOut.has(orb)) return false
    let ds = Math.abs(wrapS(this.track, c.dist) - o.s)
    ds = Math.min(ds, this.track.length - ds)
    if (ds > 40) return false // longe demais da cápsula (atraso cabe; teletransporte não)
    this.orbOut.set(orb, TUNING.orbBack)
    out.push({ type: "orb", car, orb })
    return true
  }

  /** O fim decidido de fora (a sala mandou o resultado). */
  end(out: RaceEvent[]) {
    if (this.phase === "end") return
    this.phase = "end"
    out.push({ type: "end" })
  }

  // ── encostar: empurra de lado e quem vem atrás perde um pouco ─────────────
  private collide(out: RaceEvent[]) {
    const cs = this.cars
    for (let i = 0; i < cs.length; i++) {
      const a = cs[i]
      if (a.down > 0 || a.gone) continue
      for (let j = i + 1; j < cs.length; j++) {
        const b = cs[j]
        if (b.down > 0 || b.gone || a.air !== b.air) continue
        // a nave que vem da rede não se mexe aqui: quem empurra é só a simulada
        const ma = a.kind !== "remote"
        const mb = b.kind !== "remote"
        if (!ma && !mb) continue
        const ds = b.dist - a.dist
        const du = b.u - a.u
        if (Math.abs(ds) > 4.2 || Math.abs(du) > 2.4) continue
        if (Math.abs(a.Y - b.Y) > 1.6) continue
        const push = (2.4 - Math.abs(du)) / (ma && mb ? 2 : 1)
        const dir = du === 0 ? (j % 2 ? 1 : -1) : Math.sign(du)
        if (ma) a.u -= dir * push
        if (mb) b.u += dir * push
        const back = ds > 0 ? a : b
        const front = ds > 0 ? b : a
        if (Math.abs(du) < 1.6) {
          if (back.kind !== "remote") back.v = Math.max(0, back.v - 3)
          if (front.kind !== "remote") front.v += 1
        }
        out.push({ type: "bump", a: a.id, b: b.id })
      }
    }
  }

  // ── piloto dos rivais ────────────────────────────────────────────────────
  private drive(c: Car): CarInput {
    const T = this.track
    const dt = TUNING.step
    c.laneT -= dt
    if (c.laneT <= 0) {
      c.laneT = 2 + this.rand() * 3
      c.lane = (this.rand() - 0.5) * 7
    }
    const look = 16 + c.v * 0.45
    const ahead = trackAt(T, c.dist + look, this.q)
    // linha de corrida: por dentro da curva; perto de vão/faixa de turbo, no meio
    let curv = 0
    for (let k = 1; k <= 4; k++) curv += trackAt(T, c.dist + k * 14, this.p).curv
    curv /= 4
    const halfW = T.width / 2 - TUNING.half - 1
    let target = Math.max(-halfW, Math.min(halfW, curv * 650 + c.lane))
    const s = wrapS(T, c.dist)
    for (const g of T.gaps) {
      const before = g.s0 - g.ramp - 160
      if (s > before && s < g.s1) target = 0
    }
    // de olho numa faixa de turbo logo à frente
    for (const pd of T.pads) {
      const d = pd.s - s
      if (d > 0 && d < 70) target = (pd.u0 + pd.u1) / 2
    }
    // não bater em quem está logo à frente
    for (const o of this.cars) {
      if (o === c || o.down > 0) continue
      const d = o.dist - c.dist
      if (d > 0 && d < 14 && Math.abs(o.u - target) < 2.6) target = o.u + (o.u > 0 ? -3.2 : 3.2)
    }
    const want = ahead.yaw + Math.atan2(target - c.u, look)
    const err = wrapAngle(want - c.yaw)
    const steer = Math.max(-1, Math.min(1, err * 3.2))
    // elástico: muito à frente do melhor jogador segura; muito atrás do último acelera
    let lead = -Infinity
    let last = Infinity
    for (const o of this.cars) {
      if (o.kind === "bot" || o.gone) continue
      lead = Math.max(lead, o.dist)
      last = Math.min(last, o.dist)
    }
    const band = !Number.isFinite(lead) ? 1 : c.dist - lead > 160 ? 0.95 : c.dist - last < -160 ? 1.05 : 1
    c.skill += (c.base * band - c.skill) * Math.min(1, 0.5 * dt)
    const turbo = c.charges > 0 && Math.abs(curv) < 0.002 && this.rand() < 0.004
    return { steer, throttle: 1, brake: Math.abs(err) > 0.6 && c.v > 30 ? 0.4 : 0, turbo }
  }
}

const FINISHED_INPUT: CarInput = { steer: 0, throttle: 0.6, brake: 0, turbo: false }

/** Mundo de uma nave (desenho): posição, rumo, arfagem e rolagem. */
export interface CarPose {
  x: number
  y: number
  z: number
  yaw: number
  pitch: number
  roll: number
}

const POSE_P: TrackPoint = {} as TrackPoint
export function carPose(race: Race, c: Car, out: CarPose): CarPose {
  const p = trackAt(race.track, c.dist, POSE_P)
  const w = worldAt(p, c.u)
  out.x = w.x
  out.z = w.z
  out.y = c.Y
  out.yaw = c.yaw
  out.pitch = c.air ? Math.max(-0.45, Math.min(0.35, Math.atan2(c.vy, Math.max(8, c.v)) * 0.7)) : Math.atan(p.slope)
  out.roll = (c.air ? 0 : p.bank) + c.steerNow * Math.min(1, c.v / 30) * 0.16
  return out
}
