// features/meu-mundo/engine/audio/bank.ts — os arquivos de som pelo NOME (áudio S1, 2026-11-11).
//
// Os efeitos vêm do gerador local (C:\Users\Alex\ComfyUI-Audio, Stable Audio 3) e só entram aqui
// depois de aprovados de ouvido; `importar.bat --aplicar` grava public/meu-mundo/audio/sfx/… e o
// manifest.json (asset → arquivo). O código pede pelo asset ("luta-comum-hit-pesado"), nunca pelo
// caminho. Asset sem arquivo (ainda não aprovado, ou a rede falhou) = `play` devolve null e quem
// chamou toca o sintetizador de antes.
//
// Celular: baixa sob demanda (preload por cena), decodifica uma vez e guarda; no máximo
// MAX_VOICES sons ao mesmo tempo (o mais velho cede) e MAX_PER_ASSET do mesmo arquivo.

import { audioBus, audioContext, type Bus } from "./mixer"

const BASE = "/meu-mundo/audio/"
const MAX_VOICES = 24
const MAX_PER_ASSET = 4

interface Entry {
  arquivo: string
  duracao_s?: number
}

let manifest: Promise<Record<string, Entry>> | null = null
const buffers = new Map<string, AudioBuffer>()
const loading = new Map<string, Promise<AudioBuffer | null>>()
const missing = new Set<string>()

export interface Voice {
  asset: string
  stop(fade?: number): void
  setGain(g: number, ramp?: number): void
  setRate(r: number): void
  readonly ended: boolean
}

const voices: (Voice & { started: number })[] = []

function loadManifest(): Promise<Record<string, Entry>> {
  if (!manifest) {
    manifest = fetch(BASE + "manifest.json", { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : { assets: {} }))
      .then((j: { assets?: Record<string, Entry> }) => j.assets ?? {})
      .catch(() => ({}))
  }
  return manifest
}

/** Baixa e decodifica (uma vez). null = não existe ou falhou. */
export function loadSample(asset: string): Promise<AudioBuffer | null> {
  const ok = buffers.get(asset)
  if (ok) return Promise.resolve(ok)
  if (missing.has(asset)) return Promise.resolve(null)
  const busy = loading.get(asset)
  if (busy) return busy
  const p = (async () => {
    const ctx = audioContext()
    if (!ctx) return null
    const m = await loadManifest()
    const e = m[asset]
    if (!e) {
      missing.add(asset)
      return null
    }
    try {
      const r = await fetch(BASE + e.arquivo)
      if (!r.ok) throw new Error(String(r.status))
      const buf = await ctx.decodeAudioData(await r.arrayBuffer())
      buffers.set(asset, buf)
      return buf
    } catch {
      missing.add(asset)
      return null
    } finally {
      loading.delete(asset)
    }
  })()
  loading.set(asset, p)
  return p
}

/** Começa a baixar uma lista (ao abrir a cena), sem esperar. */
export function preloadSamples(assets: Iterable<string>) {
  for (const a of assets) void loadSample(a)
}

export function hasSample(asset: string) {
  return buffers.has(asset)
}

export interface PlayOpts {
  bus?: Bus
  gain?: number
  rate?: number
  /** Variação aleatória de tom (±fração), para o mesmo som não soar igual. */
  vary?: number
  loop?: boolean
  /** Atraso em segundos. */
  at?: number
  /** Subida de volume no começo (s), para laço não estalar. */
  fadeIn?: number
}

/**
 * Toca já se o arquivo estiver pronto; senão começa a baixar e devolve null (quem chamou toca o
 * sintetizador). Nunca lança.
 */
export function playSample(asset: string, o: PlayOpts = {}): Voice | null {
  const ctx = audioContext()
  const buf = buffers.get(asset)
  if (!ctx || !buf) {
    if (ctx && !missing.has(asset)) void loadSample(asset)
    return null
  }
  const out = audioBus(o.bus ?? "sfx")
  if (!out) return null
  for (let i = voices.length - 1; i >= 0; i--) if (voices[i].ended) voices.splice(i, 1)
  const same = voices.filter((v) => v.asset === asset)
  if (same.length >= MAX_PER_ASSET) same[0].stop(0.03)
  if (voices.length >= MAX_VOICES) voices[0].stop(0.03)

  const src = ctx.createBufferSource()
  src.buffer = buf
  src.loop = !!o.loop
  const vary = o.vary ?? 0.04
  src.playbackRate.value = (o.rate ?? 1) * (1 + (Math.random() * 2 - 1) * vary)
  const g = ctx.createGain()
  const t = ctx.currentTime + (o.at ?? 0)
  const target = o.gain ?? 1
  if (o.fadeIn) {
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(target, t + o.fadeIn)
  } else g.gain.value = target
  src.connect(g).connect(out)
  let ended = false
  src.onended = () => {
    ended = true
    try {
      g.disconnect()
    } catch {
      /* já solto */
    }
  }
  src.start(t)
  const v = {
    asset,
    started: t,
    get ended() {
      return ended
    },
    stop(fade = 0.05) {
      if (ended) return
      const n = ctx.currentTime
      g.gain.cancelScheduledValues(n)
      g.gain.setValueAtTime(g.gain.value, n)
      g.gain.linearRampToValueAtTime(0, n + fade)
      try {
        src.stop(n + fade + 0.01)
      } catch {
        /* já parou */
      }
    },
    setGain(x: number, ramp = 0.08) {
      if (!ended) g.gain.setTargetAtTime(x, ctx.currentTime, ramp)
    },
    setRate(r: number) {
      if (!ended) src.playbackRate.setTargetAtTime(r, ctx.currentTime, 0.05)
    },
  }
  voices.push(v)
  return v
}

/** Um de vários (variação): o primeiro que estiver pronto, em ordem sorteada. */
export function playAny(assets: string[], o: PlayOpts = {}): Voice | null {
  const order = [...assets].sort(() => Math.random() - 0.5)
  for (const a of order) if (buffers.has(a)) return playSample(a, o)
  for (const a of assets) void loadSample(a)
  return null
}

export function bankState() {
  return { loaded: buffers.size, loading: loading.size, missing: [...missing], voices: voices.filter((v) => !v.ended).length }
}
