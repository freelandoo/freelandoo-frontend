// features/meu-mundo/crash-probe.ts — sonda de queda (2026-11-07).
//
// A aba morria e o servidor só via a conexão cair. A sonda deixa no aparelho onde a pessoa
// estava e quanta memória usava. `pagehide` só dispara quando a página sai por conta
// própria: sem ele, foi queda de verdade. No próximo login o resumo vai ao servidor, que
// grava no log com o aparelho.

import { getToken } from "@/lib/auth"
import { postClientReport } from "./data"

const KEY = "mm_fight_probe"
const BEAT_MS = 5000

interface Probe {
  at: number
  what: string
  step: string
  /** A página saiu sozinha (recarregou, fechou, foi para outra). */
  left?: boolean
  notes: string[]
  heapMB?: number
  limitMB?: number
}

const read = (): Probe | null => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "null") as Probe | null
  } catch {
    return null
  }
}
const write = (p: Probe | null) => {
  try {
    if (p) localStorage.setItem(KEY, JSON.stringify(p))
    else localStorage.removeItem(KEY)
  } catch {
    /* navegador sem armazenamento: fica sem sonda */
  }
}

/** Só o Chrome conta a memória; no resto o campo fica vazio. */
const heap = () => {
  const m = (performance as Performance & { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory
  return m ? { heapMB: Math.round(m.usedJSHeapSize / 1048576), limitMB: Math.round(m.jsHeapSizeLimit / 1048576) } : {}
}

const onLeave = () => {
  const p = read()
  if (p) write({ ...p, left: true })
}
const onError = (e: ErrorEvent) => probeNote(`error: ${String(e.message).slice(0, 120)}`)

export function probeOpen(what: string) {
  write({ at: Date.now(), what, step: "open", notes: [], ...heap() })
}

/** Marca o passo; `context-lost` e `error: …` vão para a lista, os outros andam o passo. */
export function probeNote(step: string) {
  const p = read()
  if (!p) return
  if (step === "context-lost" || step.startsWith("error:")) write({ ...p, notes: [...p.notes, step].slice(-4), ...heap() })
  else write({ ...p, step, ...heap() })
}

/** A luta fechou: a sonda segue, agora na volta à cidade. */
export function probeClose() {
  probeOpen("street")
  probeNote("after-fight")
}

/** Ao entrar no jogo: conta como a última sessão acabou e liga a sonda desta. */
export function probeReport() {
  const p = read()
  const token = getToken()
  if (p && token) {
    const nav = navigator as Navigator & { deviceMemory?: number }
    void postClientReport(token, {
      what: p.what,
      step: p.step,
      left: !!p.left,
      notes: p.notes,
      ageMs: Date.now() - p.at,
      heapMB: p.heapMB ?? null,
      limitMB: p.limitMB ?? null,
      memory: nav.deviceMemory ?? null,
      ua: navigator.userAgent,
      screen: `${screen.width}x${screen.height}@${window.devicePixelRatio}`,
    })
  }
  probeOpen("street")
  window.addEventListener("pagehide", onLeave)
  window.addEventListener("error", onError)
  const beat = setInterval(() => {
    const now = read()
    if (now) write({ ...now, ...heap() })
  }, BEAT_MS)
  return () => {
    clearInterval(beat)
    window.removeEventListener("pagehide", onLeave)
    window.removeEventListener("error", onError)
    write(null)
  }
}
