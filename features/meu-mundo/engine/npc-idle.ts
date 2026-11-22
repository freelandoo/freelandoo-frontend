// features/meu-mundo/engine/npc-idle.ts — 22/11: os NPCs respiram e olham para quem chega.
//
// Os NPCs só ficam parados esperando conversa: em cima do Idle (pose A do Sergio,
// que todo corpo da receita dos deuses usa), depois das animações, o peito sobe e
// desce (Spine1/Spine2), o corpo balança de leve (Spine) e a cabeça acompanha —
// nada de clipe novo, nada de andar. Cada NPC tem a sua fase (não respiram em coro).
// Quem chega perto (RANGE) faz o NPC virar devagar para ele; longe, volta à frente
// de sempre.

import type { Observer } from "@babylonjs/core/Misc/observable"
import type { Scene } from "@babylonjs/core/scene"
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector"
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode"
import type { Character } from "./player"

/** Uma respiração a cada ~4 s (parado, calmo). */
const BREATH_HZ = 0.25
/** Ângulos (rad): peito, balanço do tronco, cabeça. */
const CHEST = 0.035
const SWAY = 0.018
const HEAD = 0.025
/** Vira para quem está a menos disto (m), até MAX_TURN do rosto de sempre. */
const RANGE = 4.5
const MAX_TURN = 1.4
/** Rapidez da virada (1/s). */
const TURN_RATE = 3

const AX_X = new Vector3(1, 0, 0)
const AX_Z = new Vector3(0, 0, 1)
const _q = new Quaternion()

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

export class NpcIdle {
  private obs: Observer<Scene> | null
  private t: number
  private bones: { chest: TransformNode | null; chest2: TransformNode | null; spine: TransformNode | null; head: TransformNode | null } | null = null
  private turn = 0

  constructor(
    private readonly scene: Scene,
    private readonly char: Character,
    private readonly facing: number,
    seed: number,
  ) {
    this.t = (seed * 2.399) % (1 / BREATH_HZ)
    this.obs = scene.onAfterAnimationsObservable.add(() => this.apply())
  }

  /** Por quadro: o relógio da respiração e a virada para (x, z) — null = ninguém perto. */
  update(dt: number, target: { x: number; z: number } | null) {
    this.t += dt
    const p = this.char.holder.position
    let want = 0
    if (target) {
      const dx = target.x - p.x
      const dz = target.z - p.z
      if (dx * dx + dz * dz < RANGE * RANGE) want = Math.max(-MAX_TURN, Math.min(MAX_TURN, wrap(Math.atan2(dx, dz) - this.facing)))
    }
    this.turn += (want - this.turn) * Math.min(1, dt * TURN_RATE)
    this.char.holder.rotation.y = this.facing + this.turn
  }

  private apply() {
    if (!this.char.loaded) return
    if (!this.bones) {
      const b = (n: string) => this.char.bone(`mixamorig:${n}`)
      this.bones = { chest: b("Spine1"), chest2: b("Spine2"), spine: b("Spine"), head: b("Head") }
    }
    const w = Math.PI * 2 * BREATH_HZ
    const br = Math.sin(this.t * w)
    const sway = Math.sin(this.t * w * 0.5 + 0.7)
    const { chest, chest2, spine, head } = this.bones
    // peito: inclina para trás ao encher (o tronco "abre"); a cabeça compensa
    this.add(chest, AX_X, -CHEST * 0.5 * br)
    this.add(chest2, AX_X, -CHEST * 0.5 * br)
    this.add(spine, AX_Z, SWAY * sway)
    this.add(head, AX_X, CHEST * 0.6 * br + HEAD * Math.sin(this.t * w * 0.37))
    this.add(head, AX_Z, -SWAY * 0.8 * sway)
  }

  private add(n: TransformNode | null, ax: Vector3, a: number) {
    if (!n?.rotationQuaternion) return
    Quaternion.RotationAxisToRef(ax, a, _q)
    n.rotationQuaternion.multiplyInPlace(_q)
  }

  dispose() {
    if (this.obs) this.scene.onAfterAnimationsObservable.remove(this.obs)
    this.obs = null
  }
}
