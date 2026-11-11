// features/meu-mundo/engine/god-view.ts — lore v2 N4: o DEUS SOLTO na cena.
//
// O deus que encheu a estátua anda pela rua (a sala manda "gods") e pelos Domínios
// (a cena é do aparelho: domain-game.ts persegue sozinho). Aqui só o desenho: o
// corpo do deus (Aurion/Morkhan, 3,20 m) com os golpes do tipo da regra (GOD_KINDS:
// espada e escudo do Cavaleiro / a força do Brutamontes), uma luz no chão na cor
// dele e o nome em cima, sempre virado para a câmera. Sem peça nova: o corpo do deus
// já existe (estátuas, skins). Quem decide onde ele está é a sala ou a cena.

import type { Scene } from "@babylonjs/core/scene"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import { CreatePlane } from "@babylonjs/core/Meshes/Builders/planeBuilder"
import { CreateDisc } from "@babylonjs/core/Meshes/Builders/discBuilder"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { MonsterModel } from "../laminas/engine/monster-view"
import { GOD_KINDS, type GodId } from "../laminas/sim/fight"

/** Cor de cada deus (luz no chão e borda do nome). */
export const GOD_COLOR: Record<GodId, string> = { aurion: "#FFC23A", morkhan: "#E0263C" }
/** Nome na placa (nome próprio: não traduz). */
export const GOD_NAME: Record<GodId, string> = { aurion: "AURION", morkhan: "MORKHAN" }
/**
 * Como o deus caça dentro de um Domínio (a cena é do aparelho, como o andar). Espelho de
 * HUNT em utils/meuMundoGodHunt.js do back (lá vale a rua; aqui só o desenho do Domínio):
 * corre a 4,4 m/s (jogador 3,5; monstros 3,2), aparece 30 m atrás depois de 20 s.
 */
export const GOD_HUNT = Object.freeze({ CHASE_V: 4.4, CATCH: 2, DOMAIN_BEHIND: 30, DOMAIN_DELAY_MS: 20_000, CALM_MS: 90_000 })
/** Altura da placa: o deus tem 3,20 m. */
const TAG_Y = 3.9

function nameTag(scene: Scene, god: GodId) {
  const W = 320
  const H = 96
  const tex = new DynamicTexture(`mm-god-tag-${god}`, { width: W, height: H }, scene, false)
  tex.hasAlpha = true
  const g = tex.getContext() as unknown as CanvasRenderingContext2D
  g.clearRect(0, 0, W, H)
  const text = GOD_NAME[god]
  g.font = "900 50px system-ui, -apple-system, Segoe UI, sans-serif"
  const w = Math.min(W - 8, g.measureText(text).width + 48)
  const x = (W - w) / 2
  g.fillStyle = "rgba(14,10,22,0.86)"
  g.fillRect(x, 12, w, 72)
  g.strokeStyle = GOD_COLOR[god]
  g.lineWidth = 5
  g.strokeRect(x + 2.5, 14.5, w - 5, 67)
  g.textAlign = "center"
  g.textBaseline = "middle"
  g.fillStyle = "#000"
  g.fillText(text, W / 2 - 3, 52, W - 30)
  g.fillStyle = GOD_COLOR[god]
  g.fillText(text, W / 2, 49, W - 30)
  tex.update(true)
  const mat = new StandardMaterial(`mm-god-tag-mat-${god}`, scene)
  mat.diffuseTexture = tex
  mat.emissiveColor = new Color3(1, 1, 1)
  mat.disableLighting = true
  mat.useAlphaFromDiffuseTexture = true
  mat.backFaceCulling = false
  const plane = CreatePlane(`mm-god-tag-${god}`, { width: 1.9, height: 0.57 }, scene)
  plane.material = mat
  plane.billboardMode = 7
  plane.isPickable = false
  return { plane, mat, tex }
}

function groundGlow(scene: Scene, god: GodId) {
  const tex = new DynamicTexture(`mm-god-glow-${god}`, { width: 128, height: 128 }, scene, false)
  const g = tex.getContext() as CanvasRenderingContext2D
  const c = Color3.FromHexString(GOD_COLOR[god])
  const rgb = `${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)}`
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  gr.addColorStop(0, `rgba(${rgb},0.8)`)
  gr.addColorStop(0.55, `rgba(${rgb},0.38)`)
  gr.addColorStop(1, `rgba(${rgb},0)`)
  g.fillStyle = gr
  g.fillRect(0, 0, 128, 128)
  tex.hasAlpha = true
  tex.update()
  const mat = new StandardMaterial(`mm-god-glow-${god}`, scene)
  mat.diffuseTexture = tex
  mat.useAlphaFromDiffuseTexture = true
  mat.emissiveColor = new Color3(1, 1, 1)
  mat.disableLighting = true
  mat.disableDepthWrite = true
  const disc = CreateDisc(`mm-god-glow-${god}`, { radius: 3.2, tessellation: 32 }, scene)
  disc.rotation.x = Math.PI / 2
  disc.material = mat
  disc.isPickable = false
  return { disc, mat, tex }
}

/** Um deus na cena: corpo, luz no chão e nome. `place` move; `update` anima. */
export class GodFigure {
  readonly model: MonsterModel
  private readonly glow: ReturnType<typeof groundGlow>
  private readonly tag: ReturnType<typeof nameTag>
  private time = 0
  x = 0
  z = 0
  facing = 0

  constructor(
    private readonly scene: Scene,
    readonly god: GodId,
  ) {
    // o corpo do deus com a arma e os golpes do tipo da regra (como Noctis no Domínio)
    this.model = new MonsterModel(scene, GOD_KINDS[god], 1, null, undefined, god)
    this.glow = groundGlow(scene, god)
    this.tag = nameTag(scene, god)
  }

  /** `speed` (m/s) escolhe andar/correr; `calm` = sem pose de ataque. */
  update(dt: number, x: number, z: number, facing: number, speed: number) {
    this.time += dt
    this.x = x
    this.z = z
    this.facing = facing
    this.model.update(dt, { x, y: 0, z, facing, state: "chase", t: this.time, warn: 0, speed, calm: true })
    this.glow.disc.position.set(x, 0.05, z)
    const pulse = 1 + Math.sin(this.time * 3) * 0.08
    this.glow.disc.scaling.set(pulse, pulse, 1)
    this.tag.plane.position.set(x, TAG_Y, z)
  }

  setTagVisible(on: boolean) {
    this.tag.plane.setEnabled(on)
  }

  setVisible(on: boolean) {
    this.model.setVisible(on)
    this.glow.disc.setEnabled(on)
    this.tag.plane.setEnabled(on)
  }

  /** Malhas que não são o corpo (para quem precisa esconder/medir). */
  extras(): Mesh[] {
    return [this.glow.disc, this.tag.plane]
  }

  dispose() {
    this.model.dispose()
    for (const p of [this.glow, this.tag]) {
      ;(p as { disc?: Mesh; plane?: Mesh }).disc?.dispose()
      ;(p as { disc?: Mesh; plane?: Mesh }).plane?.dispose()
      p.mat.dispose()
      p.tex.dispose()
    }
  }
}
