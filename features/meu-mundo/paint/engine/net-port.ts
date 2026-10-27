// features/meu-mundo/paint/engine/net-port.ts — PAINT (mm3d-35): a porta da sala.
//
// Mesma interface do treino (port.ts), falando com a PaintRoom do backend
// (src/realtime/meuMundoPaint.js). Quem diz em que sala entrar é o backend
// (POST /center/paint); o cliente só consome a reserva. Caiu: pede reserva
// nova com o roomId em que estava (volta à mesma vaga), com espera crescente.
//
// O estado mora numa CÓPIA da partida (PaintMatch) preenchida pelo estado da
// sala (~20×/s): jogadores, tinta, gatinhos, cápsulas, portais, chefão. Os
// acontecimentos instantâneos chegam no pacote `ev` e saem para a cena no
// mesmo formato do treino. A tinta de quem joga é PREVISTA: a mancha aparece
// (e já dá para pisar nela) na hora, com id negativo; a confirmada da sala
// traz o número do tiro e toma o lugar dela (recusada: some).

import { Client, type Room } from "@colyseus/sdk"
import { getPublicBackendUrl } from "@/lib/backend-public"
import type { BodyId, PaintSession } from "../../types"
import { PaintMatch, type BossAct, type MatchEvent, type PaintPose } from "../sim/match"
import { resolveShot, type NewBlob } from "../sim/paint"
import { PAINT, TUNING, modeCapacity, type PaintColor, type PaintMode } from "../sim/tuning"
import type { Vec3 } from "../sim/map"
import type { PaintPort, PortPlayerInfo, RemoteSample } from "./port"

export type { PaintSession }

export type NetPhase = "lobby" | "countdown" | "play" | "end"
export type PaintNetStatus = "connecting" | "online" | "reconnecting" | "replaced" | "offline"

interface SPlayer {
  slot: number
  team: number
  sit: number
  name: string
  body: string
  look?: string
  online: boolean
  x: number
  y: number
  z: number
  f: number
  g: boolean
  e: number
  hp: number
  a0: number
  a1: number
  a2: number
  cats: number
  dmg: number
  ko: number
  boss: boolean
}
interface SBlob {
  c: number
  x: number
  z: number
  y0: number
  y1: number
  r: number
  team: number
  owner: number
  q: number
}
interface SState {
  phase: NetPhase
  mode: string
  until: number
  time: number
  cats: Map<string, number>
  caps: Map<string, number>
  tc0: number
  tc1: number
  p0: boolean
  p1: boolean
  bossHp: number
  /** Chefão (mm3d-38): posição, para onde olha, o que faz e desde quando (s de partida). */
  bx: number
  bz: number
  bf: number
  ba: string
  bt: number
  players: Map<string, SPlayer>
  blobs: Map<string, SBlob>
  result: string
}

const BACKOFF_MS = [500, 1000, 2000, 4000, 8000]
const CLOSE_REPLACED = 4009
const CLOSE_FORBIDDEN = 4003
const POSE_MS = 66
/** Mancha prevista sem resposta da sala some depois disto (s). */
const PREDICT_TTL = 2.5

export class NetPort implements PaintPort {
  me = -1
  mode: PaintMode
  readonly predicts = true
  /** Cópia da partida (existe depois da espera). */
  state!: PaintMatch
  status: PaintNetStatus = "connecting"
  /** Poses dos outros (vaga → amostras recentes), para a cena interpolar. */
  readonly samples = new Map<number, RemoteSample[]>()
  private room: Room<unknown, SState> | null = null
  private lastRoomId: string | null = null
  private attempt = 0
  private timer: ReturnType<typeof setTimeout> | null = null
  private disposed = false
  private queue: MatchEvent[] = []
  private known = new Set<string>()
  private predicted = new Map<number, number>() // id previsto (negativo) → hora local
  private clock = 0
  private patchTime = 0
  private patchAt = 0
  private lastPose: PaintPose | null = null
  private poseAt = 0
  private ended = false
  private readyResolve: (() => void) | null = null
  private names = new Map<number, PortPlayerInfo>()

  constructor(
    session: PaintSession,
    private readonly refetch: (roomId: string | null) => Promise<PaintSession | null>,
    private readonly hooks: { onLobby?: (n: number, cap: number) => void; onStatus?: (s: PaintNetStatus) => void } = {},
  ) {
    this.mode = session.mode
    void this.connect(session)
  }

  /** Espera a sala encher (ou o treino começar). Rejeita se cair antes. */
  ready(signal?: AbortSignal) {
    return new Promise<void>((resolve, reject) => {
      if (this.state) return resolve()
      this.readyResolve = resolve
      const fail = () => reject(new Error("abort"))
      signal?.addEventListener("abort", fail, { once: true })
      const watch = setInterval(() => {
        if (this.disposed || this.status === "offline" || this.status === "replaced") {
          clearInterval(watch)
          fail()
        } else if (this.state) clearInterval(watch)
      }, 200)
    })
  }

  private setStatus(s: PaintNetStatus) {
    if (this.status === s) return
    this.status = s
    if (!this.disposed) this.hooks.onStatus?.(s)
  }

  private async connect(session: PaintSession) {
    if (this.disposed) return
    this.setStatus(this.attempt === 0 ? "connecting" : "reconnecting")
    const client = new Client(getPublicBackendUrl().replace(/^http/, "ws") + session.multiplayer.wsPath)
    let room: Room<unknown, SState>
    try {
      room = (await client.consumeSeatReservation(session.multiplayer.reservation as never)) as unknown as Room<unknown, SState>
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
    this.lastRoomId = room.roomId
    this.attempt = 0
    let replaced = false
    room.onMessage("welcome", (p: { slot: number }) => {
      this.me = p.slot
    })
    room.onMessage("replaced", () => {
      replaced = true
    })
    room.onMessage("ev", (list: MatchEvent[]) => {
      if (!this.disposed && this.state) this.onEvents(list)
    })
    room.onMessage("pong", () => {})
    room.onStateChange((s) => {
      if (!this.disposed) this.onState(s as SState)
    })
    room.onLeave((code) => {
      if (this.room === room) this.room = null
      if (this.disposed) return
      if (replaced || code === CLOSE_REPLACED) return this.setStatus("replaced")
      if (code === CLOSE_FORBIDDEN || this.ended) return this.setStatus("offline")
      this.scheduleRetry()
    })
    this.setStatus("online")
  }

  private scheduleRetry() {
    if (this.disposed) return
    if (this.attempt >= BACKOFF_MS.length) return this.setStatus("offline")
    this.setStatus("reconnecting")
    const wait = BACKOFF_MS[this.attempt++]
    this.timer = setTimeout(async () => {
      this.timer = null
      if (this.disposed) return
      let next: PaintSession | null | "retry"
      try {
        next = await this.refetch(this.lastRoomId)
      } catch {
        next = "retry"
      }
      if (this.disposed) return
      if (next === null) this.setStatus("offline")
      else if (next === "retry") this.scheduleRetry()
      else void this.connect(next)
    }, wait)
  }

  // ── estado da sala → cópia ────────────────────────────────────────────────

  private onState(s: SState) {
    const players = [...s.players.values()]
    for (const p of players) this.names.set(p.slot, { name: p.name, body: (p.body || "normal") as BodyId, look: p.look || "" })
    if (!this.state) {
      if (s.phase === "lobby" || this.me < 0) {
        this.hooks.onLobby?.(players.length, modeCapacity(this.mode))
        return
      }
      this.state = new PaintMatch(
        this.mode,
        players.map((p) => ({ slot: p.slot, team: p.team, sit: p.sit })),
      )
      for (const [id, team] of s.cats) this.state.catsTaken.set(Number(id), team)
      for (const [id, at] of s.caps) this.state.capsuleBack.set(Number(id), at)
      for (const [id, b] of s.blobs) {
        this.state.putBlob(Number(id), b.owner, b.team, toBlob(b))
        this.known.add(id)
      }
      const mine = this.state.players.get(this.me)
      const sp = players.find((p) => p.slot === this.me)
      if (mine && sp) {
        mine.pose = { x: sp.x, y: sp.y, z: sp.z, facing: sp.f, ground: sp.g, gy: sp.y, e: sp.e }
        mine.epoch = sp.e
      }
      this.copy(s)
      this.readyResolve?.()
      this.readyResolve = null
      return
    }
    this.copy(s)
  }

  private copy(s: SState) {
    const m = this.state
    const now = performance.now()
    this.patchTime = s.time
    this.patchAt = now
    if (s.phase === "countdown" || s.phase === "play") m.phase = s.phase
    m.teamCats[0] = s.tc0
    m.teamCats[1] = s.tc1
    m.portalOpen[0] = s.p0
    m.portalOpen[1] = s.p1
    m.bossHp = s.bossHp
    if (s.ba) {
      m.boss.x = s.bx
      m.boss.z = s.bz
      m.boss.facing = s.bf
      m.boss.act = s.ba as BossAct
      m.boss.at = s.bt
    }
    for (const p of s.players.values()) {
      const mp = m.players.get(p.slot)
      if (!mp) continue
      mp.hp = p.hp
      mp.ammo[0] = p.a0
      mp.ammo[1] = p.a1
      mp.ammo[2] = p.a2
      mp.cats = p.cats
      mp.dmg = p.dmg
      mp.ko = p.ko
      mp.inBoss = p.boss
      mp.online = p.online
      if (p.slot === this.me) continue
      mp.epoch = p.e
      mp.pose = { x: p.x, y: p.y, z: p.z, facing: p.f, ground: p.g, gy: p.y, e: p.e }
      const list = this.samples.get(p.slot) ?? []
      const last = list[list.length - 1]
      if (!last || last.x !== p.x || last.y !== p.y || last.z !== p.z || last.f !== p.f || now - last.t > 200) {
        list.push({ t: now, x: p.x, y: p.y, z: p.z, f: p.f, g: p.g })
        if (list.length > 24) list.splice(0, list.length - 24)
        this.samples.set(p.slot, list)
      }
    }
    // tinta: o que entrou e o que saiu
    const seen = new Set<string>()
    for (const [id, b] of s.blobs) {
      seen.add(id)
      if (this.known.has(id)) continue
      this.known.add(id)
      const blob = toBlob(b)
      const n = Number(id)
      if (b.owner === this.me && b.q && this.predicted.has(-b.q)) {
        this.predicted.delete(-b.q)
        m.takeBlob(-b.q)
      }
      m.putBlob(n, b.owner, b.team, blob)
      this.queue.push({ type: "blob", id: n, owner: b.owner, team: b.team, blob, q: b.owner === this.me ? b.q : 0 })
    }
    for (const id of [...this.known]) {
      if (seen.has(id)) continue
      this.known.delete(id)
      m.takeBlob(Number(id))
      this.queue.push({ type: "unblob", id: Number(id) })
    }
    // gatinhos/cápsulas (o `ev` avisa; o estado garante quem chega depois)
    for (const [id, team] of s.cats) m.catsTaken.set(Number(id), team)
    for (const id of [...m.catsTaken.keys()]) {
      if (s.cats.has(String(id))) continue
      m.catsTaken.delete(id)
      this.queue.push({ type: "catBack", id })
    }
    if (s.phase === "end" && !this.ended && s.result) {
      this.ended = true
      try {
        m.result = JSON.parse(s.result)
      } catch {
        m.result = { winnerSlot: -1, winnerTeam: -1, rows: [] }
      }
      m.phase = "end"
      this.queue.push({ type: "end", reason: m.bossHp <= 0 ? "boss" : "time" })
    }
  }

  private onEvents(list: MatchEvent[]) {
    const m = this.state
    for (const e of list) {
      switch (e.type) {
        case "cat":
          m.catsTaken.set(e.id, e.team)
          break
        case "catBack":
          // o estado também avisa: só repassa se ainda não tinha saído
          if (!m.catsTaken.delete(e.id)) continue
          break
        case "capsule":
          m.capsuleBack.set(e.id, m.time + TUNING.capsuleRespawn)
          break
        case "capsuleBack":
          m.capsuleBack.delete(e.id)
          break
        case "respawn":
          if (e.slot === this.me) {
            const mp = m.players.get(this.me)
            if (mp) {
              mp.epoch = e.e
              mp.inBoss = e.inBoss
              mp.ko = 0
            }
            if (this.lastPose) this.lastPose = { ...this.lastPose, x: e.x, y: e.y, z: e.z, e: e.e }
          }
          this.samples.delete(e.slot)
          break
        case "deny":
          if (this.predicted.delete(-e.q)) m.takeBlob(-e.q)
          break
        case "blob":
        case "unblob":
          continue // vêm do estado
      }
      this.queue.push(e)
    }
  }

  // ── PaintPort ─────────────────────────────────────────────────────────────

  info(slot: number) {
    return this.names.get(slot) ?? null
  }

  pose(p: PaintPose) {
    const mp = this.state?.players.get(this.me)
    if (mp) mp.pose = { ...p }
    this.lastPose = p
    const now = performance.now()
    if (!this.room || now - this.poseAt < POSE_MS) return
    this.poseAt = now
    this.room.send("p", { x: r3(p.x), y: r3(p.y), z: r3(p.z), f: r3(p.facing), g: p.ground ? 1 : 0, gy: r3(p.gy), e: p.e })
  }

  fire(c: PaintColor, o: Vec3, dir: Vec3, q: number) {
    const m = this.state
    const me = m?.players.get(this.me)
    if (!m || !me || !this.room) return
    // manda a pose junto (a sala confere a boca da arma com a pose dela)
    if (this.lastPose) {
      this.poseAt = 0
      this.pose(this.lastPose)
    }
    this.room.send("f", { c, o: [r3(o.x), r3(o.y), r3(o.z)], d: [r3(dir.x), r3(dir.y), r3(dir.z)], q })
    me.ammo[c] = Math.max(0, me.ammo[c] - TUNING.cost[c])
    if (c === PAINT.HARM) return
    const q0 = me.pose
    const res = resolveShot(
      { solids: m.solids(), bodies: [], boss: null },
      { slot: this.me, team: me.team, x: q0.x, y: q0.y, z: q0.z, ground: q0.ground, gy: q0.gy, facing: q0.facing },
      c,
      o,
      dir,
    )
    if (res.kind !== "blob") return
    m.putBlob(-q, this.me, me.team, res.blob)
    this.predicted.set(-q, this.clock)
    this.queue.push({ type: "blob", id: -q, owner: this.me, team: me.team, blob: res.blob, q: 0 })
  }

  punch() {
    this.room?.send("u", {})
  }

  tick(dt: number) {
    this.clock += dt
    const m = this.state
    if (m) {
      // relógio da partida: o último da sala + o tempo desde então (no máximo 0,3 s à frente)
      if (m.phase !== "end") m.time = this.patchTime + Math.min(0.3, (performance.now() - this.patchAt) / 1000)
      for (const [id, at] of this.predicted) {
        if (this.clock - at < PREDICT_TTL) continue
        this.predicted.delete(id)
        m.takeBlob(id)
        this.queue.push({ type: "unblob", id })
      }
    }
    const out = this.queue
    this.queue = []
    return out
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    if (this.timer) clearTimeout(this.timer)
    const room = this.room
    this.room = null
    if (room) void room.leave(true).catch(() => {})
  }
}

function toBlob(b: SBlob): NewBlob {
  return { c: b.c as PaintColor, x: b.x, z: b.z, y0: b.y0, y1: b.y1, r: b.r }
}

const r3 = (v: number) => Math.round(v * 1000) / 1000
