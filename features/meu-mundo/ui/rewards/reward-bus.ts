// features/meu-mundo/ui/rewards/reward-bus.ts — mm3d-59: a fila das celebrações.
//
// Quem recebe um RECIBO do servidor (luta, missão, compra, forja) chama
// `celebrate(receipt)`. A mesma concessão pode chegar por mais de um canal
// (resposta HTTP, reenvio depois de resposta perdida, outra aba): o eventId
// é a identidade — cada um é apresentado UMA vez por aparelho (memória +
// sessionStorage, que pode faltar: tudo em try/catch). Pular/fechar a
// celebração nunca muda o prêmio (ele já está gravado no servidor).
//
// `hold(true)` segura a fila num momento que não é seguro (luta em curso,
// jogo em grupo): a celebração completa sai quando soltar.

import type { Receipt } from "../../data"

const KEY = "mm.celebrated.v1"
const MAX_KEPT = 200

const seen = new Set<string>()
let loaded = false
function load() {
  if (loaded) return
  loaded = true
  try {
    const raw = sessionStorage.getItem(KEY)
    if (raw) for (const id of JSON.parse(raw) as string[]) seen.add(id)
  } catch {
    /* sem storage: só a memória */
  }
}
function persist() {
  try {
    sessionStorage.setItem(KEY, JSON.stringify([...seen].slice(-MAX_KEPT)))
  } catch {
    /* sem storage */
  }
}

type Listener = (r: Receipt) => void
const listeners = new Set<Listener>()
const queue: Receipt[] = []
let held = 0

function flush() {
  if (held > 0 || !listeners.size) return
  while (queue.length) {
    const r = queue.shift()!
    for (const l of listeners) l(r)
  }
}

/** Entrega um recibo para ser celebrado (ignorado se este aparelho já celebrou o mesmo eventId). */
export function celebrate(r: Receipt | null | undefined) {
  if (!r || !r.eventId) return
  load()
  if (seen.has(r.eventId)) return
  seen.add(r.eventId)
  persist()
  queue.push(r)
  flush()
}

/** Segura (true) ou solta (false) a fila; pode empilhar. */
export function hold(on: boolean) {
  held = Math.max(0, held + (on ? 1 : -1))
  flush()
}

export function onCelebrate(l: Listener): () => void {
  listeners.add(l)
  flush()
  return () => listeners.delete(l)
}

/** Só testes/harness. */
export function _resetRewardBus() {
  seen.clear()
  queue.length = 0
  held = 0
  loaded = false
}
