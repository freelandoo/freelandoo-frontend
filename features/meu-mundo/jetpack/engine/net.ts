// features/meu-mundo/jetpack/engine/net.ts — JETPACK (mm3d-63): a porta da sala.
//
// Fala com a JetpackRoom do backend (src/realtime/meuMundoJetpack.js). Quem
// diz em que sala entrar é o backend (POST /center/jetpack); aqui só se
// consome a reserva. Como no Rolê Noturno:
//  - ESPERA (grupo): a sala aguarda até 1 minuto (6 largam na hora);
//    "Sozinho" também passa pela sala (uma sala só sua, larga na hora) para a
//    prática contar;
//  - LARGADA: "start" traz a vaga deste aparelho, a SEMENTE do túnel (a mesma
//    para todos) e quem voa (corpo, cores);
//  - VOO: cada aparelho roda o seu (sim/flight.ts) e manda a pose a 20 Hz
//    ("p"); as dos outros chegam a 20 Hz ("s"); quem bate manda o fim ("x");
//    o resultado fica no estado da sala quando o último cai.

import { Client, type Room } from "@colyseus/sdk"
import { getPublicBackendUrl } from "@/lib/backend-public"
import type { JetpackSession } from "../../types"

export type JetpackNetStatus = "connecting" | "online" | "replaced" | "offline"

export interface JetpackSeat {
  slot: number
  name: string
  body: string
  look: string
  /** Fator de velocidade pelo atributo velocidade do personagem (a sala calcula). */
  k?: number
}
export interface JetpackStart {
  me: number
  seed: number
  /** s até o "vai". */
  countdown: number
  seats: JetpackSeat[]
  solo: boolean
  /** Fase da sala (mm3d-75); sem ela, o túnel original. */
  phase?: string
}
export interface JetpackResultRow {
  slot: number
  name: string
  score: number
  dist: number
  cans: number
  by: string
  gone: boolean
}

/** Bandeiras da pose. */
export const FLAG = { thrust: 1, empty: 2 } as const

/** Uma amostra de alguém (o que a sala repassou). */
export interface PilotSample {
  t: number
  z: number
  x: number
  y: number
  f: number
  score: number
  /** 1 = voando, 0 = bateu, 2 = saiu. */
  alive: number
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
/** Prazo para a largada chegar depois de pedir a vaga (espera do grupo 20 s + contagem + folga). */
const START_WAIT_MS = 45_000
const PING_MS = 2000
const FIELDS = 7
const KEEP = 24

export class JetpackNet {
  status: JetpackNetStatus = "connecting"
  lobby: { list: string[]; until: number } = { list: [], until: 0 }
  start: JetpackStart | null = null
  readonly samples = new Map<number, PilotSample[]>()
  result: JetpackResultRow[] | null = null
  private room: Room<unknown, SState> | null = null
  private disposed = false
  private offset: number | null = null
  private rtt = 0.12
  private lobbyUntil = 0
  private pingTimer: ReturnType<typeof setInterval> | null = null
  private startResolve: ((s: JetpackStart) => void) | null = null

  constructor(
    session: JetpackSession,
    private readonly hooks: { onLobby?: (list: string[], until: number) => void; onStatus?: (s: JetpackNetStatus) => void } = {},
  ) {
    void this.connect(session)
  }

  ready(signal?: AbortSignal): Promise<JetpackStart> {
    return new Promise<JetpackStart>((resolve, reject) => {
      if (this.start) return resolve(this.start)
      this.startResolve = resolve
      const fail = () => reject(new Error("abort"))
      signal?.addEventListener("abort", fail, { once: true })
      const t0 = Date.now()
      const watch = setInterval(() => {
        // sem largada em START_WAIT_MS (a espera do grupo é de 20 s): desiste em vez de prender a tela
        if (this.disposed || this.status === "offline" || this.status === "replaced" || Date.now() - t0 > START_WAIT_MS) {
          clearInterval(watch)
          fail()
        } else if (this.start) clearInterval(watch)
      }, 200)
    })
  }

  private setStatus(s: JetpackNetStatus) {
    if (this.status === s) return
    this.status = s
    if (!this.disposed) this.hooks.onStatus?.(s)
  }

  private async connect(session: JetpackSession) {
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
    room.onMessage("start", (m: JetpackStart) => {
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
    this.lobby = { list: players.map((p) => p.name), until: this.lobbyUntil }
    if (s.phase === "lobby") this.hooks.onLobby?.(this.lobby.list, this.lobbyUntil)
    if (s.phase === "end" && !this.result && s.result) {
      try {
        this.result = (JSON.parse(s.result) as { rows: JetpackResultRow[] }).rows
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
      list.push({ t: m.t, z: m.c[k + 1], x: m.c[k + 2], y: m.c[k + 3], f: m.c[k + 4], score: m.c[k + 5], alive: m.c[k + 6] })
      if (list.length > KEEP) list.shift()
      this.samples.set(slot, list)
    }
  }

  /** Tempo do voo agora, pelo relógio da sala (null antes do primeiro pacote). */
  serverTime(): number | null {
    return this.offset === null ? null : performance.now() / 1000 + this.offset
  }

  sendPose(p: { z: number; x: number; y: number; f: number; s: number; c: number }) {
    const r = (v: number, k = 1000) => Math.round(v * k) / k
    this.room?.send("p", { z: r(p.z, 100), x: r(p.x), y: r(p.y), f: p.f, s: p.s, c: p.c })
  }

  /** Bateu: o fim deste aparelho. */
  sendCrash(p: { z: number; x: number; y: number; s: number; c: number; by: string }) {
    this.room?.send("x", { ...p, f: 0 })
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
export async function joinJetpack(
  fetchSession: () => Promise<JetpackSession | null>,
  hooks: { signal: AbortSignal; onLobby: (list: string[], until: number) => void; onStatus: (s: JetpackNetStatus) => void },
): Promise<{ net: JetpackNet; start: JetpackStart } | null> {
  const session = await fetchSession()
  if (!session || hooks.signal.aborted) return null
  const net = new JetpackNet(session, { onLobby: hooks.onLobby, onStatus: hooks.onStatus })
  try {
    const start = await net.ready(hooks.signal)
    return { net, start }
  } catch {
    net.dispose()
    return null
  }
}
