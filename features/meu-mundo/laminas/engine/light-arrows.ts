// features/meu-mundo/laminas/engine/light-arrows.ts — flechas de luz das arqueiras (mm3d-69).
//
// Só desenho: o tiro é o da regra (Fight.shots, o mesmo da maga). A flecha é uma haste
// e uma ponta de luz na cor do arco, aponta para onde anda e deixa uma fita atrás.
import type { Scene } from "@babylonjs/core/scene"
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector"
import { Mesh } from "@babylonjs/core/Meshes/mesh"
import { TransformNode } from "@babylonjs/core/Meshes/transformNode"
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import type { Trail, VfxColor, createVfx } from "../../engine/vfx"

type Vfx = ReturnType<typeof createVfx>
interface Arrow {
  id: number
  on: boolean
  node: TransformNode
  trail: Trail
  last: Vector3
  dir: Vector3
  size: number
}

const LEN = 1.5
const UP = new Vector3(0, 1, 0)

export class LightArrows {
  private readonly list: Arrow[] = []
  private readonly meshes: Mesh[] = []
  private readonly mats: StandardMaterial[] = []

  /** `size` < 1 = tiro curto de arma de fogo. */
  constructor(scene: Scene, vfx: Vfx, color: VfxColor, private readonly size = 1) {
    const glow = (name: string, c: Color3) => {
      const m = new StandardMaterial(name, scene)
      m.disableLighting = true
      m.emissiveColor = c
      m.specularColor = Color3.Black()
      this.mats.push(m)
      return m
    }
    const shaft = glow("arrow-shaft", Color3.Lerp(color.main, Color3.White(), 0.55))
    const tip = glow("arrow-tip", color.edge)
    for (let i = 0; i < 4; i++) {
      const node = new TransformNode("light-arrow-" + i, scene)
      node.rotationQuaternion = new Quaternion()
      const body = CreateCylinder("arrow-body-" + i, { height: LEN, diameter: 0.07, tessellation: 6 }, scene)
      const head = CreateCylinder("arrow-head-" + i, { height: 0.42, diameterTop: 0, diameterBottom: 0.26, tessellation: 6 }, scene)
      body.position.y = -LEN / 2
      head.position.y = 0.21
      body.material = shaft
      head.material = tip
      for (const m of [body, head]) {
        m.parent = node
        m.isPickable = false
        vfx.addGlow(m)
        this.meshes.push(m)
      }
      node.setEnabled(false)
      const a: Arrow = { id: -1, on: false, node, last: Vector3.Zero(), dir: new Vector3(0, 0, 1), size: 1, trail: null as unknown as Trail }
      a.trail = vfx.trail(() => {
        if (!a.on) return null
        const p = a.node.position
        const side = Vector3.Cross(a.dir, UP).normalize().scale(0.14 * a.size)
        return [p.add(side), p.subtract(side)]
      }, color)
      this.list.push(a)
    }
  }

  shot(id: number, at: Vector3, heavy: boolean, scale = 1) {
    const a = this.list.find((x) => !x.on) ?? this.list[0]
    a.id = id
    a.on = true
    a.size = (heavy ? 1.5 : 1) * scale * this.size
    a.node.scaling.setAll(a.size)
    a.node.position.copyFrom(at)
    a.last.copyFrom(at)
    a.trail.active = true
    a.node.setEnabled(false) // acende no primeiro passo, já apontada
  }

  move(id: number, at: Vector3) {
    const a = this.list.find((x) => x.on && x.id === id)
    if (!a) return
    const d = at.subtract(a.last)
    if (d.lengthSquared() > 1e-6) {
      a.dir.copyFrom(d.normalize())
      a.last.copyFrom(at)
      Quaternion.FromUnitVectorsToRef(UP, a.dir, a.node.rotationQuaternion!)
      a.node.setEnabled(true)
    }
    a.node.position.copyFrom(at)
  }

  end(id: number) {
    const a = this.list.find((x) => x.on && x.id === id)
    if (!a) return
    a.on = false
    a.trail.active = false
    a.node.setEnabled(false)
  }

  dispose() {
    for (const m of this.meshes) m.dispose()
    for (const a of this.list) a.node.dispose()
    for (const m of this.mats) m.dispose()
  }
}
