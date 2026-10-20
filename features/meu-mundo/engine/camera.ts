// features/meu-mundo/engine/camera.ts
//
// Câmera em terceira pessoa. Não é a câmera livre de editor: o jogador só
// gira em volta do personagem e aproxima/afasta dentro de limites.
//
// Quando uma casa fica entre o personagem e a câmera, ela se aproxima RÁPIDO
// (para nunca mostrar o interior de uma parede) e volta DEVAGAR quando o
// caminho se abre (para não dar trancos ao passar rente às casas).

import { TargetCamera } from "@babylonjs/core/Cameras/targetCamera"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import type { Scene } from "@babylonjs/core/scene"
import { pointBlocked, type Box2 } from "./collision"

const EYE = 1.3

/** Rua (padrão) × dentro de casa: lá a câmera fica mais perto e mais alta. */
export interface CameraLimits {
  minPitch: number // rad a partir da vertical
  maxPitch: number
  minDist: number
  maxDist: number
  dist: number
  pitch: number
}
export const STREET_CAMERA: CameraLimits = { minPitch: 0.62, maxPitch: 1.32, minDist: 4.5, maxDist: 14, dist: 9, pitch: 1.08 }
// Dentro de casa: paredes de 2,6 m e cômodos pequenos. Mais inclinada (vê o
// cômodo por cima das paredes) e mais perto; o teto do andar não é desenhado.
export const INDOOR_CAMERA: CameraLimits = { minPitch: 0.42, maxPitch: 0.95, minDist: 3.2, maxDist: 9, dist: 6.2, pitch: 0.72 }

export class FollowCamera {
  readonly camera: TargetCamera
  private yaw = -Math.PI / 2
  private pitch: number
  /** Inclinação aplicada: a escolhida, ou mais alta enquanto há obstáculo. */
  private effPitch: number
  private dist: number
  private actual: number
  private tx = 0
  private tz = 0
  /** Altura do chão sob o personagem (andar, escada). */
  private ty = 0
  private readonly target = new Vector3()

  constructor(scene: Scene, private readonly lim: CameraLimits = STREET_CAMERA) {
    this.pitch = this.effPitch = lim.pitch
    this.dist = this.actual = lim.dist
    this.camera = new TargetCamera("mm-camera", new Vector3(0, 8, -9), scene)
    this.camera.minZ = 0.3
    this.camera.maxZ = 260
    this.camera.fov = 0.85
  }

  /** Coloca a câmera atrás de quem está virado para `facing`. */
  snapBehind(x: number, z: number, facing: number) {
    this.yaw = Math.atan2(-Math.cos(facing), -Math.sin(facing))
    this.tx = x
    this.tz = z
    this.actual = this.dist
    this.effPitch = this.pitch
  }

  /** Coloca a altura de uma vez (entrada na casa, troca de andar pelo servidor). */
  snapHeight(y: number) {
    this.ty = y
  }

  rotate(dYaw: number, dPitch: number) {
    this.yaw -= dYaw
    this.pitch = Math.max(this.lim.minPitch, Math.min(this.lim.maxPitch, this.pitch - dPitch))
  }

  zoom(delta: number) {
    this.dist = Math.max(this.lim.minDist, Math.min(this.lim.maxDist, this.dist + delta))
  }

  /** Direção "para a frente" no chão, do ponto de vista da câmera. */
  forward() {
    return { x: -Math.cos(this.yaw), z: -Math.sin(this.yaw) }
  }

  /** Até onde a câmera vai, nesta inclinação, sem entrar num obstáculo. */
  private clearDistance(pitch: number, boxes: Box2[]) {
    const sp = Math.sin(pitch)
    const dx = Math.cos(this.yaw) * sp
    const dy = Math.cos(pitch)
    const dz = Math.sin(this.yaw) * sp
    // Folga pequena (0,2 m): o personagem pode estar colado na parede, e uma
    // folga maior já "encostaria" no próprio personagem e bloquearia tudo.
    for (let d = 1; d <= this.dist; d += 0.3) {
      if (pointBlocked(this.tx + dx * d, this.ty + EYE + dy * d, this.tz + dz * d, boxes, 0.2)) {
        return Math.max(1, d - 0.4)
      }
    }
    return this.dist
  }

  update(dt: number, px: number, pz: number, boxes: Box2[], py = 0) {
    const follow = 1 - Math.exp(-12 * dt)
    this.tx += (px - this.tx) * follow
    this.tz += (pz - this.tz) * follow
    // Subindo a escada a câmera acompanha a altura (mais devagar, sem tranco).
    this.ty += (py - this.ty) * (1 - Math.exp(-8 * dt))
    this.target.set(this.tx, this.ty + EYE, this.tz)

    // Caminho bloqueado perto do personagem (ele está encostado numa casa,
    // de frente para a câmera)? Só encurtar poria a câmera dentro da parede:
    // ela SOBE até enxergar o personagem por cima, e volta devagar depois.
    let want = this.pitch
    let allowed = this.clearDistance(want, boxes)
    // Pode chegar quase à vista de cima: perder a inclinação é melhor que
    // perder o personagem de vista.
    while (allowed < Math.min(this.dist, 4.5) && want > 0.08) {
      want = Math.max(0.05, want - 0.1)
      allowed = this.clearDistance(want, boxes)
    }
    const pitchRate = want < this.effPitch ? 14 : 2.5
    this.effPitch += (want - this.effPitch) * (1 - Math.exp(-pitchRate * dt))
    allowed = this.clearDistance(this.effPitch, boxes)

    const rate = allowed < this.actual ? 25 : 4
    this.actual += (allowed - this.actual) * (1 - Math.exp(-rate * dt))

    const sp = Math.sin(this.effPitch)
    this.camera.position.set(
      this.tx + Math.cos(this.yaw) * sp * this.actual,
      this.ty + EYE + Math.cos(this.effPitch) * this.actual,
      this.tz + Math.sin(this.yaw) * sp * this.actual,
    )
    this.camera.setTarget(this.target)
  }
}
