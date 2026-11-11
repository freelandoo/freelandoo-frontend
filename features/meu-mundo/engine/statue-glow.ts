// features/meu-mundo/engine/statue-glow.ts — lore v2 N3: a estátua ENCHENDO (provisório).
//
// As peças "Aurion e Morkhan por estágio" (rachaduras, pedaços soltos, olhos
// acesos) são do Alex e ainda não existem. Até lá, SEM mexer no modelo: um anel
// de luz no tampo do pedestal e uma coluna translúcida que sobe com o néctar
// entregue no domingo (fração da meta), na cor do deus (Aurion dourado, Morkhan
// violeta). Estágio 0 = apagado (nenhuma malha desenhada); 4 = cheia, a coluna
// cobre a estátua e pulsa. Quem diz o estágio é o servidor (corrida de
// MeuMundoStatueService), pela tela e pela mensagem "statue" da sala.

import type { Scene } from "@babylonjs/core/scene"
import type { Observer } from "@babylonjs/core/Misc/observable"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder"
import { CreateTorus } from "@babylonjs/core/Meshes/Builders/torusBuilder"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import type { StatueDef } from "../types"

export type StatueGod = "aurion" | "morkhan"
export const isStatueGod = (id: string): id is StatueGod => id === "aurion" || id === "morkhan"

const TINT: Record<StatueGod, Color3> = {
  aurion: new Color3(1, 0.76, 0.28),
  morkhan: new Color3(0.62, 0.32, 1),
}
/** Opacidade do anel e da coluna por estágio (0 = apagado). */
const RING_ALPHA = [0, 0.35, 0.5, 0.65, 0.85]
const BEAM_ALPHA = [0, 0.08, 0.11, 0.14, 0.18]

interface One {
  def: StatueDef
  ring: Mesh
  beam: Mesh
  ringMat: StandardMaterial
  beamMat: StandardMaterial
  stage: number
  fill: number
}

export class StatueGlow {
  private list: One[] = []
  private obs: Observer<Scene> | null = null
  private t = 0

  constructor(private scene: Scene, statues: StatueDef[]) {
    for (const def of statues) {
      if (!isStatueGod(def.id)) continue
      const tint = TINT[def.id]
      const r = def.base.r
      const ringMat = new StandardMaterial(`mm-statue-ring-${def.id}`, scene)
      ringMat.disableLighting = true
      ringMat.emissiveColor = tint
      ringMat.diffuseColor = Color3.Black()
      ringMat.specularColor = Color3.Black()
      const beamMat = ringMat.clone(`mm-statue-beam-${def.id}`)
      beamMat.backFaceCulling = false
      const ring = CreateTorus(`mm-statue-ring-${def.id}`, { diameter: 2 * r * 0.9, thickness: 0.16, tessellation: 40 }, scene)
      ring.position.set(def.x, def.base.h + 0.06, def.z)
      ring.material = ringMat
      // coluna de altura 1, escalada pela fração (a base fica no tampo do pedestal)
      const beam = CreateCylinder(`mm-statue-beam-${def.id}`, { height: 1, diameter: 2 * r * 0.78, tessellation: 24, cap: 0 }, scene)
      beam.material = beamMat
      beam.position.set(def.x, def.base.h, def.z)
      for (const m of [ring, beam]) {
        m.isPickable = false
        m.doNotSyncBoundingInfo = true
        m.setEnabled(false)
      }
      this.list.push({ def, ring, beam, ringMat, beamMat, stage: 0, fill: 0 })
    }
  }

  /** O servidor mandou o estado da corrida: `fill` = entregue / meta (0–1+), `stage` 0–4. */
  set(god: StatueGod, stage: number, fill: number) {
    for (const o of this.list) {
      if (o.def.id !== god) continue
      o.stage = Math.max(0, Math.min(4, Math.floor(stage) || 0))
      o.fill = Math.max(0, Math.min(1, Number(fill) || 0))
      const on = o.stage > 0 || o.fill > 0
      o.ring.setEnabled(on)
      o.beam.setEnabled(on)
      const h = Math.max(0.3, (o.def.height + 0.6) * Math.max(o.fill, 0.04))
      o.beam.scaling.y = h
      o.beam.position.y = o.def.base.h + h / 2
      o.ringMat.alpha = RING_ALPHA[o.stage] || 0.25
      o.beamMat.alpha = BEAM_ALPHA[o.stage] || 0.06
    }
    this.syncLoop()
  }

  /** Só a estátua cheia pulsa; o laço só existe enquanto alguma estiver cheia. */
  private syncLoop() {
    const full = this.list.some((o) => o.stage >= 4)
    if (full && !this.obs) {
      this.obs = this.scene.onBeforeRenderObservable.add(() => {
        this.t += this.scene.getEngine().getDeltaTime() / 1000
        const k = 0.75 + 0.25 * Math.sin(this.t * 2.4)
        for (const o of this.list) {
          if (o.stage < 4) continue
          o.ringMat.alpha = RING_ALPHA[4] * k
          o.beamMat.alpha = BEAM_ALPHA[4] * (0.7 + 0.3 * k)
        }
      })
    } else if (!full && this.obs) {
      this.scene.onBeforeRenderObservable.remove(this.obs)
      this.obs = null
    }
  }

  dispose() {
    if (this.obs) this.scene.onBeforeRenderObservable.remove(this.obs)
    this.obs = null
    for (const o of this.list) {
      o.ring.dispose()
      o.beam.dispose()
      o.ringMat.dispose()
      o.beamMat.dispose()
    }
    this.list = []
  }
}
