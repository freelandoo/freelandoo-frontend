// features/meu-mundo/engine/arm-ik.ts — IK de dois ossos (braço → antebraço → mão).
//
// 2026-11-01 (pedidos do Alex): a mão esquerda da raposa SEGURA o cajado e os
// corpos volumosos (Ciborgue, Golem) ficam com os punhos FORA da cabeça na
// guarda. Roda depois das animações: leva o pulso a um alvo de mundo com
// peso 0–1, sem depender da convenção de eixo de cada osso — a rotação é
// montada pela fórmula de Rodrigues sobre vetores de mundo e passada ao osso
// pela matriz do pai (vale com a raiz espelhada do glTF).
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector"
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode"
import type { Scene } from "@babylonjs/core/scene"

export interface ArmChain {
  upper: TransformNode
  lower: TransformNode
  end: TransformNode
}

/** A cadeia do braço `side` entre os nós de um personagem. */
export function armChain(bone: (name: string) => TransformNode | null, side: "Left" | "Right"): ArmChain | null {
  const upper = bone(`mixamorig:${side}Arm`)
  const lower = bone(`mixamorig:${side}ForeArm`)
  const end = bone(`mixamorig:${side}Hand`)
  return upper && lower && end ? { upper, lower, end } : null
}

const pos = (n: TransformNode) => n.getAbsolutePosition().clone()

function refresh(c: ArmChain) {
  c.upper.computeWorldMatrix(true)
  c.lower.computeWorldMatrix(true)
  c.end.computeWorldMatrix(true)
}

/** Gira `node` no MUNDO (em volta da própria posição) de modo que `from` vire `to`. */
function turn(node: TransformNode, from: Vector3, to: Vector3) {
  const a = from.normalizeToNew()
  const b = to.normalizeToNew()
  const cos = Math.max(-1, Math.min(1, Vector3.Dot(a, b)))
  if (cos > 0.99999) return
  let k = Vector3.Cross(a, b)
  if (k.lengthSquared() < 1e-10) k = Math.abs(a.x) < 0.9 ? Vector3.Cross(a, Vector3.Right()) : Vector3.Cross(a, Vector3.Up())
  k.normalize()
  const s = Math.sqrt(1 - cos * cos)
  const t = 1 - cos
  // R (vetor coluna, Rodrigues) — a matriz do Babylon é de vetor LINHA: M = Rᵀ.
  const R = [
    [t * k.x * k.x + cos, t * k.x * k.y - s * k.z, t * k.x * k.z + s * k.y],
    [t * k.x * k.y + s * k.z, t * k.y * k.y + cos, t * k.y * k.z - s * k.x],
    [t * k.x * k.z - s * k.y, t * k.y * k.z + s * k.x, t * k.z * k.z + cos],
  ]
  const M = Matrix.FromValues(R[0][0], R[1][0], R[2][0], 0, R[0][1], R[1][1], R[2][1], 0, R[0][2], R[1][2], R[2][2], 0, 0, 0, 0, 1)
  const p = node.getAbsolutePosition()
  const pivot = Matrix.Translation(-p.x, -p.y, -p.z).multiply(M).multiply(Matrix.Translation(p.x, p.y, p.z))
  const world = node.getWorldMatrix().multiply(pivot)
  const parent = node.parent ? (node.parent as TransformNode).getWorldMatrix() : Matrix.Identity()
  const local = world.multiply(Matrix.Invert(parent))
  const sc = new Vector3()
  const q = new Quaternion()
  local.decompose(sc, q)
  if (!node.rotationQuaternion) node.rotationQuaternion = new Quaternion()
  node.rotationQuaternion.copyFrom(q)
}

/**
 * Leva o pulso de `c` para `target` (mundo) com peso `w`. O cotovelo dobra no
 * plano em que já está (o da animação); `pole` desempata quando o braço está
 * esticado. Fora do alcance, estica na direção do alvo.
 */
export function reach(c: ArmChain, target: Vector3, w: number, pole?: Vector3): number {
  if (w <= 0.001) return 0
  refresh(c)
  const A = pos(c.upper)
  const B = pos(c.lower)
  const C = pos(c.end)
  const T = C.add(target.subtract(C).scale(Math.min(1, w)))
  const la = B.subtract(A).length()
  const lb = C.subtract(B).length()
  const d = Math.max(Math.abs(la - lb) + 1e-3, Math.min(la + lb - 1e-3, T.subtract(A).length()))
  // 1) cotovelo: ângulo de dobra β (0 = esticado) que dá a distância d
  const u = B.subtract(A)
  const v = C.subtract(B)
  let n = Vector3.Cross(u, v)
  if (n.lengthSquared() < 1e-10) n = Vector3.Cross(u, pole ?? Vector3.Up())
  n.normalize()
  const cosT = (la * la + lb * lb - d * d) / (2 * la * lb)
  const betaWant = Math.PI - Math.acos(Math.max(-1, Math.min(1, cosT)))
  const betaNow = Math.acos(Math.max(-1, Math.min(1, Vector3.Dot(u.normalizeToNew(), v.normalizeToNew()))))
  const dB = betaWant - betaNow
  if (Math.abs(dB) > 1e-4) {
    // v girado em volta de n por dB (Rodrigues; n ⟂ v)
    const vr = v.scale(Math.cos(dB)).add(Vector3.Cross(n, v).scale(Math.sin(dB)))
    turn(c.lower, v, vr)
    refresh(c)
  }
  // 2) braço: aponta o pulso para o alvo
  const C2 = pos(c.end)
  turn(c.upper, C2.subtract(A), T.subtract(A))
  refresh(c)
  /** Erro final (m): quanto o pulso ficou longe do alvo pesado. */
  return pos(c.end).subtract(T).length()
}

/**
 * Mão esquerda no CAJADO (a direita é da WeaponGrip): o ponto da haste mais
 * perto de onde a animação pôs a mão, a pelo menos `gap` m da mão direita, e
 * o pulso recua o comprimento da palma para a haste ficar NA palma.
 */
export function staffHold(c: ArmChain, staff: TransformNode, middle: TransformNode | null, gap = 0.2, max = 0.55): Vector3 {
  refresh(c)
  staff.computeWorldMatrix(true)
  const o = staff.getAbsolutePosition()
  const axis = Vector3.TransformNormal(Vector3.Up(), staff.getWorldMatrix()).normalize()
  const wr = pos(c.end)
  // O ponto da haste que o braço ALCANÇA: o mais perto do ombro (e um pouco
  // do pulso da animação), a pelo menos `gap` m da mão direita.
  const sh = pos(c.upper)
  let best = o.add(axis.scale(gap))
  let bestCost = Infinity
  for (let y = -max; y <= max + 1e-6; y += 0.02) {
    if (Math.abs(y) < gap) continue
    const p = o.add(axis.scale(y))
    const cost = p.subtract(sh).length() + 0.3 * p.subtract(wr).length()
    if (cost < bestCost) {
      bestCost = cost
      best = p
    }
  }
  const point = best
  if (!middle) return point
  middle.computeWorldMatrix(true)
  const palm = middle.getAbsolutePosition().subtract(wr).scale(0.55)
  return point.subtract(palm)
}

/**
 * Guarda de luta para corpos volumosos: os dois punhos à frente do rosto,
 * longe da cabeça, na escala do braço do próprio corpo. Frente do corpo pela
 * linha dos ombros (esquerdo → direito) × cima.
 */
export function guardFists(bone: (name: string) => TransformNode | null, reachK = 0.62, openK = 1, upK = 0.5): { Left: Vector3; Right: Vector3; pole: Vector3; poleL: Vector3; poleR: Vector3 } | null {
  const l = bone("mixamorig:LeftArm")
  const r = bone("mixamorig:RightArm")
  const head = bone("mixamorig:Head")
  const le = bone("mixamorig:LeftForeArm")
  const lh = bone("mixamorig:LeftHand")
  if (!l || !r || !head || !le || !lh) return null
  for (const n of [l, r, head, le, lh]) n.computeWorldMatrix(true)
  const L = l.getAbsolutePosition()
  const Rr = r.getAbsolutePosition()
  const H = head.getAbsolutePosition()
  const arm = le.getAbsolutePosition().subtract(L).length() + lh.getAbsolutePosition().subtract(le.getAbsolutePosition()).length()
  const right = Rr.subtract(L)
  right.y = 0
  right.normalize()
  const fwd = Vector3.Cross(right, Vector3.Up()).normalize()
  const mid = L.add(Rr).scale(0.5)
  const chin = new Vector3(mid.x, mid.y + (H.y - mid.y) * upK, mid.z)
  // abertura em larguras de OMBRO: 1 = cada punho à frente do seu ombro (paralelos, sem cruzar)
  const halfW = Math.hypot(Rr.x - L.x, Rr.z - L.z) / 2
  const at = (side: number) => chin.add(fwd.scale(arm * reachK)).add(right.scale(side * halfW * openK))
  // cotovelo baixo, um pouco para fora e para trás (manopla grande não sobe na cara)
  const pole = (side: number) => Vector3.Down().add(right.scale(side * 0.6)).add(fwd.scale(-0.3)).normalize()
  return { Left: at(-1), Right: at(1), pole: Vector3.Down(), poleL: pole(-1), poleR: pole(1) }
}

/**
 * Como `reach`, mas o COTOVELO vai para o lado de `pole` (direção de mundo) —
 * para guardas em que o cotovelo tem que ficar baixo e para fora.
 */
export function reachPole(c: ArmChain, target: Vector3, w: number, pole: Vector3): number {
  if (w <= 0.001) return 0
  refresh(c)
  const A = pos(c.upper)
  const B = pos(c.lower)
  const C = pos(c.end)
  const T = C.add(target.subtract(C).scale(Math.min(1, w)))
  const la = B.subtract(A).length()
  const lb = C.subtract(B).length()
  const toT = T.subtract(A)
  const d = Math.max(Math.abs(la - lb) + 1e-3, Math.min(la + lb - 1e-3, toT.length()))
  const dn = toT.normalizeToNew()
  const pp = pole.subtract(dn.scale(Vector3.Dot(pole, dn)))
  if (pp.lengthSquared() < 1e-8) return reach(c, target, w, pole)
  pp.normalize()
  const cosA = Math.max(-1, Math.min(1, (la * la + d * d - lb * lb) / (2 * la * d)))
  const E = A.add(dn.scale(la * cosA)).add(pp.scale(la * Math.sqrt(1 - cosA * cosA)))
  turn(c.upper, B.subtract(A), E.subtract(A))
  refresh(c)
  const B2 = pos(c.lower)
  turn(c.lower, pos(c.end).subtract(B2), T.subtract(B2))
  refresh(c)
  return pos(c.end).subtract(T).length()
}

/** Corpos de braço mecânico/pedra grande: guarda baixa por IK (2026-11-01, "o ciborgue … os braços entram nele"). */
export const BULKY_GUARD: Partial<Record<string, [number, number, number]>> = {
  ciborgue: [1.05, 1.0, -1.0],
  golem: [1.0, 1.0, -0.9],
}

/** Braço com a arma de fogo: quanto vai para trás (rad) e para fora do tronco largo. */
const GUN_ARM_BACK = 0.26
const GUN_ARM_OUT = 0.14
/**
 * A mão do Ciborgue nasce dobrada ~68° para a frente do osso: o punho visível fica a 0,86 m do
 * pulso, nesta direção no quadro do osso da mão (medido no GLB: pesos da mão × bind).
 */
const GUN_FIST = { Right: new Vector3(0.627, 0.373, -0.684), Left: new Vector3(-0.639, 0.383, -0.667) }
const GUN_FIST_REACH = 0.7
/** Quanto a mão de apoio entra para baixo do cano. */
const GUN_HAND_IN = 0.45

/**
 * Ajustes depois das animações num personagem: guarda baixa (corpos
 * volumosos) e mão do cajado em pé. Peso suave (`want` 0/1 → `w`).
 */
export class PoseFix {
  private obs: ReturnType<Scene["onAfterAnimationsObservable"]["add"]> = null
  /** Guarda baixa: 1 enquanto está na guarda parada (sem golpe). */
  guardWant = 0
  private guardW = 0
  /** Cajado em pé: 1 parado na pose de mago. */
  staffWant = 0
  staffW = 0
  /** Arma de fogo do Ciborgue na cintura: 1 enquanto carrega ou atira. */
  gunWant = 0
  gunW = 0
  /** Rumo do personagem (rad): os clipes de fuzil giram o tronco, a linha dos ombros não serve de frente. */
  gunYaw = 0
  /** Frente do corpo no mundo, para a arma ficar nivelada (WeaponGrip.front). */
  readonly front = new Vector3(0, 0, 1)
  /** Do pulso até o punho visível, no mundo: é ali que a arma fica (WeaponGrip.shift). */
  readonly gunShift = new Vector3()
  private last = performance.now()

  constructor(
    private readonly scene: Scene,
    private readonly bone: (name: string) => TransformNode | null,
    private readonly guard: [number, number, number] | null,
  ) {
    this.obs = scene.onAfterAnimationsObservable.add(() => this.apply())
  }

  private apply() {
    const now = performance.now()
    const dt = Math.min(0.1, (now - this.last) / 1000)
    this.last = now
    const k = 1 - Math.exp(-10 * dt)
    this.guardW += (this.guardWant - this.guardW) * k
    this.staffW += (this.staffWant - this.staffW) * k
    this.gunW += (this.gunWant - this.gunW) * k
    if (this.guard && this.guardW > 0.01) {
      const g = guardFists(this.bone, ...this.guard)
      if (g) {
        for (const side of ["Left", "Right"] as const) {
          const c = armChain(this.bone, side)
          if (c) reachPole(c, g[side], this.guardW, side === "Left" ? g.poleL : g.poleR)
        }
      }
    }
    if (this.staffW > 0.01) {
      // mão do cajado: cotovelo dobrado, punho à frente e ao lado da cintura
      const c = armChain(this.bone, "Right")
      const l = this.bone("mixamorig:LeftArm")
      if (c && l) {
        refresh(c)
        l.computeWorldMatrix(true)
        const S = pos(c.upper)
        const right = S.subtract(l.getAbsolutePosition())
        right.y = 0
        right.normalize()
        const fwd = Vector3.Cross(right, Vector3.Up()).normalize()
        const arm = pos(c.lower).subtract(S).length() + pos(c.end).subtract(pos(c.lower)).length()
        const T = S.add(Vector3.Down().scale(arm * 0.62)).add(fwd.scale(arm * 0.5)).add(right.scale(arm * 0.28))
        reachPole(c, T, this.staffW, Vector3.Down().add(fwd.scale(-0.6)).add(right.scale(0.4)).normalize())
      }
    }
    if (this.gunW > 0.01) this.holdGun()
  }

  /**
   * Regra do Alex (2026-11-06): quem carrega a arma de fogo não ergue a mão. Ombro baixo, braço
   * levemente para trás, cotovelo em L (90°) e antebraço para a frente, nos dois braços; a outra
   * mão fica por baixo do cano. Quem aponta é o punho visível, não o osso da mão (GUN_FIST).
   */
  private holdGun() {
    const c = armChain(this.bone, "Right")
    const o = armChain(this.bone, "Left")
    if (!c || !o) return
    const fwd = this.front.set(Math.sin(this.gunYaw), 0, Math.cos(this.gunYaw))
    const right = Vector3.Cross(Vector3.Up(), fwd)
    this.squareChest(c, o, right)
    refresh(c)
    refresh(o)
    const back = GUN_ARM_BACK
    const fore = fwd.scale(Math.cos(back)).add(Vector3.Down().scale(Math.sin(back))).normalize()
    const pole = Vector3.Down().add(fwd.scale(-1)).normalize()
    const place = (arm: ArmChain, side: number, dir: Vector3, fist: Vector3) => {
      const S = pos(arm.upper)
      const upperLen = pos(arm.lower).subtract(S).length()
      const foreLen = pos(arm.end).subtract(pos(arm.lower)).length()
      const upper = Vector3.Down().scale(Math.cos(back)).add(fwd.scale(-Math.sin(back))).add(right.scale(side * GUN_ARM_OUT)).normalize()
      reachPole(arm, S.add(upper.scale(upperLen)).add(dir.scale(foreLen)), this.gunW, pole.add(right.scale(side * 0.4)).normalize())
      arm.end.computeWorldMatrix(true)
      const now = Vector3.TransformNormal(fist, arm.end.getWorldMatrix()).normalize()
      turn(arm.end, now, now.scale(1 - this.gunW).add(dir.scale(this.gunW)))
      arm.end.computeWorldMatrix(true)
    }
    place(c, 1, fore, GUN_FIST.Right)
    place(o, -1, fore.add(right.scale(GUN_HAND_IN)).normalize(), GUN_FIST.Left)
    this.gunShift.copyFrom(fore).scaleInPlace(GUN_FIST_REACH)
  }

  /** Desfaz o giro do tronco da postura de tiro: o peito volta a olhar para onde o corpo anda. */
  private squareChest(c: ArmChain, o: ArmChain, right: Vector3) {
    const chest = this.bone("mixamorig:Spine2")
    if (!chest) return
    const links = ["mixamorig:RightShoulder", "mixamorig:LeftShoulder", "mixamorig:Neck", "mixamorig:Head"].map((n) => this.bone(n))
    chest.computeWorldMatrix(true)
    for (const n of links) n?.computeWorldMatrix(true)
    refresh(c)
    refresh(o)
    const now = pos(c.upper).subtract(pos(o.upper))
    now.y = 0
    if (now.lengthSquared() < 1e-8) return
    now.normalize()
    turn(chest, now, now.scale(1 - this.gunW).add(right.scale(this.gunW)))
    chest.computeWorldMatrix(true)
    for (const n of links) n?.computeWorldMatrix(true)
  }

  dispose() {
    if (this.obs) this.scene.onAfterAnimationsObservable.remove(this.obs)
    this.obs = null
  }
}
