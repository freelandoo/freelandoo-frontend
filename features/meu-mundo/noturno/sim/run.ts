// features/meu-mundo/noturno/sim/run.ts — ROLÊ NOTURNO (mm3d-40): a regra.
//
// Corrida sem fim numa rua de noite, de bicicleta, skate ou patins (pedido do
// Alex: "vai coletando moedas e cada vez fica mais rápido"). Sem Babylon: roda
// no node (harness) e no jogo.
//
//  - Três faixas (x = −2,5 / 0 / +2,5). O jogador anda para +z; a velocidade
//    é função da DISTÂNCIA (v0 → vmax), então a rua é gerada sabendo a
//    velocidade com que cada trecho vai ser alcançado.
//  - Obstáculos são caixas com teto: chegar por cima (ou até `stepUp` abaixo
//    do teto) = sobe e anda em cima — carro e caminhão viram chão. Bater de
//    frente = fim. Entrar de lado = tropeço e volta para a faixa de antes;
//    dois tropeços em 5 s = fim.
//  - Rampa de skate: sobe pela superfície e, na borda, lança para cima (dá
//    para cair no teto do caminhão logo depois) com uma manobra de 360°.
//  - Carros na contramão e andando na mesma mão: começam a se mexer quando o
//    jogador chega a `act` metros; o gerador reserva a faixa pelo trecho que
//    eles percorrem, para nada atravessar nada.

export type RideKind = "bike" | "skate" | "skates"
export type ObstacleKind = "car" | "amb" | "truck" | "barrier" | "ramp"

export const LANE = 2.5
export const LANE_X = [-LANE, 0, LANE] as const

/** Cada veículo com o seu jeito (diferenças pequenas, para o gosto da escolha). */
export const RIDES: Record<RideKind, { v0: number; vmax: number; jumpH: number; laneTime: number }> = {
  bike: { v0: 12, vmax: 30, jumpH: 1.45, laneTime: 0.2 },
  skate: { v0: 11, vmax: 27, jumpH: 1.75, laneTime: 0.17 },
  skates: { v0: 11.5, vmax: 28, jumpH: 1.55, laneTime: 0.13 },
}

export const TUNING = {
  step: 1 / 120,
  gravity: 32,
  /** Puxar para baixo no ar: desce na hora. */
  dropV: -22,
  /** Velocidade vertical na borda da rampa. */
  launchV: 12.5,
  /** Chegar até isto abaixo do teto ainda sobe (sem bater). */
  stepUp: 0.55,
  half: 0.35,
  /** Distância em que carros parados no trânsito começam a andar. */
  act: 110,
  /** Metros para a velocidade chegar a ~63% do caminho até a máxima. */
  speedK: 1500,
  /** Janela do segundo tropeço (s). */
  stumbleWindow: 5,
  /** Metros vazios no começo. */
  lead: 75,
  /** Pulo e descida guardados por este tempo antes de valer (s). */
  buffer: 0.16,
  /** Pontos por moeda e por manobra limpa. */
  coinPoints: 10,
  trickPoints: 50,
} as const

/** Medidas da regra (iguais aos modelos: pipeline/noturno/build_props.py e supercar/ambulância). */
export const KINDS: Record<ObstacleKind, { hw: number; len: number; top: number; solid: boolean }> = {
  car: { hw: 1.07, len: 4.38, top: 1.28, solid: true },
  amb: { hw: 1.24, len: 5.7, top: 2.9, solid: true },
  truck: { hw: 1.24, len: 9.12, top: 3.0, solid: true },
  barrier: { hw: 1.08, len: 0.4, top: 1.0, solid: true },
  ramp: { hw: 1.12, len: 3.6, top: 1.1, solid: false },
}

export interface Obstacle {
  id: number
  kind: ObstacleKind
  lane: number
  x: number
  /** Traseira (menor z) agora. */
  z: number
  /** No quadro anterior (para saber se entrou de frente ou de lado). */
  pz: number
  /** m/s para +z (negativo = contramão). */
  u: number
  /** Para onde aponta: 1 = mesma mão (vemos a traseira), −1 = contramão. */
  dir: 1 | -1
  /** z do jogador a partir do qual anda. */
  actAt: number
  /** Cor (carros), índice. */
  tint: number
}

export interface Coin {
  id: number
  x: number
  y: number
  /** z absoluto, ou deslocamento a partir da traseira do `host`. */
  z: number
  host: Obstacle | null
  taken: boolean
}

export interface RunInput {
  left: boolean
  right: boolean
  jump: boolean
  down: boolean
}

export type RunEvent =
  | { type: "coin"; n: number }
  | { type: "jump" }
  | { type: "launch" }
  | { type: "land"; hard: boolean; trick: boolean }
  | { type: "step" }
  | { type: "lane" }
  | { type: "stumble" }
  | { type: "crash"; kind: ObstacleKind | "stumble" }

export function speedAt(ride: RideKind, dist: number) {
  const r = RIDES[ride]
  return r.v0 + (r.vmax - r.v0) * (1 - Math.exp(-Math.max(0, dist) / TUNING.speedK))
}

function mulberry(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Altura da rampa a `s` metros do começo (a mesma curva do modelo). */
export function rampY(s: number) {
  const t = Math.max(0, Math.min(1, s / KINDS.ramp.len))
  return KINDS.ramp.top * Math.pow(1 - Math.cos((t * Math.PI) / 2), 0.85)
}

export class Run {
  readonly ride: RideKind
  private readonly rnd: () => number
  obstacles: Obstacle[] = []
  coins: Coin[] = []
  private seq = 0
  /** Onde o próximo trecho começa. */
  private nextZ: number = TUNING.lead
  /** Até onde cada faixa está ocupada (reserva dos que andam incluída). */
  private busy = [0, 0, 0]

  // ── o jogador ────────────────────────────────────────────────────────────
  z = 0
  x = 0
  lane = 1
  private fromLane = 1
  y = 0
  vy = 0
  grounded = true
  alive = true
  time = 0
  v = 0
  coinsGot = 0
  tricks = 0
  /** Manobra no ar (0–1 do giro; null = sem manobra). */
  spin: number | null = null
  private airTime = 0
  private airDur = 0.8
  private onRamp: Obstacle | null = null
  private stumbleT = 0
  private jumpBuf = 0
  private downBuf = 0
  crashedBy: ObstacleKind | "stumble" | null = null
  private ticks = 0

  constructor(ride: RideKind, seed = 1) {
    this.ride = ride
    this.rnd = mulberry(seed)
    this.v = speedAt(ride, 0)
    // começo: uma fileira de moedas no meio para chamar
    for (let i = 0; i < 8; i++) this.addCoin(LANE_X[1], 0.9, 18 + i * 3)
    this.generate(260)
  }

  get score() {
    return Math.floor(this.z) + this.coinsGot * TUNING.coinPoints + this.tricks * TUNING.trickPoints
  }

  /** Dificuldade 0–1 pela distância. */
  private diff(z: number) {
    return Math.min(1, Math.max(0, (z - 150) / 2600))
  }

  // ═══ geração ══════════════════════════════════════════════════════════════
  private add(kind: ObstacleKind, lane: number, z: number, u = 0, dir: 1 | -1 = 1): Obstacle {
    const o: Obstacle = { id: ++this.seq, kind, lane, x: LANE_X[lane], z, pz: z, u, dir, actAt: z - TUNING.act, tint: Math.floor(this.rnd() * 8) }
    this.obstacles.push(o)
    return o
  }

  private addCoin(x: number, y: number, z: number, host: Obstacle | null = null) {
    this.coins.push({ id: ++this.seq, x, y, z, host, taken: false })
  }

  private coinLine(lane: number, z0: number, n: number, gap = 3) {
    for (let i = 0; i < n; i++) this.addCoin(LANE_X[lane], 0.9, z0 + i * gap)
  }

  /** Arco de moedas de um pulo a partir de `z0` (altura de saída y0, vy). */
  private coinArc(lane: number, z0: number, y0: number, vy: number, v: number, n = 7) {
    const g = TUNING.gravity
    const tEnd = (vy + Math.sqrt(vy * vy + 2 * g * Math.max(0, y0))) / g
    for (let i = 1; i <= n; i++) {
      const t = (tEnd * i) / (n + 1)
      const y = y0 + vy * t - (g * t * t) / 2
      if (y > 0.4) this.addCoin(LANE_X[lane], y + 0.9, z0 + v * t)
    }
  }

  private shuffle<T>(a: T[]) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.rnd() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  private pick<T>(a: readonly T[]) {
    return a[Math.floor(this.rnd() * a.length)]
  }

  /** Gera trechos até `upTo` (z). */
  generate(upTo: number) {
    while (this.nextZ < upTo) {
      const z = this.nextZ
      const d = this.diff(z)
      const v = speedAt(this.ride, z)
      const free = [0, 1, 2].filter((l) => this.busy[l] <= z - 1)
      const len = free.length ? this.pattern(z, d, v, free) : 6
      const gap = v * (1.5 - 0.65 * d) * (0.85 + this.rnd() * 0.3)
      this.nextZ = z + len + gap
    }
  }

  private mark(lane: number, until: number) {
    this.busy[lane] = Math.max(this.busy[lane], until)
  }

  /** Um trecho começando em z; devolve o comprimento. Sempre sobra uma faixa livre (ou passável). */
  private pattern(z: number, d: number, v: number, free: number[]): number {
    const lanes = this.shuffle([...free])
    const r = this.rnd()
    const g = TUNING.gravity
    const jumpV = Math.sqrt(2 * g * RIDES[this.ride].jumpH)
    // pesos pelo que a dificuldade libera
    const opts: [string, number][] = [
      ["barrier", 1.2],
      ["cars", 1.4],
      ["rampTruck", 1.1],
      ["ramp", 0.7],
      ["coins", 0.6 - d * 0.3],
      ["oncoming", d > 0.12 ? 0.9 : 0],
      ["mover", d > 0.08 ? 0.7 : 0],
      ["wall", d > 0.3 && free.length === 3 ? 0.8 + d : 0],
      ["amb", 0.5],
    ]
    let total = 0
    for (const [, w] of opts) total += Math.max(0, w)
    let pickW = r * total
    let kind = "coins"
    for (const [k, w] of opts) {
      pickW -= Math.max(0, w)
      if (pickW <= 0) {
        kind = k
        break
      }
    }
    const one = lanes.length === 1
    if (one && kind !== "barrier" && kind !== "ramp" && kind !== "coins") kind = this.rnd() < 0.5 ? "barrier" : "coins"

    switch (kind) {
      case "barrier": {
        const n = one ? 1 : Math.min(lanes.length, this.rnd() < 0.35 + d * 0.4 ? 2 : 1)
        const blocked = lanes.slice(0, n)
        for (const l of blocked) {
          this.add("barrier", l, z)
          this.mark(l, z + 1)
        }
        // um arco por cima de uma barreira (mostra o pulo)
        this.coinArc(blocked[0], z - (jumpV / g) * v, 0, jumpV, v, 7)
        if (lanes.length > n) this.coinLine(lanes[n], z - 6, 5)
        return 2
      }
      case "cars": {
        const n = Math.min(lanes.length - 1, this.rnd() < 0.4 + d * 0.4 ? 2 : 1)
        for (let i = 0; i < n; i++) {
          const zz = z + this.rnd() * 6
          const k = this.rnd() < 0.15 ? "amb" : "car"
          this.add(k, lanes[i], zz)
          this.mark(lanes[i], zz + KINDS[k].len + 1)
        }
        this.coinLine(lanes[n], z - 4, 6)
        return 12
      }
      case "amb": {
        const l = lanes[0]
        this.add("amb", l, z)
        this.mark(l, z + KINDS.amb.len + 1)
        // dá para subir na ambulância? não (2,9 m): passe ao lado; moedas na outra faixa
        if (lanes.length > 1) this.coinLine(lanes[1], z - 3, 5)
        return KINDS.amb.len + 2
      }
      case "ramp": {
        const l = lanes[0]
        this.add("ramp", l, z)
        const lip = z + KINDS.ramp.len
        this.coinArc(l, lip, KINDS.ramp.top, TUNING.launchV, v, 9)
        this.mark(l, lip + v * 0.9)
        return KINDS.ramp.len + v * 0.9
      }
      case "rampTruck": {
        const l = lanes[0]
        this.add("ramp", l, z)
        const lip = z + KINDS.ramp.len
        const gap = Math.max(3.5, Math.min(11, v * 0.38))
        const t = this.add("truck", l, lip + gap)
        this.coinArc(l, lip, KINDS.ramp.top, TUNING.launchV, v, 5)
        for (let i = 0; i < 4; i++) this.addCoin(LANE_X[l], KINDS.truck.top + 0.9, 2 + i * 2.2, t)
        this.mark(l, lip + gap + KINDS.truck.len + 1)
        // do lado: um carro parado (mais tarde)
        if (lanes.length > 2 && d > 0.35) {
          this.add("car", lanes[1], lip + gap + 1)
          this.mark(lanes[1], lip + gap + 1 + KINDS.car.len + 1)
        }
        return KINDS.ramp.len + gap + KINDS.truck.len
      }
      case "wall": {
        // dois caminhões lado a lado; a terceira faixa tem rampa+caminhão ou barreira
        const [a, b, c] = lanes
        const tz = z + KINDS.ramp.len + Math.max(3.5, Math.min(11, v * 0.38))
        for (const l of [a, b]) {
          const t = this.add("truck", l, tz)
          this.mark(l, tz + KINDS.truck.len + 1)
          for (let i = 0; i < 3; i++) this.addCoin(LANE_X[l], KINDS.truck.top + 0.9, 2.5 + i * 2.5, t)
        }
        if (this.rnd() < 0.5) {
          this.add("ramp", c, z)
          const t = this.add("truck", c, tz)
          this.mark(c, tz + KINDS.truck.len + 1)
          for (let i = 0; i < 3; i++) this.addCoin(LANE_X[c], KINDS.truck.top + 0.9, 2.5 + i * 2.5, t)
        } else {
          this.add("barrier", c, tz + 2)
          this.mark(c, tz + 3)
          this.coinArc(c, tz + 2 - (jumpV / g) * v, 0, jumpV, v, 7)
        }
        return tz - z + KINDS.truck.len
      }
      case "oncoming": {
        // carro na contramão: encontra o jogador perto de `z`; a faixa fica reservada até onde ele nasce
        const l = lanes[0]
        const u = -(7 + this.rnd() * 3 + d * 3)
        const z0 = z + (-u * TUNING.act) / (v - u)
        const o = this.add("car", l, z0, u, -1)
        o.actAt = z0 - TUNING.act
        this.mark(l, z0 + KINDS.car.len + 4)
        if (lanes.length > 1) this.coinLine(lanes[1], z - 6, 6)
        if (lanes.length > 2 && d > 0.3) {
          this.add("barrier", lanes[2], z)
          this.mark(lanes[2], z + 1)
        }
        return 8
      }
      case "mover": {
        // carro andando na mesma mão, mais devagar: você chega nele
        const l = lanes[0]
        const u = Math.min(8, v * 0.45) * (0.6 + this.rnd() * 0.4)
        const z0 = z
        const meet = z0 + (u * TUNING.act) / (v - u)
        const o = this.add(this.rnd() < 0.3 ? "truck" : "car", l, z0, u, 1)
        o.actAt = z0 - TUNING.act
        this.mark(l, meet + KINDS[o.kind].len + 4)
        if (lanes.length > 1) this.coinLine(lanes[1], z - 4, 5)
        return 6
      }
      default: {
        // moedas em zigue-zague pelas faixas livres
        let l = lanes[0]
        for (let i = 0; i < 9; i++) {
          this.addCoin(LANE_X[l], 0.9, z + i * 3)
          if (i % 3 === 2 && lanes.length > 1) l = lanes[(lanes.indexOf(l) + 1) % lanes.length]
        }
        return 27
      }
    }
  }

  // ═══ passo ════════════════════════════════════════════════════════════════
  coinZ(c: Coin) {
    return c.host ? c.host.z + c.z : c.z
  }

  /** Chão sob (x, z): teto do que estiver embaixo, superfície da rampa ou a rua. */
  private support(x: number, z: number, y: number): { h: number; ramp: Obstacle | null } {
    let h = 0
    let ramp: Obstacle | null = null
    for (const o of this.obstacles) {
      const k = KINDS[o.kind]
      if (Math.abs(x - o.x) >= k.hw + TUNING.half) continue
      if (z < o.z - 0.05 || z > o.z + k.len) continue
      const top = o.kind === "ramp" ? rampY(z - o.z) : k.top
      // só conta como chão o que está abaixo dos pés (ou logo acima, degrau)
      if (top <= y + TUNING.stepUp && top > h) {
        h = top
        ramp = o.kind === "ramp" ? o : null
      }
    }
    return { h, ramp }
  }

  step(input: RunInput, out: RunEvent[]) {
    if (!this.alive) return
    const dt = TUNING.step
    const T = TUNING
    this.time += dt
    if (this.stumbleT > 0) this.stumbleT -= dt
    if (input.jump) this.jumpBuf = T.buffer
    if (input.down) this.downBuf = T.buffer
    if (this.jumpBuf > 0) this.jumpBuf -= dt
    if (this.downBuf > 0) this.downBuf -= dt

    // faixa
    if (input.left && this.lane > 0) {
      this.fromLane = this.lane
      this.lane--
      out.push({ type: "lane" })
    }
    if (input.right && this.lane < 2) {
      this.fromLane = this.lane
      this.lane++
      out.push({ type: "lane" })
    }
    const prevX = this.x
    const prevZ = this.z
    const rate = LANE / RIDES[this.ride].laneTime
    const dx = LANE_X[this.lane] - this.x
    this.x += Math.sign(dx) * Math.min(Math.abs(dx), rate * dt)

    // frente
    this.v = speedAt(this.ride, this.z)
    this.z += this.v * dt

    // quem anda
    for (const o of this.obstacles) {
      o.pz = o.z
      if (o.u !== 0 && this.z >= o.actAt) o.z += o.u * dt
    }

    // vertical
    const sup = this.support(this.x, this.z, this.y)
    if (this.grounded) {
      if (this.onRamp && !sup.ramp && this.z > this.onRamp.z + KINDS.ramp.len - 0.2) {
        // borda da rampa: lança (com pulo junto, mais alto) e gira
        this.vy = T.launchV + (this.jumpBuf > 0 ? 2.5 : 0)
        this.jumpBuf = 0
        this.grounded = false
        this.spin = 0
        this.airTime = 0
        this.airDur = (2 * this.vy) / T.gravity
        out.push({ type: "launch" })
      } else if (this.jumpBuf > 0) {
        this.vy = Math.sqrt(2 * T.gravity * RIDES[this.ride].jumpH)
        this.jumpBuf = 0
        this.grounded = false
        this.spin = null
        this.airTime = 0
        out.push({ type: "jump" })
      } else if (sup.h < this.y - 0.08) {
        // acabou o teto: cai
        this.grounded = false
        this.vy = 0
        this.spin = null
      } else {
        if (sup.h > this.y + 0.05 && !sup.ramp) out.push({ type: "step" })
        this.y = sup.h
      }
      this.onRamp = sup.ramp
    }
    if (!this.grounded) {
      this.airTime += dt
      if (this.downBuf > 0) {
        this.vy = Math.min(this.vy, T.dropV)
        this.downBuf = 0
        if (this.spin !== null) this.spin = null
      }
      this.vy -= T.gravity * dt
      this.y += this.vy * dt
      if (this.spin !== null) this.spin = Math.min(1, this.airTime / Math.max(0.3, this.airDur * 0.85))
      const s2 = this.support(this.x, this.z, this.y)
      if (this.y <= s2.h && this.vy <= 0) {
        const hard = this.vy < -14
        const trick = this.spin !== null && this.spin >= 1
        if (trick) this.tricks++
        this.y = s2.h
        this.vy = 0
        this.grounded = true
        this.spin = null
        this.onRamp = s2.ramp
        out.push({ type: "land", hard, trick })
      }
    }

    // batidas: caixa que está à frente/ao lado mais alta que os pés
    for (const o of this.obstacles) {
      const k = KINDS[o.kind]
      if (!k.solid) continue
      if (Math.abs(this.x - o.x) >= k.hw + T.half) continue
      if (this.z < o.z - 0.3 || this.z > o.z + k.len) continue
      if (this.y >= k.top - T.stepUp) {
        if (this.y < k.top - 0.02 && this.vy <= 0) {
          this.y = k.top
          this.vy = 0
          if (!this.grounded) out.push({ type: "land", hard: false, trick: false })
          this.grounded = true
          this.spin = null
        }
        continue
      }
      const wasAhead = prevZ < o.pz - 0.3 + 1e-6 || (o.dir === -1 && prevZ < o.pz)
      const wasBeside = Math.abs(prevX - o.x) >= k.hw + T.half - 1e-6
      if (wasBeside && !wasAhead) {
        // entrou de lado: volta para a faixa de antes
        this.x = prevX
        this.lane = this.fromLane
        if (this.stumbleT > 0) return this.crash("stumble", out)
        this.stumbleT = T.stumbleWindow
        out.push({ type: "stumble" })
        continue
      }
      return this.crash(o.kind, out)
    }

    // moedas
    for (const c of this.coins) {
      if (c.taken) continue
      const cz = this.coinZ(c)
      if (Math.abs(cz - this.z) > 0.9 || Math.abs(c.x - this.x) > 0.85) continue
      if (Math.abs(c.y - (this.y + 0.9)) > 1.15) continue
      c.taken = true
      this.coinsGot++
      out.push({ type: "coin", n: this.coinsGot })
    }

    // limpeza e mais rua à frente
    if (++this.ticks % 30 === 0) {
      const cut = this.z - 40
      this.obstacles = this.obstacles.filter((o) => o.z + KINDS[o.kind].len > cut || o.u < 0)
      this.obstacles = this.obstacles.filter((o) => o.z + KINDS[o.kind].len > this.z - 80)
      this.coins = this.coins.filter((c) => !c.taken && this.coinZ(c) > cut)
    }
    this.generate(this.z + 260)
  }

  private crash(kind: ObstacleKind | "stumble", out: RunEvent[]) {
    this.alive = false
    this.crashedBy = kind
    out.push({ type: "crash", kind })
  }
}
