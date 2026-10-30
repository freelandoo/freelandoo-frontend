// features/meu-mundo/engine/steampunk/fx.ts
//
// O que MEXE no bairro steampunk (mm3d-51), tudo num lugar e num relógio só:
//
//  - Engrenagens que giram: UMA malha de engrenagem (raio 1, espessura 1) com
//    uma thin instance por engrenagem do bairro (praça, caldeiras, empenas,
//    rotores). Uma chamada de desenho para todas. A cada quadro (até 30 Hz)
//    só as matrizes das que estão perto da câmera são reescritas.
//  - Vapor: UM sistema de partículas para o bairro inteiro. Cada partícula
//    nasce numa saída de vapor sorteada entre as que estão perto da câmera
//    (lista refeita a cada meio segundo) — chaminé longe não gasta nada.
//
// Perfil leve: nada gira e não há vapor (o bairro continua inteiro, só
// parado). Médio e alto mudam a quantidade de vapor e o alcance.
//
// As casas trocam de nível: cada lote registra as próprias peças (setLot) e a
// lista é refeita só quando muda. dispose() solta malha, partículas, textura
// e o observador do quadro — entrar e sair do bairro não deixa nada para trás.

import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector"
import { Color4 } from "@babylonjs/core/Maths/math.color"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { ParticleSystem } from "@babylonjs/core/Particles/particleSystem"
import { CustomParticleEmitter } from "@babylonjs/core/Particles/EmitterTypes/customParticleEmitter"
import "@babylonjs/core/Meshes/thinInstanceMesh"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import type { Observer } from "@babylonjs/core/Misc/observable"
import type { Scene } from "@babylonjs/core/scene"
import type { QualityTier } from "../quality"
import type { SteamMaterials } from "./materials"
import { SteamGeo, type V3 } from "./geo"
import { SP } from "./palette"
import type { GearSpec } from "./kit"
import type { HouseFx } from "./house01"

const STEAM: Record<QualityTier, { cap: number; rate: number; range: number; gearRange: number } | null> = {
  low: null,
  mid: { cap: 140, rate: 34, range: 55, gearRange: 45 },
  high: { cap: 320, rate: 80, range: 85, gearRange: 80 },
}

export class SteamFx {
  private readonly gearMesh: Mesh
  private staticGears: GearSpec[] = []
  private staticVents: V3[] = []
  private readonly lots = new Map<number, HouseFx>()
  private gears: GearSpec[] = []
  private vents: V3[] = []
  private near: V3[] = []
  private buf = new Float32Array(16)
  private dirty = true
  private time = 0
  private night = 0
  private sinceGear = 0
  private sinceNear = 1
  private tier: QualityTier
  private steam: ParticleSystem | null = null
  private steamTex: DynamicTexture | null = null
  private readonly obs: Observer<Scene>
  private readonly tmp = new Matrix()
  private readonly out = new Matrix()
  private readonly rot = new Matrix()
  private readonly scl = new Matrix()

  constructor(
    private readonly scene: Scene,
    mats: SteamMaterials,
    tier: QualityTier,
  ) {
    this.tier = tier
    const g = new SteamGeo()
    g.gearInto(g, 1, 1, 12, Matrix.Identity(), SP.brass, SP.bronze)
    this.gearMesh = g.build("sp-gears", scene, mats.trim, false)
    this.gearMesh.alwaysSelectAsActiveMesh = true
    this.obs = scene.onBeforeRenderObservable.add(() => this.frame())
    this.setTier(tier)
  }

  /** Peças fixas do bairro (praça, caldeiras, portão). */
  setStatic(gears: GearSpec[], vents: V3[]) {
    this.staticGears = gears
    this.staticVents = vents
    this.dirty = true
  }

  /** Peças da casa de um lote (null = nenhuma; a casa trocou de nível). */
  setLot(lot: number, fx: HouseFx | null) {
    if (fx) this.lots.set(lot, fx)
    else this.lots.delete(lot)
    this.dirty = true
  }

  setTier(tier: QualityTier) {
    this.tier = tier
    const cfg = STEAM[tier]
    if (!cfg) {
      this.steam?.dispose()
      this.steam = null
      this.steamTex = null
      return
    }
    if (this.steam) {
      this.steam.dispose()
      this.steam = null
    }
    this.steam = this.makeSteam(cfg.cap, cfg.rate)
    this.setNight(this.night)
    this.sinceNear = 1
  }

  private makeSteam(cap: number, rate: number) {
    const tex = new DynamicTexture("sp-steam-tex", { width: 64, height: 64 }, this.scene, true)
    const c = tex.getContext() as unknown as CanvasRenderingContext2D
    const grd = c.createRadialGradient(32, 32, 0, 32, 32, 32)
    grd.addColorStop(0, "rgba(255,255,255,0.9)")
    grd.addColorStop(0.45, "rgba(255,255,255,0.45)")
    grd.addColorStop(1, "rgba(255,255,255,0)")
    c.fillStyle = grd
    c.fillRect(0, 0, 64, 64)
    tex.hasAlpha = true
    tex.update(false)
    this.steamTex = tex
    const ps = new ParticleSystem("sp-steam", cap, this.scene)
    ps.particleTexture = tex
    ps.emitter = new Vector3(0, 0, 0)
    const em = new CustomParticleEmitter()
    em.particlePositionGenerator = (_i, _p, out) => {
      const v = this.near[(Math.random() * this.near.length) | 0]
      if (v) out.set(v[0] + (Math.random() - 0.5) * 0.15, v[1], v[2] + (Math.random() - 0.5) * 0.15)
      else out.set(0, -50, 0)
    }
    em.particleDirectionGenerator = (_i, _p, out) => {
      out.set(0.25 + (Math.random() - 0.5) * 0.3, 0.75 + Math.random() * 0.45, 0.1 + (Math.random() - 0.5) * 0.3)
    }
    ps.particleEmitterType = em
    ps.minEmitPower = 1
    ps.maxEmitPower = 1
    ps.minLifeTime = 2.2
    ps.maxLifeTime = 3.6
    ps.emitRate = rate
    ps.minSize = 0.35
    ps.maxSize = 0.6
    ps.addSizeGradient(0, 0.4)
    ps.addSizeGradient(1, 2.1)
    ps.addColorGradient(0, new Color4(0.96, 0.94, 0.9, 0))
    ps.addColorGradient(0.12, new Color4(0.95, 0.93, 0.88, 0.42))
    ps.addColorGradient(1, new Color4(0.9, 0.88, 0.84, 0))
    ps.minAngularSpeed = -0.4
    ps.maxAngularSpeed = 0.4
    ps.gravity = new Vector3(0.12, 0.1, 0)
    ps.blendMode = ParticleSystem.BLENDMODE_STANDARD
    // Passo fixo (o jeito que funciona nas outras cenas do jogo).
    ps.updateSpeed = 1 / 60
    ps.start()
    return ps
  }

  private rebuild() {
    this.dirty = false
    this.gears = [...this.staticGears]
    this.vents = [...this.staticVents]
    for (const fx of this.lots.values()) {
      this.gears.push(...fx.gears)
      this.vents.push(...fx.vents)
    }
    const n = this.gears.length
    this.buf = new Float32Array(Math.max(1, n) * 16)
    for (let i = 0; i < n; i++) this.write(i, 0)
    this.gearMesh.thinInstanceSetBuffer("matrix", this.buf, 16, false)
    this.gearMesh.thinInstanceCount = n
    this.gearMesh.setEnabled(n > 0)
    this.sinceNear = 1
  }

  private write(i: number, t: number) {
    const gr = this.gears[i]
    Matrix.ScalingToRef(gr.r, gr.thick, gr.r, this.scl)
    Matrix.RotationYToRef(t * gr.speed, this.rot)
    this.scl.multiplyToRef(this.rot, this.tmp)
    this.tmp.multiplyToRef(gr.m, this.out)
    this.out.copyToArray(this.buf, i * 16)
  }

  private frame() {
    if (this.dirty) this.rebuild()
    const cfg = STEAM[this.tier]
    const dt = Math.min(this.scene.getEngine().getDeltaTime() / 1000, 0.1)
    this.time += dt
    const cam = this.scene.activeCamera?.globalPosition
    if (!cfg || !cam) return
    this.sinceNear += dt
    if (this.sinceNear >= 0.5) {
      this.sinceNear = 0
      const r2 = cfg.range * cfg.range
      this.near = this.vents.filter((v) => (v[0] - cam.x) ** 2 + (v[2] - cam.z) ** 2 < r2)
      if (this.steam) this.steam.emitRate = this.near.length ? Math.min(cfg.rate, 6 + this.near.length * 3) : 0
    }
    this.sinceGear += dt
    if (this.sinceGear < 1 / 30 || !this.gears.length) return
    this.sinceGear = 0
    const g2 = cfg.gearRange * cfg.gearRange
    let any = false
    for (let i = 0; i < this.gears.length; i++) {
      const a = this.gears[i].m.asArray()
      if ((a[12] - cam.x) ** 2 + (a[14] - cam.z) ** 2 > g2) continue
      this.write(i, this.time)
      any = true
    }
    if (any) this.gearMesh.thinInstanceBufferUpdated("matrix")
  }

  /** Vapor mais escuro de noite (partícula não recebe luz). */
  setNight(n: number) {
    this.night = n
    const ps = this.steam
    if (!ps) return
    const k = 1 - 0.55 * n
    ps.removeColorGradient(0)
    ps.removeColorGradient(0.12)
    ps.removeColorGradient(1)
    ps.addColorGradient(0, new Color4(0.96 * k, 0.94 * k, 0.9 * k, 0))
    ps.addColorGradient(0.12, new Color4(0.95 * k, 0.93 * k, 0.9 * k, 0.42 - 0.12 * n))
    ps.addColorGradient(1, new Color4(0.9 * k, 0.88 * k, 0.86 * k, 0))
  }

  /** Painel técnico / harness. */
  get stats() {
    return { gears: this.gears.length, vents: this.vents.length, near: this.near.length, steam: this.steam?.getActiveCount() ?? 0 }
  }

  dispose() {
    this.scene.onBeforeRenderObservable.remove(this.obs)
    this.steam?.dispose()
    this.steam = null
    this.steamTex = null
    this.gearMesh.dispose()
    this.lots.clear()
  }
}
