// features/meu-mundo/ui/needs/needs-logic.ts — QUAL aviso falar e QUANDO (mm3d-28).
//
// As necessidades vêm prontas do servidor (snapshot.needs, mais urgente
// primeiro; ver `needs` em meuMundoLife.js) no aviso "life" da sala — no
// login (a sala relê a vida ao entrar) e a cada minuto. Aqui só se decide o
// que mostrar, sem relógio próprio de jogo:
//  • no login: a mais importante, combinada com o sono quando ele já passou
//    das 16 h — nunca uma fila de avisos do tempo offline;
//  • depois: quando uma necessidade APARECE (não estava no aviso anterior),
//    respeitando a espera global e a de cada uma; as graves (nível ≤ 3) são
//    lembradas de tempos em tempos enquanto durarem.
// Puro (sem React, sem Date.now): o chamador passa `now` e guarda `memory`.

import type { LifeNeed, LifeNeedId } from "../../types"

export const NEEDS_TIMING = {
  /** Entre dois avisos quaisquer (o nível 1–2 fura). */
  GAP_MS: 45_000,
  /** A mesma necessidade de novo. */
  SAME_MS: 10 * 60_000,
  /** Lembrete das graves (nível ≤ 3) enquanto durarem. */
  REMIND_MS: 20 * 60_000,
  /** Quanto tempo o balão fica na tela. */
  SHOW_MS: 7_000,
} as const

export interface NeedsMemory {
  started: boolean
  lastAt: number
  shown: Partial<Record<LifeNeedId, number>>
  prev: LifeNeedId[]
}

export const freshNeedsMemory = (): NeedsMemory => ({ started: false, lastAt: -Infinity, shown: {}, prev: [] })

/** O que o balão diz: uma necessidade, ou duas combinadas numa frase. */
export interface NeedLine {
  key: string
  ids: LifeNeedId[]
  /** maior urgência entre as necessidades da frase */
  level: number
  hours?: number
}

const HUNGER: LifeNeedId[] = ["hungry", "starving"]

function lineFor(top: LifeNeed, all: LifeNeed[]): NeedLine {
  const sleep = all.find((n) => n.id === "sleep")
  // Fome + sono viram uma frase só ("Estou com muita fome e já estou há 18 horas acordado.").
  if (sleep && top.id !== "sleep" && (HUNGER.includes(top.id) || top.level <= 2)) {
    return { key: `${top.id}+sleep`, ids: [top.id, "sleep"], level: top.level, hours: sleep.hours }
  }
  return { key: top.id, ids: [top.id], level: top.level, hours: top.hours }
}

/**
 * Decide o aviso para a lista de necessidades que acabou de chegar.
 * Devolve a frase (ou null) e a memória nova.
 */
export function pickNeed(needs: LifeNeed[], memory: NeedsMemory, now: number): { line: NeedLine | null; memory: NeedsMemory } {
  const list = [...needs].sort((a, b) => a.level - b.level)
  const ids = list.map((n) => n.id)
  const mem: NeedsMemory = { ...memory, shown: { ...memory.shown }, prev: ids }
  if (!list.length) return { line: null, memory: { ...mem, started: true } }
  if (!memory.started) {
    const line = lineFor(list[0], list)
    mem.started = true
    mem.lastAt = now
    for (const id of line.ids) mem.shown[id] = now
    return { line, memory: mem }
  }
  const fresh = list.filter((n) => !memory.prev.includes(n.id))
  const candidate =
    fresh.find((n) => now - (memory.shown[n.id] ?? -Infinity) >= NEEDS_TIMING.SAME_MS) ??
    list.find((n) => n.level <= 3 && now - (memory.shown[n.id] ?? -Infinity) >= NEEDS_TIMING.REMIND_MS)
  if (!candidate) return { line: null, memory: mem }
  const urgent = candidate.level <= 2
  if (!urgent && now - memory.lastAt < NEEDS_TIMING.GAP_MS) {
    // Não fala agora; esquecer o "apareceu" faz a próxima leitura tentar de novo.
    mem.prev = ids.filter((id) => id !== candidate.id)
    return { line: null, memory: mem }
  }
  const line = lineFor(candidate, list)
  mem.lastAt = now
  for (const id of line.ids) mem.shown[id] = now
  return { line, memory: mem }
}
