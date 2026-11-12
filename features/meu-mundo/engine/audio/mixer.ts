// features/meu-mundo/engine/audio/mixer.ts — o som do Meu Mundo num contexto só (áudio S1, 2026-11-11).
//
// Antes: cada minijogo abria o próprio AudioContext e o fechava no fim. Agora há UM contexto para
// o jogo inteiro, que nunca fecha, e quatro canais (buses) com volume próprio:
//   música · ambiente · efeitos (luta, minijogos, passos) · interface
// todos → master → limitador → alto-falante. Quem toca som pede `audioBus("sfx")` e liga nele.
//
// Navegador: o áudio só solta depois de um toque/tecla — `unlockAudio()` roda sozinho no primeiro
// gesto da página. Aba escondida = contexto suspenso; voltou = retoma.
// Preferências (volume por canal, mudo) no localStorage `mm_audio_v1` (só conforto de quem joga).

export type Bus = "music" | "ambience" | "sfx" | "ui"
export const BUSES: Bus[] = ["music", "ambience", "sfx", "ui"]

export interface AudioPrefs {
  master: number
  music: number
  ambience: number
  sfx: number
  ui: number
  muted: boolean
}

const KEY = "mm_audio_v1"
const DEFAULTS: AudioPrefs = { master: 0.9, music: 0.55, ambience: 0.6, sfx: 0.9, ui: 0.7, muted: false }

let ctx: AudioContext | null = null
let master: GainNode | null = null
const buses = new Map<Bus, GainNode>()
let prefs: AudioPrefs | null = null
let unlocked = false
let wired = false
const listeners = new Set<(p: AudioPrefs) => void>()

function readPrefs(): AudioPrefs {
  if (prefs) return prefs
  let p = { ...DEFAULTS }
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) p = { ...p, ...JSON.parse(raw) }
  } catch {
    /* sem armazenamento: padrão */
  }
  prefs = p
  return p
}

function apply() {
  if (!ctx || !master) return
  const p = readPrefs()
  const t = ctx.currentTime
  master.gain.setTargetAtTime(p.muted ? 0 : p.master, t, 0.03)
  for (const b of BUSES) buses.get(b)?.gain.setTargetAtTime(p[b], t, 0.03)
}

function wire() {
  if (wired || typeof window === "undefined") return
  wired = true
  const go = () => unlockAudio()
  window.addEventListener("pointerdown", go, { capture: true, passive: true })
  window.addEventListener("keydown", go, { capture: true })
  document.addEventListener("visibilitychange", () => {
    if (!ctx) return
    if (document.hidden) void ctx.suspend().catch(() => {})
    else if (unlocked) void ctx.resume().catch(() => {})
  })
}

/** O contexto do jogo (nasce no primeiro pedido; nunca fecha). null sem Web Audio. */
export function audioContext(): AudioContext | null {
  if (ctx) return ctx
  if (typeof window === "undefined") return null
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return null
    ctx = new Ctx()
    // limitador leve no fim: soma de muitos sons não estoura
    const limiter = ctx.createDynamicsCompressor()
    limiter.threshold.value = -6
    limiter.knee.value = 4
    limiter.ratio.value = 12
    limiter.attack.value = 0.003
    limiter.release.value = 0.15
    limiter.connect(ctx.destination)
    master = ctx.createGain()
    master.connect(limiter)
    for (const b of BUSES) {
      const g = ctx.createGain()
      g.connect(master)
      buses.set(b, g)
    }
    apply()
    wire()
    if (document.hidden) void ctx.suspend().catch(() => {})
  } catch {
    ctx = null
  }
  return ctx
}

/** A entrada de um canal (para `node.connect(audioBus("sfx"))`). Sem Web Audio = null. */
export function audioBus(b: Bus): AudioNode | null {
  return audioContext() ? (buses.get(b) ?? null) : null
}

/** Chamar dentro de um gesto (toque/tecla). Também roda sozinho no primeiro gesto da página. */
export function unlockAudio() {
  const c = audioContext()
  if (!c) return
  unlocked = true
  if (c.state === "suspended" && !document.hidden) void c.resume().catch(() => {})
  for (const f of unlockers) f()
}

const unlockers = new Set<() => void>()
/** Avisa a cada gesto (a música tenta tocar de novo quando o navegador deixa). */
export function onAudioUnlock(f: () => void): () => void {
  unlockers.add(f)
  return () => unlockers.delete(f)
}

export function audioPrefs(): AudioPrefs {
  return { ...readPrefs() }
}

export function setAudioPrefs(patch: Partial<AudioPrefs>) {
  prefs = { ...readPrefs(), ...patch }
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs))
  } catch {
    /* sem armazenamento: vale só nesta visita */
  }
  apply()
  for (const f of listeners) f({ ...prefs })
}

export function onAudioPrefs(f: (p: AudioPrefs) => void): () => void {
  listeners.add(f)
  return () => listeners.delete(f)
}

/** Para medir/depurar (`window.__mmAudio()` no jogo). */
export function audioState() {
  return { state: ctx?.state ?? "none", unlocked, prefs: audioPrefs(), sampleRate: ctx?.sampleRate ?? 0 }
}
