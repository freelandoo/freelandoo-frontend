// features/meu-mundo/corrida/sim/track.ts — CORRIDA ANTIGRAVIDADE (mm3d-39): a pista.
//
// A pista é desenhada como uma tartaruga: uma lista de peças (reta, curva,
// rampa, vão) a partir da largada; a última peça é uma curva de Hermite que
// fecha o circuito de volta na largada. Depois tudo é reamostrado a cada
// STEP metros pelo comprimento: o resto do jogo só enxerga amostras.
//
// Convenções do Meu Mundo: +x leste, +z norte, y para cima; rumo (yaw) 0 =
// olhando para +z, crescendo vira para a DIREITA (frente = (sin, cos),
// direita = (cos, −sin)). `u` = metros para a direita do eixo da pista.
//
// Sem Babylon (testável no node; nada de enum nem parâmetro-propriedade).

export const STEP = 2

export type PieceKind = "road" | "ramp" | "gap"

export interface Piece {
  len: number
  /** Graus; + = para a direita. */
  turn?: number
  /** Metros de subida (−: descida). No vão é a queda até o pouso. */
  dy?: number
  kind?: PieceKind
  /** Faixas de turbo: posição (m) dentro da peça e o lado (−1 esquerda, 0 meio, 1 direita). */
  pads?: [number, number][]
  /** Cápsulas de turbo: posição (m) dentro da peça e o u (m). */
  orbs?: [number, number][]
  /** Arco de neon na posição (m) dentro da peça. */
  gates?: number[]
}

export interface TrackDef {
  id: string
  width: number
  startY: number
  /** Metros da largada a partir do começo da primeira peça. */
  startS: number
  pieces: Piece[]
}

export interface Pad {
  s: number
  len: number
  u0: number
  u1: number
}
export interface Orb {
  id: number
  s: number
  u: number
}
export interface Gap {
  /** Começo do vão (fim da rampa) e o pouso. */
  s0: number
  s1: number
  /** Altura do pouso (para saber quem caiu). */
  landY: number
  /** Comprimento da rampa antes do vão (0 = penhasco seco). */
  ramp: number
}

export interface Track {
  id: string
  width: number
  /** Comprimento da volta (múltiplo de STEP). */
  length: number
  n: number
  x: Float32Array
  z: Float32Array
  y: Float32Array
  yaw: Float32Array
  /** Inclinação (dy/ds) do eixo. */
  slope: Float32Array
  /** Inclinação lateral (rad, + = lado direito mais baixo — curva para a direita). */
  bank: Float32Array
  /** Curvatura com sinal (1/m, + = para a direita). */
  curv: Float32Array
  /** 1 = sem chão (vão), 2 = rampa. */
  flag: Uint8Array
  startS: number
  pads: Pad[]
  orbs: Orb[]
  gaps: Gap[]
  gates: number[]
  /** Caixa do circuito (minimapa, cidade). */
  bounds: { x0: number; x1: number; z0: number; z1: number; y0: number; y1: number }
}

export interface TrackPoint {
  x: number
  z: number
  y: number
  yaw: number
  slope: number
  bank: number
  curv: number
  gap: boolean
  ramp: boolean
}

const DEG = Math.PI / 180
const smooth = (t: number) => t * t * (3 - 2 * t)

export function wrapAngle(a: number): number {
  while (a > Math.PI) a -= 2 * Math.PI
  while (a < -Math.PI) a += 2 * Math.PI
  return a
}

/** s dentro de [0, length). */
export function wrapS(t: Track, s: number): number {
  const L = t.length
  return ((s % L) + L) % L
}

interface Dense {
  x: number
  z: number
  y: number
  flag: number
}

export function buildTrack(def: TrackDef): Track {
  // ── 1. tartaruga em passos finos ─────────────────────────────────────────
  const fine = 0.5
  const dense: Dense[] = []
  const marks: { at: number; piece: Piece; i: number }[] = []
  let x = 0
  let z = 0
  let y = def.startY
  let yaw = 0
  let run = 0
  const pieceStart: number[] = []
  def.pieces.forEach((p, i) => {
    pieceStart.push(run)
    marks.push({ at: run, piece: p, i })
    const n = Math.max(1, Math.round(p.len / fine))
    const kind = p.kind ?? "road"
    const turn = (p.turn ?? 0) * DEG
    const dy = p.dy ?? 0
    const y0 = y
    for (let k = 0; k < n; k++) {
      yaw += turn / n
      x += Math.sin(yaw) * fine
      z += Math.cos(yaw) * fine
      const tt = (k + 1) / n
      // estrada: sobe/desce suave (inclinação zero nas pontas); rampa: cada vez mais
      // íngreme (decola no fim); vão: linha reta até o pouso (só para referência).
      y = kind === "ramp" ? y0 + dy * tt * tt : kind === "gap" ? y0 + dy * tt : y0 + dy * smooth(tt)
      dense.push({ x, z, y, flag: kind === "gap" ? 1 : kind === "ramp" ? 2 : 0 })
    }
    run += n * fine
  })
  // ── 2. fecho: Hermite do fim de volta à largada ──────────────────────────
  {
    const ex = x
    const ez = z
    const ey = y
    const dist = Math.hypot(-ex, -ez)
    const k = dist * 1.1
    const t0 = { x: Math.sin(yaw) * k, z: Math.cos(yaw) * k }
    const t1 = { x: 0, z: k } // a largada olha para +z
    const n = Math.max(8, Math.round((dist * 1.15) / fine))
    for (let i = 1; i <= n; i++) {
      const t = i / n
      const h00 = 2 * t ** 3 - 3 * t * t + 1
      const h10 = t ** 3 - 2 * t * t + t
      const h01 = -2 * t ** 3 + 3 * t * t
      const h11 = t ** 3 - t * t
      dense.push({
        x: h00 * ex + h10 * t0.x + h11 * t1.x,
        z: h00 * ez + h10 * t0.z + h11 * t1.z,
        y: ey + (def.startY - ey) * smooth(t),
        flag: 0,
      })
    }
  }
  // ── 3. reamostra pelo comprimento ────────────────────────────────────────
  const cum = new Float64Array(dense.length + 1)
  let px = 0
  let pz = 0
  for (let i = 0; i < dense.length; i++) {
    const d = dense[i]
    cum[i + 1] = cum[i] + Math.hypot(d.x - px, d.z - pz)
    px = d.x
    pz = d.z
  }
  const total = cum[dense.length]
  const n = Math.round(total / STEP)
  const length = n * STEP
  const scale = total / length
  const T: Track = {
    id: def.id,
    width: def.width,
    length,
    n,
    x: new Float32Array(n),
    z: new Float32Array(n),
    y: new Float32Array(n),
    yaw: new Float32Array(n),
    slope: new Float32Array(n),
    bank: new Float32Array(n),
    curv: new Float32Array(n),
    flag: new Uint8Array(n),
    startS: def.startS,
    pads: [],
    orbs: [],
    gaps: [],
    gates: [],
    bounds: { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity, y0: Infinity, y1: -Infinity },
  }
  /** Posição na volta (m) de uma distância da tartaruga (antes da reamostragem). */
  const toS = (d: number) => Math.min(length - STEP, d / scale)
  let j = 0
  for (let i = 0; i < n; i++) {
    const want = i * STEP * scale
    while (j < dense.length - 1 && cum[j + 1] < want) j++
    const a = j === 0 ? { x: 0, z: 0, y: def.startY, flag: dense[0].flag } : dense[j - 1]
    const b = dense[j]
    const span = cum[j + 1] - cum[j] || 1
    const f = Math.min(1, Math.max(0, (want - cum[j]) / span))
    T.x[i] = a.x + (b.x - a.x) * f
    T.z[i] = a.z + (b.z - a.z) * f
    T.y[i] = a.y + (b.y - a.y) * f
    T.flag[i] = b.flag
  }
  // rumo, inclinação e curvatura por diferenças centradas
  for (let i = 0; i < n; i++) {
    const p = (i - 1 + n) % n
    const q = (i + 1) % n
    T.yaw[i] = Math.atan2(T.x[q] - T.x[p], T.z[q] - T.z[p])
    T.slope[i] = (T.y[q] - T.y[p]) / (2 * STEP)
  }
  // na ponta da rampa a diferença é para trás (a da frente já é o vão) e, no
  // vão, a inclinação "da pista" é a da rampa que acabou (o voo é balístico)
  for (let i = 0; i < n; i++) {
    const p = (i - 1 + n) % n
    if (T.flag[i] === 1) T.slope[i] = T.slope[p]
    else if (T.flag[(i + 1) % n] === 1) T.slope[i] = (T.y[i] - T.y[p]) / STEP
  }
  for (let i = 0; i < n; i++) {
    const p = (i - 1 + n) % n
    const q = (i + 1) % n
    T.curv[i] = wrapAngle(T.yaw[q] - T.yaw[p]) / (2 * STEP)
  }
  // inclinação lateral: curvatura suavizada (média de 30 m), até 16°
  const win = Math.round(15 / STEP)
  for (let i = 0; i < n; i++) {
    let c = 0
    for (let k = -win; k <= win; k++) c += T.curv[(i + k + n) % n]
    T.bank[i] = Math.max(-0.28, Math.min(0.28, (c / (2 * win + 1)) * 22))
  }
  for (let i = 0; i < n; i++) {
    const b = T.bounds
    b.x0 = Math.min(b.x0, T.x[i])
    b.x1 = Math.max(b.x1, T.x[i])
    b.z0 = Math.min(b.z0, T.z[i])
    b.z1 = Math.max(b.z1, T.z[i])
    b.y0 = Math.min(b.y0, T.y[i])
    b.y1 = Math.max(b.y1, T.y[i])
  }
  // ── 4. o que mora nas peças: faixas, cápsulas, arcos, vãos ───────────────
  const half = def.width / 2
  let orbId = 0
  for (const m of marks) {
    const p = m.piece
    const base = m.at
    for (const [at, side] of p.pads ?? []) {
      const w = def.width / 3
      const u0 = side < 0 ? -half + 0.8 : side > 0 ? half - 0.8 - w : -w / 2
      T.pads.push({ s: toS(base + at), len: 9, u0, u1: u0 + w })
    }
    for (const [at, u] of p.orbs ?? []) T.orbs.push({ id: orbId++, s: toS(base + at), u })
    for (const at of p.gates ?? []) T.gates.push(toS(base + at))
    if (p.kind === "gap") {
      const prev = def.pieces[m.i - 1]
      const ramp = prev && prev.kind === "ramp" ? prev.len : 0
      const s0 = toS(base)
      const s1 = toS(base + p.len)
      T.gaps.push({ s0, s1, landY: T.y[Math.round(s1 / STEP) % n], ramp: ramp / scale })
    }
  }
  return T
}

/** Ponto da pista em s (interpolado entre amostras). */
export function trackAt(t: Track, s: number, out?: TrackPoint): TrackPoint {
  const ss = wrapS(t, s) / STEP
  const i = Math.floor(ss) % t.n
  const k = (i + 1) % t.n
  const f = ss - Math.floor(ss)
  const o = out ?? ({} as TrackPoint)
  o.x = t.x[i] + (t.x[k] - t.x[i]) * f
  o.z = t.z[i] + (t.z[k] - t.z[i]) * f
  o.y = t.y[i] + (t.y[k] - t.y[i]) * f
  o.yaw = t.yaw[i] + wrapAngle(t.yaw[k] - t.yaw[i]) * f
  o.slope = t.slope[i] + (t.slope[k] - t.slope[i]) * f
  o.bank = t.bank[i] + (t.bank[k] - t.bank[i]) * f
  o.curv = t.curv[i] + (t.curv[k] - t.curv[i]) * f
  // vão: só quando as duas amostras são vão (as bordas ainda têm chão)
  o.gap = t.flag[i] === 1 && t.flag[k] === 1
  o.ramp = t.flag[i] === 2
  return o
}

/** Altura do chão em (s, u): a inclinação lateral abaixa o lado de dentro da curva. */
export function surfaceY(p: TrackPoint, u: number): number {
  return p.y - u * Math.sin(p.bank)
}

/** Ponto do mundo em (s, u, altura acima do eixo). */
export function worldAt(p: TrackPoint, u: number): { x: number; z: number } {
  const c = Math.cos(p.bank)
  return { x: p.x + Math.cos(p.yaw) * u * c, z: p.z - Math.sin(p.yaw) * u * c }
}

// ═══ O CIRCUITO ══════════════════════════════════════════════════════════════
// "Baía Suspensa": pista elevada sobre a baía, com dois penhascos — um pulo
// médio depois da subida e o VOO grande (faixa de turbo antes da rampa).
export const BAIA: TrackDef = {
  id: "baia-suspensa",
  width: 18,
  startY: 30,
  startS: 40,
  pieces: [
    { len: 150, pads: [[105, 0]], gates: [40], orbs: [[70, -5], [70, 5]] },
    { len: 150, turn: 90, orbs: [[75, 3]] },
    { len: 90, dy: 10, orbs: [[50, -4], [50, 4]] },
    { len: 45, dy: 6, kind: "ramp" },
    { len: 55, dy: -16, kind: "gap" },
    { len: 70, gates: [25] },
    { len: 180, turn: 100, dy: -6, pads: [[120, 1]] },
    { len: 110, turn: -55, orbs: [[55, -4]] },
    { len: 110, turn: 55, orbs: [[55, 4]] },
    { len: 80, pads: [[20, 0], [55, -1], [55, 1]] },
    { len: 50, dy: 9, kind: "ramp" },
    { len: 120, dy: -24, kind: "gap" },
    { len: 90, gates: [40], orbs: [[60, 0]] },
    { len: 200, turn: 120, dy: 20, pads: [[150, -1]] },
    { len: 110, dy: 10, orbs: [[40, -5], [40, 5]] },
    { len: 150, turn: 50 },
  ],
}
