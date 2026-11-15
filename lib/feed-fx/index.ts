"use client"

// lib/feed-fx — SOM + VIBRAÇÃO + MOVIMENTO REDUZIDO do Feed Interativo
// (Throw, Stash, Baú, Cápsula, Paths, Sync — 2026-11-15).
//
// Sons: gerados na Máquina de Sons (ComfyUI local, Stable Audio 3 SFX; lote
// `C:\Users\Alex\ComfyUI-Audio\gerador\pedidos-feed.json`) e servidos de
// `public/sons/feed/<id>.mp3` (mono, curtos). Um AudioContext único, criado no
// PRIMEIRO toque da pessoa (o navegador não solta áudio sem gesto; rolar a tela
// não conta). Se o arquivo falhar, toca um blip sintetizado no lugar — o gesto
// nunca fica mudo por causa de rede.
//
// Vibração: `navigator.vibrate` — Android sim; o Safari do iPhone NÃO tem a API
// (só um app nativo vibra lá). Sem a API, `buzz` não faz nada.
//
// Preferências por aparelho (localStorage, com try/catch): som e vibração
// ligados por padrão; a tela /feed/lancar tem os dois interruptores.

export type FxSound =
  | "pegar"
  | "vitrine"
  | "mirar"
  | "lancar"
  | "lancar-um"
  | "chegar"
  | "carimbo"
  | "brilho"
  | "salvar-zona"
  | "salvar"
  | "cancelar"
  | "bau-cai"
  | "bau-abre"
  | "bau-premio"
  | "bau-enviar"
  | "capsula"
  | "capsula-agendar"
  | "caminho-botoes"
  | "caminho-escolha"
  | "caminho-fim"
  | "sync-convite"
  | "sync-conectado"
  | "sync-sair"
  | "convite"
  | "erro"

const ALL: FxSound[] = [
  "pegar", "vitrine", "mirar", "lancar", "lancar-um", "chegar", "carimbo", "brilho",
  "salvar-zona", "salvar", "cancelar", "bau-cai", "bau-abre", "bau-premio", "bau-enviar",
  "capsula", "capsula-agendar", "caminho-botoes", "caminho-escolha", "caminho-fim",
  "sync-convite", "sync-conectado", "sync-sair", "convite", "erro",
]

/** Volume por som (0–1): o que é contínuo ou repetido fica mais baixo. */
const GAIN: Partial<Record<FxSound, number>> = {
  mirar: 0.45,
  pegar: 0.7,
  brilho: 0.55,
  "salvar-zona": 0.6,
  cancelar: 0.6,
}

/** Padrões de vibração (ms). */
export const HAPTIC = {
  pegar: 12,
  vitrine: [8, 40, 8],
  mirar: 6,
  lancar: [18, 30, 10],
  chegar: 25,
  salvar: [10, 50, 22],
  cancelar: 6,
  bau: [20, 60, 20, 60, 40],
  premio: [12, 30, 12, 30, 12],
  capsula: [30, 80, 15],
  escolha: 10,
  sync: [15, 40, 15],
  erro: [40, 40, 40],
} as const satisfies Record<string, number | readonly number[]>

export type FxHaptic = keyof typeof HAPTIC

const KEY_SOUND = "fl:feedfx:sound"
const KEY_HAPTIC = "fl:feedfx:haptic"

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) !== "off"
  } catch {
    return true
  }
}
function writeFlag(key: string, on: boolean) {
  try {
    localStorage.setItem(key, on ? "on" : "off")
  } catch {
    /* sem armazenamento */
  }
}

let ctx: AudioContext | null = null
let master: GainNode | null = null
const buffers = new Map<FxSound, AudioBuffer | null>()
const loading = new Map<FxSound, Promise<AudioBuffer | null>>()
let soundOn: boolean | null = null
let hapticOn: boolean | null = null
let installed = false

function soundEnabled() {
  if (soundOn === null) soundOn = readFlag(KEY_SOUND)
  return soundOn
}
function hapticEnabled() {
  if (hapticOn === null) hapticOn = readFlag(KEY_HAPTIC)
  return hapticOn
}

function load(id: FxSound): Promise<AudioBuffer | null> {
  const have = loading.get(id)
  if (have) return have
  const p = (async () => {
    if (!ctx) return null
    try {
      const res = await fetch(`/sons/feed/${id}.mp3`, { cache: "force-cache" })
      if (!res.ok) throw new Error(String(res.status))
      const buf = await ctx.decodeAudioData(await res.arrayBuffer())
      buffers.set(id, buf)
      return buf
    } catch {
      buffers.set(id, null)
      return null
    }
  })()
  loading.set(id, p)
  return p
}

/** Cria o contexto dentro de um gesto e pré-carrega o pacote (≈ 200 KB). */
function unlock() {
  if (typeof window === "undefined") return
  if (ctx) {
    if (ctx.state === "suspended") void ctx.resume().catch(() => {})
    return
  }
  try {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    ctx = new AC()
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -16
    comp.connect(ctx.destination)
    master = ctx.createGain()
    master.gain.value = 0.7
    master.connect(comp)
    const idle =
      (window as unknown as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback ??
      ((cb: () => void) => setTimeout(cb, 200))
    idle(() => {
      for (const id of ALL) void load(id)
    })
  } catch {
    ctx = null
  }
}

/** Liga o destrave no primeiro toque/tecla (uma vez por página). */
export function installFeedFx() {
  if (installed || typeof window === "undefined") return
  installed = true
  const onGesture = () => unlock()
  window.addEventListener("pointerdown", onGesture, { capture: true, passive: true })
  window.addEventListener("keydown", onGesture, { capture: true, passive: true })
}

/** Reserva sintetizada (arquivo não veio): um blip curto pela família do som. */
function synth(id: FxSound, gain: number) {
  if (!ctx || !master) return
  const t = ctx.currentTime
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  const up = id.startsWith("lancar") || id === "sync-convite" || id === "convite"
  const down = id === "chegar" || id === "sync-sair" || id === "erro" || id === "cancelar"
  const base = id === "erro" ? 160 : id.startsWith("bau") ? 330 : id.startsWith("capsula") ? 520 : 420
  o.type = id === "erro" ? "square" : "triangle"
  o.frequency.setValueAtTime(base, t)
  if (up) o.frequency.exponentialRampToValueAtTime(base * 2.2, t + 0.18)
  if (down) o.frequency.exponentialRampToValueAtTime(base * 0.5, t + 0.18)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(0.18 * gain, t + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22)
  o.connect(g)
  g.connect(master)
  o.start(t)
  o.stop(t + 0.25)
}

/** Toca um som do feed. Sem áudio destravado ou com som desligado = nada. */
export function play(id: FxSound, opts: { gain?: number; rate?: number } = {}) {
  if (!soundEnabled() || !ctx || !master) return
  if (ctx.state === "suspended") void ctx.resume().catch(() => {})
  const gain = (opts.gain ?? 1) * (GAIN[id] ?? 1)
  const start = (buf: AudioBuffer | null) => {
    if (!ctx || !master) return
    if (!buf) return synth(id, gain)
    const src = ctx.createBufferSource()
    src.buffer = buf
    if (opts.rate) src.playbackRate.value = opts.rate
    const g = ctx.createGain()
    g.gain.value = gain
    src.connect(g)
    g.connect(master)
    src.start()
  }
  if (buffers.has(id)) return start(buffers.get(id) ?? null)
  // Ainda carregando: toca se chegar logo; som atrasado demais confunde.
  const asked = performance.now()
  void load(id).then((buf) => {
    if (performance.now() - asked < 350) start(buf)
  })
}

/** Vibra (Android). iPhone pelo navegador não tem a API: não faz nada. */
export function buzz(kind: FxHaptic) {
  if (!hapticEnabled() || typeof navigator === "undefined") return
  const nav = navigator as Navigator & { vibrate?: (p: number | number[]) => boolean }
  if (typeof nav.vibrate !== "function") return
  try {
    const p = HAPTIC[kind]
    nav.vibrate(typeof p === "number" ? p : [...p])
  } catch {
    /* política do navegador */
  }
}

/** Som + vibração juntos (o caso comum). */
export function fx(sound: FxSound, haptic?: FxHaptic, opts?: { gain?: number; rate?: number }) {
  play(sound, opts)
  if (haptic) buzz(haptic)
}

export function canVibrate(): boolean {
  return typeof navigator !== "undefined" && typeof (navigator as { vibrate?: unknown }).vibrate === "function"
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

export function getFxPrefs() {
  return { sound: soundEnabled(), haptic: hapticEnabled() }
}

export function setFxPrefs(p: { sound?: boolean; haptic?: boolean }) {
  if (typeof p.sound === "boolean") {
    soundOn = p.sound
    writeFlag(KEY_SOUND, p.sound)
  }
  if (typeof p.haptic === "boolean") {
    hapticOn = p.haptic
    writeFlag(KEY_HAPTIC, p.haptic)
  }
}
