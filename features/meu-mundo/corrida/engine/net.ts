// features/meu-mundo/corrida/engine/net.ts — CORRIDA em grupo (mm3d-39b): a porta da sala.
//
// Fala com a CorridaRoom do backend (src/realtime/meuMundoCorrida.js). Quem
// diz em que largada entrar é o backend (POST /center/corrida); aqui só se
// consome a reserva. Três momentos:
//  - ESPERA: a sala aguarda até 1 minuto (o prazo vem em `until`) e mostra
//    quem já entrou;
//  - LARGADA: a mensagem "start" diz a nave deste aparelho e as 6 naves
//    (pessoas e computador);
//  - CORRIDA: as naves chegam a 20 Hz ("s"); a deste aparelho sai daqui a
//    20 Hz ("p"); cápsula pedida ("o") pode voltar negada ("deny"); o
//    resultado fica no estado da sala.
//
// O relógio da corrida é o da sala: cada pacote traz o tempo dela; com o
// ping/pong (metade da ida e volta) o aparelho sabe o "agora" da sala.
// Sem reconexão no meio da corrida: caiu = fora (a sala marca "não terminou").

import { Client, type Room } from "@colyseus/sdk"
import { getPublicBackendUrl } from "@/lib/backend-public"
import type { CorridaSession } from "../../types"
import type { RemoteCar } from "../sim/race"

export type CorridaNetStatus = "connecting" | "online" | "replaced" | "offline"

export interface CorridaSeat {
  name: string
  human: boolean
  /** Nave da garagem (mm3d-49; sala antiga não manda = a do lugar). */
  ship?: string
}
export interface CorridaStart {
  me: number
  seats: CorridaSeat[]
}
export interface CorridaResultRow {
  car: number
  name: string
  human: boolean
  time: number | null
  best: number | null
  gone: boolean
}

interface SPlayer {
  slot: number
  car: number
  name: string
  online: boolean
}
interface SState {
  phase: "lobby" | "countdown" | "race" | "end"
  until: number
  time: number
  seats: string
  orbs: Map<string, number>
  players: Map<string, SPlayer>
  result: string
}

/** Uma nave como chegou no último pacote. */
export interface CarSample extends RemoteCar {
  gone: boolean
  /** Tempo da sala quando o pacote saiu (s). */
  t: number
}

const CLOSE_REPLACED = 4009
const PING_MS = 2000
const FIELDS = 9

export class CorridaNet {
  status: CorridaNetStatus = "connecting"
  /** Na espera: quem já entrou e até quando espera (ms, relógio da sala). */
  lobby: { names: string[]; until: number } = { names: [], until: 0 }
  start: CorridaStart | null = null
  /** Última amostra de cada nave (índice = nave). */
  readonly cars: (CarSample | null)[] = []
  /** Cápsulas fora pela sala (id → s até voltar). */
  readonly orbs = new Map<number, number>()
  result: CorridaResultRow[] | null = null
  private room: Room<unknown, SState> | null = null
  private disposed = false
  private offset: number | null = null
  private rtt = 0.12
  /** Fim da espera no relógio deste aparelho (ms). */
  private lobbyUntil = 0
  private pingTimer: ReturnType<typeof setInterval> | null = null
  private startResolve: ((s: CorridaStart) => void) | null = null
  private denied: number[] = []

  constructor(
    session: CorridaSession,
    private readonly hooks: { onLobby?: (names: string[], until: number) => void; onStatus?: (s: CorridaNetStatus) => void } = {},
  ) {
    void this.connect(session)
  }

  /** Espera a largada (a sala decide: cheia ou fim do minuto). Rejeita se cair antes. */
  ready(signal?: AbortSignal): Promise<CorridaStart> {
    return new Promise<CorridaStart>((resolve, reject) => {
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

  private setStatus(s: CorridaNetStatus) {
    if (this.status === s) return
    this.status = s
    if (!this.disposed) this.hooks.onStatus?.(s)
  }

  private async connect(session: CorridaSession) {
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
      // a sala diz quanto falta: o prazo fica no relógio deste aparelho
      this.lobbyUntil = Date.now() + Math.max(0, Number(m.left) || 0)
      this.hooks.onLobby?.(this.lobby.names, this.lobbyUntil)
    })
    room.onMessage("replaced", () => {
      replaced = true
    })
    room.onMessage("start", (m: CorridaStart) => {
      if (this.disposed) return
      this.start = m
      this.startResolve?.(m)
      this.startResolve = null
    })
    room.onMessage("s", (m: { t: number; c: number[] }) => this.onSnapshot(m))
    room.onMessage("deny", (m: { orb: number }) => this.denied.push(m.orb))
    room.onMessage("pong", (m: { c: number; t: number }) => {
      const now = performance.now()
      this.rtt = Math.max(0.01, Math.min(1, (now - m.c) / 1000))
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
    const until = this.lobbyUntil
    this.lobby = { names: players.map((p) => p.name), until }
    if (s.phase === "lobby") this.hooks.onLobby?.(this.lobby.names, until)
    this.orbs.clear()
    for (const [id, left] of s.orbs) this.orbs.set(Number(id), left)
    if (s.phase === "end" && !this.result && s.result) {
      try {
        this.result = (JSON.parse(s.result) as { rows: CorridaResultRow[] }).rows
      } catch {
        this.result = []
      }
    }
  }

  private onSnapshot(m: { t: number; c: number[] }) {
    if (this.disposed || !Array.isArray(m.c)) return
    const now = performance.now() / 1000
    // "agora" da sala = tempo do pacote + meia ida e volta
    const cand = m.t + this.rtt / 2 - now
    this.offset = this.offset === null || Math.abs(cand - this.offset) > 0.5 ? cand : this.offset + (cand - this.offset) * 0.1
    const n = Math.floor(m.c.length / FIELDS)
    for (let i = 0; i < n; i++) {
      const k = i * FIELDS
      const f = m.c[k + 6]
      this.cars[i] = {
        dist: m.c[k],
        u: m.c[k + 1],
        Y: m.c[k + 2],
        yaw: m.c[k + 3],
        v: m.c[k + 4],
        vy: m.c[k + 5],
        air: !!(f & 1),
        boost: !!(f & 2),
        down: !!(f & 4),
        gone: !!(f & 8),
        steer: m.c[k + 7],
        throttle: m.c[k + 8],
        t: m.t,
      }
    }
  }

  /** Tempo da corrida agora, pelo relógio da sala (null antes do primeiro pacote). */
  serverTime(): number | null {
    return this.offset === null ? null : performance.now() / 1000 + this.offset
  }

  sendPose(c: RemoteCar) {
    const r = (v: number, k = 1000) => Math.round(v * k) / k
    this.room?.send("p", {
      d: r(c.dist, 100),
      u: r(c.u),
      y: r(c.Y),
      w: r(c.yaw),
      v: r(c.v, 100),
      vy: r(c.vy, 100),
      f: (c.air ? 1 : 0) | (c.boost ? 2 : 0) | (c.down ? 4 : 0),
      s: r(c.steer, 100),
      th: r(c.throttle, 100),
    })
  }

  claimOrb(id: number) {
    this.room?.send("o", { id })
  }

  /** Cápsulas negadas desde a última pergunta. */
  takeDenied(): number[] {
    const d = this.denied
    this.denied = []
    return d
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
export async function joinCorrida(
  fetchSession: () => Promise<CorridaSession | null>,
  hooks: { signal: AbortSignal; onLobby: (names: string[], until: number) => void; onStatus: (s: CorridaNetStatus) => void },
): Promise<{ net: CorridaNet; start: CorridaStart } | null> {
  const session = await fetchSession()
  if (!session || hooks.signal.aborted) return null
  const net = new CorridaNet(session, { onLobby: hooks.onLobby, onStatus: hooks.onStatus })
  try {
    const start = await net.ready(hooks.signal)
    return { net, start }
  } catch {
    net.dispose()
    return null
  }
}
