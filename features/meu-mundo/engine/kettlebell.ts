// features/meu-mundo/engine/kettlebell.ts — O KETTLEBELL QUE SE PEGA (2026-11-02).
//
// Pedido do Alex ("os bells no chão, tem como pegar eles?"): no tapete de
// kettlebells, um dos quatro (KETTLE_LOOSE, o 2º) é peça solta. No GymKettle
// ("Kettlebell Swing" do Mixamo) ele sai do tapete (0,3 s) para as MÃOS: a
// alça entre as duas palmas e o peso pendurado na direção dos antebraços —
// o clipe já leva as duas mãos juntas, então não precisa de IK. Ao parar,
// volta para o lugar dele no tapete. Mesmas medidas do desenho antigo.
import type { Scene } from "@babylonjs/core/scene"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector"
import { TransformNode } from "@babylonjs/core/Meshes/transformNode"
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder"
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import type { InteriorDef } from "../types"
import { SP } from "./steampunk/palette"
import { KETTLE_LOOSE } from "./interior"
import { wpos } from "./barbell"
import type { Character } from "./player"

const GRAB_S = 0.3
const B = (n: string) => `mixamorig:${n}`
/** Do centro da alça até o centro do peso (no tapete: alça a 0,30 m, peso a 0,16 m + 0,02 por tamanho). */
const DROP = 0.14

interface Bell {
  root: TransformNode
  floor: number
  rest: Vector3
  restQ: Quaternion
  w: number
}

export class Kettlebells {
  private readonly bells: Bell[] = []
  private readonly mat: StandardMaterial
  private readonly q = new Quaternion()

  constructor(scene: Scene, def: InteriorDef) {
    this.mat = new StandardMaterial("mm-kettle", scene)
    this.mat.diffuseColor = new Color3(SP.iron[0], SP.iron[1], SP.iron[2])
    this.mat.specularColor = new Color3(0.2, 0.2, 0.2)
    def.floors.forEach((fl, fi) => {
      for (const it of fl.furniture) {
        if (it.t !== "kettlebells") continue
        const w = it.w ?? def.furnitureTypes.kettlebells?.w ?? 1.1
        const k = KETTLE_LOOSE
        const kx = -w / 2 + 0.16 + k * ((w - 0.32) / 3)
        const size = 0.18 + k * 0.02
        // origem no centro da alça; o peso fica embaixo (−Y local)
        const root = new TransformNode(`mm-kettle-${this.bells.length}`, scene)
        const ball = CreateSphere("mm-kettle-ball", { diameter: size, segments: 8 }, scene)
        ball.position.y = -DROP - k * 0.02
        ball.parent = root
        const grip = CreateBox("mm-kettle-grip", { width: 0.12, height: 0.035, depth: 0.03 }, scene)
        grip.parent = root
        for (const sx of [-1, 1]) {
          const post = CreateBox("mm-kettle-post", { width: 0.025, height: 0.09, depth: 0.03 }, scene)
          post.position.set(sx * 0.05, -0.045, 0)
          post.parent = root
        }
        for (const m of root.getChildMeshes()) {
          m.material = this.mat
          m.isPickable = false
        }
        const a = (it.r * Math.PI) / 180
        // o lugar no tapete (frame do móvel: giro em Y, depois a posição)
        const rest = new Vector3(it.x + Math.cos(a) * kx, fl.y + 0.3 + k * 0.02, it.z - Math.sin(a) * kx)
        const restQ = Quaternion.RotationYawPitchRoll(a, 0, 0)
        root.position.copyFrom(rest)
        root.rotationQuaternion = restQ.clone()
        this.bells.push({ root, floor: fi, rest, restQ, w: 0 })
      }
    })
  }

  get count() {
    return this.bells.length
  }

  /** A cada quadro, depois de animar o personagem. `swinging` = toca o GymKettle agora. */
  update(dt: number, char: Character, swinging: boolean, x: number, z: number, floor: number) {
    let mine: Bell | null = null
    if (swinging) {
      let best = 1.6
      for (const b of this.bells) {
        const d = Math.hypot(b.rest.x - x, b.rest.z - z)
        if (b.floor === floor && d < best) {
          best = d
          mine = b
        }
      }
    }
    const step = dt / GRAB_S
    for (const b of this.bells) {
      b.root.setEnabled(b.floor <= floor)
      b.w = Math.max(0, Math.min(1, b.w + (b === mine ? step : -step)))
      if (b !== mine) {
        if (b.w <= 0) {
          b.root.position.copyFrom(b.rest)
          b.root.rotationQuaternion!.copyFrom(b.restQ)
        } else {
          Vector3.LerpToRef(b.rest, b.root.position, b.w, b.root.position)
          Quaternion.SlerpToRef(b.restQ, b.root.rotationQuaternion!, b.w, b.root.rotationQuaternion!)
        }
        continue
      }
      this.hold(b, char)
    }
  }

  /** A alça entre as mãos e o peso na direção dos antebraços. */
  private hold(b: Bell, char: Character) {
    const bone = (n: string) => char.bone(B(n)) as TransformNode | null
    const lf = bone("LeftForeArm")
    const rf = bone("RightForeArm")
    const lh = bone("LeftHand")
    const rh = bone("RightHand")
    if (!lf || !rf || !lh || !rh) return
    const LE = wpos(lf)
    const RE = wpos(rf)
    const LW = wpos(lh)
    const RW = wpos(rh)
    // para onde o peso pende: a continuação dos antebraços
    const down = LW.subtract(LE).addInPlace(RW.subtract(RE))
    const fore = Vector3.Distance(LE, LW)
    if (down.lengthSquared() < 1e-8 || fore < 1e-4) return
    down.normalize()
    // a palma fica um pouco além do pulso
    const grip = LW.add(RW).scaleInPlace(0.5).addInPlace(down.scale(fore * 0.32))
    // base: Y local = contrário de "down"; X = de uma mão à outra, sem a parte em Y
    const y = down.scale(-1)
    const xv = RW.subtract(LW)
    xv.subtractInPlace(y.scale(Vector3.Dot(xv, y)))
    if (xv.lengthSquared() < 1e-8) return
    xv.normalize()
    const zv = Vector3.Cross(xv, y)
    Quaternion.RotationQuaternionFromAxisToRef(xv, y, zv, this.q)
    const k = b.w * b.w * (3 - 2 * b.w)
    Vector3.LerpToRef(b.rest, grip, k, b.root.position)
    Quaternion.SlerpToRef(b.restQ, this.q, k, b.root.rotationQuaternion!)
  }

  dispose() {
    for (const b of this.bells) b.root.dispose(false, false)
    this.mat.dispose()
  }
}
