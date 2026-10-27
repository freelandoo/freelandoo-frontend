// features/meu-mundo/paint/engine/boss-view.ts — PAINT (mm3d-38): o chefão.
//
// Gato-gorila de porcelana de 5 m (pipeline/build_boss_paint.py + build_boss_anim.py
// → boss-m38.glb, clipes Idle/Walk/Swipe/Slam/Roar/Die). Quem decide é a sim
// (`PaintMatch.boss`: posição, para onde olha, o ato e desde quando); aqui só
// desenha: a pose vai suavizada até o estado e o clipe do ato toca a partir
// de `time - at` — assim o golpe aparece no mesmo instante em que acerta.

import type { Scene } from "@babylonjs/core/scene"
import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader"
import { TransformNode } from "@babylonjs/core/Meshes/transformNode"
import type { AnimationGroup } from "@babylonjs/core/Animations/animationGroup"
import { ensureLoaders } from "../../engine/avatars"
import type { BossAct, BossState } from "../sim/match"
import { CAT_ASSETS } from "./cat-herd"

const BOSS_FILE = "boss-m38.glb"
const CLIP: Record<BossAct | "die", string> = {
  idle: "Idle",
  walk: "Walk",
  swipe: "Swipe",
  slam: "Slam",
  roar: "Roar",
  die: "Die",
}
const LOOP = new Set<string>(["Idle", "Walk"])
const FPS = 30

export class BossView {
  private readonly root: TransformNode
  private clips = new Map<string, AnimationGroup>()
  private playing: AnimationGroup | null = null
  private playingKey = ""
  private disposed = false
  private placed = false
  private dead = false
  /** Parado ↔ andando só troca depois de firmar (na distância de parada a sim alterna). */
  private loopAct: BossAct = "idle"
  private loopSince = 0
  private clock = 0

  constructor(private readonly scene: Scene, y: number) {
    ensureLoaders()
    this.root = new TransformNode("paint-boss", scene)
    this.root.position.y = y
    void this.load()
  }

  private async load() {
    try {
      const c = await LoadAssetContainerAsync(CAT_ASSETS + BOSS_FILE, this.scene)
      if (this.disposed) {
        c.dispose()
        return
      }
      c.addAllToScene()
      for (const n of c.rootNodes) n.parent = this.root
      for (const m of c.meshes) {
        m.isPickable = false
        m.alwaysSelectAsActiveMesh = true // o boss é grande e se mexe muito: sem recorte pela caixa de repouso
      }
      for (const g of c.animationGroups) {
        g.stop()
        this.clips.set(g.name, g)
      }
    } catch (err) {
      if (!this.disposed) console.warn("[paint] chefão não carregou", err)
    }
  }

  /** Some quando quem olha não está na ilha do chefão. */
  setVisible(on: boolean) {
    if (this.root.isEnabled() !== on) this.root.setEnabled(on)
  }

  /** Começa (ou continua) o clipe `name` no ponto `t` (s). */
  private play(name: string, key: string, t: number) {
    const g = this.clips.get(name)
    if (!g) return
    if (this.playingKey === key) return
    this.playing?.stop()
    const loop = LOOP.has(name)
    const len = (g.to - g.from) / FPS
    const at = loop ? t % len : Math.min(t, len)
    g.start(loop, 1, g.from, g.to, false)
    g.goToFrame(g.from + at * FPS)
    if (!loop) g.onAnimationGroupEndObservable.addOnce(() => g.goToFrame(g.to))
    this.playing = g
    this.playingKey = key
  }

  /** `time` = s de partida; `alive` = vida do chefão > 0. */
  tick(dt: number, b: BossState, time: number, alive: boolean) {
    const r = this.root
    if (!this.placed) {
      r.position.x = b.x
      r.position.z = b.z
      r.rotation.y = b.facing
      this.placed = true
    } else {
      const k = 1 - Math.exp(-dt * 10)
      r.position.x += (b.x - r.position.x) * k
      r.position.z += (b.z - r.position.z) * k
      let d = b.facing - r.rotation.y
      while (d > Math.PI) d -= Math.PI * 2
      while (d < -Math.PI) d += Math.PI * 2
      r.rotation.y += d * (1 - Math.exp(-dt * 12))
    }
    if (!alive) {
      if (!this.dead) {
        this.dead = true
        this.play(CLIP.die, "die", 0)
      }
      return
    }
    this.dead = false
    this.clock += dt
    if (b.act === "idle" || b.act === "walk") {
      if (b.act !== this.loopAct) {
        if (!this.loopSince) this.loopSince = this.clock
        if (this.clock - this.loopSince > 0.2 || !this.playingKey.startsWith("loop")) {
          this.loopAct = b.act
          this.loopSince = 0
        }
      } else this.loopSince = 0
      this.play(CLIP[this.loopAct], `loop:${this.loopAct}`, Math.max(0, time - b.at))
      return
    }
    this.play(CLIP[b.act], `${b.act}@${b.at.toFixed(3)}`, Math.max(0, time - b.at))
  }

  dispose() {
    this.disposed = true
    for (const g of this.clips.values()) g.dispose()
    this.clips.clear()
    this.root.dispose(false, true)
  }
}
