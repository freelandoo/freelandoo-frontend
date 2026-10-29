// features/meu-mundo/engine/center-mobs.ts — monstros das invasões no centro (mm3d-48b).
//
// A sala do centro manda a lista inteira ("mobs": [id, tipo, x, z, rumo]) a
// cada 0,5 s enquanto houver monstro; aqui cada um vira o boneco provisório
// da Arena das Lâminas (laminas/engine/monster-view.ts), anda suave entre as
// posições e ganha o PORTAL aos pés: um anel violeta girando com brilho no
// chão. Chegar perto = "Lutar" (Interactable "monster"); quem decide se o
// monstro sai é a sala (vitória de quem está perto).

import type { Scene } from "@babylonjs/core/scene"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import { CreateTorus } from "@babylonjs/core/Meshes/Builders/torusBuilder"
import { CreateDisc } from "@babylonjs/core/Meshes/Builders/discBuilder"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { MonsterModel } from "../laminas/engine/monster-view"
import type { Interactable } from "../types"

type MobKindCity = "wolf" | "golem" | "harpy" | "brute"
const KINDS = new Set<MobKindCity>(["wolf", "golem", "harpy", "brute"])
/** Raio de "Lutar" (m). */
const REACH = 3.4

interface View {
  id: number
  kind: MobKindCity
  model: MonsterModel
  ring: Mesh
  glow: Mesh
  x: number
  z: number
  facing: number
  tx: number
  tz: number
  tf: number
  speed: number
  seen: number
}

export class CenterMobs {
  private readonly views = new Map<number, View>()
  private readonly ringMat: StandardMaterial
  private readonly glowMat: StandardMaterial
  private readonly glowTex: DynamicTexture
  private time = 0
  private stamp = 0

  constructor(private readonly scene: Scene) {
    this.ringMat = new StandardMaterial("mm-mob-portal", scene)
    this.ringMat.diffuseColor = new Color3(0.6, 0.2, 1)
    this.ringMat.emissiveColor = new Color3(0.72, 0.3, 1)
    this.ringMat.disableLighting = true
    this.glowTex = new DynamicTexture("mm-mob-portal-glow", { width: 128, height: 128 }, scene, false)
    const g = this.glowTex.getContext() as CanvasRenderingContext2D
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64)
    gr.addColorStop(0, "rgba(220,170,255,0.85)")
    gr.addColorStop(0.55, "rgba(150,60,255,0.45)")
    gr.addColorStop(1, "rgba(120,40,255,0)")
    g.fillStyle = gr
    g.fillRect(0, 0, 128, 128)
    this.glowTex.hasAlpha = true
    this.glowTex.update()
    this.glowMat = new StandardMaterial("mm-mob-portal-glow", scene)
    this.glowMat.diffuseTexture = this.glowTex
    this.glowMat.useAlphaFromDiffuseTexture = true
    this.glowMat.emissiveColor = new Color3(1, 1, 1)
    this.glowMat.disableLighting = true
  }

  /** Lista nova da sala: [id, tipo, x, z, rumo]. */
  set(list: unknown) {
    if (!Array.isArray(list)) return
    const stamp = ++this.stamp
    for (const row of list) {
      if (!Array.isArray(row) || row.length < 5) continue
      const [id, kind, x, z, f] = row as [number, string, number, number, number]
      if (!KINDS.has(kind as MobKindCity) || ![id, x, z, f].every(Number.isFinite)) continue
      let v = this.views.get(id)
      if (!v) {
        const model = new MonsterModel(this.scene, kind as MobKindCity, 1.15)
        const ring = CreateTorus(`mm-mob-ring-${id}`, { diameter: 3.2, thickness: 0.14, tessellation: 40 }, this.scene)
        ring.material = this.ringMat
        ring.isPickable = false
        const glow = CreateDisc(`mm-mob-glow-${id}`, { radius: 2.2, tessellation: 32 }, this.scene)
        glow.rotation.x = Math.PI / 2
        glow.material = this.glowMat
        glow.isPickable = false
        v = { id, kind: kind as MobKindCity, model, ring, glow, x, z, facing: f, tx: x, tz: z, tf: f, speed: 0, seen: stamp }
        this.views.set(id, v)
      }
      v.tx = x
      v.tz = z
      v.tf = f
      v.seen = stamp
    }
    for (const [id, v] of this.views) {
      if (v.seen === stamp) continue
      this.drop(v)
      this.views.delete(id)
    }
  }

  update(dt: number) {
    this.time += dt
    for (const v of this.views.values()) {
      const k = Math.min(1, dt * 4)
      const nx = v.x + (v.tx - v.x) * k
      const nz = v.z + (v.tz - v.z) * k
      v.speed += (Math.hypot(nx - v.x, nz - v.z) / Math.max(dt, 1e-3) - v.speed) * Math.min(1, dt * 6)
      v.x = nx
      v.z = nz
      v.facing += Math.atan2(Math.sin(v.tf - v.facing), Math.cos(v.tf - v.facing)) * k
      v.model.update(dt, { x: v.x, y: v.kind === "harpy" ? 0.6 + Math.sin(this.time * 2) * 0.2 : 0, z: v.z, facing: v.facing, state: "chase", t: this.time, warn: 0, speed: v.speed })
      v.ring.position.set(v.x, 0.12 + Math.sin(this.time * 3 + v.id) * 0.06, v.z)
      v.ring.rotation.y = this.time * 1.6
      const pulse = 1 + Math.sin(this.time * 4 + v.id) * 0.08
      v.ring.scaling.set(pulse, 1, pulse)
      v.glow.position.set(v.x, 0.04, v.z)
    }
  }

  /** "Lutar": um por monstro, na volta do portal. */
  interactables(): Interactable[] {
    const out: Interactable[] = []
    for (const v of this.views.values()) out.push({ kind: "monster", id: `mob-${v.id}`, x: v.x, z: v.z, radius: REACH, mobId: v.id, mobKind: v.kind })
    return out
  }

  /** Pausa o desenho (um minijogo cobre a tela). */
  setEnabled(on: boolean) {
    for (const v of this.views.values()) {
      v.model.setVisible(on)
      v.ring.setEnabled(on)
      v.glow.setEnabled(on)
    }
  }

  private drop(v: View) {
    v.model.dispose()
    v.ring.dispose()
    v.glow.dispose()
  }

  dispose() {
    for (const v of this.views.values()) this.drop(v)
    this.views.clear()
    this.ringMat.dispose()
    this.glowMat.dispose()
    this.glowTex.dispose()
  }
}
