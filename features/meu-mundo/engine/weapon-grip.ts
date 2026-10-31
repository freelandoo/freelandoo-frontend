// features/meu-mundo/engine/weapon-grip.ts — arma presa na mão direita (mm3d-58).
//
// A pegada sai das POSIÇÕES dos ossos da mão (pulso, base do indicador e base
// do polegar), lidas a cada quadro DEPOIS das animações. Assim não depende da
// convenção de eixo de cada osso (Blender × glTF × Babylon) e acompanha o
// tamanho da mão de cada personagem — nada de giro/deslocamento acertado no
// olho. Convenção da arma (MEU MUNDO 3D/pipeline/build_armas.py): origem no
// meio da pegada, +Y = para onde a arma sai do punho, face larga no plano XY.
//
//   dedos  f = indicador − pulso            → +X da arma (o fio vai à frente)
//   lado   s = polegar sem a parte em f     → +Y da arma (sai pelo polegar)
//   palma  n = f × s                        → +Z da arma
//   ponto  pulso + f·ALONG + n·PALM (em mãos: escala com o tamanho da mão)
import type { Scene } from "@babylonjs/core/scene"
import type { Observer } from "@babylonjs/core/Misc/observable"
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector"
import { TransformNode } from "@babylonjs/core/Meshes/transformNode"

export const GRIP_BONES = {
  hand: "mixamorig:RightHand",
  index: "mixamorig:RightHandIndex1",
  thumb: "mixamorig:RightHandThumb1",
} as const

/** Onde fica o meio do punho, em comprimentos de mão (pulso → base do indicador). */
const ALONG = 0.62
const PALM = 0.28

export interface GripTargets {
  hand: TransformNode
  index: TransformNode
  thumb: TransformNode
}

/** Acha os três ossos da pegada entre os nós de um personagem instanciado. */
export function findGripTargets(nodes: TransformNode[]): GripTargets | null {
  const by = (name: string) => nodes.find((n) => n.name === name || n.name.startsWith(name + "-")) ?? null
  const hand = by(GRIP_BONES.hand)
  const index = by(GRIP_BONES.index)
  const thumb = by(GRIP_BONES.thumb)
  return hand && index && thumb ? { hand, index, thumb } : null
}

export class WeaponGrip {
  readonly root: TransformNode
  private obs: Observer<Scene> | null
  private readonly h = new Vector3()
  private readonly f = new Vector3()
  private readonly s = new Vector3()
  private readonly n = new Vector3()
  private readonly m = new Matrix()

  /** `weapon` = nó raiz do GLB da arma (o `__root__` do loader vai dentro). */
  constructor(
    private readonly scene: Scene,
    private targets: GripTargets,
    weapon: TransformNode,
    name = "weapon-grip",
  ) {
    this.root = new TransformNode(name, scene)
    this.root.rotationQuaternion = new Quaternion()
    weapon.parent = this.root
    this.obs = scene.onAfterAnimationsObservable.add(() => this.update())
  }

  setTargets(t: GripTargets) {
    this.targets = t
  }

  update() {
    const { hand, index, thumb } = this.targets
    hand.computeWorldMatrix(true)
    index.computeWorldMatrix(true)
    thumb.computeWorldMatrix(true)
    const h = this.h.copyFrom(hand.getAbsolutePosition())
    const f = index.getAbsolutePosition().subtractToRef(h, this.f)
    const len = f.length()
    if (len < 1e-5) return
    f.scaleInPlace(1 / len)
    const s = thumb.getAbsolutePosition().subtractToRef(h, this.s)
    s.subtractInPlace(f.scale(Vector3.Dot(s, f))).normalize()
    Vector3.CrossToRef(f, s, this.n)
    const n = this.n.normalize()
    Matrix.FromXYZAxesToRef(f, s, n, this.m)
    Quaternion.FromRotationMatrixToRef(this.m, this.root.rotationQuaternion!)
    this.root.position.set(h.x + (f.x * ALONG + n.x * PALM) * len, h.y + (f.y * ALONG + n.y * PALM) * len, h.z + (f.z * ALONG + n.z * PALM) * len)
  }

  dispose() {
    if (this.obs) this.scene.onAfterAnimationsObservable.remove(this.obs)
    this.obs = null
    this.root.dispose(false, false)
  }
}
