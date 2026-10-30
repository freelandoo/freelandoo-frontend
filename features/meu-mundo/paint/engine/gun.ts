// features/meu-mundo/paint/engine/gun.ts — PAINT (mm3d-35): a arma de tinta.
//
// mm3d-46 (pedido do Alex): redesenhada na identidade da Casa Views — preta
// envernizada com NEON ROSA. Três malhas (poucas chamadas de desenho):
//  - corpo preto: receptor, cobertura de cima, aletas, cabo, coronha, cano e
//    bocal, com especular forte e uma borda rosa pelo fresnel;
//  - neon: filetes nos dois lados, trilho de cima, anéis no cano, aro do
//    bocal e a lente da mira — acesos e pulsando (o brilho de verdade vem da
//    GlowLayer da cena, que só inclui `glowMeshes`);
//  - núcleo de energia na janela do receptor, na cor da tinta escolhida.
// mm3d-55 — STEAMPUNK: o corpo vira latão, cobre, ferro e madeira (rebites e
// engrenagem no lado); o NEON ROSA fica (pedido da 46) nos filetes e anéis.
// Em cima, os quatro tanques (laranja, preto, vermelho, turquesa); o da cor
// escolhida cresce e acende. Vai entre as mãos do avatar quando os ossos
// existem; sem eles fica no lado direito do corpo. Inclina com a mira.

import type { Scene } from "@babylonjs/core/scene"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import { TransformNode } from "@babylonjs/core/Meshes/transformNode"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { FresnelParameters } from "@babylonjs/core/Materials/fresnelParameters"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { GeoBuilder, place, type RGB } from "../../engine/geometry"
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector"
import { PAINT, PAINT_COLORS, type PaintColor } from "../sim/tuning"

/** Rosa neon da Casa Views. */
export const GUN_NEON = "#FF007A"

const BRASS: RGB = [0.62, 0.46, 0.17]
const BRASS_D: RGB = [0.42, 0.3, 0.11]
const COPPER: RGB = [0.5, 0.27, 0.15]
const IRON: RGB = [0.1, 0.1, 0.11]
const WOOD: RGB = [0.3, 0.18, 0.1]
const WHITE: RGB = [1, 1, 1]

/** Cilindro deitado ao longo de +z (cano, anéis). */
const alongZ = (x: number, y: number, z: number) => Matrix.RotationX(Math.PI / 2).multiply(Matrix.Translation(x, y, z))

let seq = 0

export class PaintGun {
  readonly root: TransformNode
  /** O que a GlowLayer da cena deve acender. */
  readonly glowMeshes: Mesh[] = []
  private readonly frame: TransformNode
  private readonly bodyMat: StandardMaterial
  private readonly neonMat: StandardMaterial
  private readonly coreMat: StandardMaterial
  private readonly core: Mesh
  private readonly tanks: { mesh: Mesh; mat: StandardMaterial; base: Color3 }[] = []
  private readonly neon = Color3.FromHexString(GUN_NEON)
  private color: PaintColor = 0
  private kick = 0
  private clock = Math.random() * 10
  private mounted = false

  constructor(scene: Scene) {
    const id = ++seq
    this.root = new TransformNode(`paint-gun-${id}`, scene)
    this.root.scaling.setAll(0.86)
    this.frame = new TransformNode(`paint-gun-frame-${id}`, scene)
    this.frame.parent = this.root

    // ── corpo preto envernizado ──
    this.bodyMat = new StandardMaterial(`paint-gun-${id}`, scene)
    this.bodyMat.diffuseColor = new Color3(1, 1, 1)
    this.bodyMat.specularColor = new Color3(0.8, 0.7, 0.5)
    this.bodyMat.specularPower = 48
    this.bodyMat.emissiveColor = new Color3(0.02, 0.015, 0.025)
    this.bodyMat.emissiveFresnelParameters = new FresnelParameters({
      leftColor: new Color3(0.55, 0, 0.27),
      rightColor: new Color3(0, 0, 0),
      power: 2.6,
      bias: 0.05,
    })
    const g = new GeoBuilder()
    // frente da arma = +z local
    g.box(0.12, 0.13, 0.4, place(0, 0, 0.03), BRASS) // receptor
    g.box(0.1, 0.05, 0.3, place(0, 0.085, 0.06), COPPER) // cobertura de cima
    g.box(0.135, 0.03, 0.2, place(0, -0.06, 0.09), IRON) // saia de baixo
    for (const sx of [-1, 1]) g.box(0.018, 0.085, 0.2, place(sx * 0.068, 0.005, 0.1), IRON) // aletas
    for (const sx of [-1, 1]) for (const z of [-0.12, -0.04, 0.04, 0.12, 0.2]) for (const y of [-0.05, 0.05]) g.box(0.006, 0.012, 0.012, place(sx * 0.0625, y, z), BRASS_D) // rebites
    for (const sx of [-1, 1]) g.cylinder(0.07, 0.012, Matrix.RotationZ(Math.PI / 2).multiply(Matrix.Translation(sx * 0.064, 0, -0.1)), BRASS_D, 10) // engrenagem do lado
    g.box(0.07, 0.17, 0.075, Matrix.RotationX(0.28).multiply(Matrix.Translation(0, -0.135, -0.07)), WOOD) // cabo
    g.box(0.07, 0.035, 0.12, place(0, -0.095, 0.02), BRASS_D) // guarda do gatilho
    g.box(0.085, 0.1, 0.16, place(0, -0.01, -0.23), WOOD) // coronha
    g.box(0.09, 0.03, 0.05, place(0, -0.06, -0.3), BRASS) // soleira
    g.cylinder(0.068, 0.26, alongZ(0, 0.01, 0.34), COPPER, 14) // cano
    g.cylinder(0.112, 0.07, alongZ(0, 0.01, 0.48), BRASS, 14) // bocal
    g.cylinder(0.08, 0.02, alongZ(0, 0.01, 0.52), IRON, 14) // boca
    g.box(0.05, 0.045, 0.06, place(0, 0.135, 0.12), IRON) // base da mira
    g.box(0.06, 0.05, 0.012, place(0, 0.175, 0.12), BRASS) // moldura da mira
    const frameMesh = g.build(`paint-gun-body-${id}`, scene, this.bodyMat, false)
    frameMesh.parent = this.frame

    // ── neon rosa ──
    this.neonMat = new StandardMaterial(`paint-gun-neon-${id}`, scene)
    this.neonMat.diffuseColor = new Color3(0, 0, 0)
    this.neonMat.specularColor = new Color3(0, 0, 0)
    this.neonMat.emissiveColor = this.neon.clone()
    this.neonMat.disableLighting = true
    const n = new GeoBuilder()
    for (const sx of [-1, 1]) {
      n.box(0.006, 0.012, 0.36, place(sx * 0.0625, 0.03, 0.03), WHITE) // filete do lado
      n.box(0.006, 0.01, 0.12, place(sx * 0.0435, 0.0, -0.23), WHITE) // filete da coronha
      n.box(0.006, 0.05, 0.006, place(sx * 0.0625, -0.005, 0.2), WHITE) // marca vertical
    }
    n.box(0.012, 0.006, 0.28, place(0, 0.111, 0.06), WHITE) // trilho de cima
    for (const z of [0.27, 0.32, 0.37]) n.cylinder(0.076, 0.012, alongZ(0, 0.01, z), WHITE, 14) // anéis do cano
    n.cylinder(0.118, 0.016, alongZ(0, 0.01, 0.445), WHITE, 16) // aro do bocal
    n.cylinder(0.036, 0.008, alongZ(0, 0.175, 0.127), WHITE, 12) // lente da mira
    n.box(0.008, 0.11, 0.008, Matrix.RotationX(0.28).multiply(Matrix.Translation(0, -0.135, -0.03)), WHITE) // frente do cabo
    const neonMesh = n.build(`paint-gun-neon-${id}`, scene, this.neonMat, false)
    neonMesh.parent = this.frame
    this.glowMeshes.push(neonMesh)

    // ── núcleo de energia (cor da tinta) na janela do receptor ──
    this.coreMat = new StandardMaterial(`paint-gun-core-${id}`, scene)
    this.coreMat.diffuseColor = new Color3(0, 0, 0)
    this.coreMat.specularColor = new Color3(0, 0, 0)
    this.coreMat.disableLighting = true
    const cg = new GeoBuilder()
    for (const sx of [-1, 1]) cg.box(0.008, 0.05, 0.13, place(sx * 0.0615, 0.0, -0.06), WHITE)
    cg.cylinder(0.05, 0.1, alongZ(0, 0.01, 0.19), WHITE, 10)
    this.core = cg.build(`paint-gun-core-${id}`, scene, this.coreMat, false)
    this.core.parent = this.frame
    this.glowMeshes.push(this.core)

    // ── tanques em cima ──
    for (let c = 0; c < 4; c++) {
      const tg = new GeoBuilder()
      tg.sphere(0.058, [1, 1.3, 1], place(0, 0.15, -0.115 + c * 0.062), WHITE, 8)
      tg.cylinder(0.03, 0.02, place(0, 0.117, -0.115 + c * 0.062), BRASS_D, 8)
      const m = new StandardMaterial(`paint-gun-tank-${id}-${c}`, scene)
      const base = Color3.FromHexString(PAINT_COLORS[c])
      m.diffuseColor = base
      m.specularColor = new Color3(0.9, 0.9, 0.9)
      m.specularPower = 64
      const mesh = tg.build(`paint-gun-tank-${id}-${c}`, scene, m, false)
      mesh.parent = this.frame
      this.tanks.push({ mesh, mat: m, base })
    }
    this.setColor(0)
  }

  /** A luz do núcleo e dos tanques: o preto acende em rosa-claro (preto não brilha). */
  private glowOf(c: PaintColor) {
    return c === PAINT.HARM ? new Color3(0.95, 0.75, 0.88) : Color3.FromHexString(PAINT_COLORS[c])
  }

  setColor(c: PaintColor) {
    this.color = c
    this.coreMat.emissiveColor = this.glowOf(c)
    this.tanks.forEach((t, i) => {
      const on = i === c
      t.mat.emissiveColor = on ? (i === PAINT.HARM ? new Color3(0.35, 0.05, 0.2) : t.base.scale(0.85)) : t.base.scale(0.1)
      t.mesh.scaling.setAll(on ? 1.22 : 0.88)
    })
  }

  get current() {
    return this.color
  }

  /** Coice do tiro (o corpo recua e o neon pisca). */
  fired() {
    this.kick = 1
  }

  /**
   * Nas mãos (mm3d-35b): o cabo na mão direita, o cano para a esquerda (as
   * animações de arma seguram um fuzil à frente do corpo). Posições de mundo.
   */
  mount(right: Vector3, left: Vector3, fallbackDir: Vector3) {
    if (!this.mounted) {
      this.root.parent = null
      this.mounted = true
    }
    let dir = left.subtract(right)
    if (dir.length() < 0.08) dir = fallbackDir
    dir.normalize()
    this.root.position.copyFrom(right).addInPlace(dir.scale(0.06)).addInPlaceFromFloats(0, 0.07, 0)
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

  /** Inclinação da mira (rad, + = para baixo; só fora da mão), o coice e o pulso do neon. */
  tick(dt: number, pitch: number) {
    this.clock += dt
    this.kick = Math.max(0, this.kick - dt * 9)
    if (!this.mounted) this.root.rotation.x = pitch
    this.frame.position.z = -this.kick * 0.05
    const pulse = 0.82 + Math.sin(this.clock * 3.2) * 0.12 + this.kick * 0.5
    this.neonMat.emissiveColor.copyFromFloats(this.neon.r * pulse, this.neon.g * pulse, this.neon.b * pulse)
    const core = this.glowOf(this.color).scale(0.75 + Math.sin(this.clock * 7) * 0.1 + this.kick * 0.6)
    this.coreMat.emissiveColor.copyFrom(core)
  }

  dispose() {
    this.root.dispose(false, true)
    this.bodyMat.dispose()
    this.neonMat.dispose()
    this.coreMat.dispose()
    for (const t of this.tanks) t.mat.dispose()
  }
}
