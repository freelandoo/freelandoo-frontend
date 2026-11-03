// features/meu-mundo/jetpack/sim/flight.ts — JETPACK (mm3d-63): a regra.
//
// Redesenho total pedido pelo Alex: o personagem voa de jetpack, sem parar,
// por um TÚNEL SUBTERRÂNEO steampunk. Não pode encostar em NADA — chão, teto,
// paredes, prensas, canos, engrenagens: encostou, caiu. Só três comandos:
// para um lado, para o outro e o propulsor (segurou = sobe, soltou = cai). O
// propulsor gasta combustível; os galões no caminho enchem o tanque. Sem
// combustível o propulsor apaga e o corpo cai.
//
// Corte do túnel (x para os lados, y para cima): x ∈ [−W/2, W/2], y ∈ [0, H].
// O jogador anda em +z sozinho, cada vez mais rápido (a velocidade é função
// só da DISTÂNCIA — quem larga junto chega junto em cada prensa). Tudo que se
// mexe é função do TEMPO da partida (como a Gincana): as prensas não "andam",
// a pose delas sai de `t`. O desenho usa as MESMAS funções (pressV/pressH/…).
//
// O túnel sai inteiro de uma SEMENTE: em grupo a sala manda a mesma para
// todos e cada aparelho voa o seu (a sala só repassa as poses e faz o ranking,
// como o Rolê Noturno). Só cliente: o back não roda esta regra.

export const TUNNEL = { W: 10, H: 8 } as const

export const TUNING = {
  /** Passo da regra (s). */
  step: 1 / 120,
  /** Velocidade (m/s): v0 na largada, sobe até vMax (constante vK em metros). */
  v0: 16,
  vMax: 46,
  vK: 3200,
  /** Para os lados: velocidade máxima e aceleração (m/s, m/s²). */
  side: 7.4,
  sideAcc: 44,
  /** Propulsor e gravidade (m/s²); teto da velocidade vertical; arrasto vertical (1/s). */
  thrust: 28,
  gravity: 16,
  vyUp: 9,
  vyDown: -12.5,
  drag: 0.55,
  /** Combustível: tanque, gasto parado e com o propulsor (por s), galão. */
  fuelMax: 100,
  fuelIdle: 1.1,
  fuelBurn: 8,
  fuelGain: 28,
  /** Aviso de pouco combustível. */
  fuelLow: 25,
  /** Meia caixa do corpo (m): largura, altura (em volta do meio do corpo), profundidade. */
  hx: 0.34,
  hy: 0.68,
  hz: 0.3,
  /** Altura de largada (meio do corpo) e trecho limpo do começo (m). */
  startY: 4,
  startClear: 70,
  /** Paira sozinho no começo até o 1º toque no propulsor ou este tanto (s). */
  hoverS: 2.5,
  /** Alcance para pegar o galão (m). */
  pick: { x: 0.95, y: 1.15, z: 1.1 },
  /** Pontos por galão (os metros também valem pontos). */
  canPoints: 25,
} as const

export type ObstacleKind = "pressV" | "pressH" | "crusher" | "piston" | "pipes" | "gears"
export type CrashBy = ObstacleKind | "wall" | "floor" | "ceiling"

export interface Obstacle {
  id: number
  kind: ObstacleKind
  /** Face da frente (m) e profundidade. */
  z: number
  d: number
  /** Amplitude e período (s) do movimento, fase (0–1). */
  a: number
  p: number
  ph: number
  /** Vão (pressV/pressH), lado (piston: −1 parede esquerda, 1 direita). */
  g: number
  side: -1 | 1
  /** Canos: altura do horizontal; x do vertical (NaN = sem). */
  y0: number
  x0: number
  /** Engrenagens: centros e raio. */
  gears: { x: number; y: number; r: number }[]
}

export interface Can {
  id: number
  x: number
  y: number
  z: number
  taken: boolean
}

export interface FlightInput {
  /** −1 esquerda … 1 direita. */
  side: number
  thrust: boolean
}

export type FlightEvent =
  | { type: "can"; id: number; n: number }
  | { type: "low" }
  | { type: "empty" }
  | { type: "crash"; by: CrashBy }

/** Retângulo no corte do túnel. */
export interface Rect {
  x0: number
  x1: number
  y0: number
  y1: number
}
export interface Disc {
  x: number
  y: number
  r: number
}

const { W, H } = TUNNEL
const TAU = Math.PI * 2
const OUT = 1.5 // folga para além das paredes (as peças "saem" de dentro delas)

/** Velocidade na distância z (a mesma para todos). */
export function speedAt(z: number) {
  return TUNING.v0 + (TUNING.vMax - TUNING.v0) * (1 - Math.exp(-Math.max(0, z) / TUNING.vK))
}

/** Dificuldade 0–1 pela distância. */
export const hardAt = (z: number) => Math.min(1, Math.max(0, z / 7000))

const frac = (u: number) => u - Math.floor(u)
const wave = (o: Obstacle, t: number, off = 0) => Math.sin(TAU * (t / o.p + o.ph + off))

/** Prensa de cima e de baixo: meio do vão (y). */
export const pressV = (o: Obstacle, t: number) => H / 2 + o.a * wave(o, t)
/** Prensa dos lados: meio do vão (x). */
export const pressH = (o: Obstacle, t: number) => o.a * wave(o, t)
/** Martelo-pilão: baixa da cabeça (y) da metade `half` (−1 esquerda, 1 direita); as duas batem alternadas. */
export function crusherB(o: Obstacle, t: number, half: -1 | 1) {
  const u = frac(t / o.p + o.ph + (half > 0 ? 0.5 : 0))
  const up = H - 1 // recolhida: a cabeça ainda aparece 1 m abaixo do teto
  if (u < 0.42) return up
  if (u < 0.52) {
    const k = (u - 0.42) / 0.1
    return up * (1 - k * k) // desce acelerando
  }
  if (u < 0.66) return 0
  const k = (u - 0.66) / 0.34
  return up * k * k * (3 - 2 * k) // sobe devagar
}
/** Pistão da parede: quanto avança (m) a partir da parede. */
export const pistonE = (o: Obstacle, t: number) => o.a * (0.5 - 0.5 * Math.cos(TAU * (t / o.p + o.ph)))
/** Engrenagem i: centro agora (balançam para cima e para baixo, fora de fase) e ângulo do giro. */
export function gearAt(o: Obstacle, t: number, i: number) {
  const g = o.gears[i]
  return { x: g.x, y: g.y + o.a * wave(o, t, i * 0.5), r: g.r, ang: (t / o.p) * TAU * (i % 2 ? -1 : 1) * 0.7 }
}

/** As peças sólidas de um obstáculo no tempo t (no corte do túnel). */
export function shapes(o: Obstacle, t: number, rects: Rect[], discs: Disc[]) {
  rects.length = 0
  discs.length = 0
  switch (o.kind) {
    case "pressV": {
      const c = pressV(o, t)
      rects.push({ x0: -W / 2 - OUT, x1: W / 2 + OUT, y0: c + o.g / 2, y1: H + OUT }, { x0: -W / 2 - OUT, x1: W / 2 + OUT, y0: -OUT, y1: c - o.g / 2 })
      break
    }
    case "pressH": {
      const c = pressH(o, t)
      rects.push({ x0: -W / 2 - OUT, x1: c - o.g / 2, y0: -OUT, y1: H + OUT }, { x0: c + o.g / 2, x1: W / 2 + OUT, y0: -OUT, y1: H + OUT })
      break
    }
    case "crusher":
      rects.push({ x0: -W / 2 - OUT, x1: 0, y0: crusherB(o, t, -1), y1: H + OUT }, { x0: 0, x1: W / 2 + OUT, y0: crusherB(o, t, 1), y1: H + OUT })
      break
    case "piston": {
      const e = pistonE(o, t)
      if (o.side < 0) rects.push({ x0: -W / 2 - OUT, x1: -W / 2 + e, y0: -OUT, y1: H + OUT })
      else rects.push({ x0: W / 2 - e, x1: W / 2 + OUT, y0: -OUT, y1: H + OUT })
      break
    }
    case "pipes":
      rects.push({ x0: -W / 2 - OUT, x1: W / 2 + OUT, y0: o.y0 - PIPE_R, y1: o.y0 + PIPE_R })
      if (Number.isFinite(o.x0)) rects.push({ x0: o.x0 - PIPE_R, x1: o.x0 + PIPE_R, y0: -OUT, y1: H + OUT })
      break
    case "gears":
      for (let i = 0; i < o.gears.length; i++) {
        const g = gearAt(o, t, i)
        discs.push({ x: g.x, y: g.y, r: g.r })
      }
      break
  }
}

/** Raio dos canos. */
export const PIPE_R = 0.5
/** Profundidade de cada tipo (m). */
export const DEPTH: Record<ObstacleKind, number> = { pressV: 1.8, pressH: 1.8, crusher: 2.4, piston: 2, pipes: 1, gears: 0.9 }

// ── sorteio (mulberry32) ─────────────────────────────────────────────────────

export function rng(seed: number) {
  let a = seed >>> 0 || 1
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** O túnel: obstáculos e galões gerados em ordem a partir da semente (o mesmo em todo aparelho). */
export class Course {
  readonly obstacles: Obstacle[] = []
  readonly cans: Can[] = []
  private readonly r: () => number
  private nextZ: number = TUNING.startClear
  private oid = 0
  private cid = 0
  private last: ObstacleKind | null = null

  readonly seed: number

  constructor(seed: number) {
    this.seed = seed
    this.r = rng(seed)
    // galões do trecho limpo: uma fila para aprender a pegar
    for (let i = 0; i < 3; i++) this.can(0, 4.6, 34 + i * 4)
  }

  /** Gera até z (m à frente). */
  ensure(z: number) {
    while (this.nextZ < z) this.spawn()
  }

  /** Larga o que ficou para trás (guarda o vetor pequeno). */
  prune(z: number) {
    let i = 0
    while (i < this.obstacles.length && this.obstacles[i].z + this.obstacles[i].d < z) i++
    if (i > 48) this.obstacles.splice(0, i)
    let k = 0
    while (k < this.cans.length && this.cans[k].z < z) k++
    if (k > 96) this.cans.splice(0, k)
  }

  private pick<T>(list: readonly T[]): T {
    return list[Math.floor(this.r() * list.length) % list.length]
  }
  private range(a: number, b: number) {
    return a + (b - a) * this.r()
  }

  private can(x: number, y: number, z: number) {
    this.cans.push({ id: ++this.cid, x, y, z, taken: false })
  }

  private spawn() {
    const z = this.nextZ
    const h = hardAt(z)
    const kinds: ObstacleKind[] = ["pressV", "pressH", "pipes"]
    if (z > 380) kinds.push("crusher")
    if (z > 850) kinds.push("piston")
    if (z > 1400) kinds.push("gears")
    let kind = this.pick(kinds)
    if (kind === this.last) kind = this.pick(kinds)
    this.last = kind
    const o: Obstacle = { id: ++this.oid, kind, z, d: DEPTH[kind], a: 0, p: 4, ph: this.r(), g: 3, side: 1, y0: H / 2, x0: NaN, gears: [] }
    let after = 0 // tempo extra depois (s): o par de pistões ocupa mais
    switch (kind) {
      case "pressV":
        o.g = 3.25 - 0.7 * h
        o.a = ((H - o.g) / 2 - 0.35) * this.range(0.45, 1)
        o.p = this.range(3.6, 4.6) - 1.1 * h
        break
      case "pressH":
        o.g = 3.4 - 0.7 * h
        o.a = ((W - o.g) / 2 - 0.35) * this.range(0.45, 1)
        o.p = this.range(3.4, 4.4) - 1 * h
        break
      case "crusher":
        o.p = this.range(2.4, 3) - 0.6 * h
        break
      case "piston": {
        o.side = this.r() < 0.5 ? -1 : 1
        o.a = W * (0.5 + 0.18 * h)
        o.p = this.range(2.6, 3.4) - 0.5 * h
        // o segundo pistão, do outro lado, logo atrás: zigue-zague
        const twin: Obstacle = { ...o, id: ++this.oid, side: o.side < 0 ? 1 : -1, z: z + 0.9 * speedAt(z) * 0.5 + o.d, ph: frac(o.ph + 0.5), gears: [] }
        this.obstacles.push(o)
        this.obstacles.push(twin)
        after = (twin.z + twin.d - z - o.d) / speedAt(z)
        break
      }
      case "pipes":
        o.y0 = this.range(2.3, H - 2.3)
        o.x0 = this.r() < 0.35 + 0.4 * h ? this.range(-2.6, 2.6) : NaN
        break
      case "gears": {
        const up = this.r() < 0.5
        const r = 2.15 + 0.25 * h
        o.gears = [
          { x: -2.55, y: up ? 2.5 : H - 2.5, r },
          { x: 2.55, y: up ? H - 2.5 : 2.5, r },
        ]
        o.a = 0.8 + 0.5 * h
        o.p = this.range(2.6, 3.2)
        break
      }
    }
    if (kind !== "piston") this.obstacles.push(o)
    // espaço até o próximo: ~1,7 s de voo no começo, ~1,1 s no fim
    const v = speedAt(z)
    const gapS = 1.7 - 0.6 * h + this.range(0, 0.45)
    const gap = Math.max(16, gapS * v)
    const end = z + o.d + after * v
    // galões no vão: um solto, ou uma fila de 3 (a cada vez mais raros)
    const many = this.r() < 0.35 - 0.15 * h
    if (this.r() < 0.8 - 0.3 * h) {
      const x = this.range(-3.6, 3.6)
      const y = this.range(1.5, H - 1.5)
      const cz = end + gap * this.range(0.35, 0.55)
      if (many) {
        const dx = this.range(-0.8, 0.8)
        const dy = this.range(-0.6, 0.6)
        for (let i = 0; i < 3; i++) {
          this.can(clampX(x + dx * i), clampY(y + dy * i), cz - 3.2 + i * 3.2)
        }
      } else this.can(x, y, cz)
    }
    this.nextZ = end + gap
  }
}

const clampX = (x: number) => Math.max(-W / 2 + 1, Math.min(W / 2 - 1, x))
const clampY = (y: number) => Math.max(1.2, Math.min(H - 1.2, y))

/** Caixa do corpo × retângulo / disco. */
function hitsRect(x: number, y: number, r: Rect) {
  return x + TUNING.hx > r.x0 && x - TUNING.hx < r.x1 && y + TUNING.hy > r.y0 && y - TUNING.hy < r.y1
}
function hitsDisc(x: number, y: number, d: Disc) {
  const cx = Math.max(x - TUNING.hx, Math.min(x + TUNING.hx, d.x))
  const cy = Math.max(y - TUNING.hy, Math.min(y + TUNING.hy, d.y))
  return (cx - d.x) ** 2 + (cy - d.y) ** 2 < d.r * d.r
}

/** O voo de uma pessoa. */
export class Flight {
  readonly course: Course
  x = 0
  y: number = TUNING.startY
  z = 0
  vx = 0
  vy = 0
  v: number = TUNING.v0
  /** s de voo (o relógio das prensas). */
  t = 0
  fuel: number = TUNING.fuelMax
  alive = true
  thrusting = false
  cans = 0
  score = 0
  crashedBy: CrashBy | null = null
  /** Já tocou no propulsor (antes disso o jetpack paira sozinho). */
  armed = false
  private lowSaid = false
  private emptySaid = false
  private readonly rects: Rect[] = []
  private readonly discs: Disc[] = []

  constructor(seed: number) {
    this.course = new Course(seed)
    this.course.ensure(300)
  }

  step(inp: FlightInput, ev: FlightEvent[]) {
    if (!this.alive) return
    const dt = TUNING.step
    this.t += dt
    const z0 = this.z
    this.v = speedAt(this.z)
    this.z += this.v * dt
    // lados
    const want = Math.max(-1, Math.min(1, Number.isFinite(inp.side) ? inp.side : 0)) * TUNING.side
    const dv = want - this.vx
    const maxDv = TUNING.sideAcc * dt
    this.vx += Math.max(-maxDv, Math.min(maxDv, dv))
    // propulsor; no começo o jetpack PAIRA sozinho até o primeiro toque no
    // propulsor (ou `hoverS`): quem acabou de largar não cai antes de entender
    if (!this.armed && (inp.thrust || this.t > TUNING.hoverS)) this.armed = true
    this.thrusting = !!inp.thrust && this.fuel > 0
    if (!this.armed) {
      this.vy += ((TUNING.startY - this.y) * 6 - this.vy * 4) * dt
      this.thrusting = this.y < TUNING.startY
    } else this.vy += ((this.thrusting ? TUNING.thrust : 0) - TUNING.gravity) * dt
    this.vy -= this.vy * TUNING.drag * dt
    this.vy = Math.max(TUNING.vyDown, Math.min(TUNING.vyUp, this.vy))
    this.fuel = Math.max(0, this.fuel - (TUNING.fuelIdle + (this.thrusting ? TUNING.fuelBurn : 0)) * dt)
    if (this.fuel <= TUNING.fuelLow && !this.lowSaid && this.fuel > 0) {
      this.lowSaid = true
      ev.push({ type: "low" })
    } else if (this.fuel > TUNING.fuelLow + 10) this.lowSaid = false
    if (this.fuel <= 0 && !this.emptySaid) {
      this.emptySaid = true
      ev.push({ type: "empty" })
    } else if (this.fuel > 0) this.emptySaid = false
    this.x += this.vx * dt
    this.y += this.vy * dt

    const c = this.course
    c.ensure(this.z + 320)
    // galões (varrido em z: nada passa entre dois passos)
    for (const k of c.cans) {
      if (k.z > this.z + TUNING.pick.z) break
      if (k.taken || k.z < z0 - TUNING.pick.z) continue
      if (Math.abs(k.x - this.x) < TUNING.pick.x && Math.abs(k.y - this.y) < TUNING.pick.y) {
        k.taken = true
        this.cans += 1
        this.fuel = Math.min(TUNING.fuelMax, this.fuel + TUNING.fuelGain)
        ev.push({ type: "can", id: k.id, n: this.cans })
      }
    }
    this.score = Math.floor(this.z) + this.cans * TUNING.canPoints

    // encostou em alguma coisa?
    let by: CrashBy | null = null
    if (Math.abs(this.x) + TUNING.hx > W / 2) by = "wall"
    else if (this.y - TUNING.hy < 0) by = "floor"
    else if (this.y + TUNING.hy > H) by = "ceiling"
    else {
      for (const o of c.obstacles) {
        if (o.z > this.z + TUNING.hz) break
        if (o.z + o.d < this.z - TUNING.hz) continue
        shapes(o, this.t, this.rects, this.discs)
        if (this.rects.some((r) => hitsRect(this.x, this.y, r)) || this.discs.some((d) => hitsDisc(this.x, this.y, d))) {
          by = o.kind
          break
        }
      }
    }
    if (by) {
      this.alive = false
      this.thrusting = false
      this.crashedBy = by
      // sem combustível, o chão "é culpa" do tanque vazio (o fim mostra isso)
      ev.push({ type: "crash", by })
    }
    if ((Math.floor(this.z) & 63) === 0) c.prune(this.z - 30)
  }
}
