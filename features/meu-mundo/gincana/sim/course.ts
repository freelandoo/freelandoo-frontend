// features/meu-mundo/gincana/sim/course.ts — GINCANA (mm3d-47): o percurso.
//
// Corrida de obstáculos sobre o mar, do gênero do vídeo do Alex, com
// percurso próprio. Tudo aqui é FUNÇÃO DO TEMPO DA PROVA (`t`, s depois do
// "vai"): barras que giram, pêndulos, luvas e bolas que rolam ficam no mesmo
// lugar em todos os aparelhos e na sala — ninguém precisa mandar onde estão.
//
// Regra única: o navegador e a sala (src/utils/meuMundoGincana.js, GERADO
// deste diretório por scripts/build-gincana-sim.js no back) usam os mesmos
// números. Metros, segundos; y para cima; a prova corre para +z.
//
// Trechos:
//  1. Carrossel   — discos infláveis com barras girando (pule a barra baixa).
//  2. Passarelas  — vigas estreitas que se cruzam, bolas de pêndulo.
//  3. Luvas       — campo rosa com luvas de boxe socando dos lados.
//  4. Xadrez      — piso que treme e cai depois que alguém pisa.
//  5. Subida      — rampa com bolas gigantes rolando para baixo; chegada no topo.

/** Altura do tampo das plataformas; a água fica em y = 0. */
export const DECK = 3

export const GINCANA = {
  step: 1 / 60,
  // mm3d-47b: mais rápido e mais seco (o Alex achou lento e o pulo mole)
  gravity: 30,
  run: 8.2,
  accel: 58,
  /** Controle no ar (fração da aceleração do chão). */
  airControl: 0.72,
  /** Pulo: 9,6 m/s com g 30 → ~1,54 m de altura, 0,64 s no ar. */
  jumpV: 9.6,
  coyote: 0.12,
  /** Apertou pular um pouco antes de poder (no ar, chegando ao chão): vale por isto (s). */
  jumpBuffer: 0.15,
  bodyR: 0.4,
  bodyH: 1.7,
  stepUp: 0.45,
  /** Mergulho: para a frente, um pouco para cima; depois desliza e levanta. */
  diveV: 11.5,
  diveUp: 4.4,
  slideT: 0.45,
  riseT: 0.4,
  /** Derrubado por obstáculo: sem controle por isto (s); depois levanta. */
  stunT: 0.9,
  /** Abaixo disto caiu na água: volta ao último posto depois de `respawnT`. */
  waterY: -0.6,
  respawnT: 1.3,
  /** Depois de voltar: nada derruba por isto (s). */
  shieldT: 1.2,
  /** Logo da Freelandoo (mm3d-47b): turbo com brilho — velocidade ×boost por boostT s; o logo volta para quem pegou depois de logoBack s. */
  boost: 1.5,
  boostT: 3.5,
  logoR: 1.25,
  logoBack: 12,
  /** Prova: limite depois do "vai" e contagem antes. */
  timeLimit: 180,
  countdown: 3,
} as const

/** Paleta (índice = cor do tampo; as bordas infláveis usam a cor do par). Turquesa (3) é a cor do mar: nunca no tampo. */
export const GINCANA_COLORS = ["#FF6A13", "#FFD21F", "#FF5FA8", "#19C6D1", "#8A4DFF", "#63E05A", "#2F7BFF", "#FFFFFF"] as const

/**
 * Plataforma: 0 = disco (r), 1 = caixa girada (hx, hz, rot), 2 = rampa
 * (caixa sem giro; o tampo sobe de `y` em z−hz até `y2` em z+hz).
 * `d` = espessura (abaixo do tampo é parede: empurra de lado).
 */
export interface Pad {
  k: 0 | 1 | 2
  x: number
  z: number
  r: number
  hx: number
  hz: number
  rot: number
  y: number
  y2: number
  d: number
  /** Cor do tampo e da borda (índices de GINCANA_COLORS). */
  c: number
  rim: number
  /** Trecho (1–5; 0 = largada, 6 = chegada). */
  s: number
}

/** Coluna (pilar do carrossel, frade do campo, poste da luva): empurra de lado e dá para subir. */
export interface Post {
  x: number
  z: number
  r: number
  y0: number
  y1: number
  c: number
}

/** Barra girando em volta de (x, z); `both` = atravessa o disco inteiro. */
export interface Sweeper {
  x: number
  z: number
  y: number
  len: number
  r: number
  w: number
  a0: number
  both: boolean
}

/** Bola de pêndulo que balança no eixo x, pendurada em (x, py, z). */
export interface Pendulum {
  x: number
  z: number
  py: number
  len: number
  R: number
  amp: number
  w: number
  ph: number
}

/** Luva de boxe que soca para dentro do campo a partir de x0 (dir = ±1). */
export interface Glove {
  x0: number
  z: number
  y: number
  dir: number
  reach: number
  R: number
  period: number
  ph: number
}

/** Ladrilho do xadrez (cai `tileWarn` s depois de pisado, volta depois de `tileGone`). */
export interface Tile {
  x: number
  z: number
  h: number
  c: number
}

/** Posto de volta (quem cai na água volta aqui). */
export interface Checkpoint {
  x: number
  z: number
  y: number
  /** Meia largura para espalhar quem volta. */
  w: number
}

const pads: Pad[] = []
const posts: Post[] = []
const sweepers: Sweeper[] = []
const pendulums: Pendulum[] = []
const gloves: Glove[] = []
const tiles: Tile[] = []

function box(x: number, z: number, hx: number, hz: number, c: number, rim: number, s: number, rot = 0, d = 1.4) {
  pads.push({ k: 1, x, z, r: 0, hx, hz, rot, y: DECK, y2: DECK, d, c, rim, s })
}
function disc(x: number, z: number, r: number, c: number, rim: number, s: number) {
  pads.push({ k: 0, x, z, r, hx: r, hz: r, rot: 0, y: DECK, y2: DECK, d: 1.6, c, rim, s })
}
/** Viga de (x0, z0) a (x1, z1), largura `w`. */
function beam(x0: number, z0: number, x1: number, z1: number, w: number, c: number, rim: number, s: number) {
  const L = Math.hypot(x1 - x0, z1 - z0)
  box((x0 + x1) / 2, (z0 + z1) / 2, w / 2, L / 2, c, rim, s, Math.atan2(x1 - x0, z1 - z0), 0.7)
}

// ── 0. largada ───────────────────────────────────────────────────────────────
box(0, 0, 10, 8, 6, 7, 0)
// ponte larga: quem larga na ponta e corre reto não cai na água
box(0, 11.5, 7, 3.6, 0, 1, 0)

// ── 1. carrossel ─────────────────────────────────────────────────────────────
const carousel = (x: number, z: number, r: number, w: number, a0: number, both: boolean, c: number) => {
  disc(x, z, r, c, 1, 1)
  posts.push({ x, z, r: 0.8, y0: DECK, y1: DECK + 2.4, c: 1 })
  sweepers.push({ x, z, y: DECK + 0.55, len: r + 0.3, r: 0.32, w, a0, both })
}
carousel(0, 24, 9, 1.15, 0, false, 0)
for (const s of [-1, 1]) box(4.5 * s, 35.2, 1.6, 4.3, 2, 7, 1)
carousel(-6.5, 46, 7, -1.4, 0.6, false, 4)
carousel(6.5, 46, 7, 1.7, 1.9, false, 4)
for (const s of [-1, 1]) box(4.5 * s, 55, 1.6, 3.2, 2, 7, 1)
carousel(0, 66, 9.5, 0.95, 0.4, true, 0)
box(0, 79, 2.2, 4, 6, 7, 1)

// ── 2. passarelas ────────────────────────────────────────────────────────────
box(0, 87, 8, 4, 1, 0, 2)
const LANES = [-5, 0, 5]
for (const x of LANES) beam(x, 90.6, x, 105, 1.5, 0, 1, 2)
for (const x of LANES) disc(x, 105, 1.7, 1, 0, 2)
beam(-5, 105, -5, 119, 1.5, 0, 1, 2)
beam(5, 105, 5, 119, 1.5, 0, 1, 2)
beam(0, 105, -5, 119, 1.5, 0, 1, 2)
beam(0, 105, 5, 119, 1.5, 0, 1, 2)
for (const x of LANES) disc(x, 119, 1.7, 1, 0, 2)
for (const x of LANES) beam(x, 119, x, 133.4, 1.5, 0, 1, 2)
const swing = (x: number, z: number, ph: number) => pendulums.push({ x, z, py: DECK + 9, len: 7.4, R: 1.1, amp: 0.95, w: 2.2, ph })
swing(-5, 98, 0)
swing(0, 98, 2.1)
swing(5, 98, 4.2)
swing(-5, 112, 1.1)
swing(-2.5, 112, 3.3)
swing(2.5, 112, 0.2)
swing(5, 112, 2.6)
swing(-5, 126, 3.9)
swing(0, 126, 1.6)
swing(5, 126, 5.0)

// ── 3. luvas ─────────────────────────────────────────────────────────────────
box(0, 137, 8, 4, 6, 7, 3)
box(0, 162, 7, 21, 2, 4, 3)
for (let i = 0; i < 7; i++) {
  const left = i % 2 === 0
  const z = 146 + i * 5
  const x0 = left ? -9.4 : 9.4
  gloves.push({ x0, z, y: DECK + 1.0, dir: left ? 1 : -1, reach: 8.2, R: 1.15, period: 2.6, ph: i * 0.83 })
  posts.push({ x: x0, z, r: 1.0, y0: -1, y1: DECK + 2.2, c: 6 })
}
for (const [x, z] of [[-3, 149], [3.5, 153], [0, 158], [-4, 164], [2.5, 168], [-1.5, 174], [4, 178]] as [number, number][]) {
  posts.push({ x, z, r: 0.55, y0: DECK, y1: DECK + 1.1, c: 4 })
}

// ── 4. xadrez ────────────────────────────────────────────────────────────────
box(0, 187.3, 7, 4.3, 1, 0, 4)
export const TILE_COLS = 6
export const TILE_ROWS = 7
export const TILE_PITCH = 2.9
export const TILE_HALF = 1.3
export const TILE_Z0 = 193
for (let r = 0; r < TILE_ROWS; r++) {
  for (let c = 0; c < TILE_COLS; c++) {
    tiles.push({ x: (c - (TILE_COLS - 1) / 2) * TILE_PITCH, z: TILE_Z0 + r * TILE_PITCH, h: TILE_HALF, c: (r + c) % 2 === 0 ? 2 : 5 })
  }
}
box(0, 216.5, 7, 4.7, 6, 7, 4)

// ── 5. subida e chegada ──────────────────────────────────────────────────────
export const RAMP = { z0: 221.2, z1: 257.2, y0: DECK, y1: DECK + 6, hx: 6 } as const
pads.push({ k: 2, x: 0, z: (RAMP.z0 + RAMP.z1) / 2, r: 0, hx: RAMP.hx, hz: (RAMP.z1 - RAMP.z0) / 2, rot: 0, y: RAMP.y0, y2: RAMP.y1, d: 1.4, c: 0, rim: 1, s: 5 })
pads.push({ k: 1, x: 0, z: 265, r: 0, hx: 9, hz: 7.8, rot: 0, y: RAMP.y1, y2: RAMP.y1, d: 1.6, c: 1, rim: 0, s: 6 })
/** Cruzou esta linha no alto = chegou. */
export const FINISH_Z = 266
export const FINISH_Y = RAMP.y1
/** Bolas da subida: faixas, intervalo, velocidade, raio. */
export const BALLS = { lanes: [-4.3, -1.45, 1.45, 4.3], every: 0.95, v: 7.5, R: 1.2, zEnd: RAMP.z0 - 3 } as const

export const PADS: readonly Pad[] = pads
export const POSTS: readonly Post[] = posts
export const SWEEPERS: readonly Sweeper[] = sweepers
export const PENDULUMS: readonly Pendulum[] = pendulums
export const GLOVES: readonly Glove[] = gloves
export const TILES: readonly Tile[] = tiles
/** Tempos do ladrilho: treme, cai e fica fora, depois volta. */
export const TILE_TIME = { warn: 0.7, gone: 4 } as const

export const CHECKPOINTS: readonly Checkpoint[] = [
  { x: 0, z: -3.5, y: DECK, w: 7 },
  { x: 0, z: 87, y: DECK, w: 6 },
  { x: 0, z: 137, y: DECK, w: 6 },
  { x: 0, z: 187, y: DECK, w: 5.5 },
  { x: 0, z: 216, y: DECK, w: 5.5 },
]

/** Lugar de largada da vaga (2 filas de 4) e de volta a um posto. */
export function spawnAt(cp: number, slot: number) {
  const c = CHECKPOINTS[Math.max(0, Math.min(CHECKPOINTS.length - 1, cp))]
  const col = slot % 4
  const row = Math.floor(slot / 4) % 2
  return { x: c.x + (col - 1.5) * Math.min(3.4, (c.w * 2) / 4), z: c.z - row * 2.6, y: c.y }
}

// ── o que se mexe ────────────────────────────────────────────────────────────

export function sweeperAngle(s: Sweeper, t: number) {
  return s.a0 + s.w * t
}

/** Centro da bola do pêndulo e velocidade em x. */
export function pendulumAt(p: Pendulum, t: number) {
  const th = p.amp * Math.sin(p.w * t + p.ph)
  const thd = p.amp * p.w * Math.cos(p.w * t + p.ph)
  return { x: p.x + p.len * Math.sin(th), y: p.py - p.len * Math.cos(th), z: p.z, vx: p.len * Math.cos(th) * thd, th }
}

/**
 * Quanto a luva está para fora (0–1) e se está socando (indo ou parada lá fora).
 * Ciclo: descansa, soca rápido, segura, volta devagar.
 */
export function gloveAt(g: Glove, t: number) {
  const u = (((t + g.ph) / g.period) % 1 + 1) % 1
  let e = 0
  let hot = false
  if (u >= 0.55 && u < 0.62) {
    const k = (u - 0.55) / 0.07
    e = 1 - (1 - k) * (1 - k)
    hot = true
  } else if (u >= 0.62 && u < 0.74) {
    e = 1
    hot = true
  } else if (u >= 0.74) e = 1 - (u - 0.74) / 0.26
  return { x: g.x0 + g.dir * g.reach * e, e, hot, u }
}

/** Faixa do número sorteado (0–3) ou -1 = sem bola nesta vez. */
export function ballLane(seed: number, i: number) {
  let h = (Math.imul(i + 1, 0x9e3779b1) ^ Math.imul(seed | 0, 0x85ebca77)) >>> 0
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0
  h = (h ^ (h >>> 13)) >>> 0
  if (h % 5 === 0) return -1
  return (h >>> 3) % BALLS.lanes.length
}

/**
 * Logos da Freelandoo (mm3d-47b): nos lugares abertos do caminho. Cada um é
 * de cada corredor (quem pega não tira dos outros): nada disso viaja na rede.
 */
export const LOGOS: readonly { x: number; z: number; y: number }[] = [
  [-4, 12.5], [0, 12.5], [4, 12.5],
  [0, 79],
  [-5, 87], [5, 87],
  [-5, 105], [0, 105], [5, 105],
  [0, 137],
  [-3.5, 151], [3.5, 161], [-3.5, 171],
  [0, 187.5],
  [-2.9, 216.5], [2.9, 216.5],
  [-4.3, 233], [0, 241], [4.3, 249],
].map(([x, z]) => ({ x, z, y: (z > RAMP.z0 ? rampTop(z) : DECK) + 1.1 }))

/** Altura do tampo da rampa em z. */
export function rampTop(z: number) {
  const u = Math.max(0, Math.min(1, (z - RAMP.z0) / (RAMP.z1 - RAMP.z0)))
  return RAMP.y0 + (RAMP.y1 - RAMP.y0) * u
}

/** Bolas rolando agora: [x, y, z, faixa, índice] por bola. */
export function ballsAt(seed: number, t: number, out: number[]) {
  out.length = 0
  if (t < 0) return out
  const span = (RAMP.z1 - BALLS.zEnd) / BALLS.v
  const i1 = Math.floor(t / BALLS.every)
  const i0 = Math.max(0, Math.floor((t - span) / BALLS.every))
  for (let i = i0; i <= i1; i++) {
    const lane = ballLane(seed, i)
    if (lane < 0) continue
    const z = RAMP.z1 - BALLS.v * (t - i * BALLS.every)
    if (z < BALLS.zEnd || z > RAMP.z1) continue
    // depois do pé da rampa a bola cai na água
    const y = z >= RAMP.z0 ? rampTop(z) + BALLS.R : DECK + BALLS.R - ((RAMP.z0 - z) / BALLS.v) ** 2 * 12
    out.push(BALLS.lanes[lane], y, z, lane, i)
  }
  return out
}

/** Ladrilho em pé (pode pisar) no tempo t, sabendo quando foi pisado (−1 = nunca). */
export function tileUp(stepped: number, t: number) {
  return stepped < 0 || t - stepped < TILE_TIME.warn || t - stepped >= TILE_TIME.warn + TILE_TIME.gone
}

/** Trecho da prova em que z está (1–5; 0 largada, 6 chegada) — para a interface. */
export function sectionAt(z: number) {
  if (z < 15) return 0
  if (z < 83) return 1
  if (z < 133.4) return 2
  if (z < 183) return 3
  if (z < 221.2) return 4
  if (z < FINISH_Z) return 5
  return 6
}
