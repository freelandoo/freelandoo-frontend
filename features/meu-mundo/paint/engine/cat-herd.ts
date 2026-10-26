// features/meu-mundo/paint/engine/cat-herd.ts — PAINT (mm3d-35g/h/i/j): os gatinhos.
//
// Leves (pedido do Alex): um gatinho ESTÁTICO por cor (pipeline/build_paint_cats.py
// — a pose do "idle" aplicada na malha, sem esqueleto) desenhado por
// instâncias; o rabo é peça própria (balança) e o corpo respira.
//
// Só no mapa, parados no lugar com o anel dourado; pegou → pula e some.
// mm3d-35j: NÃO seguem mais o jogador (o Alex desistiu da fila, mm3d-35g–i) —
// quem pega só soma no placar do time.

import type { Scene } from "@babylonjs/core/scene"
import type { Camera } from "@babylonjs/core/Cameras/camera"
import { Mesh } from "@babylonjs/core/Meshes/mesh"
import type { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh"
import "@babylonjs/core/Meshes/instancedMesh"
import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader"
import { CreateTorus } from "@babylonjs/core/Meshes/Builders/torusBuilder"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import { ensureLoaders } from "../../engine/avatars"
import type { PaintCat } from "../sim/map"

export const CAT_ASSETS = "/meu-mundo/paint/v1/"
const CAT_FILES = ["gato-branco-m35i.glb", "gato-preto-m35i.glb"]
/** O modelo tem ~0,2 m; no jogo ~0,25 m (mm3d-35i: 2× a 35h, pedido do Alex). */
const CAT_SCALE = 1.28

/** Peças móveis do GLB (build_paint_cats.py): rabo + patas frente/trás × esq./dir. */
const PARTS = ["rabo", "pata_fe", "pata_fd", "pata_te", "pata_td"] as const

/** Um gatinho desenhado: corpo + peças (filhas, giram na base), na ordem de PARTS. */
interface CatInst {
  body: InstancedMesh
  parts: (InstancedMesh | null)[]
}

interface CatSource {
  body: Mesh
  parts: (Mesh | null)[]
  /** Base de cada peça no espaço do corpo (já na escala). */
  pivots: Vector3[]
}

interface MapCat {
  cat: PaintCat
  inst: CatInst | null
  ring: InstancedMesh
  /** 0 = no mapa; >0 = pego em (relógio); -1 = já estava pego ao entrar. */
  taken: number
}

export class CatHerd {
  clock = 0
  private sources: (CatSource | null)[] = [null, null]
  private readonly map: MapCat[] = []
  private readonly byCat = new Map<number, MapCat>()
  private readonly ringBase: Mesh
  private readonly ringMat: StandardMaterial
  private disposed = false
  private seq = 0

  constructor(private readonly scene: Scene, cats: readonly PaintCat[]) {
    ensureLoaders()
    this.ringMat = new StandardMaterial("paint-cat-ring", scene)
    this.ringMat.emissiveColor = new Color3(0.95, 0.72, 0.2)
    this.ringMat.diffuseColor = new Color3(0.95, 0.75, 0.3)
    this.ringMat.disableLighting = true
    this.ringBase = CreateTorus("paint-cat-ring", { diameter: 0.6, thickness: 0.04, tessellation: 24 }, scene)
    this.ringBase.material = this.ringMat
    this.ringBase.isPickable = false
    this.ringBase.position.y = -1000
    for (const c of cats) {
      const ring = this.ringBase.createInstance(`paint-cat-ring-${c.id}`)
      ring.position.set(c.x, c.y + 0.04, c.z)
      ring.isPickable = false
      const v: MapCat = { cat: c, inst: null, ring, taken: 0 }
      this.map.push(v)
      this.byCat.set(c.id, v)
    }
    void this.load()
  }

  private async load() {
    try {
      const got = await Promise.all(CAT_FILES.map((f) => LoadAssetContainerAsync(CAT_ASSETS + f, this.scene)))
      if (this.disposed) {
        got.forEach((c) => c.dispose())
        return
      }
      got.forEach((c, i) => {
        c.addAllToScene()
        // peça de cada malha: o nome dela ou do nó pai (primitivas "rabo_primitive0")
        const partOf = (m: Mesh) => PARTS.findIndex((k) => m.name.startsWith(k) || (m.parent?.name ?? "").startsWith(k))
        const meshes = c.meshes.filter((m): m is Mesh => m instanceof Mesh && m.getTotalVertices() > 0)
        // base de cada peça: a origem do nó dela (o pipeline põe no ombro/quadril/rabo)
        const pivots = PARTS.map((k) => {
          const node = [...c.meshes, ...c.transformNodes].find((n) => n.name === k)
          node?.computeWorldMatrix(true)
          return node ? node.getAbsolutePosition().clone() : Vector3.Zero()
        })
        const body = this.bake(meshes.filter((m) => partOf(m) < 0), Vector3.Zero())
        const parts = PARTS.map((k, j) => this.bake(meshes.filter((m) => partOf(m) === j), pivots[j]))
        for (const n of c.transformNodes) if (n.getChildMeshes().length === 0) n.dispose()
        if (!body) return
        body.name = `paint-cat-src-${i}`
        parts.forEach((m, j) => {
          if (m) m.name = `paint-cat-${PARTS[j]}-${i}`
        })
        this.sources[i] = { body, parts, pivots: pivots.map((v) => v.scale(CAT_SCALE)) }
      })
    } catch (err) {
      if (!this.disposed) console.warn("[paint] gatinhos não carregaram", err)
      return
    }
    for (const v of this.map) {
      if (v.taken < 0) continue
      v.inst = this.instance(v.cat.skin)
      if (!v.inst) continue
      v.inst.body.position.set(v.cat.x, v.cat.y, v.cat.z)
      v.inst.body.rotation.y = v.cat.facing
      if (v.taken > 0) v.inst.body.setEnabled(false)
    }
  }

  /** Junta as partes numa malha-fonte no mundo, com a origem em `origin` e já na escala. */
  private bake(parts: Mesh[], origin: Vector3): Mesh | null {
    if (!parts.length) return null
    const merged = parts.length === 1 ? parts[0] : Mesh.MergeMeshes(parts, true, true, undefined, false, true)
    if (!merged) return null
    merged.setParent(null)
    merged.bakeCurrentTransformIntoVertices()
    merged.position.copyFrom(origin.scale(-1))
    merged.bakeCurrentTransformIntoVertices()
    // a escala vai NA malha: instância não herda a escala da fonte
    merged.scaling.setAll(CAT_SCALE)
    merged.bakeCurrentTransformIntoVertices()
    merged.position.y = -1000 // a fonte fica escondida embaixo; só as instâncias aparecem
    merged.isPickable = false
    if (merged.material) merged.material.backFaceCulling = false
    return merged
  }

  /** Um gatinho (corpo + rabo + patas) — null até carregar. */
  instance(skin: 0 | 1): CatInst | null {
    const src = this.sources[skin]
    if (!src) return null
    const body = src.body.createInstance(`paint-cat-${++this.seq}`)
    body.isPickable = false
    body.scaling.setAll(1)
    const parts = src.parts.map((m, j) => {
      if (!m) return null
      const p = m.createInstance(`paint-cat-${PARTS[j]}-${this.seq}`)
      p.isPickable = false
      p.parent = body
      p.position.copyFrom(src.pivots[j])
      return p
    })
    return { body, parts }
  }

  release(inst: CatInst | null) {
    if (!inst) return
    for (const p of inst.parts) p?.dispose()
    inst.body.dispose()
  }

  /** Respira (o peito sobe e desce) e balança o rabo. */
  private alive(inst: CatInst, phase: number) {
    const b = Math.sin(this.clock * 2.4 + phase) * 0.035
    inst.body.scaling.set(1 - b * 0.5, 1 + b, 1 - b * 0.5)
    const tail = inst.parts[0]
    if (tail) tail.rotation.y = Math.sin(this.clock * 2.6 + phase) * 0.35
  }

  /** Gatinho do mapa pego: pula e some (instant = já estava pego ao entrar). */
  take(id: number, instant = false) {
    const v = this.byCat.get(id)
    if (!v || v.taken) return
    v.taken = instant ? -1 : this.clock
    v.ring.setEnabled(false)
    if (instant) v.inst?.body.setEnabled(false)
  }

  tick(dt: number, _cam: Camera | null) {
    this.clock += dt
    for (const v of this.map) {
      if (!v.taken) {
        v.ring.rotation.y = this.clock * 0.8
        const pulse = 1 + Math.sin(this.clock * 3 + v.cat.id) * 0.08
        v.ring.scaling.set(pulse, 1, pulse)
        if (v.inst) this.alive(v.inst, v.cat.id)
        continue
      }
      if (v.taken < 0 || !v.inst || !v.inst.body.isEnabled()) continue
      const t = this.clock - v.taken
      if (t > 0.5) {
        v.inst.body.setEnabled(false)
        continue
      }
      // pulinho de alegria e some (conta no placar de quem pegou)
      v.inst.body.position.y = v.cat.y + Math.sin(Math.min(1, t / 0.5) * Math.PI) * 0.6
      v.inst.body.rotation.y = v.cat.facing + t * 10
      v.inst.body.scaling.setAll(Math.max(0.05, 1 - t / 0.5))
    }
  }

  dispose() {
    this.disposed = true
    for (const v of this.map) {
      this.release(v.inst)
      v.ring.dispose()
    }
    for (const s of this.sources) {
      if (!s) continue
      s.body.material?.dispose(true, true)
      s.body.dispose()
      for (const m of s.parts) m?.dispose()
    }
    this.ringBase.dispose()
    this.ringMat.dispose()
  }
}
