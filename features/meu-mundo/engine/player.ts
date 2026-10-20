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
import { GeoBuilder, place } from "./geometry"
import { type Box2 } from "./collision"
import { AvatarLibrary, AvatarRig, makeNameTag, makeShadow, newHolder } from "./avatars"
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
  private loadToken = 0
  private disposed = false
  body: BodyId
  move: MoveState = 0
  speed = 0
  /** Ritmo < 1 (cansado/exausto, mm3d-13): poses curvadas. */
  tired = false

  constructor(
    private readonly scene: Scene,
    private readonly lib: AvatarLibrary,
    mats: { fallback: StandardMaterial; shadow: StandardMaterial },
    body: BodyId,
    name: string | null,
    mine: boolean,
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
    void this.setBody(body, true)
  }

  /** Troca o corpo preservando posição, orientação e movimento. */
  async setBody(body: BodyId, force = false) {
    if (!force && body === this.body && this.rig) return
    this.body = body
    const token = ++this.loadToken
    let next: AvatarRig
    try {
      next = await this.lib.create(body)
    } catch (err) {
      if (!this.disposed) console.warn("[meu-mundo] avatar não carregou", body, err)
      return
    }
    if (this.disposed || token !== this.loadToken) {
      next.dispose()
      return
    }
    next.setParent(this.holder)
    next.update(0, this.move, this.speed, this.tired)
    const prev = this.rig
    this.rig = next
    prev?.dispose()
    if (this.fallback) {
      this.fallback.dispose()
      this.fallback = null
    }
  }

  place(x: number, z: number, facing: number, y = 0) {
    this.holder.position.set(x, y, z)
    this.holder.rotation.y = facing
    this.shadow.position.set(x, y + 0.09, z)
  }

  /** Esconde (outro andar) sem descartar. */
  setVisible(v: boolean) {
    this.holder.setEnabled(v)
    this.shadow.setEnabled(v)
  }

  animate(dt: number, move: MoveState, speed: number) {
    this.move = move
    this.speed = speed
    this.rig?.update(dt, move, speed, this.tired)
    if (this.fallback) {
      const bob = move ? Math.abs(Math.sin(performance.now() / 120)) * 0.06 : 0
      this.fallback.position.y = bob
    }
  }

  get hasAvatar() {
    return !!this.rig
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    this.loadToken++
    this.rig?.dispose()
    this.rig = null
    this.fallback?.dispose()
    this.tag?.dispose()
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

  teleport(x: number, z: number, facing: number) {
    Object.assign(this.body, { x, z, vx: 0, vz: 0, facing })
    this.visualFacing = facing
    this.server = null
    this.char.place(x, z, facing)
  }

  /** Posição confirmada pelo servidor (chega ~10×/s). */
  setServer(x: number, z: number) {
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
  x: number
  z: number
  facing: number
  private tx: number
  private tz: number
  private tf: number
  private tMove: MoveState = 0
  y = 0
  private ty = 0
  private lastX: number
  private lastZ: number
  private speed = 0

  constructor(readonly char: Character, x: number, z: number, facing: number) {
    this.x = this.tx = this.lastX = x
    this.z = this.tz = this.lastZ = z
    this.facing = this.tf = facing
    char.place(x, z, facing)
  }

  setTarget(x: number, z: number, facing: number, move: MoveState, y = 0) {
    this.tx = x
    this.tz = z
    this.tf = facing
    this.tMove = move
    this.ty = y
  }

  update(dt: number) {
    const err = Math.hypot(this.tx - this.x, this.tz - this.z)
    if (err > 8) {
      this.x = this.tx
      this.z = this.tz
      this.y = this.ty
    } else {
      const k = 1 - Math.exp(-10 * dt)
      this.x += (this.tx - this.x) * k
      this.z += (this.tz - this.z) * k
      this.y += (this.ty - this.y) * k
    }
    this.facing = lerpAngle(this.facing, this.tf, 1 - Math.exp(-10 * dt))
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
