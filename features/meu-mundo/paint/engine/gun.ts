// features/meu-mundo/paint/engine/gun.ts — PAINT: a arma de tinta é o Lançador rosa.
//
// Pedido do Alex (2026-11-05): o mesmo modelo da loja de Guns, preto com neon
// #FF007A (`fogo-rosa`, build_guns_loja.py). O halo vem da textura de emissão, só
// nas peças de neon. A cor da tinta escolhida fica no HUD.
// Vai entre as mãos do avatar quando os ossos existem; sem eles, ao lado do corpo.

import type { Scene } from "@babylonjs/core/scene"
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh"
import type { AssetContainer, InstantiatedEntries } from "@babylonjs/core/assetContainer"
import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader"
import { TransformNode } from "@babylonjs/core/Meshes/transformNode"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import { ensureLoaders } from "../../engine/avatars"
import { gunSize, shopGun } from "../../engine/shop-swords"
import { shineWeapon } from "../../engine/weapon-shine"
import type { PaintColor } from "../sim/tuning"

/** Um arquivo por cena; cada jogador instancia o seu. */
const models = new WeakMap<Scene, Promise<AssetContainer>>()
function gunModel(scene: Scene) {
  let p = models.get(scene)
  if (!p) {
    ensureLoaders()
    p = LoadAssetContainerAsync(shopGun("fogo_rosa")!.file, scene)
    p.catch(() => models.delete(scene))
    models.set(scene, p)
  }
  return p
}

/** Avanço do modelo a partir da mão, em fração do comprimento. */
const GRIP_FORWARD = 0.25

let seq = 0

export class PaintGun {
  readonly root: TransformNode
  private readonly frame: TransformNode
  private entries: InstantiatedEntries | null = null
  private color: PaintColor = 0
  private kick = 0
  private mounted = false
  private gone = false

  /** `onGlow` recebe a malha do neon quando o modelo chega (a GlowLayer da cena a inclui). */
  constructor(scene: Scene, onGlow?: (m: AbstractMesh) => void) {
    const id = ++seq
    this.root = new TransformNode(`paint-gun-${id}`, scene)
    this.root.scaling.setAll(gunSize(0))
    this.frame = new TransformNode(`paint-gun-frame-${id}`, scene)
    this.frame.parent = this.root
    gunModel(scene)
      .then((c) => {
        if (this.gone) return
        this.entries = c.instantiateModelsToScene((n) => `${n}-${id}`, false, { doNotInstantiate: true })
        const model = this.entries.rootNodes[0] as TransformNode
        // o glTF chega com o cano em −X: um quarto de volta leva à frente (+Z)
        const turn = new TransformNode(`paint-gun-turn-${id}`, scene)
        turn.parent = this.frame
        turn.rotation.y = Math.PI / 2
        model.parent = turn
        for (const m of model.getChildMeshes(false)) m.isPickable = false
        shineWeapon(model, onGlow)
      })
      .catch(() => {})
  }

  setColor(c: PaintColor) {
    this.color = c
  }

  get current() {
    return this.color
  }

  /** Coice do tiro. */
  fired() {
    this.kick = 1
  }

  /**
   * Nas mãos: a origem do modelo é o punho, na mão direita; o cano vai para a
   * esquerda (as animações seguram um fuzil à frente do corpo). `height` =
   * altura de quem segura: a arma cresce com ela. Posições de mundo.
   */
  mount(right: Vector3, left: Vector3, fallbackDir: Vector3, height: number) {
    if (!this.mounted) {
      this.root.parent = null
      this.mounted = true
    }
    const size = gunSize(height)
    this.root.scaling.setAll(size)
    let dir = left.subtract(right)
    if (dir.length() < 0.08) dir = fallbackDir
    dir.normalize()
    // Corpo largo fecha as mãos no peito e a linha entre elas atravessa o tronco
    // (a arma ficava dentro dele): quanto mais longe da frente, mais a frente manda.
    const along = Math.max(0, Math.min(1, (Vector3.Dot(dir, fallbackDir) - 0.6) / 0.3))
    dir = Vector3.Lerp(fallbackDir, dir, along).normalize()
    // o punho fica no meio do modelo: à frente, para a traseira parar no ombro e não sair pelas costas
    this.root.position.copyFrom(right).addInPlace(dir.scale(size * GRIP_FORWARD))
    this.root.lookAt(this.root.position.add(dir))
  }

  /** Solta da mão (avatar ainda carregando): volta para o lado do corpo. */
  unmount(holder: TransformNode) {
    if (!this.mounted) return
    this.mounted = false
    this.root.rotationQuaternion = null
    this.root.parent = holder
    this.root.position.set(0.3, 1.12, 0.32)
  }

  /** Inclinação da mira (rad, + = para baixo; só fora da mão) e o coice. */
  tick(dt: number, pitch: number) {
    this.kick = Math.max(0, this.kick - dt * 9)
    if (!this.mounted) this.root.rotation.x = pitch
    this.frame.position.z = -this.kick * 0.05
  }

  dispose() {
    this.gone = true
    this.entries?.dispose()
    this.root.dispose()
  }
}
