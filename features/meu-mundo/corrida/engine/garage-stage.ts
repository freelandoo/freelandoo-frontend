// features/meu-mundo/corrida/engine/garage-stage.ts — CORRIDA (mm3d-49): o PALCO da garagem.
//
// Como o palco do vestuário (engine/skin-stage.ts): um canvas transparente
// por cima da imagem do hangar ("Air Race", do Alex), com a nave flutuando
// sobre o círculo do chão. A imagem e o canvas usam o MESMO enquadramento
// (`garageLayout`): a nave fica no círculo em qualquer proporção de tela; no
// celular em pé a imagem sobe para o painel caber embaixo.
//
// Toda nave entra como HOLOGRAMA (o plugin do vestuário, na cor dela) e, já
// revelada, uma linha sobe e ela vira a nave de verdade (materialize). Gira
// sozinha devagar; arrastar gira à mão. Motor e cena próprios: fechar a
// garagem descarta tudo.

import { Engine } from "@babylonjs/core/Engines/engine"
import { Scene } from "@babylonjs/core/scene"
import { TargetCamera } from "@babylonjs/core/Cameras/targetCamera"
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight"
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { Material } from "@babylonjs/core/Materials/material"
import { Texture } from "@babylonjs/core/Materials/Textures/texture"
import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader"
import type { AssetContainer } from "@babylonjs/core/assetContainer"
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder"
import { TransformNode } from "@babylonjs/core/Meshes/transformNode"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh"
import { Constants } from "@babylonjs/core/Engines/constants"
import { ensureLoaders } from "../../engine/avatars"
import { HoloPlugin, beamTexture, ringTexture, shadowTexture } from "../../engine/skin-stage"
import { makeGlass, makeShipPaint } from "./car-view"
import { SHIP_ASSETS, shipArt } from "./ship-art"

/** A imagem do hangar e o círculo do chão nela (px da imagem). */
export const GARAGE = { w: 1672, h: 941, cx: 836, cy: 652, r: 280 } as const
const FOV = (22 * Math.PI) / 180
/** A câmera olha de cima um pouco (a perspectiva do chão da imagem). */
const ELEV = (11 * Math.PI) / 180
/** Comprimento das naves (m) e altura em que flutuam. */
const SHIP_LEN = 4.2
const FLOAT = 0.42
const SOLID_SPEED = 0.7

export interface GarageLayout {
  /** A imagem: posição e largura (px de tela). */
  img: { left: number; top: number; width: number; height: number }
  /** O centro do círculo na tela e o tamanho da nave (px por metro). */
  cx: number
  cy: number
  ppm: number
  /** Em pé: o painel vai embaixo. */
  portrait: boolean
}

/**
 * Enquadramento único da imagem e da nave. Deitado: a imagem cobre a tela e
 * desliza para o círculo ficar no meio do espaço livre à esquerda do painel.
 * Em pé: a imagem ocupa ~70% da altura e o painel fica embaixo.
 */
export function garageLayout(W: number, H: number, panelW: number): GarageLayout {
  const portrait = W / H < 0.9
  let s: number
  let left: number
  let top: number
  if (portrait) {
    s = Math.max((H * 0.7) / GARAGE.h, W / GARAGE.w)
    top = 0
    left = W / 2 - GARAGE.cx * s
  } else {
    s = Math.max(W / GARAGE.w, H / GARAGE.h)
    top = (H - GARAGE.h * s) / 2
    const want = (W - panelW) / 2
    left = Math.min(0, Math.max(W - GARAGE.w * s, want - GARAGE.cx * s))
  }
  const width = GARAGE.w * s
  const cx = left + GARAGE.cx * s
  const cy = top + GARAGE.cy * s
  // a nave bem maior que o círculo (o Alex achou pequena a 2,15 r), sem
  // passar da tela livre nem da altura
  const free = portrait ? W : (W - panelW) * 0.9
  const ppm = Math.min((GARAGE.r * 3 * s) / SHIP_LEN, free / SHIP_LEN, (H * 0.8) / SHIP_LEN)
  return { img: { left, top, width, height: GARAGE.h * s }, cx, cy, ppm, portrait }
}

const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3)
const clamp01 = (x: number) => Math.min(1, Math.max(0, x))

export class GarageStage {
  private readonly engine: Engine
  private readonly scene: Scene
  private readonly camera: TargetCamera
  private readonly pivot: TransformNode
  private readonly spin: TransformNode
  private readonly base: Mesh
  private readonly beam: Mesh
  private readonly baseMat: StandardMaterial
  private readonly beamMat: StandardMaterial
  private readonly shadow: Mesh
  private readonly ro: ResizeObserver
  private container: AssetContainer | null = null
  private meshes: AbstractMesh[] = []
  private mats: Material[] = []
  private textures: Texture[] = []
  private plugins: HoloPlugin[] = []
  private seq = 0
  private disposed = false
  private t = 0
  private sinceShow = 0
  private enter = 1
  private holo = false
  private solidTarget = 0
  private glitch = 0
  private glitchTimer = 2
  private dragging = false
  private lastX = 0
  private velocity = 0
  private idle = 4
  private height = 1
  private layoutNow: GarageLayout | null = null
  private readonly unbind: () => void

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly reduced: boolean,
    private panelW: number,
    /** A nave terminou de materializar (o botão "Escolher" acende). */
    private readonly onSolid?: () => void,
  ) {
    ensureLoaders()
    this.engine = new Engine(canvas, true, { stencil: false, premultipliedAlpha: true, alpha: true, preserveDrawingBuffer: false }, false)
    this.engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio || 1, 1.75))
    const scene = (this.scene = new Scene(this.engine))
    scene.clearColor = new Color4(0, 0, 0, 0)
    scene.skipPointerMovePicking = true
    scene.skipPointerDownPicking = true
    scene.skipPointerUpPicking = true
    this.camera = new TargetCamera("garage-cam", new Vector3(0, 0, -10), scene)
    this.camera.fov = FOV
    this.camera.minZ = 0.1

    // hangar branco e claro, neon azul por trás
    const hemi = new HemisphericLight("garage-hemi", new Vector3(0.1, 1, -0.3), scene)
    hemi.intensity = 1.05
    hemi.diffuse = new Color3(1, 1, 1)
    hemi.groundColor = new Color3(0.45, 0.55, 0.8)
    const key = new DirectionalLight("garage-key", new Vector3(-0.4, -0.7, 0.6), scene)
    key.intensity = 0.9
    key.specular = new Color3(1, 1, 1)
    const rim = new DirectionalLight("garage-rim", new Vector3(0.5, -0.2, -1), scene)
    rim.intensity = 0.5
    rim.diffuse = new Color3(0.35, 0.6, 1)

    this.pivot = new TransformNode("garage-pivot", scene)
    this.spin = new TransformNode("garage-spin", scene)
    this.spin.parent = this.pivot

    const sm = new StandardMaterial("garage-shadow", scene)
    sm.diffuseTexture = shadowTexture(scene)
    sm.useAlphaFromDiffuseTexture = true
    sm.disableLighting = true
    sm.emissiveColor = Color3.Black()
    this.shadow = MeshBuilder.CreateGround("garage-shadow", { width: 3.4, height: 4.8 }, scene)
    this.shadow.material = sm
    this.shadow.parent = this.pivot
    this.shadow.position.y = 0.01

    this.baseMat = new StandardMaterial("garage-base", scene)
    this.baseMat.diffuseTexture = ringTexture(scene)
    this.baseMat.opacityTexture = this.baseMat.diffuseTexture
    this.baseMat.disableLighting = true
    this.baseMat.alphaMode = Constants.ALPHA_ADD
    this.baseMat.backFaceCulling = false
    this.base = MeshBuilder.CreateGround("garage-base", { width: 5, height: 5 }, scene)
    this.base.material = this.baseMat
    this.base.parent = this.pivot
    this.base.position.y = 0.02

    this.beamMat = new StandardMaterial("garage-beam", scene)
    this.beamMat.diffuseTexture = beamTexture(scene)
    this.beamMat.opacityTexture = this.beamMat.diffuseTexture
    this.beamMat.disableLighting = true
    this.beamMat.alphaMode = Constants.ALPHA_ADD
    this.beamMat.backFaceCulling = false
    this.beamMat.disableDepthWrite = true
    this.beam = MeshBuilder.CreateCylinder("garage-beam", { diameterTop: 5, diameterBottom: 4.6, height: 1.9, tessellation: 48, cap: 0 }, scene)
    this.beam.material = this.beamMat
    this.beam.parent = this.pivot
    this.beam.position.y = 0.95
    for (const m of [this.shadow, this.base, this.beam]) m.isPickable = false

    this.unbind = this.bindDrag()
    this.ro = new ResizeObserver(() => this.layout())
    this.ro.observe(canvas)
    this.layout()
    this.engine.runRenderLoop(() => this.frame())
  }

  /** Largura reservada ao painel (deitado); muda o enquadramento. */
  setPanel(w: number) {
    this.panelW = w
    this.layout()
  }

  get frame0(): GarageLayout | null {
    return this.layoutNow
  }

  /** Mostra uma nave: entra como holograma e materializa sozinha. Trocas rápidas: vale a última. */
  async show(id: string) {
    const my = ++this.seq
    const art = shipArt(id)
    const tex = new Texture(SHIP_ASSETS + art.full.tex, this.scene, { invertY: false })
    tex.anisotropicFilteringLevel = 4
    const nrm = art.full.normal ? new Texture(SHIP_ASSETS + art.full.normal, this.scene, { invertY: false }) : null
    let c: AssetContainer | null = null
    try {
      c = await LoadAssetContainerAsync(SHIP_ASSETS + art.full.glb, this.scene)
      await new Promise<void>((r) => (tex.isReady() ? r() : tex.onLoadObservable.addOnce(() => r())))
    } catch (err) {
      console.warn("[garagem] nave não carregou", id, err)
    }
    if (this.disposed || my !== this.seq || !c) {
      c?.dispose()
      tex.dispose()
      nrm?.dispose()
      return
    }
    this.clearShip()
    this.container = c
    this.textures = nrm ? [tex, nrm] : [tex]
    const inst = c.instantiateModelsToScene((n) => `garage-${n}`, false, { doNotInstantiate: true })
    const turn = new TransformNode("garage-turn", this.scene)
    turn.parent = this.spin
    turn.rotation.y = Math.PI
    for (const r of inst.rootNodes) r.parent = turn
    const holoColor = Color3.FromHexString(art.holo.color)
    const holoAccent = Color3.FromHexString(art.holo.accent)
    const paint = makeShipPaint(this.scene, art, true, art.holo.color, tex, nrm)
    const mats: Material[] = [paint]
    let glass: StandardMaterial | null = null
    // altura medida sem a escala da entrada (o holograma normaliza por ela)
    this.spin.scaling.setAll(1)
    this.spin.computeWorldMatrix(true)
    let top = 0
    for (const m of turn.getChildMeshes(false)) {
      m.isPickable = false
      if (!m.getTotalVertices()) continue
      if (m.name.includes("vidro")) m.material = glass ??= makeGlass(this.scene, art.holo.accent)
      else m.material = paint
      m.computeWorldMatrix(true)
      m.refreshBoundingInfo({})
      top = Math.max(top, m.getBoundingInfo().boundingBox.maximumWorld.y)
      this.meshes.push(m)
    }
    if (glass) mats.push(glass)
    for (const mat of mats) {
      const p = new HoloPlugin(mat)
      p.color = holoColor
      p.accent = holoAccent
      this.plugins.push(p)
    }
    this.mats = mats
    this.height = Math.max(0.5, top - this.spin.getAbsolutePosition().y)
    this.baseMat.diffuseColor = holoColor
    this.beamMat.diffuseColor = holoColor
    this.setHolo(true)
    this.sinceShow = 0
    this.enter = this.reduced ? 1 : 0
    this.idle = 4
  }

  private setHolo(on: boolean) {
    this.holo = on
    this.solidTarget = on ? 0 : 1.02
    for (const p of this.plugins) p.solid = on ? 0 : 1.02
    for (const m of this.mats) {
      m.transparencyMode = on ? Material.MATERIAL_ALPHABLEND : Material.MATERIAL_OPAQUE
      m.needDepthPrePass = on
    }
  }

  private clearShip() {
    for (const m of this.meshes) m.dispose()
    this.meshes = []
    for (const m of this.mats) m.dispose(false, false)
    this.mats = []
    this.plugins = []
    for (const t of this.textures) t.dispose()
    this.textures = []
    this.container?.dispose()
    this.container = null
    for (const n of this.spin.getChildren()) n.dispose()
  }

  private bindDrag() {
    const c = this.canvas
    const down = (e: PointerEvent) => {
      this.dragging = true
      this.lastX = e.clientX
      this.velocity = 0
      c.setPointerCapture(e.pointerId)
    }
    const move = (e: PointerEvent) => {
      if (!this.dragging) return
      const dx = e.clientX - this.lastX
      this.lastX = e.clientX
      const r = -dx * 0.01
      this.spin.rotation.y += r
      this.velocity = r * 60
      this.idle = 0
    }
    const up = () => (this.dragging = false)
    c.addEventListener("pointerdown", down)
    c.addEventListener("pointermove", move)
    c.addEventListener("pointerup", up)
    c.addEventListener("pointercancel", up)
    return () => {
      c.removeEventListener("pointerdown", down)
      c.removeEventListener("pointermove", move)
      c.removeEventListener("pointerup", up)
      c.removeEventListener("pointercancel", up)
    }
  }

  /** Câmera e posição da nave pelo enquadramento (o mesmo da imagem). */
  private layout() {
    const W = this.canvas.clientWidth || window.innerWidth
    const H = this.canvas.clientHeight || window.innerHeight
    this.engine.resize()
    const L = (this.layoutNow = garageLayout(W, H, this.panelW))
    const dist = H / (L.ppm * 2 * Math.tan(FOV / 2))
    this.camera.position.set(0, Math.sin(ELEV) * dist, -Math.cos(ELEV) * dist)
    this.camera.setTarget(Vector3.Zero())
    // o centro do círculo na tela vira deslocamento no plano da câmera
    const dx = (L.cx - W / 2) / L.ppm
    const dy = -(L.cy - H / 2) / L.ppm
    this.pivot.position.set(dx, dy * Math.cos(ELEV), dy * Math.sin(ELEV))
  }

  private frame() {
    const dt = Math.min(this.engine.getDeltaTime() / 1000, 0.1)
    this.t += dt
    if (this.meshes.length) {
      if (!this.dragging) {
        this.idle += dt
        this.velocity *= Math.exp(-dt * 3)
        const auto = this.idle > 2.5 && !this.reduced ? 0.35 : 0
        this.spin.rotation.y += (this.velocity + auto * Math.min(1, (this.idle - 2.5) / 1.5)) * dt
      }
      if (this.enter < 1) {
        this.enter = Math.min(1, this.enter + dt / 0.9)
        const e = easeOutCubic(this.enter)
        this.spin.scaling.setAll(0.7 + 0.3 * e)
        this.spin.rotation.y += (1 - e) * dt * 7
      }
      const t = (this.sinceShow += dt)
      const solid = this.plugins[0]?.solid ?? 1.02
      const solidK = clamp01(solid)
      const bob = this.reduced ? 0 : Math.sin(this.t * 1.6) * 0.06
      this.spin.position.y = FLOAT + bob + (1 - easeOutCubic(this.enter)) * 0.5
      this.glitchTimer -= dt
      if (this.glitchTimer <= 0) {
        this.glitch = 1
        this.glitchTimer = 2.5 + Math.random() * 4
      }
      this.glitch = Math.max(0, this.glitch - dt * 6)
      const reveal = this.holo ? (t < 0.2 ? 0 : easeOutCubic(Math.min((t - 0.2) / 1.3, 1)) * 1.01) : 1.01
      // revelado o holograma, a nave materializa sozinha
      if (this.holo && this.solidTarget === 0 && t > 1.9) this.solidTarget = 1.02
      let next = solid
      if (solid < this.solidTarget) next = Math.min(this.solidTarget, solid + dt * SOLID_SPEED)
      const feet = this.spin.getAbsolutePosition().y - 0.05
      for (const p of this.plugins) {
        p.time = this.t
        p.glitch = this.glitch
        p.reveal = reveal
        p.feet = feet
        p.height = this.height * this.spin.scaling.y + 0.1
        p.solid = next
      }
      if (this.holo && next >= 1.02) {
        this.setHolo(false)
        this.onSolid?.()
      }
      const show = this.holo ? 1 - solidK : 0
      const baseIn = this.holo ? easeOutCubic(Math.min(t / 0.5, 1)) : 0
      this.base.visibility = baseIn * show
      this.base.scaling.setAll(0.2 + 0.8 * baseIn)
      this.base.rotation.y += dt * 0.4
      this.beam.visibility = clamp01((t - 0.15) / 0.5) * show * 0.85
      this.shadow.visibility = 0.55 * (1 - show)
    } else {
      this.base.visibility = 0
      this.beam.visibility = 0
      this.shadow.visibility = 0
    }
    this.scene.render()
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    this.seq++
    this.unbind()
    this.ro.disconnect()
    this.engine.stopRenderLoop()
    this.clearShip()
    this.scene.dispose()
    this.engine.dispose()
  }
}
