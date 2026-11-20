// features/meu-mundo/gincana/sim/body.ts — GINCANA (mm3d-47): o corpo de quem corre.
//
// Passo fixo (GINCANA.step). Anda pela intenção (direção no mundo, 0–1),
// pula, MERGULHA (para a frente; desliza de barriga e levanta), é derrubado
// pelo que se mexe (barra, pêndulo, luva, bola, bloco: voa, cai, levanta), cai
// na água (volta ao último posto) e chega. Mesmo código no aparelho (o meu
// corpo e os computadores do treino) e na sala (os computadores da partida).
//
// Gincana 2.0 (2026-11-16, "como o Fall Guys"): SOBE NA BEIRA quando bate de
// lado numa plataforma pulando (segurando AGARRAR alcança mais alto), é levado
// pela plataforma que anda, pelo disco que gira e pela esteira, escorrega no
// gelo, é lançado pelo cogumelo, passa pela porta de verdade e bate na falsa,
// e é empurrado pelos blocos. Quem é AGARRADO (race.ts decide) anda devagar.

import {
  DECK,
  GINCANA,
  doorsOpen,
  drumAt,
  drumSpeed,
  gloveAt,
  memIndexAt,
  memUp,
  onTile,
  padRot,
  padShift,
  pendulumAt,
  pusherAt,
  padTop,
  riseAt,
  spawnAt,
  sweeperAngle,
  sweeperW,
  tileUp,
  wallsAt,
  type WallWave,
  type Course,
  type Pad,
} from "./course"

/** Estados do corpo. */
export const MODE = {
  RUN: 0,
  /** Mergulho no ar. */
  DIVE: 1,
  /** De barriga no chão depois do mergulho. */
  SLIDE: 2,
  /** Levantando. */
  RISE: 3,
  /** Derrubado: voa e cai, sem controle. */
  KNOCK: 4,
  /** Na água, esperando voltar. */
  WATER: 5,
  /** Chegou. */
  DONE: 6,
  /** Subindo na beira de uma plataforma. */
  CLIMB: 7,
} as const

export interface Runner {
  slot: number
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  facing: number
  ground: boolean
  /** s desde que saiu do chão. */
  air: number
  mode: number
  /** s que faltam do estado (mergulho, deslize, levantar, derrubado, água, beira). */
  timer: number
  /** Nada derruba enquanto > 0 (depois de voltar). */
  shield: number
  /** Não toma outra pancada logo em seguida. */
  hitCool: number
  /** Último posto alcançado (índice de checkpoints). */
  cp: number
  /** Tempo da chegada (−1 = ainda correndo). */
  fin: number
  /** Gincana 3: quando ficou FORA da prova (−1 = está nela). Fora = na água para sempre. */
  out: number
  /** Pontos (coleta: engrenagens; zona: segundos na zona). */
  pts: number
  /** Velocidade de saída do último pulo (fase do voo para a animação). */
  launch: number
  /** s que o pulo apertado ainda vale (buffer: apertou um pouco antes de pousar). */
  jumpBuf: number
  /** s de turbo do logo da Freelandoo que faltam. */
  boost: number
  /** Quando pegou cada logo (−99 = disponível). */
  took: number[]
  /** Posição no começo do passo (para desenhar entre dois passos). */
  px: number
  py: number
  pz: number
  /** Plataforma embaixo no último passo (−1 = nenhuma/coluna/ladrilho): leva quem está em cima. */
  pad: number
  /** Cilindro embaixo (Rolo de Gelo; −1 = nenhum): arrasta para o lado. */
  drum: number
  /** Atrito do chão embaixo (gelo < 1). */
  fric: number
  /** Agarrando a vaga (−1 = ninguém), há quanto tempo e a espera para agarrar de novo. */
  grab: number
  grabT: number
  grabCool: number
  /** s que ainda está sendo segurado por alguém (anda devagar). */
  held: number
  /** Beira: de onde saiu e aonde vai (subindo). */
  cx0: number
  cy0: number
  cz0: number
  cx1: number
  cy1: number
  cz1: number
}

export interface RunIntent {
  /** Direção no mundo (|m| ≤ 1). */
  mx: number
  mz: number
  /** Apertou pular / mergulhar neste passo (borda). */
  jump: boolean
  dive: boolean
  /** Segurando AGARRAR. */
  grab?: boolean
}

/** O mundo num instante: tempo da prova, semente, o percurso, os ladrilhos e as portas. */
export interface RunWorld {
  t: number
  seed: number
  course: Course
  /** Quando cada ladrilho foi pisado (−1 = em pé, nunca pisado). */
  tiles: Float64Array
  /** Bolas rolando agora (ballsAt): [x, y, z, faixa, índice]… */
  balls: number[]
  /** Portas de verdade (1) e falsas (0), pela semente. */
  open: Uint8Array
  /** Quando cada porta de verdade foi aberta (−1 = fechada). */
  doors: Float64Array
  /** Gincana 3: quando cada engrenagem foi pega (−1 = nunca). */
  gems: Float64Array
}

/** Acontecimentos de um passo (para som, aviso e animação). */
export type RunEvent =
  | { type: "jump"; slot: number }
  | { type: "dive"; slot: number }
  | { type: "hit"; slot: number; by: "bar" | "swing" | "glove" | "ball" | "push" | "tackle" }
  | { type: "splash"; slot: number; x: number; z: number }
  | { type: "back"; slot: number }
  | { type: "cp"; slot: number; cp: number }
  | { type: "finish"; slot: number; t: number }
  | { type: "tile"; i: number }
  | { type: "logo"; slot: number; i: number }
  | { type: "bounce"; slot: number }
  | { type: "climb"; slot: number }
  | { type: "door"; i: number; open: boolean; slot: number }
  | { type: "grab"; slot: number; other: number }
  | { type: "out"; slot: number }
  | { type: "gem"; slot: number; i: number; v: number }

export const IDLE_INTENT: RunIntent = { mx: 0, mz: 0, jump: false, dive: false, grab: false }

export function newWorld(course: Course, seed: number, t: number): RunWorld {
  return { t, seed, course, tiles: new Float64Array(course.tiles.length).fill(-1), balls: [], open: doorsOpen(course, seed), doors: new Float64Array(course.doors.length).fill(-1), gems: new Float64Array(course.gems.length).fill(-1) }
}

export function newRunner(course: Course, slot: number): Runner {
  const p = spawnAt(course, 0, slot)
  return {
    slot,
    x: p.x,
    y: p.y,
    z: p.z,
    vx: 0,
    vy: 0,
    vz: 0,
    facing: 0,
    ground: true,
    air: 0,
    mode: MODE.RUN,
    timer: 0,
    shield: 0,
    hitCool: 0,
    cp: 0,
    fin: -1,
    out: -1,
    pts: 0,
    launch: GINCANA.jumpV,
    jumpBuf: 0,
    boost: 0,
    took: course.logos.map(() => -99),
    px: p.x,
    py: p.y,
    pz: p.z,
    pad: -1,
    drum: -1,
    fric: 1,
    grab: -1,
    grabT: 0,
    grabCool: 0,
    held: 0,
    cx0: 0,
    cy0: 0,
    cz0: 0,
    cx1: 0,
    cy1: 0,
    cz1: 0,
  }
}

const EDGE = 0.12

/** (x, z) no referencial da caixa `p` no tempo t (centro e giro de agora). */
function padLocal(p: Pad, t: number, x: number, z: number) {
  const sh = padShift(p, t)
  const dx = x - (p.x + sh.dx)
  const dz = z - (p.z + sh.dz)
  const a = padRot(p, t)
  const c = Math.cos(a)
  const s = Math.sin(a)
  return { lx: dx * c - dz * s, lz: dx * s + dz * c, cx: p.x + sh.dx, cz: p.z + sh.dz, c, s }
}

/**
 * Chão mais alto até `reach` sob (x, z): altura, ladrilho (−1), plataforma
 * (−1 = coluna/ladrilho) e o lançamento do cogumelo (0 = nenhum); y = −∞ sem chão.
 */
export function groundUnder(w: RunWorld, x: number, z: number, reach: number) {
  const C = w.course
  let best = -Infinity
  let tile = -1
  let pad = -1
  let bounce = 0
  for (let i = 0; i < C.pads.length; i++) {
    const p = C.pads[i]
    let top: number
    if (p.k === 0) {
      const sh = padShift(p, w.t)
      if (Math.hypot(x - p.x - sh.dx, z - p.z - sh.dz) > p.r + EDGE) continue
      top = p.y
    } else {
      const L = padLocal(p, w.t, x, z)
      if (Math.abs(L.lx) > p.hx + EDGE || Math.abs(L.lz) > p.hz + EDGE) continue
      top = padTop(p, z, w.t)
    }
    if (top <= reach && top > best) {
      best = top
      tile = -1
      pad = i
      bounce = 0
    }
  }
  for (const q of C.posts) {
    if (q.y1 <= reach && q.y1 > best && Math.hypot(x - q.x, z - q.z) <= q.r + (q.b > 0 ? EDGE : 0)) {
      best = q.y1
      tile = -1
      pad = -1
      bounce = q.b
    }
  }
  for (let i = 0; i < C.tiles.length; i++) {
    const q = C.tiles[i]
    if (Math.abs(z - q.z) > q.h + 1 || !onTile(q, x, z, EDGE)) continue
    if (!tileUp(C, w.tiles[i], w.t)) continue
    if (q.y <= reach && q.y > best) {
      best = q.y
      tile = i
      pad = -1
      bounce = 0
    }
  }
  // Relógio da Praça: o ladrilho sob o pé, se estiver de pé agora
  const M = C.memory
  if (M && M.y <= reach && M.y > best) {
    const i = memIndexAt(M, x, z, EDGE)
    if (i >= 0 && memUp(M, w.seed, i, w.t)) {
      best = M.y
      tile = -1
      pad = -1
      bounce = 0
    }
  }
  // cilindros por último: só ganham se forem o chão mais alto
  let drum = -1
  for (let i = 0; i < C.drums.length; i++) {
    const g = drumAt(C.drums[i], x, z, w.t)
    if (g && g.top <= reach && g.top > best) {
      best = g.top
      tile = -1
      pad = -1
      bounce = 0
      drum = i
    }
  }
  return { y: best, tile, pad, bounce, drum }
}

/** Ondas de parede do passo (reaproveitado: nada de lixo a 60 Hz). */
const WALL_TMP: WallWave[] = []

/** Beira encontrada ao bater de lado: tampo e normal para fora. */
interface Ledge {
  top: number
  nx: number
  nz: number
}

/**
 * Empurra para fora das paredes (lado das plataformas acima do pé), das
 * colunas, das portas falsas e dos blocos. Devolve a beira mais baixa em que
 * bateu (para subir) e se um bloco empurrou forte.
 */
function pushWalls(b: Runner, w: RunWorld, out: RunEvent[] | null): Ledge | null {
  const C = w.course
  const R = GINCANA.bodyR
  const H = GINCANA.bodyH
  const lift = b.y + GINCANA.stepUp
  let ledge: Ledge | null = null
  const sawLedge = (top: number, nx: number, nz: number) => {
    if (!ledge || top < ledge.top) ledge = { top, nx, nz }
  }
  for (const p of C.pads) {
    const top = padTop(p, b.z, w.t)
    if (top <= lift || top - p.d >= b.y + H) continue
    if (p.k === 0) {
      const sh = padShift(p, w.t)
      const cx = p.x + sh.dx
      const cz = p.z + sh.dz
      const dx = b.x - cx
      const dz = b.z - cz
      const d = Math.hypot(dx, dz)
      if (d >= p.r + R || d < 1e-6) continue
      b.x = cx + (dx / d) * (p.r + R)
      b.z = cz + (dz / d) * (p.r + R)
      sawLedge(top, dx / d, dz / d)
      continue
    }
    const L = padLocal(p, w.t, b.x, b.z)
    const ox = p.hx + R - Math.abs(L.lx)
    const oz = p.hz + R - Math.abs(L.lz)
    if (ox <= 0 || oz <= 0) continue
    let nx = L.lx
    let nz = L.lz
    let ux = 0
    let uz = 0
    if (ox < oz) {
      nx = Math.sign(L.lx || 1) * (p.hx + R)
      ux = Math.sign(L.lx || 1)
    } else {
      nz = Math.sign(L.lz || 1) * (p.hz + R)
      uz = Math.sign(L.lz || 1)
    }
    b.x = L.cx + nx * L.c + nz * L.s
    b.z = L.cz - nx * L.s + nz * L.c
    sawLedge(top, ux * L.c + uz * L.s, -ux * L.s + uz * L.c)
  }
  for (const q of C.posts) {
    if (q.y1 <= lift || q.y0 >= b.y + H) continue
    const dx = b.x - q.x
    const dz = b.z - q.z
    const d = Math.hypot(dx, dz)
    if (d >= q.r + R || d < 1e-6) continue
    b.x = q.x + (dx / d) * (q.r + R)
    b.z = q.z + (dz / d) * (q.r + R)
  }
  // ladrilhos caídos não seguram, e os de pé têm lado
  for (let i = 0; i < C.tiles.length; i++) {
    const q = C.tiles[i]
    if (q.y <= lift || Math.abs(b.z - q.z) > q.h + R + 0.2 || !tileUp(C, w.tiles[i], w.t) || q.y - 0.6 >= b.y + H) continue
    const lx = b.x - q.x
    const lz = b.z - q.z
    if (q.k === 1) {
      const d = Math.hypot(lx, lz)
      if (d >= q.h + R || d < 1e-6) continue
      b.x = q.x + (lx / d) * (q.h + R)
      b.z = q.z + (lz / d) * (q.h + R)
      continue
    }
    const ox = q.h + R - Math.abs(lx)
    const oz = q.h + R - Math.abs(lz)
    if (ox <= 0 || oz <= 0) continue
    if (ox < oz) b.x = q.x + Math.sign(lx || 1) * (q.h + R)
    else b.z = q.z + Math.sign(lz || 1) * (q.h + R)
  }
  // portas: a falsa é parede; a de verdade abre quando alguém encosta
  for (let i = 0; i < C.doors.length; i++) {
    const d = C.doors[i]
    const T = 0.3
    if (Math.abs(b.z - d.z) >= T + R || Math.abs(b.x - d.x) >= d.hw + R * 0.2 || b.y >= DECK + d.h || b.y + H <= DECK) continue
    if (w.open[i]) {
      if (w.doors[i] < 0) {
        w.doors[i] = w.t
        out?.push({ type: "door", i, open: true, slot: b.slot })
      }
      continue
    }
    if (w.doors[i] === -1) {
      // bateu numa falsa: marca (a interface mostra o "tum") só uma vez por porta
      w.doors[i] = -2
      out?.push({ type: "door", i, open: false, slot: b.slot })
    }
    // empurra para trás (de onde veio) — as portas da mesma fileira se encostam: nunca de lado
    b.z = d.z + Math.sign(b.z - d.z || -1) * (T + R)
    b.vz = 0
  }
  // Gincana 3: paredes de brasa — o pedaço sólido empurra para o lado de onde a pessoa está (o vão deixa passar)
  if (C.walls) {
    const Wl = C.walls
    const TH = 0.35
    for (const v of wallsAt(C, w.seed, w.t, WALL_TMP)) {
      if (Math.abs(b.z - v.z) >= TH + R || Math.abs(b.x) > Wl.hw + R) continue
      if (b.y >= Wl.y + (v.kind === 1 ? Wl.low : Wl.tall) || b.y + H <= Wl.y) continue
      let hit = v.kind === 1
      if (!hit) {
        const n = Math.round((2 * Wl.hw) / Wl.seg)
        for (let j = 0; j < n && !hit; j++) {
          if (v.gaps.includes(j)) continue
          const L = -Wl.hw + j * Wl.seg
          if (b.x + R * 0.8 > L && b.x - R * 0.8 < L + Wl.seg) hit = true
        }
      }
      if (!hit) continue
      const side = Math.sign(b.z - v.z) || -1
      b.z = v.z + side * (TH + R)
      if (side < 0 && b.vz > -v.v) b.vz = -v.v
    }
  }
  // blocos que andam e empurram
  for (const q of C.pushers) {
    if (b.y >= q.y + q.h || b.y + H <= q.y) continue
    const P = pusherAt(q, w.t)
    const lx = b.x - P.x
    const lz = b.z - P.z
    const ox = q.hx + R - Math.abs(lx)
    const oz = q.hz + R - Math.abs(lz)
    if (ox <= 0 || oz <= 0) continue
    let nx = 0
    let nz = 0
    if (ox < oz) {
      nx = Math.sign(lx || 1)
      b.x = P.x + nx * (q.hx + R)
    } else {
      nz = Math.sign(lz || 1)
      b.z = P.z + nz * (q.hz + R)
    }
    const vn = P.vx * nx + P.vz * nz
    if (vn > 1.5) {
      const mag = Math.max(5.5, vn * 1.35)
      knock(b, nx * mag, 3.5, nz * mag, "push", out)
    }
  }
  return ledge
}

/** Distância do ponto ao segmento vertical do corpo (x, z, de y+R a y+H−R). */
function sphereGap(b: Runner, x: number, y: number, z: number) {
  const R = GINCANA.bodyR
  const cy = Math.max(b.y + R, Math.min(b.y + GINCANA.bodyH - R, y))
  return Math.hypot(b.x - x, b.z - z, cy - y)
}

export function knock(b: Runner, kx: number, ky: number, kz: number, by: "bar" | "swing" | "glove" | "ball" | "push" | "tackle", out: RunEvent[] | null) {
  if (b.shield > 0 || b.hitCool > 0 || b.mode === MODE.WATER || b.mode === MODE.DONE) return
  b.vx = kx + b.vx * 0.15
  b.vz = kz + b.vz * 0.15
  b.vy = Math.max(b.vy, ky)
  b.ground = false
  b.air = GINCANA.coyote
  b.mode = MODE.KNOCK
  b.timer = GINCANA.stunT
  b.hitCool = 1.4
  b.grab = -1
  out?.push({ type: "hit", slot: b.slot, by })
}

/** O que se mexe: barras, pêndulos, luvas e bolas. */
function hazards(b: Runner, w: RunWorld, out: RunEvent[] | null) {
  const C = w.course
  const R = GINCANA.bodyR
  // Gincana 3: mergulhando/deslizando o corpo fica baixo (0,7 m) e passa por baixo da barra alta
  const H = b.mode === MODE.DIVE || b.mode === MODE.SLIDE ? GINCANA.lowH : GINCANA.bodyH
  const t = w.t
  for (const s of C.sweepers) {
    const cx = b.x - s.x
    const cz = b.z - s.z
    if (Math.abs(cz) > s.len + 1 || Math.hypot(cx, cz) > s.len + R + s.r) continue
    if (b.y >= s.y + s.r || b.y + H <= s.y - s.r) continue
    // quem acabou de levar (ou voltou agora) deixa a barra passar: não é arrastado até a beira
    if (b.hitCool > 0 || b.shield > 0) continue
    const a = sweeperAngle(s, t)
    const dx = Math.sin(a)
    const dz = Math.cos(a)
    const along = Math.max(s.both ? -s.len : 0, Math.min(s.len, cx * dx + cz * dz))
    const px = s.x + dx * along
    const pz = s.z + dz * along
    const gap = Math.hypot(b.x - px, b.z - pz)
    if (gap >= R + s.r) continue
    // velocidade da barra no ponto: ω × r (perpendicular à barra)
    const sp = sweeperW(s, t) * along
    let tx = Math.cos(a) * Math.sign(sp || 1)
    let tz = -Math.sin(a) * Math.sign(sp || 1)
    if (Math.abs(along) < 0.6) {
      const g = gap || 1
      tx = (b.x - px) / g
      tz = (b.z - pz) / g
    }
    const mag = Math.max(5, Math.abs(sp) * 0.75 + 2.5)
    knock(b, tx * mag, 4.5, tz * mag, "bar", out)
    // fora da barra de qualquer jeito (não atravessa)
    const g = gap || 1
    b.x = px + ((b.x - px) / g) * (R + s.r + 0.02)
    b.z = pz + ((b.z - pz) / g) * (R + s.r + 0.02)
  }
  for (const p of C.pendulums) {
    if (Math.abs(b.z - p.z) > p.R + R + 0.2) continue
    const q = pendulumAt(p, t)
    if (sphereGap(b, q.x, q.y, q.z) >= p.R + R) continue
    const dir = Math.abs(q.vx) > 1 ? Math.sign(q.vx) : Math.sign(b.x - q.x || 1)
    knock(b, dir * 9, 4.5, Math.sign(b.z - q.z || 1) * 1.5, "swing", out)
  }
  for (const g of C.gloves) {
    if (Math.abs(b.z - g.z) > g.R + R + 0.2) continue
    const q = gloveAt(g, t)
    const gap = sphereGap(b, q.x, g.y, g.z)
    if (gap >= g.R + R) continue
    if (q.hot && q.e < 0.98) knock(b, g.dir * 12.5, 5, Math.sign(b.z - g.z || 1) * 1.2, "glove", out)
    else {
      // parada ou voltando: só não deixa atravessar
      const dx = b.x - q.x
      const dz = b.z - g.z
      const d = Math.hypot(dx, dz) || 1
      b.x = q.x + (dx / d) * (g.R + R)
      b.z = g.z + (dz / d) * (g.R + R)
    }
  }
  if (C.balls && w.balls.length && C.ramp && b.z > C.ramp.z0 - 5) {
    const bl = w.balls
    const BR = C.balls.R
    for (let k = 0; k < bl.length; k += 5) {
      if (sphereGap(b, bl[k], bl[k + 1], bl[k + 2]) >= BR + R) continue
      knock(b, Math.sign(b.x - bl[k] || 1) * 3, 5, -9, "ball", out)
    }
  }
}

/**
 * Caiu agora: fica FORA? Na sobrevivência sempre; com perigo que sobe, quando o
 * posto de volta já estará embaixo dele quando voltar.
 */
export function fallOut(b: Runner, C: Course, t: number) {
  if (C.mode === "survive") return true
  if (!C.rise) return false
  const p = C.checkpoints[Math.max(0, Math.min(C.checkpoints.length - 1, b.cp))]
  return p.y < riseAt(C, t + GINCANA.respawnT) + 0.3
}

/** Volta ao último posto (caiu na água ou ficou preso). */
export function respawn(b: Runner, course: Course) {
  const p = spawnAt(course, b.cp, b.slot)
  b.x = p.x
  b.y = p.y
  b.z = p.z
  b.vx = b.vy = b.vz = 0
  b.facing = 0
  b.ground = true
  b.air = 0
  b.mode = MODE.RUN
  b.timer = 0
  b.shield = GINCANA.shieldT
  b.hitCool = 0
  b.pad = -1
  b.drum = -1
  b.fric = 1
  b.grab = -1
}

/** Leva quem está em cima da plataforma que anda, do disco que gira e da esteira. */
function carry(b: Runner, w: RunWorld, dt: number) {
  if (b.ground && b.drum >= 0) {
    // cilindro: o chão anda de lado (w·R·cos θ) e a curva escorrega para fora
    const d = w.course.drums[b.drum]
    const g = d ? drumAt(d, b.x, b.z, w.t) : null
    if (d && g) {
      b.x += drumSpeed(d.rings[g.ring], w.t) * (g.top - d.y) * dt
      b.x += Math.sin(g.th) * 3.2 * dt
    }
    return
  }
  if (!b.ground || b.pad < 0) return
  const p = w.course.pads[b.pad]
  if (!p) return
  if (p.mw !== 0) {
    const a = padShift(p, w.t - dt)
    const c = padShift(p, w.t)
    b.x += c.dx - a.dx
    b.z += c.dz - a.dz
  }
  if (p.spin !== 0) {
    const sh = padShift(p, w.t)
    const cx = p.x + sh.dx
    const cz = p.z + sh.dz
    const da = p.spin * dt
    // giro para o mesmo lado da caixa (padLocal usa a mesma convenção)
    const c = Math.cos(da)
    const s = Math.sin(da)
    const dx = b.x - cx
    const dz = b.z - cz
    b.x = cx + dx * c + dz * s
    b.z = cz - dx * s + dz * c
    b.facing += da
  }
  if (p.bx !== 0 || p.bz !== 0) {
    b.x += p.bx * dt
    b.z += p.bz * dt
  }
}

export function stepRunner(b: Runner, it: RunIntent, w: RunWorld, out: RunEvent[] | null, dt = GINCANA.step) {
  const T = GINCANA
  const C = w.course
  b.shield = Math.max(0, b.shield - dt)
  b.boost = Math.max(0, b.boost - dt)
  b.jumpBuf = it.jump ? T.jumpBuffer : Math.max(0, b.jumpBuf - dt)
  b.hitCool = Math.max(0, b.hitCool - dt)
  b.held = Math.max(0, b.held - dt)
  b.grabCool = Math.max(0, b.grabCool - dt)
  if (b.mode === MODE.WATER) {
    b.timer -= dt
    b.vy = Math.max(-3, b.vy - T.gravity * dt)
    b.y = Math.max(-6, b.y + b.vy * dt)
    b.vx *= 0.9
    b.vz *= 0.9
    // fora da prova: fica no fundo
    if (b.out >= 0) return
    if (b.timer <= 0) {
      respawn(b, C)
      out?.push({ type: "back", slot: b.slot })
    }
    return
  }
  if (b.mode === MODE.CLIMB) {
    // sobe na beira: primeiro para cima, depois para dentro
    b.timer -= dt
    const k = Math.max(0, Math.min(1, 1 - b.timer / T.climbT))
    const up = Math.min(1, k / 0.6)
    const inn = Math.max(0, (k - 0.45) / 0.55)
    b.x = b.cx0 + (b.cx1 - b.cx0) * inn
    b.z = b.cz0 + (b.cz1 - b.cz0) * inn
    b.y = b.cy0 + (b.cy1 - b.cy0) * (1 - (1 - up) * (1 - up))
    b.vx = b.vy = b.vz = 0
    if (b.timer <= 0) {
      b.mode = MODE.RUN
      b.ground = true
      b.air = 0
      b.y = b.cy1
      const g = groundUnder(w, b.x, b.z, b.y + 0.1)
      b.pad = g.pad
      b.drum = g.drum
    }
    return
  }
  carry(b, w, dt)
  const done = b.mode === MODE.DONE
  const free = b.mode === MODE.RUN || done
  let mx = done ? 0 : it.mx
  let mz = done ? 0 : it.mz
  const m = Math.hypot(mx, mz)
  if (m > 1) {
    mx /= m
    mz /= m
  }

  if (free) {
    let run = T.run * (b.boost > 0 ? T.boost : 1)
    if (b.held > 0) run *= T.heldRun
    if (b.grab >= 0) run *= T.grabRun
    // graxa (Comportas da Usina): no chão dela a corrida fica mais lenta
    if (b.ground && b.pad >= 0) run *= C.pads[b.pad].sl
    const tx = mx * run
    const tz = mz * run
    const a = T.accel * (b.boost > 0 ? 1.3 : 1) * (b.ground ? b.fric : T.airControl) * dt
    const dvx = tx - b.vx
    const dvz = tz - b.vz
    const dl = Math.hypot(dvx, dvz)
    if (dl <= a) {
      b.vx = tx
      b.vz = tz
    } else {
      b.vx += (dvx / dl) * a
      b.vz += (dvz / dl) * a
    }
    if (m > 0.05) b.facing = Math.atan2(mx, mz)
    if (!done && b.jumpBuf > 0 && (b.ground || b.air < T.coyote) && b.vy <= 0.01) {
      b.jumpBuf = 0
      b.vy = T.jumpV
      b.launch = T.jumpV
      b.ground = false
      b.air = T.coyote
      out?.push({ type: "jump", slot: b.slot })
    } else if (!done && it.dive) {
      // mergulho: para onde olha, um pouco para cima
      const fx = Math.sin(b.facing)
      const fz = Math.cos(b.facing)
      const keep = Math.max(0, b.vx * fx + b.vz * fz)
      const v = Math.max(T.diveV, keep + 2.5)
      b.vx = fx * v
      b.vz = fz * v
      b.vy = b.ground ? T.diveUp : Math.max(b.vy, 2.2)
      b.launch = Math.max(2.2, b.vy)
      b.ground = false
      b.air = T.coyote
      b.mode = MODE.DIVE
      b.grab = -1
      out?.push({ type: "dive", slot: b.slot })
    }
  } else if (b.ground) {
    // de barriga, levantando ou derrubado no chão: escorrega até parar (no gelo, bem mais)
    const k = Math.max(0, 1 - (b.mode === MODE.SLIDE ? 5 : 9) * Math.max(0.15, b.fric) * dt)
    b.vx *= k
    b.vz *= k
  }

  b.x += b.vx * dt
  b.z += b.vz * dt
  const wasAirY = b.y
  const ledge = pushWalls(b, w, out)
  hazards(b, w, out)

  // bateu de lado numa plataforma no ar, com o tampo ao alcance: sobe na beira
  if (ledge && !b.ground && (b.mode === MODE.RUN || b.mode === MODE.DIVE) && b.vy < 7) {
    const L = ledge as Ledge
    const high = L.top - wasAirY
    if (high > 0 && high <= (it.grab ? T.ledgeGrab : T.ledge)) {
      b.mode = MODE.CLIMB
      b.timer = T.climbT
      b.cx0 = b.x
      b.cz0 = b.z
      b.cy0 = b.y
      b.cx1 = b.x - L.nx * (GINCANA.bodyR + 0.25)
      b.cz1 = b.z - L.nz * (GINCANA.bodyR + 0.25)
      b.cy1 = L.top
      b.grab = -1
      out?.push({ type: "climb", slot: b.slot })
      return
    }
  }

  const wasGround = b.ground
  if (!b.ground) b.vy -= T.gravity * dt
  const prevY = b.y
  b.y += b.vy * dt
  // no chão sobe degrau; caindo, pega uma beirinha (borda que ficou um pouco acima do pé)
  // caindo rápido (andar de baixo, 6 m) o passo anda ~0,3 m: o chão cruzado neste passo também pega (Gincana 3)
  const reach = wasGround ? Math.max(prevY, b.y) + T.stepUp : b.vy <= 0 ? Math.max(b.y + 0.25, prevY) : Math.max(prevY, b.y) + 0.02
  const g = groundUnder(w, b.x, b.z, reach)
  if (b.vy <= 0 && g.y > -Infinity && b.y <= g.y + (wasGround ? 0.06 : 0)) {
    b.y = g.y
    b.vy = 0
    b.pad = g.pad
    b.drum = g.drum
    b.fric = g.pad >= 0 ? C.pads[g.pad].f : g.drum >= 0 ? C.drums[g.drum].f : 1
    if (!b.ground) {
      b.ground = true
      // pousou: mergulho vira deslize; derrubado fica no chão o resto do tempo
      if (b.mode === MODE.DIVE) {
        b.mode = MODE.SLIDE
        b.timer = T.slideT
      } else if (b.mode === MODE.KNOCK) b.timer = Math.max(b.timer, 0.35)
    }
    b.air = 0
    if (g.tile >= 0 && (w.tiles[g.tile] < 0 || w.t - w.tiles[g.tile] >= C.tileTime.warn + C.tileTime.gone)) {
      w.tiles[g.tile] = w.t
      out?.push({ type: "tile", i: g.tile })
    }
    if (g.bounce > 0) {
      // cogumelo: lança para cima (o embalo de lado fica)
      b.vy = g.bounce
      b.launch = g.bounce
      b.ground = false
      b.air = T.coyote
      b.pad = -1
      if (b.mode === MODE.SLIDE) b.mode = MODE.RUN
      out?.push({ type: "bounce", slot: b.slot })
    }
  } else if (wasGround && b.vy <= 0 && g.y > -Infinity && b.y - g.y <= 0.3) {
    // descendo a rampa: gruda
    b.y = g.y
    b.vy = 0
    b.pad = g.pad
    b.drum = g.drum
  } else {
    if (b.ground) b.vy = Math.min(b.vy, 0)
    b.ground = false
    b.air += dt
    b.pad = -1
    b.drum = -1
  }

  // relógio dos estados sem controle
  if (b.mode === MODE.SLIDE || b.mode === MODE.RISE || b.mode === MODE.KNOCK) {
    if (b.ground || b.mode !== MODE.KNOCK) b.timer -= dt
    if (b.timer <= 0) {
      if (b.mode === MODE.RISE) b.mode = MODE.RUN
      else {
        b.mode = MODE.RISE
        b.timer = T.riseT
      }
    }
  }

  // a água (ou o perigo que sobe: o pântano pega quem ficou com o pé embaixo)
  if ((b.y < T.waterY || b.y < riseAt(C, w.t) - 0.15) && b.mode !== MODE.DONE) {
    b.mode = MODE.WATER
    b.timer = T.respawnT
    b.vy = Math.min(b.vy, -2)
    b.grab = -1
    out?.push({ type: "splash", slot: b.slot, x: b.x, z: b.z })
    if (fallOut(b, C, w.t)) {
      b.out = w.t
      out?.push({ type: "out", slot: b.slot })
    }
    return
  }
  if (b.mode === MODE.DONE) return
  // logo da Freelandoo: turbo com brilho (cada corredor tem os seus)
  for (let i = 0; i < C.logos.length; i++) {
    const L = C.logos[i]
    if (Math.abs(b.z - L.z) > T.logoR + 0.5 || w.t - b.took[i] < T.logoBack) continue
    if (Math.hypot(b.x - L.x, b.z - L.z) > T.logoR || b.y > L.y + 0.6 || b.y + T.bodyH < L.y - 0.6) continue
    b.took[i] = w.t
    b.boost = T.boostT
    out?.push({ type: "logo", slot: b.slot, i })
  }
  const next = C.checkpoints[b.cp + 1]
  if (next && b.ground && b.z >= next.z - 1.5) {
    b.cp++
    out?.push({ type: "cp", slot: b.slot, cp: b.cp })
  }
  if (b.z >= C.finishZ && b.y >= C.finishY - 0.5) {
    b.fin = w.t
    b.mode = MODE.DONE
    b.timer = 0
    b.grab = -1
    out?.push({ type: "finish", slot: b.slot, t: w.t })
  }
}

/** Dois corpos não ocupam o mesmo lugar: cada um sai metade (o que só aparece sai tudo). */
export function separate(a: Runner, b: Runner, moveB: boolean) {
  if (a.mode === MODE.WATER || b.mode === MODE.WATER) return false
  if (Math.abs(a.y - b.y) > GINCANA.bodyH * 0.8) return false
  const dx = a.x - b.x
  const dz = a.z - b.z
  const d = Math.hypot(dx, dz)
  const min = GINCANA.bodyR * 1.8
  if (d >= min) return false
  const nx = d > 1e-4 ? dx / d : 1
  const nz = d > 1e-4 ? dz / d : 0
  const push = min - d
  if (moveB) {
    a.x += nx * push * 0.5
    a.z += nz * push * 0.5
    b.x -= nx * push * 0.5
    b.z -= nz * push * 0.5
  } else {
    a.x += nx * push
    a.z += nz * push
  }
  return true
}

/** Código de animação que viaja na rede (CLIMB usa o de levantar). */
export const ANIM = { IDLE: 0, RUN: 1, AIR: 2, DIVE: 3, SLIDE: 4, KNOCK: 5, RISE: 6, WATER: 7, WIN: 8 } as const

export function runnerAnim(b: Runner) {
  switch (b.mode) {
    case MODE.DIVE:
      return ANIM.DIVE
    case MODE.SLIDE:
      return ANIM.SLIDE
    case MODE.RISE:
    case MODE.CLIMB:
      return ANIM.RISE
    case MODE.KNOCK:
      return ANIM.KNOCK
    case MODE.WATER:
      return ANIM.WATER
    case MODE.DONE:
      return ANIM.WIN
    default:
      if (!b.ground) return ANIM.AIR
      return Math.hypot(b.vx, b.vz) > 0.6 ? ANIM.RUN : ANIM.IDLE
  }
}
