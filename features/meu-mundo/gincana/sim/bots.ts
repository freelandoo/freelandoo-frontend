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

import { GINCANA, ballBelts, logRowAngle, rotorBladeAt, sawTop, drumAt, drumSpeed, gloveAt, hoopX, memCall, memState, memSymbols, memTarget, memTile, onTile, padRot, padShift, padTop, pendulumAt, pusherAt, sweeperAngle, tileUp, wallsAt, type Course, type RoutePoint, type WallWave } from "./course"
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
  /** 20/11: s esperando a pá grossa passar (Moinhos): não corrige de lado nesse tempo. */
  vaneWait?: number
  stuck: number
  /** recuo (s) depois de travar contra outro na frente de uma porta */
  back: number
  lastZ: number
  /** s esperando (pêndulo/luva/bloco/plataforma); passou da paciência, vai assim mesmo. */
  waited: number
  /** Hélice: a pá escolhida para sair do cubo (ângulo no instante fanT); fanT < 0 = nenhuma. */
  fanA: number
  fanT: number
  /** Mergulho para a chegada (só os melhores). */
  divesFinish: boolean
  /** Porta escolhida (−1 = nenhuma) e as falsas que já descobriu. */
  door: number
  bad: Set<number>
  /** Porta que aguenta batidas: recuando para pegar embalo. */
  ram?: boolean
  /** Ladrilho escolhido (−1 = nenhum). */
  tile: number
  /** Crosta: a placa do caminho escondido escolhida (−1 = nenhuma). */
  path: number
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
  return { route, skill, pace: 0.86 + r(7) * 0.14, seed, slot, laneX: 0, jumpCool: 0, stuck: 0, back: 0, lastZ: -99, waited: 0, fanA: 0, fanT: -1, divesFinish: r(8) < skill - 0.35, door: -1, bad: new Set(), tile: -1, path: -1 }
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
  let vx = b.vx + (it.mx * GINCANA.run - b.vx) * 0.5
  let vz = b.vz + (it.mz * GINCANA.run - b.vz) * 0.5
  // 20/11: em cima de disco que gira, o chão também leva (mesma conta de carry em body.ts)
  const own = b.pad >= 0 ? C.pads[b.pad] : null
  if (own && own.spin !== 0) {
    vx += own.spin * (b.z - own.z)
    vz -= own.spin * (b.x - own.x)
  }
  for (let i = 0; i < C.sweepers.length; i++) {
    const s = C.sweepers[i]
    if (Math.hypot(b.x - s.x, b.z - s.z) > s.len + 5) continue
    const high = s.y - s.r - b.y > 0.9
    // 20/11: pá GROSSA (Moinhos): de 0,3 m a mais de 1,6 m do pé — não se pula nem se mergulha
    const wall = s.y - s.r - b.y < GINCANA.lowH && s.y + s.r - b.y > 1.6
    const hitIn = (mvx: number, mvz: number, steps: number) => {
      for (let k = 1; k <= steps; k++) {
        const h = k * 0.02
        const px = b.x + mvx * h - s.x
        const pz = b.z + mvz * h - s.z
        const a = sweeperAngle(s, t + h)
        const dx = Math.sin(a)
        const dz = Math.cos(a)
        const along = Math.max(s.both ? -s.len : 0, Math.min(s.len, px * dx + pz * dz))
        if (Math.abs(along) < 0.9) continue
        if (Math.hypot(px - dx * along, pz - dz * along) < s.r + GINCANA.bodyR + 0.08) return h
      }
      return -1
    }
    if (wall) {
      // espera a pá passar fora do alcance dela; se ela vem mesmo parado, recua (os menos hábeis demoram)
      if (hitIn(vx, vz, 25) < 0) continue
      br.vaneWait = 0.15
      const ex = b.x - s.x
      const ez = b.z - s.z
      const d = Math.hypot(ex, ez) || 1
      // espera FORA do alcance (o chão que tomba leva de lado): dentro dele, recua
      if (d < s.len + s.r + GINCANA.bodyR + 0.35 || hitIn(0, 0, 30) >= 0) {
        it.mx = (ex / d) * br.pace
        it.mz = (ez / d) * br.pace
      } else {
        it.mx = 0
        it.mz = 0
      }
      continue
    }
    const tc = hitIn(vx, vz, 30)
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
/**
 * Hélice (Hélices da Orbital): pás retas (caixas que giram no mesmo centro) + o disco do cubo. Em cima de
 * uma pá, correr "para a frente do mundo" tira o robô da pá que gira: ele vai pelo eixo da pá — para fora se
 * ela aponta para a saída, para o cubo se não — e no cubo espera uma pá chegar na direção da saída.
 */
function fanRide(br: BotBrain, b: Runner, w: RunWorld, it: RunIntent) {
  if (!b.ground || b.pad < 0) return
  const C = w.course
  const p0 = C.pads[b.pad]
  if (!isFanPad(C, p0) || p0.mw !== 0) return
  const cx = p0.x
  const cz = p0.z
  let L = 0
  const arms: number[] = []
  let hubR = 0
  let bladeSpin = p0.spin
  for (const p of C.pads) {
    if (p.spin === 0 || p.x !== cx || p.z !== cz) continue
    if (p.k === 1) {
      bladeSpin = p.spin
      L = Math.max(L, p.hz)
      const a = padRot(p, w.t)
      arms.push(a, a + Math.PI)
    } else hubR = p.r
  }
  if (!arms.length) return
  // o alvo: o primeiro ponto da rota além da hélice
  let tx = 0
  let tz = 0
  let found = false
  for (const q of br.route) {
    if (q.z > b.z && Math.hypot(q.x - cx, q.z - cz) > L + 0.6) {
      tx = q.x
      tz = q.z
      found = true
      break
    }
  }
  if (!found) return
  const want = Math.atan2(tx - cx, tz - cz)
  const diff = (a: number) => {
    let d = (a - want) % (Math.PI * 2)
    if (d > Math.PI) d -= Math.PI * 2
    if (d < -Math.PI) d += Math.PI * 2
    return d
  }
  // 20/11: o miolo gira ao contrário (HELICES.hub) — a previsão é sempre pelo giro das pás
  const spin = bladeSpin
  const rb = Math.hypot(b.x - cx, b.z - cz)
  const go = Math.max(0.6, br.pace)
  // a pá que vai estar na direção da saída quando eu chegar na ponta (o giro anda enquanto eu corro)
  const lead = (L - Math.min(rb, L)) / (GINCANA.run * go)
  let best = Infinity
  let bestA = 0
  for (const a of arms) {
    const d = Math.abs(diff(a + spin * lead))
    if (d < best) {
      best = d
      bestA = a
    }
  }
  if (rb < hubR - 0.4) {
    // já escolhi a pá: sigo com ela (ela gira) até sair do cubo
    if (br.fanT >= 0 && w.t - br.fanT > 1.5) br.fanT = -1
    if (br.fanT < 0 && best < 0.16 && rb < 1.9) {
      br.fanA = bestA
      br.fanT = w.t
    }
    if (br.fanT >= 0) {
      // sai mirando um ponto SOBRE a pá (não paralelo a ela)
      const a = br.fanA + spin * (w.t - br.fanT)
      const px = cx + Math.sin(a) * L * 0.7 - b.x
      const pz = cz + Math.cos(a) * L * 0.7 - b.z
      const m = Math.hypot(px, pz) || 1
      it.mx = (px / m) * go
      it.mz = (pz / m) * go
    } else if (rb > 1.0) {
      // vai para o miolo e espera lá (longe da beira)
      it.mx = ((cx - b.x) / rb) * 0.5
      it.mz = ((cz - b.z) / rb) * 0.5
    } else {
      it.mx = 0
      it.mz = 0
    }
    hubCounter(b, p0, cx, cz, it)
    return
  }
  br.fanT = -1
  // na pá: o eixo da pá onde estou (a direção do centro até mim)
  const out = Math.atan2(b.x - cx, b.z - cz)
  if (Math.abs(diff(out)) < 1.0) {
    it.mx = Math.sin(out) * go
    it.mz = Math.cos(out) * go
  } else {
    it.mx = -Math.sin(out) * go
    it.mz = -Math.cos(out) * go
  }
  hubCounter(b, p0, cx, cz, it)
}

/** 20/11: em cima do miolo (que gira ao contrário e RÁPIDO), anda contra o arrasto dele. */
function hubCounter(b: Runner, p: Course["pads"][number], cx: number, cz: number, it: RunIntent) {
  if (p.k === 1) return
  let mx = it.mx - (p.spin * (b.z - cz)) / GINCANA.run
  let mz = it.mz + (p.spin * (b.x - cx)) / GINCANA.run
  const m = Math.hypot(mx, mz)
  if (m > 1) {
    mx /= m
    mz /= m
  }
  it.mx = mx
  it.mz = mz
}

/** Pulo de/para hélice: o pouso de verdade (o pulo voa ~5 m) existe na hora em que eu chego lá? */
function fanLand(w: RunWorld, b: Runner, fx: number, fz: number) {
  for (const [k, dt] of [[4.4, 0.58], [5.2, 0.7]]) {
    const g = groundUnder({ ...w, t: w.t + dt }, b.x + fx * k, b.z + fz * k, b.y + 1.2)
    if (g.y < b.y - 1.2) return false
  }
  return true
}

/** Peça de hélice: caixa que gira, ou o disco do cubo de uma (mesmo centro). Os discos da Clareira não são. */
function isFanPad(C: Course, p: Course["pads"][number]) {
  if (p.spin === 0) return false
  return C.pads.some((q) => q.k === 1 && q.spin !== 0 && q.x === p.x && q.z === p.z)
}

/** Hélice (caixa que gira) por perto: o salto precisa de hora certa. */
function nearFan(C: Course, x: number, z: number) {
  for (const p of C.pads) if (p.k === 1 && p.spin !== 0 && Math.hypot(p.x - x, p.z - z) < p.hz + 4) return true
  return false
}

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
  // Fábrica em andares: com as engrenagens do andar, vai para o pula-pula; voando, mira o andar de cima
  const FL = C.floors
  const fl = FL ? FL[Math.min(b.cp, FL.length - 1)] : null
  const flUp = !!FL && !!fl && b.cp < FL.length - 1 && b.pts >= fl.goal
  if (FL && fl && (b.cp >= FL.length - 1 || flUp || b.fly > 0 || (!b.ground && b.y > fl.y + 3))) {
    if (b.cp < FL.length - 1 && (b.fly > 0 || (!b.ground && b.y > fl.y + 3))) {
      tx = FL[b.cp + 1].x
      tz = FL[b.cp + 1].z - 5
    } else {
      tx = fl.x
      tz = fl.z
      const d = Math.hypot(fl.x - b.x, fl.z - b.z)
      if (flUp && d < 3.8 && b.y < fl.y + 0.5 && b.ground && br.jumpCool <= 0) {
        it.jump = true
        br.jumpCool = 0.6
      }
    }
  } else if (C.gems.length) {
    let best = -1
    let bestScore = -Infinity
    for (let k = 0; k < C.gems.length; k++) {
      const g = C.gems[k]
      // andares: só as engrenagens do meu andar
      if (fl && Math.abs(g.y - 0.9 - fl.y) > 1.6) continue
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
      tx = fl ? fl.x : 0
      tz = fl ? fl.z : 0
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

/**
 * Crosta da Forja: no tabuleiro do caminho escondido. O computador procura o MENOR caminho até a saída do
 * tabuleiro pelo que se sabe: placa acesa custa 1, desconhecida custa mais (é chute; um pouco diferente para
 * cada um, pela semente), buraco não passa; anda só reto, de lado ou para trás (o caminho nunca faz diagonal).
 * Beco sem saída aparece sozinho. Mira a próxima placa desse caminho e se alinha na coluna antes de avançar;
 * no ar segue a placa escolhida. Devolve o alvo ou null (fora do tabuleiro).
 */
function pathAim(br: BotBrain, b: Runner, w: RunWorld): { x: number; z: number } | null {
  const C = w.course
  if (!C.tiles.length || C.tiles[0].pg < 0) return null
  const state = (i: number) => (w.tiles[i] === -2 ? 2 : w.tiles[i] === -1 ? 1 : 0)
  if (!b.ground) {
    if (br.path >= 0 && state(br.path) > 0) return { x: C.tiles[br.path].x, z: C.tiles[br.path].z }
    return null
  }
  let under = -1
  for (let i = 0; i < C.tiles.length; i++) {
    const q = C.tiles[i]
    if (onTile(q, b.x, b.z, 0.02) && Math.abs(q.y - b.y) < 0.4) under = i
  }
  let g = under >= 0 ? C.tiles[under].pg : -1
  if (g < 0) {
    for (const q of C.tiles) if (q.pr === 0 && q.z - q.h - b.z > -0.2 && q.z - q.h - b.z < 4) g = q.pg
    if (g < 0) return null
  }
  // o tabuleiro g: índice por (fileira, coluna)
  const idx: number[] = []
  let rows = 0
  let cols = 0
  for (let i = 0; i < C.tiles.length; i++) {
    const q = C.tiles[i]
    if (q.pg !== g) continue
    idx.push(i)
    rows = Math.max(rows, q.pr + 1)
    cols = Math.max(cols, q.pc + 1)
  }
  const at = (r: number, c: number) => (r < 0 || r >= rows || c < 0 || c >= cols ? -1 : idx[r * cols + c])
  const enter = (i: number) => (state(i) === 2 ? 1 : 2.2 + botRand(br.seed, br.slot * 31 + i, Math.floor(w.t / 8)) * 1.6)
  // Dijkstra de trás para a frente: custo até sair do tabuleiro (da última fileira, sair custa 0)
  const n = rows * cols
  const cost = new Float64Array(n).fill(Infinity)
  const done = new Uint8Array(n)
  for (let c = 0; c < cols; c++) if (state(at(rows - 1, c)) > 0) cost[(rows - 1) * cols + c] = 0
  for (;;) {
    let k = -1
    for (let j = 0; j < n; j++) if (!done[j] && cost[j] < Infinity && (k < 0 || cost[j] < cost[k])) k = j
    if (k < 0) break
    done[k] = 1
    const r = Math.floor(k / cols)
    const c = k % cols
    // quem vem de (r2, c2) para k paga a entrada em k
    for (const [dr, dc, extra] of [[-1, 0, 0], [0, -1, 0.15], [0, 1, 0.15], [1, 0, 1]] as [number, number, number][]) {
      const r2 = r + dr
      const c2 = c + dc
      const j = at(r2, c2)
      if (j < 0 || state(j) === 0) continue
      const v = cost[k] + enter(idx[k]) + extra
      if (v < cost[r2 * cols + c2]) cost[r2 * cols + c2] = v
    }
  }
  let next = -1
  if (under < 0) {
    // antes do tabuleiro: a placa da 1ª fileira de menor custo (mais o caminho de lado até ela)
    let best = Infinity
    for (let c = 0; c < cols; c++) {
      const i = at(0, c)
      if (state(i) === 0) continue
      const v = cost[c] + enter(i) + Math.abs(C.tiles[i].x - b.x) * 0.12
      if (v < best) {
        best = v
        next = i
      }
    }
    br.path = next
    if (next < 0) return null
    const q = C.tiles[next]
    if (Math.abs(q.x - b.x) > 0.45) return { x: q.x, z: Math.min(b.z + 0.4, q.z - q.h - 0.9) }
    return { x: q.x, z: q.z }
  }
  const u = C.tiles[under]
  if (u.pr === rows - 1) {
    br.path = -1
    return { x: u.x, z: u.z + 4 }
  }
  let best = Infinity
  for (const [dr, dc, extra] of [[1, 0, 0], [0, -1, 0.15], [0, 1, 0.15], [-1, 0, 1]] as [number, number, number][]) {
    const j = at(u.pr + dr, u.pc + dc)
    if (j < 0 || state(j) === 0) continue
    const v = cost[(u.pr + dr) * cols + u.pc + dc] + enter(j) + extra
    if (v < best) {
      best = v
      next = j
    }
  }
  br.path = next
  if (next < 0) return { x: u.x, z: u.z }
  const q = C.tiles[next]
  if (q.pr === u.pr) return { x: q.x, z: u.z }
  if (q.pr < u.pr) return { x: q.x, z: q.z - 0.3 }
  return Math.abs(q.x - b.x) > 0.4 ? { x: q.x, z: b.z } : { x: q.x, z: q.z + 0.3 }
}

/**
 * Descida dos Aros: o aro (ou a janela) logo à frente e alinhado — pula para chegar ao plano dele perto do alto
 * do pulo (0,32 s depois de sair do chão). O erro de tempo vem da habilidade. Aro alto demais (o do cogumelo)
 * não se pula do chão.
 */
function hoopJump(br: BotBrain, b: Runner, w: RunWorld, it: RunIntent) {
  const C = w.course
  if (!C.hoops.length || !b.ground || br.jumpCool > 0) return
  const v = Math.max(4, b.vz)
  for (let i = 0; i < C.hoops.length; i++) {
    const h = C.hoops[i]
    const dz = h.z - b.z
    if (dz <= 0 || dz > 5) continue
    if (h.y - b.y > 3.3) continue
    const tArr = dz / v
    if (Math.abs(hoopX(h, w.t + tArr) - b.x) > h.R * 0.75) continue
    const err = (botRand(br.seed, br.slot * 11 + i, Math.floor(w.t)) - 0.5) * (1 - br.skill) * 0.35
    if (tArr < 0.33 + err) {
      it.jump = true
      br.jumpCool = 0.5
      return
    }
  }
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
/** Ver o uso em botIntent: devolve true quando cuidou da intenção (andar/esperar/pular). */
function spinRide(br: BotBrain, b: Runner, w: RunWorld, it: RunIntent) {
  const C = w.course
  if (!b.ground || b.pad < 0) return false
  const p = C.pads[b.pad]
  if (p.k !== 0 || p.spin === 0 || p.mw !== 0 || Math.abs(p.spin) * p.r <= 4) return false
  // o miolo de hélice (gira rápido desde 20/11) é da fanRide
  if (isFanPad(C, p)) return false
  // o primeiro ponto da rota adiante e FORA desta peça: para onde pular
  let e = null as (typeof br.route)[number] | null
  for (const q of br.route) {
    if (q.z > p.z && Math.hypot(q.x - p.x, q.z - p.z) > p.r + 0.3) {
      e = q
      break
    }
  }
  if (!e) return false
  const ox = b.x - p.x
  const oz = b.z - p.z
  const rho = Math.hypot(ox, oz)
  const aim = Math.atan2(e.z - p.z, e.x - p.x)
  br.stuck = 0
  br.lastZ = b.z
  if (rho < p.r - 1.4) {
    // anda para fora pela reta do centro (se está no miolo, já na direção do pulo)
    const ux = rho > 0.3 ? ox / rho : Math.cos(aim)
    const uz = rho > 0.3 ? oz / rho : Math.sin(aim)
    it.mx = ux * br.pace
    it.mz = uz * br.pace
    return true
  }
  // na beirada: espera o giro trazer para o lado da próxima peça (os menos hábeis erram a hora)
  const diff = Math.atan2(Math.sin(Math.atan2(oz, ox) - aim), Math.cos(Math.atan2(oz, ox) - aim))
  const lead = 0.1 * Math.sign(p.spin)
  const win = 0.18 + (1 - br.skill) * 0.12
  if (Math.abs(diff - lead) < win && br.jumpCool <= 0) {
    const jx = e.x - b.x
    const jz = e.z - b.z
    const jm = Math.hypot(jx, jz) || 1
    it.mx = jx / jm
    it.mz = jz / jm
    it.jump = true
    br.jumpCool = 0.6
  }
  return true
}

/**
 * Comportas (Comportas da Usina): na fileira à frente, escolhe a comporta que vai estar EMBAIXO enquanto
 * eu cruzo (prevê pelo relógio dela); nenhuma: vai para a melhor e espera na frente dela. Já dentro da
 * fileira (entre as paredes) segue a dela. Erro pela habilidade. null = nenhuma fileira perto.
 */
function gateAim(br: BotBrain, b: Runner, w: RunWorld): { x: number; z: number; wait: boolean } | null {
  const C = w.course
  let rowZ = Infinity
  let hz = 0
  for (const p of C.pads) {
    if (p.gh <= 0 || p.z + p.hz - b.z < -0.2 || p.z - p.hz - b.z > 6.5) continue
    if (p.z < rowZ) {
      rowZ = p.z
      hz = p.hz
    }
  }
  if (rowZ === Infinity) return null
  const t = w.t
  const under = b.pad >= 0 ? C.pads[b.pad] : null
  const vRun = GINCANA.run * Math.max(0.3, br.pace) * (under ? under.sl : 1)
  const front = rowZ - hz
  let best = -1
  let bestScore = -Infinity
  for (let i = 0; i < C.pads.length; i++) {
    const p = C.pads[i]
    if (p.gh <= 0 || p.z !== rowZ) continue
    // dentro da fileira: fica na sua
    if (b.z > front - 0.15 && Math.abs(p.x - b.x) <= p.hx) return { x: p.x, z: p.z + hz + 1, wait: false }
    const lat = Math.max(0, Math.abs(p.x - b.x) - 0.3) / GINCANA.run
    const ta = Math.max(0, (front - 0.45 - b.z) / vRun, lat)
    const tl = ta + (2 * hz + 0.9) / vRun
    let free = true
    for (let k = 0; k <= 5 && free; k++) if (padTop(p, p.z, t + ta + ((tl - ta) * k) / 5) > b.y + GINCANA.stepUp - 0.08) free = false
    const score = (free ? 8 : 0) - Math.abs(p.x - b.x) * 0.45 + botRand(br.seed, br.slot * 13 + i, Math.floor((t + p.gph) / p.gp)) * (2.6 - br.skill * 2.4)
    if (score > bestScore) {
      bestScore = score
      best = i
    }
  }
  if (best < 0) return null
  const p = C.pads[best]
  const ta = Math.max(0, (front - 0.45 - b.z) / vRun)
  let open = true
  for (let k = 0; k <= 5 && open; k++) if (padTop(p, p.z, t + ta + ((2 * hz + 0.9) / vRun) * (k / 5)) > b.y + GINCANA.stepUp - 0.08) open = false
  // fechada para quando eu chegar: espera um passo antes da frente, já alinhado
  if (!open) return { x: p.x, z: front - 1.1, wait: true }
  return { x: p.x, z: p.z + hz + 1, wait: false }
}

export function botIntent(br: BotBrain, b: Runner, w: RunWorld, dt = GINCANA.step): RunIntent {
  const C = w.course
  const it: RunIntent = { mx: 0, mz: 0, jump: false, dive: false, grab: false }
  br.jumpCool = Math.max(0, br.jumpCool - dt)
  br.vaneWait = Math.max(0, (br.vaneWait ?? 0) - dt)
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
        } else if (C.doorHits > 1 && w.open[br.door] && w.doors[br.door] < 0) {
          // a de verdade ainda inteira: encostou, recua uns 2 m e vem correndo de novo
          if (dz - b.z < 0.8 && Math.abs(b.x - d.x) < d.hw) br.ram = true
          if (br.ram) {
            tz = d.z - 2.6
            if (d.z - b.z > 2.1) br.ram = false
          }
        }
      }
      break
    }
  }

  // comportas: mira a que vai estar embaixo quando eu passar (ou espera alinhado na frente)
  const ga = gateAim(br, b, w)
  if (ga) {
    tx = ga.x
    tz = ga.z
    if (ga.wait && Math.abs(b.x - ga.x) < 0.5 && b.z > ga.z - 0.6) go = 0
  }

  // Crosta: o caminho escondido
  const pa = pathAim(br, b, w)
  if (pa) {
    tx = pa.x
    tz = pa.z
  }

  // ladrilhos: escolhe o próximo em pé (e não tremendo), perto da reta
  if (pa) {
    br.tile = -1
  } else if (C.tiles.length && !b.ground && br.tile >= 0) {
    // no ar: segue mirando o ladrilho escolhido (freia no ar se for passar)
    tx = C.tiles[br.tile].x
    tz = C.tiles[br.tile].z
  } else if (C.tiles.length && b.ground) {
    let near = false
    for (const q of C.tiles) if (Math.abs(q.z - b.z) < 3.2 && Math.abs(q.x - b.x) < 9) near = true
    if (near) {
      const ok = (i: number) => {
        const s = w.tiles[i]
        // 20/11 Hélices (corredor que cai, corrida): placa já pisada serve se ainda aguenta a travessia
        if (C.id === "helices") return tileUp(C, s, t + 0.7) && (s < 0 || t - s < C.tileTime.warn)
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
  const belt = C.ramp && C.balls ? ballBelts(C).find((R) => b.z > R.z0 - 2 && b.z < R.z1 + 0.5) : undefined
  if (belt && C.balls) {
    const gl = belt.hx - 1.6
    const gaps = [-gl, (-gl * 29) / 54, 0, (gl * 29) / 54, gl]
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
    tx = belt.x + br.laneX
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
    if (ahead < 2.4 || ahead > 4.6 || Math.abs(p.x - b.x) > p.len * Math.sin(p.amp) + 2 + (p.tx ?? 0)) continue
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
  // luva prestes a socar na faixa por onde vai passar: espera (em cima de esteira de lado não dá para esperar: ela leva
  // para fora — Feira, 20/11)
  const onSideBelt = b.ground && b.pad >= 0 && C.pads[b.pad].bx !== 0
  for (let i = 0; i < C.gloves.length && !onSideBelt; i++) {
    const g = C.gloves[i]
    const ahead = g.z - b.z
    if (ahead < 1.3 || ahead > 3.4) continue
    // a luva alcança o meu x?
    const tipMax = g.x0 + g.dir * (g.reach + g.R)
    if ((g.dir > 0 && b.x > tipMax + 0.6) || (g.dir < 0 && b.x < tipMax - 0.6)) continue
    const enter = (ahead - 1.6) / vRun
    const leave = (ahead + 1.6) / vRun
    let hot = false
    // pistão de curso longo (Tanque, 20/11: atravessa a rampa toda): vale onde a cabeça ESTARÁ, também voltando
    const long = g.reach > 5
    for (const f of long ? [0, 0.25, 0.5, 0.75, 1] : [0, 0.5, 1]) {
      const q = gloveAt(g, t + Math.max(0, enter + (leave - enter) * f))
      if (long ? q.e > 0.02 && Math.abs(q.x - b.x) < g.R + GINCANA.bodyR + 0.5 : q.hot || q.u > 0.5) hot = true
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
  // Serraria: tora adiante — espera a fileira de cravos passar por baixo antes de subir (a que desce pela frente
  // derruba quem está encostado; a que vem por cima pega quem está no topo)
  for (let i = 0; i < C.logs.length; i++) {
    const L = C.logs[i]
    const ahead = L.z - L.R - b.z
    if (ahead < 0.1 || ahead > 2.6 || Math.abs(b.x - L.x) > L.hx) continue
    const arrive = ahead / vRun + 0.25
    let bad = false
    for (let k = 0; k < L.rows; k++) {
      for (const dtk of [arrive - 0.15, arrive, arrive + 0.25]) {
        let a = logRowAngle(L, k, t + dtk) % (Math.PI * 2)
        if (a > Math.PI) a -= Math.PI * 2
        if (a < -Math.PI) a += Math.PI * 2
        // de pouco atrás do topo até a frente: é por onde o corpo passa
        if (a < 0.55 && a > -1.45) bad = true
      }
    }
    if (bad && botRand(br.seed, br.slot * 53 + i, Math.floor(t * 0.7)) < br.skill + 0.15) go = 0
  }
  // Quebra-Gelo: hélice em pé adiante — só entra se nenhuma pá passar pelo corpo enquanto atravessa
  for (let i = 0; i < C.rotors.length; i++) {
    const q = C.rotors[i]
    const ahead = q.z - q.hz - b.z
    if (ahead < 0.05 || ahead > 2.4 || Math.abs(b.x - q.x) > q.L + 0.5) continue
    const arrive = ahead / vRun
    const leave = arrive + (q.hz * 2 + GINCANA.bodyR * 2 + 0.3) / vRun
    let bad = false
    for (let f = 0; f <= 1.001 && !bad; f += 0.2) {
      const tt = t + arrive - 0.1 + (leave - arrive + 0.25) * f
      for (const hy of [0.5, 1.3]) if (rotorBladeAt(q, b.x, b.y + hy, tt, GINCANA.bodyR + 0.2) >= 0) bad = true
    }
    if (bad && botRand(br.seed, br.slot * 67 + i, Math.floor(t * 0.8)) < br.skill + 0.15) go = 0
  }
  if (go === 0) br.waited += dt
  if (go === 0 && br.waited < 6 + br.skill * 4) {
    it.mx = 0
    it.mz = 0
  } else if (go > 0) br.waited = Math.max(0, br.waited - dt * 0.5)

  // disco que gira FORTE embaixo (borda > 4 m/s, a Clareira): não dá para segurar a beirada correndo.
  // Vai até perto da borda, deixa o giro levar e pula quando ele traz para o lado da próxima peça
  // (no ar o giro não carrega). Funciona em qualquer velocidade de giro.
  if (spinRide(br, b, w, it)) {
    // 20/11: a raiz/barra que gira por cima do disco (Floresta) também se pula aqui
    barJump(br, b, w, it)
    return it
  }
  // em cima de uma hélice: pá → cubo → espera uma pá apontar para a saída → corre por ela
  fanRide(br, b, w, it)
  // barra chegando: pula na hora (com o erro da habilidade)
  barJump(br, b, w, it)
  // Gangorras: a ponta da gangorra adiante subiu acima do passo — pula para subir nela
  if (b.ground && br.jumpCool <= 0) {
    for (let i = 0; i < C.saws.length; i++) {
      const S = C.saws[i]
      if (S.ax !== 0) continue
      const ahead = S.z - S.hz - b.z
      if (ahead < 0.1 || ahead > 1.3 || Math.abs(b.x - S.x) > S.hx + 0.1) continue
      if (sawTop(S, w.saw[i * 2], b.x, S.z - S.hz) < b.y + GINCANA.stepUp) continue
      it.jump = true
      br.jumpCool = 0.5
    }
  }
  // em cima da gangorra de lado inclinada: corre contra o escorregão, para o lado que sobe
  for (let i = 0; i < C.saws.length; i++) {
    const S = C.saws[i]
    if (S.ax !== 1 || !b.ground || (br.vaneWait ?? 0) > 0 || Math.abs(b.x - S.x) > S.hx || Math.abs(b.z - S.z) > S.hz) continue
    const a = w.saw[i * 2]
    const off = b.x - S.x
    if (Math.abs(a) > 0.06 && Math.sign(off) === Math.sign(a) && Math.abs(off) > 0.5) it.mx -= Math.sign(a) * Math.min(1, br.skill + 0.3)
  }
  // Tubos de Gelo (20/11): em cima do tubo, corre contra o giro (o chão leva de lado) puxando para o alto,
  // e pula o buraco que chega no pé
  if (b.drum >= 0 && C.id === "gelo") {
    const d = C.drums[b.drum]
    const g = drumAt(d, b.x, b.z, t)
    if (g) {
      const v = drumSpeed(d.rings[g.ring], t) * (g.top - d.y)
      it.mx += (-v / GINCANA.run) * (0.8 + br.skill * 0.5) - (b.x - d.x) * 0.3
      const m = Math.hypot(it.mx, it.mz)
      if (m > 1) {
        it.mx /= m
        it.mz /= m
      }
    }
    const end = d.z0 + d.rings.reduce((acc, r) => acc + r.len, 0)
    // ponta do tubo: pula para o próximo (o vão é de 2 m)
    if (b.ground && br.jumpCool <= 0 && b.z > end - 0.3 - (1 - br.skill) * 0.35 && it.mz > 0.3) {
      it.jump = true
      br.jumpCool = 0.6
    } else if (b.ground && br.jumpCool <= 0 && b.z < end - 1.2 && !drumAt(d, b.x, b.z, t + 0.15) && botRand(br.seed, br.slot, Math.floor(t * 4)) < br.skill + 0.25) {
      // buraco chegando no pé (no meio do tubo)
      it.jump = true
      br.jumpCool = 0.6
    }
  }
  // aro à frente (e a janela do paredão): pula para cruzar no alto do pulo
  hoopJump(br, b, w, it)
  // Serraria: tora atravessada logo à frente — pula para subir nela (a parede de baixo não deixa passar)
  if (b.ground && br.jumpCool <= 0) {
    for (const L of C.logs) {
      const ahead = L.z - L.R - b.z
      if (ahead < 0.15 || ahead > 1.15 || Math.abs(b.x - L.x) > L.hx + 0.2 || L.y + L.R < b.y + 0.5) continue
      it.jump = true
      br.jumpCool = 0.5
    }
  }
  // ladrilho tremendo embaixo: pula para o próximo (nas Hélices não: o corredor tem as barras — anda)
  if (b.ground && br.jumpCool <= 0 && C.id !== "helices") {
    for (let i = 0; i < C.tiles.length; i++) {
      const q = C.tiles[i]
      const s = w.tiles[i]
      if (s < 0 || q.pg >= 0 || !onTile(q, b.x, b.z, 0)) continue
      if (t - s > C.tileTime.warn * 0.6 && botRand(br.seed, br.slot, i) < br.skill) {
        it.jump = true
        br.jumpCool = 0.6
      }
    }
  }
  // o chão acaba logo à frente e há chão adiante: pula o buraco
  const sp = Math.hypot(it.mx, it.mz)
  const tileNear =
    (br.tile >= 0 && Math.hypot(C.tiles[br.tile].x - b.x, C.tiles[br.tile].z - b.z) < 2.6) ||
    (br.path >= 0 && Math.hypot(C.tiles[br.path].x - b.x, C.tiles[br.path].z - b.z) < 3.4)
  // (nos Tubos de Gelo quem decide o pulo da ponta é a regra do tubo, mais perto da beira)
  if (b.ground && br.jumpCool <= 0 && sp > 0.3 && !tileNear && !(C.id === "gelo" && b.drum >= 0)) {
    const fx = it.mx / sp
    const fz = it.mz / sp
    const onFan = b.pad >= 0 && isFanPad(C, C.pads[b.pad])
    if (!onFan && nearFan(C, b.x, b.z)) {
      // hélice adiante, eu em chão parado: na beira, só sai com pouso garantido NO TEMPO do pouso (e longe
      // da ponta da pá); senão espera. O chão "de agora" 1 m à frente pode ser uma pá que já vai embora.
      const own = groundUnder(w, b.x + fx * 1.1, b.z + fz * 1.1, b.y + 0.5)
      if (own.pad < 0 || C.pads[own.pad].spin !== 0) {
        if (fanLand(w, b, fx, fz)) {
          it.jump = true
          br.jumpCool = 0.5
        } else {
          it.mx = 0
          it.mz = 0
        }
      }
    } else {
    const near = groundUnder(w, b.x + fx * 1.0, b.z + fz * 1.0, b.y + 0.5)
    if (near.y < b.y - 0.6 || near.y === -Infinity) {
      const fan = onFan
      let far = false
      if (fan) far = fanLand(w, b, fx, fz)
      else {
        for (const k of [2.2, 3.2, 4.2, 5.0]) {
          const g = groundUnder(w, b.x + fx * k, b.z + fz * k, b.y + 1.2)
          if (g.y > b.y - 1.2) far = true
        }
      }
      if (far) {
        it.jump = true
        br.jumpCool = 0.5
      } else if (fan) {
        it.mx = 0
        it.mz = 0
      }
    }
    }
  }
  // preso (parado sem esperar nada): pula; encostado numa fileira de portas, recua um passo (dois robôs que
  // cruzam um na frente do outro junto da parede de portas se travam de lado)
  if (br.back > 0) {
    br.back -= dt
    it.mz = -0.8
    it.mx = it.mx >= 0 ? 0.6 : -0.6
    return it
  }
  if (Math.abs(b.z - br.lastZ) > 0.6) {
    br.lastZ = b.z
    br.stuck = 0
  } else if (go > 0) {
    br.stuck += dt
    if (br.stuck > 1.4 && b.ground && br.door >= 0 && C.doors[br.door].z - b.z < 1.5) {
      br.back = 0.45 + botRand(br.seed, br.slot, Math.floor(t * 4)) * 0.3
      br.stuck = 0
    } else if (br.stuck > 2.2 && b.ground && !(b.pad >= 0 && isFanPad(C, C.pads[b.pad]))) {
      // (no miolo da hélice, parado é esperar a pá — pular dali é cair)
      it.jump = true
      br.stuck = 0
    }
  }
  // Coroa da Torre: pula na hora de pegar a coroa (a linha fica no alto); nada de mergulho
  if (C.crown) {
    if (b.ground && b.z > C.finishZ - 1.7 && b.z < C.finishZ - 0.3 && br.jumpCool <= 0) {
      it.jump = true
      br.jumpCool = 0.5
    }
    return it
  }
  // reta final: os melhores mergulham para a linha
  if (br.divesFinish && b.ground && b.z > C.finishZ - 7 && b.z < C.finishZ - 4 && Math.abs(b.facing) < 0.3) it.dive = true
  return it
}
