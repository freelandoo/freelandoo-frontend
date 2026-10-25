// features/meu-mundo/engine/player-select.ts — tocar em OUTRO jogador
// (mm3d-31): escolher quem foi tocado e destacá-lo só para quem tocou.
//
// Escolha na TELA, não por raio na malha: pés e cabeça de cada boneco são
// projetados e o toque precisa cair no retângulo dele (o mais perto da
// câmera vence). Vale com malha leve (LOD), malha deformada pela animação e
// boneco montado, sem custo de pick por triângulo.
//
// Destaque: um anel rubi no chão (malha sem luz) e uma cápsula escura com o
// nome e a bolinha verde (textura pintada uma vez), os dois filhos do boneco
// — andam junto sem nada por quadro. Uma seleção por vez: marcar outro tira
// o anterior.

import type { Scene } from "@babylonjs/core/scene"
import type { Camera } from "@babylonjs/core/Cameras/camera"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector"
import type { Character } from "./player"

/** Altura da cabeça acima dos pés (m) — a mesma para todos os corpos, com folga. */
const HEAD = 1.8
/** Toque a mais em volta do retângulo do boneco (px), para dedo. */
const SLOP = 10

export interface ScreenBox {
  /** centro horizontal (px CSS, janela) */
  x: number
  /** topo da cabeça e pés (px CSS, janela) */
  top: number
  bottom: number
}

/** Boneco tocado (para o card de perfil). `box` = onde ele está na tela agora. */
export interface PlayerTap {
  sessionId: string
  name: string
  box: ScreenBox | null
}

/** Outro jogador como as cenas guardam (RemotePlayer). */
interface Selectable {
  char: Character
  name: string
}

export class PlayerSelection {
  private ring: Mesh
  private disc: Mesh
  private tag: Mesh | null = null
  private tagMat: StandardMaterial | null = null
  private tagTex: DynamicTexture | null = null
  private marked: Character | null = null
  private sid: string | null = null
  private label = ""
  private readonly tmp = new Vector3()

  constructor(
    private readonly scene: Scene,
    private readonly canvas: HTMLCanvasElement,
    private readonly camera: () => Camera,
  ) {
    const ringMat = new StandardMaterial("mm-sel-ring-mat", scene)
    ringMat.disableLighting = true
    ringMat.emissiveColor = Color3.FromHexString("#E0245E")
    ringMat.alpha = 0.95
    this.ring = MeshBuilder.CreateTorus("mm-sel-ring", { diameter: 1.05, thickness: 0.06, tessellation: 40 }, scene)
    this.ring.material = ringMat
    const discMat = new StandardMaterial("mm-sel-disc-mat", scene)
    discMat.disableLighting = true
    discMat.emissiveColor = Color3.FromHexString("#AD1644")
    discMat.alpha = 0.22
    this.disc = MeshBuilder.CreateDisc("mm-sel-disc", { radius: 0.5, tessellation: 32 }, scene)
    this.disc.rotation.x = Math.PI / 2
    this.disc.material = discMat
    for (const m of [this.ring, this.disc]) {
      m.isPickable = false
      m.setEnabled(false)
    }
  }

  /** Quem está sob o toque (x, y em px CSS da janela), entre os visíveis. */
  pick<T extends { char: Character }>(list: Iterable<[string, T]>, x: number, y: number): string | null {
    let best: string | null = null
    let bestDepth = Infinity
    for (const [sid, r] of list) {
      if (!r.char.holder.isEnabled()) continue
      const b = this.project(r.char, true)
      if (!b) continue
      const half = Math.max(16, (b.bottom - b.top) * 0.28) + SLOP
      if (Math.abs(x - b.x) > half || y < b.top - SLOP || y > b.bottom + SLOP) continue
      if (b.depth < bestDepth) {
        bestDepth = b.depth
        best = sid
      }
    }
    return best
  }

  /** Retângulo do boneco na tela (null = atrás da câmera). */
  screenBox(char: Character): ScreenBox | null {
    const b = this.project(char, false)
    return b ? { x: b.x, top: b.top, bottom: b.bottom } : null
  }

  private project(char: Character, needDepth: boolean) {
    const engine = this.scene.getEngine()
    const cam = this.camera()
    const rw = engine.getRenderWidth()
    const rh = engine.getRenderHeight()
    const vp = cam.viewport.toGlobal(rw, rh)
    const tm = this.scene.getTransformMatrix()
    const p = char.holder.getAbsolutePosition()
    const foot = Vector3.Project(p, Matrix.IdentityReadOnly, tm, vp)
    this.tmp.set(p.x, p.y + HEAD, p.z)
    const head = Vector3.Project(this.tmp, Matrix.IdentityReadOnly, tm, vp)
    if (foot.z < 0 || foot.z > 1 || head.z < 0 || head.z > 1) return null
    const rect = this.canvas.getBoundingClientRect()
    const k = rect.width / rw
    return {
      x: rect.left + ((foot.x + head.x) / 2) * k,
      top: rect.top + Math.min(head.y, foot.y) * k,
      bottom: rect.top + Math.max(head.y, foot.y) * k,
      depth: needDepth ? Vector3.Distance(cam.globalPosition, p) : 0,
    }
  }

  /**
   * Toques do quadro → quem foi tocado. undefined = nenhum toque; null =
   * toque no vazio (fecha o card). Vale o último toque.
   */
  takeTap(taps: { x: number; y: number }[], remotes: Map<string, Selectable>): PlayerTap | null | undefined {
    if (!taps.length) return undefined
    const t = taps[taps.length - 1]
    taps.length = 0
    const sid = this.pick(remotes, t.x, t.y)
    const r = sid ? remotes.get(sid) : undefined
    if (!sid || !r) return null
    return { sessionId: sid, name: r.name, box: this.screenBox(r.char) }
  }

  /** Destaca a sessão `sid` entre `remotes` (null ou ausente = ninguém). */
  selectIn(remotes: Map<string, Selectable>, sid: string | null) {
    const r = sid ? remotes.get(sid) : undefined
    this.sid = r ? sid : null
    this.mark(r?.char ?? null, r?.name ?? "")
  }

  /**
   * ANTES de descartar o boneco de `sid`: o destaque é filho dele (o
   * dispose do Babylon leva os filhos junto). true = era o selecionado.
   */
  release(sid: string) {
    if (this.sid !== sid) return false
    this.sid = null
    this.mark(null)
    return true
  }

  /** Nome mudou na sala: repinta a cápsula de quem está marcado. */
  rename(sid: string, name: string) {
    if (this.sid === sid && this.marked && name !== this.label) this.mark(this.marked, name)
  }

  /** Destaca `char` (ou ninguém). `label` = nome da cápsula. */
  mark(char: Character | null, label = "") {
    if (this.marked && this.marked !== char) this.marked.setTagHidden(false)
    this.marked = char
    if (!char) {
      for (const m of [this.ring, this.disc, this.tag]) {
        if (!m) continue
        m.parent = null
        m.setEnabled(false)
      }
      return
    }
    if (label !== this.label || !this.tag) this.paintTag(label)
    char.setTagHidden(true)
    this.ring.parent = char.holder
    this.ring.position.set(0, 0.11, 0)
    this.disc.parent = char.holder
    this.disc.position.set(0, 0.1, 0)
    this.ring.setEnabled(true)
    this.disc.setEnabled(true)
    if (this.tag) {
      this.tag.parent = char.holder
      this.tag.position.set(0, 2.15, 0)
      this.tag.setEnabled(true)
    }
  }

  get markedChar() {
    return this.marked
  }

  get selected() {
    return this.sid
  }

  /** Cápsula: fundo escuro translúcido, bolinha verde (online) e o nome em branco. */
  private paintTag(text: string) {
    this.label = text
    const W = 512
    const H = 112
    if (!this.tagTex) {
      this.tagTex = new DynamicTexture("mm-sel-tag", { width: W, height: H }, this.scene, false)
      this.tagTex.hasAlpha = true
      this.tagMat = new StandardMaterial("mm-sel-tag-mat", this.scene)
      this.tagMat.diffuseTexture = this.tagTex
      this.tagMat.emissiveColor = new Color3(1, 1, 1)
      this.tagMat.disableLighting = true
      this.tagMat.useAlphaFromDiffuseTexture = true
      this.tagMat.backFaceCulling = false
      this.tag = MeshBuilder.CreatePlane("mm-sel-tag", { width: 1.9, height: 0.42 }, this.scene)
      this.tag.material = this.tagMat
      this.tag.billboardMode = 7
      this.tag.isPickable = false
      this.tag.setEnabled(false)
    }
    const ctx = this.tagTex.getContext() as unknown as CanvasRenderingContext2D
    ctx.clearRect(0, 0, W, H)
    ctx.font = "700 46px system-ui, -apple-system, Segoe UI, sans-serif"
    const label = text.length > 22 ? `${text.slice(0, 21)}…` : text
    const tw = Math.min(W - 110, ctx.measureText(label).width)
    const w = tw + 104
    const x0 = (W - w) / 2
    const r = 40
    ctx.fillStyle = "rgba(16, 19, 25, 0.78)"
    ctx.beginPath()
    ctx.moveTo(x0 + r, 16)
    ctx.arcTo(x0 + w, 16, x0 + w, 96, r)
    ctx.arcTo(x0 + w, 96, x0, 96, r)
    ctx.arcTo(x0, 96, x0, 16, r)
    ctx.arcTo(x0, 16, x0 + w, 16, r)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = "rgba(255,255,255,0.18)"
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.fillStyle = "#38E881"
    ctx.beginPath()
    ctx.arc(x0 + 44, 56, 13, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = "#FFFFFF"
    ctx.textAlign = "left"
    ctx.textBaseline = "middle"
    ctx.fillText(label, x0 + 72, 58, W - 120)
    this.tagTex.update(true)
  }

  dispose() {
    this.sid = null
    this.mark(null)
    this.ring.material?.dispose()
    this.ring.dispose()
    this.disc.material?.dispose()
    this.disc.dispose()
    this.tag?.dispose()
    this.tagMat?.dispose()
    this.tagTex?.dispose()
  }
}
