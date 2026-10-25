// features/meu-mundo/engine/fridge-door.ts — a porta da geladeira que ABRE (mm3d-28).
//
// A geladeira desenhada pelo interior (interior.ts) é parte da malha única do
// andar e não se mexe. Quando a pessoa abre a SUA geladeira, este módulo põe
// por cima duas peças só nesta tela: o vão iluminado na frente do móvel e a
// porta girando na dobradiça (lado oposto ao puxador). Nada vai para a sala —
// os outros não veem a interface nem a porta. Uma porta por vez; fechar
// anima de volta e descarta as peças.

import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { Matrix } from "@babylonjs/core/Maths/math.vector"
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import type { Scene } from "@babylonjs/core/scene"
import type { InteriorDef, InteriorFridge } from "../types"

const OPEN_DEG = 105
const SPEED = 4.2 // fração da abertura por segundo

export class FridgeDoor {
  private door: Mesh | null = null
  private light: Mesh | null = null
  private mats: StandardMaterial[] = []
  private frame = Matrix.Identity()
  private size = { w: 0.72, d: 0.7, h: 1.85 }
  private open = 0
  private target = 0
  private id: string | null = null

  constructor(
    private scene: Scene,
    private def: InteriorDef,
  ) {}

  /** Abre a porta desta geladeira (a anterior, se houver, some na hora). */
  show(f: InteriorFridge) {
    if (this.id !== f.id) this.drop()
    this.id = f.id
    this.target = 1
    if (this.door) return
    this.size = this.def.furnitureTypes.fridge ?? this.size
    const { w, d, h } = this.size
    const y = this.def.floors[f.floor]?.y ?? 0
    this.frame = Matrix.RotationY((f.r * Math.PI) / 180).multiply(Matrix.Translation(f.center.x, y, f.center.z))
    const white = new StandardMaterial("mm-fridge-door", this.scene)
    white.diffuseColor = new Color3(0.97, 0.97, 0.96)
    white.specularColor = new Color3(0.1, 0.1, 0.1)
    // O vão aceso: emissivo, sem luz própria (nada de sombra nem luz extra).
    const glow = new StandardMaterial("mm-fridge-glow", this.scene)
    glow.disableLighting = true
    glow.emissiveColor = new Color3(0.78, 0.9, 1)
    this.mats = [white, glow]
    const door = MeshBuilder.CreateBox("mm-fridge-door", { width: w, height: h, depth: 0.05 }, this.scene)
    door.material = white
    door.isPickable = false
    const light = MeshBuilder.CreateBox("mm-fridge-light", { width: w - 0.08, height: h - 0.1, depth: 0.004 }, this.scene)
    light.material = glow
    light.isPickable = false
    // Na frente do puxador e do friso (que vão até −d/2 − 0,04).
    light.freezeWorldMatrix(Matrix.Translation(0, h / 2, -d / 2 - 0.046).multiply(this.frame))
    light.setEnabled(false)
    this.door = door
    this.light = light
    this.place()
  }

  /** Fecha (anima e descarta). */
  hide() {
    this.target = 0
  }

  get isOpen() {
    return this.id !== null
  }

  /** A geladeira está no andar `floor` ou abaixo dele (o resto fica escondido junto). */
  tick(dt: number, visibleFloor: number) {
    if (!this.door || !this.id) return
    const f = this.def.fridges?.find((x) => x.id === this.id)
    const step = SPEED * dt
    this.open = this.target > this.open ? Math.min(this.target, this.open + step) : Math.max(this.target, this.open - step)
    if (this.open <= 0 && this.target === 0) return this.drop()
    const vis = !f || f.floor <= visibleFloor
    this.door.setEnabled(vis)
    this.light?.setEnabled(vis && this.open > 0.05)
    this.place()
  }

  private place() {
    if (!this.door) return
    const { w, d, h } = this.size
    const k = 1 - Math.pow(1 - this.open, 3)
    const ang = (OPEN_DEG * Math.PI * k) / 180
    // Dobradiça no lado oposto ao puxador (x = −w/2), na face da frente (−d/2).
    const m = Matrix.Translation(w / 2, h / 2, -0.025)
      .multiply(Matrix.RotationY(ang))
      .multiply(Matrix.Translation(-w / 2, 0, -d / 2))
      .multiply(this.frame)
    this.door.freezeWorldMatrix(m)
  }

  private drop() {
    this.door?.dispose()
    this.light?.dispose()
    for (const m of this.mats) m.dispose()
    this.door = null
    this.light = null
    this.mats = []
    this.open = 0
    this.target = 0
    this.id = null
  }

  dispose() {
    this.drop()
  }
}
