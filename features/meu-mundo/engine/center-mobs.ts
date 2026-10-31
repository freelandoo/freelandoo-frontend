// features/meu-mundo/engine/center-mobs.ts — monstros das invasões na rua (mm3d-48b).
//
// A sala (centro ou bairro) manda a lista inteira ("mobs": [id, tipo, x, z,
// rumo]) a cada 0,5 s enquanto houver monstro; aqui cada um vira o boneco da
// Arena das Lâminas (laminas/engine/monster-view.ts) e anda suave entre as
// posições. mm3d-57b: SEM portal aos pés (pedido do Alex) — o monstro anda
// solto, de noite, e quem ele encara é perseguido (a sala decide e manda
// "mcatch"); embaixo dele, só uma LUZ roxa no chão. Chegar perto ainda dá "Lutar" (Interactable "monster"); quem
// decide se o monstro sai é a sala.

import type { Scene } from "@babylonjs/core/scene"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
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
  private time = 0
  private stamp = 0
  private readonly glowMat: StandardMaterial
  private readonly glowTex: DynamicTexture

  constructor(private readonly scene: Scene) {
    // Luz roxa no chão: degradê redondo que some na borda (sem anel, sem peça).
    this.glowTex = new DynamicTexture("mm-mob-glow", { width: 128, height: 128 }, scene, false)
    const g = this.glowTex.getContext() as CanvasRenderingContext2D
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64)
    gr.addColorStop(0, "rgba(200,130,255,0.75)")
    gr.addColorStop(0.5, "rgba(150,60,255,0.4)")
    gr.addColorStop(1, "rgba(120,40,255,0)")
    g.fillStyle = gr
    g.fillRect(0, 0, 128, 128)
    this.glowTex.hasAlpha = true
    this.glowTex.update()
    this.glowMat = new StandardMaterial("mm-mob-glow", scene)
    this.glowMat.diffuseTexture = this.glowTex
    this.glowMat.useAlphaFromDiffuseTexture = true
    this.glowMat.emissiveColor = new Color3(1, 1, 1)
    this.glowMat.disableLighting = true
    this.glowMat.disableDepthWrite = true
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
        const glow = CreateDisc(`mm-mob-glow-${id}`, { radius: 2.4, tessellation: 32 }, this.scene)
        glow.rotation.x = Math.PI / 2
        glow.material = this.glowMat
        glow.isPickable = false
        v = { id, kind: kind as MobKindCity, model, glow, x, z, facing: f, tx: x, tz: z, tf: f, speed: 0, seen: stamp }
        this.views.set(id, v)
      }
      v.tx = x
      v.tz = z
      v.tf = f
      v.seen = stamp
    }
    for (const [id, v] of this.views) {
      if (v.seen === stamp) continue
      v.model.dispose()
      v.glow.dispose()
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
      v.model.update(dt, { x: v.x, y: 0, z: v.z, facing: v.facing, state: "chase", t: this.time, warn: 0, speed: v.speed, calm: true })
      v.glow.position.set(v.x, 0.05, v.z)
      const pulse = 1 + Math.sin(this.time * 2.5 + v.id) * 0.07
      v.glow.scaling.set(pulse, pulse, 1)
    }
  }

  /** "Lutar": um por monstro. */
  interactables(): Interactable[] {
    const out: Interactable[] = []
    for (const v of this.views.values()) out.push({ kind: "monster", id: `mob-${v.id}`, x: v.x, z: v.z, radius: REACH, mobId: v.id, mobKind: v.kind })
    return out
  }

  /** Pausa o desenho (um minijogo cobre a tela). */
  setEnabled(on: boolean) {
    for (const v of this.views.values()) {
      v.model.setVisible(on)
      v.glow.setEnabled(on)
    }
  }

  dispose() {
    for (const v of this.views.values()) {
      v.model.dispose()
      v.glow.dispose()
    }
    this.views.clear()
    this.glowMat.dispose()
    this.glowTex.dispose()
  }
}
