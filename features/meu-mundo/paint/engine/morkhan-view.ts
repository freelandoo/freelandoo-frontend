// features/meu-mundo/paint/engine/morkhan-view.ts — PAINT, B11: o MORKHAN.
//
// Só desenho: a regra (sim/morkhan.ts, rodada pela sala ou pelo treino) diz
// onde ele está e o que faz; aqui o deus de 3,2 m (a skin "morkhan", com as
// animações de todo personagem) corre, salta, golpeia e surge/some num
// estouro de luz roxa. Na rede o estado chega a 20 Hz: a posição é suavizada
// (e salta direto quando muda muito, como no nascimento).

import type { Scene } from "@babylonjs/core/scene"
import type { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import { Character } from "../../engine/player"
import type { AvatarLibrary } from "../../engine/avatars"
import type { Vfx, VfxColor } from "../../engine/vfx"
import { supportAt } from "../sim/collide"
import { TUNING } from "../sim/tuning"
import type { Solid } from "../sim/map"
import type { MorkhanAct, MorkhanState } from "../sim/morkhan"

/** Roxo do Morkhan (a cor da skin dele). */
export const MORKHAN_FX: VfxColor = { main: Color3.FromHexString("#8a3bff"), edge: Color3.FromHexString("#e2cfff") }

interface Shown {
  char: Character
  x: number
  y: number
  z: number
  f: number
  act: MorkhanAct
  on: boolean
}

export class MorkhanView {
  private readonly shown: (Shown | null)[] = [null, null]

  constructor(
    private readonly scene: Scene,
    private readonly lib: AvatarLibrary,
    private readonly mats: { fallback: StandardMaterial; shadow: StandardMaterial },
    private readonly vfx: Vfx,
    private readonly name: string,
  ) {}

  /** `hidden` = eu estou na ilha do Guardião (ele é da arena). */
  tick(dt: number, list: readonly MorkhanState[], time: number, solids: readonly Solid[], hidden: boolean) {
    const M = TUNING.morkhan
    for (const mk of list) {
      const on = mk.act !== "gone" && mk.target >= 0
      let s = this.shown[mk.team]
      if (!on) {
        if (s?.on) {
          this.vfx.burst(new Vector3(s.x, s.y + 1.6, s.z), MORKHAN_FX)
          s.on = false
          s.char.holder.setEnabled(false)
        }
        continue
      }
      if (!s) {
        s = { char: new Character(this.scene, this.lib, this.mats, "morkhan", this.name, false), x: mk.x, y: mk.y, z: mk.z, f: mk.facing, act: "gone", on: false }
        this.shown[mk.team] = s
      }
      const far = Math.hypot(mk.x - s.x, mk.z - s.z, mk.y - s.y) > 9
      if (!s.on || far) {
        // surgiu (ou a rede saltou): no lugar, num estouro de luz e um círculo no chão
        s.x = mk.x
        s.y = mk.y
        s.z = mk.z
        s.f = mk.facing
        if (!s.on && !hidden) {
          this.vfx.burst(new Vector3(mk.x, mk.y + 1.6, mk.z), MORKHAN_FX)
          this.vfx.ground(new Vector3(mk.x, mk.y + 0.05, mk.z), MORKHAN_FX, 2.4, M.rise, true)
        }
        s.on = true
      } else {
        const k = 1 - Math.exp(-14 * dt)
        s.x += (mk.x - s.x) * k
        s.y += (mk.y - s.y) * k
        s.z += (mk.z - s.z) * k
        let d = mk.facing - s.f
        d = Math.atan2(Math.sin(d), Math.cos(d))
        s.f += d * (1 - Math.exp(-10 * dt))
      }
      const c = s.char
      c.holder.setEnabled(!hidden)
      if (hidden) {
        s.act = mk.act
        continue
      }
      if (mk.act !== s.act) {
        if (mk.act === "strike") c.punch()
        else if (mk.act === "leap") c.jump(0)
        s.act = mk.act
      }
      const air = mk.act === "leap"
      c.setAir(air)
      if (air) c.setAirPhase(Math.min(1, Math.max(0, (time - mk.at) / 0.9)))
      const ground = supportAt(solids, s.x, s.z, s.y + 0.1)
      c.place(s.x, s.z, s.f, s.y, Number.isFinite(ground) ? ground : s.y)
      const speed = mk.act === "dash" ? M.speed * M.dashK : mk.act === "run" ? M.speed : 0
      c.animate(dt, speed > 0 ? 2 : 0, speed)
    }
  }

  /** Onde ele está na tela (para o efeito do golpe). */
  at(team: number) {
    const s = this.shown[team]
    return s?.on ? { x: s.x, y: s.y, z: s.z } : null
  }

  dispose() {
    for (const s of this.shown) s?.char.dispose()
  }
}
