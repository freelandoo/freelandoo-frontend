// features/meu-mundo/laminas/engine/ray.ts — raio de luz da luta (2026-11-06).
//
// Dois tubos aditivos: a luz por fora, na cor do monstro, e o miolo quase branco, que
// tremem de leve. Serve para o raio verde das pedras do Golem (curto e, no golpe máximo,
// grosso e contínuo) e para o raio roxo da boca dos lobos.
import type { Scene } from "@babylonjs/core/scene"
import { Constants } from "@babylonjs/core/Engines/constants"
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector"

let seq = 0

export class Ray {
  private readonly outer: Mesh
  private readonly core: Mesh
  private readonly mats: StandardMaterial[] = []
  private life = 0
  private width = 0
  private t = Math.random() * 9

  constructor(scene: Scene, color: Color3, addGlow?: (m: AbstractMesh) => void) {
    const id = ++seq
    const tube = (name: string, c: Color3, alpha: number) => {
      const mat = new StandardMaterial(`mm-ray-${name}-${id}`, scene)
      mat.emissiveColor = c
      mat.diffuseColor = new Color3(0, 0, 0)
      mat.specularColor = new Color3(0, 0, 0)
      mat.disableLighting = true
      mat.alpha = alpha
      mat.alphaMode = Constants.ALPHA_ADD
      mat.backFaceCulling = false
      this.mats.push(mat)
      const m = CreateCylinder(`mm-ray-${name}-${id}`, { height: 1, diameter: 1, tessellation: 10 }, scene)
      m.material = mat
      m.isPickable = false
      m.setEnabled(false)
      m.rotationQuaternion = new Quaternion()
      return m
    }
    this.outer = tube("luz", color, 0.55)
    this.core = tube("miolo", Color3.Lerp(color, new Color3(1, 1, 1), 0.75), 0.95)
    addGlow?.(this.core)
  }

  /** Acende de `from` a `to`; apaga sozinho `life` s depois da última chamada. */
  fire(from: Vector3, to: Vector3, width: number, life = 0.12) {
    const path = to.subtract(from)
    const len = path.length()
    if (len < 0.01) return
    const dir = path.scale(1 / len)
    const mid = from.add(to).scale(0.5)
    for (const m of [this.outer, this.core]) {
      Quaternion.FromUnitVectorsToRef(Vector3.Up(), dir, m.rotationQuaternion!)
      m.position.copyFrom(mid)
      m.scaling.y = len
      m.setEnabled(true)
    }
    this.width = width
    this.life = life
  }

  update(dt: number) {
    if (this.life <= 0) return
    this.life -= dt
    this.t += dt
    if (this.life <= 0) {
      this.outer.setEnabled(false)
      this.core.setEnabled(false)
      return
    }
    const k = 1 + Math.sin(this.t * 47) * 0.1 + Math.sin(this.t * 83) * 0.06
    this.outer.scaling.x = this.outer.scaling.z = this.width * k
    this.core.scaling.x = this.core.scaling.z = this.width * 0.42 * (2 - k)
  }

  dispose() {
    this.outer.dispose()
    this.core.dispose()
    for (const m of this.mats) m.dispose()
  }
}
