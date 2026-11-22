// features/meu-mundo/paint/engine/boss-view.ts — PAINT: o chefão é BASTOR.
//
// 22/11: o Guardião do Paint é Bastor, o Deus dos Animais (historia/v2/00-classificacao.md).
// Era o gato-gorila de porcelana do mm3d-38 (boss-m38.glb, clipes próprios); agora é o
// corpo novo do Bastor (Tripo do Alex, pipeline/npcs + build_deuses.py — 3,20 m, todas as
// animações do Sergio) escalado para os 10 m do chefão (TUNING.bossH), com a ESPADA na
// mão e os cortes dos Vampiros (anim-vampiro-sergio: nenhum conjunto de animação novo):
//   parado = VIdle (guarda de espada) · andar = o Walk de todos · patada = VSlash1 ·
//   pancada no chão = VGSlash (corte de cima, duas mãos) · rugido = VPower · morte = VDie.
// Quem decide continua sendo a sim (`PaintMatch.boss`: posição, para onde olha, o ato e
// desde quando); aqui só desenha. Cada golpe é esticado para a duração da sim com o
// instante do corte (a fase "strike" do monster-view) caindo no `hit` do TUNING — o golpe
// aparece no mesmo instante em que acerta.

import type { Scene } from "@babylonjs/core/scene"
import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode"
import type { AssetContainer } from "@babylonjs/core/assetContainer"
import { AvatarLibrary, ensureLoaders, type BoxeClip } from "../../engine/avatars"
import { Character } from "../../engine/player"
import { GRIP_BONES, WeaponGrip } from "../../engine/weapon-grip"
import { CLAN_WEAPON } from "../../classes"
import { BASTOR } from "../../gods"
import { bodyHeight } from "../../heights"
import type { BossAct, BossState } from "../sim/match"
import { TUNING } from "../sim/tuning"

/** Golpe: clipe dos Vampiros, trecho tocado e a fase do corte dentro do clipe (monster-view KNIGHT). */
interface Strike {
  clip: BoxeClip
  from: number
  contact: number
  dur: number
  hit: number
}
const STRIKE: Record<"swipe" | "slam" | "roar", Strike> = {
  swipe: { clip: "VSlash1", from: 0.1, contact: 0.44, dur: TUNING.bossSwipe.dur, hit: TUNING.bossSwipe.hit },
  slam: { clip: "VGSlash", from: 0.05, contact: 0.46, dur: TUNING.bossSlam.dur, hit: TUNING.bossSlam.hit },
  roar: { clip: "VPower", from: 0, contact: 0.5, dur: TUNING.bossRoar.dur, hit: TUNING.bossRoar.dur / 2 },
}
/** Até onde o clipe vai para o corte cair no `hit` (o resto da duração é a recuperação). */
const strikeTo = (s: Strike) => Math.min(1, s.from + ((s.contact - s.from) * s.dur) / s.hit)
/** Comprimento do GLB da espada (m) e a regra do Alex: 3 m na mão de um adulto de 2,70 m (laminas-game) — no Bastor de 10 m, ~11 m. */
const SWORD_GLB = 1.065
const SWORD_LEN = (3 * TUNING.bossH) / 2.7
const DIE_DUR = 2.2

export class BossView {
  private readonly lib: AvatarLibrary
  private readonly char: Character
  private readonly mats: { fallback: StandardMaterial; shadow: StandardMaterial }
  private readonly k = TUNING.bossH / bodyHeight(BASTOR)
  private sword: AssetContainer | null = null
  private swordRoot: TransformNode | null = null
  private grip: WeaponGrip | null = null
  private disposed = false
  private placed = false
  private dead = false
  private shown = true
  /** Ato em cena (`ato@at`) — um golpe novo só começa quando a sim troca. */
  private actKey = ""
  /** Parado ↔ andando só troca depois de firmar (na distância de parada a sim alterna). */
  private loopAct: BossAct = "idle"
  private loopSince = 0
  private clock = 0
  private x = 0
  private z = 0
  private facing = 0

  constructor(
    private readonly scene: Scene,
    private readonly y: number,
  ) {
    ensureLoaders()
    // biblioteca própria: os cortes da classe (Vampiro) para um corpo que não é de classe
    this.lib = new AvatarLibrary(scene, false, false, 1e6, false, false, true, false, true, "vampiro")
    const fallback = new StandardMaterial("paint-boss-fallback", scene)
    fallback.diffuseColor = new Color3(0.75, 0.2, 0.2)
    const shadow = new StandardMaterial("paint-boss-shadow", scene)
    shadow.diffuseColor = new Color3(0, 0, 0)
    shadow.specularColor = new Color3(0, 0, 0)
    shadow.disableLighting = true
    shadow.alpha = 0.22
    this.mats = { fallback, shadow }
    this.char = new Character(scene, this.lib, this.mats, BASTOR, null, false, "")
    this.char.setHeight(TUNING.bossH)
    this.char.setBoxe("VIdle")
    void this.loadSword()
  }

  private async loadSword() {
    try {
      const c = await LoadAssetContainerAsync(CLAN_WEAPON.vampiro, this.scene)
      if (this.disposed) {
        c.dispose()
        return
      }
      c.addAllToScene()
      for (const m of c.meshes) {
        m.isPickable = false
        m.alwaysSelectAsActiveMesh = true
      }
      this.sword = c
      this.swordRoot = (c.rootNodes[0] as TransformNode) ?? null
    } catch (err) {
      if (!this.disposed) console.warn("[paint] espada do Bastor não carregou", err)
    }
  }

  /** Espada na mão quando os ossos existirem (o corpo chega depois); o corpo grande não é recortado. */
  private settle() {
    if (this.grip || !this.swordRoot || !this.char.loaded) return
    const hand = this.char.bone(GRIP_BONES.hand)
    const index = this.char.bone(GRIP_BONES.index)
    const thumb = this.char.bone(GRIP_BONES.thumb)
    if (!hand || !index || !thumb) return
    this.grip = new WeaponGrip(this.scene, { hand, index, thumb }, this.swordRoot, "paint-boss-sword")
    this.grip.root.scaling.setAll(SWORD_LEN / SWORD_GLB)
    this.grip.root.setEnabled(this.shown)
    for (const m of this.char.bodyMeshes) m.alwaysSelectAsActiveMesh = true // se mexe muito: sem recorte pela caixa de repouso
  }

  /** Some quando quem olha não está na ilha do chefão. */
  setVisible(on: boolean) {
    if (this.shown === on) return
    this.shown = on
    this.char.setVisible(on)
    this.grip?.root.setEnabled(on)
  }

  /** Golpe (ou rugido) da sim que começou há `e` s: o trecho que falta, no ritmo certo. */
  private strike(s: Strike, e: number) {
    const to = strikeTo(s)
    const left = s.dur - e
    if (left <= 0.05) return
    const from = s.from + (to - s.from) * Math.min(1, e / s.dur)
    this.char.boxeAct(s.clip, left, from, to)
  }

  /** `time` = s de partida; `alive` = vida do chefão > 0. */
  tick(dt: number, b: BossState, time: number, alive: boolean) {
    this.settle()
    if (!this.placed) {
      this.x = b.x
      this.z = b.z
      this.facing = b.facing
      this.placed = true
    } else {
      const k = 1 - Math.exp(-dt * 10)
      this.x += (b.x - this.x) * k
      this.z += (b.z - this.z) * k
      let d = b.facing - this.facing
      while (d > Math.PI) d -= Math.PI * 2
      while (d < -Math.PI) d += Math.PI * 2
      this.facing += d * (1 - Math.exp(-dt * 12))
    }
    this.char.place(this.x, this.z, this.facing, this.y)
    if (!alive) {
      if (!this.dead) {
        this.dead = true
        this.actKey = "die"
        this.char.setBoxe(null)
        this.char.boxeAct("VDie", DIE_DUR, 0, 1, true)
      }
      this.char.animate(dt, 0, 0)
      return
    }
    if (this.dead) {
      this.dead = false
      this.char.boxeClear()
      this.actKey = ""
    }
    this.clock += dt
    if (b.act === "idle" || b.act === "walk") {
      if (b.act !== this.loopAct) {
        if (!this.loopSince) this.loopSince = this.clock
        if (this.clock - this.loopSince > 0.2 || this.actKey !== "loop") {
          this.loopAct = b.act
          this.loopSince = 0
        }
      } else this.loopSince = 0
      this.actKey = "loop"
      const walking = this.loopAct === "walk"
      this.char.setBoxe(walking ? null : "VIdle")
      // a passada no tamanho do Bastor de 10 m (a velocidade do clipe vem do corpo de 3,20 m)
      this.char.animate(dt, walking ? 1 : 0, walking ? TUNING.bossWalk / this.k : 0)
      return
    }
    const key = `${b.act}@${b.at.toFixed(3)}`
    if (key !== this.actKey) {
      this.actKey = key
      this.char.setBoxe("VIdle")
      this.strike(STRIKE[b.act], Math.max(0, time - b.at))
    }
    this.char.animate(dt, 0, 0)
  }

  /**
   * Rastro do golpe (mm3d-62, a fita de luz): `side` 1 = a ESPADA (punho → ponta),
   * 0 = o punho esquerdo (pulso → um pouco além da mão). null = carregando ou escondido.
   */
  claw(side: number): [Vector3, Vector3] | null {
    if (!this.shown || !this.char.loaded) return null
    if (side === 1 && this.grip) {
      const r = this.grip.root
      const base = r.getAbsolutePosition().clone()
      const up = Vector3.TransformNormal(Vector3.Up(), r.getWorldMatrix()).normalize()
      return [base, base.add(up.scale(SWORD_LEN))]
    }
    const f = this.char.bonePosition("mixamorig:LeftForeArm")
    const h = this.char.bonePosition("mixamorig:LeftHand")
    if (!f || !h) return null
    return [h, h.add(h.subtract(f).scale(0.9))]
  }

  dispose() {
    this.disposed = true
    this.grip?.dispose()
    this.sword?.dispose()
    this.char.dispose()
    this.lib.dispose()
    this.mats.fallback.dispose()
    this.mats.shadow.dispose()
  }
}
