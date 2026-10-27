// features/meu-mundo/corrida/engine/car-view.ts — CORRIDA (mm3d-39): as naves e o FOGO.
//
// O modelo (pipeline/corrida/build_hovercar.py → hovercar-m39.glb) tem três
// malhas: corpo (cores fixas), pintura (branca: o material tinge por nave) e
// brilho. Cada nave é um clone; as chamas dos três bocais são instâncias
// finas de dois cones (labareda laranja por fora, núcleo claro por dentro),
// esticadas pelo acelerador e muito mais no turbo, tremendo a cada quadro.
// O turbo ainda solta faíscas de fogo (sistema de partículas por nave).
//
// Sem sombra: a única coisa embaixo da nave é o brilho azul da flutuação.

import type { Scene } from "@babylonjs/core/scene"
import "@babylonjs/core/Meshes/thinInstanceMesh"
import "@babylonjs/core/Particles/particleSystemComponent"
import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader"
import type { AssetContainer } from "@babylonjs/core/assetContainer"
import { TransformNode } from "@babylonjs/core/Meshes/transformNode"
import { Mesh } from "@babylonjs/core/Meshes/mesh"
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh"
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData"
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { ParticleSystem } from "@babylonjs/core/Particles/particleSystem"
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color"
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector"
import { Constants } from "@babylonjs/core/Engines/constants"
import { ensureLoaders } from "../../engine/avatars"
import type { CarPose } from "../sim/race"

export const CORRIDA_ASSETS = "/meu-mundo/corrida/"
const CAR_FILE = "hovercar-m39.glb"
const IDENTITY = Quaternion.Identity()
/** Flutuação acima do chão (m). */
export const HOVER = 0.55

/** Bocais no quadro da nave (bico em +z): x, y, z e o tamanho do bocal. */
const NOZZLES: [number, number, number, number][] = [
  [-1.03, 0.4, -2.38, 1],
  [1.03, 0.4, -2.38, 1],
  [0, 0.48, -2.17, 0.75],
]

/** Cone de base redonda em z = 0 e ponta em z = −1 (a chama sai para trás). */
function flameCone(name: string, scene: Scene): Mesh {
  const seg = 10
  const pos: number[] = [0, 0, -1]
  const idx: number[] = []
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * Math.PI * 2
    pos.push(Math.cos(a), Math.sin(a), 0)
  }
  pos.push(0, 0, 0.02)
  const capC = seg + 1
  for (let i = 0; i < seg; i++) {
    const a = 1 + i
    const b = 1 + ((i + 1) % seg)
    idx.push(0, a, b, capC, b, a)
  }
  const m = new Mesh(name, scene)
  const vd = new VertexData()
  vd.positions = pos
  vd.indices = idx
  const normals: number[] = []
  VertexData.ComputeNormals(pos, idx, normals)
  vd.normals = normals
  vd.applyToMesh(m)
  m.isPickable = false
  m.alwaysSelectAsActiveMesh = true
  return m
}

function flameMat(name: string, scene: Scene, rgb: [number, number, number], alpha: number): StandardMaterial {
  const m = new StandardMaterial(name, scene)
  m.diffuseColor = new Color3(0, 0, 0)
  m.specularColor = new Color3(0, 0, 0)
  m.emissiveColor = new Color3(...rgb)
  m.disableLighting = true
  m.alpha = alpha
  m.alphaMode = Constants.ALPHA_ADD
  m.backFaceCulling = false
  m.fogEnabled = false
  return m
}

/** Bolinha macia (faísca e brilho da flutuação). */
function softDot(scene: Scene, name: string, inner: string, outer: string): DynamicTexture {
  const tex = new DynamicTexture(name, { width: 64, height: 64 }, scene, false)
  const g = tex.getContext() as CanvasRenderingContext2D
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grad.addColorStop(0, inner)
  grad.addColorStop(0.4, outer)
  grad.addColorStop(1, "rgba(0,0,0,0)")
  g.fillStyle = grad
  g.fillRect(0, 0, 64, 64)
  tex.hasAlpha = true
  tex.update(false)
  return tex
}

interface CarSlot {
  root: TransformNode
  meshes: AbstractMesh[]
  paint: StandardMaterial
  sparks: ParticleSystem | null
  emitter: Vector3
  flicker: number
}

export interface CarLook {
  throttle: number
  boost: boolean
  air: boolean
  down: boolean
}

export class CarFleet {
  private readonly slots: CarSlot[] = []
  private container: AssetContainer | null = null
  private readonly bodyMat: StandardMaterial
  private readonly glowMat: StandardMaterial
  private readonly outer: Mesh
  private readonly inner: Mesh
  private readonly outerMat: StandardMaterial
  private readonly innerMat: StandardMaterial
  private readonly hover: Mesh
  private readonly hoverMat: StandardMaterial
  private readonly hoverTex: DynamicTexture
  private readonly sparkTex: DynamicTexture
  private readonly outerBuf: Float32Array
  private readonly innerBuf: Float32Array
  private readonly hoverBuf: Float32Array
  private disposed = false
  private readonly tmpM = new Matrix()
  private readonly tmpQ = new Quaternion()
  private readonly tmpV = new Vector3()
  private readonly sc = new Vector3()
  private readonly at = new Vector3()
  ready: Promise<void>

  constructor(
    private readonly scene: Scene,
    colors: readonly string[],
    private readonly sparksFor: (i: number) => boolean,
  ) {
    ensureLoaders()
    this.bodyMat = new StandardMaterial("corrida-car-body", scene)
    this.bodyMat.diffuseColor = new Color3(1, 1, 1)
    this.bodyMat.specularColor = new Color3(0.35, 0.35, 0.38)
    this.bodyMat.specularPower = 40
    this.glowMat = new StandardMaterial("corrida-car-glow", scene)
    this.glowMat.diffuseColor = new Color3(0, 0, 0)
    this.glowMat.emissiveColor = new Color3(1, 1, 1)
    this.glowMat.disableLighting = true
    this.outer = flameCone("corrida-flame-out", scene)
    this.inner = flameCone("corrida-flame-in", scene)
    this.outerMat = flameMat("corrida-flame-out", scene, [1, 0.3, 0.04], 0.9)
    this.innerMat = flameMat("corrida-flame-in", scene, [1, 0.78, 0.38], 0.9)
    this.outer.material = this.outerMat
    this.inner.material = this.innerMat
    const n = colors.length * NOZZLES.length
    this.outerBuf = new Float32Array(n * 16)
    this.innerBuf = new Float32Array(n * 16)
    this.outer.thinInstanceSetBuffer("matrix", this.outerBuf, 16, false)
    this.inner.thinInstanceSetBuffer("matrix", this.innerBuf, 16, false)
    // brilho da flutuação: um quadrado deitado com a bolinha azul (sem sombra)
    this.hoverTex = softDot(scene, "corrida-hover", "rgba(140,235,255,0.9)", "rgba(60,170,255,0.35)")
    this.hoverMat = new StandardMaterial("corrida-hover", scene)
    this.hoverMat.diffuseColor = new Color3(0, 0, 0)
    this.hoverMat.emissiveTexture = this.hoverTex
    this.hoverMat.opacityTexture = this.hoverTex
    this.hoverMat.disableLighting = true
    this.hoverMat.alphaMode = Constants.ALPHA_ADD
    this.hoverMat.fogEnabled = false
    this.hover = CreateGround("corrida-hover", { width: 1, height: 1 }, scene)
    this.hover.material = this.hoverMat
    this.hover.isPickable = false
    this.hover.alwaysSelectAsActiveMesh = true
    this.hoverBuf = new Float32Array(colors.length * 16)
    this.hover.thinInstanceSetBuffer("matrix", this.hoverBuf, 16, false)
    this.sparkTex = softDot(scene, "corrida-spark", "rgba(255,240,200,1)", "rgba(255,120,30,0.8)")
    for (let i = 0; i < colors.length; i++) this.slots.push(this.makeSlot(i, colors[i]))
    this.ready = this.load()
  }

  private makeSlot(i: number, color: string): CarSlot {
    const root = new TransformNode(`corrida-car-${i}`, this.scene)
    const paint = new StandardMaterial(`corrida-car-paint-${i}`, this.scene)
    paint.diffuseColor = Color3.FromHexString(color).toLinearSpace().scale(1.15)
    paint.specularColor = new Color3(0.55, 0.55, 0.58)
    paint.specularPower = 64
    let sparks: ParticleSystem | null = null
    const emitter = new Vector3()
    if (this.sparksFor(i)) {
      sparks = new ParticleSystem(`corrida-sparks-${i}`, 160, this.scene)
      sparks.particleTexture = this.sparkTex
      sparks.emitter = emitter
      sparks.minEmitBox = new Vector3(-1.1, -0.15, 0)
      sparks.maxEmitBox = new Vector3(1.1, 0.15, 0)
      sparks.color1 = new Color4(1, 0.75, 0.3, 1)
      sparks.color2 = new Color4(1, 0.35, 0.08, 1)
      sparks.colorDead = new Color4(0.3, 0.05, 0, 0)
      sparks.minSize = 0.18
      sparks.maxSize = 0.55
      sparks.minLifeTime = 0.12
      sparks.maxLifeTime = 0.35
      sparks.emitRate = 0
      sparks.blendMode = ParticleSystem.BLENDMODE_ADD
      sparks.gravity = new Vector3(0, -4, 0)
      sparks.minEmitPower = 4
      sparks.maxEmitPower = 12
      sparks.updateSpeed = 1 / 60
      sparks.start()
    }
    return { root, meshes: [], paint, sparks, emitter, flicker: Math.random() * 10 }
  }

  private async load() {
    try {
      const c = await LoadAssetContainerAsync(CORRIDA_ASSETS + CAR_FILE, this.scene)
      if (this.disposed) {
        c.dispose()
        return
      }
      this.container = c
      for (const s of this.slots) {
        const inst = c.instantiateModelsToScene((n) => `${s.root.name}-${n}`, false, { doNotInstantiate: true })
        // o GLB olha para −z; a nave do jogo olha para +z
        const turn = new TransformNode(`${s.root.name}-turn`, this.scene)
        turn.parent = s.root
        turn.rotation.y = Math.PI
        for (const r of inst.rootNodes) r.parent = turn
        for (const m of turn.getChildMeshes(false)) {
          m.isPickable = false
          if (!m.getTotalVertices()) continue
          // o gltfpack deixa o nome no nó pai (hovercar_body/_paint/_glow)
          const tag = `${m.parent?.name ?? ""} ${m.name}`
          m.material = /paint/i.test(tag) ? s.paint : /glow/i.test(tag) ? this.glowMat : this.bodyMat
          ;(m as Mesh).useVertexColors = true
          ;(m as Mesh).hasVertexAlpha = false
          s.meshes.push(m)
        }
      }
    } catch (err) {
      if (!this.disposed) console.warn("[corrida] nave não carregou", err)
    }
  }

  /** Põe a nave i na pose e acende o fogo dela. */
  place(i: number, pose: CarPose, look: CarLook, dt: number) {
    const s = this.slots[i]
    if (!s) return
    s.flicker += dt * 30
    const visible = !look.down
    if (s.root.isEnabled() !== visible) s.root.setEnabled(visible)
    const bob = look.air ? 0 : Math.sin(s.flicker * 0.12 + i) * 0.05
    s.root.position.set(pose.x, pose.y + HOVER + bob, pose.z)
    Quaternion.RotationYawPitchRollToRef(pose.yaw, -pose.pitch, -pose.roll, this.tmpQ)
    if (!s.root.rotationQuaternion) s.root.rotationQuaternion = new Quaternion()
    s.root.rotationQuaternion.copyFrom(this.tmpQ)
    s.root.computeWorldMatrix(true)
    const world = s.root.getWorldMatrix()
    // chamas: comprimento pelo acelerador e pelo turbo, tremendo
    const base = look.down ? 0 : look.boost ? 3.4 : 0.55 + look.throttle * 1.15
    for (let k = 0; k < NOZZLES.length; k++) {
      const [x, y, z, size] = NOZZLES[k]
      const wob = 1 + Math.sin(s.flicker + k * 1.7) * 0.12 + Math.sin(s.flicker * 2.3 + k) * 0.08
      const len = base * wob * size
      const r = (look.boost ? 0.24 : 0.17) * size
      const j = (i * NOZZLES.length + k) * 16
      Matrix.ComposeToRef(this.sc.set(r, r, Math.max(0.001, len)), IDENTITY, this.at.set(x, y, z), this.tmpM)
      this.tmpM.multiplyToArray(world, this.outerBuf, j)
      Matrix.ComposeToRef(this.sc.set(r * 0.55, r * 0.55, Math.max(0.001, len * 0.6)), IDENTITY, this.at.set(x, y, z - 0.02), this.tmpM)
      this.tmpM.multiplyToArray(world, this.innerBuf, j)
    }
    // brilho da flutuação (deitado no chão, perto quando no chão)
    const hs = look.down ? 0.0001 : look.air ? 0.0001 : 3.4
    Quaternion.FromEulerAnglesToRef(-pose.pitch, pose.yaw, 0, this.tmpQ)
    Matrix.ComposeToRef(this.sc.set(hs * 0.8, 1, hs * 1.4), this.tmpQ, this.at.set(pose.x, pose.y + 0.06, pose.z), this.tmpM)
    this.tmpM.copyToArray(this.hoverBuf, i * 16)
    if (s.sparks) {
      Vector3.TransformCoordinatesFromFloatsToRef(0, 0.45, -2.5, world, s.emitter)
      s.sparks.emitRate = look.boost && !look.down ? 220 : 0
      // as faíscas saem para trás da nave
      Vector3.TransformNormalFromFloatsToRef(0, 0.2, -1, world, this.tmpV)
      s.sparks.direction1 = this.tmpV.clone().addInPlaceFromFloats(-0.3, 0, -0.3)
      s.sparks.direction2 = this.tmpV.clone().addInPlaceFromFloats(0.3, 0.4, 0.3)
    }
  }

  /** Depois de pôr todas as naves no quadro. */
  flush() {
    this.outer.thinInstanceBufferUpdated("matrix")
    this.inner.thinInstanceBufferUpdated("matrix")
    this.hover.thinInstanceBufferUpdated("matrix")
  }

  /** Nó de uma nave (a câmera segue). */
  node(i: number): TransformNode {
    return this.slots[i].root
  }

  dispose() {
    this.disposed = true
    for (const s of this.slots) {
      s.sparks?.dispose(false)
      for (const m of s.meshes) m.dispose()
      s.root.dispose()
      s.paint.dispose()
    }
    this.container?.dispose()
    this.outer.dispose()
    this.inner.dispose()
    this.hover.dispose()
    for (const m of [this.bodyMat, this.glowMat, this.outerMat, this.innerMat, this.hoverMat]) m.dispose()
    this.hoverTex.dispose()
    this.sparkTex.dispose()
  }
}
