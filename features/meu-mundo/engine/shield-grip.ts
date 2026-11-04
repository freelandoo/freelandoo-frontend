// features/meu-mundo/engine/shield-grip.ts — escudo preso no antebraço esquerdo (mm3d-68).
//
// Como a pegada da arma (weapon-grip.ts), sai das POSIÇÕES dos ossos, lidas a cada
// quadro depois das animações. Convenção do arquivo (build_escudos_loja.py): 1 m de
// altura, origem no meio da face, +Y = topo, +Z = frente.
//
//   braço  a = pulso − cotovelo
//   frente z = (indicador − pulso) × (polegar − pulso), sem a parte em a: costas da mão
//   topo   y = cima do mundo + um pouco do polegar, sem a parte em z (na guarda o
//          polegar aponta para a frente: só por ele o escudo ficava deitado)
//   ponto  cotovelo + a·ALONG + z·OUT (OUT em comprimentos de mão)
import type { Scene } from "@babylonjs/core/scene"
import type { Observer } from "@babylonjs/core/Misc/observable"
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector"
import { TransformNode } from "@babylonjs/core/Meshes/transformNode"

export const SHIELD_BONES = {
  arm: "mixamorig:LeftForeArm",
  hand: "mixamorig:LeftHand",
  index: "mixamorig:LeftHandIndex1",
  thumb: "mixamorig:LeftHandThumb1",
} as const

const ALONG = 0.62
const OUT = 0.9
/** Quanto o polegar balança o topo a cada golpe. */
const SWAY = 0.35

export interface ShieldTargets {
  arm: TransformNode
  hand: TransformNode
  index: TransformNode
  thumb: TransformNode
}

export class ShieldGrip {
  readonly root: TransformNode
  private obs: Observer<Scene> | null
  private readonly a = new Vector3()
  private readonly f = new Vector3()
  private readonly s = new Vector3()
  private readonly x = new Vector3()
  private readonly z = new Vector3()
  private readonly m = new Matrix()

  /** `shield` = nó raiz do GLB; `height` = altura do escudo na mão, em metros. */
  constructor(private readonly scene: Scene, private readonly bones: ShieldTargets, shield: TransformNode, height: number) {
    this.root = new TransformNode("laminas-shield", scene)
    this.root.rotationQuaternion = new Quaternion()
    this.root.scaling.setAll(height)
    shield.parent = this.root
    this.obs = scene.onAfterAnimationsObservable.add(() => this.update())
  }

  update() {
    const { arm, hand, index, thumb } = this.bones
    for (const b of [arm, hand, index, thumb]) b.computeWorldMatrix(true)
    const e = arm.getAbsolutePosition()
    const h = hand.getAbsolutePosition()
    const a = h.subtractToRef(e, this.a)
    const reach = a.length()
    const f = index.getAbsolutePosition().subtractToRef(h, this.f)
    const palm = f.length()
    if (reach < 1e-5 || palm < 1e-5) return
    a.scaleInPlace(1 / reach)
    const s = thumb.getAbsolutePosition().subtractToRef(h, this.s)
    Vector3.CrossToRef(f, s, this.z)
    const z = this.z
    z.subtractInPlace(a.scale(Vector3.Dot(z, a)))
    if (z.lengthSquared() < 1e-10) return
    z.normalize()
    s.normalize().scaleInPlace(SWAY).addInPlaceFromFloats(0, 1, 0)
    s.subtractInPlace(z.scale(Vector3.Dot(s, z)))
    if (s.lengthSquared() < 1e-10) return
    s.normalize()
    Vector3.CrossToRef(s, z, this.x)
    Matrix.FromXYZAxesToRef(this.x, s, z, this.m)
    Quaternion.FromRotationMatrixToRef(this.m, this.root.rotationQuaternion!)
    this.root.position.set(e.x + a.x * reach * ALONG + z.x * palm * OUT, e.y + a.y * reach * ALONG + z.y * palm * OUT, e.z + a.z * reach * ALONG + z.z * palm * OUT)
  }

  dispose() {
    if (this.obs) this.scene.onAfterAnimationsObservable.remove(this.obs)
    this.obs = null
    this.root.dispose(false, false)
  }
}
