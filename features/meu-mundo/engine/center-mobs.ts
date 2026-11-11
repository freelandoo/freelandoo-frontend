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
import { CreatePlane } from "@babylonjs/core/Meshes/Builders/planeBuilder"
import { CreateDisc } from "@babylonjs/core/Meshes/Builders/discBuilder"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { MonsterModel } from "../laminas/engine/monster-view"
import { MOB_KINDS, type MobKind } from "../laminas/sim/fight"
import type { Interactable } from "../types"

// 2026-11-03: o Golem de Pedra (`stone`) também anda na rua
type MobKindCity = MobKind
const KINDS = new Set<MobKindCity>(MOB_KINDS)
/** Raio de "Lutar" (m). */
const REACH = 3.4
/** mm3d-60o: altura da placa do nível (um pouco acima da cabeça; o monstro na rua tem o tamanho da luta). */
const LEVEL_Y: Record<MobKindCity, number> = { cavaleiro: 2.7, wolf: 3.1, ciborgue: 3.3, garras: 2.7, brute: 4.7, stone: 4.6 }

/** Placa "Nv. N" em cima do monstro: grafite com a borda roxa da luz dele, sempre virada para a câmera. */
function levelTag(scene: Scene, id: number, level: number) {
  const W = 256
  const H = 96
  const tex = new DynamicTexture(`mm-mob-lv-${id}`, { width: W, height: H }, scene, false)
  tex.hasAlpha = true
  const g = tex.getContext() as unknown as CanvasRenderingContext2D
  g.clearRect(0, 0, W, H)
  const text = `Nv. ${level}`
  g.font = "900 54px system-ui, -apple-system, Segoe UI, sans-serif"
  const w = Math.min(W - 8, g.measureText(text).width + 44)
  const x = (W - w) / 2
  g.fillStyle = "rgba(14,10,22,0.86)"
  g.fillRect(x, 12, w, 72)
  g.strokeStyle = "#B66BFF"
  g.lineWidth = 5
  g.strokeRect(x + 2.5, 14.5, w - 5, 67)
  g.textAlign = "center"
  g.textBaseline = "middle"
  g.fillStyle = "#000"
  g.fillText(text, W / 2 - 3, 52, W - 30)
  g.fillStyle = "#FFFFFF"
  g.fillText(text, W / 2, 49, W - 30)
  tex.update(true)
  const mat = new StandardMaterial(`mm-mob-lv-mat-${id}`, scene)
  mat.diffuseTexture = tex
  mat.emissiveColor = new Color3(1, 1, 1)
  mat.disableLighting = true
  mat.useAlphaFromDiffuseTexture = true
  mat.backFaceCulling = false
  const plane = CreatePlane(`mm-mob-lv-${id}`, { width: 1.5, height: 0.56 }, scene)
  plane.material = mat
  plane.billboardMode = 7
  plane.isPickable = false
  return {
    mesh: plane,
    level,
    dispose() {
      plane.dispose()
      mat.dispose()
      tex.dispose()
    },
  }
}
type LevelTag = ReturnType<typeof levelTag>

interface View {
  id: number
  kind: MobKindCity
  model: MonsterModel
  glow: Mesh
  tag: LevelTag | null
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

  /** Lista nova da sala: [id, tipo, x, z, rumo, nível]. */
  set(list: unknown) {
    if (!Array.isArray(list)) return
    const stamp = ++this.stamp
    for (const row of list) {
      if (!Array.isArray(row) || row.length < 5) continue
      const [id, kind, x, z, f, lvRaw] = row as [number, string, number, number, number, number?]
      const level = Number.isFinite(lvRaw) && (lvRaw as number) > 0 ? Math.round(lvRaw as number) : 0
      if (!KINDS.has(kind as MobKindCity) || ![id, x, z, f].every(Number.isFinite)) continue
      let v = this.views.get(id)
      if (!v) {
        const model = new MonsterModel(this.scene, kind as MobKindCity)
        const glow = CreateDisc(`mm-mob-glow-${id}`, { radius: 2.4, tessellation: 32 }, this.scene)
        glow.rotation.x = Math.PI / 2
        glow.material = this.glowMat
        glow.isPickable = false
        v = { id, kind: kind as MobKindCity, model, glow, tag: null, x, z, facing: f, tx: x, tz: z, tf: f, speed: 0, seen: stamp }
        this.views.set(id, v)
      }
      // placa do nível (refeita só se o nível mudar; sala antiga sem nível = sem placa)
      if (level && (!v.tag || v.tag.level !== level)) {
        v.tag?.dispose()
        v.tag = levelTag(this.scene, id, level)
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
      v.tag?.dispose()
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
      v.tag?.mesh.position.set(v.x, LEVEL_Y[v.kind], v.z)
      const pulse = 1 + Math.sin(this.time * 2.5 + v.id) * 0.07
      v.glow.scaling.set(pulse, pulse, 1)
    }
  }

  /** Onde cada monstro está agora (para o personagem comentar quem vê: banter.ts). */
  seen(x: number, z: number) {
    return [...this.views.values()].map((v) => ({ id: v.id, kind: v.kind as string, d: Math.hypot(v.x - x, v.z - z) }))
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
      v.tag?.mesh.setEnabled(on)
    }
  }

  dispose() {
    for (const v of this.views.values()) {
      v.model.dispose()
      v.glow.dispose()
      v.tag?.dispose()
    }
    this.views.clear()
    this.glowMat.dispose()
    this.glowTex.dispose()
  }
}
