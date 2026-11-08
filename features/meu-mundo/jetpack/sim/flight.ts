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
//
// FASES (mm3d-75): a mesma física em seis cenários (sim/phases.ts). A fase só
// muda o que o túnel gera; a fase 01 (industrial) é o gerador antigo, intacto.
// Os tipos novos são JANELA (parede com um vão retangular), ANEL (parede com
// um vão redondo), VIGA (barra que sobe e desce) ou DISCOS (rochas, cristais)
// — a colisão é desses quatro e o desenho usa as mesmas funções.

import { phaseRule, type PhaseId, type PhaseRule, type SetPiece } from "./phases"

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

export type ObstacleKind =
  | "pressV"
  | "pressH"
  | "crusher"
  | "piston"
  | "pipes"
  | "gears"
  // mm3d-75 (fases): janelas (vão retangular), anel, viga e discos
  | "band"
  | "cliff"
  | "slider"
  | "energy"
  | "roots"
  | "narrow"
  | "iris"
  | "ring"
  | "beam"
  | "rocks"
  | "crystals"

/** Tipos que são uma parede com um vão retangular (janela). */
export const WINDOW_KINDS: ReadonlySet<ObstacleKind> = new Set<ObstacleKind>(["band", "cliff", "slider", "energy", "roots", "narrow", "iris"])
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
  /** Engrenagens, rochas e cristais: centros e raio. */
  gears: { x: number; y: number; r: number }[]
  /** Janela/viga (mm3d-75): eixo do movimento (0 sobe e desce, 1 para os lados), largura e altura do vão (ou espessura da viga), fim da viga em x. */
  ax: 0 | 1
  w: number
  h: number
  x1: number
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

/**
 * Fator de velocidade pelo ATRIBUTO velocidade do personagem (0–1000, regra do
 * Alex): 0,85× (nasce ~25) até 1,35× (1000). Quem calcula na partida é a sala
 * (src/realtime/meuMundoJetpack.js, a mesma conta) e manda na largada.
 */
export function speedFactor(attr: number) {
  const a = Number.isFinite(attr) ? Math.max(0, Math.min(1000, attr)) : 0
  return Math.round((0.85 + 0.5 * (a / 1000)) * 1000) / 1000
}

/**
 * Velocidade na distância z. O túnel é gerado pela curva base (k = 1, o mesmo
 * para todos); o voo de cada um usa o fator do personagem.
 */
export function speedAt(z: number, k = 1) {
  return k * (TUNING.v0 + (TUNING.vMax - TUNING.v0) * (1 - Math.exp(-Math.max(0, z) / TUNING.vK)))
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

/** Janela (mm3d-75): o vão agora (centro e tamanho). */
export function windowAt(o: Obstacle, t: number) {
  if (o.kind === "iris") {
    const s = o.g + o.a * (0.5 + 0.5 * wave(o, t))
    return { cx: o.x0, cy: o.y0, w: s, h: s }
  }
  const m = o.a ? o.a * wave(o, t) : 0
  return { cx: o.x0 + (o.ax === 1 ? m : 0), cy: o.y0 + (o.ax === 0 ? m : 0), w: o.w, h: o.h }
}
/** Anel: centro e raio do vão agora (sobe e desce devagar quando `a`). */
export function ringAt(o: Obstacle, t: number) {
  return { x: o.x0, y: o.y0 + (o.a ? o.a * wave(o, t) : 0), r: o.g }
}
/** Viga: o meio dela (y) agora. */
export const beamY = (o: Obstacle, t: number) => o.y0 + (o.a ? o.a * wave(o, t) : 0)
/** Rocha/cristal i: centro agora (as rochas boiam fora de fase). */
export function discAt(o: Obstacle, t: number, i: number) {
  const g = o.gears[i]
  return { x: g.x, y: g.y + (o.a ? o.a * wave(o, t, i * 0.37) : 0), r: g.r }
}

/** As quatro placas em volta de um vão retangular. */
export function windowRects(cx: number, cy: number, w: number, h: number, rects: Rect[]) {
  const l = cx - w / 2
  const r = cx + w / 2
  const b = cy - h / 2
  const tp = cy + h / 2
  if (l > -W / 2 - OUT) rects.push({ x0: -W / 2 - OUT, x1: l, y0: -OUT, y1: H + OUT })
  if (r < W / 2 + OUT) rects.push({ x0: r, x1: W / 2 + OUT, y0: -OUT, y1: H + OUT })
  const xl = Math.max(l, -W / 2 - OUT)
  const xr = Math.min(r, W / 2 + OUT)
  if (tp < H + OUT) rects.push({ x0: xl, x1: xr, y0: tp, y1: H + OUT })
  if (b > -OUT) rects.push({ x0: xl, x1: xr, y0: -OUT, y1: b })
}

/** As peças sólidas de um obstáculo no tempo t (no corte do túnel). O anel não entra aqui (ver `hits`). */
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
    case "ring":
      break
    case "beam": {
      const y = beamY(o, t)
      rects.push({ x0: o.x0, x1: o.x1, y0: y - o.h / 2, y1: y + o.h / 2 })
      break
    }
    case "rocks":
    case "crystals":
      for (let i = 0; i < o.gears.length; i++) discs.push(discAt(o, t, i))
      break
    default: {
      // as janelas
      const v = windowAt(o, t)
      windowRects(v.cx, v.cy, v.w, v.h, rects)
    }
  }
}

/** Raio dos canos. */
export const PIPE_R = 0.5
/** Profundidade de cada tipo (m). */
export const DEPTH: Record<ObstacleKind, number> = {
  pressV: 1.8,
  pressH: 1.8,
  crusher: 2.4,
  piston: 2,
  pipes: 1,
  gears: 0.9,
  band: 1.2,
  cliff: 1.6,
  slider: 1.2,
  energy: 0.6,
  roots: 1.4,
  narrow: 2.2,
  iris: 0.9,
  ring: 0.9,
  beam: 1.4,
  rocks: 1.8,
  crystals: 1.6,
}

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
  readonly phase: PhaseRule
  /** Trechos especiais já gerados (o cenário marca a entrada). */
  readonly sets: { z0: number; z1: number; kind: SetPiece }[] = []
  /** Onde o caminho está (o meio do último vão) e a meia largura/altura dele (mm3d-75). */
  private px = 0
  private py: number = TUNING.startY
  private pw = 1.2
  private ph = 1.2
  private nextSet = Infinity
  /** Jetpack 3.0: próxima sequência de DESCIDA (fases 02–06) e qual das duas vem. */
  private nextDescent = Infinity
  private descents = 0

  constructor(seed: number, phase: PhaseId | string = "industrial") {
    this.seed = seed
    this.phase = phaseRule(phase)
    this.r = rng(seed)
    if (this.phase.set) this.nextSet = this.phase.setAt
    if (this.phase.id !== "industrial") this.nextDescent = DESCENT.at
    // galões do trecho limpo: uma fila para aprender a pegar
    for (let i = 0; i < 3; i++) this.can(0, 4.6, 34 + i * 4)
  }

  /** Gera até z (m à frente). */
  ensure(z: number) {
    const old = this.phase.id === "industrial"
    while (this.nextZ < z) {
      if (old) this.spawn()
      else this.spawnPhase()
    }
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
    const o: Obstacle = { id: ++this.oid, kind, z, d: DEPTH[kind], a: 0, p: 4, ph: this.r(), g: 3, side: 1, y0: H / 2, x0: NaN, gears: [], ax: 0, w: 0, h: 0, x1: 0 }
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

  // ── fases (mm3d-75) ────────────────────────────────────────────────────────
  //
  // Gerador com CAMINHO: (px, py) é o meio do último vão. Cada obstáculo novo
  // abre o vão dele ao alcance do anterior: no tempo do vão o corpo sobe/desce
  // no máximo `ry` e anda de lado `rx` (pela física da regra, com folga),
  // descontando parte da meia altura/largura do vão de antes (quem passou na
  // beirada ainda alcança). Galão só no caminho (no meio do vão ou logo
  // depois), nunca dentro de obstáculo.

  private base(kind: ObstacleKind, z: number): Obstacle {
    return { id: ++this.oid, kind, z, d: DEPTH[kind], a: 0, p: 4, ph: this.r(), g: 3, side: 1, y0: H / 2, x0: 0, gears: [], ax: 0, w: 0, h: 0, x1: 0 }
  }

  /** Alvo ao alcance: o meio do próximo vão (y entre lo e hi, |x| até wide). */
  private target(gapS: number, lo = 1.9, hi = H - 1.9, wide = 3.4) {
    const ry = Math.max(0.4, 3.2 * gapS + 0.3 - this.ph * 0.6)
    const rx = Math.max(0.4, 4.6 * gapS + 0.3 - this.pw * 0.6)
    const y = Math.max(lo, Math.min(hi, this.py + this.range(-ry, ry)))
    const x = Math.max(-wide, Math.min(wide, this.px + this.range(-rx, rx)))
    return { x, y }
  }
  private path(x: number, y: number, hw: number, hh: number) {
    this.px = x
    this.py = y
    this.pw = Math.max(0.3, hw)
    this.ph = Math.max(0.3, hh)
  }

  private pickKind(z: number): ObstacleKind {
    const list = this.phase.kinds.filter(([, , from]) => z >= from)
    const total = list.reduce((n, [, w]) => n + w, 0)
    const roll = () => {
      let u = this.r() * total
      for (const [k, w] of list) {
        u -= w
        if (u <= 0) return k
      }
      return list[list.length - 1][0]
    }
    let k = roll()
    if (k === this.last) k = roll()
    return k
  }

  private spawnPhase() {
    const z = this.nextZ
    const ru = this.phase
    const h = Math.min(1, ru.h0 + z / ru.hK)
    const v = speedAt(z)
    if (z >= this.nextDescent && Math.abs(z - this.nextSet) > 160) {
      this.nextDescent = z + DESCENT.every
      this.descent(z, h)
      return
    }
    if (ru.set && z >= this.nextSet) {
      this.nextSet = z + ru.setEvery
      this.setPiece(ru.set, z, h)
      return
    }
    const kind = this.pickKind(z)
    this.last = kind
    const gapS = (1.7 - 0.6 * h + this.range(0, 0.45)) * ru.gap
    const end = this.place(kind, z, h, gapS, v)
    const gap = Math.max(16, gapS * v)
    this.fuelAfter(end, gap, h)
    this.nextZ = end + gap
  }

  /** Coloca um obstáculo do tipo em z, com o vão ao alcance; devolve onde ele acaba (m). */
  private place(kind: ObstacleKind, z: number, h: number, gapS: number, v: number): number {
    const o = this.base(kind, z)
    switch (kind) {
      case "ring": {
        o.g = 2.15 - 0.45 * h + this.range(0, 0.3)
        o.a = this.r() < 0.3 + 0.4 * h ? this.range(0.5, 0.8 + 0.4 * h) : 0
        o.p = this.range(3.8, 5) - 0.6 * h
        const m = o.g + o.a + 0.25
        const tg = this.target(gapS, m, H - m, W / 2 - o.g - 0.3)
        o.x0 = tg.x
        o.y0 = tg.y
        this.path(tg.x, tg.y, o.g * 0.5, o.g * 0.5 + o.a)
        break
      }
      case "band": {
        // faixa livre embaixo ou em cima, de lado a lado
        o.h = 3.1 - 0.5 * h
        o.w = W + 2 * OUT + 2
        const want = this.r() < 0.5 ? 1 + o.h / 2 : H - 1 - o.h / 2
        const ry = Math.max(0.6, 3.2 * gapS + 0.3 - this.ph * 0.6)
        o.y0 = Math.max(o.h / 2 + 0.6, Math.min(H - o.h / 2 - 0.6, Math.max(this.py - ry, Math.min(this.py + ry, want))))
        o.x0 = 0
        this.path(this.px, o.y0, 2.5, o.h / 2 - 0.75)
        break
      }
      case "cliff": {
        // os penhascos fecham dos lados: só um corredor em x, de alto a baixo
        o.w = 3.3 - 0.6 * h
        o.h = H + 2 * OUT + 2
        const tg = this.target(gapS, H / 2, H / 2, W / 2 - o.w / 2 - 0.3)
        o.x0 = tg.x
        o.y0 = H / 2
        this.path(tg.x, this.py, o.w / 2 - 0.4, 2.5)
        break
      }
      case "slider": {
        o.w = this.range(3.6, 5.2) - 0.8 * h
        o.h = 3.2 - 0.4 * h
        o.a = this.range(0.6, 1.1 + 0.4 * h)
        o.p = this.range(3.8, 4.8) - 0.6 * h
        const m = o.h / 2 + o.a + 0.5
        const tg = this.target(gapS, m, H - m, W / 2 - o.w / 2 - 0.3)
        o.x0 = tg.x
        o.y0 = tg.y
        this.path(tg.x, tg.y, o.w / 2 - 0.4, o.a + 0.3)
        break
      }
      case "energy":
      case "roots": {
        o.w = this.range(3.4, 5) - 0.7 * h
        o.h = this.range(3, 3.6) - 0.5 * h
        const m = o.h / 2 + 0.5
        const tg = this.target(gapS, m, H - m, W / 2 - o.w / 2 - 0.3)
        o.x0 = tg.x
        o.y0 = tg.y
        this.path(tg.x, tg.y, o.w / 2 - 0.4, o.h / 2 - 0.75)
        break
      }
      case "narrow": {
        // túnel estreito: dois vãos pequenos em sequência, o segundo um pouco deslocado
        const w = 2.9 - 0.3 * h
        const hh = 3.05 - 0.3 * h
        const m = hh / 2 + 0.6
        const a = this.target(gapS, m, H - m, W / 2 - w / 2 - 0.3)
        o.w = w
        o.h = hh
        o.x0 = a.x
        o.y0 = a.y
        this.obstacles.push(o)
        const z2 = z + o.d + Math.max(9, 0.55 * v)
        const o2 = this.base("narrow", z2)
        o2.w = w
        o2.h = hh
        o2.x0 = Math.max(-W / 2 + w / 2 + 0.3, Math.min(W / 2 - w / 2 - 0.3, a.x + this.range(-1.2, 1.2)))
        o2.y0 = Math.max(m, Math.min(H - m, a.y + this.range(-1, 1)))
        this.obstacles.push(o2)
        this.path(o2.x0, o2.y0, w / 2 - 0.4, hh / 2 - 0.75)
        return o2.z + o2.d
      }
      case "iris": {
        // flor mecânica: o vão abre e fecha (de g a g + a)
        o.g = 2.75 - 0.2 * h
        o.a = 1.6
        o.p = this.range(3, 3.8)
        const m = (o.g + o.a) / 2 + 0.4
        const tg = this.target(gapS, m, H - m, W / 2 - o.g / 2 - 0.4)
        o.x0 = tg.x
        o.y0 = tg.y
        this.path(tg.x, tg.y, o.g / 2 - 0.4, o.g / 2 - 0.75)
        break
      }
      case "beam": {
        // viga/tronco/placa de lado a lado que sobe e desce; o caminho fica de um lado dela
        o.x0 = -W / 2 - OUT
        o.x1 = W / 2 + OUT
        o.h = this.range(0.9, 1.4)
        o.a = this.r() < 0.75 ? this.range(0.6, 1.2 + 0.4 * h) : 0
        o.p = this.range(3.6, 4.6) - 0.5 * h
        const tg = this.target(gapS, 1.7, H - 1.7)
        const clear = 1.4 + o.h / 2 + o.a
        const room = o.h / 2 + o.a
        const up = tg.y + clear
        const down = tg.y - clear
        const upOk = up - room < H - 0.3
        const downOk = down + room > 0.3
        if (upOk && (!downOk || H - tg.y > tg.y)) o.y0 = up
        else if (downOk) o.y0 = down
        else {
          o.a = 0
          o.y0 = tg.y > H / 2 ? tg.y - 1.4 - o.h / 2 : tg.y + 1.4 + o.h / 2
        }
        this.path(this.px, tg.y, 2.5, 0.6)
        break
      }
      case "rocks":
      case "crystals": {
        const tg = this.target(gapS, 1.8, H - 1.8)
        const n = 2 + (this.r() < 0.4 + 0.4 * h ? 1 : 0)
        o.a = kind === "rocks" ? this.range(0.3, 0.55 + 0.3 * h) : 0
        o.p = this.range(3.5, 4.5)
        for (let i = 0; i < n * 5 && o.gears.length < n; i++) {
          const r = kind === "rocks" ? this.range(1.2, 1.8 + 0.4 * h) : this.range(1.1, 1.6 + 0.5 * h)
          // cristais nascem do teto ou do chão; rochas em qualquer lugar
          const x = this.range(-W / 2 + 0.4, W / 2 - 0.4)
          const y = kind === "crystals" ? (this.r() < 0.5 ? this.range(-0.3, 0.5) : this.range(H - 0.5, H + 0.3)) : this.range(0.5, H - 0.5)
          if (Math.hypot(x - tg.x, y - tg.y) < r + o.a + 1.4) continue
          if (o.gears.some((q) => Math.hypot(q.x - x, q.y - y) < q.r + r + 0.2)) continue
          o.gears.push({ x, y, r })
        }
        if (!o.gears.length) o.gears.push({ x: tg.x > 0 ? -3.8 : 3.8, y: tg.y, r: 1.1 })
        this.path(tg.x, tg.y, 0.8, 0.8)
        break
      }
      default:
        // os tipos do túnel original (Forja Vulcânica): os números do gerador antigo
        return this.placeOld(kind, z, h, v)
    }
    this.obstacles.push(o)
    return z + o.d
  }

  /** Os tipos antigos no gerador de fases (a dificuldade é a da fase). */
  private placeOld(kind: ObstacleKind, z: number, h: number, v: number): number {
    const o = this.base(kind, z)
    o.x0 = NaN
    switch (kind) {
      case "pressV":
        o.g = 3.25 - 0.7 * h
        o.a = ((H - o.g) / 2 - 0.35) * this.range(0.45, 1)
        o.p = this.range(3.6, 4.6) - 1.1 * h
        this.path(this.px, H / 2, 1, o.a)
        break
      case "pressH":
        o.g = 3.4 - 0.7 * h
        o.a = ((W - o.g) / 2 - 0.35) * this.range(0.45, 1)
        o.p = this.range(3.4, 4.4) - 1 * h
        this.path(0, this.py, o.a, 2)
        break
      case "crusher":
        o.p = this.range(2.4, 3) - 0.6 * h
        this.path(0, 2.6, 3, 1.4)
        break
      case "piston": {
        o.side = this.r() < 0.5 ? -1 : 1
        o.a = W * (0.5 + 0.18 * h)
        o.p = this.range(2.6, 3.4) - 0.5 * h
        const twin: Obstacle = { ...o, id: ++this.oid, side: o.side < 0 ? 1 : -1, z: z + 0.9 * v * 0.5 + o.d, ph: frac(o.ph + 0.5), gears: [] }
        this.obstacles.push(o, twin)
        this.path(0, this.py, 3, 2)
        return twin.z + twin.d
      }
      case "pipes":
        o.y0 = this.range(2.3, H - 2.3)
        o.x0 = this.r() < 0.35 + 0.4 * h ? this.range(-2.6, 2.6) : NaN
        this.path(0, this.py, 3, 2)
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
        this.path(0, H / 2, 2, 2)
        break
      }
      default:
        break
    }
    this.obstacles.push(o)
    return z + o.d
  }

  /** Galões no vão depois de um obstáculo: no caminho (o meio do vão que acabou de passar). */
  private fuelAfter(end: number, gap: number, h: number) {
    const ru = this.phase
    if (this.r() >= ru.can - 0.3 * h) return
    const x = clampX(this.px + this.range(-0.6, 0.6))
    const y = clampY(this.py + this.range(-0.5, 0.5))
    const cz = end + gap * this.range(0.22, 0.4)
    if (this.r() < ru.trio - 0.15 * h) {
      const dy = this.range(-0.45, 0.45)
      for (let i = 0; i < 3; i++) this.can(x, clampY(y + dy * i), cz - 3.2 + i * 3.2)
    } else this.can(x, y, cz)
  }

  /**
   * Jetpack 3.0 (mm3d-78): sequência de DESCIDA — as passagens não ficam só no meio nem só subindo.
   * Alterna duas: ESCADA (três anéis, do alto até perto do chão, em dois degraus) e MERGULHO (anel
   * alto → faixa livre embaixo → anel baixo do outro lado). Cada degrau desce no máximo `DESCENT.drop`
   * no tempo entre duas passagens (≥ 1 s): a queda livre da regra faz ~5 m nesse tempo, então sobra.
   * A entrada sobe no máximo `DESCENT.rise` a partir do caminho. Galão no meio de cada descida.
   */
  private descent(z0: number, h: number) {
    let z = z0
    const v = speedAt(z0)
    const step = Math.max(15, 1.1 * v)
    const hh = Math.min(h, 0.6)
    const r = 2.2 - 0.25 * hh
    const hiY = H - r - 0.45
    const loY = r + 0.45
    const y1 = Math.max(loY + 1.2, Math.min(hiY, this.py + DESCENT.rise))
    const ring = (x: number, y: number) => {
      const o = this.base("ring", z)
      o.g = r
      o.x0 = Math.max(-W / 2 + r + 0.3, Math.min(W / 2 - r - 0.3, x))
      o.y0 = y
      this.obstacles.push(o)
      this.path(o.x0, y, r * 0.5, r * 0.5)
      z += o.d
      return o
    }
    const x0 = clampX(Math.max(-1.5, Math.min(1.5, this.px)))
    if (this.descents++ % 2 === 0) {
      // ESCADA: alto → meio → baixo, desviando um pouco de lado a cada degrau
      const mid = (y1 + loY) / 2
      const dir = x0 > 0 ? -1 : 1
      ring(x0, y1)
      this.can(x0 + dir * 0.4, (y1 + mid) / 2, z + step * 0.5)
      z += step
      ring(x0 + dir * 0.8, mid)
      this.can(x0 + dir * 1.2, (mid + loY) / 2, z + step * 0.5)
      z += step
      ring(x0 + dir * 1.6, loY)
    } else {
      // MERGULHO: anel alto, a faixa livre embaixo (a parede fecha o alto) e o anel baixo do outro lado
      ring(x0, y1)
      z += step
      const b = this.base("band", z)
      b.h = 3.1 - 0.4 * hh
      b.w = W + 2 * OUT + 2
      b.x0 = 0
      b.y0 = Math.max(b.h / 2 + 0.6, Math.min(y1 - DESCENT.drop, 1 + b.h / 2))
      this.obstacles.push(b)
      this.can(x0, b.y0, z + b.d + step * 0.4)
      this.path(x0, b.y0, 2.5, b.h / 2 - 0.75)
      z += b.d + step
      ring(-Math.sign(x0 || 1) * 1.6, Math.max(loY, Math.min(b.y0 + 0.4, hiY)))
    }
    this.nextZ = z + step * 0.6
  }

  /** Trecho especial (mm3d-75): uma sequência desenhada, sempre com galão. */
  private setPiece(kind: SetPiece, z0: number, h: number) {
    let z = z0
    const v = speedAt(z0)
    const step = Math.max(14, 1.05 * v)
    const hh = Math.min(h, 0.6)
    switch (kind) {
      case "rings3":
      case "arches": {
        // três anéis em arco suave, com um galão no meio de cada um
        const r = kind === "arches" ? 2.45 - 0.3 * hh : 2.15 - 0.3 * hh
        const dir = this.py > H / 2 ? -1 : 1
        const x0 = clampX(Math.max(-2, Math.min(2, this.px)))
        for (let i = 0; i < 3; i++) {
          const o = this.base("ring", z)
          o.g = r
          o.x0 = Math.max(-W / 2 + r + 0.3, Math.min(W / 2 - r - 0.3, x0 + (i - 1) * 0.5 * dir))
          o.y0 = Math.max(r + 0.4, Math.min(H - r - 0.4, this.py + (i === 0 ? 0 : dir * 0.7)))
          this.obstacles.push(o)
          this.can(o.x0, o.y0, z + o.d / 2)
          this.path(o.x0, o.y0, r * 0.5, r * 0.5)
          z += o.d + step
        }
        break
      }
      case "gates3": {
        // três portões deslizando quase juntos (o vão sobe e desce em fila)
        const ph = this.r()
        const x = clampX(Math.max(-2, Math.min(2, this.px)))
        for (let i = 0; i < 3; i++) {
          const o = this.base("slider", z)
          o.w = 4.6 - 0.6 * hh
          o.h = 3.1
          o.a = 1.1
          o.p = 4.2
          o.ph = frac(ph + i * 0.08)
          o.x0 = x
          o.y0 = H / 2
          this.obstacles.push(o)
          if (i === 1) this.can(x, H / 2, z - step / 2)
          this.path(x, H / 2, o.w / 2 - 0.4, o.a + 0.3)
          z += o.d + step
        }
        break
      }
      case "furnace": {
        // a fornalha: pilão, o par de engrenagens e outro pilão
        for (const k of ["crusher", "gears", "crusher"] as const) {
          z = this.placeOld(k, z, hh, v) + step
          if (k === "gears") this.can(0, H / 2, z - step / 2)
        }
        break
      }
      case "icecave": {
        // a caverna: três vãos estreitos em zigue-zague e o grande arco congelado
        for (let i = 0; i < 3; i++) {
          const o = this.base("narrow", z)
          o.w = 3
          o.h = 3.1
          o.x0 = (i % 2 ? 1 : -1) * 1.2
          o.y0 = Math.max(2.3, Math.min(H - 2.3, this.py + (i - 1) * 0.7))
          this.obstacles.push(o)
          this.path(o.x0, o.y0, 1, 0.8)
          z += o.d + step
        }
        this.can(this.px, this.py, z - step / 2)
        const o = this.base("ring", z)
        o.g = 2.6
        o.x0 = 0
        o.y0 = Math.max(3, Math.min(H - 3, this.py))
        this.obstacles.push(o)
        this.path(0, o.y0, 1.3, 1.3)
        z += o.d + step
        break
      }
    }
    this.sets.push({ z0: z0 - 12, z1: z, kind })
    this.nextZ = z + step * 0.5
  }
}

/** Sequências de descida (mm3d-78): a primeira em `at` m e depois a cada `every`; subida máxima na entrada e queda máxima por degrau (m). */
export const DESCENT = { at: 420, every: 820, rise: 1.6, drop: 3.4 } as const

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

/** O corpo em (x, y) encosta no obstáculo no tempo t? (o anel: só passa com a caixa inteira dentro do vão redondo) */
export function hits(o: Obstacle, t: number, x: number, y: number, rects: Rect[] = [], discs: Disc[] = []): boolean {
  if (o.kind === "ring") {
    const c = ringAt(o, t)
    const dx = Math.abs(x - c.x) + TUNING.hx
    const dy = Math.abs(y - c.y) + TUNING.hy
    return dx * dx + dy * dy > c.r * c.r
  }
  shapes(o, t, rects, discs)
  return rects.some((r) => hitsRect(x, y, r)) || discs.some((d) => hitsDisc(x, y, d))
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
  /** Fator de velocidade do personagem (speedFactor). */
  readonly k: number
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

  constructor(seed: number, k = 1, phase: PhaseId | string = "industrial") {
    this.k = Number.isFinite(k) && k > 0 ? k : 1
    this.v = TUNING.v0 * this.k
    this.course = new Course(seed, phase)
    this.course.ensure(300)
  }

  step(inp: FlightInput, ev: FlightEvent[]) {
    if (!this.alive) return
    const dt = TUNING.step
    this.t += dt
    const z0 = this.z
    this.v = speedAt(this.z, this.k)
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
        if (hits(o, this.t, this.x, this.y, this.rects, this.discs)) {
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
