// features/meu-mundo/engine/barbell.ts — A BARRA DO RACK DE AGACHAMENTO (2026-11-02).
//
// Pedido do Alex: a barra do rack ficava parada no suporte enquanto o
// personagem agachava com as mãos no ar ("não consegue fazer ela pegar?").
// O "Back Squat" do Mixamo é gravado SEM barra (as mãos descem até perto do
// chão no fundo do movimento), então seguir as mãos deixava a barra torta e na
// cintura. Agora:
//  - a barra é peça solta: pousa no suporte (1,45 m, as medidas do rack antigo);
//  - no GymSquat ela sai do suporte (0,3 s) e fica no ALTO DAS COSTAS, atrás do
//    pescoço, reta na linha dos ombros, subindo e descendo com o tronco;
//  - as MÃOS vão até ela por IK de dois ossos (ombro → cotovelo → mão, cotovelo
//    para baixo e para trás), por cima da animação, a cada quadro.
// Medidas pela largura dos ombros de quem agacha: vale para o personagem
// pequeno, as skins de 2 m e as classes.
import type { Scene } from "@babylonjs/core/scene"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector"
import { Space } from "@babylonjs/core/Maths/math.axis"
import { TransformNode } from "@babylonjs/core/Meshes/transformNode"
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import type { InteriorDef } from "../types"
import { SP } from "./steampunk/palette"
import type { Character } from "./player"

const REST_Y = 1.45
const GRAB_S = 0.3
/** Onde a barra deita, em larguras de ombro: atrás e um pouco acima da linha dos ombros. */
const BACK = 0.32
const UP = 0.12
/** Meia pegada (centro da barra → mão), em larguras de ombro. */
const GRIP = 0.95
const B = (n: string) => `mixamorig:${n}`

interface Bar {
  root: TransformNode
  floor: number
  rest: Vector3
  restQ: Quaternion
  /** O X local do suporte (para onde a barra aponta pousada). */
  restX: Vector3
  /** 0 no suporte, 1 nas costas. */
  w: number
}

/** Posição de mundo do nó com a cadeia recalculada agora. */
export function wpos(n: TransformNode) {
  const chain: TransformNode[] = []
  for (let p: TransformNode | null = n; p; p = p.parent as TransformNode | null) chain.push(p)
  for (let i = chain.length - 1; i >= 0; i--) chain[i].computeWorldMatrix(true)
  return n.getAbsolutePosition().clone()
}

/**
 * Gira `node` (no mundo) para o filho `child` sair de onde está e apontar para
 * `to`. O glTF chega com a raiz espelhada (z −1), e o sentido do giro em mundo
 * pode inverter: confere o resultado e, se piorou, gira para o outro lado.
 */
function aim(node: TransformNode, child: TransformNode, to: Vector3) {
  const p = wpos(node)
  const from = wpos(child)
  const u = from.subtract(p)
  const v = to.subtract(p)
  if (u.lengthSquared() < 1e-8 || v.lengthSquared() < 1e-8) return
  u.normalize()
  v.normalize()
  const axis = Vector3.Cross(u, v)
  const s = axis.length()
  if (s < 1e-6) return
  axis.scaleInPlace(1 / s)
  const ang = Math.atan2(s, Vector3.Dot(u, v))
  const before = Vector3.Distance(from, to)
  node.rotate(axis, ang, Space.WORLD)
  if (Vector3.Distance(wpos(child), to) > before) node.rotate(axis, -2 * ang, Space.WORLD)
}

/** IK de dois ossos: ombro (arm) → cotovelo (fore) → mão (hand) até `t`, cotovelo para o `pole`. */
function solveArm(arm: TransformNode, fore: TransformNode, hand: TransformNode, t: Vector3, pole: Vector3) {
  const S = wpos(arm)
  const E = wpos(fore)
  const W = wpos(hand)
  const l1 = Vector3.Distance(S, E)
  const l2 = Vector3.Distance(E, W)
  const st = t.subtract(S)
  const len = st.length()
  if (len < 1e-5 || l1 < 1e-5 || l2 < 1e-5) return
  const dir = st.scale(1 / len)
  const d = Math.min(Math.max(len, Math.abs(l1 - l2) + 1e-3), (l1 + l2) * 0.999)
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d)
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a))
  const pv = pole.subtract(S)
  pv.subtractInPlace(dir.scale(Vector3.Dot(pv, dir)))
  if (pv.lengthSquared() < 1e-8) pv.copyFromFloats(0, -1, 0)
  pv.normalize()
  const elbow = S.add(dir.scale(a)).addInPlace(pv.scale(h))
  aim(arm, fore, elbow)
  aim(fore, hand, S.add(dir.scale(d)))
}

/** Quaternion que deita o X local na direção `dir` (giro em Y, depois inclina). */
function alongX(dir: Vector3, out: Quaternion) {
  const yaw = Math.atan2(-dir.z, dir.x)
  const tilt = Math.atan2(dir.y, Math.hypot(dir.x, dir.z))
  return Quaternion.RotationYawPitchRollToRef(yaw, 0, tilt, out)
}

export class Barbells {
  private readonly bars: Bar[] = []
  private readonly mats: StandardMaterial[] = []
  private readonly tmpQ = new Quaternion()

  constructor(scene: Scene, def: InteriorDef) {
    const steel = new StandardMaterial("mm-barbell-steel", scene)
    steel.diffuseColor = new Color3(SP.brass[0], SP.brass[1], SP.brass[2])
    steel.specularColor = new Color3(0.5, 0.45, 0.3)
    const iron = new StandardMaterial("mm-barbell-iron", scene)
    iron.diffuseColor = new Color3(SP.iron[0], SP.iron[1], SP.iron[2])
    iron.specularColor = new Color3(0.15, 0.15, 0.15)
    this.mats.push(steel, iron)
    def.floors.forEach((fl, fi) => {
      for (const it of fl.furniture) {
        if (it.t !== "squat_rack") continue
        const w = it.w ?? def.furnitureTypes.squat_rack?.w ?? 1.8
        const root = new TransformNode(`mm-barbell-${this.bars.length}`, scene)
        // a barra e as anilhas deitadas no X local (as mesmas medidas do rack antigo)
        const bar = CreateCylinder("mm-barbell-bar", { height: w + 0.5, diameter: 0.07, tessellation: 8 }, scene)
        bar.rotation.z = Math.PI / 2
        bar.material = steel
        bar.parent = root
        for (const sx of [-1, 1]) {
          const plate = CreateCylinder("mm-barbell-plate", { height: 0.08, diameter: 0.84, tessellation: 18 }, scene)
          plate.rotation.z = Math.PI / 2
          plate.position.x = sx * (w / 2 + 0.12)
          plate.material = iron
          plate.parent = root
        }
        for (const m of root.getChildMeshes()) m.isPickable = false
        const rest = new Vector3(it.x, fl.y + REST_Y, it.z)
        const a = (it.r * Math.PI) / 180
        const restQ = Quaternion.RotationYawPitchRoll(a, 0, 0)
        root.position.copyFrom(rest)
        root.rotationQuaternion = restQ.clone()
        this.bars.push({ root, floor: fi, rest, restQ, restX: new Vector3(Math.cos(a), 0, -Math.sin(a)), w: 0 })
      }
    })
  }

  get count() {
    return this.bars.length
  }

  /**
   * A cada quadro, DEPOIS de posicionar e animar o personagem (a animação já
   * rodou neste quadro: o Babylon anima antes do onBeforeRender). `squatting` =
   * toca o GymSquat agora; a barra é a do rack mais perto (até 1,5 m).
   */
  update(dt: number, char: Character, squatting: boolean, x: number, z: number, floor: number, facing: number) {
    let mine: Bar | null = null
    if (squatting) {
      let best = 1.5
      for (const b of this.bars) {
        const d = Math.hypot(b.rest.x - x, b.rest.z - z)
        if (b.floor === floor && d < best) {
          best = d
          mine = b
        }
      }
    }
    const step = dt / GRAB_S
    for (const b of this.bars) {
      b.root.setEnabled(b.floor <= floor)
      b.w = Math.max(0, Math.min(1, b.w + (b === mine ? step : -step)))
      if (b !== mine) {
        // devolve ao suporte (do último lugar nas costas)
        if (b.w <= 0) {
          b.root.position.copyFrom(b.rest)
          b.root.rotationQuaternion!.copyFrom(b.restQ)
        } else {
          Vector3.LerpToRef(b.rest, b.root.position, b.w, b.root.position)
          Quaternion.SlerpToRef(b.restQ, b.root.rotationQuaternion!, b.w, b.root.rotationQuaternion!)
        }
        continue
      }
      this.carry(b, char, facing)
    }
  }

  /** A barra nas costas e as mãos nela. */
  private carry(b: Bar, char: Character, facing: number) {
    const bone = (n: string) => char.bone(B(n)) as TransformNode | null
    const la = bone("LeftArm")
    const ra = bone("RightArm")
    const lf = bone("LeftForeArm")
    const rf = bone("RightForeArm")
    const lh = bone("LeftHand")
    const rh = bone("RightHand")
    const neck = bone("Neck")
    const hips = bone("Hips")
    if (!la || !ra || !lf || !rf || !lh || !rh || !neck || !hips) return
    const L = wpos(la)
    const R = wpos(ra)
    const sw = Vector3.Distance(L, R)
    if (sw < 1e-3) return
    // o tronco: "cima" do quadril ao pescoço; "costas" = o contrário da frente, em pé no tronco
    const up = wpos(neck).subtract(wpos(hips)).normalize()
    const back = new Vector3(-Math.sin(facing), 0, -Math.cos(facing))
    back.subtractInPlace(up.scale(Vector3.Dot(back, up))).normalize()
    // a linha da barra: de ombro a ombro, deitada (sem pender com a assimetria do clipe)
    const axis = R.subtract(L)
    axis.y = 0
    if (axis.lengthSquared() < 1e-8) return
    axis.normalize()
    const spot = L.add(R).scaleInPlace(0.5).addInPlace(back.scale(sw * BACK)).addInPlace(up.scale(sw * UP))
    const k = b.w * b.w * (3 - 2 * b.w)
    const dir = Vector3.Dot(axis, b.restX) < 0 ? axis.scale(-1) : axis
    alongX(dir, this.tmpQ)
    Vector3.LerpToRef(b.rest, spot, k, b.root.position)
    Quaternion.SlerpToRef(b.restQ, this.tmpQ, k, b.root.rotationQuaternion!)
    // as mãos na barra (pela barra de AGORA, que ainda pode estar descendo do suporte)
    const barX = Vector3.TransformNormal(Vector3.Right(), b.root.computeWorldMatrix(true)).normalize()
    if (Vector3.Dot(barX, axis) < 0) barX.scaleInPlace(-1)
    const c = b.root.position
    const pole = up.scale(-1).addInPlace(back.scale(0.7))
    for (const [arm, fore, hand, sgn] of [
      [la, lf, lh, -1],
      [ra, rf, rh, 1],
    ] as const) {
      const grip = c.add(barX.scale(sgn * sw * GRIP))
      const now = wpos(hand)
      const t = Vector3.Lerp(now, grip, k)
      solveArm(arm, fore, hand, t, wpos(arm).add(pole))
    }
  }

  dispose() {
    for (const b of this.bars) b.root.dispose(false, false)
    for (const m of this.mats) m.dispose()
  }
}
