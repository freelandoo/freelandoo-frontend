// features/meu-mundo/noturno/engine/net.ts — ROLÊ NOTURNO em grupo (mm3d-42): a porta da sala.
//
// Fala com a NoturnoRoom do backend (src/realtime/meuMundoNoturno.js). Quem
// diz em que largada entrar é o backend (POST /center/noturno); aqui só se
// consome a reserva. Três momentos, como na Corrida:
//  - ESPERA: a sala aguarda até 1 minuto (o prazo vem em `left`) e mostra
//    quem já entrou, com o veículo de cada um;
//  - LARGADA: "start" traz a vaga deste aparelho, a SEMENTE da rua (a mesma
//    para todos), a curva com que ela é gerada e quem corre (veículo, corpo,
//    cores);
//  - ROLÊ: cada aparelho roda a sua corrida (sim/run.ts) e manda a pose a
//    20 Hz ("p"); as dos outros chegam a 20 Hz ("s"); quem cai manda o fim
//    ("x"); o resultado fica no estado da sala quando o último cai.
//
// O relógio é o da sala (tempo do pacote + meia ida e volta), para desenhar os
// outros um pouco no passado, entre duas amostras. Sem reconexão no meio.

import { Client, type Room } from "@colyseus/sdk"
import { getPublicBackendUrl } from "@/lib/backend-public"
import type { NoturnoSession } from "../../types"
import type { RideKind } from "../sim/run"

export type NoturnoNetStatus = "connecting" | "online" | "replaced" | "offline"

export interface NoturnoSeat {
  slot: number
  name: string
  ride: RideKind
  body: string
  look: string
}
export interface NoturnoStart {
  me: number
  seed: number
  street: RideKind
  /** s até o "vai". */
  countdown: number
  seats: NoturnoSeat[]
}
export interface NoturnoResultRow {
  slot: number
  name: string
  ride: RideKind
  score: number
  dist: number
  coins: number
  tricks: number
  by: string
  gone: boolean
}
export interface NoturnoLobbyEntry {
  name: string
  ride: RideKind
}

/** Bandeiras da pose (iguais nos dois sentidos). */
export const FLAG = { air: 1, power: 2, spin: 4, flip: 8, right: 16 } as const

/** Uma amostra de alguém (o que a sala repassou). */
export interface RiderSample {
  t: number
  z: number
  x: number
  y: number
  f: number
  /** 0–1 da manobra. */
  k: number
  score: number
  /** 1 = correndo, 0 = caiu, 2 = saiu. */
  alive: number
}

interface SPlayer {
  slot: number
  name: string
  ride: string
  online: boolean
}
interface SState {
  phase: "lobby" | "countdown" | "run" | "end"
  until: number
  time: number
  players: Map<string, SPlayer>
  result: string
}

const CLOSE_REPLACED = 4009
const PING_MS = 2000
const FIELDS = 8
/** Amostras guardadas por pessoa (~1 s). */
const KEEP = 24

export class NoturnoNet {
  status: NoturnoNetStatus = "connecting"
  lobby: { list: NoturnoLobbyEntry[]; until: number } = { list: [], until: 0 }
  start: NoturnoStart | null = null
  /** Amostras de cada vaga, da mais velha para a mais nova. */
  readonly samples = new Map<number, RiderSample[]>()
  result: NoturnoResultRow[] | null = null
  private room: Room<unknown, SState> | null = null
  private disposed = false
  private offset: number | null = null
  private rtt = 0.12
  private lobbyUntil = 0
  private pingTimer: ReturnType<typeof setInterval> | null = null
  private startResolve: ((s: NoturnoStart) => void) | null = null

  constructor(
    session: NoturnoSession,
    private readonly hooks: { onLobby?: (list: NoturnoLobbyEntry[], until: number) => void; onStatus?: (s: NoturnoNetStatus) => void } = {},
  ) {
    void this.connect(session)
  }

  /** Espera a largada (a sala decide: cheia ou fim do minuto). Rejeita se cair antes. */
  ready(signal?: AbortSignal): Promise<NoturnoStart> {
    return new Promise<NoturnoStart>((resolve, reject) => {
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

  private setStatus(s: NoturnoNetStatus) {
    if (this.status === s) return
    this.status = s
    if (!this.disposed) this.hooks.onStatus?.(s)
  }

  private async connect(session: NoturnoSession) {
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
      this.lobbyUntil = Date.now() + Math.max(0, Number(m.left) || 0)
      this.hooks.onLobby?.(this.lobby.list, this.lobbyUntil)
    })
    room.onMessage("replaced", () => {
      replaced = true
    })
    room.onMessage("start", (m: NoturnoStart) => {
      if (this.disposed) return
      this.start = m
      this.startResolve?.(m)
      this.startResolve = null
    })
    room.onMessage("s", (m: { t: number; c: number[] }) => this.onSnapshot(m))
    room.onMessage("pong", (m: { c: number }) => {
      this.rtt = Math.max(0.01, Math.min(1, (performance.now() - m.c) / 1000))
    })
    room.onStateChange((s) => {
      if (!this.disposed) this.onState(s as SState)
    })
    room.onLeave((code) => {
      if (this.room === room) this.room = null
      if (this.disposed) return
      this.setStatus(replaced || code === CLOSE_REPLACED ? "replaced" : "offline")
    })
    this.pingTimer = setInterval(() => this.room?.send("ping", { c: performance.now() }), PING_MS)
    this.setStatus("online")
  }

  private onState(s: SState) {
    const players = [...s.players.values()].sort((a, b) => a.slot - b.slot)
    this.lobby = { list: players.map((p) => ({ name: p.name, ride: p.ride as RideKind })), until: this.lobbyUntil }
    if (s.phase === "lobby") this.hooks.onLobby?.(this.lobby.list, this.lobbyUntil)
    if (s.phase === "end" && !this.result && s.result) {
      try {
        this.result = (JSON.parse(s.result) as { rows: NoturnoResultRow[] }).rows
      } catch {
        this.result = []
      }
    }
  }

  private onSnapshot(m: { t: number; c: number[] }) {
    if (this.disposed || !Array.isArray(m.c)) return
    const now = performance.now() / 1000
    const cand = m.t + this.rtt / 2 - now
    this.offset = this.offset === null || Math.abs(cand - this.offset) > 0.5 ? cand : this.offset + (cand - this.offset) * 0.1
    const n = Math.floor(m.c.length / FIELDS)
    for (let i = 0; i < n; i++) {
      const k = i * FIELDS
      const slot = m.c[k]
      const list = this.samples.get(slot) ?? []
      const last = list[list.length - 1]
      if (last && last.t >= m.t) continue
      list.push({ t: m.t, z: m.c[k + 1], x: m.c[k + 2], y: m.c[k + 3], f: m.c[k + 4], k: m.c[k + 5], score: m.c[k + 6], alive: m.c[k + 7] })
      if (list.length > KEEP) list.shift()
      this.samples.set(slot, list)
    }
  }

  /** Tempo do rolê agora, pelo relógio da sala (null antes do primeiro pacote). */
  serverTime(): number | null {
    return this.offset === null ? null : performance.now() / 1000 + this.offset
  }

  sendPose(p: { z: number; x: number; y: number; f: number; k: number; s: number; c: number }) {
    const r = (v: number, k = 1000) => Math.round(v * k) / k
    this.room?.send("p", { z: r(p.z, 100), x: r(p.x), y: r(p.y), f: p.f, k: r(p.k, 100), s: p.s, c: p.c })
  }

  /** Caiu: o fim deste aparelho (a sala só fecha a classificação quando o último cai). */
  sendCrash(p: { z: number; x: number; y: number; s: number; c: number; t: number; by: string }) {
    this.room?.send("x", { ...p, f: 0, k: 0 })
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    if (this.pingTimer) clearInterval(this.pingTimer)
    void this.room?.leave(true).catch(() => {})
    this.room = null
  }
}

/** Entrar numa largada: pede a reserva (POST), abre a porta e espera a largada. */
export async function joinNoturno(
  fetchSession: () => Promise<NoturnoSession | null>,
  hooks: { signal: AbortSignal; onLobby: (list: NoturnoLobbyEntry[], until: number) => void; onStatus: (s: NoturnoNetStatus) => void },
): Promise<{ net: NoturnoNet; start: NoturnoStart } | null> {
  const session = await fetchSession()
  if (!session || hooks.signal.aborted) return null
  const net = new NoturnoNet(session, { onLobby: hooks.onLobby, onStatus: hooks.onStatus })
  try {
    const start = await net.ready(hooks.signal)
    return { net, start }
  } catch {
    net.dispose()
    return null
  }
}
