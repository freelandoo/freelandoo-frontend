// features/meu-mundo/paint/engine/gun.ts — PAINT (mm3d-35): a arma de tinta.
//
// Um lança-tinta de formas simples (corpo, cano, bocal) com os três tanques
// em cima — turquesa, vermelho escuro e amarelo — e o tanque da cor escolhida
// acende. Vai na mão direita do avatar quando o osso existe; sem ele (avatar
// ainda carregando), fica no lado direito do corpo. Inclina com a mira.

import type { Scene } from "@babylonjs/core/scene"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import { TransformNode } from "@babylonjs/core/Meshes/transformNode"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { GeoBuilder, place, type RGB } from "../../engine/geometry"
import { Matrix } from "@babylonjs/core/Maths/math.vector"
import { PAINT_COLORS, type PaintColor } from "../sim/tuning"

const BODY: RGB = [0.42, 0.34, 0.27]
const METAL: RGB = [0.62, 0.6, 0.56]
const DARK: RGB = [0.22, 0.2, 0.19]

let seq = 0

export class PaintGun {
  readonly root: TransformNode
  private readonly frame: Mesh
  private readonly mat: StandardMaterial
  private readonly tanks: { mesh: Mesh; mat: StandardMaterial; base: Color3 }[] = []
  private color: PaintColor = 0
  private kick = 0

  constructor(scene: Scene) {
    const id = ++seq
    this.root = new TransformNode(`paint-gun-${id}`, scene)
    this.mat = new StandardMaterial(`paint-gun-${id}`, scene)
    this.mat.diffuseColor = new Color3(1, 1, 1)
    this.mat.specularColor = new Color3(0.25, 0.25, 0.25)
    this.mat.emissiveColor = new Color3(0.12, 0.11, 0.1)
    const g = new GeoBuilder()
    // frente da arma = +z local
    g.box(0.11, 0.13, 0.34, place(0, 0, 0.04), BODY)
    g.box(0.07, 0.15, 0.08, place(0, -0.12, -0.04, 0), DARK) // cabo
    g.cylinder(0.075, 0.2, Matrix.RotationX(Math.PI / 2).multiply(Matrix.Translation(0, 0.01, 0.3)), METAL, 10) // cano
    g.cylinder(0.11, 0.05, Matrix.RotationX(Math.PI / 2).multiply(Matrix.Translation(0, 0.01, 0.41)), DARK, 10) // bocal
    g.box(0.13, 0.03, 0.26, place(0, 0.08, 0.04), DARK) // trilho dos tanques
    this.frame = g.build(`paint-gun-frame-${id}`, scene, this.mat, false)
    this.frame.parent = this.root
    for (let c = 0; c < 3; c++) {
      const tg = new GeoBuilder()
      tg.sphere(0.075, [1, 1.25, 1], place(0, 0.13, -0.05 + c * 0.085), [1, 1, 1], 8)
      const m = new StandardMaterial(`paint-gun-tank-${id}-${c}`, scene)
      const base = Color3.FromHexString(PAINT_COLORS[c])
      m.diffuseColor = base
      m.specularColor = new Color3(0.6, 0.6, 0.6)
      const mesh = tg.build(`paint-gun-tank-${id}-${c}`, scene, m, false)
      mesh.parent = this.root
      this.tanks.push({ mesh, mat: m, base })
    }
    this.setColor(0)
  }

  setColor(c: PaintColor) {
    this.color = c
    this.tanks.forEach((t, i) => {
      t.mat.emissiveColor = i === c ? t.base.scale(0.85) : t.base.scale(0.12)
      t.mesh.scaling.setAll(i === c ? 1.25 : 0.9)
    })
  }

  get current() {
    return this.color
  }

  /** Coice do tiro (o bocal recua um pouco). */
  fired() {
    this.kick = 1
  }

  /** Inclinação da mira (rad, + = para baixo) e o coice. */
  tick(dt: number, pitch: number) {
    this.kick = Math.max(0, this.kick - dt * 9)
    this.root.rotation.x = pitch
    this.frame.position.z = -this.kick * 0.05
  }

  dispose() {
    this.root.dispose(false, true)
    this.mat.dispose()
    for (const t of this.tanks) t.mat.dispose()
  }
}
