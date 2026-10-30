// features/meu-mundo/laminas/engine/gloves.ts — LUVAS DE BOXE do ringue (mm3d-57).
//
// Pedido do Alex (30/10): no prédio do Boxe sai a espada e todo mundo luta de
// luva — preta (o jogador) e marrom (os adversários). A luva é uma esfera
// achatada com o punho (cilindro) de couro na cor oposta, presa entre o osso
// do antebraço e o da mão a cada quadro (o mesmo encaixe das luvas do boxe
// antigo, mm3d-43). Materiais um por cena e cor.

import type { Scene } from "@babylonjs/core/scene"
import type { Observer } from "@babylonjs/core/Misc/observable"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import { TransformNode } from "@babylonjs/core/Meshes/transformNode"
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder"
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import type { Character } from "../../engine/player"

export type GloveColor = "black" | "brown"

const COLORS: Record<GloveColor, { glove: Color3; cuff: Color3 }> = {
  black: { glove: new Color3(0.07, 0.07, 0.08), cuff: new Color3(0.42, 0.25, 0.13) },
  brown: { glove: new Color3(0.42, 0.24, 0.12), cuff: new Color3(0.08, 0.08, 0.09) },
}

const HANDS = [
  ["mixamorig:LeftHand", "mixamorig:LeftForeArm"],
  ["mixamorig:RightHand", "mixamorig:RightForeArm"],
] as const

const mats = new WeakMap<Scene, Map<string, StandardMaterial>>()
function leather(scene: Scene, key: string, c: Color3) {
  let m = mats.get(scene)
  if (!m) {
    m = new Map()
    mats.set(scene, m)
    scene.onDisposeObservable.addOnce(() => m!.forEach((x) => x.dispose()))
  }
  let got = m.get(key)
  if (!got) {
    got = new StandardMaterial(`mm-glove-${key}`, scene)
    got.diffuseColor = c
    got.specularColor = new Color3(0.32, 0.3, 0.28)
    got.specularPower = 28
    m.set(key, got)
  }
  return got
}

let seq = 0

export class BoxingGloves {
  private readonly nodes: TransformNode[] = []
  private readonly meshes: Mesh[] = []
  private readonly obs: Observer<Scene> | null
  private hidden = false

  constructor(
    private readonly scene: Scene,
    private readonly ch: Character,
    color: GloveColor,
    /** Escala do corpo (o adversário grande tem a luva maior). */
    scale = 1,
  ) {
    const id = ++seq
    const c = COLORS[color]
    const gm = leather(scene, `${color}-g`, c.glove)
    const cm = leather(scene, `${color}-c`, c.cuff)
    for (let h = 0; h < 2; h++) {
      const n = new TransformNode(`mm-glove-${id}-${h}`, scene)
      n.scaling.setAll(scale)
      // a luva olha para +z do nó (o lookAt aponta o z para a frente da mão)
      const g = CreateSphere(`mm-glove-${id}-${h}-g`, { diameter: 0.25, segments: 10 }, scene)
      g.scaling.set(0.92, 0.84, 1.22)
      g.position.z = 0.05
      g.material = gm
      // o dedão encostado na lateral
      const t = CreateSphere(`mm-glove-${id}-${h}-t`, { diameter: 0.1, segments: 6 }, scene)
      t.scaling.set(0.8, 0.9, 1.4)
      t.position.set(h === 0 ? 0.1 : -0.1, 0.03, 0.06)
      t.material = gm
      const cuff = CreateCylinder(`mm-glove-${id}-${h}-c`, { height: 0.11, diameter: 0.17, tessellation: 12 }, scene)
      cuff.rotation.x = Math.PI / 2
      cuff.position.z = -0.1
      cuff.material = cm
      for (const m of [g, t, cuff]) {
        m.parent = n
        m.isPickable = false
        this.meshes.push(m)
      }
      this.nodes.push(n)
    }
    this.obs = scene.onBeforeRenderObservable.add(() => this.place())
  }

  /** Entre o antebraço e a mão, apontando para onde a mão aponta. */
  private place() {
    if (this.hidden) return
    HANDS.forEach(([hand, fore], h) => {
      const n = this.nodes[h]
      const p = this.ch.bonePosition(hand)
      const e = this.ch.bonePosition(fore)
      if (!p || !e) {
        n.setEnabled(false)
        return
      }
      const dir = p.subtract(e)
      const len = dir.length() || 1
      dir.scaleInPlace(1 / len)
      n.setEnabled(true)
      n.position.copyFrom(p.add(dir.scale(0.05 * n.scaling.x)))
      n.lookAt(p.add(dir))
    })
  }

  /** Onde as duas luvas estão (conferência do harness). */
  at() {
    return this.nodes.map((n) => (n.isEnabled() ? n.position.clone() : null))
  }

  setVisible(v: boolean) {
    this.hidden = !v
    for (const n of this.nodes) n.setEnabled(v)
  }

  dispose() {
    if (this.obs) this.scene.onBeforeRenderObservable.remove(this.obs)
    for (const m of this.meshes) m.dispose()
    for (const n of this.nodes) n.dispose()
  }
}
