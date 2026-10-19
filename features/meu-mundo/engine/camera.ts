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

const MIN_PITCH = 0.62 // rad a partir da vertical
const MAX_PITCH = 1.32
const MIN_DIST = 4.5
const MAX_DIST = 14
const EYE = 1.3

export class FollowCamera {
  readonly camera: TargetCamera
  private yaw = -Math.PI / 2
  private pitch = 1.08
  /** Inclinação aplicada: a escolhida, ou mais alta enquanto há obstáculo. */
  private effPitch = 1.08
  private dist = 9
  private actual = 9
  private tx = 0
  private tz = 0
  private readonly target = new Vector3()

  constructor(scene: Scene) {
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

  rotate(dYaw: number, dPitch: number) {
    this.yaw -= dYaw
    this.pitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, this.pitch - dPitch))
  }

  zoom(delta: number) {
    this.dist = Math.max(MIN_DIST, Math.min(MAX_DIST, this.dist + delta))
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
      if (pointBlocked(this.tx + dx * d, EYE + dy * d, this.tz + dz * d, boxes, 0.2)) {
        return Math.max(1, d - 0.4)
      }
    }
    return this.dist
  }

  update(dt: number, px: number, pz: number, boxes: Box2[]) {
    const follow = 1 - Math.exp(-12 * dt)
    this.tx += (px - this.tx) * follow
    this.tz += (pz - this.tz) * follow
    this.target.set(this.tx, EYE, this.tz)

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
      EYE + Math.cos(this.effPitch) * this.actual,
      this.tz + Math.sin(this.yaw) * sp * this.actual,
    )
    this.camera.setTarget(this.target)
  }
}
