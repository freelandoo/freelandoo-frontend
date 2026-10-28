// features/meu-mundo/paint/sim/match.ts — PAINT (mm3d-35): a partida.
//
// O ESTADO do jogo (não o movimento): munição, cápsulas, sangue, nocaute,
// tinta no mundo, gatinhos, portal de cada time, chefão, tempo e resultado.
//
// mm3d-38 (pedido do Alex): sangue 0–100 no lugar dos corações; nocaute por
// outro jogador passa os gatinhos para quem derrubou; cair nas nuvens devolve
// os gatinhos ao mapa; na ilha do chefão não se perde gatinho nem há dano
// entre jogadores — lá só o chefão bate (ele anda, dá patada e tapa no chão).
// A sala (PaintRoom) roda esta classe e é a autoridade; o treino sem sala
// roda a mesma no aparelho. Quem usa: `pose()` com o que o aparelho diz,
// `fire()`/`punch()` nos botões, `tick(dt)` no relógio e `drain()` para os
// acontecimentos (o que aparece/some, quem levou dano, quem pegou o quê).
//
// O movimento é do aparelho; `pose()` só recusa o impossível (velocidade
// acima do que soco + corrida explicam) e devolve "volte para onde estava".
// Depois de um renascimento a época sobe: pose de época velha é ignorada (é
// do caminho de antes do teleporte).
//
// mm3d-46: quarta cor, o MURO — começa sem munição, o ícone da Freelandoo
// (cápsula da cor 3) dá 10; o tiro preto do outro time derruba o muro no
// terceiro acerto. O mapa sai do modo (2×2 e 3×3 com mais gatinhos).

import { PAINT, TUNING, ammoCap, modeTeams, type PaintColor, type PaintMode } from "./tuning"
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
  ammo: [number, number, number, number]
  cats: number
  /** Quais gatinhos (ids do mapa) estão com esta pessoa — voltam ao mapa se ela cair. */
  catIds: number[]
  dmg: number
  /** Nocaute até (s de partida); 0 = de pé. */
  ko: number
  /** Sem tomar dano até (s). */
  shield: number
  inBoss: boolean
  epoch: number
  pose: PaintPose
  /** Próximo tiro permitido por cor (s) e próximo soco. */
  nextFire: [number, number, number, number]
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
  /** `by` = -1 quando quem bateu foi o chefão. */
  | { type: "hit"; slot: number; by: number; hp: number; kx: number; ky: number; kz: number; how: "harm" | "punch" | "boss" }
  | { type: "ko"; slot: number; by: number }
  /** Caiu nas nuvens com gatinhos: eles voltam ao mapa (um `catBack` por gatinho). */
  | { type: "drop"; slot: number; n: number }
  | { type: "catBack"; id: number }
  /** O chefão começou um golpe/rugido (a pose vem do estado `boss`; isto é para o aviso). */
  | { type: "bossAct"; act: BossAct; slot: number }
  /** Nocauteou: os gatinhos de quem caiu passam para quem derrubou (mm3d-35g). */
  | { type: "steal"; from: number; to: number; n: number }
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

export type BossAct = "idle" | "walk" | "swipe" | "slam" | "roar"

/** O chefão (a sala decide; o aparelho só desenha). `at` = s de partida em que o ato começou. */
export interface BossState {
  x: number
  z: number
  facing: number
  act: BossAct
  at: number
  /** Em quem ele está de olho (-1 = ninguém lá em cima). */
  target: number
  /** O golpe atual já acertou? */
  struck: boolean
  /** Próximo golpe permitido (s). */
  next: number
  /** Golpes dados (o terceiro é tapa no chão). */
  count: number
  roared: boolean
  roaredHalf: boolean
}

/** Ângulo `a` virado para `b` pelo caminho curto, no máximo `max`. */
function turnToward(a: number, b: number, max: number) {
  let d = b - a
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return a + Math.max(-max, Math.min(max, d))
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
  /** muro → tiros pretos que já levou. */
  readonly wallHits = new Map<number, number>()
  readonly teamCats: [number, number] = [0, 0]
  readonly portalOpen: [boolean, boolean] = [false, false]
  bossHp: number = TUNING.bossHp
  readonly boss: BossState
  result: MatchResult | null = null
  private events: MatchEvent[] = []
  private blobSeq = 1
  private solidsCache: Solid[] | null = null
  private poseAt = new Map<number, number>()

  constructor(mode: PaintMode, seats: { slot: number; team: number; sit: number }[], map: PaintMap = buildPaintMap(mode)) {
    this.map = map
    this.mode = mode
    this.time = -TUNING.countdown
    this.boss = {
      x: map.boss.x,
      z: map.boss.z,
      facing: Math.PI,
      act: "idle",
      at: 0,
      target: -1,
      struck: false,
      next: 0,
      count: 0,
      roared: false,
      roaredHalf: false,
    }
    const teams = modeTeams(mode)
    for (const s of seats) {
      const team = Math.min(s.team, teams - 1)
      const sp = spawnPoint(map, team, s.sit, false)
      this.players.set(s.slot, {
        slot: s.slot,
        team,
        sit: s.sit,
        hp: TUNING.hpMax,
        ammo: [TUNING.ammoStart, TUNING.ammoStart, TUNING.ammoStart, TUNING.wallStart],
        cats: 0,
        catIds: [],
        dmg: 0,
        ko: 0,
        shield: 0,
        inBoss: false,
        epoch: 0,
        pose: { x: sp.x, y: sp.y, z: sp.z, facing: sp.facing, ground: true, gy: sp.y, e: 0 },
        nextFire: [0, 0, 0, 0],
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
    return { x: this.boss.x, y: this.map.boss.y, z: this.boss.z, r: TUNING.bossR, h: TUNING.bossH }
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

  /** Corpos alvo (de pé, na arena). Na ilha do chefão jogador não atinge jogador. */
  private bodies(inBoss: boolean): ShotTargetBody[] {
    const out: ShotTargetBody[] = []
    if (inBoss) return out
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
    if (!p || !this.standing(p) || !(c === 0 || c === 1 || c === 2 || c === 3)) return this.deny(slot, q)
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
        const wall = this.blobs.get(res.blob)
        const hits = (this.wallHits.get(res.blob) ?? 0) + 1
        if (wall && wall.blob.c === PAINT.WALL && hits < TUNING.wallHits) {
          // o muro aguenta: só respinga (de frente para quem atirou)
          this.wallHits.set(res.blob, hits)
          const l = Math.hypot(dir.x, dir.z) || 1
          this.emit({ type: "splat", point: res.point, normal: { x: -dir.x / l, y: 0, z: -dir.z / l } })
        } else this.removeBlob(res.blob)
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
    if (!v || !a || v.ko || v.inBoss || this.time < v.shield) return
    if (how === "harm") {
      const dx = v.pose.x - a.pose.x
      const dz = v.pose.z - a.pose.z
      const d = Math.hypot(dx, dz) || 1
      kx = (dx / d) * TUNING.harmKnock
      kz = (dz / d) * TUNING.harmKnock
    }
    v.hp = Math.max(0, v.hp - (how === "punch" ? TUNING.punchDmg : TUNING.harmDmg))
    this.emit({ type: "hit", slot, by, hp: v.hp, kx, ky: how === "punch" ? TUNING.punchLift : TUNING.harmLift, kz, how })
    if (v.hp === 0) {
      v.ko = this.time + TUNING.koTime
      this.emit({ type: "ko", slot, by })
      this.steal(v, a)
    }
  }

  /** Golpe do chefão: lá em cima ninguém perde gatinho, só cai e volta. */
  private bossDamage(v: MatchPlayer, dmg: number, kx: number, ky: number, kz: number) {
    if (v.ko || this.time < v.shield) return
    v.hp = Math.max(0, v.hp - dmg)
    this.emit({ type: "hit", slot: v.slot, by: -1, hp: v.hp, kx, ky, kz, how: "boss" })
    if (v.hp === 0) {
      v.ko = this.time + TUNING.koTime
      this.emit({ type: "ko", slot: v.slot, by: -1 })
    }
  }

  /**
   * Quem derrubou fica com os gatinhos de quem caiu (pedido do Alex, como no
   * Cat Demon). Muda o placar dos dois times; o portal de quem ganhou pode abrir.
   */
  private steal(v: MatchPlayer, a: MatchPlayer) {
    const n = v.cats
    if (n <= 0 || v.slot === a.slot) return
    v.cats = 0
    a.cats += n
    a.catIds.push(...v.catIds)
    for (const id of v.catIds) this.catsTaken.set(id, a.team)
    v.catIds = []
    this.teamCats[v.team] = Math.max(0, this.teamCats[v.team] - n)
    this.teamCats[a.team] += n
    this.emit({ type: "steal", from: v.slot, to: a.slot, n })
    if (!this.portalOpen[a.team] && this.teamCats[a.team] >= TUNING.catsToPortal) {
      this.portalOpen[a.team] = true
      this.emit({ type: "portal", team: a.team })
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

  /** Caiu nas nuvens: os gatinhos dele voltam ao mapa (o portal que já abriu fica aberto). */
  private dropCats(p: MatchPlayer) {
    if (p.inBoss || p.cats <= 0) return
    this.emit({ type: "drop", slot: p.slot, n: p.cats })
    this.teamCats[p.team] = Math.max(0, this.teamCats[p.team] - p.cats)
    for (const id of p.catIds) {
      this.catsTaken.delete(id)
      this.emit({ type: "catBack", id })
    }
    p.cats = 0
    p.catIds = []
  }

  // ── chefão ────────────────────────────────────────────────────────────────

  private bossStart(act: BossAct, target: number) {
    const b = this.boss
    b.act = act
    b.at = this.time
    b.struck = false
    if (act === "swipe" || act === "slam" || act === "roar") this.emit({ type: "bossAct", act, slot: target })
  }

  /** Quem está lá em cima e pode apanhar. */
  private bossVictims() {
    const out: MatchPlayer[] = []
    for (const p of this.players.values()) if (p.inBoss && !p.ko && p.online) out.push(p)
    return out
  }

  private bossStrike(victims: MatchPlayer[]) {
    const T = TUNING
    const b = this.boss
    const by = this.map.boss.y
    const fx = Math.sin(b.facing)
    const fz = Math.cos(b.facing)
    for (const v of victims) {
      const q = v.pose
      if (q.y > by + 3.2 || q.y < by - 1) continue // pulou por cima / já caiu da ilha
      if (b.act === "swipe") {
        const dx = q.x - b.x
        const dz = q.z - b.z
        const d = Math.hypot(dx, dz)
        if (d > T.bossSwipe.reach + T.bossR * 0.5) continue
        if (d > 0.3 && (dx * fx + dz * fz) / d < T.bossSwipe.cos) continue
        const ux = d > 0.3 ? dx / d : fx
        const uz = d > 0.3 ? dz / d : fz
        this.bossDamage(v, T.bossSwipe.dmg, ux * T.bossSwipe.knock, T.bossSwipe.lift, uz * T.bossSwipe.knock)
      } else {
        // tapa no chão: círculo à frente; quem está no ar escapa do tremor
        const dx = q.x - (b.x + fx * T.bossSlam.ahead)
        const dz = q.z - (b.z + fz * T.bossSlam.ahead)
        const d = Math.hypot(dx, dz)
        if (d > T.bossSlam.r || !q.ground) continue
        const ux = d > 0.3 ? dx / d : fx
        const uz = d > 0.3 ? dz / d : fz
        const k = 1 - (d / T.bossSlam.r) * 0.4
        this.bossDamage(v, Math.round(T.bossSlam.dmg * k), ux * T.bossSlam.knock, T.bossSlam.lift, uz * T.bossSlam.knock)
      }
    }
  }

  private bossTick(dt: number) {
    const T = TUNING
    const b = this.boss
    const home = this.map.boss
    const victims = this.bossVictims()
    // golpe/rugido em andamento: acerta no tempo certo e termina
    if (b.act === "swipe" || b.act === "slam" || b.act === "roar") {
      const since = this.time - b.at
      const spec = b.act === "swipe" ? T.bossSwipe : b.act === "slam" ? T.bossSlam : null
      if (spec && !b.struck && since >= spec.hit) {
        b.struck = true
        this.bossStrike(victims)
      }
      if (since < (spec ? spec.dur : T.bossRoar.dur)) return
      this.bossStart("idle", b.target)
      b.next = this.time + T.bossRest
    }
    // de olho em quem está mais perto
    let tgt: MatchPlayer | null = null
    let best = Infinity
    for (const v of victims) {
      const d = Math.hypot(v.pose.x - b.x, v.pose.z - b.z)
      if (d < best) {
        best = d
        tgt = v
      }
    }
    b.target = tgt ? tgt.slot : -1
    let goX = home.x
    let goZ = home.z
    if (tgt) {
      // ruge quando o primeiro chega e quando perde metade da vida
      if (!b.roared || (!b.roaredHalf && this.bossHp <= T.bossHp / 2)) {
        if (b.roared) b.roaredHalf = true
        b.roared = true
        b.facing = Math.atan2(tgt.pose.x - b.x, tgt.pose.z - b.z)
        this.bossStart("roar", tgt.slot)
        return
      }
      goX = tgt.pose.x
      goZ = tgt.pose.z
    }
    const dx = goX - b.x
    const dz = goZ - b.z
    const d = Math.hypot(dx, dz)
    const want = Math.atan2(dx, dz)
    if (d > 0.05) b.facing = turnToward(b.facing, want, T.bossTurn * dt)
    let off = Math.abs(want - b.facing) % (Math.PI * 2)
    if (off > Math.PI) off = Math.PI * 2 - off
    if (tgt && this.time >= b.next && off < 0.5) {
      // o terceiro golpe é tapa no chão; também se dois estão juntos na frente dele
      const fx = Math.sin(b.facing)
      const fz = Math.cos(b.facing)
      const near = victims.filter((v) => Math.hypot(v.pose.x - (b.x + fx * T.bossSlam.ahead), v.pose.z - (b.z + fz * T.bossSlam.ahead)) < T.bossSlam.r).length
      const slam = near >= 2 || b.count % 3 === 2
      if (slam ? near >= 1 : d <= T.bossSwipe.reach) {
        b.count++
        this.bossStart(slam ? "slam" : "swipe", tgt.slot)
        return
      }
    }
    // anda até a vítima (ou volta para o meio), sem sair da ilha
    const stop = tgt ? T.bossSwipe.reach - 1.2 : 0.3
    let moved = false
    if (d > stop && off < 1.2) {
      const step = Math.min(T.bossWalk * dt, d - stop)
      let nx = b.x + Math.sin(b.facing) * step
      let nz = b.z + Math.cos(b.facing) * step
      const hx = nx - home.x
      const hz = nz - home.z
      const hd = Math.hypot(hx, hz)
      if (hd > T.bossLeash) {
        nx = home.x + (hx / hd) * T.bossLeash
        nz = home.z + (hz / hd) * T.bossLeash
      }
      moved = Math.hypot(nx - b.x, nz - b.z) > 1e-4
      b.x = nx
      b.z = nz
    }
    const act: BossAct = moved || (d > stop && off >= 1.2) ? "walk" : "idle"
    if (b.act !== act) this.bossStart(act, b.target)
  }

  private removeBlob(id: number) {
    const b = this.blobs.get(id)
    if (!b) return
    this.blobs.delete(id)
    this.wallHits.delete(id)
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
    p.hp = TUNING.hpMax
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
        this.dropCats(p)
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
          p.catIds.push(c.id)
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
          continue
        }
      }
      // cápsulas
      for (const cap of this.map.capsules) {
        if (this.capsuleBack.has(cap.id) || p.ammo[cap.c] >= ammoCap(cap.c)) continue
        if (Math.abs(q.y - cap.y) > 1.6 || Math.hypot(q.x - cap.x, q.z - cap.z) > T.capsuleR) continue
        p.ammo[cap.c] = Math.min(ammoCap(cap.c), p.ammo[cap.c] + capsuleGive(cap.c))
        this.capsuleBack.set(cap.id, this.time + capsuleRespawn(cap.c))
        this.emit({ type: "capsule", id: cap.id, slot: p.slot, c: cap.c })
      }
    }
    if (this.bossAlive()) this.bossTick(dt)
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

/** Quanto a cápsula da cor dá (o ícone da Freelandoo dá muros). */
export function capsuleGive(c: PaintColor) {
  return c === PAINT.WALL ? TUNING.wallGive : TUNING.capsuleGive
}

/** Em quanto tempo a cápsula da cor volta (s). */
export function capsuleRespawn(c: PaintColor) {
  return c === PAINT.WALL ? TUNING.logoRespawn : TUNING.capsuleRespawn
}

/** Atalho para quem só precisa saber se a pose está fora (cliente). */
export const PAINT_FIRE_COLORS: readonly PaintColor[] = [PAINT.BRIDGE, PAINT.HARM, PAINT.STEP, PAINT.WALL]
