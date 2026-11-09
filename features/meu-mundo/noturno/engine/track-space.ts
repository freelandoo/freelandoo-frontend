// features/meu-mundo/noturno/engine/track-space.ts — ROLÊ NOTURNO 2.0: da pista da regra para o mundo.
//
// A regra anda numa pista reta (x lado, y altura, z distância); o traçado
// (sim/track.ts) diz onde cada z fica no mundo e para onde apontam a frente
// (T), o cima (U) e o lado direito (R). Toda peça da corrida — jogador,
// obstáculos, moedas, logo, câmera — passa por aqui: posição = P + R·x + U·y
// e orientação = a base (R, U, T) da pista naquele z.
//
// A Clássica não tem traçado: `TrackSpace.flat()` devolve a identidade
// (posição = (x, y, z), sem giro) e quem usa não precisa saber a diferença.

import type { Scene } from "@babylonjs/core/scene"
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector"
import { TransformNode } from "@babylonjs/core/Meshes/transformNode"
import { TrackGeom, TrackPlan, newFrame, type RunPhase, type TrackFrame } from "../sim/track"

const TMP_R = new Vector3()
const TMP_U = new Vector3()
const TMP_T = new Vector3()

export class TrackSpace {
  readonly geom: TrackGeom | null
  readonly phase: RunPhase
  private readonly f = newFrame()
  private readonly qYaw = new Quaternion()

  private constructor(phase: RunPhase, geom: TrackGeom | null) {
    this.phase = phase
    this.geom = geom
  }

  /** A pista da fase pela semente (a mesma que a regra usa). */
  static of(phase: RunPhase, seed: number) {
    return new TrackSpace(phase, phase === "classica" ? null : new TrackGeom(new TrackPlan(phase, seed)))
  }

  get curved() {
    return this.geom !== null
  }

  /** O ponto da pista em `s` (cópia no `out`). */
  frame(s: number, out: TrackFrame = newFrame()): TrackFrame {
    if (!this.geom) {
      Object.assign(out, { px: 0, py: 0, pz: s, tx: 0, ty: 0, tz: 1, ux: 0, uy: 1, uz: 0, rx: 1, ry: 0, rz: 0, bank: 0 })
      return out
    }
    return this.geom.frame(s, out)
  }

  /** Posição no mundo de (x, y, z) da regra. */
  point(x: number, y: number, z: number, out: Vector3): Vector3 {
    if (!this.geom) return out.set(x, y, z)
    const f = this.geom.frame(z, this.f)
    return out.set(f.px + f.rx * x + f.ux * y, f.py + f.ry * x + f.uy * y, f.pz + f.rz * x + f.uz * y)
  }

  /** Orientação da pista em z (e mais um giro `yaw` em volta do cima local). */
  quat(z: number, out: Quaternion, yaw = 0): Quaternion {
    if (!this.geom) return Quaternion.RotationYawPitchRollToRef(yaw, 0, 0, out)
    const f = this.geom.frame(z, this.f)
    TMP_R.set(f.rx, f.ry, f.rz)
    TMP_U.set(f.ux, f.uy, f.uz)
    TMP_T.set(f.tx, f.ty, f.tz)
    Quaternion.RotationQuaternionFromAxisToRef(TMP_R, TMP_U, TMP_T, out)
    if (yaw) {
      Quaternion.RotationYawPitchRollToRef(yaw, 0, 0, this.qYaw)
      out.multiplyInPlace(this.qYaw)
    }
    return out
  }

  /** Põe um nó em (x, y, z) da regra com o giro `yaw` local (a Clássica usa rotation.y, como antes). */
  place(node: TransformNode, x: number, y: number, z: number, yaw = 0) {
    if (!this.geom) {
      node.rotationQuaternion = null
      node.position.set(x, y, z)
      node.rotation.y = yaw
      return
    }
    this.point(x, y, z, node.position)
    node.rotationQuaternion ??= new Quaternion()
    this.quat(z, node.rotationQuaternion, yaw)
  }

  /** Matriz de uma instância fina: escala, giro local (`q` no referencial da pista) e posição. */
  matrix(x: number, y: number, z: number, scale: Vector3, local: Quaternion, out: Matrix, tmpQ: Quaternion, tmpP: Vector3): Matrix {
    if (!this.geom) {
      tmpP.set(x, y, z)
      return Matrix.ComposeToRef(scale, local, tmpP, out)
    }
    this.quat(z, tmpQ)
    tmpQ.multiplyInPlace(local)
    this.point(x, y, z, tmpP)
    return Matrix.ComposeToRef(scale, tmpQ, tmpP, out)
  }

  /** Nó que acompanha a pista em z (o jogador e os outros do grupo ficam pendurados nele). */
  anchor(scene: Scene, name: string) {
    return new TransformNode(name, scene)
  }

  /** Solta amostras que ficaram para trás. */
  forget(z: number) {
    this.geom?.forget(z)
  }
}
