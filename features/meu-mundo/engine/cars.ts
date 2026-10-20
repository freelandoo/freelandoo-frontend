// features/meu-mundo/engine/cars.ts
//
// Carros do bairro (mm3d-11): um por casa com titular. Quem diz onde cada
// carro está e quem dirige é a SALA (state.cars); aqui só se desenha.
//
// O arquivo do carro é baixado UMA vez; cada carro é uma instância da mesma
// geometria e do mesmo material. O carro que VOCÊ dirige segue a sua predição
// local (responde na hora); os outros são interpolados como os personagens.

import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { Texture } from "@babylonjs/core/Materials/Textures/texture"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { TransformNode } from "@babylonjs/core/Meshes/transformNode"
import type { AssetContainer, InstantiatedEntries } from "@babylonjs/core/assetContainer"
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh"
import type { Scene } from "@babylonjs/core/scene"
import { ensureLoaders } from "./avatars"
import { lerpAngle, CAR } from "./motion"
import type { Box2 } from "./collision"
import type { CarState } from "./net"

export const CAR_ASSET_VERSION = "v1"
const BASE = `/meu-mundo/veiculos/${CAR_ASSET_VERSION}/`
const MODEL = "car-sport.glb"
const TEXTURE = "car-sport-basecolor-1024.jpg"

interface CarView {
  holder: TransformNode
  entries: InstantiatedEntries | null
  x: number
  z: number
  facing: number
  tx: number
  tz: number
  tf: number
}

export class CarFleet {
  private container: Promise<AssetContainer> | null = null
  private material: StandardMaterial | null = null
  private readonly views = new Map<string, CarView>()
  private disposed = false
  /** Última posição conhecida de cada carro (para colisão e interação). */
  readonly latest = new Map<string, CarState>()

  constructor(private readonly scene: Scene) {
    ensureLoaders()
  }

  private load() {
    if (!this.container) {
      this.container = LoadAssetContainerAsync(BASE + MODEL, this.scene).then((c) => {
        // Instâncias usam o material da malha-FONTE: ele vai aqui, uma vez.
        for (const m of c.meshes) if (m.getTotalVertices() > 0) m.material = this.mat()
        return c
      })
      this.container.catch(() => {
        this.container = null
      })
    }
    return this.container
  }

  private mat() {
    if (!this.material) {
      const tex = new Texture(BASE + TEXTURE, this.scene, false, false)
      const m = new StandardMaterial("mm-car", this.scene)
      m.diffuseTexture = tex
      m.emissiveTexture = tex
      m.emissiveColor = new Color3(0.38, 0.38, 0.38)
      m.diffuseColor = new Color3(0.75, 0.75, 0.75)
      // Um brilho leve na lataria (o basecolor já traz o sombreado pintado).
      m.specularColor = new Color3(0.28, 0.28, 0.28)
      m.specularPower = 48
      this.material = m
    }
    return this.material
  }

  private create(key: string, c: CarState): CarView {
    const holder = new TransformNode(`mm-car-${key}`, this.scene)
    // Sem sombra no chão (pedido do Alex): só o carro.
    const view: CarView = { holder, entries: null, x: c.x, z: c.z, facing: c.facing, tx: c.x, tz: c.z, tf: c.facing }
    this.place(view)
    void this.load()
      .then((container) => {
        if (this.disposed || this.views.get(key) !== view) return
        const entries = container.instantiateModelsToScene((n) => `${n}-${key}`, false, { doNotInstantiate: false })
        const root = entries.rootNodes[0] as TransformNode
        root.parent = holder
        for (const m of root.getChildMeshes(false) as AbstractMesh[]) m.isPickable = false
        view.entries = entries
      })
      .catch(() => {})
    return view
  }

  private place(v: CarView) {
    v.holder.position.set(v.x, 0, v.z)
    v.holder.rotation.y = v.facing
  }

  /**
   * Atualiza a partir da sala. `mine` = lote do carro que você dirige (0 = a
   * pé) e `pose` = sua posição prevista, que o seu carro segue sem atraso.
   */
  sync(cars: Map<string, CarState> | null, dt: number, mine: number, pose: { x: number; z: number; facing: number } | null) {
    const seen = new Set<string>()
    cars?.forEach((c, key) => {
      seen.add(key)
      this.latest.set(key, { lot: c.lot, x: c.x, z: c.z, facing: c.facing, driver: c.driver })
      let v = this.views.get(key)
      if (!v) {
        v = this.create(key, c)
        this.views.set(key, v)
      }
      if (mine && c.lot === mine && pose) {
        v.x = v.tx = pose.x
        v.z = v.tz = pose.z
        v.facing = v.tf = pose.facing
      } else {
        v.tx = c.x
        v.tz = c.z
        v.tf = c.facing
        const err = Math.hypot(v.tx - v.x, v.tz - v.z)
        if (err > 12) {
          v.x = v.tx
          v.z = v.tz
          v.facing = v.tf
        } else {
          const k = 1 - Math.exp(-10 * dt)
          v.x += (v.tx - v.x) * k
          v.z += (v.tz - v.z) * k
          v.facing = lerpAngle(v.facing, v.tf, k)
        }
      }
      this.place(v)
    })
    for (const [key, v] of this.views) {
      if (seen.has(key)) continue
      this.drop(v)
      this.views.delete(key)
      this.latest.delete(key)
    }
  }

  /** Caixas de colisão dos carros que bloqueiam você (todos menos o seu). */
  boxes(mine: number): Box2[] {
    const out: Box2[] = []
    for (const c of this.latest.values()) {
      if (mine && c.lot === mine) continue
      out.push({ x: c.x, z: c.z, hx: CAR.HX, hz: CAR.HZ, rot: c.facing, h: 1.4 })
    }
    return out
  }

  private drop(v: CarView) {
    v.entries?.dispose()
    v.holder.dispose()
  }

  get count() {
    return this.views.size
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    for (const v of this.views.values()) this.drop(v)
    this.views.clear()
    this.latest.clear()
    this.container?.then((c) => c.dispose()).catch(() => {})
    this.material?.diffuseTexture?.dispose()
    this.material?.dispose()
  }
}
