// features/meu-mundo/engine/net.ts
//
// Conexão com a sala multiplayer do bairro (Colyseus).
//
// Quem diz em que sala entrar é o BACKEND autenticado: o cliente só consome a
// reserva de lugar que veio na resposta de /meu-mundo/admin/*. Nada aqui
// afirma identidade, bairro ou posição.
//
// ═══ RECONEXÃO ═══
// A reconexão automática do SDK (por token) fica DESLIGADA de propósito: ela
// voltaria à sala sem passar pelo backend. Ao cair, este módulo pede uma
// reserva NOVA ao backend (que revalida login, papel e residência) e entra de
// novo — tentativas limitadas, espera progressiva. A sala mantém uma sessão
// por usuário: a nova substitui a antiga sem presença duplicada.
//
// Envio: só intenção de movimento, no máximo ~12×/s e só quando muda (mais um
// lembrete a cada 1 s andando). Nunca uma mensagem por quadro.

import { Client, type Room } from "@colyseus/sdk"
import { getPublicBackendUrl } from "@/lib/backend-public"
import type { BodyId, MultiplayerSession, NetStatus } from "../types"
import type { Intent } from "./motion"

const BACKOFF_MS = [1000, 2000, 4000, 8000, 15000, 20000]
const SEND_MIN_MS = 80
const KEEPALIVE_MS = 1000
const CLOSE_REPLACED = 4009
const CLOSE_FORBIDDEN = 4003

export interface RemoteState {
  name: string
  house: number
  body: string
  x: number
  z: number
  facing: number
  move: number
}

export interface NetCallbacks {
  onStatus: (s: NetStatus) => void
  /** Posição de partida decidida pelo servidor (primeira entrada e reconexões). */
  onWelcome: (p: { x: number; z: number; facing: number }) => void
  /** O servidor tirou você de dentro de uma casa que cresceu (troca de nível). */
  onMoved?: (p: { x: number; z: number; facing: number }) => void
  /** Pede ao backend uma reserva nova. null = sem acesso (não insistir). */
  fetchSession: () => Promise<MultiplayerSession | null>
}

/** Nível confirmado de uma casa (chave = número do lote). Só número e revisão. */
export interface HouseLevelState {
  level: number
  rev: number
}

type MMRoom = Room<unknown, { players: Map<string, RemoteState>; houses?: Map<string, HouseLevelState> }>

export class NetClient {
  private client: Client | null = null
  private room: MMRoom | null = null
  private timer: ReturnType<typeof setTimeout> | null = null
  private attempt = 0
  private disposed = false
  private lastSent: Intent = { x: 0, z: 0, run: false }
  private lastSentAt = 0
  status: NetStatus = "connecting"

  constructor(private readonly cb: NetCallbacks) {}

  private setStatus(s: NetStatus) {
    if (this.status === s) return
    this.status = s
    if (!this.disposed) this.cb.onStatus(s)
  }

  get sessionId() {
    return this.room?.sessionId ?? null
  }

  /** Jogadores da sala (estado decodificado). Lido a cada quadro pelo jogo. */
  players(): Map<string, RemoteState> | null {
    const st = this.room?.state as { players?: Map<string, RemoteState> } | undefined
    return st?.players ?? null
  }

  /** Nível confirmado de cada casa segundo a sala. */
  houses(): Map<string, HouseLevelState> | null {
    const st = this.room?.state as { houses?: Map<string, HouseLevelState> } | undefined
    return st?.houses ?? null
  }

  /** Titulares do bairro segundo a sala (atualiza quando alguém se muda). */
  residents(): number | null {
    const st = this.room?.state as { residents?: number } | undefined
    return typeof st?.residents === "number" && st.residents > 0 ? st.residents : null
  }

  async connect(session: MultiplayerSession) {
    if (this.disposed) return
    this.setStatus(this.attempt === 0 ? "connecting" : "reconnecting")
    const endpoint = getPublicBackendUrl().replace(/^http/, "ws") + session.wsPath
    this.client = new Client(endpoint)
    let room: MMRoom
    try {
      room = (await this.client.consumeSeatReservation(session.reservation as never)) as unknown as MMRoom
    } catch {
      this.scheduleRetry()
      return
    }
    if (this.disposed) {
      void room.leave(true)
      return
    }
    room.reconnection.enabled = false
    this.room = room
    this.attempt = 0
    this.lastSentAt = 0
    let replaced = false
    room.onMessage("welcome", (p: { x: number; z: number; facing: number }) => {
      if (!this.disposed) this.cb.onWelcome(p)
    })
    room.onMessage("moved", (p: { x: number; z: number; facing: number }) => {
      if (!this.disposed) this.cb.onMoved?.(p)
    })
    room.onMessage("replaced", () => {
      replaced = true
    })
    room.onLeave((code) => {
      if (this.room === room) this.room = null
      if (this.disposed) return
      if (replaced || code === CLOSE_REPLACED) {
        this.setStatus("replaced")
        return
      }
      if (code === CLOSE_FORBIDDEN) {
        this.setStatus("offline")
        return
      }
      this.scheduleRetry()
    })
    this.setStatus("online")
  }

  private scheduleRetry() {
    if (this.disposed) return
    if (this.attempt >= BACKOFF_MS.length) {
      this.setStatus("offline")
      return
    }
    this.setStatus("reconnecting")
    const wait = BACKOFF_MS[this.attempt++]
    this.timer = setTimeout(async () => {
      this.timer = null
      if (this.disposed) return
      // fetchSession: sessão = entra; null = sem acesso (para); erro de rede = tenta de novo.
      let session: MultiplayerSession | null | "retry"
      try {
        session = await this.cb.fetchSession()
      } catch {
        session = "retry"
      }
      if (this.disposed) return
      if (session === null) this.setStatus("offline")
      else if (session === "retry") this.scheduleRetry()
      else void this.connect(session)
    }, wait)
  }

  /** Recomeça do zero (botão "tentar de novo" ou retomar após substituição). */
  async retry() {
    if (this.disposed) return
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    this.attempt = 0
    if (this.room) await this.room.leave(true).catch(() => {})
    this.room = null
    this.setStatus("reconnecting")
    try {
      const s = await this.cb.fetchSession()
      if (!s) return this.setStatus("offline")
      await this.connect(s)
    } catch {
      this.scheduleRetry()
    }
  }

  sendIntent(intent: Intent, now: number) {
    const room = this.room
    if (!room) return
    const changed =
      Math.abs(intent.x - this.lastSent.x) > 0.08 ||
      Math.abs(intent.z - this.lastSent.z) > 0.08 ||
      intent.run !== this.lastSent.run
    const moving = intent.x !== 0 || intent.z !== 0
    if (now - this.lastSentAt < SEND_MIN_MS) return
    if (!changed && !(moving && now - this.lastSentAt > KEEPALIVE_MS)) return
    room.send("in", {
      x: Math.round(intent.x * 1000) / 1000,
      z: Math.round(intent.z * 1000) / 1000,
      r: intent.run ? 1 : 0,
    })
    this.lastSent = { ...intent }
    this.lastSentAt = now
  }

  sendBody(body: BodyId) {
    this.room?.send("body", { body })
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    const room = this.room
    this.room = null
    if (room) void room.leave(true).catch(() => {})
    this.client = null
  }
}
