// features/meu-mundo/gincana/engine/net.ts — GINCANA em grupo (mm3d-47): a porta da sala.
//
// Fala com a GincanaRoom do backend (src/realtime/meuMundoGincana.js). Quem
// diz em que largada entrar é o backend (POST /center/gincana); aqui só se
// consome a reserva. Como no Rolê Noturno:
//  - ESPERA: até 1 minuto (o prazo vem em `left`), mostra quem já entrou;
//  - LARGADA: "start" traz a vaga deste aparelho, a SEMENTE (bolas da subida
//    e computadores) e quem corre (corpo, cores; computador completa até 8);
//  - PROVA: o meu corpo roda aqui (sim/race.ts) e a pose vai a 20 Hz ("p");
//    as dos outros (gente e computador, que a sala roda) chegam a 20 Hz ("s").
//    O resultado fica no estado da sala quando todos chegam ou o tempo acaba.
//
// O relógio é o da sala (tempo do pacote + meia ida e volta): as barras, os
// pêndulos e as luvas ficam no mesmo lugar para todos.

import { Client, type Room } from "@colyseus/sdk"
import { getPublicBackendUrl } from "@/lib/backend-public"
import type { GincanaSession } from "../../types"

export type GincanaNetStatus = "connecting" | "online" | "replaced" | "offline"

export interface GincanaSeat {
  slot: number
  name: string
  body: string
  look: string
  bot: boolean
}
export interface GincanaStart {
  me: number
  seed: number
  /** s até o "vai". */
  countdown: number
  seats: GincanaSeat[]
}
export interface GincanaResultRow {
  slot: number
  name: string
  bot: boolean
  /** s da chegada (−1 = não chegou). */
  fin: number
  dist: number
  gone: boolean
}
export interface GincanaLobbyEntry {
  name: string
}

/** Uma amostra de alguém (o que a sala repassou). */
export interface RunnerSample {
  t: number
  x: number
  y: number
  z: number
  f: number
  a: number
  cp: number
  fin: number
}

interface SPlayer {
  slot: number
  name: string
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

export class GincanaNet {
  status: GincanaNetStatus = "connecting"
  lobby: { list: GincanaLobbyEntry[]; until: number } = { list: [], until: 0 }
  start: GincanaStart | null = null
  readonly samples = new Map<number, RunnerSample[]>()
  result: GincanaResultRow[] | null = null
  private room: Room<unknown, SState> | null = null
  private disposed = false
  private offset: number | null = null
  private rtt = 0.12
  private lobbyUntil = 0
  private pingTimer: ReturnType<typeof setInterval> | null = null
  private startResolve: ((s: GincanaStart) => void) | null = null

  constructor(
    session: GincanaSession,
    private readonly hooks: { onLobby?: (list: GincanaLobbyEntry[], until: number) => void; onStatus?: (s: GincanaNetStatus) => void } = {},
  ) {
    void this.connect(session)
  }

  ready(signal?: AbortSignal): Promise<GincanaStart> {
    return new Promise<GincanaStart>((resolve, reject) => {
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

  private setStatus(s: GincanaNetStatus) {
    if (this.status === s) return
    this.status = s
    if (!this.disposed) this.hooks.onStatus?.(s)
  }

  private async connect(session: GincanaSession) {
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
    room.onMessage("start", (m: GincanaStart) => {
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
    this.lobby = { list: players.map((p) => ({ name: p.name })), until: this.lobbyUntil }
    if (s.phase === "lobby") this.hooks.onLobby?.(this.lobby.list, this.lobbyUntil)
    if (s.phase === "end" && !this.result && s.result) {
      try {
        this.result = (JSON.parse(s.result) as { rows: GincanaResultRow[] }).rows
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
      list.push({ t: m.t, x: m.c[k + 1], y: m.c[k + 2], z: m.c[k + 3], f: m.c[k + 4], a: m.c[k + 5], cp: m.c[k + 6], fin: m.c[k + 7] })
      if (list.length > KEEP) list.shift()
      this.samples.set(slot, list)
    }
  }

  /** Tempo da prova agora, pelo relógio da sala (null antes do primeiro pacote). */
  serverTime(): number | null {
    return this.offset === null ? null : performance.now() / 1000 + this.offset
  }

  sendPose(p: { x: number; y: number; z: number; f: number; a: number; cp: number; fin: number }) {
    const r = (v: number, k = 1000) => Math.round(v * k) / k
    this.room?.send("p", { x: r(p.x), y: r(p.y), z: r(p.z, 100), f: r(p.f, 100), a: p.a, cp: p.cp, n: r(p.fin, 100) })
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
export async function joinGincana(
  fetchSession: () => Promise<GincanaSession | null>,
  hooks: { signal: AbortSignal; onLobby: (list: GincanaLobbyEntry[], until: number) => void; onStatus: (s: GincanaNetStatus) => void },
): Promise<{ net: GincanaNet; start: GincanaStart } | null> {
  const session = await fetchSession()
  if (!session || hooks.signal.aborted) return null
  const net = new GincanaNet(session, { onLobby: hooks.onLobby, onStatus: hooks.onStatus })
  try {
    const start = await net.ready(hooks.signal)
    return { net, start }
  } catch {
    net.dispose()
    return null
  }
}
