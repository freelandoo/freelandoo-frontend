// features/meu-mundo/paint/sim/match.ts — PAINT (mm3d-35): a partida.
//
// O ESTADO do jogo (não o movimento): munição, cápsulas, corações, nocaute,
// tinta no mundo, gatinhos, portal de cada time, chefão, tempo e resultado.
// A sala (PaintRoom) roda esta classe e é a autoridade; o treino sem sala
// roda a mesma no aparelho. Quem usa: `pose()` com o que o aparelho diz,
// `fire()`/`punch()` nos botões, `tick(dt)` no relógio e `drain()` para os
// acontecimentos (o que aparece/some, quem levou dano, quem pegou o quê).
//
// O movimento é do aparelho; `pose()` só recusa o impossível (velocidade
// acima do que soco + corrida explicam) e devolve "volte para onde estava".
// Depois de um renascimento a época sobe: pose de época velha é ignorada (é
// do caminho de antes do teleporte).

import { PAINT, TUNING, modeTeams, type PaintColor, type PaintMode } from "./tuning"
import { buildPaintMap, fellOut, spawnPoint, type PaintMap, type Solid, type Vec3 } from "./map"
import { blobSolid, muzzleOf, punchReachesBoss, punchTargets, resolveShot, type NewBlob, type ShotTargetBody } from "./paint"

export type MatchPhase = "countdown" | "play" | "end"

export interface PaintPose {
  x: number
  y: number
  z: number
  facing: number
  ground: boolean
  gy: number
  /** Época (renascimentos). */
  e: number
}

export interface MatchPlayer {
  slot: number
  team: number
  /** Vaga dentro do time (lugar na base). */
  sit: number
  hp: number
  ammo: [number, number, number]
  cats: number
  dmg: number
  /** Nocaute até (s de partida); 0 = de pé. */
  ko: number
  /** Sem tomar dano até (s). */
  shield: number
  inBoss: boolean
  epoch: number
  pose: PaintPose
  /** Próximo tiro permitido por cor (s) e próximo soco. */
  nextFire: [number, number, number]
  nextPunch: number
  /** Manchas desta pessoa, da mais velha para a mais nova (limite por jogador). */
  blobs: number[]
  online: boolean
}

export interface MatchBlob {
  id: number
  owner: number
  team: number
  born: number
  solid: Solid
  blob: NewBlob
}

export type MatchEvent =
  | { type: "blob"; id: number; owner: number; team: number; blob: NewBlob; q: number }
  | { type: "unblob"; id: number }
  | { type: "shot"; slot: number; c: PaintColor; o: Vec3; to: Vec3; q: number }
  | { type: "deny"; slot: number; q: number }
  | { type: "hit"; slot: number; by: number; hp: number; kx: number; ky: number; kz: number; how: "harm" | "punch" }
  | { type: "ko"; slot: number; by: number }
  | { type: "respawn"; slot: number; x: number; y: number; z: number; facing: number; e: number; inBoss: boolean }
  | { type: "fix"; slot: number; pose: PaintPose }
  | { type: "splat"; point: Vec3; normal: Vec3 }
  | { type: "cat"; id: number; slot: number; team: number }
  | { type: "capsule"; id: number; slot: number; c: PaintColor }
  | { type: "capsuleBack"; id: number }
  | { type: "portal"; team: number }
  | { type: "boss"; slot: number; dmg: number; hp: number }
  | { type: "punch"; slot: number }
  | { type: "end"; reason: "boss" | "time" }

export interface MatchResult {
  /** Quem deu mais dano no chefão (-1 = ninguém deu dano). */
  winnerSlot: number
  /** Time vencedor (dano do campeão; sem dano, mais gatinhos; -1 = empate). */
  winnerTeam: number
  rows: { slot: number; team: number; dmg: number; cats: number }[]
}

const POSE_SPEED = 13
const POSE_SLACK = 1.6
/** A boca da arma que o aparelho diz pode estar até isto longe da que a sala calcula. */
const MUZZLE_SLACK = 2.6

export class PaintMatch {
  readonly map: PaintMap
  readonly mode: PaintMode
  phase: MatchPhase = "countdown"
  /** s desde o "vai" (negativo na contagem). */
  time: number
  readonly players = new Map<number, MatchPlayer>()
  readonly blobs = new Map<number, MatchBlob>()
  /** gatinho → time que pegou. */
  readonly catsTaken = new Map<number, number>()
  /** cápsula → volta em (s); ausente = disponível. */
  readonly capsuleBack = new Map<number, number>()
  readonly teamCats: [number, number] = [0, 0]
  readonly portalOpen: [boolean, boolean] = [false, false]
  bossHp: number = TUNING.bossHp
  result: MatchResult | null = null
  private events: MatchEvent[] = []
  private blobSeq = 1
  private solidsCache: Solid[] | null = null
  private poseAt = new Map<number, number>()

  constructor(mode: PaintMode, seats: { slot: number; team: number; sit: number }[], map: PaintMap = buildPaintMap()) {
    this.map = map
    this.mode = mode
    this.time = -TUNING.countdown
    const teams = modeTeams(mode)
    for (const s of seats) {
      const team = Math.min(s.team, teams - 1)
      const sp = spawnPoint(map, team, s.sit, false)
      this.players.set(s.slot, {
        slot: s.slot,
        team,
        sit: s.sit,
        hp: TUNING.hearts,
        ammo: [TUNING.ammoStart, TUNING.ammoStart, TUNING.ammoStart],
        cats: 0,
        dmg: 0,
        ko: 0,
        shield: 0,
        inBoss: false,
        epoch: 0,
        pose: { x: sp.x, y: sp.y, z: sp.z, facing: sp.facing, ground: true, gy: sp.y, e: 0 },
        nextFire: [0, 0, 0],
        nextPunch: 0,
        blobs: [],
        online: true,
      })
    }
  }

  /** Mundo para tiro e para o corpo: o mapa parado + a tinta viva. */
  solids(): Solid[] {
    if (!this.solidsCache) {
      const out = this.map.solids.slice()
      for (const b of this.blobs.values()) out.push(b.solid)
      this.solidsCache = out
    }
    return this.solidsCache
  }

  bossAlive() {
    return this.bossHp > 0
  }

  bossBody() {
    const b = this.map.boss
    return { x: b.x, y: b.y, z: b.z, r: TUNING.bossR, h: TUNING.bossH }
  }

  drain(): MatchEvent[] {
    const out = this.events
    this.events = []
    return out
  }

  private emit(e: MatchEvent) {
    this.events.push(e)
  }

  private standing(p: MatchPlayer) {
    return this.phase === "play" && !p.ko
  }

  /** Corpos alvo (de pé, no mesmo lugar — arena ou chefão — de quem atira). */
  private bodies(inBoss: boolean): ShotTargetBody[] {
    const out: ShotTargetBody[] = []
    for (const p of this.players.values()) {
      if (p.ko || p.inBoss !== inBoss || !p.online) continue
      out.push({ slot: p.slot, team: p.team, x: p.pose.x, y: p.pose.y, z: p.pose.z })
    }
    return out
  }

  // ── movimento ─────────────────────────────────────────────────────────────

  /** O aparelho diz onde está. false = recusado (a sala manda o `fix`). */
  pose(slot: number, next: PaintPose, now = this.time): boolean {
    const p = this.players.get(slot)
    if (!p) return false
    if (next.e !== p.epoch) return true // caminho de antes do renascimento: ignora
    if (![next.x, next.y, next.z, next.facing, next.gy].every(Number.isFinite)) return false
    const last = this.poseAt.get(slot)
    const dt = last === undefined ? 1 : Math.max(0.03, now - last)
    const cur = p.pose
    const dh = Math.hypot(next.x - cur.x, next.z - cur.z)
    const up = next.y - cur.y
    if (this.phase !== "countdown" && (dh > POSE_SPEED * dt + POSE_SLACK || up > 9 * dt + POSE_SLACK)) {
      this.emit({ type: "fix", slot, pose: { ...cur } })
      return false
    }
    // Na contagem ninguém sai do lugar.
    if (this.phase === "countdown" && dh > 0.5) {
      this.emit({ type: "fix", slot, pose: { ...cur } })
      return false
    }
    p.pose = { ...next }
    this.poseAt.set(slot, now)
    return true
  }

  // ── tiro e soco ───────────────────────────────────────────────────────────

  /**
   * Tiro de `slot` com a cor `c`. `o` = boca da arma no aparelho, `dir` = mira,
   * `q` = número do tiro no aparelho (para ele trocar a tinta prevista pela
   * confirmada, ou desfazer).
   */
  fire(slot: number, c: PaintColor, o: Vec3, dir: Vec3, q: number) {
    const p = this.players.get(slot)
    if (!p || !this.standing(p) || !(c === 0 || c === 1 || c === 2)) return this.deny(slot, q)
    if (![o.x, o.y, o.z, dir.x, dir.y, dir.z].every(Number.isFinite)) return this.deny(slot, q)
    const cost = TUNING.cost[c]
    // folga de 30 ms no ritmo (o relógio do aparelho não é o da sala)
    if (p.ammo[c] < cost || this.time + 0.03 < p.nextFire[c]) return this.deny(slot, q)
    const m = muzzleOf(p.pose, p.pose.facing)
    if (Math.hypot(o.x - m.x, o.y - m.y, o.z - m.z) > MUZZLE_SLACK) return this.deny(slot, q)
    p.ammo[c] -= cost
    p.nextFire[c] = Math.max(p.nextFire[c], this.time) + 1 / TUNING.fireRate[c]
    const res = resolveShot(
      { solids: this.solids(), bodies: this.bodies(p.inBoss), boss: p.inBoss && this.bossAlive() ? this.bossBody() : null },
      { slot, team: p.team, x: p.pose.x, y: p.pose.y, z: p.pose.z, ground: p.pose.ground, gy: p.pose.gy, facing: p.pose.facing },
      c,
      o,
      dir,
    )
    let to: Vec3 = { x: o.x + dir.x * 6, y: o.y + dir.y * 6, z: o.z + dir.z * 6 }
    if (res.kind === "blob") {
      const id = this.blobSeq++
      const solid = blobSolid(res.blob, id, p.team)
      this.blobs.set(id, { id, owner: slot, team: p.team, born: this.time, solid, blob: res.blob })
      this.solidsCache = null
      p.blobs.push(id)
      while (p.blobs.length > TUNING.blobsPerPlayer) this.removeBlob(p.blobs[0])
      to = { x: res.blob.x, y: res.blob.y1, z: res.blob.z }
      this.emit({ type: "blob", id, owner: slot, team: p.team, blob: res.blob, q })
    } else {
      if (q) this.emit({ type: "deny", slot, q }) // não virou tinta: o aparelho apaga a prevista, se houver
      if (res.kind === "player") {
        to = res.point
        this.damage(res.slot, slot, "harm")
      } else if (res.kind === "boss") {
        to = res.point
        this.hitBoss(slot, TUNING.bossHarm)
      } else if (res.kind === "erase") {
        to = res.point
        this.removeBlob(res.blob)
      } else if (res.kind === "splat") {
        to = res.point
        this.emit({ type: "splat", point: res.point, normal: res.normal })
      }
    }
    this.emit({ type: "shot", slot, c, o, to, q })
  }

  private deny(slot: number, q: number) {
    if (q) this.emit({ type: "deny", slot, q })
  }

  punch(slot: number) {
    const p = this.players.get(slot)
    if (!p || !this.standing(p) || this.time + 0.03 < p.nextPunch) return
    p.nextPunch = this.time + TUNING.punchCooldown
    this.emit({ type: "punch", slot })
    const a = { slot, team: p.team, x: p.pose.x, y: p.pose.y, z: p.pose.z, facing: p.pose.facing }
    for (const t of punchTargets(a, this.bodies(p.inBoss))) this.damage(t.slot, slot, "punch", t.kx, t.kz)
    if (p.inBoss && this.bossAlive() && punchReachesBoss(a, this.bossBody())) this.hitBoss(slot, TUNING.bossPunch)
  }

  private damage(slot: number, by: number, how: "harm" | "punch", kx = 0, kz = 0) {
    const v = this.players.get(slot)
    const a = this.players.get(by)
    if (!v || !a || v.ko || this.time < v.shield) return
    if (how === "harm") {
      const dx = v.pose.x - a.pose.x
      const dz = v.pose.z - a.pose.z
      const d = Math.hypot(dx, dz) || 1
      kx = (dx / d) * TUNING.harmKnock
      kz = (dz / d) * TUNING.harmKnock
    }
    v.hp = Math.max(0, v.hp - 1)
    this.emit({ type: "hit", slot, by, hp: v.hp, kx, ky: how === "punch" ? TUNING.punchLift : TUNING.harmLift, kz, how })
    if (v.hp === 0) {
      v.ko = this.time + TUNING.koTime
      this.emit({ type: "ko", slot, by })
    }
  }

  private hitBoss(slot: number, dmg: number) {
    const p = this.players.get(slot)
    if (!p || !this.bossAlive()) return
    const real = Math.min(dmg, this.bossHp)
    this.bossHp -= real
    p.dmg += real
    this.emit({ type: "boss", slot, dmg: real, hp: this.bossHp })
    if (!this.bossAlive()) this.finish("boss")
  }

  private removeBlob(id: number) {
    const b = this.blobs.get(id)
    if (!b) return
    this.blobs.delete(id)
    this.solidsCache = null
    const owner = this.players.get(b.owner)
    if (owner) {
      const i = owner.blobs.indexOf(id)
      if (i >= 0) owner.blobs.splice(i, 1)
    }
    this.emit({ type: "unblob", id })
  }

  private respawn(p: MatchPlayer) {
    const sp = spawnPoint(this.map, p.team, p.sit, p.inBoss)
    p.epoch++
    p.ko = 0
    p.hp = TUNING.hearts
    p.shield = this.time + TUNING.shield
    p.pose = { x: sp.x, y: sp.y, z: sp.z, facing: sp.facing, ground: true, gy: sp.y, e: p.epoch }
    this.poseAt.delete(p.slot)
    this.emit({ type: "respawn", slot: p.slot, x: sp.x, y: sp.y, z: sp.z, facing: sp.facing, e: p.epoch, inBoss: p.inBoss })
  }

  // ── relógio ───────────────────────────────────────────────────────────────

  tick(dt: number) {
    if (this.phase === "end") return
    this.time += dt
    if (this.phase === "countdown") {
      if (this.time >= 0) this.phase = "play"
      else return
    }
    const T = TUNING
    // tinta vencida
    for (const b of this.blobs.values()) if (this.time - b.born > T.blobLife) this.removeBlob(b.id)
    // cápsulas que voltam
    for (const [id, at] of this.capsuleBack) {
      if (this.time >= at) {
        this.capsuleBack.delete(id)
        this.emit({ type: "capsuleBack", id })
      }
    }
    for (const p of this.players.values()) {
      if (p.ko) {
        if (this.time >= p.ko) this.respawn(p)
        continue
      }
      const q = p.pose
      if (fellOut(q.y, p.inBoss)) {
        this.respawn(p)
        continue
      }
      // gatinhos (só na arena)
      if (!p.inBoss) {
        for (const c of this.map.cats) {
          if (this.catsTaken.has(c.id)) continue
          if (Math.abs(q.y - c.y) > 1.6 || Math.hypot(q.x - c.x, q.z - c.z) > T.catR) continue
          this.catsTaken.set(c.id, p.team)
          p.cats++
          this.teamCats[p.team]++
          this.emit({ type: "cat", id: c.id, slot: p.slot, team: p.team })
          if (!this.portalOpen[p.team] && this.teamCats[p.team] >= T.catsToPortal) {
            this.portalOpen[p.team] = true
            this.emit({ type: "portal", team: p.team })
          }
        }
        const portal = this.map.portals[p.team]
        if (this.portalOpen[p.team] && Math.abs(q.y - portal.y) < 2 && Math.hypot(q.x - portal.x, q.z - portal.z) <= T.portalR) {
          p.inBoss = true
          this.respawn(p)
          p.hp = T.hearts
          continue
        }
      }
      // cápsulas
      for (const cap of this.map.capsules) {
        if (this.capsuleBack.has(cap.id) || p.ammo[cap.c] >= T.ammoMax) continue
        if (Math.abs(q.y - cap.y) > 1.6 || Math.hypot(q.x - cap.x, q.z - cap.z) > T.capsuleR) continue
        p.ammo[cap.c] = Math.min(T.ammoMax, p.ammo[cap.c] + T.capsuleGive)
        this.capsuleBack.set(cap.id, this.time + T.capsuleRespawn)
        this.emit({ type: "capsule", id: cap.id, slot: p.slot, c: cap.c })
      }
    }
    if (this.time >= T.matchTime) this.finish("time")
  }

  finish(reason: "boss" | "time") {
    if (this.phase === "end") return
    this.phase = "end"
    const rows = [...this.players.values()].map((p) => ({ slot: p.slot, team: p.team, dmg: p.dmg, cats: p.cats }))
    let winnerSlot = -1
    let best = 0
    for (const r of rows) {
      if (r.dmg > best) {
        best = r.dmg
        winnerSlot = r.slot
      }
    }
    let winnerTeam = -1
    if (winnerSlot >= 0) winnerTeam = this.players.get(winnerSlot)!.team
    else if (this.teamCats[0] !== this.teamCats[1]) winnerTeam = this.teamCats[0] > this.teamCats[1] ? 0 : 1
    this.result = { winnerSlot, winnerTeam, rows }
    this.emit({ type: "end", reason })
  }

  /** Cópia da partida (rede): a mancha que a sala criou (ou a prevista, id negativo). */
  putBlob(id: number, owner: number, team: number, blob: NewBlob) {
    this.blobs.set(id, { id, owner, team, born: this.time, solid: blobSolid(blob, id, team), blob })
    this.solidsCache = null
  }

  /** Cópia da partida (rede): a mancha sumiu na sala (ou a prevista foi trocada/recusada). */
  takeBlob(id: number) {
    if (this.blobs.delete(id)) this.solidsCache = null
  }

  /** Saiu da sala: some dos alvos (a tinta dele fica até vencer). */
  setOnline(slot: number, on: boolean) {
    const p = this.players.get(slot)
    if (p) p.online = on
  }
}

/** Atalho para quem só precisa saber se a pose está fora (cliente). */
export const PAINT_FIRE_COLORS: readonly PaintColor[] = [PAINT.BRIDGE, PAINT.HARM, PAINT.STEP]
