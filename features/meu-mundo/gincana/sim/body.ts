// features/meu-mundo/gincana/sim/body.ts — GINCANA (mm3d-47): o corpo de quem corre.
//
// Passo fixo (GINCANA.step). Anda pela intenção (direção no mundo, 0–1),
// pula, MERGULHA (para a frente; desliza de barriga e levanta), é derrubado
// pelo que se mexe (barra, pêndulo, luva, bola: voa, cai, levanta), cai na
// água (volta ao último posto) e chega. Mesmo código no aparelho (o meu
// corpo e os computadores do treino) e na sala (os computadores da partida).

import {
  BALLS,
  CHECKPOINTS,
  DECK,
  FINISH_Y,
  FINISH_Z,
  GINCANA,
  GLOVES,
  PADS,
  PENDULUMS,
  POSTS,
  SWEEPERS,
  TILES,
  TILE_TIME,
  LOGOS,
  gloveAt,
  pendulumAt,
  rampTop,
  spawnAt,
  sweeperAngle,
  tileUp,
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
  /** s que faltam do estado (mergulho, deslize, levantar, derrubado, água). */
  timer: number
  /** Nada derruba enquanto > 0 (depois de voltar). */
  shield: number
  /** Não toma outra pancada logo em seguida. */
  hitCool: number
  /** Último posto alcançado (índice de CHECKPOINTS). */
  cp: number
  /** Tempo da chegada (−1 = ainda correndo). */
  fin: number
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
}

export interface RunIntent {
  /** Direção no mundo (|m| ≤ 1). */
  mx: number
  mz: number
  /** Apertou pular / mergulhar neste passo (borda). */
  jump: boolean
  dive: boolean
}

/** O mundo num instante: tempo da prova, semente das bolas e os ladrilhos. */
export interface RunWorld {
  t: number
  seed: number
  /** Quando cada ladrilho foi pisado (−1 = em pé, nunca pisado). */
  tiles: Float64Array
  /** Bolas rolando agora (ballsAt): [x, y, z, faixa, índice]… */
  balls: number[]
}

/** Acontecimentos de um passo (para som, aviso e animação). */
export type RunEvent =
  | { type: "jump"; slot: number }
  | { type: "dive"; slot: number }
  | { type: "hit"; slot: number; by: "bar" | "swing" | "glove" | "ball" }
  | { type: "splash"; slot: number; x: number; z: number }
  | { type: "back"; slot: number }
  | { type: "cp"; slot: number; cp: number }
  | { type: "finish"; slot: number; t: number }
  | { type: "tile"; i: number }
  | { type: "logo"; slot: number; i: number }

export const IDLE_INTENT: RunIntent = { mx: 0, mz: 0, jump: false, dive: false }

export function newRunner(slot: number): Runner {
  const p = spawnAt(0, slot)
  return { slot, x: p.x, y: p.y, z: p.z, vx: 0, vy: 0, vz: 0, facing: 0, ground: true, air: 0, mode: MODE.RUN, timer: 0, shield: 0, hitCool: 0, cp: 0, fin: -1, launch: GINCANA.jumpV, jumpBuf: 0, boost: 0, took: LOGOS.map(() => -99), px: p.x, py: p.y, pz: p.z }
}

const EDGE = 0.12

/** Chão mais alto até `reach` sob (x, z): altura e ladrilho (−1 = não é ladrilho); y = −∞ sem chão. */
export function groundUnder(w: RunWorld, x: number, z: number, reach: number) {
  let best = -Infinity
  let tile = -1
  for (const p of PADS) {
    let top: number
    if (p.k === 0) {
      if (Math.hypot(x - p.x, z - p.z) > p.r + EDGE) continue
      top = p.y
    } else {
      const dx = x - p.x
      const dz = z - p.z
      const c = Math.cos(p.rot)
      const s = Math.sin(p.rot)
      const lx = dx * c - dz * s
      const lz = dx * s + dz * c
      if (Math.abs(lx) > p.hx + EDGE || Math.abs(lz) > p.hz + EDGE) continue
      top = p.k === 2 ? rampTop(z) : p.y
    }
    if (top <= reach && top > best) {
      best = top
      tile = -1
    }
  }
  for (const q of POSTS) {
    if (q.y1 <= reach && q.y1 > best && Math.hypot(x - q.x, z - q.z) <= q.r) {
      best = q.y1
      tile = -1
    }
  }
  if (z > TILES[0].z - 2 && z < TILES[TILES.length - 1].z + 2) {
    for (let i = 0; i < TILES.length; i++) {
      const q = TILES[i]
      if (Math.abs(x - q.x) > q.h + EDGE || Math.abs(z - q.z) > q.h + EDGE) continue
      if (!tileUp(w.tiles[i], w.t)) continue
      if (DECK <= reach && DECK > best) {
        best = DECK
        tile = i
      }
    }
  }
  return { y: best, tile }
}

/** Empurra para fora das paredes (lado das plataformas acima do pé) e das colunas. */
function pushWalls(b: Runner, w: RunWorld) {
  const R = GINCANA.bodyR
  const H = GINCANA.bodyH
  const lift = b.y + GINCANA.stepUp
  for (const p of PADS) {
    const top = p.k === 2 ? rampTop(b.z) : p.y
    if (top <= lift || top - p.d >= b.y + H) continue
    if (p.k === 0) {
      const dx = b.x - p.x
      const dz = b.z - p.z
      const d = Math.hypot(dx, dz)
      if (d >= p.r + R || d < 1e-6) continue
      // por dentro: só se veio de baixo (caiu ao lado) — empurra para fora
      b.x = p.x + (dx / d) * (p.r + R)
      b.z = p.z + (dz / d) * (p.r + R)
      continue
    }
    const c = Math.cos(p.rot)
    const s = Math.sin(p.rot)
    const dx = b.x - p.x
    const dz = b.z - p.z
    const lx = dx * c - dz * s
    const lz = dx * s + dz * c
    const ox = p.hx + R - Math.abs(lx)
    const oz = p.hz + R - Math.abs(lz)
    if (ox <= 0 || oz <= 0) continue
    let nx = lx
    let nz = lz
    if (ox < oz) nx = Math.sign(lx || 1) * (p.hx + R)
    else nz = Math.sign(lz || 1) * (p.hz + R)
    b.x = p.x + nx * c + nz * s
    b.z = p.z - nx * s + nz * c
  }
  for (const q of POSTS) {
    if (q.y1 <= lift || q.y0 >= b.y + H) continue
    const dx = b.x - q.x
    const dz = b.z - q.z
    const d = Math.hypot(dx, dz)
    if (d >= q.r + R || d < 1e-6) continue
    b.x = q.x + (dx / d) * (q.r + R)
    b.z = q.z + (dz / d) * (q.r + R)
  }
  // ladrilhos caídos não seguram, e os de pé têm lado
  if (b.z > TILES[0].z - 2 && b.z < TILES[TILES.length - 1].z + 2 && DECK > lift) {
    for (let i = 0; i < TILES.length; i++) {
      const q = TILES[i]
      if (!tileUp(w.tiles[i], w.t) || DECK - 0.6 >= b.y + H) continue
      const lx = b.x - q.x
      const lz = b.z - q.z
      const ox = q.h + R - Math.abs(lx)
      const oz = q.h + R - Math.abs(lz)
      if (ox <= 0 || oz <= 0) continue
      if (ox < oz) b.x = q.x + Math.sign(lx || 1) * (q.h + R)
      else b.z = q.z + Math.sign(lz || 1) * (q.h + R)
    }
  }
}

/** Distância do ponto ao segmento vertical do corpo (x, z, de y+R a y+H−R). */
function sphereGap(b: Runner, x: number, y: number, z: number) {
  const R = GINCANA.bodyR
  const cy = Math.max(b.y + R, Math.min(b.y + GINCANA.bodyH - R, y))
  return Math.hypot(b.x - x, b.z - z, cy - y)
}

function knock(b: Runner, kx: number, ky: number, kz: number, by: "bar" | "swing" | "glove" | "ball", out: RunEvent[] | null) {
  if (b.shield > 0 || b.hitCool > 0 || b.mode === MODE.WATER || b.mode === MODE.DONE) return
  b.vx = kx + b.vx * 0.15
  b.vz = kz + b.vz * 0.15
  b.vy = Math.max(b.vy, ky)
  b.ground = false
  b.air = GINCANA.coyote
  b.mode = MODE.KNOCK
  b.timer = GINCANA.stunT
  b.hitCool = 1.4
  out?.push({ type: "hit", slot: b.slot, by })
}

/** O que se mexe: barras, pêndulos, luvas e bolas. */
function hazards(b: Runner, w: RunWorld, out: RunEvent[] | null) {
  const R = GINCANA.bodyR
  const H = GINCANA.bodyH
  const t = w.t
  if (b.z < 100) {
    for (const s of SWEEPERS) {
      const cx = b.x - s.x
      const cz = b.z - s.z
      if (Math.hypot(cx, cz) > s.len + R + s.r) continue
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
      const sp = s.w * along
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
  }
  if (b.z > 85 && b.z < 140) {
    for (const p of PENDULUMS) {
      if (Math.abs(b.z - p.z) > p.R + R + 0.2) continue
      const q = pendulumAt(p, t)
      if (sphereGap(b, q.x, q.y, q.z) >= p.R + R) continue
      const dir = Math.abs(q.vx) > 1 ? Math.sign(q.vx) : Math.sign(b.x - q.x || 1)
      knock(b, dir * 9, 4.5, Math.sign(b.z - q.z || 1) * 1.5, "swing", out)
    }
  }
  if (b.z > 140 && b.z < 185) {
    for (const g of GLOVES) {
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
  }
  if (b.z > 216 && w.balls.length) {
    const bl = w.balls
    for (let k = 0; k < bl.length; k += 5) {
      if (sphereGap(b, bl[k], bl[k + 1], bl[k + 2]) >= BALLS.R + R) continue
      knock(b, Math.sign(b.x - bl[k] || 1) * 3, 5, -9, "ball", out)
    }
  }
}

/** Volta ao último posto (caiu na água ou ficou preso). */
export function respawn(b: Runner) {
  const p = spawnAt(b.cp, b.slot)
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
}

export function stepRunner(b: Runner, it: RunIntent, w: RunWorld, out: RunEvent[] | null, dt = GINCANA.step) {
  const T = GINCANA
  b.shield = Math.max(0, b.shield - dt)
  b.boost = Math.max(0, b.boost - dt)
  b.jumpBuf = it.jump ? T.jumpBuffer : Math.max(0, b.jumpBuf - dt)
  b.hitCool = Math.max(0, b.hitCool - dt)
  if (b.mode === MODE.WATER) {
    b.timer -= dt
    b.vy = Math.max(-3, b.vy - T.gravity * dt)
    b.y += b.vy * dt
    b.vx *= 0.9
    b.vz *= 0.9
    if (b.timer <= 0) {
      respawn(b)
      out?.push({ type: "back", slot: b.slot })
    }
    return
  }
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
    const run = T.run * (b.boost > 0 ? T.boost : 1)
    const tx = mx * run
    const tz = mz * run
    const a = T.accel * (b.boost > 0 ? 1.3 : 1) * (b.ground ? 1 : T.airControl) * dt
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
      out?.push({ type: "dive", slot: b.slot })
    }
  } else if (b.ground) {
    // de barriga, levantando ou derrubado no chão: escorrega até parar
    const k = Math.max(0, 1 - (b.mode === MODE.SLIDE ? 5 : 9) * dt)
    b.vx *= k
    b.vz *= k
  }

  b.x += b.vx * dt
  b.z += b.vz * dt
  pushWalls(b, w)
  hazards(b, w, out)

  const wasGround = b.ground
  if (!b.ground) b.vy -= T.gravity * dt
  const prevY = b.y
  b.y += b.vy * dt
  const reach = wasGround ? Math.max(prevY, b.y) + T.stepUp : Math.max(prevY, b.y) + 0.02
  const g = groundUnder(w, b.x, b.z, reach)
  if (b.vy <= 0 && g.y > -Infinity && b.y <= g.y + (wasGround ? 0.06 : 0)) {
    b.y = g.y
    b.vy = 0
    if (!b.ground) {
      b.ground = true
      // pousou: mergulho vira deslize; derrubado fica no chão o resto do tempo
      if (b.mode === MODE.DIVE) {
        b.mode = MODE.SLIDE
        b.timer = T.slideT
      } else if (b.mode === MODE.KNOCK) b.timer = Math.max(b.timer, 0.35)
    }
    b.air = 0
    if (g.tile >= 0 && (w.tiles[g.tile] < 0 || w.t - w.tiles[g.tile] >= TILE_TIME.warn + TILE_TIME.gone)) {
      w.tiles[g.tile] = w.t
      out?.push({ type: "tile", i: g.tile })
    }
  } else if (wasGround && b.vy <= 0 && g.y > -Infinity && b.y - g.y <= 0.3) {
    // descendo a rampa: gruda
    b.y = g.y
    b.vy = 0
  } else {
    if (b.ground) b.vy = Math.min(b.vy, 0)
    b.ground = false
    b.air += dt
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

  if (b.y < T.waterY && b.mode !== MODE.DONE) {
    b.mode = MODE.WATER
    b.timer = T.respawnT
    b.vy = Math.min(b.vy, -2)
    out?.push({ type: "splash", slot: b.slot, x: b.x, z: b.z })
    return
  }
  if (b.mode === MODE.DONE) return
  // logo da Freelandoo: turbo com brilho (cada corredor tem os seus)
  for (let i = 0; i < LOGOS.length; i++) {
    const L = LOGOS[i]
    if (Math.abs(b.z - L.z) > T.logoR + 0.5 || w.t - b.took[i] < T.logoBack) continue
    if (Math.hypot(b.x - L.x, b.z - L.z) > T.logoR || b.y > L.y + 0.6 || b.y + T.bodyH < L.y - 0.6) continue
    b.took[i] = w.t
    b.boost = T.boostT
    out?.push({ type: "logo", slot: b.slot, i })
  }
  const next = CHECKPOINTS[b.cp + 1]
  if (next && b.ground && b.z >= next.z - 1.5) {
    b.cp++
    out?.push({ type: "cp", slot: b.slot, cp: b.cp })
  }
  if (b.z >= FINISH_Z && b.y >= FINISH_Y - 0.5) {
    b.fin = w.t
    b.mode = MODE.DONE
    b.timer = 0
    out?.push({ type: "finish", slot: b.slot, t: w.t })
  }
}

/** Dois corpos não ocupam o mesmo lugar: cada um sai metade (o que só aparece sai tudo). */
export function separate(a: Runner, b: Runner, moveB: boolean) {
  if (a.mode === MODE.WATER || b.mode === MODE.WATER) return
  if (Math.abs(a.y - b.y) > GINCANA.bodyH * 0.8) return
  const dx = a.x - b.x
  const dz = a.z - b.z
  const d = Math.hypot(dx, dz)
  const min = GINCANA.bodyR * 1.8
  if (d >= min) return
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
}

/** Código de animação que viaja na rede. */
export const ANIM = { IDLE: 0, RUN: 1, AIR: 2, DIVE: 3, SLIDE: 4, KNOCK: 5, RISE: 6, WATER: 7, WIN: 8 } as const

export function runnerAnim(b: Runner) {
  switch (b.mode) {
    case MODE.DIVE:
      return ANIM.DIVE
    case MODE.SLIDE:
      return ANIM.SLIDE
    case MODE.RISE:
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
