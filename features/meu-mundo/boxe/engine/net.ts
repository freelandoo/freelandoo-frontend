// features/meu-mundo/boxe/engine/net.ts — ARENA DE BOXE (mm3d-43 → mm3d-44): a porta da sala.
//
// Fala com a BoxeRoom do backend (src/realtime/meuMundoBoxe.js). Quem decide
// a sala é o backend (POST /center/boxe); aqui só se consome a reserva.
//  - ESPERA (multiplayer): até 1 minuto por um adversário (o prazo vem em
//    `left`); ninguém apareceu = a sala põe o computador parelho;
//  - LARGADA: "start" traz o canto deste aparelho, os dois lutadores, a
//    TABELA dos golpes e o 1º estado;
//  - LUTA (mm3d-44, ao vivo): "s" a cada passo da sala (estado + eventos), que
//    também acerta o relógio; daqui sai "in" (joystick, ataque com o combo,
//    esquiva, toques para levantar) e a toalha; "towel" avisa os dois;
//  - FIM: "result" com o placar e o que a luta deixou na VIDA desta pessoa.

import { Client, type Room } from "@colyseus/sdk"
import { getPublicBackendUrl } from "@/lib/backend-public"
import type { BoxeSession } from "../../types"
import type { FightStart, Snap } from "./fight"

export type BoxeNetStatus = "connecting" | "online" | "replaced" | "offline"

export interface BoxeLobbyEntry {
  name: string
  cpu: boolean
}

export interface BoxeResultRow {
  slot: number
  outcome: "win" | "loss" | "draw"
  method: "ko" | "tko" | "points" | "draw" | "towel"
  taken: number
  thrown: number
  landed: number
  kd: number
  activeS: number
  at: number
  round: number
}

export interface BoxeAftermath {
  coins: number
  injuryH: number
  hospital: boolean
  dead: boolean
  delta: { energy: number; satiety: number; health: number; stress: number; mood: number; strength: number; speed: number }
  vitals?: Record<string, number>
  wallet?: number
}

export interface BoxeResult {
  me: number
  towel: { who: number; at: number } | null
  rows: BoxeResultRow[]
  aftermath: BoxeAftermath | null
  /** Placar dos juízes [canto 0, canto 1]. */
  score: [number, number]
}

/** O que sai daqui na luta (ver Match.input no servidor). */
export interface BoxeInput {
  /** Onde o lutador está neste aparelho (mm3d-45: o movimento é do aparelho). */
  p?: [number, number]
  /** Direção no chão (|m| ≤ 1). */
  m?: [number, number]
  /** Combo pedido (pedaços da tabela) e o id dele neste aparelho. */
  a?: number[]
  c?: number
  /** Esquivar. */
  d?: 1
  /** Toques para levantar. */
  k?: number
}

interface SPlayer {
  slot: number
  name: string
  online: boolean
  cpu: boolean
}
interface SState {
  phase: "lobby" | "fight" | "end"
  until: number
  time: number
  players: Map<string, SPlayer>
}

const CLOSE_REPLACED = 4009
const PING_MS = 2000

export class BoxeNet {
  status: BoxeNetStatus = "connecting"
  start: FightStart | null = null
  towel: { who: number; at: number } | null = null
  result: BoxeResult | null = null
  /** Os últimos estados (a cena abre depois da largada e lê daqui o que perdeu). */
  readonly recent: Snap[] = []
  private room: Room<unknown, SState> | null = null
  private disposed = false
  private offset: number | null = null
  private rtt = 0.12
  private lobbyUntil = 0
  private pingTimer: ReturnType<typeof setInterval> | null = null
  private startResolve: ((s: FightStart) => void) | null = null
  /** Quem quer saber da toalha e do resultado (a cena e a tela). */
  readonly listeners = {
    towel: [] as ((m: { who: number; at: number }) => void)[],
    result: [] as ((r: BoxeResult) => void)[],
    snap: [] as ((s: Snap) => void)[],
  }

  constructor(
    session: BoxeSession,
    private readonly hooks: { onLobby?: (list: BoxeLobbyEntry[], until: number) => void; onStatus?: (s: BoxeNetStatus) => void } = {},
  ) {
    void this.connect(session)
  }

  /** Espera a largada. Rejeita se cair antes ou se `signal` abortar. */
  ready(signal?: AbortSignal): Promise<FightStart> {
    return new Promise<FightStart>((resolve, reject) => {
      if (this.start) return resolve(this.start)
      this.startResolve = resolve
      const fail = () => reject(new Error("abort"))
      signal?.addEventListener("abort", fail, { once: true })
      const watch = setInterval(() => {
        if (this.disposed || this.status === "offline" || this.status === "replaced") {
          clearInterval(watch)
          fail()
        } else if (this.start) clearInterval(watch)
      }, 200)
    })
  }

  private setStatus(s: BoxeNetStatus) {
    if (this.status === s) return
    this.status = s
    if (!this.disposed) this.hooks.onStatus?.(s)
  }

  private async connect(session: BoxeSession) {
    const client = new Client(getPublicBackendUrl().replace(/^http/, "ws") + session.multiplayer.wsPath)
    let room: Room<unknown, SState>
    try {
      room = (await client.consumeSeatReservation(session.multiplayer.reservation as never)) as unknown as Room<unknown, SState>
    } catch {
      this.setStatus("offline")
      return
    }
    if (this.disposed) {
      void room.leave(true)
      return
    }
    room.reconnection.enabled = false
    this.room = room
    let replaced = false
    room.onMessage("welcome", (m: { left: number }) => {
      this.lobbyUntil = m.left > 0 ? Date.now() + m.left : 0
    })
    room.onMessage("replaced", () => {
      replaced = true
    })
    room.onMessage("start", (m: FightStart) => {
      if (this.disposed) return
      this.start = m
      this.startResolve?.(m)
      this.startResolve = null
    })
    room.onMessage("towel", (m: { who: number; at: number }) => {
      this.towel = m
      for (const f of this.listeners.towel) f(m)
    })
    room.onMessage("result", (m: BoxeResult) => {
      this.result = m
      for (const f of this.listeners.result) f(m)
    })
    room.onMessage("s", (m: Snap) => {
      if (this.disposed) return
      this.clock(m.t)
      this.recent.push(m)
      if (this.recent.length > 60) this.recent.shift()
      for (const f of this.listeners.snap) f(m)
    })
    room.onMessage("pong", (m: { c: number; t: number }) => {
      this.rtt = Math.max(0.01, Math.min(1, (performance.now() - m.c) / 1000))
      this.clock(m.t)
    })
    room.onStateChange((s) => {
      if (this.disposed) return
      const st = s as SState
      if (st.phase === "lobby") {
        const list = [...st.players.values()].sort((a, b) => a.slot - b.slot).map((p) => ({ name: p.name, cpu: p.cpu }))
        this.hooks.onLobby?.(list, this.lobbyUntil)
      }
    })
    room.onLeave((code) => {
      if (this.room === room) this.room = null
      if (this.disposed) return
      this.setStatus(replaced || code === CLOSE_REPLACED ? "replaced" : "offline")
    })
    this.pingTimer = setInterval(() => this.room?.send("ping", { c: performance.now() }), PING_MS)
    this.setStatus("online")
  }

  /** Acerta o relógio pela hora da sala (tempo do pacote + meia ida e volta). */
  private clock(t: number) {
    if (!Number.isFinite(t) || (this.start === null && t <= -60)) return
    const cand = t + this.rtt / 2 - performance.now() / 1000
    this.offset = this.offset === null || Math.abs(cand - this.offset) > 0.6 ? cand : this.offset + (cand - this.offset) * 0.15
  }

  /** Tempo da luta agora pelo relógio da sala (null antes do 1º pacote). */
  serverTime(): number | null {
    return this.offset === null ? null : performance.now() / 1000 + this.offset
  }

  /** Ida e volta (s), para a previsão do próprio lutador. */
  get roundTrip() {
    return this.rtt
  }

  sendInput(m: BoxeInput) {
    this.room?.send("in", m)
  }

  sendTowel() {
    this.room?.send("towel", {})
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    if (this.pingTimer) clearInterval(this.pingTimer)
    void this.room?.leave(true).catch(() => {})
    this.room = null
  }
}

/** Entrar: pede a reserva (POST), abre a porta e espera a largada. */
export async function joinBoxe(
  fetchSession: () => Promise<BoxeSession | { error: string; code?: string } | null>,
  hooks: { signal: AbortSignal; onLobby: (list: BoxeLobbyEntry[], until: number) => void; onStatus: (s: BoxeNetStatus) => void },
): Promise<{ net: BoxeNet; start: FightStart } | { error: string; code?: string } | null> {
  const session = await fetchSession()
  if (!session || hooks.signal.aborted) return null
  if ("error" in session) return session
  const net = new BoxeNet(session, { onLobby: hooks.onLobby, onStatus: hooks.onStatus })
  try {
    const start = await net.ready(hooks.signal)
    return { net, start }
  } catch {
    net.dispose()
    return null
  }
}
