// features/meu-mundo/engine/player.ts
//
// Personagem PROVISÓRIO: serve para testar escala e movimento, não é o boneco
// final. Chibi sem boca — cabeça grande, corpo pequeno — numa malha só, mais
// uma sombra falsa (um disco translúcido) para ele não parecer flutuar, já que
// a cena não tem sombras dinâmicas.

import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import type { Scene } from "@babylonjs/core/scene"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import { GeoBuilder, place } from "./geometry"
import { resolveCircle, type Box2 } from "./collision"

const SPEED = 4.6 // m/s
const RADIUS = 0.42
const LIMIT = 70 // rede de segurança além das cercas

function lerpAngle(a: number, b: number, t: number) {
  let d = b - a
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return a + d * t
}

export class Player {
  x = 0
  z = 0
  facing = 0
  private vx = 0
  private vz = 0
  private phase = 0
  private readonly body: Mesh
  private readonly shadow: Mesh
  private readonly mats: StandardMaterial[]

  constructor(scene: Scene, material: StandardMaterial) {
    const g = new GeoBuilder()
    // Pernas, corpo, braços.
    for (const sx of [-0.15, 0.15]) g.cylinder(0.22, 0.34, place(sx, 0.17, 0), [0.25, 0.27, 0.36], 8)
    g.sphere(0.72, [1, 1.05, 0.88], place(0, 0.6, 0), [0.96, 0.56, 0.26], 8)
    for (const sx of [-0.4, 0.4]) g.sphere(0.24, [1, 1.2, 1], place(sx, 0.62, 0.02), [0.99, 0.85, 0.72])
    // Cabeça grande, cabelo atrás e por cima, olhos. Sem boca, de propósito.
    g.sphere(1, [1, 0.96, 0.98], place(0, 1.38, 0), [0.99, 0.85, 0.72], 10)
    g.sphere(1.06, [1, 0.72, 1], place(0, 1.56, -0.09), [0.35, 0.23, 0.16], 10)
    for (const sx of [-0.18, 0.18]) {
      g.sphere(0.12, [1, 1.45, 0.6], place(sx, 1.36, 0.46), [0.1, 0.1, 0.13])
      g.sphere(0.12, [1.3, 0.7, 0.4], place(sx * 1.55, 1.22, 0.4), [0.98, 0.62, 0.62])
    }
    this.body = g.build("mm-player", scene, material, false)

    const shadowMat = new StandardMaterial("mm-shadow", scene)
    shadowMat.diffuseColor = new Color3(0, 0, 0)
    shadowMat.specularColor = new Color3(0, 0, 0)
    shadowMat.disableLighting = true
    shadowMat.alpha = 0.22
    const sg = new GeoBuilder()
    sg.cylinder(1, 0.01, place(0, 0, 0), [0, 0, 0], 16)
    this.shadow = sg.build("mm-player-shadow", scene, shadowMat, false)
    this.mats = [shadowMat]
  }

  teleport(x: number, z: number, facing: number) {
    this.x = x
    this.z = z
    this.facing = facing
    this.vx = 0
    this.vz = 0
    this.sync(0)
  }

  stop() {
    this.vx = 0
    this.vz = 0
  }

  /** (mx, mz): direção desejada no mundo, módulo 0..1. */
  update(dt: number, mx: number, mz: number, boxes: Box2[]) {
    // Independe da taxa de quadros: a suavização usa exp(-k·dt).
    const k = 1 - Math.exp(-14 * dt)
    this.vx += (mx * SPEED - this.vx) * k
    this.vz += (mz * SPEED - this.vz) * k
    const speed = Math.hypot(this.vx, this.vz)
    if (speed < 0.02) {
      this.vx = 0
      this.vz = 0
    }

    // Subpassos de no máximo 25 ms: com o quadro lento, um passo inteiro
    // poderia pular a cerca viva fina (0,3 m) de um lado para o outro.
    const steps = Math.max(1, Math.ceil(dt / 0.025))
    const h = dt / steps
    for (let i = 0; i < steps; i++) {
      const next = resolveCircle(this.x + this.vx * h, this.z + this.vz * h, RADIUS, boxes)
      this.x = Math.max(-LIMIT, Math.min(LIMIT, next.x))
      this.z = Math.max(-LIMIT, Math.min(LIMIT, next.z))
    }

    if (speed > 0.25) {
      this.facing = lerpAngle(this.facing, Math.atan2(this.vx, this.vz), 1 - Math.exp(-12 * dt))
      this.phase += dt * speed * 2.6
    } else {
      this.phase = 0
    }
    this.sync(speed / SPEED)
  }

  private sync(amount: number) {
    const bob = Math.abs(Math.sin(this.phase)) * 0.08 * amount
    this.body.position.set(this.x, bob, this.z)
    this.body.rotation.y = this.facing
    this.body.rotation.z = Math.sin(this.phase) * 0.07 * amount
    this.shadow.position.set(this.x, 0.09, this.z)
    const s = 0.95 - bob * 1.2
    this.shadow.scaling.set(s, 1, s)
  }

  dispose() {
    this.body.dispose()
    this.shadow.dispose()
    for (const m of this.mats) m.dispose()
  }
}
