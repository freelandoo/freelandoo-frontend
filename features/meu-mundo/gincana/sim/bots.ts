// features/meu-mundo/gincana/sim/bots.ts — GINCANA (mm3d-47): os computadores.
//
// Cada computador tem uma rota sorteada pela semente (lado do carrossel, viga
// das passarelas, faixa do campo, coluna do xadrez), um passo e uma
// HABILIDADE (0,55–0,95) que decide quanto ele erra: pula a barra cedo ou
// tarde, às vezes não espera o pêndulo nem a luva. Tudo determinístico pela
// semente e pelo tempo — a sala e o treino no aparelho decidem igual.

import { BALLS, GINCANA, GLOVES, PENDULUMS, POSTS, RAMP, SWEEPERS, TILE_COLS, TILE_PITCH, TILE_ROWS, TILE_Z0, TILES, gloveAt, pendulumAt, sweeperAngle, tileUp } from "./course"
import { MODE, type RunIntent, type RunWorld, type Runner } from "./body"

export interface BotBrain {
  route: { x: number; z: number }[]
  skill: number
  pace: number
  seed: number
  slot: number
  /** Coluna do xadrez e faixa da subida (mudam no caminho). */
  col: number
  laneX: number
  /** s até poder pular de novo. */
  jumpCool: number
  stuck: number
  lastZ: number
  /** s esperando (pêndulo/luva); passou da paciência, vai assim mesmo. */
  waited: number
  /** Mergulho para a chegada (só os melhores). */
  divesFinish: boolean
}

/** 0–1 determinístico. */
export function botRand(seed: number, a: number, b = 0) {
  let h = (Math.imul(a + 0x632be5ab, 0x9e3779b1) ^ Math.imul(b + 0x1b873593, 0x85ebca77) ^ Math.imul(seed | 0, 0xc2b2ae35)) >>> 0
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d) >>> 0
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b) >>> 0
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

const tileX = (c: number) => (c - (TILE_COLS - 1) / 2) * TILE_PITCH

export function newBrain(seed: number, slot: number): BotBrain {
  const r = (k: number) => botRand(seed, slot, k)
  const side = r(1) < 0.5 ? -1 : 1
  const route: { x: number; z: number }[] = []
  const add = (x: number, z: number) => route.push({ x, z })
  // largada e carrossel
  add(side * 1.2, 10)
  add(side * 0.8, 15.5)
  add(side * 2.5, 20)
  add(side * 4.5, 29)
  add(side * 4.5, 33)
  add(side * 4.5, 38.5)
  add(side * 4.5, 42)
  add(side * 4.6, 46)
  add(side * 4.5, 50)
  add(side * 4.5, 53)
  add(side * 4.5, 57.5)
  add(side * 3.5, 61)
  add(side * 3.2, 66)
  add(side * 2, 71)
  add(0, 75.8)
  add(0, 80)
  add(0, 84)
  // passarelas
  const L = [-5, 0, 5][Math.floor(r(2) * 3)]
  const D = L !== 0 ? L : r(3) < 0.5 ? -5 : 5
  add(L * 0.6, 88)
  add(L, 90.4)
  for (const z of [94, 98, 102, 105]) add(L, z)
  for (let k = 1; k <= 4; k++) add(L + (D - L) * (k / 4), 105 + 3.5 * k)
  for (const z of [122, 126, 130, 133.6]) add(D, z)
  add(D * 0.4, 137)
  // luvas
  const F = [-2.2, 2.2, -4.8, 4.8][Math.floor(r(4) * 4)]
  for (let z = 142; z <= 183; z += 3) add(F, z)
  // xadrez (a coluna muda no caminho; aqui só o eixo z)
  const col = Math.floor(r(5) * TILE_COLS)
  add(tileX(col) * 0.6, 187)
  add(tileX(col), 190.8)
  for (let k = 0; k < TILE_ROWS; k++) add(tileX(col), TILE_Z0 + k * TILE_PITCH)
  add(tileX(col) * 0.5, 213)
  add(0, 216.5)
  // subida e chegada
  for (let z = 222; z <= 256; z += 2.5) add(0, z)
  add(0, 259)
  add(0, 264)
  add(0, 269)
  const skill = 0.55 + r(6) * 0.4
  return { route, skill, pace: 0.86 + r(7) * 0.14, seed, slot, col, laneX: 0, jumpCool: 0, stuck: 0, lastZ: -99, waited: 0, divesFinish: r(8) < skill - 0.35 }
}

/** Intenção do computador neste passo. */
export function botIntent(br: BotBrain, b: Runner, w: RunWorld, dt = GINCANA.step): RunIntent {
  const it: RunIntent = { mx: 0, mz: 0, jump: false, dive: false }
  br.jumpCool = Math.max(0, br.jumpCool - dt)
  if (b.mode !== MODE.RUN || w.t < 0) return it
  const t = w.t
  // próximo ponto: o primeiro adiante (as rotas só andam para +z)
  let wi = 0
  while (wi < br.route.length - 1 && br.route[wi].z < b.z + 0.6) wi++
  let tx = br.route[wi].x
  const tz = br.route[wi].z

  // xadrez: troca de coluna se o ladrilho da frente caiu ou está tremendo
  if (b.z > 189 && b.z < 212) {
    let row = 0
    while (row < TILE_ROWS - 1 && TILE_Z0 + row * TILE_PITCH < b.z + 0.8) row++
    const ok = (c: number) => {
      if (c < 0 || c >= TILE_COLS) return false
      const s = w.tiles[row * TILE_COLS + c]
      return tileUp(s, t + 0.35) && !(s >= 0 && t - s < 0.8)
    }
    if (!ok(br.col)) {
      const order = br.col < TILE_COLS / 2 ? [br.col + 1, br.col - 1, br.col + 2, br.col - 2] : [br.col - 1, br.col + 1, br.col - 2, br.col + 2]
      for (const c of order) {
        if (ok(c)) {
          br.col = c
          break
        }
      }
    }
    tx = tileX(br.col)
  }
  // subida: a faixa mais livre das bolas que vêm
  if (b.z > RAMP.z0 - 2 && b.z < RAMP.z1 + 0.5) {
    const gaps = [-5.4, -2.9, 0, 2.9, 5.4]
    let best = br.laneX
    let bestScore = -Infinity
    for (const gx of gaps) {
      let score = -Math.abs(gx - br.laneX) * 0.15 - Math.abs(gx) * 0.05
      const bl = w.balls
      for (let k = 0; k < bl.length; k += 5) {
        const ahead = bl[k + 2] - b.z
        if (ahead < -1 || ahead > 9) continue
        const dx = Math.abs(bl[k] - gx)
        if (dx < BALLS.R + 1) score -= (10 - ahead) * (BALLS.R + 1 - dx)
      }
      if (score > bestScore) {
        bestScore = score
        best = gx
      }
    }
    // os menos hábeis demoram a perceber
    if (botRand(br.seed, br.slot, Math.floor(t * 4)) < br.skill) br.laneX = best
    tx = br.laneX
  }

  let dx = tx - b.x
  let dz = tz - b.z
  const d = Math.hypot(dx, dz) || 1
  dx /= d
  dz /= d
  // desvia das colunas (pilar do carrossel, frades do campo)
  for (const q of POSTS) {
    if (q.y1 <= b.y + GINCANA.stepUp || q.y0 > b.y + 1) continue
    const ox = q.x - b.x
    const oz = q.z - b.z
    const ahead = ox * dx + oz * dz
    if (ahead < 0 || ahead > 2.6) continue
    const lat = ox * dz - oz * dx
    const need = q.r + GINCANA.bodyR + 0.35
    if (Math.abs(lat) > need) continue
    const s = lat >= 0 ? -1 : 1
    const k = (need - Math.abs(lat)) / need
    dx += dz * s * k * 1.6
    dz += -dx * s * k * 0.2
  }
  const m = Math.hypot(dx, dz) || 1
  let go = br.pace
  it.mx = (dx / m) * go
  it.mz = (dz / m) * go

  // pêndulo adiante na mesma linha: espera passar (os menos hábeis às vezes vão)
  if (b.z > 86 && b.z < 134) {
    for (let i = 0; i < PENDULUMS.length; i++) {
      const p = PENDULUMS[i]
      const ahead = p.z - b.z
      // decide entre 4,6 e 2,4 m (freia em ~0,6 m e fica fora do alcance); mais perto, vai
      // (a bola do vizinho também alcança: confere todos os que balançam até aqui)
      if (ahead < 2.4 || ahead > 4.6 || Math.abs(p.x - b.x) > p.len * Math.sin(p.amp) + 2) continue
      // a bola passa pela faixa enquanto eu atravesso? (entrar e sair do alcance dela)
      const reach = p.R + GINCANA.bodyR + 0.3
      // onde eu estarei (na viga diagonal o x muda no caminho)
      const slope = it.mx / Math.max(0.2, it.mz)
      let near = false
      for (let k = 0; k <= 4; k++) {
        const dz = ahead - reach + (2 * reach * k) / 4
        const q = pendulumAt(p, t + dz / (GINCANA.run * br.pace))
        if (Math.abs(q.x - (b.x + slope * dz)) < reach) near = true
      }
      if (near && botRand(br.seed, br.slot * 97 + i, Math.floor(t / 2.86)) < br.skill + 0.05) go = 0
    }
  }
  // luva prestes a socar na faixa por onde vai passar: espera
  if (b.z > 140 && b.z < 184) {
    for (let i = 0; i < GLOVES.length; i++) {
      const g = GLOVES[i]
      const ahead = g.z - b.z
      if (ahead < 1.3 || ahead > 3.4) continue
      const enter = (ahead - 1.6) / GINCANA.run
      const leave = (ahead + 1.6) / GINCANA.run
      let hot = false
      for (const f of [0, 0.5, 1]) {
        const q = gloveAt(g, t + Math.max(0, enter + (leave - enter) * f))
        if (q.hot || q.u > 0.5) hot = true
      }
      if (hot && botRand(br.seed, br.slot * 89 + i, Math.floor(t / 2.6)) < br.skill + 0.1) go = 0
    }
  }
  if (go === 0) br.waited += dt
  if (go === 0 && br.waited < 6 + br.skill * 4) {
    it.mx = 0
    it.mz = 0
  } else if (go > 0) br.waited = Math.max(0, br.waited - dt * 0.5)

  // barra do carrossel chegando: pula na hora (com o erro da habilidade)
  if (b.ground && br.jumpCool <= 0 && b.z < 80) {
    for (let i = 0; i < SWEEPERS.length; i++) {
      const s = SWEEPERS[i]
      const cx = b.x - s.x
      const cz = b.z - s.z
      const r = Math.hypot(cx, cz)
      if (r > s.len + 0.3 || r < 1.0) continue
      const span = s.both ? Math.PI : Math.PI * 2
      const ang = Math.atan2(cx, cz)
      const a = sweeperAngle(s, t)
      const delta = ((((ang - a) * Math.sign(s.w)) % span) + span) % span
      // contato antes do alinhamento: a grossura da barra e do corpo
      const ttr = (delta - (s.r + GINCANA.bodyR) / Math.max(r, 1)) / Math.abs(s.w)
      const pass = Math.floor((s.w * t + s.a0) / span)
      const err = (botRand(br.seed, br.slot * 31 + i, pass) - 0.5) * (1 - br.skill) * 0.7
      if (ttr < 0.22 + err && ttr > 0.02) {
        it.jump = true
        br.jumpCool = 0.7
      }
    }
  }
  // ladrilho tremendo embaixo: pula para o próximo
  if (b.ground && br.jumpCool <= 0 && b.z > 191 && b.z < 211) {
    for (let i = 0; i < TILES.length; i++) {
      const q = TILES[i]
      const s = w.tiles[i]
      if (s < 0 || Math.abs(b.x - q.x) > q.h || Math.abs(b.z - q.z) > q.h) continue
      if (t - s > 0.45 && botRand(br.seed, br.slot, i) < br.skill) {
        it.jump = true
        br.jumpCool = 0.6
      }
    }
  }
  // preso (parado sem esperar nada): pula
  if (Math.abs(b.z - br.lastZ) > 0.6) {
    br.lastZ = b.z
    br.stuck = 0
  } else if (go > 0) {
    br.stuck += dt
    if (br.stuck > 2.2 && b.ground) {
      it.jump = true
      br.stuck = 0
    }
  }
  // reta final: os melhores mergulham para a linha
  if (br.divesFinish && b.ground && b.z > 259 && b.z < 262 && Math.abs(b.facing) < 0.3) it.dive = true
  return it
}
