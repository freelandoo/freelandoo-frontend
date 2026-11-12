// features/meu-mundo/engine/audio/music.ts — a trilha do jogo (áudio S2, 2026-11-11).
//
// Camadas com prioridade (a mais alta que tiver pedido toca): cena < perigo < luta < chefe.
// Cada cena pede a sua ao abrir e solta ao fechar; trocar de cena/estado cruza as faixas
// (sai 1,6 s, entra 2,2 s); pedir a MESMA faixa não reinicia (troca de estado React, entrar
// e sair de prédio com a mesma faixa). Vinheta (vitória/derrota) abaixa a faixa e volta.
//
// Arquivo: as músicas do ACE-Step aprovadas, em public/meu-mundo/audio/musica (manifest por
// asset). Toca em FLUXO por <audio> da mesma origem → MediaElementSource → canal "music":
// não decodifica a faixa inteira na memória e o volume vale até no iPhone. No máximo duas
// faixas vivas (a que sai e a que entra). Sem arquivo aprovado: silêncio, nada quebra.

import { assetUrl } from "./bank"
import { audioBus, audioContext, onAudioUnlock } from "./mixer"

export type MusicLayer = "scene" | "danger" | "fight" | "boss"
const PRIORITY: Record<MusicLayer, number> = { scene: 0, danger: 1, fight: 2, boss: 3 }
const FADE_OUT = 1.6
const FADE_IN = 2.2
const LEVEL = 1

interface Track {
  theme: string
  el: HTMLAudioElement
  gain: GainNode
  src: MediaElementAudioSourceNode
}

const wants = new Map<MusicLayer, string>()
let current: Track | null = null
let target: string | null = null
let wired = false
let duckUntil = 0

function top(): string | null {
  let best: string | null = null
  let p = -1
  for (const [layer, theme] of wants) {
    if (PRIORITY[layer] > p) {
      p = PRIORITY[layer]
      best = theme
    }
  }
  return best
}

function retire(t: Track) {
  const ctx = audioContext()
  if (ctx) {
    const n = ctx.currentTime
    t.gain.gain.cancelScheduledValues(n)
    t.gain.gain.setValueAtTime(t.gain.gain.value, n)
    t.gain.gain.linearRampToValueAtTime(0, n + FADE_OUT)
  }
  window.setTimeout(() => {
    t.el.pause()
    t.el.removeAttribute("src")
    t.el.load()
    try {
      t.src.disconnect()
      t.gain.disconnect()
    } catch {
      /* já solto */
    }
  }, FADE_OUT * 1000 + 120)
}

function wire() {
  if (wired || typeof document === "undefined") return
  wired = true
  // aba escondida: o contexto já suspende (mixer); a faixa também para de baixar/tocar
  document.addEventListener("visibilitychange", () => {
    if (!current) return
    if (document.hidden) current.el.pause()
    else void current.el.play().catch(() => {})
  })
  // o navegador só deixa tocar depois de um gesto: tenta de novo quando destravar
  onAudioUnlock(() => {
    if (current && current.el.paused && !document.hidden) void current.el.play().catch(() => {})
  })
}

async function apply() {
  const theme = top()
  target = theme
  if ((current?.theme ?? null) === theme) return
  const old = current
  current = null
  if (old) retire(old)
  if (!theme) return
  const url = await assetUrl(theme)
  // pediram outra coisa enquanto o manifesto chegava
  if (target !== theme || !url) return
  const ctx = audioContext()
  const out = audioBus("music")
  if (!ctx || !out) return
  wire()
  const el = new Audio()
  el.preload = "auto"
  el.loop = true
  el.src = url
  const src = ctx.createMediaElementSource(el)
  const gain = ctx.createGain()
  gain.gain.value = 0
  src.connect(gain).connect(out)
  const n = ctx.currentTime
  gain.gain.setValueAtTime(0, n)
  gain.gain.linearRampToValueAtTime(performance.now() < duckUntil ? LEVEL * 0.25 : LEVEL, n + FADE_IN)
  current = { theme, el, gain, src }
  if (!document.hidden) void el.play().catch(() => {})
}

/** Pede (ou solta, com null) a faixa de uma camada. Mesma faixa = nada muda. */
export function setMusic(layer: MusicLayer, theme: string | null) {
  if (theme) {
    if (wants.get(layer) === theme) return
    wants.set(layer, theme)
  } else {
    if (!wants.has(layer)) return
    wants.delete(layer)
  }
  void apply()
}

/** Solta a camada só se ela ainda pede ESTA faixa (a cena nova pode ter pedido antes da velha fechar). */
export function releaseMusic(layer: MusicLayer, theme: string | null) {
  if (theme && wants.get(layer) === theme) setMusic(layer, null)
}

/** Vinheta curta (vitória/derrota): abaixa a faixa enquanto toca e volta. */
export async function playSting(theme: string) {
  const url = await assetUrl(theme)
  const ctx = audioContext()
  const out = audioBus("music")
  if (!url || !ctx || !out) return
  const el = new Audio(url)
  const src = ctx.createMediaElementSource(el)
  const g = ctx.createGain()
  g.gain.value = 1
  src.connect(g).connect(out)
  const dur = 6
  duckUntil = performance.now() + dur * 1000
  const n = ctx.currentTime
  if (current) {
    current.gain.gain.cancelScheduledValues(n)
    current.gain.gain.setValueAtTime(current.gain.gain.value, n)
    current.gain.gain.linearRampToValueAtTime(LEVEL * 0.25, n + 0.3)
    current.gain.gain.setValueAtTime(LEVEL * 0.25, n + dur)
    current.gain.gain.linearRampToValueAtTime(LEVEL, n + dur + 1.5)
  }
  el.onended = () => {
    try {
      src.disconnect()
      g.disconnect()
    } catch {
      /* já solto */
    }
  }
  void el.play().catch(() => {})
}

export function musicState() {
  return { playing: current?.theme ?? null, paused: current?.el.paused ?? null, layers: Object.fromEntries(wants) }
}
