// features/meu-mundo/engine/player.ts
//
// Personagens do bairro.
//
//  - `Character`: o corpo visível (avatar animado + sombra falsa + etiqueta),
//    com troca de corpo SEM recarregar o bairro: o corpo novo é carregado
//    antes de o anterior sair, e se o novo falhar o antigo fica. Enquanto o
//    primeiro avatar não chega (ou se ele não carregar), aparece o boneco
//    PROVISÓRIO de antes — nunca um buraco no lugar do jogador.
//  - `LocalPlayer`: o personagem de quem joga. Move-se NA HORA com a mesma
//    regra do servidor (motion.ts) e converge suavemente para a posição que o
//    servidor confirmou — sem teleporte, sem velocidade arbitrária.
//  - `RemotePlayer`: outro morador. Interpola a posição recebida da sala.

import type { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import type { Scene } from "@babylonjs/core/scene"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import type { Plane } from "@babylonjs/core/Maths/math.plane"
import type { Camera } from "@babylonjs/core/Cameras/camera"
import type { QualityProfile } from "./quality"
import { GeoBuilder, place } from "./geometry"
import { type Box2 } from "./collision"
import { RemoteWalker, type WalkerPose } from "./remote-walker"
import { SpeechBubble } from "./speech-bubble"
import { AvatarLibrary, AvatarRig, makeNameTag, makeShadow, newHolder, type BoxeBase, type BoxeClip, type PlacePose } from "./avatars"
import { lerpAngle, step, type Body, type Intent, type MotionProfile, type MoveState } from "./motion"
import type { BodyId } from "../types"

function provisionalMesh(scene: Scene, material: StandardMaterial, name: string): Mesh {
  const g = new GeoBuilder()
  for (const sx of [-0.13, 0.13]) g.cylinder(0.2, 0.32, place(sx, 0.16, 0), [0.25, 0.27, 0.36], 8)
  g.sphere(0.62, [1, 1.05, 0.88], place(0, 0.56, 0), [0.86, 0.2, 0.22], 8)
  g.sphere(0.9, [1, 0.96, 0.98], place(0, 1.25, 0), [0.99, 0.85, 0.72], 10)
  g.sphere(0.96, [1, 0.72, 1], place(0, 1.42, -0.08), [0.42, 0.25, 0.15], 10)
  for (const sx of [-0.16, 0.16]) g.sphere(0.11, [1, 1.45, 0.6], place(sx, 1.24, 0.41), [0.1, 0.1, 0.13])
  return g.build(name, scene, material, false)
}

let seq = 0

export class Character {
  readonly holder: TransformNode
  private rig: AvatarRig | null = null
  private fallback: Mesh | null
  private readonly shadow: Mesh
  private tag: { mesh: Mesh; dispose: () => void } | null = null
  /** Balão de fala (mm3d-32): criado só na primeira fala. */
  private bubble: SpeechBubble | null = null
  private loadToken = 0
  private disposed = false
  body: BodyId
  /** Cores (mm3d-36): código look da sala ("" = textura original). */
  look = ""
  move: MoveState = 0
  speed = 0
  /** Ritmo < 1 (cansado/exausto, mm3d-13): poses curvadas. */
  tired = false
  /** Indisposto (mm3d-28, `sk` da sala): pose de quem passa mal; vence o cansado. */
  unwell = false
  /** Pedido de quem chama (carro, outro andar). */
  private shown = true
  /** Além do corte de distância (mm3d-19). */
  private culled = false
  /** Selecionado por quem joga (mm3d-31): a cápsula do destaque toma o lugar do nome. */
  private tagHidden = false
  private tagNear = true

  constructor(
    private readonly scene: Scene,
    private readonly lib: AvatarLibrary,
    mats: { fallback: StandardMaterial; shadow: StandardMaterial },
    body: BodyId,
    name: string | null,
    mine: boolean,
    look = "",
  ) {
    const id = ++seq
    this.holder = newHolder(scene, `mm-char-${id}`)
    this.fallback = provisionalMesh(scene, mats.fallback, `mm-char-fallback-${id}`)
    this.fallback.parent = this.holder
    this.shadow = makeShadow(scene, mats.shadow, `mm-char-shadow-${id}`)
    if (name) {
      this.tag = makeNameTag(scene, name, mine)
      this.tag.mesh.parent = this.holder
      this.tag.mesh.position.y = 2.1
    }
    this.body = body
    this.look = look
    void this.setBody(body, true)
  }

  /** Troca o corpo (e/ou as cores) preservando posição, orientação e movimento. */
  async setBody(body: BodyId, force = false, look = this.look) {
    if (!force && body === this.body && look === this.look && this.rig) return
    this.body = body
    this.look = look
    const token = ++this.loadToken
    let next: AvatarRig
    try {
      next = await this.lib.create(body, look)
    } catch (err) {
      if (!this.disposed) console.warn("[meu-mundo] avatar não carregou", body, err)
      return
    }
    if (this.disposed || token !== this.loadToken) {
      next.dispose()
      return
    }
    next.setParent(this.holder)
    next.pose = this.pose
    next.boxe = this.boxeBase
    next.update(0, this.move, this.speed, this.tired, this.unwell)
    const prev = this.rig
    this.rig = next
    prev?.dispose()
    if (this.fallback) {
      this.fallback.dispose()
      this.fallback = null
    }
  }

  /** Cores novas (mm3d-36): recria o avatar com a textura pintada. */
  setLook(look: string) {
    return this.setBody(this.body, false, look)
  }

  /** `groundY`: chão sob quem está no ar (Paint, mm3d-35); sem chão embaixo, a sombra some na névoa. */
  place(x: number, z: number, facing: number, y = 0, groundY = y) {
    this.holder.position.set(x, y, z)
    this.holder.rotation.y = facing
    this.shadow.position.set(x, (Number.isFinite(groundY) ? groundY : y - 400) + 0.09, z)
  }

  /** Paint (mm3d-35): no ar (pose do pulo) e soco. */
  setAir(on: boolean) {
    if (this.rig) this.rig.air = on
  }

  punch() {
    this.rig?.punch()
  }

  /** Pulou (Paint): 0 parado/à frente, 1 de lado, 2 o segundo pulo. */
  jump(kind: 0 | 1 | 2) {
    this.rig?.jump(kind)
  }

  /** Fase do voo do Paint (0 saída, 0,5 alto, 1 chegando ao chão). */
  setAirPhase(p: number) {
    this.rig?.setAirPhase(p)
  }

  /** Atividade num prédio (mm3d-37b): o clipe do aparelho em laço; null = normal. */
  setPose(pose: PlacePose | null) {
    this.pose = pose
    if (this.rig) this.rig.pose = pose
  }
  private pose: PlacePose | null = null

  /** Arena de Boxe (mm3d-43): pose-base da luta (null = locomoção normal). */
  setBoxe(base: BoxeBase | null) {
    this.boxeBase = base
    if (this.rig) this.rig.boxe = base
  }
  private boxeBase: BoxeBase | null = null

  /** Golpe/reação/queda de uma vez, do trecho from–to do clipe, em `dur` s (ver AvatarRig.boxeAct). */
  boxeAct(clip: BoxeClip, dur: number, from = 0, to = 1, hold = false) {
    return this.rig?.boxeAct(clip, dur, from, to, hold) ?? false
  }

  boxeClear() {
    this.rig?.boxeClear()
  }

  /** Andando na guarda (mm3d-45): m/s no referencial do corpo (frente, direita). */
  setBoxeMove(fwd: number, side: number) {
    if (this.rig) this.rig.boxeMove = { fwd, side }
  }

  /** Locomoção armada do Paint (m/s no referencial do corpo); null = normal. */
  setPaintMove(fwd: number, side: number, firing: boolean) {
    if (this.rig) this.rig.paint = { fwd, side, firing }
  }

  /** Posição de mundo de um osso, com a cadeia recalculada AGORA (depois de place). */
  bonePosition(name: string): Vector3 | null {
    const n = this.rig?.node(name)
    if (!n) return null
    const chain = []
    for (let p: TransformNode | null = n; p; p = p.parent as TransformNode | null) chain.push(p)
    for (let i = chain.length - 1; i >= 0; i--) chain[i].computeWorldMatrix(true)
    return n.getAbsolutePosition().clone()
  }

  /** Nó do esqueleto pelo nome (ex.: "mixamorig:RightHand"); null sem avatar. */
  bone(name: string) {
    return this.rig?.node(name) ?? null
  }

  /** Esconde (outro andar) sem descartar. */
  setVisible(v: boolean) {
    this.shown = v
    this.syncEnabled()
  }

  private syncEnabled() {
    const on = this.shown && !this.culled
    this.holder.setEnabled(on)
    this.shadow.setEnabled(on)
  }

  /**
   * Detalhe pela distância à câmera (mm3d-19), para os OUTROS jogadores:
   * além do corte some e não anima; fora da tela fica com a pose parada (não
   * é desenhado mesmo); o nome só aparece de perto. A malha leve é trocada
   * pelo próprio Babylon (nível de LOD), na distância do perfil.
   */
  applyDistance(d: number, planes: Plane[], q: QualityProfile) {
    const culled = d > q.avatarCut
    if (culled !== this.culled) {
      this.culled = culled
      this.syncEnabled()
    }
    this.tagNear = d <= q.tagCut
    if (this.tag) this.tag.mesh.setEnabled(this.tagNear && !this.tagHidden)
    this.tickBubble()
    if (!this.rig) return
    this.rig.setLodDistance(q.avatarLod)
    this.rig.setFrozen(culled || !this.rig.inFrustum(planes))
  }

  /** Esconde o nome comum enquanto o destaque de seleção mostra o dele (player-select.ts). */
  setTagHidden(on: boolean) {
    this.tagHidden = on
    if (this.tag) this.tag.mesh.setEnabled(this.tagNear && !on)
  }

  /**
   * Fala do chat (mm3d-32) num balão sobre a cabeça. O balão continua com o
   * boneco selecionado (é fala, não nome) e segue o corte de distância do nome.
   */
  say(text: string) {
    if (this.disposed) return
    this.bubble ??= new SpeechBubble(this.scene, this.holder)
    this.bubble.say(text)
    this.tickBubble()
  }

  /** Apaga o balão vencido; cena sem corte de distância (casa) chama no laço. */
  tickBubble() {
    this.bubble?.tick(this.tagNear)
  }

  /** Com balão no ar (conferência). */
  get speaking() {
    return !!this.bubble?.active()
  }

  /** Animando agora (conferência). */
  get animating() {
    return !!this.rig && !this.rig.isFrozen && this.shown && !this.culled
  }

  /** Desenhado com a malha leve por esta câmera (conferência). */
  usingLod(cam: Camera) {
    if (!this.rig || !this.shown || this.culled) return false
    return Math.hypot(this.holder.position.x - cam.globalPosition.x, this.holder.position.z - cam.globalPosition.z) > this.rig.lodDistance
  }

  animate(dt: number, move: MoveState, speed: number) {
    this.move = move
    this.speed = speed
    this.rig?.update(dt, move, speed, this.tired, this.unwell)
    if (this.fallback) {
      const bob = move ? Math.abs(Math.sin(performance.now() / 120)) * 0.06 : 0
      this.fallback.position.y = bob
    }
  }

  get hasAvatar() {
    return !!this.rig
  }

  /** Ângulo da pedivela de quem pedala (mm3d-14); 0 sem avatar. */
  get crank() {
    return this.rig?.crank ?? 0
  }

  /** Tornozelos no mundo [esquerdo, direito] (patins); null sem avatar. */
  feetWorld() {
    return this.rig?.feetWorld() ?? [null, null]
  }

  /**
   * Tornozelos no referencial do próprio personagem (x, altura, frente), do
   * último quadro desenhado — pose e referencial do MESMO quadro, então não
   * atrasa quando o personagem anda (mm3d-23: a bota dos patins ficava para
   * trás nas curvas porque a posição de mundo era do quadro anterior).
   */
  feetLocal(): (Vector3 | null)[] {
    const world = this.rig?.feetWorld()
    if (!world) return [null, null]
    const inv = this.holder.getWorldMatrix().clone().invert()
    return world.map((p) => (p ? Vector3.TransformCoordinates(p, inv) : null))
  }

  /** Tornozelo acima da sola em pé (m). */
  get ankleRest() {
    return this.rig?.ankleRest ?? 0.148
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    this.loadToken++
    this.rig?.dispose()
    this.rig = null
    this.fallback?.dispose()
    this.tag?.dispose()
    this.bubble?.dispose()
    this.bubble = null
    this.shadow.dispose()
    this.holder.dispose()
  }
}

/** O personagem de quem joga: predição local + correção suave. */
export class LocalPlayer {
  readonly body: Body
  readonly char: Character
  move: MoveState = 0
  private visualFacing: number
  private server: { x: number; z: number } | null = null

  constructor(char: Character, x: number, z: number, facing: number) {
    this.char = char
    this.body = { x, z, vx: 0, vz: 0, facing }
    this.visualFacing = facing
    char.place(x, z, facing)
  }

  get x() {
    return this.body.x
  }
  get z() {
    return this.body.z
  }

  private lastServer: { x: number; z: number } | null = null
  private staleServer: { x: number; z: number } | null = null

  teleport(x: number, z: number, facing: number) {
    Object.assign(this.body, { x, z, vx: 0, vz: 0, facing })
    this.visualFacing = facing
    // A mensagem do teleporte chega ANTES do estado novo da sala: até ele
    // chegar, a posição do servidor que o laço repassa ainda é a de antes
    // (ao descer do veículo, a do motorista, no meio do carro) — e puxava o
    // personagem de volta para dentro do carro, onde ficava preso (mm3d-24).
    this.staleServer = this.lastServer
    this.server = null
    this.char.place(x, z, facing)
  }

  /** Posição confirmada pelo servidor (chega ~10×/s). Ignora a de antes do último teleporte. */
  setServer(x: number, z: number) {
    const old = this.staleServer
    if (old && old.x === x && old.z === z) return
    this.staleServer = null
    this.lastServer = { x, z }
    this.server = { x, z }
  }

  update(
    dt: number,
    intent: Intent,
    boxes: Box2[],
    limit: number,
    speeds: { walk: number; run: number },
    shape: MotionProfile | null = null,
  ) {
    this.move = step(this.body, intent, dt, boxes, limit, speeds, shape)
    const moving = intent.x !== 0 || intent.z !== 0
    if (this.server) {
      const ex = this.server.x - this.body.x
      const ez = this.server.z - this.body.z
      const err = Math.hypot(ex, ez)
      // Andando, o servidor está ~meia latência atrás: só corrige erro grande
      // (colisão divergente). Parado, converge de vez, sem tranco.
      const tolerance = moving ? speeds.run * 0.6 + 0.6 : 0.02
      if (err > 6) {
        this.body.x = this.server.x
        this.body.z = this.server.z
      } else if (err > tolerance) {
        const k = 1 - Math.exp(-(moving ? 2.5 : 6) * dt)
        this.body.x += ex * k
        this.body.z += ez * k
      }
    }
    this.visualFacing = lerpAngle(this.visualFacing, this.body.facing, 1 - Math.exp(-12 * dt))
    this.char.place(this.body.x, this.body.z, this.visualFacing)
    this.char.animate(dt, this.move, Math.hypot(this.body.vx, this.body.vz))
  }

  dispose() {
    this.char.dispose()
  }
}

/** Outro morador: interpola o estado recebido da sala. */
export class RemotePlayer {
  /** Id do veículo em que está montado (bike, skate, patins); 0 = a pé ou no carro. */
  car = 0
  /** Nome que a sala mostra (mm3d-31: cápsula do destaque e cabeçalho do card). */
  name = ""
  x: number
  z: number
  facing: number
  private tMove: MoveState = 0
  y = 0
  private lastX: number
  private lastZ: number
  private speed = 0
  // mm3d-27: linha do tempo dos estados da sala (remote-walker.ts), no lugar
  // de perseguir o último ponto (anda-e-freia a cada pacote).
  private readonly track = new RemoteWalker()
  private readonly at: WalkerPose = { x: 0, z: 0, y: 0, facing: 0 }

  constructor(readonly char: Character, x: number, z: number, facing: number) {
    this.x = this.lastX = x
    this.z = this.lastZ = z
    this.facing = facing
    this.track.push(performance.now() / 1000, x, z, facing)
    char.place(x, z, facing)
  }

  setTarget(x: number, z: number, facing: number, move: MoveState, y = 0) {
    this.tMove = move
    this.track.push(performance.now() / 1000, x, z, facing, y)
  }

  update(dt: number) {
    if (this.track.pose(performance.now() / 1000, this.at)) {
      this.x = this.at.x
      this.z = this.at.z
      this.y = this.at.y
      this.facing = this.at.facing
    }
    const inst = dt > 0 ? Math.hypot(this.x - this.lastX, this.z - this.lastZ) / dt : 0
    this.speed += (inst - this.speed) * (1 - Math.exp(-8 * dt))
    this.lastX = this.x
    this.lastZ = this.z
    this.char.place(this.x, this.z, this.facing, this.y)
    this.char.animate(dt, this.tMove, this.speed)
  }

  dispose() {
    this.char.dispose()
  }
}
