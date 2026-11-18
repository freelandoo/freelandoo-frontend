// features/meu-mundo/gincana/sim/bots.ts — GINCANA (mm3d-47): os computadores.
//
// Cada computador segue a ROTA da fase (courses.ts; a semente escolhe o lado,
// a viga, a faixa), com um passo e uma HABILIDADE (0,55–0,95) que decide quanto
// ele erra: pula a barra cedo ou tarde, às vezes não espera o pêndulo, a luva
// ou o bloco. Gincana 2.0: o comportamento é genérico (vale em qualquer fase):
// pula buraco quando o chão acaba e há chão adiante, espera a plataforma que
// anda chegar, escolhe porta (as que já abriram primeiro; bateu numa falsa,
// tenta a vizinha), troca de ladrilho quando o da frente treme, escolhe a
// faixa sem bola na subida. Tudo determinístico pela semente e pelo tempo — a
// sala e o treino no aparelho decidem igual.

import { GINCANA, drumAt, gloveAt, memCall, memState, memSymbols, memTarget, memTile, onTile, padShift, pendulumAt, pusherAt, sweeperAngle, tileUp, wallsAt, type Course, type RoutePoint, type WallWave } from "./course"
import { MODE, groundUnder, type RunIntent, type RunWorld, type Runner } from "./body"

export interface BotBrain {
  route: RoutePoint[]
  skill: number
  pace: number
  seed: number
  slot: number
  /** Faixa da subida (muda no caminho). */
  laneX: number
  /** s até poder pular de novo. */
  jumpCool: number
  stuck: number
  lastZ: number
  /** s esperando (pêndulo/luva/bloco/plataforma); passou da paciência, vai assim mesmo. */
  waited: number
  /** Mergulho para a chegada (só os melhores). */
  divesFinish: boolean
  /** Porta escolhida (−1 = nenhuma) e as falsas que já descobriu. */
  door: number
  bad: Set<number>
  /** Ladrilho escolhido (−1 = nenhum). */
  tile: number
}

/** 0–1 determinístico. */
export function botRand(seed: number, a: number, b = 0) {
  let h = (Math.imul(a + 0x632be5ab, 0x9e3779b1) ^ Math.imul(b + 0x1b873593, 0x85ebca77) ^ Math.imul(seed | 0, 0xc2b2ae35)) >>> 0
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d) >>> 0
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b) >>> 0
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

export function newBrain(w: RunWorld, seed: number, slot: number): BotBrain {
  const r = (k: number) => botRand(seed, slot, k)
  const route = w.course.route(r)
  const skill = 0.55 + r(6) * 0.4
  return { route, skill, pace: 0.86 + r(7) * 0.14, seed, slot, laneX: 0, jumpCool: 0, stuck: 0, lastZ: -99, waited: 0, divesFinish: r(8) < skill - 0.35, door: -1, bad: new Set(), tile: -1 }
}

/**
 * Gincana 3: o computador numa ARENA. Pedras que caem: vai para uma pedra firme
 * do mesmo andar, perto e com muitas vizinhas firmes (lugar para continuar), e
 * os mais hábeis pulam o tempo todo (no ar não derruba pedra). Tudo pela
 * semente e pelo tempo, igual na sala e no aparelho.
 */
/**
 * Barra chegando: prevê onde estarei (velocidade de agora) e onde a barra
 * estará; pula ~0,15 s antes do contato — ou, se a barra é ALTA (na altura do
 * peito, Gincana 3), mergulha por baixo, de frente para o eixo. Erro pela habilidade.
 */
function barJump(br: BotBrain, b: Runner, w: RunWorld, it: RunIntent) {
  const C = w.course
  const t = w.t
  if (!b.ground || br.jumpCool > 0) return
  const vx = b.vx + (it.mx * GINCANA.run - b.vx) * 0.5
  const vz = b.vz + (it.mz * GINCANA.run - b.vz) * 0.5
  for (let i = 0; i < C.sweepers.length; i++) {
    const s = C.sweepers[i]
    if (Math.hypot(b.x - s.x, b.z - s.z) > s.len + 5) continue
    const high = s.y - s.r - b.y > 0.9
    let tc = -1
    for (let k = 1; k <= 30 && tc < 0; k++) {
      const h = k * 0.02
      const px = b.x + vx * h - s.x
      const pz = b.z + vz * h - s.z
      const a = sweeperAngle(s, t + h)
      const dx = Math.sin(a)
      const dz = Math.cos(a)
      const along = Math.max(s.both ? -s.len : 0, Math.min(s.len, px * dx + pz * dz))
      if (Math.abs(along) < 0.9) continue
      if (Math.hypot(px - dx * along, pz - dz * along) < s.r + GINCANA.bodyR + 0.08) tc = h
    }
    if (tc < 0) continue
    const span = s.both ? Math.PI : Math.PI * 2
    const pass = Math.floor(sweeperAngle(s, t) / span)
    const err = (botRand(br.seed, br.slot * 31 + i, pass) - 0.5) * (1 - br.skill) * 0.3
    if (high) {
      // mergulha um pouco antes (o mergulho leva ~0,1 s para baixar), de frente para o eixo
      if (tc < 0.3 + err && tc > 0.06) {
        const ex = s.x - b.x
        const ez = s.z - b.z
        const d = Math.hypot(ex, ez) || 1
        it.mx = ex / d
        it.mz = ez / d
        it.dive = true
        br.jumpCool = 0.9
      }
    } else if (tc < 0.2 + err && tc > 0.04) {
      it.jump = true
      br.jumpCool = 0.7
    }
  }
}

/** Ondas de parede vistas pelo computador (reaproveitado). */
const BOT_WALLS: WallWave[] = []

/** Vizinhas de cada pedra (mesmo andar, até 2,6 m), calculadas uma vez por percurso. */
const TILE_NB = new WeakMap<Course, number[][]>()
function tileNeighbors(C: Course) {
  let nb = TILE_NB.get(C)
  if (nb) return nb
  nb = C.tiles.map((q, i) => {
    const out: number[] = []
    for (let j = 0; j < C.tiles.length; j++) {
      const p = C.tiles[j]
      if (j !== i && Math.abs(p.y - q.y) < 0.1 && Math.hypot(p.x - q.x, p.z - q.z) < 2.6) out.push(j)
    }
    return out
  })
  TILE_NB.set(C, nb)
  return nb
}

function arenaIntent(br: BotBrain, b: Runner, w: RunWorld, it: RunIntent): RunIntent {
  const C = w.course
  const t = w.t
  let tx = b.x
  let tz = b.z
  if (C.tiles.length) {
    const firm = (i: number) => w.tiles[i] < 0 && Math.abs(C.tiles[i].y - b.y) < 0.5
    const cur = br.tile
    const reached = cur >= 0 && Math.hypot(C.tiles[cur].x - b.x, C.tiles[cur].z - b.z) < 0.8
    if (b.ground && (cur < 0 || reached || !firm(cur))) {
      let best = -1
      let bestScore = -Infinity
      const noise = 0.4 + (1 - br.skill) * 2.5
      for (let i = 0; i < C.tiles.length; i++) {
        if (!firm(i)) continue
        const q = C.tiles[i]
        const d = Math.hypot(q.x - b.x, q.z - b.z)
        if (d < 1.8 || d > 7.5) continue
        let n = 0
        for (const j of tileNeighbors(C)[i]) if (firm(j)) n++
        const score = n - d * 0.25 - Math.hypot(q.x, q.z) * 0.06 + botRand(br.seed, br.slot * 13 + i, Math.floor(t)) * noise
        if (score > bestScore) {
          bestScore = score
          best = i
        }
      }
      // nada perto: a pedra firme mais perto do andar, longe que seja
      if (best < 0) {
        let bd = Infinity
        for (let i = 0; i < C.tiles.length; i++) {
          if (!firm(i)) continue
          const d = Math.hypot(C.tiles[i].x - b.x, C.tiles[i].z - b.z)
          if (d < bd) {
            bd = d
            best = i
          }
        }
      }
      br.tile = best
    }
    if (br.tile >= 0) {
      tx = C.tiles[br.tile].x
      tz = C.tiles[br.tile].z
    }
    // pula para poupar pedra (os mais hábeis quase sempre)
    if (b.ground && br.jumpCool <= 0 && botRand(br.seed, br.slot, Math.floor(t * 4)) < br.skill * 1.2 - 0.25) {
      it.jump = true
      br.jumpCool = 0.2
    }
  }
  // Paredes de Brasa: fica na frente da arena; a próxima onda chegando, vai para o vão (ou pula a mureta)
  if (C.walls) {
    const Wl = C.walls
    const list = wallsAt(C, w.seed, t, BOT_WALLS)
    let next: WallWave | null = null
    for (const v of list) if (v.z > b.z - 0.1 && (!next || v.z < next.z)) next = v
    tx = Math.max(-Wl.hw + 2, Math.min(Wl.hw - 2, b.x))
    tz = 2.5
    if (next) {
      const eta = (next.z - b.z) / next.v
      // os menos hábeis percebem tarde e às vezes escolhem o vão errado
      const notice = 2.6 - (1 - br.skill) * 1.6
      if (next.kind === 1) {
        const err = (botRand(br.seed, br.slot * 17, next.i) - 0.5) * (1 - br.skill) * 0.35
        if (b.ground && br.jumpCool <= 0 && eta < 0.22 + err && eta > 0.02) {
          it.jump = true
          br.jumpCool = 0.5
        }
      } else if (eta < notice) {
        const n = Math.round((2 * Wl.hw) / Wl.seg)
        let g = next.gaps[0]
        for (const q of next.gaps) if (Math.abs(-Wl.hw + (q + 0.5) * Wl.seg - b.x) < Math.abs(-Wl.hw + (g + 0.5) * Wl.seg - b.x)) g = q
        if (next.i >= 3 && botRand(br.seed, br.slot * 19, next.i) < (1 - br.skill) * 0.35) g = g > 0 && (g === n - 1 || botRand(br.seed, br.slot * 23, next.i) < 0.5) ? g - 1 : g + 1
        tx = -Wl.hw + (g + 0.5) * Wl.seg
        // parado no vão esperando a parede passar
        tz = b.z
      }
    }
  }
  // Caça às Engrenagens: a engrenagem que vale mais pela distância (a dourada atrai); sobe na plataforma pulando
  if (C.gems.length) {
    let best = -1
    let bestScore = -Infinity
    for (let k = 0; k < C.gems.length; k++) {
      const g = C.gems[k]
      // a que vai voltar logo também serve (chega quando ela aparece)
      const back = w.gems[k] < 0 ? g.t0 - t : w.gems[k] + g.back - t
      const d = Math.hypot(g.x - b.x, g.z - b.z)
      const wait = Math.max(0, back - d / GINCANA.run)
      if (wait > 1.5) continue
      const score = g.v / (d + 3 + wait * 6) + botRand(br.seed, br.slot * 7 + k, Math.floor(t / 2)) * 0.12 * (1.4 - br.skill)
      if (score > bestScore) {
        bestScore = score
        best = k
      }
    }
    if (best >= 0) {
      const g = C.gems[best]
      tx = g.x
      tz = g.z
      // está no alto (plataforma do meio): pula perto da beira
      const d = Math.hypot(g.x - b.x, g.z - b.z)
      if (g.y - 0.9 > b.y + 0.5 && d < 3.6 && b.ground && br.jumpCool <= 0) {
        it.jump = true
        br.jumpCool = 0.6
      }
    } else {
      tx = 0
      tz = 0
    }
  }
  // Rei do Iceberg: vai para o topo (um lugar dentro dele que muda de tempo em tempo); pula na beira
  if (C.zone) {
    const Z = C.zone
    const a = botRand(br.seed, br.slot, 700 + Math.floor(t / 4)) * Math.PI * 2
    const rr = botRand(br.seed, br.slot, 800 + Math.floor(t / 4)) * (Z.r - 1.2)
    tx = Z.x + Math.sin(a) * rr
    tz = Z.z + Math.cos(a) * rr
    const d = Math.hypot(Z.x - b.x, Z.z - b.z)
    // ainda embaixo: pula perto da beira (o mais fraco erra a hora às vezes)
    if (b.y < Z.y - 0.4 && d < Z.r + 1.4 + br.skill * 0.6 && b.ground && br.jumpCool <= 0) {
      it.jump = true
      br.jumpCool = 0.5 + (1 - br.skill) * 0.6
    }
  }
  // Rolo de Gelo: procura o ponto (5 de lado × o anel e os vizinhos) que fica livre por mais tempo,
  // descontado o tempo para chegar lá (quem é bom enxerga mais longe); pula o buraco que chega no pé
  if (C.drums.length) {
    const d = C.drums[0]
    const sight = 1.6 + br.skill * 2.4
    const zOf: number[] = []
    let z0 = d.z0
    let here = 0
    for (let q = 0; q < d.rings.length; q++) {
      zOf.push(z0 + d.rings[q].len / 2)
      if (b.z >= z0 && b.z <= z0 + d.rings[q].len) here = q
      z0 += d.rings[q].len
    }
    let bestScore = -Infinity
    for (let q = Math.max(0, here - 1); q <= Math.min(d.rings.length - 1, here + 1); q++) {
      for (let px = -3; px <= 3; px += 1.5) {
        const x = d.x + px
        const z = zOf[q] + ((br.slot % 4) - 1.5) * 0.6
        const travel = Math.hypot(x - b.x, z - b.z) / GINCANA.run
        // o caminho até lá (o meio) também precisa estar de pé agora
        if (!drumAt(d, (x + b.x) / 2, (z + b.z) / 2, t + travel / 2)) continue
        let sf = sight + 0.5
        for (let s = travel; s <= sight; s += 0.15) {
          if (!drumAt(d, x, z, t + s)) {
            sf = s
            break
          }
        }
        const sc = sf - travel - Math.abs(px) * 0.08 + (q === here ? 0.3 : 0) + botRand(br.seed, br.slot * 9 + q * 5 + px, Math.floor(t / 2)) * 0.4 * (1.4 - br.skill)
        if (sc > bestScore) {
          bestScore = sc
          tx = x
          tz = z
        }
      }
    }
    if (bestScore === -Infinity) {
      tx = d.x
      tz = zOf[here]
    }
    // buraco já debaixo do pé: pula
    if (b.ground && br.jumpCool <= 0 && !drumAt(d, b.x, b.z, t + 0.12)) {
      it.jump = true
      br.jumpCool = 0.6
    }
  }
  // Relógio da Praça: decorando, passeia por um ladrilho sorteado da rodada; o relógio chamou, corre
  // para o ladrilho mais perto do símbolo (depois de reagir). Às vezes "esquece" e vai para um errado:
  // mais nas rodadas do fim e nos menos hábeis.
  if (C.memory) {
    const M = C.memory
    const st = memState(M, t)
    const N = M.n * M.n
    const roam = memTile(M, Math.floor(botRand(br.seed, br.slot * 7, 900 + st.r * 3 + (st.ph >= 3 ? 1 : 0)) * N) % N)
    tx = roam.x
    tz = roam.z
    const react = 0.25 + (1 - br.skill) * 0.9
    const since = st.ph === 3 ? memCall(st.r) - st.left : st.ph === 4 ? 99 : -1
    if (since >= react) {
      const sym = memSymbols(M, w.seed, st.r)
      const forget = 0.015 + st.r * 0.03 + (1 - br.skill) * 0.1
      const target = botRand(br.seed, br.slot * 31, 950 + st.r) < forget ? (memTarget(w.seed, st.r) + 1 + Math.floor(botRand(br.seed, br.slot, 970 + st.r) * 5)) % 6 : memTarget(w.seed, st.r)
      let bd = Infinity
      for (let i = 0; i < N; i++) {
        if (sym[i] !== target) continue
        const q = memTile(M, i)
        const dd = Math.hypot(q.x - b.x, q.z - b.z)
        if (dd < bd) {
          bd = dd
          tx = q.x
          tz = q.z
        }
      }
    }
  }
  // arena sem pedras (Varredura): um lugar a ~5 m do eixo, que muda de tempo em tempo
  if (!C.tiles.length && !C.gems.length && !C.zone && !C.drums.length && !C.memory && C.sweepers.length) {
    const a = botRand(br.seed, br.slot, 500 + Math.floor(t / 6)) * Math.PI * 2
    const rr = 3.5 + botRand(br.seed, br.slot, 600 + Math.floor(t / 6)) * 3.5
    tx = C.sweepers[0].x + Math.sin(a) * rr
    tz = C.sweepers[0].z + Math.cos(a) * rr
  }
  const dx = tx - b.x
  const dz = tz - b.z
  const d = Math.hypot(dx, dz)
  const go = br.pace * Math.min(1, d / 0.8)
  if (d > 1e-3) {
    it.mx = (dx / d) * go
    it.mz = (dz / d) * go
  }
  barJump(br, b, w, it)
  return it
}

/** Escolhe a porta da fileira à frente: aberta (alguém passou) > desconhecida mais perto > a sorteada. */
function pickDoor(br: BotBrain, b: Runner, w: RunWorld, row: number) {
  const C = w.course
  let best = -1
  let bestScore = -Infinity
  for (let i = 0; i < C.doors.length; i++) {
    const d = C.doors[i]
    if (d.row !== row || br.bad.has(i)) continue
    let score = -Math.abs(d.x - b.x) * 0.25 + botRand(br.seed, br.slot * 13 + i, row) * 1.5
    if (w.doors[i] >= 0) score += 6 * br.skill + 1
    if (w.doors[i] === -2) score -= 20
    if (score > bestScore) {
      bestScore = score
      best = i
    }
  }
  return best
}

/** Intenção do computador neste passo. */
export function botIntent(br: BotBrain, b: Runner, w: RunWorld, dt = GINCANA.step): RunIntent {
  const C = w.course
  const it: RunIntent = { mx: 0, mz: 0, jump: false, dive: false, grab: false }
  br.jumpCool = Math.max(0, br.jumpCool - dt)
  if (b.mode !== MODE.RUN || w.t < 0) return it
  // Gincana 3: arena (sobrevivência, coleta, zona) — sem rota
  if (C.mode !== "race") return arenaIntent(br, b, w, it)
  const t = w.t
  // próximo ponto: o primeiro adiante (as rotas só andam para +z)
  let wi = 0
  while (wi < br.route.length - 1 && br.route[wi].z < b.z + 0.6) wi++
  const wp = br.route[wi]
  let tx = wp.x
  let tz = wp.z
  let go = br.pace

  // plataforma que anda: mira onde ela está; espera ela chegar antes de passar
  if (wp.m !== undefined) {
    const p = C.pads[wp.m]
    const sh = padShift(p, t)
    tx = p.x + sh.dx
    const edge = p.z + sh.dz - p.hz
    const lead = (botRand(br.seed, br.slot * 7 + wp.m, Math.floor(t / 3)) - 0.5) * (1 - br.skill) * 2.5
    if (b.z < edge && edge - b.z < 2.2 && Math.abs(tx + lead - b.x) > 1.4) go = 0
    // em cima de uma que anda: acompanha a de baixo até alinhar
    if (go === 0 && b.pad >= 0 && C.pads[b.pad].mw !== 0) {
      const q = C.pads[b.pad]
      tx = q.x + padShift(q, t).dx
    }
  }

  // portas: na fileira à frente, mira a escolhida; bateu numa falsa, troca
  if (C.doors.length) {
    for (let row = 0; row < C.doorOpen.length; row++) {
      let dz = Infinity
      for (const d of C.doors) if (d.row === row) dz = d.z
      if (b.z > dz + 0.5 || dz - b.z > 7) continue
      if (br.door < 0 || C.doors[br.door].row !== row || br.bad.has(br.door)) br.door = pickDoor(br, b, w, row)
      // a escolhida se revelou falsa (alguém bateu) ou eu estou parado na frente dela
      if (br.door >= 0 && w.doors[br.door] === -2 && !w.open[br.door] && botRand(br.seed, br.slot, row * 5 + br.door) < br.skill + 0.2) {
        br.bad.add(br.door)
        br.door = pickDoor(br, b, w, row)
      }
      if (br.door >= 0) {
        const d = C.doors[br.door]
        tx = d.x
        tz = Math.max(tz, d.z + 1.2)
        if (dz - b.z < 0.9 && Math.abs(b.x - d.x) < d.hw && !w.open[br.door]) {
          br.bad.add(br.door)
          br.door = pickDoor(br, b, w, row)
        }
      }
      break
    }
  }

  // ladrilhos: escolhe o próximo em pé (e não tremendo), perto da reta
  if (C.tiles.length && !b.ground && br.tile >= 0) {
    // no ar: segue mirando o ladrilho escolhido (freia no ar se for passar)
    tx = C.tiles[br.tile].x
    tz = C.tiles[br.tile].z
  } else if (C.tiles.length && b.ground) {
    let near = false
    for (const q of C.tiles) if (Math.abs(q.z - b.z) < 3.2 && Math.abs(q.x - b.x) < 9) near = true
    if (near) {
      const ok = (i: number) => {
        const s = w.tiles[i]
        return tileUp(C, s, t + 0.35) && !(s >= 0 && t - s < 0.8)
      }
      let under = -1
      for (let i = 0; i < C.tiles.length; i++) if (onTile(C.tiles[i], b.x, b.z, 0) && Math.abs(C.tiles[i].y - b.y) < 0.3) under = i
      const cur = br.tile
      const curQ = cur >= 0 ? C.tiles[cur] : null
      if (!curQ || curQ.z < b.z + 0.8 || !ok(cur)) {
        let best = -1
        let bestScore = -Infinity
        for (let i = 0; i < C.tiles.length; i++) {
          const q = C.tiles[i]
          const ahead = q.z - b.z
          if (ahead < 1.2 || ahead > 3.6 || Math.abs(q.x - b.x) > 4.5 || !ok(i)) continue
          const score = -Math.abs(q.x - b.x) - Math.abs(q.x) * 0.15 + botRand(br.seed, br.slot, i) * 0.8
          if (score > bestScore) {
            bestScore = score
            best = i
          }
        }
        // nada firme adiante e estou num ladrilho (que já treme): o firme mais perto, para qualquer lado
        // chão firme (plataforma) logo à frente: segue a rota
        const solid = groundUnder(w, b.x, b.z + 2.4, b.y + 0.5)
        if (best < 0 && solid.pad >= 0 && solid.y > b.y - 0.5) under = -2
        if (best < 0 && under >= 0) {
          let bd = Infinity
          for (let i = 0; i < C.tiles.length; i++) {
            if (i === under || !ok(i)) continue
            const dd = Math.hypot(C.tiles[i].x - b.x, C.tiles[i].z - b.z)
            if (dd < 3.8 && dd < bd) {
              bd = dd
              best = i
            }
          }
        }
        br.tile = best
      }
      if (br.tile >= 0) {
        tx = C.tiles[br.tile].x
        tz = C.tiles[br.tile].z
      } else if (under === -1) {
        // na beira, sem ladrilho firme à frente: espera voltarem
        let ahead = false
        for (const q of C.tiles) if (q.z - b.z > 0.5 && q.z - b.z < 3.2) ahead = true
        if (ahead && botRand(br.seed, br.slot, 900 + Math.floor(t)) < br.skill + 0.25) go = 0
      }
    } else br.tile = -1
  }

  // subida: a faixa mais livre das bolas que vêm
  if (C.ramp && C.balls && b.z > C.ramp.z0 - 2 && b.z < C.ramp.z1 + 0.5) {
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
        if (dx < C.balls.R + 1) score -= (10 - ahead) * (C.balls.R + 1 - dx)
      }
      if (score > bestScore) {
        bestScore = score
        best = gx
      }
    }
    // os menos hábeis demoram a perceber
    if (botRand(br.seed, br.slot, Math.floor(t * 4)) < br.skill) br.laneX = best
    tx = C.ramp.x + br.laneX
  }

  // esteira: corre contra ela (mira um pouco além)
  if (b.pad >= 0) {
    const p = C.pads[b.pad]
    if (p.bx !== 0) tx -= p.bx * 0.35
  }

  let dx = tx - b.x
  let dz = tz - b.z
  const d = Math.hypot(dx, dz) || 1
  dx /= d
  dz /= d
  // desvia das colunas (pilar, frade, caixa) — o cogumelo é chão
  for (const q of C.posts) {
    if (q.b > 0 || q.y1 <= b.y + GINCANA.stepUp || q.y0 > b.y + 1) continue
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
  it.mx = (dx / m) * go
  it.mz = (dz / m) * go
  const vRun = GINCANA.run * Math.max(0.3, br.pace)

  // pêndulo adiante na mesma linha: espera passar (os menos hábeis às vezes vão)
  for (let i = 0; i < C.pendulums.length; i++) {
    const p = C.pendulums[i]
    const ahead = p.z - b.z
    // decide entre 4,6 e 2,4 m (freia em ~0,6 m e fica fora do alcance); mais perto, vai
    if (ahead < 2.4 || ahead > 4.6 || Math.abs(p.x - b.x) > p.len * Math.sin(p.amp) + 2) continue
    const reach = p.R + GINCANA.bodyR + 0.3
    const slope = it.mx / Math.max(0.2, it.mz)
    let near = false
    for (let k = 0; k <= 4; k++) {
      const dz2 = ahead - reach + (2 * reach * k) / 4
      const q = pendulumAt(p, t + dz2 / vRun)
      if (Math.abs(q.x - (b.x + slope * dz2)) < reach) near = true
    }
    if (near && botRand(br.seed, br.slot * 97 + i, Math.floor(t / 2.86)) < br.skill + 0.05) go = 0
  }
  // luva prestes a socar na faixa por onde vai passar: espera
  for (let i = 0; i < C.gloves.length; i++) {
    const g = C.gloves[i]
    const ahead = g.z - b.z
    if (ahead < 1.3 || ahead > 3.4) continue
    // a luva alcança o meu x?
    const tipMax = g.x0 + g.dir * (g.reach + g.R)
    if ((g.dir > 0 && b.x > tipMax + 0.6) || (g.dir < 0 && b.x < tipMax - 0.6)) continue
    const enter = (ahead - 1.6) / vRun
    const leave = (ahead + 1.6) / vRun
    let hot = false
    for (const f of [0, 0.5, 1]) {
      const q = gloveAt(g, t + Math.max(0, enter + (leave - enter) * f))
      if (q.hot || q.u > 0.5) hot = true
    }
    if (hot && botRand(br.seed, br.slot * 89 + i, Math.floor(t / g.period)) < br.skill + 0.1) go = 0
  }
  // bloco que anda cruzando a minha linha logo à frente: espera
  for (let i = 0; i < C.pushers.length; i++) {
    const q = C.pushers[i]
    const ahead = q.z - b.z
    if (ahead < q.hz + 0.5 || ahead > q.hz + 3) continue
    const enter = (ahead - q.hz - 0.6) / vRun
    const leave = (ahead + q.hz + 0.6) / vRun
    let block = false
    for (const f of [0, 0.33, 0.66, 1]) {
      const P = pusherAt(q, t + Math.max(0, enter + (leave - enter) * f))
      if (Math.abs(P.x - b.x) < q.hx + GINCANA.bodyR + 0.5) block = true
    }
    if (block && botRand(br.seed, br.slot * 71 + i, Math.floor((t * q.w) / 3.14)) < br.skill + 0.1) go = 0
  }
  if (go === 0) br.waited += dt
  if (go === 0 && br.waited < 6 + br.skill * 4) {
    it.mx = 0
    it.mz = 0
  } else if (go > 0) br.waited = Math.max(0, br.waited - dt * 0.5)

  // barra chegando: pula na hora (com o erro da habilidade)
  barJump(br, b, w, it)
  // ladrilho tremendo embaixo: pula para o próximo
  if (b.ground && br.jumpCool <= 0) {
    for (let i = 0; i < C.tiles.length; i++) {
      const q = C.tiles[i]
      const s = w.tiles[i]
      if (s < 0 || !onTile(q, b.x, b.z, 0)) continue
      if (t - s > C.tileTime.warn * 0.6 && botRand(br.seed, br.slot, i) < br.skill) {
        it.jump = true
        br.jumpCool = 0.6
      }
    }
  }
  // o chão acaba logo à frente e há chão adiante: pula o buraco
  const sp = Math.hypot(it.mx, it.mz)
  const tileNear = br.tile >= 0 && Math.hypot(C.tiles[br.tile].x - b.x, C.tiles[br.tile].z - b.z) < 2.6
  if (b.ground && br.jumpCool <= 0 && sp > 0.3 && !tileNear) {
    const fx = it.mx / sp
    const fz = it.mz / sp
    const near = groundUnder(w, b.x + fx * 1.0, b.z + fz * 1.0, b.y + 0.5)
    if (near.y < b.y - 0.6 || near.y === -Infinity) {
      let far = false
      for (const k of [2.2, 3.2, 4.2, 5.0]) {
        const g = groundUnder(w, b.x + fx * k, b.z + fz * k, b.y + 1.2)
        if (g.y > b.y - 1.2) far = true
      }
      if (far) {
        it.jump = true
        br.jumpCool = 0.5
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
  if (br.divesFinish && b.ground && b.z > C.finishZ - 7 && b.z < C.finishZ - 4 && Math.abs(b.facing) < 0.3) it.dive = true
  return it
}
