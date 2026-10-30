// features/meu-mundo/laminas/sim/fight.ts — ARENA DAS LÂMINAS (mm3d-48a): a regra da luta.
//
// Luta de espada contra a máquina (pedido do Alex, 29/10): o jogador anda,
// ataca em combo de 3 golpes e esquiva; cada inimigo é uma máquina de
// estados com AVISO antes de cada golpe (o anel vermelho no chão) e brecha
// depois dele. Tudo em passo fixo de 1/60 s e sorteio com semente, para a
// mesma regra poder rodar na sala depois (como a Gincana e o Paint).
//
// Atributos da vida (0–1000) pesam com teto: força = dano (0,85×–1,35×),
// velocidade = ritmo de ataque e passada, inteligência = aviso mais longo
// (até +35%). Sem atributos, todos valem 300.
//
// Coordenadas: x/z no chão, centro da arena na origem; rumo 0 = +z.

export const DT = 1 / 60
/** Raio do chão de luta (m). */
export const ARENA_R = 11
export const PLAYER_R = 0.45

export type MobKind = "soldier" | "wolf" | "golem" | "harpy" | "brute"
export const MOB_KINDS: MobKind[] = ["soldier", "wolf", "golem", "harpy", "brute"]

export interface Stats {
  strength: number
  speed: number
  intelligence: number
}
const BASE_STATS: Stats = { strength: 300, speed: 300, intelligence: 300 }

// ── o jogador ──────────────────────────────────────────────────────────────
/** Golpe do combo: duração, instante do corte, alcance, abertura (rad), dano, avanço (m/s até o corte). */
export interface Swing {
  dur: number
  hitAt: number
  range: number
  arc: number
  dmg: number
  lunge: number
}
/** Três golpes (gancho = corte, direto = corte de volta, o terceiro é o forte). Tempos no ritmo 1. */
export const COMBO: Swing[] = [
  { dur: 0.62, hitAt: 0.29, range: 2.1, arc: 1.9, dmg: 14, lunge: 2.2 },
  { dur: 0.66, hitAt: 0.31, range: 2.1, arc: 1.9, dmg: 16, lunge: 2.2 },
  { dur: 0.86, hitAt: 0.42, range: 2.4, arc: 2.4, dmg: 26, lunge: 3.2 },
]
/** Apertou de novo até isto depois do corte: o próximo golpe do combo encadeia. */
const CHAIN_AFTER = 0.05
const DODGE = { dur: 0.46, iframeFrom: 0.04, iframeTo: 0.36, speed: 8.2, stam: 24 }
const PLAYER = { hp: 100, walk: 3.4, run: 5.6, stam: 100, stamRegen: 30, attackStam: 9, hurt: 0.32, heavyHurt: 0.7 }

export type PlayerState = "idle" | "attack" | "dodge" | "hurt" | "down" | "win"
export interface PlayerBody {
  x: number
  z: number
  vx: number
  vz: number
  facing: number
  hp: number
  stam: number
  state: PlayerState
  /** Tempo no estado atual (s). */
  t: number
  /** Golpe do combo em curso (0–2). */
  combo: number
  /** Já cortou neste golpe. */
  struck: boolean
  /** Pediu o próximo golpe durante este. */
  queued: boolean
  dodgeX: number
  dodgeZ: number
  /** Ritmo do ataque (velocidade da vida). */
  rate: number
}

// ── os inimigos ────────────────────────────────────────────────────────────
/**
 * Golpe de inimigo: aviso (windup), ativo, recuperação; alcance e abertura
 * (cone à frente) ou ÁREA (círculo de raio `area` a `reach` m à frente);
 * avanço durante o ativo (m/s); peso no sorteio; mínimo e máximo de
 * distância para escolher este golpe.
 */
export interface MobAttack {
  id: string
  windup: number
  active: number
  recover: number
  range: number
  arc: number
  area?: number
  reach?: number
  dmg: number
  lunge: number
  weight: number
  minD: number
  maxD: number
  heavy?: boolean
}
export interface MobDef {
  hp: number
  radius: number
  speed: number
  /** Distância que tenta manter antes de golpear. */
  engage: number
  /** Pancadas que aguenta antes de cambalear (0 = cambaleia sempre). */
  poise: number
  attacks: MobAttack[]
  /** Pausa entre golpes (s). */
  rest: [number, number]
  /** Harpia: voa entre os golpes. */
  flies?: boolean
}

export const MOBS: Record<MobKind, MobDef> = {
  soldier: {
    hp: 60,
    radius: 0.5,
    speed: 2.3,
    engage: 1.7,
    poise: 0,
    rest: [0.9, 1.6],
    attacks: [
      { id: "cut", windup: 0.7, active: 0.2, recover: 0.7, range: 2.0, arc: 1.4, dmg: 10, lunge: 1.5, weight: 3, minD: 0, maxD: 2.4 },
      { id: "thrust", windup: 0.85, active: 0.25, recover: 0.9, range: 2.6, arc: 0.7, dmg: 14, lunge: 4, weight: 1, minD: 1.4, maxD: 3.2 },
    ],
  },
  wolf: {
    hp: 34,
    radius: 0.9, // lobo grande (29/10): 4 m de comprimento
    speed: 5.2,
    engage: 3.4,
    poise: 0,
    rest: [1.6, 3.0],
    attacks: [
      { id: "bite", windup: 0.5, active: 0.18, recover: 0.6, range: 1.5, arc: 1.2, dmg: 7, lunge: 2, weight: 2, minD: 0, maxD: 1.9 },
      { id: "pounce", windup: 0.6, active: 0.35, recover: 0.9, range: 1.4, arc: 1.4, dmg: 10, lunge: 9, weight: 3, minD: 2.2, maxD: 4.6 },
    ],
  },
  golem: {
    hp: 220,
    radius: 1.0,
    speed: 1.5,
    engage: 2.4,
    poise: 4,
    rest: [1.0, 1.8],
    attacks: [
      { id: "swipe", windup: 0.95, active: 0.3, recover: 1.0, range: 3.0, arc: 2.2, dmg: 18, lunge: 0.8, weight: 2, minD: 0, maxD: 3.3, heavy: true },
      { id: "slam", windup: 1.3, active: 0.2, recover: 1.5, range: 0, arc: 0, area: 2.6, reach: 2.2, dmg: 28, lunge: 0, weight: 2, minD: 0, maxD: 4.4, heavy: true },
    ],
  },
  harpy: {
    hp: 80,
    radius: 0.55,
    speed: 3.2,
    engage: 4.5,
    poise: 2,
    rest: [1.2, 2.2],
    flies: true,
    attacks: [
      { id: "dive", windup: 1.0, active: 0.45, recover: 1.2, range: 1.6, arc: 1.6, dmg: 16, lunge: 11, weight: 3, minD: 2.5, maxD: 8, heavy: true },
      { id: "claw", windup: 0.55, active: 0.2, recover: 0.6, range: 1.8, arc: 1.5, dmg: 9, lunge: 1.5, weight: 2, minD: 0, maxD: 2.2 },
    ],
  },
  brute: {
    hp: 320,
    radius: 0.85,
    speed: 2.1,
    engage: 2.3,
    poise: 5,
    rest: [0.8, 1.4],
    attacks: [
      { id: "sweep", windup: 0.9, active: 0.3, recover: 0.9, range: 2.8, arc: 2.6, dmg: 20, lunge: 1, weight: 3, minD: 0, maxD: 3.1, heavy: true },
      { id: "charge", windup: 1.0, active: 0.6, recover: 1.3, range: 1.8, arc: 1.4, dmg: 26, lunge: 9, weight: 2, minD: 3.2, maxD: 9, heavy: true },
      { id: "smash", windup: 1.25, active: 0.2, recover: 1.4, range: 0, arc: 0, area: 2.2, reach: 1.8, dmg: 30, lunge: 0, weight: 1, minD: 0, maxD: 3.5, heavy: true },
    ],
  },
}

export type MobState = "spawn" | "chase" | "circle" | "windup" | "strike" | "recover" | "hurt" | "dead" | "fly"
export interface Mob {
  id: number
  kind: MobKind
  x: number
  z: number
  /** Altura (harpia no ar). */
  y: number
  facing: number
  hp: number
  hpMax: number
  state: MobState
  t: number
  /** Golpe escolhido (índice em MOBS[kind].attacks). */
  atk: number
  /** Duração do aviso deste golpe (já com a inteligência de quem joga). */
  windup: number
  /** Onde o golpe de área vai cair (fixado no fim do aviso). */
  aimX: number
  aimZ: number
  struck: boolean
  hits: number
  restLeft: number
  /** Lobo: lado em que circula (+1/−1). */
  side: number
  dmgMul: number
  /** Depois de cambalear, não cambaleia de novo até aqui (sem combo infinito). */
  armorUntil: number
  /** Postura deste (cresce com o nível). */
  poise: number
}

export type FightEvent =
  | { t: "swing"; combo: number }
  | { t: "hit"; on: "mob"; id: number; dmg: number; x: number; y: number; z: number; heavy: boolean; dead: boolean }
  | { t: "hit"; on: "me"; dmg: number; x: number; z: number; heavy: boolean; dead: boolean }
  | { t: "whiff"; id: number }
  | { t: "warn"; id: number; attack: string }
  | { t: "strike"; id: number; attack: string }
  | { t: "dodge" }
  | { t: "evade"; id: number }
  | { t: "stagger"; id: number }
  | { t: "end"; win: boolean }

export interface Input {
  /** Direção no chão (mundo), módulo 0–1. */
  mx: number
  mz: number
  run: boolean
  attack: boolean
  dodge: boolean
}

/** Uma luta: quem entra e com que força. `level` 1–3 multiplica vida e dano. */
export interface FightSetup {
  kind: MobKind
  level?: number
  seed?: number
  stats?: Partial<Stats>
}

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v)
const angDiff = (a: number, b: number) => {
  let d = a - b
  while (d > Math.PI) d -= 2 * Math.PI
  while (d < -Math.PI) d += 2 * Math.PI
  return d
}
const turnTo = (cur: number, to: number, max: number) => cur + clamp(angDiff(to, cur), -max, max)

/** Sorteio com semente (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** O que os atributos valem na luta (com teto de vantagem). */
export function statEffects(s: Stats) {
  const k = (v: number) => clamp(v / 1000, 0, 1)
  return {
    dmg: 0.85 + 0.5 * k(s.strength),
    rate: 0.92 + 0.3 * k(s.speed),
    move: 0.95 + 0.2 * k(s.speed),
    warn: 1 + 0.35 * k(s.intelligence),
  }
}

/** Quantos e onde nascem: lobos em bando de 3, o resto sozinho. */
function spawnList(kind: MobKind): { x: number; z: number }[] {
  if (kind === "wolf") return [{ x: -3.6, z: 5.5 }, { x: 0, z: 7 }, { x: 3.6, z: 5.5 }]
  return [{ x: 0, z: 5.5 }]
}

export class Fight {
  readonly R: () => number
  readonly me: PlayerBody
  readonly mobs: Mob[] = []
  readonly fx: ReturnType<typeof statEffects>
  readonly level: number
  readonly kind: MobKind
  time = 0
  over: null | { win: boolean; at: number } = null
  /** Eventos do último passo (quem desenha consome). */
  events: FightEvent[] = []
  /** Lobo que tem a vez de atacar (os outros circulam). */
  private token = -1
  private prevAttack = false
  private prevDodge = false

  constructor(setup: FightSetup) {
    this.R = rng(setup.seed ?? (Date.now() & 0x7fffffff))
    this.kind = setup.kind
    // O Golem de Pedra (o antigo Soldado) tem só os níveis 1 e 2 (Alex, 29/10).
    this.level = clamp(Math.round(setup.level ?? 1), 1, setup.kind === "soldier" ? 2 : 3)
    const stats = { ...BASE_STATS, ...(setup.stats ?? {}) }
    this.fx = statEffects(stats)
    this.me = {
      x: 0,
      z: -5,
      vx: 0,
      vz: 0,
      facing: 0,
      hp: PLAYER.hp,
      stam: PLAYER.stam,
      state: "idle",
      t: 0,
      combo: 0,
      struck: false,
      queued: false,
      dodgeX: 0,
      dodgeZ: 1,
      rate: this.fx.rate,
    }
    const def = MOBS[setup.kind]
    const scale = 1 + 0.45 * (this.level - 1)
    spawnList(setup.kind).forEach((p, i) =>
      this.mobs.push({
        id: i + 1,
        kind: setup.kind,
        x: p.x,
        z: p.z,
        y: 0,
        facing: Math.PI,
        hp: Math.round(def.hp * scale),
        hpMax: Math.round(def.hp * scale),
        state: "spawn",
        t: -0.35 * i,
        atk: 0,
        windup: 0,
        aimX: 0,
        aimZ: 0,
        struck: false,
        hits: 0,
        restLeft: 0.6 + 0.5 * i,
        side: i % 2 ? 1 : -1,
        dmgMul: 1 + 0.3 * (this.level - 1),
        armorUntil: 0,
        poise: def.poise + 2 * (this.level - 1),
      }),
    )
  }

  /** Inimigo vivo mais perto (alvo da câmera e do golpe). */
  target(): Mob | null {
    let best: Mob | null = null
    let bd = Infinity
    for (const m of this.mobs) {
      if (m.state === "dead") continue
      const d = Math.hypot(m.x - this.me.x, m.z - this.me.z)
      if (d < bd) {
        bd = d
        best = m
      }
    }
    return best
  }

  step(inp: Input) {
    this.events = []
    this.time += DT
    const attackPressed = inp.attack && !this.prevAttack
    const dodgePressed = inp.dodge && !this.prevDodge
    this.prevAttack = inp.attack
    this.prevDodge = inp.dodge
    if (this.over) {
      this.stepPlayerIdle()
      return
    }
    this.stepPlayer(inp, attackPressed, dodgePressed)
    this.pickToken()
    for (const m of this.mobs) this.stepMob(m)
    this.separate()
    if (this.me.hp <= 0 && !this.over) {
      this.over = { win: false, at: this.time }
      this.events.push({ t: "end", win: false })
    } else if (this.mobs.every((m) => m.state === "dead") && !this.over) {
      this.over = { win: true, at: this.time }
      this.me.state = "win"
      this.me.t = 0
      this.events.push({ t: "end", win: true })
    }
  }

  private stepPlayerIdle() {
    const p = this.me
    p.t += DT
    p.vx *= 0.8
    p.vz *= 0.8
  }

  private setPlayer(s: PlayerState) {
    this.me.state = s
    this.me.t = 0
  }

  private stepPlayer(inp: Input, attackPressed: boolean, dodgePressed: boolean) {
    const p = this.me
    p.t += DT
    const mag = Math.min(1, Math.hypot(inp.mx, inp.mz))
    const tgt = this.target()
    const faceTarget = () => {
      if (tgt) p.facing = Math.atan2(tgt.x - p.x, tgt.z - p.z)
      else if (mag > 0.1) p.facing = Math.atan2(inp.mx, inp.mz)
    }
    if (p.state !== "dodge" && p.state !== "hurt" && p.state !== "down") p.stam = Math.min(PLAYER.stam, p.stam + PLAYER.stamRegen * DT * (p.state === "attack" ? 0.3 : 1))

    // Esquiva: corta o golpe (antes do corte) e a recuperação de qualquer golpe.
    if (dodgePressed && p.stam >= DODGE.stam && (p.state === "idle" || (p.state === "attack" && (!p.struck || p.t > COMBO[p.combo].hitAt / p.rate + 0.08)))) {
      p.stam -= DODGE.stam
      let dx = inp.mx
      let dz = inp.mz
      if (mag < 0.2) {
        // Sem direção: para trás, longe do alvo.
        dx = -Math.sin(p.facing)
        dz = -Math.cos(p.facing)
      }
      const l = Math.hypot(dx, dz) || 1
      p.dodgeX = dx / l
      p.dodgeZ = dz / l
      this.setPlayer("dodge")
      this.events.push({ t: "dodge" })
    }

    switch (p.state) {
      case "idle": {
        if (attackPressed && p.stam >= PLAYER.attackStam) {
          this.startSwing(0)
          faceTarget()
          break
        }
        const sp = (inp.run ? PLAYER.run : PLAYER.walk) * this.fx.move
        p.vx = inp.mx * sp
        p.vz = inp.mz * sp
        if (tgt && Math.hypot(tgt.x - p.x, tgt.z - p.z) < 9) faceTargetSmooth(p, tgt)
        else if (mag > 0.1) p.facing = turnTo(p.facing, Math.atan2(inp.mx, inp.mz), 12 * DT)
        break
      }
      case "attack": {
        const sw = COMBO[p.combo]
        const dur = sw.dur / p.rate
        const hitAt = sw.hitAt / p.rate
        if (attackPressed && p.combo < COMBO.length - 1) p.queued = true
        // Avança até o corte, depois para.
        const lunge = p.t < hitAt ? sw.lunge : 0
        p.vx = Math.sin(p.facing) * lunge
        p.vz = Math.cos(p.facing) * lunge
        if (!p.struck && p.t >= hitAt) {
          p.struck = true
          this.playerStrike(sw)
        }
        if (p.struck && p.queued && p.t >= hitAt + CHAIN_AFTER && p.stam >= PLAYER.attackStam) {
          this.startSwing(p.combo + 1)
          faceTarget()
        } else if (p.t >= dur) this.setPlayer("idle")
        break
      }
      case "dodge": {
        const k = 1 - Math.max(0, p.t - DODGE.dur * 0.6) / (DODGE.dur * 0.4)
        p.vx = p.dodgeX * DODGE.speed * k
        p.vz = p.dodgeZ * DODGE.speed * k
        if (p.t >= DODGE.dur) this.setPlayer("idle")
        break
      }
      case "hurt":
      case "down": {
        p.vx *= 0.85
        p.vz *= 0.85
        const limit = p.state === "down" ? PLAYER.heavyHurt : PLAYER.hurt
        if (p.t >= limit) this.setPlayer("idle")
        break
      }
      case "win":
        p.vx = 0
        p.vz = 0
        break
    }
    p.x += p.vx * DT
    p.z += p.vz * DT
    const r = Math.hypot(p.x, p.z)
    const max = ARENA_R - PLAYER_R
    if (r > max) {
      p.x *= max / r
      p.z *= max / r
    }
  }

  private startSwing(i: number) {
    const p = this.me
    p.stam -= PLAYER.attackStam
    p.combo = i
    p.struck = false
    p.queued = false
    this.setPlayer("attack")
    this.events.push({ t: "swing", combo: i })
  }

  /** O corte do jogador: todo inimigo vivo no cone à frente. */
  private playerStrike(sw: Swing) {
    const p = this.me
    let any = false
    for (const m of this.mobs) {
      if (m.state === "dead" || m.state === "spawn") continue
      // Harpia alta só leva quando desce.
      if (m.y > 1.6) continue
      const dx = m.x - p.x
      const dz = m.z - p.z
      const d = Math.hypot(dx, dz) - MOBS[m.kind].radius
      if (d > sw.range) continue
      if (Math.abs(angDiff(Math.atan2(dx, dz), p.facing)) > sw.arc / 2 + 0.25) continue
      any = true
      const heavy = p.combo === COMBO.length - 1
      // Pancada na brecha (logo depois do golpe dele) dói mais.
      const opening = m.state === "recover" ? 1.25 : 1
      const dmg = Math.round(sw.dmg * this.fx.dmg * opening)
      m.hp = Math.max(0, m.hp - dmg)
      const dead = m.hp <= 0
      this.events.push({ t: "hit", on: "mob", id: m.id, dmg, x: m.x, y: m.y, z: m.z, heavy, dead })
      if (dead) {
        m.state = "dead"
        m.t = 0
        continue
      }
      m.hits++
      const def = MOBS[m.kind]
      // Cambaleia: sem postura, ou quando a postura quebra, ou no golpe forte — mas nunca no meio do golpe dele (só pancada).
      if (m.state !== "strike" && this.time >= m.armorUntil && (m.poise === 0 || m.hits >= m.poise || (heavy && m.poise <= 2))) {
        m.hits = 0
        m.armorUntil = this.time + 1.8
        m.state = "hurt"
        m.t = 0
        m.y = 0
        this.events.push({ t: "stagger", id: m.id })
      }
      // Empurrão.
      const l = Math.hypot(dx, dz) || 1
      const push = heavy ? 0.9 : 0.35
      m.x += (dx / l) * push * (m.poise ? 0.5 : 1)
      m.z += (dz / l) * push * (m.poise ? 0.5 : 1)
    }
    if (!any) this.events.push({ t: "whiff", id: 0 })
  }

  /** Bando: só um lobo ataca por vez; os outros rodeiam. */
  private pickToken() {
    if (this.kind !== "wolf") return
    const cur = this.mobs.find((m) => m.id === this.token)
    if (cur && cur.state !== "dead" && cur.state !== "circle" && cur.state !== "chase") return
    if (cur && (cur.state === "chase" || cur.state === "circle") && cur.restLeft > 0) return
    const alive = this.mobs.filter((m) => m.state !== "dead" && m.state !== "spawn")
    if (!alive.length) return
    alive.sort((a, b) => Math.hypot(a.x - this.me.x, a.z - this.me.z) - Math.hypot(b.x - this.me.x, b.z - this.me.z))
    this.token = alive[0].id
  }

  private setMob(m: Mob, s: MobState) {
    m.state = s
    m.t = 0
  }

  private stepMob(m: Mob) {
    const def = MOBS[m.kind]
    const p = this.me
    m.t += DT
    const dx = p.x - m.x
    const dz = p.z - m.z
    const dist = Math.hypot(dx, dz)
    const toMe = Math.atan2(dx, dz)
    const speed = def.speed
    switch (m.state) {
      case "spawn":
        if (m.t >= 0.9) this.setMob(m, def.flies ? "fly" : "chase")
        return
      case "dead":
        m.y = Math.max(0, m.y - 6 * DT)
        return
      case "hurt":
        if (m.t >= 0.5) this.setMob(m, def.flies ? "fly" : "chase")
        return
      case "fly":
      case "chase":
      case "circle": {
        m.restLeft -= DT
        if (def.flies) m.y += (2.6 - m.y) * Math.min(1, 3 * DT)
        const myTurn = this.kind !== "wolf" || this.token === m.id
        // Escolhe golpe quando descansou e está no alcance de algum.
        if (myTurn && m.restLeft <= 0 && p.state !== "down") {
          const opts = def.attacks.map((a, i) => ({ a, i })).filter(({ a }) => dist >= a.minD && dist <= a.maxD)
          if (opts.length) {
            let sum = opts.reduce((s, o) => s + o.a.weight, 0) * this.R()
            let pick = opts[0]
            for (const o of opts) {
              sum -= o.a.weight
              if (sum <= 0) {
                pick = o
                break
              }
            }
            m.atk = pick.i
            m.windup = pick.a.windup * this.fx.warn
            m.struck = false
            m.facing = toMe
            this.setMob(m, "windup")
            this.events.push({ t: "warn", id: m.id, attack: pick.a.id })
            return
          }
        }
        // Anda: chega na distância de luta; quem não tem a vez rodeia.
        let vx = 0
        let vz = 0
        const want = myTurn ? def.engage : def.engage + 1.6
        if (dist > want + 0.3) {
          vx = (dx / dist) * speed
          vz = (dz / dist) * speed
        } else if (dist < want - 0.6) {
          vx = (-dx / dist) * speed * 0.6
          vz = (-dz / dist) * speed * 0.6
        }
        if (!myTurn || dist <= want + 0.3) {
          // De lado, em volta do jogador.
          vx += (dz / Math.max(dist, 0.1)) * m.side * speed * 0.45
          vz += (-dx / Math.max(dist, 0.1)) * m.side * speed * 0.45
        }
        m.x += vx * DT
        m.z += vz * DT
        m.facing = turnTo(m.facing, toMe, 6 * DT)
        if (this.R() < 0.004) m.side = -m.side
        return
      }
      case "windup": {
        const a = def.attacks[m.atk]
        // Durante o aviso acompanha o jogador devagar (o golpe de área marca o ponto no fim).
        m.facing = turnTo(m.facing, toMe, (a.area ? 2.5 : 1.6) * DT)
        if (a.id === "dive") m.y += (3.4 - m.y) * Math.min(1, 4 * DT)
        if (m.t >= m.windup) {
          const reach = a.reach ?? 0
          m.aimX = m.x + Math.sin(m.facing) * reach
          m.aimZ = m.z + Math.cos(m.facing) * reach
          this.setMob(m, "strike")
          this.events.push({ t: "strike", id: m.id, attack: a.id })
        }
        return
      }
      case "strike": {
        const a = def.attacks[m.atk]
        m.x += Math.sin(m.facing) * a.lunge * DT
        m.z += Math.cos(m.facing) * a.lunge * DT
        if (a.id === "dive") m.y = Math.max(0, m.y - 9 * DT)
        if (!m.struck) this.mobHit(m, a)
        if (m.t >= a.active) {
          this.setMob(m, "recover")
          if (!m.struck) this.events.push({ t: "evade", id: m.id })
        }
        return
      }
      case "recover": {
        const a = def.attacks[m.atk]
        if (def.flies) m.y = Math.max(0, m.y - 4 * DT)
        if (m.t >= a.recover) {
          m.restLeft = def.rest[0] + (def.rest[1] - def.rest[0]) * this.R()
          this.setMob(m, def.flies ? "fly" : "chase")
          if (this.kind === "wolf") this.token = -1
        }
        return
      }
    }
  }

  /** O golpe do inimigo acerta? (cone à frente ou área marcada; esquiva na hora certa passa). */
  private mobHit(m: Mob, a: MobAttack) {
    const p = this.me
    if (p.state === "dodge" && p.t >= DODGE.iframeFrom && p.t <= DODGE.iframeTo) return
    if (p.state === "down") return
    let hit = false
    if (a.area) {
      // Área: só no primeiro quadro do ativo.
      if (m.t > DT * 1.5) return
      hit = Math.hypot(p.x - m.aimX, p.z - m.aimZ) <= a.area + PLAYER_R
      m.struck = true
    } else {
      const dx = p.x - m.x
      const dz = p.z - m.z
      const d = Math.hypot(dx, dz) - PLAYER_R
      hit = d <= a.range && Math.abs(angDiff(Math.atan2(dx, dz), m.facing)) <= a.arc / 2 + 0.2
    }
    if (!hit) return
    m.struck = true
    const dmg = Math.round(a.dmg * m.dmgMul)
    p.hp = Math.max(0, p.hp - dmg)
    const heavy = !!a.heavy
    this.events.push({ t: "hit", on: "me", dmg, x: p.x, z: p.z, heavy, dead: p.hp <= 0 })
    // Empurrão para longe de quem bateu.
    const l = Math.hypot(p.x - m.x, p.z - m.z) || 1
    const push = heavy ? 1.4 : 0.6
    p.x += ((p.x - m.x) / l) * push
    p.z += ((p.z - m.z) / l) * push
    p.queued = false
    this.setPlayer(p.hp <= 0 ? "down" : heavy ? "down" : "hurt")
  }

  /** Ninguém atravessa ninguém nem sai da arena. */
  private separate() {
    const p = this.me
    for (const m of this.mobs) {
      if (m.state === "dead" || m.y > 1.2) continue
      const r = MOBS[m.kind].radius
      const dx = m.x - p.x
      const dz = m.z - p.z
      const d = Math.hypot(dx, dz)
      const min = r + PLAYER_R
      if (d < min && d > 1e-4) {
        const push = (min - d) / 2
        m.x += (dx / d) * push
        m.z += (dz / d) * push
        p.x -= (dx / d) * push
        p.z -= (dz / d) * push
      }
    }
    for (let i = 0; i < this.mobs.length; i++) {
      for (let j = i + 1; j < this.mobs.length; j++) {
        const a = this.mobs[i]
        const b = this.mobs[j]
        if (a.state === "dead" || b.state === "dead") continue
        const dx = b.x - a.x
        const dz = b.z - a.z
        const d = Math.hypot(dx, dz)
        const min = MOBS[a.kind].radius + MOBS[b.kind].radius
        if (d < min && d > 1e-4) {
          const push = (min - d) / 2
          a.x -= (dx / d) * push
          a.z -= (dz / d) * push
          b.x += (dx / d) * push
          b.z += (dz / d) * push
        }
      }
    }
    for (const m of this.mobs) {
      const r = Math.hypot(m.x, m.z)
      const max = ARENA_R - MOBS[m.kind].radius
      if (r > max) {
        m.x *= max / r
        m.z *= max / r
      }
    }
  }
}

function faceTargetSmooth(p: PlayerBody, m: Mob) {
  p.facing = turnTo(p.facing, Math.atan2(m.x - p.x, m.z - p.z), 10 * DT)
}

/** Golpe atual do inimigo (para desenhar o aviso). */
export function mobAttack(m: Mob): MobAttack | null {
  if (m.state !== "windup" && m.state !== "strike") return null
  return MOBS[m.kind].attacks[m.atk] ?? null
}
