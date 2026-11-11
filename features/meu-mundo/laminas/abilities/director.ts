// features/meu-mundo/laminas/abilities/director.ts — diretor das habilidades (2026-11-07).
//
// Uma habilidade importante é uma sequência: preparação, carga, golpe, impacto, resto.
// O diretor anda nessa sequência e cuida de três coisas: os avisos (cue), o ritmo e a câmera.
//
// O RELÓGIO É O DA REGRA. Enquanto o poder dura, a posição na sequência é o `p.t` de
// sim/fight.ts, então o impacto desenhado cai no mesmo passo do dano. Quando a regra acaba
// antes (golpe que encerra a luta), o diretor segue sozinho até fechar.
//
// CÂMERA LENTA. A luta é uma instância só de quem joga: passo fixo de 1/60 s, gravado e
// re-simulado pelo servidor, com a cidade e a sala fora de cena (ui/offstage). Desacelerar
// aqui muda quantos passos cabem em um segundo de tela, nunca o resultado de um passo. O
// Engine, o relógio de rede e os outros jogadores não passam por este arquivo. O servidor só
// recusa luta MAIS RÁPIDA que o relógio, e câmera lenta vai no sentido contrário.
//
// A CÂMERA NÃO É TROCADA. A câmera do jogo segue calculada a cada quadro; o diretor mistura
// por cima com um peso. Peso zero = exatamente a câmera do jogo, e nada precisa ser guardado
// nem devolvido, mesmo se a habilidade cair no meio. Sem laço, câmera ou Engine próprios.

import { Vector3 } from "@babylonjs/core/Maths/math.vector"

export interface TimeKey {
  t: number
  /** Ritmo da apresentação (1 = normal). */
  k: number
}

/** Enquadramento em volta de quem joga. */
export interface CamKey {
  t: number
  /** Graus a partir das costas (0 = atrás, 90 = à direita, 180 = de frente). */
  yaw: number
  /** Distância (m, para um corpo de 1,8 m). */
  dist: number
  /** Altura da câmera, em frações do corpo. */
  high: number
  /** Altura do ponto olhado, em frações do corpo. */
  look: number
  /** Quanto o ponto olhado avança à frente (m). */
  lead: number
  fov: number
}

export interface AbilityCue {
  at: number
  run: () => void
}

export interface AbilityScript {
  id: string
  /** Fim da sequência, no tempo da regra (s). */
  dur: number
  time: TimeKey[]
  camera: CamKey[]
  cues: AbilityCue[]
  /** A cada quadro, com a posição na sequência. */
  step: (t: number) => void
  /** Sempre roda ao fechar, inclusive se foi cortada no meio. */
  finish: () => void
  /**
   * Até quando (tempo da regra) dura o close: a HUD inteira some só nessa janela e volta com o
   * recuo (apresentação 09). Sem = a sequência inteira, como antes.
   */
  closeUntil?: number
  /** Entra cortando (sem mistura): o close não passa por dentro do corpo vindo das costas. */
  cut?: boolean
}

export interface Subject {
  x: number
  z: number
  facing: number
  height: number
}

export interface View {
  pos: Vector3
  look: Vector3
  fov: number
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const smooth = (u: number) => u * u * (3 - 2 * u)

export function timeAt(keys: TimeKey[], t: number) {
  if (t <= keys[0].t) return keys[0].k
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1]
    const b = keys[i]
    if (t <= b.t) return a.k + (b.k - a.k) * ((t - a.t) / Math.max(1e-4, b.t - a.t))
  }
  return keys[keys.length - 1].k
}

export function camAt(keys: CamKey[], t: number): CamKey {
  if (t <= keys[0].t) return keys[0]
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1]
    const b = keys[i]
    if (t > b.t) continue
    const u = smooth(clamp01((t - a.t) / Math.max(1e-4, b.t - a.t)))
    const mix = (x: number, y: number) => x + (y - x) * u
    return { t, yaw: mix(a.yaw, b.yaw), dist: mix(a.dist, b.dist), high: mix(a.high, b.high), look: mix(a.look, b.look), lead: mix(a.lead, b.lead), fov: mix(a.fov, b.fov) }
  }
  return keys[keys.length - 1]
}

export interface Obstacle {
  x: number
  z: number
  r: number
}

export interface DirectorRig {
  subject: () => Subject
  /** O que não pode ficar na frente da câmera (monstros e o que eles carregam). */
  obstacles: () => Obstacle[]
  /** Raio em que a câmera ainda está dentro do chão de luta. */
  limit: number
  /** Quanto afastar o enquadramento em tela em pé (celular). */
  far: () => number
}

/** Quanto do tempo da regra o recuo leva depois do close. */
const RECOIL = 0.3

/** Velocidade da entrada e da saída do enquadramento (1/s). */
const CAM_IN = 9
const CAM_OUT = 3.6

/** Distância entre um ponto e o trecho a–b, no chão. */
function segmentGap(o: Obstacle, ax: number, az: number, bx: number, bz: number) {
  const dx = bx - ax
  const dz = bz - az
  const u = clamp01(((o.x - ax) * dx + (o.z - az) * dz) / Math.max(1e-6, dx * dx + dz * dz))
  return Math.hypot(o.x - (ax + dx * u), o.z - (az + dz * u)) - o.r
}

export class AbilityDirector {
  private script: AbilityScript | null = null
  private t = 0
  private next = 0
  /** Fim de uma prévia (laboratório); sem = até o fim da sequência. */
  private until = Infinity
  private weight = 0
  private lastCam: CamKey | null = null
  /** De que lado do corpo a câmera passa: 1 ou −1 (o mais livre, escolhido no começo). */
  private side = 1
  /** Quanto da distância está valendo (encosta no corpo se algo entrar na frente). */
  private arm = 1
  private readonly out: View = { pos: new Vector3(), look: new Vector3(), fov: 1 }
  private readonly cinePos = new Vector3()
  private readonly cineLook = new Vector3()
  /** Multiplica a aproximação e a lentidão (laboratório). */
  zoom = 1
  slow = 1
  /** Laboratório: anda mais devagar para ver quadro a quadro. */
  speed = 1
  /** Laboratório: fica na câmera do jogo. */
  off = false

  constructor(private readonly rig: DirectorRig) {}

  get playing() {
    return !!this.script
  }

  get position() {
    return this.t
  }

  /** Close ou recuo no ar: quem está entre a câmera e o corpo sai de quadro (laminas-game). */
  get framing() {
    const s = this.script
    return !!s && s.closeUntil !== undefined && this.t < s.closeUntil + RECOIL
  }

  /** O close está no ar (a HUD some). */
  get closeUp() {
    const s = this.script
    return !!s && this.t < (s.closeUntil ?? s.dur)
  }

  start(script: AbilityScript, from = 0, until = Infinity) {
    this.cancel()
    this.script = script
    this.t = from
    this.until = until
    this.next = 0
    while (this.next < script.cues.length && script.cues[this.next].at < from) this.next++
    this.lastCam = null
    this.arm = 1
    if (script.cut) this.weight = 1
    this.side = this.gapOf(script, 1) >= this.gapOf(script, -1) ? 1 : -1
  }

  /** Onde a câmera fica neste enquadramento. */
  private place(c: CamKey, side: number, me: Subject, look: Vector3, pos: Vector3) {
    const dist = (c.dist * Math.max(1, me.height / 1.8) * this.rig.far()) / this.zoom
    // yaw 0 = nas costas: o ângulo em volta do corpo parte do lado oposto ao rosto
    const a = me.facing + Math.PI + (side * c.yaw * Math.PI) / 180
    look.set(me.x + Math.sin(me.facing) * c.lead, c.look * me.height, me.z + Math.cos(me.facing) * c.lead)
    pos.set(look.x + Math.sin(a) * dist, Math.max(0.5, c.high * me.height), look.z + Math.cos(a) * dist)
    // nunca atrás do muro nem do portão
    const r = Math.hypot(pos.x, pos.z)
    if (r > this.rig.limit) {
      pos.x *= this.rig.limit / r
      pos.z *= this.rig.limit / r
    }
  }

  /** Menor folga do roteiro inteiro para o lado `side` (negativa = algo na frente). */
  private gapOf(script: AbilityScript, side: number) {
    const me = this.rig.subject()
    const obs = this.rig.obstacles()
    let gap = Infinity
    for (const c of script.camera) {
      this.place(c, side, me, this.cineLook, this.cinePos)
      for (const o of obs) gap = Math.min(gap, segmentGap(o, this.cinePos.x, this.cinePos.z, me.x, me.z))
    }
    return gap
  }

  /** Corta na hora: quem chama é a troca de cena, a morte ou o fim do jogo. */
  cancel() {
    const s = this.script
    this.script = null
    s?.finish()
  }

  /** Ritmo deste quadro (1 sem habilidade). */
  scale() {
    const s = this.script
    if (!s) return 1
    const k = timeAt(s.time, this.t)
    return (1 - (1 - k) * this.slow) * this.speed
  }

  /** `ruleT` = o tempo da regra enquanto o poder dura; null = a regra já acabou. */
  update(realDt: number, ruleT: number | null) {
    const s = this.script
    if (!s) return
    this.t = ruleT ?? this.t + realDt * this.scale()
    while (this.next < s.cues.length && s.cues[this.next].at <= this.t) s.cues[this.next++].run()
    s.step(this.t)
    if (this.t >= Math.min(s.dur, this.until)) this.cancel()
  }

  /** Mistura o enquadramento da habilidade com a câmera do jogo. */
  view(gamePos: Vector3, gameLook: Vector3, gameFov: number, realDt: number): View {
    const s = this.script
    if (s) this.lastCam = camAt(s.camera, this.t)
    this.weight += ((s ? 1 : 0) - this.weight) * Math.min(1, realDt * (s ? CAM_IN : CAM_OUT))
    if (this.weight < 0.004 && !s) this.weight = 0
    const out = this.out
    const c = this.lastCam
    if (this.weight === 0 || !c || this.off) {
      out.pos.copyFrom(gamePos)
      out.look.copyFrom(gameLook)
      out.fov = gameFov
      return out
    }
    const me = this.rig.subject()
    this.place(c, this.side, me, this.cineLook, this.cinePos)
    // algo entrou na frente: a câmera desliza para perto do corpo até sair de dentro
    // (no close e no recuo não: lá quem está na frente sai de quadro, e encostar enfiaria a câmera no corpo)
    let want = 1
    if (!this.framing)
      for (const o of this.rig.obstacles()) {
        while (want > 0.35 && Math.hypot(me.x + (this.cinePos.x - me.x) * want - o.x, me.z + (this.cinePos.z - me.z) * want - o.z) < o.r) want -= 0.08
      }
    this.arm += (want - this.arm) * Math.min(1, realDt * 10)
    this.cinePos.x = me.x + (this.cinePos.x - me.x) * this.arm
    this.cinePos.z = me.z + (this.cinePos.z - me.z) * this.arm
    const w = smooth(clamp01(this.weight))
    Vector3.LerpToRef(gamePos, this.cinePos, w, out.pos)
    Vector3.LerpToRef(gameLook, this.cineLook, w, out.look)
    out.fov = gameFov + (c.fov - gameFov) * w
    return out
  }

  dispose() {
    this.cancel()
  }
}
