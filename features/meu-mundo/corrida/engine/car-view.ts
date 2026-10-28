// features/meu-mundo/corrida/engine/car-view.ts — CORRIDA (mm3d-39/41): as naves e o FOGO.
//
// mm3d-41: a nave é a do Tripo (pipeline/corrida/build_nave_tripo.py), uma
// malha com textura de cor. Duas versões: a CHEIA (14,3 mil triângulos,
// textura 1024) só na nave deste aparelho e a LEVE (4,3 mil, textura 512
// assada) nas outras. O material é montado aqui: o vermelho da textura vira a
// cor de cada nave e os filetes ciano acendem (plugin `NaveTint`), com um
// contorno de luz (fresnel) para a nave ler de noite. Cada nave é um clone;
// as chamas dos QUATRO bocais (2 grandes nos cantos, 2 menores no meio) são
// de GÁS (flame.ts): transparentes, esticam com a velocidade e curvam nas
// curvas. O turbo ainda solta faíscas de fogo (sistema de partículas por nave).
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
import { CreatePlane } from "@babylonjs/core/Meshes/Builders/planeBuilder"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import type { Material } from "@babylonjs/core/Materials/material"
import type { MaterialDefines } from "@babylonjs/core/Materials/materialDefines"
import { MaterialPluginBase } from "@babylonjs/core/Materials/materialPluginBase"
import { FresnelParameters } from "@babylonjs/core/Materials/fresnelParameters"
import type { UniformBuffer } from "@babylonjs/core/Materials/uniformBuffer"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { Texture } from "@babylonjs/core/Materials/Textures/texture"
import { ParticleSystem } from "@babylonjs/core/Particles/particleSystem"
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color"
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector"
import { Constants } from "@babylonjs/core/Engines/constants"
import { ensureLoaders } from "../../engine/avatars"
import { createFlames, type FlameBank } from "./flame"
import type { CarPose } from "../sim/race"

export const CORRIDA_ASSETS = "/meu-mundo/corrida/"
/** Nave cheia e leve; cada uma com a sua textura (o GLB vem sem material). */
const SHIP = { full: { glb: "nave-m41.glb", tex: "nave-m41.jpg" }, lod: { glb: "nave-m41-lod.glb", tex: "nave-m41-lod.jpg" } }
const IDENTITY = Quaternion.Identity()
/** Flutuação acima do chão (m). */
export const HOVER = 0.55

/**
 * Bocais no quadro da nave (bico em +z): x, y, z da boca, raio da chama e o
 * comprimento relativo. Medidos na malha (relatório do build_nave_tripo.py).
 */
const NOZZLES: [number, number, number, number, number][] = [
  [-1.026, 0.535, -1.76, 0.16, 1],
  [1.026, 0.535, -1.76, 0.16, 1],
  [-0.354, 0.7, -1.76, 0.11, 0.72],
  [0.354, 0.7, -1.76, 0.11, 0.72],
]
/** Traseira (faíscas do turbo). */
const TAIL_Z = -1.9

// ═══ tinta da nave: o vermelho da textura vira a cor da nave ═══════════════
// O vermelho é reconhecido pela própria cor (r bem acima de g e b), então não
// há máscara para baixar; os filetes ciano (b acima de r) viram luz.
class NaveTint extends MaterialPluginBase {
  tint = new Color3(1, 0.2, 0.2)
  glow = new Color3(0.35, 0.9, 1)

  constructor(material: Material) {
    super(material, "MmNave", 200, { MMNAVE: false })
    this._enable(true)
  }

  getClassName() {
    return "MmNavePlugin"
  }

  prepareDefines(defines: MaterialDefines) {
    defines["MMNAVE"] = true
  }

  getUniforms() {
    return {
      ubo: [
        { name: "mmNaveTint", size: 3, type: "vec3" },
        { name: "mmNaveGlow", size: 3, type: "vec3" },
      ],
      fragment: "uniform vec3 mmNaveTint;\nuniform vec3 mmNaveGlow;",
    }
  }

  bindForSubMesh(ubo: UniformBuffer) {
    ubo.updateColor3("mmNaveTint", this.tint)
    ubo.updateColor3("mmNaveGlow", this.glow)
  }

  getCustomCode(shaderType: string): { [pointName: string]: string } | null {
    if (shaderType !== "fragment") return null
    return {
      CUSTOM_FRAGMENT_MAIN_BEGIN: "float mmNaveLit = 0.0;",
      CUSTOM_FRAGMENT_UPDATE_DIFFUSE: `{
        vec3 mmC = baseColor.rgb;
        float mmRed = smoothstep(0.10, 0.28, mmC.r - max(mmC.g, mmC.b));
        float mmHi = max(mmC.r, max(mmC.g, mmC.b));
        baseColor.rgb = mix(mmC, mmNaveTint * (0.3 + 0.95 * mmHi), mmRed);
        mmNaveLit = smoothstep(0.05, 0.18, mmC.b - mmC.r) * smoothstep(0.3, 0.6, mmC.b);
      }`,
      CUSTOM_FRAGMENT_BEFORE_FOG: "color.rgb += mmNaveGlow * mmNaveLit * 1.4;",
    }
  }
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
  /** Nave cheia (a deste aparelho) ou leve. */
  full: boolean
  paint: StandardMaterial
  sparks: ParticleSystem | null
  emitter: Vector3
  flicker: number
  /** Comprimento da chama (suavizado) e a curva da ponta (m, para o lado). */
  flameLen: number
  bend: number
  lastYaw: number | null
}

export interface CarLook {
  throttle: number
  /** Velocidade de 0 a 1 (1 = teto do turbo): a chama estica com ela. */
  speed: number
  boost: boolean
  air: boolean
  down: boolean
}

export class CarFleet {
  private readonly slots: CarSlot[] = []
  private readonly containers: AssetContainer[] = []
  private readonly textures: Partial<Record<"full" | "lod", Texture>> = {}
  private readonly flames: FlameBank
  private clock = 0
  private readonly hover: Mesh
  private readonly hoverMat: StandardMaterial
  private readonly hoverTex: DynamicTexture
  private readonly sparkTex: DynamicTexture
  private readonly hoverBuf: Float32Array
  /** Brilho na boca de cada bocal: quadrado que olha para a câmera. */
  private readonly glow: Mesh
  private readonly glowMat: StandardMaterial
  private readonly glowTex: DynamicTexture
  private readonly glowBuf: Float32Array
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
    /** Quem usa a nave cheia (a deste aparelho); as outras usam a leve. */
    private readonly fullFor: (i: number) => boolean,
  ) {
    ensureLoaders()
    this.flames = createFlames(scene, colors.length * NOZZLES.length)
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
    this.glowTex = softDot(scene, "corrida-nozzle-glow", "rgba(255,250,235,1)", "rgba(255,150,50,0.55)")
    this.glowMat = new StandardMaterial("corrida-nozzle-glow", scene)
    this.glowMat.diffuseColor = new Color3(0, 0, 0)
    this.glowMat.emissiveTexture = this.glowTex
    this.glowMat.opacityTexture = this.glowTex
    this.glowMat.disableLighting = true
    this.glowMat.alphaMode = Constants.ALPHA_ADD
    this.glowMat.disableDepthWrite = true
    this.glowMat.fogEnabled = false
    this.glowMat.backFaceCulling = false
    this.glow = CreatePlane("corrida-nozzle-glow", { size: 1 }, scene)
    this.glow.material = this.glowMat
    this.glow.isPickable = false
    this.glow.alwaysSelectAsActiveMesh = true
    this.glowBuf = new Float32Array(colors.length * NOZZLES.length * 16)
    this.glow.thinInstanceSetBuffer("matrix", this.glowBuf, 16, false)
    for (let i = 0; i < colors.length; i++) this.slots.push(this.makeSlot(i, colors[i]))
    this.ready = this.load()
  }

  private texture(kind: "full" | "lod"): Texture {
    let t = this.textures[kind]
    if (!t) {
      // UV do glTF: sem inverter o v
      t = new Texture(CORRIDA_ASSETS + SHIP[kind].tex, this.scene, { invertY: false })
      t.anisotropicFilteringLevel = kind === "full" ? 4 : 1
      this.textures[kind] = t
    }
    return t
  }

  private makeSlot(i: number, color: string): CarSlot {
    const root = new TransformNode(`corrida-car-${i}`, this.scene)
    const full = this.fullFor(i)
    const paint = new StandardMaterial(`corrida-car-paint-${i}`, this.scene)
    paint.diffuseTexture = this.texture(full ? "full" : "lod")
    paint.diffuseColor = new Color3(1, 1, 1)
    paint.specularColor = new Color3(0.5, 0.52, 0.6)
    paint.specularPower = 48
    // o Tripo exporta dos dois lados (algumas faces vêm viradas)
    paint.backFaceCulling = false
    // contorno de luz: a nave se destaca da pista à noite (barato, sem pós)
    paint.emissiveColor = new Color3(1, 1, 1)
    paint.emissiveFresnelParameters = new FresnelParameters({
      leftColor: Color3.FromHexString(color).scale(0.3),
      rightColor: new Color3(0.04, 0.04, 0.07),
      power: 2.2,
      bias: 0.05,
    })
    const tint = new NaveTint(paint)
    tint.tint = Color3.FromHexString(color)
    let sparks: ParticleSystem | null = null
    const emitter = new Vector3()
    if (this.sparksFor(i)) {
      // brasas: saem sempre, mais com a velocidade, uma chuva no turbo
      sparks = new ParticleSystem(`corrida-sparks-${i}`, 320, this.scene)
      sparks.particleTexture = this.sparkTex
      sparks.emitter = emitter
      sparks.minEmitBox = new Vector3(-1.1, -0.15, 0)
      sparks.maxEmitBox = new Vector3(1.1, 0.15, 0)
      sparks.color1 = new Color4(1, 0.75, 0.3, 1)
      sparks.color2 = new Color4(1, 0.35, 0.08, 1)
      sparks.colorDead = new Color4(0.3, 0.05, 0, 0)
      sparks.minSize = 0.1
      sparks.maxSize = 0.38
      sparks.minLifeTime = 0.25
      sparks.maxLifeTime = 0.7
      sparks.emitRate = 0
      sparks.blendMode = ParticleSystem.BLENDMODE_ADD
      sparks.gravity = new Vector3(0, 1.5, 0)
      sparks.minEmitPower = 4
      sparks.maxEmitPower = 12
      sparks.updateSpeed = 1 / 60
      sparks.start()
    }
    return { root, meshes: [], full, paint, sparks, emitter, flicker: Math.random() * 10, flameLen: 0, bend: 0, lastYaw: null }
  }

  private async load() {
    const kinds = (["full", "lod"] as const).filter((k) => this.slots.some((s) => s.full === (k === "full")))
    const loaded = await Promise.all(
      kinds.map(async (k) => {
        try {
          return [k, await LoadAssetContainerAsync(CORRIDA_ASSETS + SHIP[k].glb, this.scene)] as const
        } catch (err) {
          if (!this.disposed) console.warn("[corrida] nave não carregou", k, err)
          return [k, null] as const
        }
      }),
    )
    const byKind = new Map<string, AssetContainer>()
    for (const [k, c] of loaded) {
      if (!c) continue
      if (this.disposed) c.dispose()
      else {
        this.containers.push(c)
        byKind.set(k, c)
      }
    }
    if (this.disposed) return
    for (const s of this.slots) {
      // sem a versão pedida, a outra serve (a textura vai junto)
      const want = s.full ? "full" : "lod"
      const c = byKind.get(want) ?? byKind.get(want === "full" ? "lod" : "full")
      if (!c) continue
      if (!byKind.has(want)) s.paint.diffuseTexture = this.texture(want === "full" ? "lod" : "full")
      const inst = c.instantiateModelsToScene((n) => `${s.root.name}-${n}`, false, { doNotInstantiate: true })
      // o GLB olha para −z; a nave do jogo olha para +z
      const turn = new TransformNode(`${s.root.name}-turn`, this.scene)
      turn.parent = s.root
      turn.rotation.y = Math.PI
      for (const r of inst.rootNodes) r.parent = turn
      for (const m of turn.getChildMeshes(false)) {
        m.isPickable = false
        if (!m.getTotalVertices()) continue
        m.material = s.paint
        s.meshes.push(m)
      }
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
    // chamas de gás (flame.ts): esticam com a velocidade, encolhem devagar,
    // turbo dá mais 50%; sem acelerar ficam curtas. Comprimento suavizado
    // (a chama não pula) e a ponta atrasa nas curvas pela velocidade de giro.
    // mm3d-41c: 3× no normal e até 6× rápido (o rabo afina no perfil do tubo)
    const old = (0.45 + 2.5 * Math.pow(look.speed, 1.15)) * (look.throttle > 0.05 ? 1 : 0.55)
    const want = look.down ? 0 : old * (3 + 3 * look.speed) * (look.boost ? 1.25 : 1)
    s.flameLen += (want - s.flameLen) * Math.min(1, dt * (want > s.flameLen ? 9 : 4))
    const yawRate = s.lastYaw === null || dt <= 0 ? 0 : wrapPi(pose.yaw - s.lastYaw) / dt
    s.lastYaw = pose.yaw
    const wantBend = Math.max(-4, Math.min(4, yawRate * s.flameLen * 0.35))
    s.bend += (wantBend - s.bend) * Math.min(1, dt * 6)
    const heat = look.boost ? 1 : 0
    for (let k = 0; k < NOZZLES.length; k++) {
      const [x, y, z, radius, size] = NOZZLES[k]
      const len = Math.max(0.001, s.flameLen * size)
      const r = radius * (look.boost ? 1.45 : 1.2)
      const j = i * NOZZLES.length + k
      Matrix.ComposeToRef(this.sc.set(r, r, len), IDENTITY, this.at.set(x, y, z), this.tmpM)
      this.tmpM.multiplyToArray(world, this.flames.matrices, j * 16)
      // curva em unidades locais (a escala do raio multiplica depois)
      const p = this.flames.params
      p[j * 4] = (s.bend * size) / r
      p[j * 4 + 1] = (look.air ? 0.35 : 0) / r
      p[j * 4 + 2] = look.down ? 0 : look.boost ? 1.05 : 0.85
      p[j * 4 + 3] = heat
      // brilho da boca, de frente para a câmera
      const g = look.down ? 0.0001 : r * (look.boost ? 7 : 3.2 + 2.6 * look.speed) * (0.9 + 0.1 * Math.sin(s.flicker * 1.7 + k))
      Vector3.TransformCoordinatesFromFloatsToRef(x, y, z - 0.05, world, this.tmpV)
      const camQ = this.scene.activeCamera?.absoluteRotation ?? IDENTITY
      Matrix.ComposeToRef(this.sc.set(g, g, g), camQ, this.tmpV, this.tmpM)
      this.tmpM.copyToArray(this.glowBuf, j * 16)
    }
    // brilho da flutuação (deitado no chão, perto quando no chão)
    const hs = look.down ? 0.0001 : look.air ? 0.0001 : 3.4
    Quaternion.FromEulerAnglesToRef(-pose.pitch, pose.yaw, 0, this.tmpQ)
    Matrix.ComposeToRef(this.sc.set(hs * 0.8, 1, hs * 1.4), this.tmpQ, this.at.set(pose.x, pose.y + 0.06, pose.z), this.tmpM)
    this.tmpM.copyToArray(this.hoverBuf, i * 16)
    if (s.sparks) {
      Vector3.TransformCoordinatesFromFloatsToRef(0, 0.6, TAIL_Z, world, s.emitter)
      s.sparks.emitRate = look.down ? 0 : 30 + 200 * look.speed + (look.boost ? 280 : 0)
      s.sparks.maxSize = look.boost ? 0.6 : 0.38
      // passo real do quadro (a cena usa delta constante; a 30 FPS seria meia velocidade)
      s.sparks.updateSpeed = Math.max(0.001, dt)
      // as faíscas saem para trás da nave
      Vector3.TransformNormalFromFloatsToRef(0, 0.2, -1, world, this.tmpV)
      s.sparks.direction1 = this.tmpV.clone().addInPlaceFromFloats(-0.3, 0, -0.3)
      s.sparks.direction2 = this.tmpV.clone().addInPlaceFromFloats(0.3, 0.4, 0.3)
    }
  }

  /** Depois de pôr todas as naves no quadro. */
  flush(dt: number) {
    this.clock += dt
    const cam = this.scene.activeCamera
    if (cam) this.flames.update(this.clock, cam.globalPosition)
    this.hover.thinInstanceBufferUpdated("matrix")
    this.glow.thinInstanceBufferUpdated("matrix")
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
    for (const c of this.containers) c.dispose()
    this.textures.full?.dispose()
    this.textures.lod?.dispose()
    this.flames.dispose()
    this.hover.dispose()
    this.hoverMat.dispose()
    this.glow.dispose()
    this.glowMat.dispose()
    this.glowTex.dispose()
    this.hoverTex.dispose()
    this.sparkTex.dispose()
  }
}

function wrapPi(a: number): number {
  while (a > Math.PI) a -= 2 * Math.PI
  while (a < -Math.PI) a += 2 * Math.PI
  return a
}
