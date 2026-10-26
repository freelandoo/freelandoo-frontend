// features/meu-mundo/engine/skin-stage.ts — o PALCO do vestuário (mm3d-16).
//
// Um canvas transparente por cima da imagem do palco (object-fit: cover), com
// o personagem de pé no pedestal, respirando (Idle) e girando quando se
// arrasta. Posição e escala saem do recorte "cover" da imagem (STAGE), então
// os pés ficam no pedestal em qualquer proporção de tela — porte do
// PedestalViewer da RA da Casa Views (three.js) para o Babylon do jogo.
//
// Skin que a pessoa NÃO tem aparece como HOLOGRAMA (o mesmo esquema do Sergio
// rosa da Casa Views: fresnel, scanlines, varredura, tremida, base e feixe).
// Comprou: uma linha sobe pelo corpo e, abaixo dela, o holograma vira o
// personagem de verdade (materialize). O holograma é um plugin de material
// sobre o material do avatar — assim ele segue o esqueleto animado.
//
// O corpo vem do AvatarLibrary do jogo (mesmos arquivos, mesmas animações).
// Este palco tem motor e cena próprios: fechar o vestuário descarta tudo.

import { Engine } from "@babylonjs/core/Engines/engine"
import { Scene } from "@babylonjs/core/scene"
import { TargetCamera } from "@babylonjs/core/Cameras/targetCamera"
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight"
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { Material } from "@babylonjs/core/Materials/material"
import { MaterialPluginBase } from "@babylonjs/core/Materials/materialPluginBase"
import type { MaterialDefines } from "@babylonjs/core/Materials/materialDefines"
import type { UniformBuffer } from "@babylonjs/core/Materials/uniformBuffer"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder"
import { TransformNode } from "@babylonjs/core/Meshes/transformNode"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import { Constants } from "@babylonjs/core/Engines/constants"
import { AvatarLibrary, tintedAvatarTexture, type AvatarRig } from "./avatars"
import { STAGE } from "../skins"
import type { BodyId } from "../types"

const FOV = (24 * Math.PI) / 180
/** O holograma flutua um pouco acima do pedestal (como na RA). */
const HOLO_LIFT = 0.07
/** Velocidade da linha que solidifica (altura por segundo). */
const SOLID_SPEED = 0.42
/** Do topo do esqueleto (HeadTop_End) ao topo do cabelo. */
const HAIR = 1.06

// ═══ holograma: plugin do material do avatar ═══════════════════════════════
// A = (pés y, altura, tempo, tremida) · B = (revelado, sólido, opacidade, —)
// C = cor · D = destaque. Alturas normalizadas: 0 nos pés, 1 no topo.
class HoloPlugin extends MaterialPluginBase {
  feet = 0
  height = 1
  time = 0
  glitch = 0
  reveal = 0
  solid = 0
  opacity = 1
  color = new Color3(1, 0.17, 0.57)
  accent = new Color3(1, 0.82, 0.91)

  constructor(material: Material) {
    super(material, "MmHolo", 200, { MMHOLO: false })
    this._enable(true)
  }

  getClassName() {
    return "MmHoloPlugin"
  }

  prepareDefines(defines: MaterialDefines) {
    defines["MMHOLO"] = true
  }

  getUniforms() {
    return {
      ubo: [
        { name: "mmHoloA", size: 4, type: "vec4" },
        { name: "mmHoloB", size: 4, type: "vec4" },
        { name: "mmHoloC", size: 3, type: "vec3" },
        { name: "mmHoloD", size: 3, type: "vec3" },
      ],
      vertex: "uniform vec4 mmHoloA;",
      fragment: "uniform vec4 mmHoloA;\nuniform vec4 mmHoloB;\nuniform vec3 mmHoloC;\nuniform vec3 mmHoloD;",
    }
  }

  bindForSubMesh(ubo: UniformBuffer) {
    ubo.updateFloat4("mmHoloA", this.feet, this.height, this.time, this.glitch)
    ubo.updateFloat4("mmHoloB", this.reveal, this.solid, this.opacity, 0)
    ubo.updateColor3("mmHoloC", this.color)
    ubo.updateColor3("mmHoloD", this.accent)
  }

  getCustomCode(shaderType: string): { [pointName: string]: string } | null {
    if (shaderType === "vertex") {
      return {
        CUSTOM_VERTEX_DEFINITIONS: "varying float mmHoloY;",
        CUSTOM_VERTEX_MAIN_END: "mmHoloY = (worldPos.y - mmHoloA.x) / mmHoloA.y;",
      }
    }
    if (shaderType === "fragment") {
      return {
        CUSTOM_FRAGMENT_DEFINITIONS: "varying float mmHoloY;",
        CUSTOM_FRAGMENT_MAIN_BEGIN: "if (mmHoloY > mmHoloB.x) discard;",
        // Mesma receita do holograma da RA (features/acasaviews/ra/hologram.ts).
        CUSTOM_FRAGMENT_BEFORE_FRAGCOLOR: `
          if (mmHoloY > mmHoloB.y) {
            vec3 mmV = normalize(vEyePosition.xyz - vPositionW);
            float fres = pow(1.0 - clamp(abs(dot(normalW, mmV)), 0.0, 1.0), 2.2);
            float lum = smoothstep(0.02, 0.6, dot(baseColor.rgb, vec3(0.299, 0.587, 0.114)));
            float t = mmHoloA.z;
            float scan = 0.72 + 0.28 * sin(mmHoloY * 420.0 - t * 7.0);
            float sweep = exp(-pow((mmHoloY - fract(t * 0.28) * 1.3 + 0.15) * 22.0, 2.0));
            float flicker = 0.93 + 0.07 * sin(t * 41.0) * sin(t * 17.0) - mmHoloA.w * 0.25;
            float edge = (1.0 - step(0.999, mmHoloB.x)) * smoothstep(mmHoloB.x - 0.025, mmHoloB.x, mmHoloY)
                       + step(0.001, mmHoloB.y) * smoothstep(mmHoloB.y + 0.03, mmHoloB.y, mmHoloY);
            vec3 hc = mmHoloC * (0.35 + 1.1 * lum) * scan + mmHoloD * (fres * 1.3 + sweep * 0.9 + edge * 3.0);
            float ha = clamp((0.28 + 0.55 * lum * scan + fres * 0.9 + sweep * 0.45 + edge) * flicker * mmHoloB.z, 0.0, 1.0);
            color = vec4(hc, ha);
          } else {
            float seam = (1.0 - step(1.0, mmHoloB.y)) * smoothstep(mmHoloB.y - 0.06, mmHoloB.y, mmHoloY);
            color = vec4(color.rgb + mix(mmHoloC, mmHoloD, seam) * seam * 2.5, 1.0);
          }`,
      }
    }
    return null
  }
}

// ═══ peças do holograma: base com anéis e feixe ════════════════════════════
function ringTexture(scene: Scene) {
  const S = 256
  const tex = new DynamicTexture("mm-skin-ring", { width: S, height: S }, scene, true)
  tex.hasAlpha = true
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D
  ctx.clearRect(0, 0, S, S)
  const c = S / 2
  const glow = ctx.createRadialGradient(c, c, 0, c, c, c)
  glow.addColorStop(0, "rgba(255,255,255,0.55)")
  glow.addColorStop(0.6, "rgba(255,255,255,0.12)")
  glow.addColorStop(1, "rgba(255,255,255,0)")
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, S, S)
  ctx.strokeStyle = "white"
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.arc(c, c, c * 0.95, 0, Math.PI * 2)
  ctx.stroke()
  ctx.lineWidth = 3
  ctx.setLineDash([22, 16])
  ctx.beginPath()
  ctx.arc(c, c, c * 0.8, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([3, 10])
  ctx.lineWidth = 8
  ctx.beginPath()
  ctx.arc(c, c, c * 0.68, 0, Math.PI * 2)
  ctx.stroke()
  tex.update(true)
  return tex
}

function beamTexture(scene: Scene) {
  const tex = new DynamicTexture("mm-skin-beam", { width: 128, height: 128 }, scene, true)
  tex.hasAlpha = true
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D
  ctx.clearRect(0, 0, 128, 128)
  for (let x = 0; x < 128; x++) {
    const streak = 0.55 + 0.45 * Math.sin(x * 0.9) * Math.sin(x * 0.27)
    const g = ctx.createLinearGradient(0, 128, 0, 0)
    g.addColorStop(0, `rgba(255,255,255,${0.3 * streak})`)
    g.addColorStop(1, "rgba(255,255,255,0)")
    ctx.fillStyle = g
    ctx.fillRect(x, 0, 1, 128)
  }
  tex.update(true)
  return tex
}

function shadowTexture(scene: Scene) {
  const tex = new DynamicTexture("mm-skin-shadow", { width: 64, height: 64 }, scene, false)
  tex.hasAlpha = true
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, "rgba(0,0,0,0.6)")
  g.addColorStop(1, "rgba(0,0,0,0)")
  ctx.clearRect(0, 0, 64, 64)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  tex.update(true)
  return tex
}

const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3)
const clamp01 = (x: number) => Math.min(1, Math.max(0, x))

export interface StageLook {
  body: BodyId
  /** true = holograma (skin que a pessoa ainda não tem) */
  holo: boolean
  color: string
  accent: string
  /** Cores do personagem (mm3d-36); "" = textura original. */
  look?: string
}

export class SkinStage {
  private readonly engine: Engine
  private readonly scene: Scene
  private readonly camera: TargetCamera
  private readonly lib: AvatarLibrary
  private readonly pivot: TransformNode
  private readonly spin: TransformNode
  private readonly holder: TransformNode
  private readonly base: Mesh
  private readonly beam: Mesh
  private readonly baseMat: StandardMaterial
  private readonly beamMat: StandardMaterial
  private readonly shadow: Mesh
  private readonly ro: ResizeObserver
  private rig: AvatarRig | null = null
  private mats: StandardMaterial[] = []
  private plugins: HoloPlugin[] = []
  private seq = 0
  private disposed = false
  private t = 0
  private sinceShow = 0
  private enter = 1
  private holo = false
  private solidTarget = 0
  private solidDone: (() => void) | null = null
  private glitch = 0
  private glitchTimer = 2
  // arrasto
  private dragging = false
  private lastX = 0
  private velocity = 0
  private idle = 4
  private readonly unbind: () => void

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly reduced: boolean,
  ) {
    // premultipliedAlpha: o holograma escreve cor já multiplicada pela
    // transparência e o canvas fica por cima da imagem do palco.
    this.engine = new Engine(canvas, true, { stencil: false, premultipliedAlpha: true, alpha: true, preserveDrawingBuffer: false }, false)
    this.engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio || 1, 1.5))
    const scene = (this.scene = new Scene(this.engine))
    scene.clearColor = new Color4(0, 0, 0, 0)
    scene.skipPointerMovePicking = true
    scene.skipPointerDownPicking = true
    scene.skipPointerUpPicking = true
    this.camera = new TargetCamera("mm-skin-cam", new Vector3(0, 0, -10), scene)
    this.camera.fov = FOV
    this.camera.minZ = 0.05
    this.camera.setTarget(Vector3.Zero())

    const hemi = new HemisphericLight("mm-skin-hemi", new Vector3(0.2, 1, -0.4), scene)
    hemi.intensity = 0.85
    hemi.groundColor = new Color3(0.35, 0.18, 0.24)
    // o neon do palco banha o personagem por trás
    const rim = new DirectionalLight("mm-skin-rim", new Vector3(0.6, -0.3, 1), scene)
    rim.intensity = 0.55
    rim.diffuse = new Color3(1, 0.2, 0.4)

    this.pivot = new TransformNode("mm-skin-pivot", scene)
    this.spin = new TransformNode("mm-skin-spin", scene)
    this.spin.parent = this.pivot
    this.holder = new TransformNode("mm-skin-holder", scene)
    this.holder.parent = this.spin
    this.lib = new AvatarLibrary(scene)

    // sombra de contato (personagem sólido)
    const sm = new StandardMaterial("mm-skin-shadow", scene)
    sm.diffuseTexture = shadowTexture(scene)
    sm.useAlphaFromDiffuseTexture = true
    sm.disableLighting = true
    sm.emissiveColor = Color3.Black()
    this.shadow = MeshBuilder.CreateGround("mm-skin-shadow", { width: 0.7, height: 0.5 }, scene)
    this.shadow.material = sm
    this.shadow.parent = this.pivot
    this.shadow.position.y = 0.004

    // base com anéis e feixe (holograma)
    this.baseMat = new StandardMaterial("mm-skin-base", scene)
    this.baseMat.diffuseTexture = ringTexture(scene)
    this.baseMat.opacityTexture = this.baseMat.diffuseTexture
    this.baseMat.disableLighting = true
    this.baseMat.alphaMode = Constants.ALPHA_ADD
    this.baseMat.backFaceCulling = false
    this.base = MeshBuilder.CreateGround("mm-skin-base", { width: 0.9, height: 0.9 }, scene)
    this.base.material = this.baseMat
    this.base.parent = this.pivot
    this.base.position.y = 0.006

    this.beamMat = new StandardMaterial("mm-skin-beam", scene)
    this.beamMat.diffuseTexture = beamTexture(scene)
    this.beamMat.opacityTexture = this.beamMat.diffuseTexture
    this.beamMat.disableLighting = true
    this.beamMat.alphaMode = Constants.ALPHA_ADD
    this.beamMat.backFaceCulling = false
    this.beamMat.disableDepthWrite = true
    this.beam = MeshBuilder.CreateCylinder("mm-skin-beam", { diameterTop: 0.92, diameterBottom: 0.8, height: 1.3, tessellation: 48, cap: 0 }, scene)
    this.beam.material = this.beamMat
    this.beam.parent = this.pivot
    this.beam.position.y = 0.65
    for (const m of [this.shadow, this.base, this.beam]) m.isPickable = false

    this.unbind = this.bindDrag()
    this.ro = new ResizeObserver(() => this.layout())
    this.ro.observe(canvas)
    this.layout()
    this.engine.runRenderLoop(() => this.frame())
  }

  /**
   * Mostra um corpo (holograma ou sólido). Trocas rápidas: vale a última.
   * `quiet` (mm3d-36): só mudaram as cores — sem a animação de entrada.
   */
  async show(look: StageLook, quiet = false) {
    const my = ++this.seq
    // A textura pintada antes do clone do material (o clone leva a textura da hora).
    await tintedAvatarTexture(look.body, look.look ?? "")?.catch(() => null)
    const rig = await this.lib.create(look.body, look.look ?? "")
    await Promise.resolve()
    if (this.disposed || my !== this.seq) {
      rig.dispose()
      return
    }
    this.clearRig()
    this.rig = rig
    // Altura pelos ossos (a caixa da malha com esqueleto não serve): pés no
    // pedestal e figura com altura 1 — medida antes de pendurar (raiz na
    // origem, pose de repouso). O cabelo passa um pouco do topo da cabeça.
    let minY = Infinity
    let maxY = -Infinity
    rig.root.computeWorldMatrix(true)
    for (const n of rig.root.getDescendants(false)) {
      if (!(n instanceof TransformNode)) continue
      n.computeWorldMatrix(true)
      if (!n.name.startsWith("mixamorig:")) continue
      const y = n.getAbsolutePosition().y
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y)
    }
    rig.setParent(this.holder)
    const H = maxY - minY > 0.1 ? (maxY - minY) * HAIR : 1.8
    const s = 1 / H
    this.holder.scaling.setAll(s)
    this.holder.position.y = -minY * s

    const color = Color3.FromHexString(look.color)
    const accent = Color3.FromHexString(look.accent)
    const byMat = new Map<Material, StandardMaterial>()
    for (const m of rig.meshes) {
      const src = m.material as StandardMaterial | null
      if (!src) continue
      let mat = byMat.get(src)
      if (!mat) {
        mat = src.clone(`${src.name}-stage`) as StandardMaterial
        // O clone de uma DynamicTexture (cores, mm3d-36) nasce vazia e nunca
        // fica pronta — a malha some. Usa as texturas da fonte (compartilhadas).
        mat.diffuseTexture = src.diffuseTexture
        mat.emissiveTexture = src.emissiveTexture
        const p = new HoloPlugin(mat)
        p.color = color
        p.accent = accent
        this.plugins.push(p)
        this.mats.push(mat)
        byMat.set(src, mat)
      }
      m.material = mat
    }
    this.setHolo(look.holo)
    if (quiet) return
    this.sinceShow = 0
    this.enter = this.reduced ? 1 : 0
    this.idle = 4
  }

  /** "Comprou": a linha sobe e o holograma vira o personagem. */
  materialize(): Promise<void> {
    if (!this.holo) return Promise.resolve()
    this.solidTarget = 1.02
    if (this.reduced) {
      for (const p of this.plugins) p.solid = 1.02
      this.setHolo(false)
      return Promise.resolve()
    }
    return new Promise((r) => (this.solidDone = r))
  }

  private setHolo(on: boolean) {
    this.holo = on
    this.solidTarget = on ? 0 : 1.02
    for (const p of this.plugins) p.solid = on ? 0 : 1.02
    for (const m of this.mats) {
      // Holograma: transparente, com passada de profundidade (só a superfície da frente aparece).
      m.transparencyMode = on ? Material.MATERIAL_ALPHABLEND : Material.MATERIAL_OPAQUE
      m.needDepthPrePass = on
    }
  }

  private clearRig() {
    this.rig?.dispose()
    this.rig = null
    for (const m of this.mats) m.dispose(false, false)
    this.mats = []
    this.plugins = []
    this.solidDone?.()
    this.solidDone = null
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
      const r = -dx * 0.012
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

  /** Câmera e pés a partir do recorte "cover" do palco (como o coverLayout da RA). */
  private layout() {
    const W = this.canvas.clientWidth || window.innerWidth
    const H = this.canvas.clientHeight || window.innerHeight
    this.engine.resize()
    const s = Math.max(W / STAGE.w, H / STAGE.h)
    const feetX = (W - STAGE.w * s) / 2 + STAGE.feetX * s
    const feetY = (H - STAGE.h * s) / 2 + STAGE.feetY * s
    const figurePx = STAGE.figure * s
    const dist = H / (figurePx * 2 * Math.tan(FOV / 2))
    this.camera.position.set(0, 0, -dist)
    this.camera.setTarget(Vector3.Zero())
    this.pivot.position.set((feetX - W / 2) / figurePx, -(feetY - H / 2) / figurePx, 0)
  }

  private frame() {
    const dt = Math.min(this.engine.getDeltaTime() / 1000, 0.1)
    this.t += dt
    const rig = this.rig
    if (rig) {
      rig.update(dt, 0, 0)
      if (!this.dragging) {
        this.idle += dt
        this.velocity *= Math.exp(-dt * 3)
        const auto = this.idle > 2.5 && !this.reduced ? 0.5 : 0
        this.spin.rotation.y += (this.velocity + auto * Math.min(1, (this.idle - 2.5) / 1.5)) * dt
      }
      if (this.enter < 1) {
        this.enter = Math.min(1, this.enter + dt / 0.9)
        const e = easeOutCubic(this.enter)
        this.spin.scaling.setAll(0.6 + 0.4 * e)
        this.spin.rotation.y += (1 - e) * dt * 9
      }
      const t = (this.sinceShow += dt)
      const solid = this.plugins[0]?.solid ?? 1
      const solidK = clamp01(solid)
      const lift = this.holo ? HOLO_LIFT * (1 - solidK) + Math.sin(this.t * 1.3) * 0.012 * (1 - solidK) : 0
      this.spin.position.y = lift + (1 - easeOutCubic(this.enter)) * 0.35
      this.glitchTimer -= dt
      if (this.glitchTimer <= 0) {
        this.glitch = 1
        this.glitchTimer = 2.5 + Math.random() * 4
      }
      this.glitch = Math.max(0, this.glitch - dt * 6)
      const reveal = this.holo ? (t < 0.3 ? 0 : easeOutCubic(Math.min((t - 0.3) / 2.2, 1)) * 1.01) : 1.01
      const feet = this.spin.getAbsolutePosition().y
      const height = this.spin.scaling.y
      let next = solid
      if (solid < this.solidTarget) next = Math.min(this.solidTarget, solid + dt * SOLID_SPEED)
      for (const p of this.plugins) {
        p.time = this.t
        p.glitch = this.glitch
        p.reveal = reveal
        p.feet = feet
        p.height = height
        p.solid = next
      }
      if (this.holo && next >= 1.02) {
        this.setHolo(false)
        navigator.vibrate?.([20, 40, 20])
        this.solidDone?.()
        this.solidDone = null
      }
      // base e feixe só enquanto há holograma
      const show = this.holo ? 1 - solidK : 0
      const baseIn = this.holo ? easeOutCubic(Math.min(t / 0.5, 1)) : 0
      this.base.visibility = baseIn * show
      this.base.scaling.setAll(0.2 + 0.8 * baseIn)
      this.base.rotation.y += dt * 0.4
      this.beam.visibility = clamp01((t - 0.2) / 0.6) * show
      this.shadow.visibility = 1 - show
      // sem luz, a cor do material tinge a textura branca
      this.baseMat.diffuseColor = this.plugins[0]?.color ?? Color3.White()
      this.beamMat.diffuseColor = this.baseMat.diffuseColor
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
    this.clearRig()
    this.lib.dispose()
    this.scene.dispose()
    this.engine.dispose()
  }
}
