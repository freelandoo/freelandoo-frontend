// features/meu-mundo/paint/engine/pickups-view.ts — PAINT (mm3d-35): as cápsulas.
//
// Cápsulas: vidro com a tinta da cor dentro, flutuando e girando; somem ao
// pegar e voltam quando a regra diz. (Os gatinhos moram em cat-herd.ts desde o
// mm3d-35g — leves, por instância, com a fila atrás de quem pegou.)
//
// mm3d-46: a cápsula da cor MURO é o LOGO 3D da Freelandoo girando (o mesmo
// da corrida, menor, com halo e purpurina ao pegar).

import type { Scene } from "@babylonjs/core/scene"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import type { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh"
import "@babylonjs/core/Meshes/instancedMesh"
import { CreateCapsule } from "@babylonjs/core/Meshes/Builders/capsuleBuilder"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import { PAINT, PAINT_COLORS } from "../sim/tuning"
import type { PaintCapsule } from "../sim/map"
import { buildLogos, type LogoView } from "../../corrida/engine/logos"

export class PickupsView {
  private readonly caps = new Map<number, { cap: PaintCapsule; glass: InstancedMesh; ink: InstancedMesh; on: boolean; phase: number }>()
  private readonly glassBase: Mesh
  private readonly glassMat: StandardMaterial
  private readonly inkBases: Mesh[] = []
  private readonly inkMats: StandardMaterial[] = []
  private readonly logos: LogoView
  private readonly logoIds = new Set<number>()
  private clock = 0

  constructor(scene: Scene, capsules: readonly PaintCapsule[], lowEnd = false) {
    const logoCaps = capsules.filter((c) => c.c === PAINT.WALL)
    for (const c of logoCaps) this.logoIds.add(c.id)
    this.logos = buildLogos(scene, logoCaps.map((c) => ({ id: c.id, at: new Vector3(c.x, c.y + 1.05, c.z) })), lowEnd, 0.42)
    this.glassMat = new StandardMaterial("paint-cap-glass", scene)
    this.glassMat.diffuseColor = new Color3(0.95, 0.97, 1)
    this.glassMat.specularColor = new Color3(1, 1, 1)
    this.glassMat.specularPower = 80
    this.glassMat.alpha = 0.32
    this.glassBase = CreateCapsule("paint-cap-glass", { radius: 0.24, height: 0.86, tessellation: 12, subdivisions: 2 }, scene)
    this.glassBase.material = this.glassMat
    this.glassBase.isPickable = false
    this.glassBase.setEnabled(false)
    for (let c = 0; c < 3; c++) {
      const m = new StandardMaterial(`paint-cap-ink-${c}`, scene)
      const col = Color3.FromHexString(PAINT_COLORS[c])
      m.diffuseColor = col
      m.emissiveColor = col.scale(0.35)
      m.specularColor = new Color3(0.5, 0.5, 0.5)
      this.inkMats.push(m)
      const b = CreateCapsule(`paint-cap-ink-${c}`, { radius: 0.17, height: 0.62, tessellation: 10, subdivisions: 1 }, scene)
      b.material = m
      b.isPickable = false
      b.setEnabled(false)
      this.inkBases.push(b)
    }
    for (const cap of capsules) {
      if (cap.c === PAINT.WALL) continue
      const glass = this.glassBase.createInstance(`paint-cap-g-${cap.id}`)
      const ink = this.inkBases[cap.c].createInstance(`paint-cap-i-${cap.id}`)
      glass.isPickable = false
      ink.isPickable = false
      this.caps.set(cap.id, { cap, glass, ink, on: true, phase: (cap.id * 1.7) % (Math.PI * 2) })
    }
  }

  setCapsule(id: number, on: boolean) {
    if (this.logoIds.has(id)) return this.logos.setOn(id, on)
    const c = this.caps.get(id)
    if (!c || c.on === on) return
    c.on = on
    c.glass.setEnabled(on)
    c.ink.setEnabled(on)
  }

  tick(dt: number) {
    this.clock += dt
    this.logos.tick(this.clock)
    for (const c of this.caps.values()) {
      if (!c.on) continue
      const y = c.cap.y + 0.75 + Math.sin(this.clock * 2.2 + c.phase) * 0.12
      const r = this.clock * 1.4 + c.phase
      c.glass.position.set(c.cap.x, y, c.cap.z)
      c.ink.position.set(c.cap.x, y, c.cap.z)
      c.glass.rotation.set(0.35, r, 0)
      c.ink.rotation.set(0.35, r, 0)
    }
  }

  dispose() {
    this.logos.dispose()
    for (const c of this.caps.values()) {
      c.glass.dispose()
      c.ink.dispose()
    }
    this.glassBase.dispose()
    this.glassMat.dispose()
    for (const b of this.inkBases) b.dispose()
    for (const m of this.inkMats) m.dispose()
  }
}
