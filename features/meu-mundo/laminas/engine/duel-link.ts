// features/meu-mundo/laminas/engine/duel-link.ts — o COLISEU (2026-11-24): a ponte entre a luta e a sala.
//
// Pedido do Alex: "Lutar" em cima de outra pessoa na porta do Coliseu leva os dois para a mesma
// luta no palco da Arena das Lâminas, sem aceite. A SALA do centro (src/realtime/meuMundoDuel.js)
// guarda a vida dos dois e decide o fim; cada aparelho roda o próprio lutador na regra das
// Lâminas e manda o estado (`dst`) e as pancadas que deu (`dhit`). O outro aparece aqui como um
// boneco (o "monstro" da regra sem cabeça própria) que só segue o que a sala repassa.
//
// Este arquivo não toca no Babylon: só guarda o que chegou e entrega o que sai.

import type { BodyId } from "../../types"

/** O que a sala repassa do outro lutador (o PlayerState da regra das Lâminas, no quadro DELE). */
export interface DuelFoeState {
  x: number
  z: number
  f: number
  s: "idle" | "attack" | "dodge" | "hurt" | "down" | "win" | "power" | "skill"
  t: number
  c: number
  v: number
  k?: "slash" | "dash" | "shield"
}

export interface DuelHp {
  me: number
  meMax: number
  foe: number
  foeMax: number
}

export interface DuelFoe {
  sid: string
  name: string
  body: BodyId | null
  look: string
}

/** Mensagens da sala que este canal entende (as outras passam reto). */
export const DUEL_MESSAGES = ["dgo", "dno", "dlive", "dst", "dhurt", "dhp", "dend"] as const

export class DuelChannel {
  /** O último estado do outro (null = ainda nada) e quando chegou (ms). */
  foeState: DuelFoeState | null = null
  foeAt = 0
  hp: DuelHp | null = null
  /** Os dois apertaram "Lutar" na tela de versus: a pancada passa a valer. */
  live = false
  /** Pancadas que levei e ainda não foram desenhadas. */
  hurts: { d: number; h: boolean }[] = []
  /** A sala decidiu o fim. */
  end: { win: boolean; reason: string } | null = null
  private readySent = false
  private quitSent = false

  constructor(
    readonly id: number,
    readonly side: number,
    readonly foe: DuelFoe,
    private readonly send: (type: string, msg: unknown) => void,
  ) {}

  /** Uma mensagem da sala (true = era deste duelo). */
  onMessage(type: string, p: unknown): boolean {
    const m = (p ?? {}) as Record<string, unknown>
    if (type === "dst") {
      const n = (k: string) => (Number.isFinite(Number(m[k])) ? Number(m[k]) : 0)
      this.foeState = { x: n("x"), z: n("z"), f: n("f"), s: (m.s as DuelFoeState["s"]) || "idle", t: n("t"), c: n("c"), v: n("v"), k: m.k as DuelFoeState["k"] }
      this.foeAt = Date.now()
      return true
    }
    if (type === "dlive" || type === "dhp") {
      this.hp = { me: Number(m.me) || 0, meMax: Number(m.meMax) || 1, foe: Number(m.foe) || 0, foeMax: Number(m.foeMax) || 1 }
      if (type === "dlive") this.live = true
      return true
    }
    if (type === "dhurt") {
      this.hurts.push({ d: Number(m.d) || 0, h: m.h === 1 })
      return true
    }
    if (type === "dend") {
      if (Number(m.id) && Number(m.id) !== this.id) return false
      this.end = { win: m.win === 1, reason: String(m.r || "") }
      return true
    }
    return false
  }

  /** Tela de versus fechada: avisa a vida máxima do meu lutador (uma vez). */
  ready(hpMax: number) {
    if (this.readySent) return
    this.readySent = true
    this.send("dready", { m: Math.round(hpMax) })
  }

  state(s: DuelFoeState) {
    if (this.end) return
    this.send("dst", s)
  }

  hit(d: number, heavy: boolean) {
    if (this.end || !this.live || !(d > 0)) return
    this.send("dhit", { d: Math.round(d), h: heavy ? 1 : 0 })
  }

  /** Desistiu ou saiu da tela: o outro vence (a sala decide). */
  quit() {
    if (this.end || this.quitSent) return
    this.quitSent = true
    this.send("dquit", {})
  }
}
