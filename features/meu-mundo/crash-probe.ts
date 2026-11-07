// features/meu-mundo/crash-probe.ts — sonda de queda da luta (2026-11-07).
//
// A aba morria com a luta abrindo e o servidor só via a conexão cair. A sonda deixa no
// aparelho até onde a luta foi. `pagehide` só dispara quando a página sai por conta
// própria: sem ele, foi queda de verdade (memória). No próximo login o resumo vai ao
// servidor, que grava no log com o aparelho.

import { getToken } from "@/lib/auth"
import { postClientReport } from "./data"

const KEY = "mm_fight_probe"

interface Probe {
  at: number
  what: string
  step: string
  /** A página saiu sozinha (recarregou, fechou, foi para outra). */
  left?: boolean
  notes: string[]
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

const onLeave = () => {
  const p = read()
  if (p) write({ ...p, left: true })
}
const onError = (e: ErrorEvent) => probeNote(`error: ${String(e.message).slice(0, 120)}`)

export function probeOpen(what: string) {
  write({ at: Date.now(), what, step: "open", notes: [] })
  window.addEventListener("pagehide", onLeave)
  window.addEventListener("error", onError)
}

/** Marca o passo; `context-lost` e `error: …` vão para a lista, os outros andam o passo. */
export function probeNote(step: string) {
  const p = read()
  if (!p) return
  if (step === "context-lost" || step.startsWith("error:")) write({ ...p, notes: [...p.notes, step].slice(-4) })
  else write({ ...p, step })
}

export function probeClose() {
  window.removeEventListener("pagehide", onLeave)
  window.removeEventListener("error", onError)
  write(null)
}

/** Ao entrar no jogo: a luta anterior não fechou? Avisa o servidor, uma vez. */
export function probeReport() {
  const p = read()
  const token = getToken()
  if (!p || !token) return
  write(null)
  const nav = navigator as Navigator & { deviceMemory?: number }
  void postClientReport(token, {
    what: p.what,
    step: p.step,
    left: !!p.left,
    notes: p.notes,
    ageMs: Date.now() - p.at,
    memory: nav.deviceMemory ?? null,
    ua: navigator.userAgent,
    screen: `${screen.width}x${screen.height}@${window.devicePixelRatio}`,
  })
}
