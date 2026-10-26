// features/meu-mundo/paint/engine/pickups-view.ts — PAINT (mm3d-35): gatinhos e cápsulas.
//
// Gatinhos: os NPC do Cat Demon (gato branco e gato preto, 1,3 mil triângulos,
// com idle/sentado/alegre), um por lugar do mapa, com um anel dourado no chão
// para achar de longe. Pegou: pula de alegria, sobe e some. De longe (ou fora
// da tela) a animação para — 48 esqueletos animando à toa pesam no celular.
//
// Cápsulas: vidro com a tinta da cor dentro, flutuando e girando; somem ao
// pegar e voltam quando a regra diz.

import type { Scene } from "@babylonjs/core/scene"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import type { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh"
import "@babylonjs/core/Meshes/instancedMesh"
import type { AnimationGroup } from "@babylonjs/core/Animations/animationGroup"
import type { AssetContainer, InstantiatedEntries } from "@babylonjs/core/assetContainer"
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode"
import type { Camera } from "@babylonjs/core/Cameras/camera"
import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader"
import { CreateCapsule } from "@babylonjs/core/Meshes/Builders/capsuleBuilder"
import { CreateTorus } from "@babylonjs/core/Meshes/Builders/torusBuilder"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { ensureLoaders } from "../../engine/avatars"
import { PAINT_COLORS } from "../sim/tuning"
import type { PaintCapsule, PaintCat } from "../sim/map"

export const PAINT_ASSETS = "/meu-mundo/paint/v1/"
const CAT_FILES = ["gato-branco.glb", "gato-preto.glb"]
/** O modelo tem ~0,2 m; no jogo o gatinho fica com ~0,65 m (dá para ver de longe). */
const CAT_SCALE = 3.2
const ANIM_NEAR = 32

interface CatView {
  cat: PaintCat
  root: TransformNode | null
  entries: InstantiatedEntries | null
  idle: AnimationGroup | null
  happy: AnimationGroup | null
  ring: InstancedMesh
  taken: number
  playing: boolean
}

export class PickupsView {
  private readonly cats: CatView[] = []
  private readonly byCat = new Map<number, CatView>()
  private readonly caps = new Map<number, { cap: PaintCapsule; glass: InstancedMesh; ink: InstancedMesh; on: boolean; phase: number }>()
  private readonly ringBase: Mesh
  private readonly ringMat: StandardMaterial
  private readonly glassBase: Mesh
  private readonly glassMat: StandardMaterial
  private readonly inkBases: Mesh[] = []
  private readonly inkMats: StandardMaterial[] = []
  private containers: AssetContainer[] = []
  private disposed = false
  private clock = 0

  constructor(private readonly scene: Scene, cats: readonly PaintCat[], capsules: readonly PaintCapsule[]) {
    ensureLoaders()
    this.ringMat = new StandardMaterial("paint-cat-ring", scene)
    this.ringMat.emissiveColor = new Color3(0.95, 0.72, 0.2)
    this.ringMat.diffuseColor = new Color3(0.95, 0.75, 0.3)
    this.ringMat.disableLighting = true
    this.ringBase = CreateTorus("paint-cat-ring", { diameter: 1.1, thickness: 0.07, tessellation: 28 }, scene)
    this.ringBase.material = this.ringMat
    this.ringBase.isPickable = false
    this.ringBase.setEnabled(false)
    for (const c of cats) {
      const ring = this.ringBase.createInstance(`paint-cat-ring-${c.id}`)
      ring.position.set(c.x, c.y + 0.05, c.z)
      ring.isPickable = false
      const v: CatView = { cat: c, root: null, entries: null, idle: null, happy: null, ring, taken: 0, playing: false }
      this.cats.push(v)
      this.byCat.set(c.id, v)
    }

    this.glassMat = new StandardMaterial("paint-cap-glass", scene)
    this.glassMat.diffuseColor = new Color3(0.95, 0.97, 1)
    this.glassMat.specularColor = new Color3(1, 1, 1)
    this.glassMat.specularPower = 80
    this.glassMat.alpha = 0.32
    this.glassBase = CreateCapsule("paint-cap-glass", { radius: 0.24, height: 0.86, tessellation: 12, subdivisions: 2 }, scene)
    this.glassBase.material = this.glassMat
    this.glassBase.isPickable = false
    this.glassBase.setEnabled(false)
    for (let c = 0; c < 3; c++) {
      const m = new StandardMaterial(`paint-cap-ink-${c}`, scene)
      const col = Color3.FromHexString(PAINT_COLORS[c])
      m.diffuseColor = col
      m.emissiveColor = col.scale(0.55)
      m.specularColor = new Color3(0.5, 0.5, 0.5)
      this.inkMats.push(m)
      const b = CreateCapsule(`paint-cap-ink-${c}`, { radius: 0.17, height: 0.62, tessellation: 10, subdivisions: 1 }, scene)
      b.material = m
      b.isPickable = false
      b.setEnabled(false)
      this.inkBases.push(b)
    }
    for (const cap of capsules) {
      const glass = this.glassBase.createInstance(`paint-cap-g-${cap.id}`)
      const ink = this.inkBases[cap.c].createInstance(`paint-cap-i-${cap.id}`)
      glass.isPickable = false
      ink.isPickable = false
      this.caps.set(cap.id, { cap, glass, ink, on: true, phase: (cap.id * 1.7) % (Math.PI * 2) })
    }
    void this.loadCats()
  }

  private async loadCats() {
    let loaded: AssetContainer[]
    try {
      loaded = await Promise.all(CAT_FILES.map((f) => LoadAssetContainerAsync(PAINT_ASSETS + f, this.scene)))
    } catch (err) {
      if (!this.disposed) console.warn("[paint] gatinhos não carregaram", err)
      return
    }
    if (this.disposed) {
      loaded.forEach((c) => c.dispose())
      return
    }
    this.containers = loaded
    for (const v of this.cats) {
      if (v.taken) continue
      const e = loaded[v.cat.skin].instantiateModelsToScene((n) => `${n}-cat${v.cat.id}`, false, { doNotInstantiate: true })
      const root = e.rootNodes[0] as TransformNode
      root.position.set(v.cat.x, v.cat.y, v.cat.z)
      root.scaling.scaleInPlace(CAT_SCALE)
      root.rotationQuaternion = null
      root.rotation.y = v.cat.facing
      for (const m of root.getChildMeshes(false)) {
        m.isPickable = false
        m.alwaysSelectAsActiveMesh = false
      }
      v.root = root
      v.entries = e
      const pick = (name: string) => e.animationGroups.find((g) => g.name.endsWith(name) || g.name.includes(`${name}-`) || g.name === name) ?? null
      for (const g of e.animationGroups) g.stop()
      v.idle = (v.cat.id % 2 ? pick("sentado") : pick("idle")) ?? pick("idle")
      v.happy = pick("alegre")
      v.playing = false
    }
  }

  /** Gatinho pego: pula de alegria, sobe e some (instant = já estava pego ao entrar). */
  take(id: number, instant = false) {
    const v = this.byCat.get(id)
    if (!v || v.taken) return
    v.taken = instant ? -1 : this.clock
    v.ring.setEnabled(false)
    if (instant || !v.root) {
      v.root?.setEnabled(false)
      return
    }
    v.idle?.stop()
    v.happy?.start(true, 1.4)
  }

  setCapsule(id: number, on: boolean) {
    const c = this.caps.get(id)
    if (!c || c.on === on) return
    c.on = on
    c.glass.setEnabled(on)
    c.ink.setEnabled(on)
  }

  tick(dt: number, cam: Camera | null) {
    this.clock += dt
    const cx = cam?.globalPosition.x ?? 0
    const cy = cam?.globalPosition.y ?? 0
    const cz = cam?.globalPosition.z ?? 0
    for (const v of this.cats) {
      if (!v.taken) {
        v.ring.rotation.y = this.clock * 0.8
        const pulse = 1 + Math.sin(this.clock * 3 + v.cat.id) * 0.08
        v.ring.scaling.set(pulse, 1, pulse)
        if (!v.root) continue
        const near = Math.hypot(v.cat.x - cx, v.cat.y - cy, v.cat.z - cz) < ANIM_NEAR
        if (near && !v.playing) {
          v.idle?.start(true, 1, v.idle.from + ((v.cat.id * 0.37) % 1) * (v.idle.to - v.idle.from))
          v.playing = true
        } else if (!near && v.playing) {
          v.idle?.pause()
          v.playing = false
        }
        continue
      }
      if (v.taken < 0 || !v.root || !v.root.isEnabled()) continue
      const t = this.clock - v.taken
      if (t > 0.9) {
        v.happy?.stop()
        v.root.setEnabled(false)
        continue
      }
      v.root.position.y = v.cat.y + Math.max(0, t - 0.35) * 3
      const s = CAT_SCALE * Math.max(0.05, 1 - Math.max(0, t - 0.45) / 0.45)
      v.root.scaling.setAll(s)
      v.root.rotation.y = v.cat.facing + t * 6
    }
    for (const c of this.caps.values()) {
      if (!c.on) continue
      const y = c.cap.y + 0.75 + Math.sin(this.clock * 2.2 + c.phase) * 0.12
      const r = this.clock * 1.4 + c.phase
      c.glass.position.set(c.cap.x, y, c.cap.z)
      c.ink.position.set(c.cap.x, y, c.cap.z)
      c.glass.rotation.set(0.35, r, 0)
      c.ink.rotation.set(0.35, r, 0)
    }
  }

  dispose() {
    this.disposed = true
    for (const v of this.cats) {
      v.entries?.dispose()
      v.ring.dispose()
    }
    for (const c of this.caps.values()) {
      c.glass.dispose()
      c.ink.dispose()
    }
    for (const c of this.containers) c.dispose()
    this.ringBase.dispose()
    this.ringMat.dispose()
    this.glassBase.dispose()
    this.glassMat.dispose()
    for (const b of this.inkBases) b.dispose()
    for (const m of this.inkMats) m.dispose()
  }
}
