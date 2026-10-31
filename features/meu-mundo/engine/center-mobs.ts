// features/meu-mundo/engine/center-mobs.ts — monstros das invasões na rua (mm3d-48b).
//
// A sala (centro ou bairro) manda a lista inteira ("mobs": [id, tipo, x, z,
// rumo]) a cada 0,5 s enquanto houver monstro; aqui cada um vira o boneco da
// Arena das Lâminas (laminas/engine/monster-view.ts) e anda suave entre as
// posições. mm3d-57b: SEM portal aos pés (pedido do Alex) — o monstro anda
// solto, de noite, e quem ele encara é perseguido (a sala decide e manda
// "mcatch"). Chegar perto ainda dá "Lutar" (Interactable "monster"); quem
// decide se o monstro sai é a sala.

import type { Scene } from "@babylonjs/core/scene"
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

  constructor(private readonly scene: Scene) {}

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
        v = { id, kind: kind as MobKindCity, model, x, z, facing: f, tx: x, tz: z, tf: f, speed: 0, seen: stamp }
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
    for (const v of this.views.values()) v.model.setVisible(on)
  }

  dispose() {
    for (const v of this.views.values()) v.model.dispose()
    this.views.clear()
  }
}
