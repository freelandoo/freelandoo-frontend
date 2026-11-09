// features/meu-mundo/noturno/sim/track.ts — ROLÊ NOTURNO 2.0: o TRAÇADO da pista.
//
// A regra (run.ts) continua numa pista reta de coordenadas próprias: x = lado
// (as três faixas), y = altura acima do piso, z = distância percorrida. Este
// módulo dá a essa pista uma FORMA no mundo — curvas, S, subidas, descidas,
// inclinação lateral (banking) e loops de 360° — sem mudar uma vírgula da
// regra: quem está em (x, y, z) na regra fica, no mundo, em
//
//     P(z) + R(z)·x + U(z)·y
//
// onde P é a linha do meio, T a direção da corrida, U o "cima" da pista e
// R = U × T o lado direito. Tudo por distância de verdade (comprimento de
// arco), em amostras de DS metros.
//
//  - O traçado é uma lista de TRECHOS gerada pela semente e pela fase (a
//    mesma em todos os aparelhos e no computador da sala). A fase "classica"
//    não tem traçado: é a rua reta de sempre, idêntica.
//  - O "cima" fora dos loops é o vertical do mundo projetado (sem flip: a
//    pista nunca fica em pé fora do loop) girado pelo banking, que segue a
//    curvatura (contínuo). Dentro do loop ele é TRANSPORTADO amostra a
//    amostra (acompanha a volta inteira, de cabeça para baixo no alto) e a
//    pequena torção que sobra no fim (o loop sai deslocado para o lado, para
//    a saída não bater na entrada) é distribuída pelo trecho.
//  - Loop é ZONA TRANQUILA: o gerador da regra não põe obstáculo do começo
//    da placa até a saída — só uma fileira de moedas (o "loop guiado" do
//    prompt; as faixas continuam valendo).
//
// Sem Babylon: roda no node (servidor, testes) e no jogo. O backend usa a
// cópia GERADA (scripts/build-noturno-sim.js) para o computador saber onde
// ficam os loops.

export type RunPhase = "classica" | "floresta" | "canion" | "orbital" | "forja" | "fabrica"
/** Ordem do menu (a Clássica fica por último: é a rua de antes). */
export const RUN_PHASES: readonly RunPhase[] = ["floresta", "canion", "orbital", "forja", "fabrica", "classica"]

export function isRunPhase(p: unknown): p is RunPhase {
  return typeof p === "string" && (RUN_PHASES as readonly string[]).includes(p)
}

export type SegKind = "straight" | "curve" | "scurve" | "loop"
/** Para o cenário (a regra não lê): ponte, túnel, beira de penhasco, portal de descida… */
export type SegTag = "" | "bridge" | "tunnel" | "edge" | "portal" | "hero" | "recovery" | "spiral" | "glass"

export interface TrackSeg {
  kind: SegKind
  /** Começo (m, distância da regra) e comprimento. */
  s0: number
  len: number
  /** Giro total (rad, + = para a direita) — no S, o tamanho de cada metade. */
  turn: number
  /** Subida total (m; negativa = descida). */
  climb: number
  /** Loop: para que lado a saída se desloca (1 = direita). */
  side: 1 | -1
  tag: SegTag
}

interface Range {
  w: number
  len: readonly [number, number]
  turn: readonly [number, number]
  climb: readonly [number, number]
}

/** Como a pista de cada fase se comporta (formato; a regra do jogo não muda entre fases). */
export interface TrackRules {
  /** Altura da pista no começo e os limites (m). */
  y0: number
  yMin: number
  yMax: number
  straight: Range
  curve: Range
  scurve: Range
  /** Subida/descida sem curva. */
  hill: Range
  /** Curva com descida forte (espiral). */
  spiral: Range
  /** Banking máximo (rad) e o ganho pela curvatura (rad por rad/m). */
  bankMax: number
  bankK: number
  /** Primeiro loop e o intervalo entre eles (m). */
  loopFirst: number
  loopEvery: readonly [number, number]
  /** Comprimento do loop (m) e o deslocamento lateral da saída. */
  loopLen: number
  loopShift: number
  /** Portal de descida a cada tanto (m) e a descida dele. */
  portalEvery: readonly [number, number]
  portalDrop: number
  /** Etiquetas de cenário sorteadas nas retas e curvas. */
  tags: readonly (readonly [SegTag, number])[]
  /** Desvio máximo do rumo médio (rad): a pista sempre avança e nunca volta sobre si. */
  yawMax: number
}

const R = (w: number, len: [number, number], turn: [number, number] = [0, 0], climb: [number, number] = [0, 0]): Range => ({ w, len, turn, climb })

export const TRACK_RULES: Record<Exclude<RunPhase, "classica">, TrackRules> = {
  floresta: {
    y0: 0, yMin: -48, yMax: 30,
    straight: R(0.8, [50, 110]),
    curve: R(1.6, [110, 190], [0.45, 1.0], [-6, 6]),
    scurve: R(1.1, [150, 230], [0.35, 0.6]),
    hill: R(0.7, [90, 150], [0, 0], [5, 12]),
    spiral: R(0.55, [200, 260], [1.3, 1.8], [-22, -14]),
    bankMax: 0.36, bankK: 20,
    loopFirst: 680, loopEvery: [1500, 2100], loopLen: 96, loopShift: 10,
    portalEvery: [1100, 1500], portalDrop: 16,
    tags: [["", 3], ["bridge", 1.4], ["tunnel", 1.2], ["recovery", 0.4]],
    yawMax: 0.95,
  },
  canion: {
    y0: 12, yMin: -30, yMax: 55,
    straight: R(0.7, [50, 100]),
    curve: R(1.5, [100, 180], [0.4, 0.95], [-8, 8]),
    scurve: R(1.2, [160, 240], [0.3, 0.55]),
    hill: R(0.9, [90, 160], [0, 0], [8, 16]),
    spiral: R(0.3, [200, 260], [1.1, 1.5], [-18, -10]),
    bankMax: 0.42, bankK: 26,
    loopFirst: 620, loopEvery: [1200, 1700], loopLen: 104, loopShift: 10,
    portalEvery: [1000, 1400], portalDrop: 18,
    tags: [["", 2.4], ["edge", 1.6], ["bridge", 1.6], ["tunnel", 0.8]],
    yawMax: 1.0,
  },
  orbital: {
    y0: 20, yMin: -50, yMax: 45,
    straight: R(0.8, [60, 120]),
    curve: R(1.4, [140, 230], [0.5, 1.15], [-6, 6]),
    scurve: R(0.9, [180, 260], [0.3, 0.55]),
    hill: R(0.6, [100, 160], [0, 0], [6, 12]),
    spiral: R(0.35, [220, 280], [1.2, 1.7], [-20, -12]),
    bankMax: 0.5, bankK: 32,
    loopFirst: 600, loopEvery: [1100, 1500], loopLen: 110, loopShift: 10,
    portalEvery: [900, 1300], portalDrop: 20,
    tags: [["", 2], ["glass", 2.2], ["bridge", 1], ["tunnel", 1]],
    yawMax: 1.0,
  },
  forja: {
    y0: 8, yMin: -12, yMax: 34,
    straight: R(0.9, [50, 110]),
    curve: R(1.4, [100, 170], [0.4, 0.9], [-5, 5]),
    scurve: R(0.9, [150, 220], [0.3, 0.5]),
    hill: R(1.0, [90, 140], [0, 0], [6, 11]),
    spiral: R(0.25, [200, 250], [1.0, 1.4], [-14, -8]),
    bankMax: 0.34, bankK: 20,
    loopFirst: 700, loopEvery: [1400, 1900], loopLen: 100, loopShift: 10,
    portalEvery: [1000, 1400], portalDrop: 12,
    tags: [["", 2.2], ["bridge", 1.6], ["tunnel", 1.4]],
    yawMax: 0.9,
  },
  fabrica: {
    y0: 6, yMin: -20, yMax: 30,
    straight: R(1.6, [70, 140]),
    curve: R(1.2, [110, 170], [0.45, 0.9], [-4, 4]),
    scurve: R(0.6, [150, 210], [0.3, 0.5]),
    hill: R(1.0, [90, 150], [0, 0], [6, 12]),
    spiral: R(0.2, [200, 240], [1.0, 1.3], [-12, -8]),
    bankMax: 0.3, bankK: 18,
    loopFirst: 650, loopEvery: [1300, 1800], loopLen: 100, loopShift: 10,
    portalEvery: [1000, 1400], portalDrop: 14,
    tags: [["", 2], ["tunnel", 1.8], ["bridge", 1.2]],
    yawMax: 0.85,
  },
}

/** Reta inicial (m): a largada e o começo da corrida ficam retos em toda fase. */
export const TRACK_LEAD = 150
/** Zona tranquila: antes da entrada do loop (placa, alinhar) e depois da saída. */
export const QUIET_BEFORE = 45
export const QUIET_AFTER = 25
/** Passo das amostras (m). */
export const DS = 0.5

const TAU = Math.PI * 2
/** Suave nos dois lados (derivada zero nas pontas: curvatura contínua). */
export const ease = (t: number) => t * t * (3 - 2 * t)
const dease = (t: number) => 6 * t * (1 - t)
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v)

function trackRng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Os TRECHOS da pista (só o plano: barato, roda também no servidor). Cresce
 * sob demanda (`ensure`); trechos que ficaram muito para trás são soltos.
 */
export class TrackPlan {
  readonly phase: RunPhase
  readonly rules: TrackRules | null
  segs: TrackSeg[] = []
  private end = 0
  private readonly rnd: () => number
  /** Estado do planejador (rumo e altura acumulados, para manter a pista nos limites). */
  private yaw = 0
  private y = 0
  private nextLoop = 0
  private nextPortal = 0

  constructor(phase: RunPhase, seed: number) {
    this.phase = phase
    this.rules = phase === "classica" ? null : TRACK_RULES[phase]
    this.rnd = trackRng((seed ^ 0x5bd1e995) >>> 0 || 1)
    if (this.rules) {
      this.y = this.rules.y0
      this.nextLoop = this.rules.loopFirst
      this.nextPortal = this.rules.loopFirst + this.between(this.rules.portalEvery) * 0.5
    }
    this.push({ kind: "straight", s0: 0, len: TRACK_LEAD, turn: 0, climb: 0, side: 1, tag: "recovery" })
  }

  get length() {
    return this.end
  }

  private between(r: readonly [number, number]) {
    return r[0] + (r[1] - r[0]) * this.rnd()
  }

  private push(s: TrackSeg) {
    s.s0 = this.end
    this.segs.push(s)
    this.end += s.len
    if (s.kind === "curve") this.yaw += s.turn
    this.y += s.climb
  }

  /** Gera trechos até cobrir `s`. */
  ensure(s: number) {
    const r = this.rules
    if (!r) {
      if (this.end < s) this.push({ kind: "straight", s0: 0, len: Math.max(500, s - this.end + 500), turn: 0, climb: 0, side: 1, tag: "" })
      return
    }
    while (this.end < s) {
      if (this.end >= this.nextLoop) {
        // o momento de destaque: placa e reta de alinhamento, o loop, reta de recuperação
        this.push({ kind: "straight", s0: 0, len: QUIET_BEFORE, turn: 0, climb: 0, side: 1, tag: "hero" })
        this.push({ kind: "loop", s0: 0, len: r.loopLen, turn: 0, climb: 0, side: this.rnd() < 0.5 ? -1 : 1, tag: "hero" })
        this.push({ kind: "straight", s0: 0, len: QUIET_AFTER + 30, turn: 0, climb: 0, side: 1, tag: "recovery" })
        this.nextLoop = this.end + this.between(r.loopEvery)
        continue
      }
      if (this.end >= this.nextPortal && this.y - r.portalDrop > r.yMin) {
        // portal de descida: o portal na boca e uma descida reta e suave (sem teletransporte)
        this.push({ kind: "straight", s0: 0, len: 30, turn: 0, climb: 0, side: 1, tag: "portal" })
        this.push({ kind: "straight", s0: 0, len: 120, turn: 0, climb: -r.portalDrop, side: 1, tag: "portal" })
        this.nextPortal = this.end + this.between(r.portalEvery)
        continue
      }
      this.pickSegment(r)
    }
  }

  private pickSegment(r: TrackRules) {
    const opts: [string, number][] = [
      ["straight", r.straight.w],
      ["curve", r.curve.w],
      ["scurve", r.scurve.w],
      ["hill", r.hill.w],
      ["spiral", this.y - 10 > r.yMin ? r.spiral.w : 0],
    ]
    let total = 0
    for (const [, w] of opts) total += w
    let pick = this.rnd() * total
    let kind = "straight"
    for (const [k, w] of opts) {
      pick -= w
      if (pick <= 0) {
        kind = k
        break
      }
    }
    const tag = this.tag(r)
    // lado da curva: volta para o rumo médio quando já se afastou dele
    const sideTurn = () => (Math.abs(this.yaw) > r.yawMax * 0.45 ? -Math.sign(this.yaw) : this.rnd() < 0.5 ? -1 : 1)
    const fitTurn = (want: number) => clamp(this.yaw + want, -r.yawMax, r.yawMax) - this.yaw
    const fitClimb = (want: number) => clamp(this.y + want, r.yMin, r.yMax) - this.y
    switch (kind) {
      case "curve": {
        const len = this.between(r.curve.len)
        const turn = fitTurn(sideTurn() * this.between(r.curve.turn))
        const climb = fitClimb(this.between(r.curve.climb))
        if (Math.abs(turn) < 0.12) return this.push({ kind: "straight", s0: 0, len, turn: 0, climb, side: 1, tag })
        return this.push({ kind: "curve", s0: 0, len, turn, climb, side: 1, tag })
      }
      case "scurve": {
        const len = this.between(r.scurve.len)
        return this.push({ kind: "scurve", s0: 0, len, turn: (this.rnd() < 0.5 ? -1 : 1) * this.between(r.scurve.turn), climb: 0, side: 1, tag: tag === "tunnel" ? "bridge" : tag })
      }
      case "hill": {
        const len = this.between(r.hill.len)
        const up = this.y < (r.yMin + r.yMax) / 2 ? 1 : -1
        const climb = fitClimb((this.rnd() < 0.7 ? up : -up) * this.between(r.hill.climb))
        return this.push({ kind: "straight", s0: 0, len, turn: 0, climb, side: 1, tag })
      }
      case "spiral": {
        const len = this.between(r.spiral.len)
        // espiral de verdade gira mais do que o rumo deixa: ela gira e o trecho seguinte desfaz
        const turn = sideTurn() * this.between(r.spiral.turn)
        const climb = fitClimb(this.between(r.spiral.climb))
        this.push({ kind: "curve", s0: 0, len, turn, climb, side: 1, tag: "spiral" })
        const back = clamp(this.yaw, -r.yawMax, r.yawMax) - this.yaw
        if (Math.abs(back) > 0.05) this.push({ kind: "curve", s0: 0, len: Math.max(110, Math.abs(back) * 120), turn: back, climb: 0, side: 1, tag: "" })
        return
      }
      default:
        return this.push({ kind: "straight", s0: 0, len: this.between(r.straight.len), turn: 0, climb: 0, side: 1, tag })
    }
  }

  private tag(r: TrackRules): SegTag {
    let total = 0
    for (const [, w] of r.tags) total += w
    let pick = this.rnd() * total
    for (const [t, w] of r.tags) {
      pick -= w
      if (pick <= 0) return t
    }
    return ""
  }

  /** O trecho que contém `s` (cresce o plano se precisar). */
  segAt(s: number): TrackSeg {
    this.ensure(s + 1)
    let lo = 0
    let hi = this.segs.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (this.segs[mid].s0 <= s) lo = mid
      else hi = mid - 1
    }
    return this.segs[lo]
  }

  /**
   * A primeira zona tranquila (loop com a sua margem) que toca [z0, z1], ou
   * null. A regra usa para não pôr obstáculo nela.
   */
  quiet(z0: number, z1: number): { from: number; to: number } | null {
    if (!this.rules) return null
    this.ensure(z1 + 200)
    for (const s of this.segs) {
      if (s.kind !== "loop") continue
      const from = s.s0 - QUIET_BEFORE
      const to = s.s0 + s.len + QUIET_AFTER
      if (to <= z0) continue
      if (from >= z1) return null
      return { from, to }
    }
    return null
  }

  /** Solta os trechos que acabaram antes de `s` (fica sempre um). */
  forget(s: number) {
    let n = 0
    while (n < this.segs.length - 1 && this.segs[n].s0 + this.segs[n].len < s) n++
    if (n > 0) this.segs.splice(0, n)
  }
}

/** Um ponto da pista: posição, direção (T), cima (U) e lado direito (R = U × T). */
export interface TrackFrame {
  px: number
  py: number
  pz: number
  tx: number
  ty: number
  tz: number
  ux: number
  uy: number
  uz: number
  rx: number
  ry: number
  rz: number
  /** Banking (rad) neste ponto — para o desenho (inclinar o corpo). */
  bank: number
}

export function newFrame(): TrackFrame {
  return { px: 0, py: 0, pz: 0, tx: 0, ty: 0, tz: 1, ux: 0, uy: 1, uz: 0, rx: 1, ry: 0, rz: 0, bank: 0 }
}

/**
 * A GEOMETRIA da pista: amostras a cada DS metros com P, T, U e o banking.
 * Gerada sob demanda a partir do plano; amostras muito para trás são soltas.
 */
export class TrackGeom {
  readonly plan: TrackPlan
  /** Índice da 1ª amostra guardada (s = (base + i)·DS). */
  private base = 0
  private P: number[] = []
  private T: number[] = []
  private U: number[] = []
  private B: number[] = []
  /** Estado do integrador: posição e rumo da próxima amostra. */
  private pos = [0, 0, 0]
  private yaw = 0
  private segIndex = 0
  private built = 0
  private segCursor: TrackSeg | null = null

  constructor(plan: TrackPlan) {
    this.plan = plan
    this.pos[1] = plan.rules?.y0 ?? 0
  }

  /** Quantos metros já existem em amostras. */
  get extent() {
    return (this.base + this.P.length / 3 - 1) * DS
  }

  /** Garante amostras até `s`. */
  ensure(s: number) {
    while (this.extent < s + DS) this.buildNext()
  }

  /** Solta amostras antes de `s` (em blocos, para não mexer a cada quadro). */
  forget(s: number) {
    const keep = Math.floor(s / DS) - this.base
    if (keep < 4000) return
    const n = keep - 400
    this.P.splice(0, n * 3)
    this.T.splice(0, n * 3)
    this.U.splice(0, n * 3)
    this.B.splice(0, n)
    this.base += n
    this.plan.forget(s - 400)
    this.segIndex = Math.max(0, this.plan.segs.indexOf(this.segCursor as TrackSeg))
  }

  /** Gera o próximo trecho inteiro em amostras. */
  private buildNext() {
    const plan = this.plan
    // o próximo trecho depois do que já foi construído
    plan.ensure(this.built + 1)
    let seg: TrackSeg | null = null
    for (let i = Math.max(0, this.segIndex - 1); i < plan.segs.length; i++) {
      if (plan.segs[i].s0 >= this.built - 1e-6) {
        seg = plan.segs[i]
        this.segIndex = i
        break
      }
    }
    if (!seg) {
      plan.ensure(this.built + 600)
      return
    }
    this.segCursor = seg
    const first = this.P.length === 0
    const n = Math.round(seg.len / DS)
    if (seg.kind === "loop") this.buildLoop(seg, n, first)
    else this.buildPlain(seg, n, first)
    this.built = seg.s0 + seg.len
  }

  private emit(px: number, py: number, pz: number, tx: number, ty: number, tz: number, ux: number, uy: number, uz: number, bank: number) {
    this.P.push(px, py, pz)
    this.T.push(tx, ty, tz)
    this.U.push(ux, uy, uz)
    this.B.push(bank)
  }

  /** Reta, curva, S, subida/descida: rumo e altura suaves, cima = vertical projetado + banking. */
  private buildPlain(seg: TrackSeg, n: number, first: boolean) {
    const rules = this.plan.rules
    const bankMax = rules?.bankMax ?? 0
    const bankK = rules?.bankK ?? 0
    const yaw0 = this.yaw
    const dir = (t: number, out: number[]) => {
      let yaw = yaw0
      let yawRate = 0
      if (seg.kind === "curve") {
        yaw += seg.turn * ease(t)
        yawRate = (seg.turn * dease(t)) / seg.len
      } else if (seg.kind === "scurve") {
        if (t < 0.5) {
          yaw += seg.turn * ease(2 * t)
          yawRate = (seg.turn * dease(2 * t) * 2) / seg.len
        } else {
          yaw += seg.turn * (1 - ease(2 * t - 1))
          yawRate = (-seg.turn * dease(2 * t - 1) * 2) / seg.len
        }
      }
      const slope = clamp((seg.climb * dease(t)) / seg.len, -0.55, 0.55)
      const k = 1 / Math.sqrt(1 + slope * slope)
      out[0] = Math.sin(yaw) * k
      out[1] = slope * k
      out[2] = Math.cos(yaw) * k
      out[3] = clamp(bankK * yawRate, -bankMax, bankMax)
      out[4] = yaw
    }
    const d = [0, 0, 0, 0, 0]
    const m = [0, 0, 0, 0, 0]
    for (let i = first ? 0 : 1; i <= n; i++) {
      const t = i / n
      if (i > 0) {
        // passo pelo meio do intervalo (ponto médio): comprimento de arco certo
        dir((i - 0.5) / n, m)
        const ds = seg.len / n
        this.pos[0] += m[0] * ds
        this.pos[1] += m[1] * ds
        this.pos[2] += m[2] * ds
      }
      dir(t, d)
      const [ux, uy, uz] = upOf(d[0], d[1], d[2], d[3])
      this.emit(this.pos[0], this.pos[1], this.pos[2], d[0], d[1], d[2], ux, uy, uz, d[3])
      if (i === n) this.yaw = d[4]
    }
  }

  /**
   * Loop 360°: o ângulo de subida vai de 0 a 2π pela curva suave (entrada e
   * saída abertas, apertado no alto — a gota dos loops de verdade) e a pista
   * escorrega para o lado `shift` metros (a saída passa ao lado da entrada).
   * O cima é transportado (sem flip) e a torção que sobra vai sendo desfeita.
   */
  private buildLoop(seg: TrackSeg, n: number, first: boolean) {
    const shift = (this.plan.rules?.loopShift ?? 10) * seg.side
    const fx = Math.sin(this.yaw)
    const fz = Math.cos(this.yaw)
    // direita horizontal: U × T com U = (0,1,0) → (tz, 0, −tx)
    const rx = fz
    const rz = -fx
    const dir = (t: number, out: number[]) => {
      const th = TAU * ease(t)
      const w = clamp((shift * dease(t)) / seg.len, -0.6, 0.6)
      const k = Math.sqrt(1 - w * w)
      const c = Math.cos(th) * k
      const s = Math.sin(th) * k
      out[0] = c * fx + w * rx
      out[1] = s
      out[2] = c * fz + w * rz
    }
    const pts: number[] = []
    const tan: number[] = []
    const ups: number[] = []
    const d = [0, 0, 0]
    const m = [0, 0, 0]
    let ux = 0
    let uy = 1
    let uz = 0
    for (let i = 0; i <= n; i++) {
      if (i > 0) {
        dir((i - 0.5) / n, m)
        const ds = seg.len / n
        this.pos[0] += m[0] * ds
        this.pos[1] += m[1] * ds
        this.pos[2] += m[2] * ds
      }
      dir(i / n, d)
      // transporte: tira de U a componente na direção nova e normaliza
      const dot = ux * d[0] + uy * d[1] + uz * d[2]
      ux -= dot * d[0]
      uy -= dot * d[1]
      uz -= dot * d[2]
      const l = Math.hypot(ux, uy, uz) || 1
      ux /= l
      uy /= l
      uz /= l
      pts.push(this.pos[0], this.pos[1], this.pos[2])
      tan.push(d[0], d[1], d[2])
      ups.push(ux, uy, uz)
    }
    // a torção que sobrou no fim: ângulo do U transportado até o vertical projetado
    const e = n * 3
    const [gx, gy, gz] = upOf(tan[e], tan[e + 1], tan[e + 2], 0)
    const cx = ups[e + 1] * gz - ups[e + 2] * gy
    const cy = ups[e + 2] * gx - ups[e] * gz
    const cz = ups[e] * gy - ups[e + 1] * gx
    const phi = Math.atan2(cx * tan[e] + cy * tan[e + 1] + cz * tan[e + 2], ups[e] * gx + ups[e + 1] * gy + ups[e + 2] * gz)
    for (let i = first ? 0 : 1; i <= n; i++) {
      const j = i * 3
      const a = phi * ease(i / n)
      const tx = tan[j]
      const ty = tan[j + 1]
      const tz = tan[j + 2]
      const vx = ups[j]
      const vy = ups[j + 1]
      const vz = ups[j + 2]
      // Rodrigues em volta de T (U ⟂ T): U cos a + (T × U) sen a
      const ca = Math.cos(a)
      const sa = Math.sin(a)
      const qx = vx * ca + (ty * vz - tz * vy) * sa
      const qy = vy * ca + (tz * vx - tx * vz) * sa
      const qz = vz * ca + (tx * vy - ty * vx) * sa
      this.emit(pts[j], pts[j + 1], pts[j + 2], tx, ty, tz, qx, qy, qz, 0)
    }
  }

  /** O ponto da pista na distância `s` (interpolado entre as amostras). */
  frame(s: number, out: TrackFrame): TrackFrame {
    if (s > this.extent - DS) this.ensure(s + 60)
    const f = Math.max(0, s / DS - this.base)
    let i = Math.floor(f)
    const last = this.P.length / 3 - 1
    if (i >= last) i = last - 1
    const k = Math.min(1, f - i)
    const a = i * 3
    const b = a + 3
    const P = this.P
    const T = this.T
    const U = this.U
    out.px = P[a] + (P[b] - P[a]) * k
    out.py = P[a + 1] + (P[b + 1] - P[a + 1]) * k
    out.pz = P[a + 2] + (P[b + 2] - P[a + 2]) * k
    let tx = T[a] + (T[b] - T[a]) * k
    let ty = T[a + 1] + (T[b + 1] - T[a + 1]) * k
    let tz = T[a + 2] + (T[b + 2] - T[a + 2]) * k
    const tl = Math.hypot(tx, ty, tz) || 1
    tx /= tl
    ty /= tl
    tz /= tl
    let ux = U[a] + (U[b] - U[a]) * k
    let uy = U[a + 1] + (U[b + 1] - U[a + 1]) * k
    let uz = U[a + 2] + (U[b + 2] - U[a + 2]) * k
    // re-ortogonaliza (a interpolação linear tira um pouco do ângulo reto)
    const dot = ux * tx + uy * ty + uz * tz
    ux -= dot * tx
    uy -= dot * ty
    uz -= dot * tz
    const ul = Math.hypot(ux, uy, uz) || 1
    ux /= ul
    uy /= ul
    uz /= ul
    out.tx = tx
    out.ty = ty
    out.tz = tz
    out.ux = ux
    out.uy = uy
    out.uz = uz
    // R = U × T
    out.rx = uy * tz - uz * ty
    out.ry = uz * tx - ux * tz
    out.rz = ux * ty - uy * tx
    out.bank = this.B[i] + (this.B[i + 1] - this.B[i]) * k
    return out
  }

  /** Ponto do mundo para (x, y) da seção na distância s. */
  point(x: number, y: number, s: number, f: TrackFrame, out: number[]) {
    this.frame(s, f)
    out[0] = f.px + f.rx * x + f.ux * y
    out[1] = f.py + f.ry * x + f.uy * y
    out[2] = f.pz + f.rz * x + f.uz * y
    return out
  }
}

/** Cima fora do loop: o vertical do mundo sem a componente da direção, girado pelo banking em volta de T. */
function upOf(tx: number, ty: number, tz: number, bank: number): [number, number, number] {
  let ux = -ty * tx
  let uy = 1 - ty * ty
  let uz = -ty * tz
  const l = Math.hypot(ux, uy, uz) || 1
  ux /= l
  uy /= l
  uz /= l
  if (!bank) return [ux, uy, uz]
  // direita R = U × T; banking positivo inclina o cima para a direita (curva para a direita: lado de dentro mais baixo)
  const rx = uy * tz - uz * ty
  const ry = uz * tx - ux * tz
  const rz = ux * ty - uy * tx
  const c = Math.cos(bank)
  const s = Math.sin(bank)
  return [ux * c + rx * s, uy * c + ry * s, uz * c + rz * s]
}
