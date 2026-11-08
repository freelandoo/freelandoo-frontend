// features/meu-mundo/laminas/sim/replay.ts — mm3d-59: a luta que o SERVIDOR confere.
//
// O aparelho joga com a semente do ticket e grava a entrada de cada passo
// (1/60 s) já QUANTIZADA — a luta do aparelho também passa pela quantização,
// então o servidor, re-simulando a mesma lista, chega ao mesmo resultado.
// Gravação em blocos [repetições, mx, mz, botões]; os botões são bits.
//
// O back roda este arquivo GERADO junto com fight.ts (scripts/build-fight-sim.js).

import { DT, Fight, type FightSetup, type Input } from "./fight"

/** Bits dos botões. */
const BTN_RUN = 1
const BTN_ATTACK = 2
const BTN_DODGE = 4
const BTN_POWER = 8
/** 2026-11-03: as habilidades (Corte Mágico, Investida, Escudo). */
const BTN_SLASH = 16
const BTN_DASH = 32
const BTN_SHIELD = 64
/** mm3d-72: Desistir. */
const BTN_QUIT = 128
const BTN_ALL = 255

/** Um bloco: [quantos passos, mx (−127…127), mz (−127…127), botões]. */
export type FightFrames = [number, number, number, number][]

/** Passos no máximo numa luta conferida (6 min). */
export const REPLAY_MAX_STEPS = 6 * 60 * 60
/** Sem nenhum toque por mais que isto, o tempo não conta como ativo (s). */
export const REPLAY_IDLE_S = 3

const q127 = (v: number) => Math.max(-127, Math.min(127, Math.round((Number(v) || 0) * 127)))

/** A entrada como o servidor vai ver: direção em 1/127 e botões. */
export function quantizeInput(inp: Input): Input {
  const mx = q127(inp.mx) / 127
  const mz = q127(inp.mz) / 127
  return { mx, mz, run: !!inp.run, attack: !!inp.attack, dodge: !!inp.dodge, power: !!inp.power, slash: !!inp.slash, dash: !!inp.dash, shield: !!inp.shield, quit: !!inp.quit }
}

/** Grava um passo (já quantizado) no fim da lista. */
export function pushFrame(frames: FightFrames, inp: Input) {
  const mx = q127(inp.mx)
  const mz = q127(inp.mz)
  const b =
    (inp.run ? BTN_RUN : 0) |
    (inp.attack ? BTN_ATTACK : 0) |
    (inp.dodge ? BTN_DODGE : 0) |
    (inp.power ? BTN_POWER : 0) |
    (inp.slash ? BTN_SLASH : 0) |
    (inp.dash ? BTN_DASH : 0) |
    (inp.shield ? BTN_SHIELD : 0) |
    (inp.quit ? BTN_QUIT : 0)
  const last = frames[frames.length - 1]
  if (last && last[1] === mx && last[2] === mz && last[3] === b && last[0] < 65535) last[0]++
  else frames.push([1, mx, mz, b])
}

export interface ReplayResult {
  ok: boolean
  /** Por que não deu para conferir. */
  reason?: "frames" | "long" | "open"
  win: boolean
  steps: number
  /** Passos com a pessoa jogando de verdade (mexeu algo nos últimos REPLAY_IDLE_S). */
  activeSteps: number
  hits: number
  hitsTaken: number
  /** Vida dos inimigos no fim (0–1, todos juntos). */
  mobHpLeft: number
}

/** Re-simula uma luta inteira. A luta tem que TERMINAR dentro da gravação. */
export function replayFight(setup: FightSetup, frames: unknown): ReplayResult {
  const fail = (reason: ReplayResult["reason"]): ReplayResult => ({ ok: false, reason, win: false, steps: 0, activeSteps: 0, hits: 0, hitsTaken: 0, mobHpLeft: 1 })
  if (!Array.isArray(frames) || frames.length > 40000) return fail("frames")
  let total = 0
  for (const f of frames) {
    if (!Array.isArray(f) || f.length !== 4) return fail("frames")
    const [n, mx, mz, b] = f as number[]
    if (!Number.isInteger(n) || n < 1 || n > 65535 || !Number.isInteger(mx) || !Number.isInteger(mz) || !Number.isInteger(b)) return fail("frames")
    if (Math.abs(mx) > 127 || Math.abs(mz) > 127 || b < 0 || b > BTN_ALL) return fail("frames")
    total += n
  }
  if (total > REPLAY_MAX_STEPS) return fail("long")
  const fight = new Fight(setup)
  const idleSteps = Math.round(REPLAY_IDLE_S / DT)
  let lastTouch = -Infinity
  let prev = -1
  let steps = 0
  let activeSteps = 0
  let hits = 0
  let hitsTaken = 0
  for (const [n, mx, mz, b] of frames as number[][]) {
    const inp: Input = { mx: mx / 127, mz: mz / 127, run: !!(b & BTN_RUN), attack: !!(b & BTN_ATTACK), dodge: !!(b & BTN_DODGE), power: !!(b & BTN_POWER), slash: !!(b & BTN_SLASH), dash: !!(b & BTN_DASH), shield: !!(b & BTN_SHIELD), quit: !!(b & BTN_QUIT) }
    const sig = (mx & 0xff) | ((mz & 0xff) << 8) | (b << 16)
    for (let i = 0; i < n; i++) {
      if (fight.over) break
      // toque = mudou a entrada ou está segurando direção/botão
      if (sig !== prev || mx !== 0 || mz !== 0 || b !== 0) lastTouch = steps
      prev = sig
      fight.step(inp)
      for (const e of fight.events) {
        if (e.t === "hit" && e.on === "mob") hits++
        if (e.t === "hit" && e.on === "me") hitsTaken++
      }
      if (steps - lastTouch <= idleSteps) activeSteps++
      steps++
    }
    if (fight.over) break
  }
  if (!fight.over) return { ...fail("open"), steps, activeSteps }
  const hpMax = fight.mobs.reduce((a, m) => a + m.hpMax, 0) || 1
  const left = fight.mobs.reduce((a, m) => a + Math.max(0, m.hp), 0)
  return { ok: true, win: fight.over.win, steps, activeSteps, hits, hitsTaken, mobHpLeft: left / hpMax }
}
