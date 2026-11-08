// features/meu-mundo/paint/sim/morkhan.ts — PAINT, B11 (cronograma 2026-11):
// o MORKHAN, o Sem-Nome, persegue quem completa os 20 gatinhos do time.
//
// Regra única: o navegador (treino) e a sala (src/utils/meuMundoPaint.js,
// GERADO por scripts/build-paint-sim.js) rodam este mesmo código; a partida
// (`match.ts`) decide quando ele surge e quando some.
//
// Como anda: segue o RASTRO de quem ele caça — os pontos em que a pessoa
// pisou (`morkhanTrailAdd`, um a cada `trailStep` m). Entre dois pontos
// colados ele anda; onde a pessoa saltou (vão, cama elástica, degrau alto)
// ele salta também, no mesmo lugar. Por isso nunca atravessa o vazio: só
// passa onde ela passou. Corta caminho só por chão contínuo (`morkhanFlat`).
// Corre a 90% da corrida e arranca de tempos em tempos; perto dela, golpeia
// (empurrão do muro, sem dano — quem está na borda voa da ilha).

import { TUNING } from "./tuning"
import { supportAt } from "./collide"
import type { Solid, Vec3 } from "./map"

export type MorkhanAct = "gone" | "rise" | "run" | "dash" | "wait" | "leap" | "strike"

export interface MorkhanLeap {
  x0: number
  y0: number
  z0: number
  x1: number
  y1: number
  z1: number
  dur: number
}

export interface MorkhanState {
  /** Time de quem ele caça (cada time tem o seu). */
  team: number
  /** Vaga de quem ele caça (-1 = sumido). */
  target: number
  x: number
  y: number
  z: number
  facing: number
  act: MorkhanAct
  /** s de partida em que o ato começou. */
  at: number
  nextDash: number
  dashUntil: number
  nextStrike: number
  struck: boolean
  leap: MorkhanLeap | null
  /** Pontos do rastro ainda por visitar (o primeiro é o próximo). */
  path: Vec3[]
}

export interface MorkhanTarget {
  x: number
  y: number
  z: number
  ground: boolean
}

export function newMorkhan(team: number): MorkhanState {
  return { team, target: -1, x: 0, y: 0, z: 0, facing: 0, act: "gone", at: 0, nextDash: 0, dashUntil: 0, nextStrike: 0, struck: false, leap: null, path: [] }
}

export function morkhanActive(s: MorkhanState) {
  return s.act !== "gone" && s.target >= 0
}

/** Anota o ponto no rastro se a pessoa pisou e andou o bastante. true = entrou. */
export function morkhanTrailAdd(trail: Vec3[], x: number, y: number, z: number): boolean {
  const M = TUNING.morkhan
  const last = trail[trail.length - 1]
  if (last && Math.hypot(x - last.x, z - last.z) < M.trailStep && Math.abs(y - last.y) < M.walkRise) return false
  trail.push({ x, y, z })
  if (trail.length > M.trailKeep) trail.splice(0, trail.length - M.trailKeep)
  return true
}

/** Ângulo de `a` para `b` no plano. */
function morkhanYaw(ax: number, az: number, bx: number, bz: number, keep: number) {
  return Math.hypot(bx - ax, bz - az) > 0.05 ? Math.atan2(bx - ax, bz - az) : keep
}

/**
 * Chão contínuo de `a` até `b` (cortar caminho sem cair): mesma altura (até
 * `walkRise`) e apoio a cada 0,8 m. Não vale para a tinta da ponte que já
 * sumiu: quem passou por ela fica no rastro, e o rastro ele segue.
 */
export function morkhanFlat(solids: readonly Solid[], a: Vec3, b: Vec3) {
  const M = TUNING.morkhan
  if (Math.abs(b.y - a.y) > M.walkRise) return false
  const d = Math.hypot(b.x - a.x, b.z - a.z)
  const n = Math.max(1, Math.ceil(d / 0.8))
  const top = Math.max(a.y, b.y) + M.walkRise
  const low = Math.min(a.y, b.y) - M.walkRise
  for (let i = 1; i <= n; i++) {
    const u = i / n
    const g = supportAt(solids, a.x + (b.x - a.x) * u, a.z + (b.z - a.z) * u, top, 0)
    if (g < low) return false
  }
  return true
}

/**
 * Surge `behind` m de rastro atrás de quem caça (ou no começo do rastro que
 * houver). O resto do rastro vira o caminho dele.
 */
export function morkhanSpawn(s: MorkhanState, slot: number, trail: readonly Vec3[], tgt: Vec3, time: number) {
  const M = TUNING.morkhan
  let i = trail.length - 1
  let walked = 0
  let px = tgt.x
  let pz = tgt.z
  while (i > 0 && walked < M.behind) {
    walked += Math.hypot(trail[i].x - px, trail[i].z - pz)
    px = trail[i].x
    pz = trail[i].z
    i--
  }
  const at = trail.length ? trail[Math.max(0, i)] : tgt
  s.target = slot
  s.x = at.x
  s.y = at.y
  s.z = at.z
  s.facing = morkhanYaw(at.x, at.z, tgt.x, tgt.z, 0)
  s.act = "rise"
  s.at = time
  s.nextDash = time + M.rise + M.dashEvery
  s.dashUntil = 0
  s.nextStrike = time + M.rise
  s.struck = false
  s.leap = null
  s.path = trail.slice(Math.max(0, i) + 1).map((p) => ({ x: p.x, y: p.y, z: p.z }))
}

export function morkhanVanish(s: MorkhanState) {
  s.target = -1
  s.act = "gone"
  s.leap = null
  s.path = []
}

function morkhanSet(s: MorkhanState, act: MorkhanAct, time: number) {
  if (s.act === act) return
  s.act = act
  s.at = time
}

/** Corta caminho: pula pontos do rastro que dá para alcançar por chão contínuo. */
function morkhanPull(s: MorkhanState, solids: readonly Solid[]) {
  const cur = { x: s.x, y: s.y, z: s.z }
  for (let j = Math.min(s.path.length - 1, 10); j >= 1; j--) {
    const p = s.path[j]
    if (Math.hypot(p.x - cur.x, p.z - cur.z) > 8) continue
    if (morkhanFlat(solids, cur, p)) {
      s.path.splice(0, j)
      return
    }
  }
}

/**
 * Um passo do Morkhan. Devolve a direção do golpe quando ele acerta (a
 * partida empurra a pessoa) — `null` no resto do tempo.
 */
export function morkhanStep(s: MorkhanState, tgt: MorkhanTarget, solids: readonly Solid[], dt: number, time: number): { ux: number; uz: number } | null {
  const M = TUNING.morkhan
  if (!morkhanActive(s)) return null
  if (s.act === "rise") {
    s.facing = morkhanYaw(s.x, s.z, tgt.x, tgt.z, s.facing)
    if (time - s.at < M.rise) return null
    morkhanSet(s, "run", time)
  }
  if (s.act === "leap" && s.leap) {
    const L = s.leap
    const u = Math.min(1, (time - s.at) / L.dur)
    s.x = L.x0 + (L.x1 - L.x0) * u
    s.z = L.z0 + (L.z1 - L.z0) * u
    s.y = L.y0 + (L.y1 - L.y0) * u + 4 * (M.leapLift + Math.abs(L.y1 - L.y0) * 0.25) * u * (1 - u)
    if (u < 1) return null
    s.leap = null
    s.y = L.y1
    morkhanSet(s, "run", time)
  }
  const dx = tgt.x - s.x
  const dz = tgt.z - s.z
  const dh = Math.hypot(dx, dz)
  const dy = tgt.y - s.y
  if (s.act === "strike") {
    s.facing = morkhanYaw(s.x, s.z, tgt.x, tgt.z, s.facing)
    const since = time - s.at
    let hit: { ux: number; uz: number } | null = null
    if (!s.struck && since >= M.hit) {
      s.struck = true
      if (dh <= M.hitReach && dy > -1.2 && dy < 2.2) hit = dh > 0.05 ? { ux: dx / dh, uz: dz / dh } : { ux: Math.sin(s.facing), uz: Math.cos(s.facing) }
    }
    if (since >= M.dur) {
      s.nextStrike = time + M.rest
      morkhanSet(s, "run", time)
    }
    return hit
  }
  // perto o bastante: golpe
  if (time >= s.nextStrike && dh <= M.reach && dy > -1.2 && dy < 1.8) {
    s.facing = morkhanYaw(s.x, s.z, tgt.x, tgt.z, s.facing)
    s.struck = false
    s.act = "strike"
    s.at = time
    return null
  }
  // arrancada de tempos em tempos
  if (time >= s.nextDash) {
    s.dashUntil = time + M.dashDur
    s.nextDash = time + M.dashEvery
  }
  const dashing = time < s.dashUntil
  let budget = M.speed * (dashing ? M.dashK : 1) * dt
  let moved = false
  for (let guard = 0; guard < 24 && budget > 1e-4; guard++) {
    const fromPath = s.path.length > 0
    // sem rastro por visitar: vai direto até ela, só se ela está no chão ali do lado
    const wp: Vec3 | null = fromPath ? s.path[0] : tgt.ground ? { x: tgt.x, y: tgt.y, z: tgt.z } : null
    if (!wp) break
    const wx = wp.x - s.x
    const wz = wp.z - s.z
    const d = Math.hypot(wx, wz)
    // até ela: para na distância do golpe
    const stop = fromPath ? 0 : M.reach * 0.7
    if (d <= stop + 1e-3) {
      if (fromPath) s.path.shift()
      else break
      continue
    }
    const near = d <= M.walkGap && Math.abs(wp.y - s.y) <= M.walkRise
    if (near || morkhanFlat(solids, { x: s.x, y: s.y, z: s.z }, wp)) {
      const step = Math.min(budget, d - stop)
      s.facing = morkhanYaw(s.x, s.z, wp.x, wp.z, s.facing)
      const u = step / d
      s.x += wx * u
      s.z += wz * u
      s.y += (wp.y - s.y) * Math.min(1, step / Math.max(1e-3, d - stop))
      budget -= step
      moved = true
      if (step >= d - stop - 1e-3) {
        if (!fromPath) break
        s.y = wp.y
        s.path.shift()
        morkhanPull(s, solids)
      }
      continue
    }
    if (!fromPath) break // ela está num lugar sem chão contínuo até ele: espera o rastro
    // salto: onde ela saltou
    s.path.shift()
    s.facing = morkhanYaw(s.x, s.z, wp.x, wp.z, s.facing)
    s.leap = { x0: s.x, y0: s.y, z0: s.z, x1: wp.x, y1: wp.y, z1: wp.z, dur: Math.max(0.4, d / M.leapV + Math.max(0, wp.y - s.y) * 0.08) }
    s.act = "leap"
    s.at = time
    return null
  }
  morkhanSet(s, moved ? (dashing ? "dash" : "run") : "wait", time)
  return null
}
