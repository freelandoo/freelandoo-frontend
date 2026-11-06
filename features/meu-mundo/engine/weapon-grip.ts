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

/** Mão do arco: o pacote de arco longo segura o arco na esquerda. */
export const BOW_GRIP_BONES = {
  hand: "mixamorig:LeftHand",
  index: "mixamorig:LeftHandIndex1",
  thumb: "mixamorig:LeftHandThumb1",
} as const

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

/**
 * Arma de DUAS mãos (cajado, 2026-11-01): a mão esquerda perto da direita faz
 * a haste passar pela palma dela — o eixo da arma vira a linha entre as duas
 * palmas (mesmo sentido do eixo de uma mão). Peso pela distância: até NEAR m
 * vale inteiro, some em FAR m (mão esquerda longe = arma só na direita).
 */
const NEAR = 0.32
const FAR = 0.55

export interface SecondHand {
  hand: TransformNode
  middle: TransformNode
}

export class WeaponGrip {
  readonly root: TransformNode
  /** 0–1: quanto a mão esquerda está segurando agora (para o IK fino dela). */
  twoHanded = 0
  /**
   * 0–1: arma EM PÉ (cajado de mago parado, pedra para cima — pedido do Alex
   * com referências em 2026-11-01). O eixo da arma vai para o "cima" do mundo.
   */
  upright = 0
  /** 0–1: arma NIVELADA para `front` (mundo), cano à frente e topo para cima. */
  level = 0
  front: Vector3 | null = null
  /** Com `level`: leva a arma do pulso até o punho visível (mundo). */
  shift: Vector3 | null = null
  second: SecondHand | null = null
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
    /** -1 = arma na mão esquerda (o arco): a palma fica do outro lado. */
    private readonly side: 1 | -1 = 1,
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
    // ponto da pegada com os eixos da MÃO DIREITA (o ajuste abaixo só gira)
    Vector3.CrossToRef(f, s, this.n)
    this.n.normalize()
    const palm = PALM * this.side
    const px = h.x + (f.x * ALONG + this.n.x * palm) * len
    const py = h.y + (f.y * ALONG + this.n.y * palm) * len
    const pz = h.z + (f.z * ALONG + this.n.z * palm) * len
    // duas mãos: o eixo (+Y = s) gira para a linha direita → palma esquerda
    this.twoHanded = 0
    if (this.second) {
      const { hand: lh, middle } = this.second
      lh.computeWorldMatrix(true)
      middle.computeWorldMatrix(true)
      const lw = lh.getAbsolutePosition()
      const palm = lw.add(middle.getAbsolutePosition().subtract(lw).scale(0.55))
      const grip = h.add(f.scale(ALONG * len))
      const to = palm.subtract(grip)
      const d = to.length()
      const w = Math.max(0, Math.min(1, (FAR - d) / (FAR - NEAR)))
      if (w > 0 && d > 1e-4) {
        to.scaleInPlace(1 / d)
        if (Vector3.Dot(to, s) < 0) to.scaleInPlace(-1)
        s.scaleInPlace(1 - w).addInPlace(to.scale(w)).normalize()
        // dedos (f) perpendiculares ao eixo novo
        f.subtractInPlace(s.scale(Vector3.Dot(f, s))).normalize()
        this.twoHanded = w
      }
    }
    if (this.upright > 0) {
      const w = Math.min(1, this.upright)
      s.scaleInPlace(1 - w).addInPlace(Vector3.Up().scale(w)).normalize()
      f.subtractInPlace(s.scale(Vector3.Dot(f, s)))
      if (f.lengthSquared() < 1e-6) f.set(1, 0, 0)
      f.normalize()
    }
    if (this.level > 0 && this.front) {
      const w = Math.min(1, this.level)
      f.scaleInPlace(1 - w).addInPlace(this.front.scale(w)).normalize()
      s.scaleInPlace(1 - w).addInPlace(Vector3.Up().scale(w))
      s.subtractInPlace(f.scale(Vector3.Dot(s, f))).normalize()
    }
    Vector3.CrossToRef(f, s, this.n)
    const n = this.n.normalize()
    Matrix.FromXYZAxesToRef(f, s, n, this.m)
    Quaternion.FromRotationMatrixToRef(this.m, this.root.rotationQuaternion!)
    this.root.position.set(px, py, pz)
    if (this.level > 0 && this.shift) this.root.position.addInPlace(this.shift.scale(Math.min(1, this.level)))
  }

  dispose() {
    if (this.obs) this.scene.onAfterAnimationsObservable.remove(this.obs)
    this.obs = null
    this.root.dispose(false, false)
  }
}
