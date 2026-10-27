// features/meu-mundo/noturno/engine/props-view.ts — ROLÊ NOTURNO (mm3d-40): obstáculos e moedas.
//
// Reaproveita o que o jogo já tem: o supercarro da rua (repintado em 5 cores,
// mesma pintura por vértice do vendedor, mm3d-37e) e a ambulância do centro;
// caminhão-baú, rampa de skate e cavalete são novos
// (MEU MUNDO 3D/pipeline/noturno/build_props.py). Cada modelo vira UMA malha
// de corpo e UMA de brilho (assadas, escondidas) e cada obstáculo é uma
// instância delas — poucas chamadas de desenho com a rua cheia.
//
// O supercarro não tem luz própria: lanternas vermelhas atrás e faróis na
// frente são caixinhas acesas; na contramão o farol projeta um facho no
// asfalto (textura somada). Moedas: instâncias finas que giram.

import type { Scene } from "@babylonjs/core/scene"
import "@babylonjs/core/Meshes/instancedMesh"
import "@babylonjs/core/Meshes/thinInstanceMesh"
import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader"
import { Mesh } from "@babylonjs/core/Meshes/mesh"
import type { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh"
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh"
import { TransformNode } from "@babylonjs/core/Meshes/transformNode"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector"
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder"
import { CreateCylinder } from "@babylonjs/core/Meshes/Builders/cylinderBuilder"
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder"
import { Constants } from "@babylonjs/core/Engines/constants"
import { ensureLoaders } from "../../engine/avatars"
import { CAR_ASSET_VERSION, CAR_PAINT_HEX, repaint } from "../../engine/cars"
import type { Coin, Obstacle, ObstacleKind, Run } from "../sim/run"

const BASE = "/meu-mundo/noturno/v1/"
const CAR_URL = `/meu-mundo/veiculos/${CAR_ASSET_VERSION}/supercar.glb`
const PAINTS = ["vermelho", "azul", "branco", "amarelo", "preto"] as const
type ModelKey = Exclude<ObstacleKind, "car"> | `car:${(typeof PAINTS)[number]}`

/**
 * Do modelo ao obstáculo da regra: onde fica a origem a partir da traseira
 * (menor z) e se o modelo precisa virar 180° para apontar para +z.
 */
const FIT: Record<ObstacleKind, { org: number; flip: boolean }> = {
  car: { org: 2.29, flip: false },
  amb: { org: 2.85, flip: true },
  truck: { org: 0.08, flip: false },
  ramp: { org: 0, flip: false },
  barrier: { org: 0, flip: false },
}
/** Contramão (o carro aponta para −z): origem a partir da ponta de menor z. */
const CAR_FRONT = 2.09
const DRAW_AHEAD = 190
const COIN_CAP = 420

interface Model {
  body: Mesh | null
  glow: Mesh | null
}

interface View {
  key: ModelKey
  holder: TransformNode
  parts: InstancedMesh[]
  lights: InstancedMesh[]
  beam: InstancedMesh | null
  /** Modelo ainda não chegou: monta quando chegar. */
  pending: boolean
}

export interface PropsView {
  ready: Promise<void>
  sync(run: Run, time: number): void
  /** Moeda pega: brilha e sobe um instante. */
  burst(x: number, y: number, z: number): void
  dispose(): void
}

function beamTexture(scene: Scene) {
  const tex = new DynamicTexture("noturno-beam", { width: 64, height: 256 }, scene, true)
  const c = tex.getContext() as CanvasRenderingContext2D
  const g = c.createLinearGradient(0, 0, 0, 256)
  g.addColorStop(0, "rgba(255,240,200,0.0)")
  g.addColorStop(0.75, "rgba(255,240,200,0.4)")
  g.addColorStop(1, "rgba(255,240,200,0.75)")
  c.fillStyle = g
  c.beginPath()
  c.moveTo(0, 0)
  c.lineTo(64, 0)
  c.lineTo(44, 256)
  c.lineTo(20, 256)
  c.closePath()
  c.fill()
  tex.hasAlpha = true
  tex.update(true)
  return tex
}

export function buildProps(scene: Scene): PropsView {
  ensureLoaders()
  const bodyMat = new StandardMaterial("noturno-prop", scene)
  bodyMat.diffuseColor = new Color3(1, 1, 1)
  bodyMat.emissiveColor = new Color3(0.2, 0.2, 0.24)
  bodyMat.specularColor = new Color3(0.3, 0.3, 0.32)
  bodyMat.specularPower = 40
  const glowMat = new StandardMaterial("noturno-prop-glow", scene)
  glowMat.disableLighting = true
  glowMat.emissiveColor = new Color3(1, 1, 1)
  glowMat.backFaceCulling = false

  const models = new Map<ModelKey, Model>()
  const loading = new Map<ModelKey, Promise<Model>>()
  let disposed = false

  const bake = async (key: ModelKey, url: string, paint?: string): Promise<Model> => {
    const c = await LoadAssetContainerAsync(url, scene)
    if (disposed) {
      c.dispose()
      return { body: null, glow: null }
    }
    if (paint) repaint(c.meshes, CAR_PAINT_HEX[paint])
    const parts = c.meshes.filter((m): m is Mesh => m instanceof Mesh && m.getTotalVertices() > 0)
    const body: Mesh[] = []
    const glow: Mesh[] = []
    const isGlow = (m: AbstractMesh) => {
      for (let n: { name: string; parent: unknown } | null = m; n; n = n.parent as { name: string; parent: unknown } | null) if (/glow/i.test(n.name)) return true
      return false
    }
    for (const m of parts) {
      m.computeWorldMatrix(true)
      const g = isGlow(m)
      m.bakeTransformIntoVertices(m.getWorldMatrix())
      m.parent = null
      m.position.setAll(0)
      m.rotationQuaternion = null
      m.rotation.setAll(0)
      m.scaling.setAll(1)
      ;(g ? glow : body).push(m)
    }
    for (const m of parts) {
      c.meshes.splice(c.meshes.indexOf(m), 1)
      if (m.geometry) c.geometries.splice(c.geometries.indexOf(m.geometry), 1)
    }
    c.dispose()
    const out: Model = { body: null, glow: null }
    for (const [group, mat, tag] of [
      [body, bodyMat, "body"],
      [glow, glowMat, "glow"],
    ] as const) {
      if (!group.length) continue
      for (const m of group) {
        if (m.geometry) scene.addGeometry(m.geometry)
        scene.addMesh(m)
      }
      const merged = group.length > 1 ? Mesh.MergeMeshes(group as Mesh[], true, true) : group[0]
      if (!merged) continue
      merged.name = `noturno-${key}-${tag}`
      merged.material = mat
      merged.useVertexColors = true
      merged.hasVertexAlpha = false
      merged.isPickable = false
      // a fonte fica escondida; quem aparece são as instâncias
      merged.isVisible = false
      if (tag === "body") out.body = merged
      else out.glow = merged
    }
    models.set(key, out)
    return out
  }

  const want = (key: ModelKey) => {
    let p = loading.get(key)
    if (!p) {
      if (key.startsWith("car:")) p = bake(key, CAR_URL, key.slice(4))
      else p = bake(key, `${BASE}noturno-${key}.glb`)
      p.catch(() => {})
      loading.set(key, p)
    }
    return p
  }
  const ready = Promise.all((["truck", "ramp", "barrier", "amb", ...PAINTS.map((p) => `car:${p}` as const)] as ModelKey[]).map((k) => want(k).catch(() => null))).then(() => {})

  // luzes dos carros (caixinhas acesas) e o facho do farol
  const tailMat = new StandardMaterial("noturno-tail", scene)
  tailMat.disableLighting = true
  tailMat.emissiveColor = new Color3(1, 0.1, 0.08)
  const headMat = new StandardMaterial("noturno-head", scene)
  headMat.disableLighting = true
  headMat.emissiveColor = new Color3(1, 0.96, 0.82)
  const tail = CreateBox("noturno-tail", { width: 0.36, height: 0.1, depth: 0.05 }, scene)
  tail.material = tailMat
  tail.isVisible = false
  tail.isPickable = false
  const headL = CreateBox("noturno-headl", { width: 0.34, height: 0.12, depth: 0.05 }, scene)
  headL.material = headMat
  headL.isVisible = false
  headL.isPickable = false
  const beamMat = new StandardMaterial("noturno-beam", scene)
  beamMat.disableLighting = true
  beamMat.emissiveColor = new Color3(1, 0.95, 0.8)
  beamMat.diffuseTexture = beamTexture(scene)
  beamMat.diffuseTexture.hasAlpha = true
  beamMat.opacityTexture = beamMat.diffuseTexture
  beamMat.alphaMode = Constants.ALPHA_ADD
  beamMat.disableDepthWrite = true
  beamMat.backFaceCulling = false
  const beam = CreateGround("noturno-beam", { width: 2.6, height: 12 }, scene)
  beam.material = beamMat
  beam.isVisible = false
  beam.isPickable = false

  const views = new Map<number, View>()
  const pool = new Map<ModelKey, View[]>()

  const keyOf = (o: Obstacle): ModelKey => (o.kind === "car" ? `car:${PAINTS[o.tint % PAINTS.length]}` : o.kind)

  const mount = (v: View, m: Model, o: Obstacle) => {
    for (const src of [m.body, m.glow]) {
      if (!src) continue
      const inst = src.createInstance(`${src.name}-i`)
      inst.parent = v.holder
      inst.isPickable = false
      v.parts.push(inst)
    }
    if (o.kind === "car") {
      for (const s of [-1, 1]) {
        const t = tail.createInstance("noturno-tail-i")
        t.parent = v.holder
        t.position.set(s * 0.72, 0.78, -2.27)
        v.lights.push(t)
        const h = headL.createInstance("noturno-head-i")
        h.parent = v.holder
        h.position.set(s * 0.7, 0.62, 2.07)
        v.lights.push(h)
      }
    }
    v.pending = false
  }

  const viewFor = (o: Obstacle): View => {
    const key = keyOf(o)
    const free = pool.get(key)?.pop()
    if (free) {
      free.holder.setEnabled(true)
      return free
    }
    const v: View = { key, holder: new TransformNode(`noturno-ob-${o.id}`, scene), parts: [], lights: [], beam: null, pending: true }
    const m = models.get(key)
    if (m) mount(v, m, o)
    else
      void want(key).then((mm) => {
        if (!disposed && v.pending) mount(v, mm, o)
      })
    return v
  }

  const release = (v: View) => {
    v.holder.setEnabled(false)
    if (v.beam) {
      v.beam.dispose()
      v.beam = null
    }
    const list = pool.get(v.key) ?? []
    list.push(v)
    pool.set(v.key, list)
  }

  // moedas
  const coinMat = new StandardMaterial("noturno-coin", scene)
  coinMat.diffuseColor = new Color3(1, 0.78, 0.22)
  coinMat.emissiveColor = new Color3(0.62, 0.42, 0.06)
  coinMat.specularColor = new Color3(1, 0.95, 0.7)
  coinMat.specularPower = 24
  const coin = CreateCylinder("noturno-coin", { diameter: 0.62, height: 0.09, tessellation: 18 }, scene)
  coin.bakeTransformIntoVertices(Matrix.RotationX(Math.PI / 2))
  coin.material = coinMat
  coin.isPickable = false
  coin.alwaysSelectAsActiveMesh = true
  const coinBuf = new Float32Array(COIN_CAP * 16)
  coin.thinInstanceSetBuffer("matrix", coinBuf, 16, false)
  coin.thinInstanceCount = 0
  const bursts: { x: number; y: number; z: number; t: number }[] = []
  const mtx = new Matrix()
  const q = new Quaternion()
  const at = new Vector3()
  const sc = new Vector3(1, 1, 1)
  let lastT = 0

  return {
    ready,
    sync(run: Run, time: number) {
      const pz = run.z
      const seen = new Set<number>()
      for (const o of run.obstacles) {
        if (o.z > pz + DRAW_AHEAD || o.z + 12 < pz - 12) continue
        seen.add(o.id)
        let v = views.get(o.id)
        if (!v) {
          v = viewFor(o)
          views.set(o.id, v)
          if (o.kind === "car" && o.dir === -1 && !v.beam) {
            const b = beam.createInstance("noturno-beam-i")
            b.parent = v.holder
            b.position.set(0, 0.03, 2.09 + 6)
            v.beam = b
          }
        }
        const f = FIT[o.kind]
        const back = o.dir === -1
        v.holder.position.set(o.x, 0, o.z + (back ? CAR_FRONT : f.org))
        v.holder.rotation.y = (f.flip ? Math.PI : 0) + (back ? Math.PI : 0)
      }
      for (const [id, v] of views) {
        if (seen.has(id)) continue
        release(v)
        views.delete(id)
      }
      // moedas visíveis + as que acabaram de ser pegas
      const dt = Math.max(0, time - lastT)
      lastT = time
      let n = 0
      const spin = time * 3.2
      Quaternion.RotationYawPitchRollToRef(spin, 0, 0, q)
      for (const c of run.coins as Coin[]) {
        if (c.taken) continue
        const z = run.coinZ(c)
        if (z < pz - 3 || z > pz + DRAW_AHEAD) continue
        if (n >= COIN_CAP) break
        at.set(c.x, c.y + Math.sin(time * 3 + z * 0.4) * 0.06, z)
        sc.set(1, 1, 1)
        Matrix.ComposeToRef(sc, q, at, mtx)
        mtx.copyToArray(coinBuf, n * 16)
        n++
      }
      for (let i = bursts.length - 1; i >= 0; i--) {
        const b = bursts[i]
        b.t += dt
        if (b.t > 0.28 || n >= COIN_CAP) {
          bursts.splice(i, 1)
          continue
        }
        const k = b.t / 0.28
        at.set(b.x, b.y + k * 1.2, b.z + k * 2)
        const s = 1 + k * 0.6
        sc.set(s * (1 - k), s * (1 - k), s * (1 - k))
        Quaternion.RotationYawPitchRollToRef(spin * 4, 0, 0, q)
        Matrix.ComposeToRef(sc, q, at, mtx)
        mtx.copyToArray(coinBuf, n * 16)
        n++
      }
      coin.thinInstanceCount = n
      coin.thinInstanceBufferUpdated("matrix")
    },
    burst(x, y, z) {
      bursts.push({ x, y, z, t: 0 })
    },
    dispose() {
      disposed = true
      for (const v of views.values()) v.holder.dispose()
      for (const list of pool.values()) for (const v of list) v.holder.dispose()
      for (const m of models.values()) {
        m.body?.dispose()
        m.glow?.dispose()
      }
      for (const x of [tail, headL, beam, coin]) x.dispose()
      for (const m of [bodyMat, glowMat, tailMat, headMat, beamMat, coinMat]) m.dispose(true, true)
    },
  }
}
