// features/meu-mundo/paint/engine/aim-camera.ts — PAINT (mm3d-35): câmera por cima do ombro.
//
// Terceira pessoa com a mira no centro da tela: atrás e um pouco à direita do
// personagem, girando livre em volta dele (guinada) e para cima/baixo (até
// quase o pé — "olhe para baixo e atire no pé" do degrau). Se uma pedra fica
// entre o personagem e a câmera, ela chega mais perto na hora e volta devagar.
// A MIRA é o raio da câmera pelo centro da tela: o tiro sai da arma em
// direção ao ponto que esse raio acerta.

import { TargetCamera } from "@babylonjs/core/Cameras/targetCamera"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import type { Scene } from "@babylonjs/core/scene"
import { raycast } from "../sim/collide"
import type { Solid, Vec3 } from "../sim/map"

const DIST = 4.4
const SHOULDER = 0.62
const PIVOT_H = 1.62
const MIN_PITCH = -0.75 // olhando para cima
const MAX_PITCH = 1.38 // quase o pé
const AIM_FAR = 70

export class AimCamera {
  readonly camera: TargetCamera
  /** Guinada (rad, 0 = olhando para +z) e arfagem (rad, + = para baixo). */
  yaw = 0
  pitch = 0.22
  private actual = DIST
  private py = 0
  private ready = false
  private readonly target = new Vector3()

  constructor(scene: Scene) {
    this.camera = new TargetCamera("paint-camera", new Vector3(0, 4, -6), scene)
    this.camera.minZ = 0.15
    this.camera.maxZ = 420
    this.camera.fov = 0.95
  }

  look(dx: number, dy: number, sens = 0.0026) {
    this.yaw += dx * sens
    this.pitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, this.pitch + dy * sens))
  }

  snap(facing: number) {
    this.yaw = facing
    this.pitch = 0.22
    this.ready = false
  }

  /** Para onde a câmera olha (unitário). */
  forward(): Vec3 {
    const c = Math.cos(this.pitch)
    return { x: Math.sin(this.yaw) * c, y: -Math.sin(this.pitch), z: Math.cos(this.yaw) * c }
  }

  /** Direita no plano (para o ombro e para andar de lado). */
  right(): Vec3 {
    return { x: Math.cos(this.yaw), y: 0, z: -Math.sin(this.yaw) }
  }

  update(dt: number, x: number, y: number, z: number, solids: readonly Solid[]) {
    // altura do pivô segue o corpo com um pouco de atraso (pulo não chacoalha)
    if (!this.ready) {
      this.py = y
      this.actual = DIST
      this.ready = true
    } else {
      const k = 1 - Math.exp(-(y < this.py ? 14 : 9) * dt)
      this.py += (y - this.py) * k
    }
    const f = this.forward()
    const r = this.right()
    // perto do chão olhando para baixo: a câmera sobe um pouco
    const pivot = { x: x + r.x * SHOULDER, y: this.py + PIVOT_H + Math.max(0, this.pitch - 0.6) * 0.5, z: z + r.z * SHOULDER }
    const back = { x: -f.x, y: -f.y, z: -f.z }
    const hit = raycast(solids, pivot, back, DIST + 0.3)
    const want = hit ? Math.max(0.6, hit.t - 0.35) : DIST
    if (want < this.actual) this.actual = want
    else this.actual += (want - this.actual) * (1 - Math.exp(-4 * dt))
    this.camera.position.set(pivot.x + back.x * this.actual, pivot.y + back.y * this.actual, pivot.z + back.z * this.actual)
    this.target.set(pivot.x + f.x * 10, pivot.y + f.y * 10, pivot.z + f.z * 10)
    this.camera.setTarget(this.target)
  }

  /**
   * Onde a mira acerta: o raio do centro da tela contra o mundo e os corpos
   * (função de quem chama). Sem nada no caminho, um ponto longe.
   */
  aimPoint(solids: readonly Solid[], bodies?: (o: Vec3, d: Vec3, maxT: number) => number | null): Vec3 {
    const p = this.camera.position
    const o = { x: p.x, y: p.y, z: p.z }
    const d = this.forward()
    // começa na altura do personagem (não acerta o que está entre a câmera e ele)
    const skip = this.actual + 0.4
    const s = { x: o.x + d.x * skip, y: o.y + d.y * skip, z: o.z + d.z * skip }
    const hit = raycast(solids, s, d, AIM_FAR)
    let t = hit ? hit.t : AIM_FAR
    const tb = bodies?.(s, d, t)
    if (tb !== null && tb !== undefined && tb < t) t = tb
    return { x: s.x + d.x * t, y: s.y + d.y * t, z: s.z + d.z * t }
  }

  dispose() {
    this.camera.dispose()
  }
}
