// features/meu-mundo/engine/floor-lights.ts — LUZES NO CHÃO (2026-11-22).
//
// Pedido do Alex: Paint e Gincana com as luzes do chão do Rolê Noturno e da
// Antigravidade. Lá o piso tem uma textura de LUZ própria (o `deckGlow` dos
// biomas do Rolê): linhas acesas correndo ao longo da pista com um halo, o
// filete aceso perto da borda, setas de luz em degradê, pontinhos acesos e a
// emenda das chapas brilhando de leve.
//
// Aqui é UMA textura-atlas desenhada no canvas (nada para baixar) e UMA malha
// por cena (uma chamada de desenho para todas as plataformas/ilhas): faixas
// por cima do tampo, somadas à cor (ALPHA_ADD — preto não aparece), sem luz e
// sem neblina (néon atravessa a névoa; o mipmap apaga o fino de longe).
//
// Atlas (W × W/2):
//  - A, metade esquerda: UM período da pista (u = de lado a lado, v = ao
//    longo): linhas de pista, filetes de borda, seta, emenda e pontinhos.
//  - B, metade direita: o EMBLEMA redondo (ilha/disco): anel, raios, setas
//    para fora e coroa de pontinhos. Os cantos vazios do B guardam o PERFIL
//    de linha (halo → miolo → halo) que a faixa de contorno usa.

import type { Scene } from "@babylonjs/core/scene"
import { Mesh } from "@babylonjs/core/Meshes/mesh"
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { Texture } from "@babylonjs/core/Materials/Textures/texture"
import { Constants } from "@babylonjs/core/Engines/constants"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector"

export type RGB = readonly [number, number, number]

export interface FloorLightLook {
  /** Linhas de pista e filete da borda. */
  line: RGB
  /** Seta: cor da ponta e do pé (degradê). */
  chev: readonly [RGB, RGB]
  /** Pontinhos acesos (null = sem). */
  dot: RGB | null
  /** Emenda das chapas (atravessa a pista), fraca. null = sem. */
  seam: RGB | null
  /** Linhas de pista: posições de 0 a 1 de lado a lado (fora os filetes da borda). */
  lanes: readonly number[]
  /** Desenha a seta no período (no Paint e onde não há a seta amarela da regra). */
  chevrons: boolean
  /** Força geral (0–1,5). */
  k?: number
}

/** Perfil de linha no atlas (canto de baixo à esquerda do emblema): u de 0 a 1 = de fora a fora. */
const PROFILE = { u0: 0.505, u1: 0.565, v0: 0.03, v1: 0.09 }

const css = (c: RGB, a = 1, k = 1) => `rgba(${Math.round(Math.min(1, c[0] * k) * 255)},${Math.round(Math.min(1, c[1] * k) * 255)},${Math.round(Math.min(1, c[2] * k) * 255)},${a})`
const whiten = (c: RGB, t: number): RGB => [c[0] + (1 - c[0]) * t, c[1] + (1 - c[1]) * t, c[2] + (1 - c[2]) * t]

/** Linha com halo (três passadas: halo largo, corpo, miolo quase branco). */
function glowLine(g: CanvasRenderingContext2D, c: RGB, w: number, path: () => void) {
  g.lineCap = "round"
  g.lineJoin = "round"
  for (const [lw, a, t] of [
    [w * 5, 0.16, 0],
    [w * 2.4, 0.4, 0.1],
    [w, 1, 0.55],
  ] as const) {
    g.strokeStyle = css(whiten(c, t), a)
    g.lineWidth = lw
    g.beginPath()
    path()
    g.stroke()
  }
}

function dot(g: CanvasRenderingContext2D, c: RGB, x: number, y: number, r: number) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r * 3)
  gr.addColorStop(0, css(whiten(c, 0.7), 1))
  gr.addColorStop(0.3, css(c, 0.85))
  gr.addColorStop(1, css(c, 0))
  g.fillStyle = gr
  g.fillRect(x - r * 3, y - r * 3, r * 6, r * 6)
}

/** Seta "^" de luz (a do Rolê: degradê da ponta ao pé, halo). Ponta para cima no canvas = para a frente. */
function chevron(g: CanvasRenderingContext2D, look: FloorLightLook, cx: number, cy: number, s: number) {
  const shape = () => {
    g.beginPath()
    g.moveTo(cx, cy - 36 * s)
    g.lineTo(cx + 92 * s, cy + 34 * s)
    g.lineTo(cx + 64 * s, cy + 52 * s)
    g.lineTo(cx, cy + 4 * s)
    g.lineTo(cx - 64 * s, cy + 52 * s)
    g.lineTo(cx - 92 * s, cy + 34 * s)
    g.closePath()
  }
  g.save()
  g.shadowColor = css(look.chev[1], 0.9)
  g.shadowBlur = 18 * s
  const gr = g.createLinearGradient(0, cy - 40 * s, 0, cy + 56 * s)
  gr.addColorStop(0, css(whiten(look.chev[0], 0.35)))
  gr.addColorStop(1, css(look.chev[1], 0.85))
  g.fillStyle = gr
  shape()
  g.fill()
  g.restore()
}

function paintAtlas(g: CanvasRenderingContext2D, W: number, look: FloorLightLook) {
  const H = W / 2
  const S = H // lado de cada região
  const s = S / 512
  g.fillStyle = "#000"
  g.fillRect(0, 0, W, H)
  // ── A: um período da pista ──
  g.save()
  g.beginPath()
  g.rect(2, 2, S - 4, S - 4)
  g.clip()
  if (look.seam) {
    // emenda das chapas: atravessa a pista no começo do período, fraca, com 2 parafusos acesos
    glowLine(g, look.seam, 2.2 * s, () => {
      g.moveTo(-10, S - 3 * s)
      g.lineTo(S + 10, S - 3 * s)
    })
  }
  for (const u of look.lanes) glowLine(g, look.line, 4 * s, () => {
    g.moveTo(u * S, -20)
    g.lineTo(u * S, S + 20)
  })
  // filetes da borda (o "edge" do Rolê), mais grossos
  for (const u of [0.035, 0.965]) glowLine(g, look.line, 6 * s, () => {
    g.moveTo(u * S, -20)
    g.lineTo(u * S, S + 20)
  })
  if (look.dot) {
    const gaps = [0.035, ...look.lanes, 0.965].sort((a, b) => a - b)
    for (let i = 0; i < gaps.length - 1; i++) {
      const u = (gaps[i] + gaps[i + 1]) / 2
      if (gaps[i + 1] - gaps[i] < 0.12) continue
      for (const v of [0.22, 0.72]) dot(g, look.dot, u * S, v * S, 5 * s)
    }
  }
  if (look.chevrons) chevron(g, look, S / 2, S * 0.48, 1.25 * s)
  g.restore()

  // ── B: emblema redondo (centro em S + S/2, S/2; raio útil S/2) ──
  const cx = S + S / 2
  const cy = S / 2
  const R = S / 2 - 6 * s
  g.save()
  g.beginPath()
  g.rect(S + 2, 2, S - 4, S - 4)
  g.clip()
  glowLine(g, look.line, 4.5 * s, () => g.arc(cx, cy, R * 0.34, 0, Math.PI * 2))
  glowLine(g, look.line, 3 * s, () => g.arc(cx, cy, R * 0.1, 0, Math.PI * 2))
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2
    glowLine(g, look.line, 3 * s, () => {
      g.moveTo(cx + Math.cos(a) * R * 0.1, cy + Math.sin(a) * R * 0.1)
      g.lineTo(cx + Math.cos(a) * R * 0.34, cy + Math.sin(a) * R * 0.34)
    })
  }
  if (look.chevrons) {
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4
      g.save()
      g.translate(cx + Math.cos(a) * R * 0.62, cy + Math.sin(a) * R * 0.62)
      g.rotate(a + Math.PI / 2)
      chevron(g, look, 0, 0, 0.62 * s)
      g.restore()
    }
  }
  if (look.dot) {
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2
      dot(g, look.dot, cx + Math.cos(a) * R * 0.86, cy + Math.sin(a) * R * 0.86, 4.5 * s)
    }
  }
  g.restore()
  // perfil de linha (faixa de contorno), num canto vazio do emblema
  const px0 = PROFILE.u0 * W
  const px1 = PROFILE.u1 * W
  const py0 = (1 - PROFILE.v1) * H
  const py1 = (1 - PROFILE.v0) * H
  const gr = g.createLinearGradient(px0, 0, px1, 0)
  gr.addColorStop(0, css(look.line, 0))
  gr.addColorStop(0.3, css(look.line, 0.35))
  gr.addColorStop(0.5, css(whiten(look.line, 0.6), 1))
  gr.addColorStop(0.7, css(look.line, 0.35))
  gr.addColorStop(1, css(look.line, 0))
  g.fillStyle = gr
  g.fillRect(px0, py0 - 8, px1 - px0, py1 - py0 + 16)
}

/**
 * As luzes do chão de uma cena. Junte as faixas (`strip`), emblemas (`emblem`) e
 * contornos (`outline`), chame `build()` uma vez e `setLevel` (dia/noite) quando quiser.
 */
export class FloorLights {
  private pos: number[] = []
  private uvs: number[] = []
  private idx: number[] = []
  private mesh: Mesh | null = null
  private mat: StandardMaterial
  private tex: DynamicTexture
  private level = 1
  private readonly k: number

  constructor(
    private scene: Scene,
    name: string,
    look: FloorLightLook,
    opts: { low: boolean },
  ) {
    const W = opts.low ? 512 : 1024
    this.tex = new DynamicTexture(`${name}-floorlights`, { width: W, height: W / 2 }, scene, true, Texture.TRILINEAR_SAMPLINGMODE)
    this.tex.wrapU = Texture.CLAMP_ADDRESSMODE
    this.tex.wrapV = Texture.CLAMP_ADDRESSMODE
    this.tex.anisotropicFilteringLevel = opts.low ? 2 : 8
    paintAtlas(this.tex.getContext() as unknown as CanvasRenderingContext2D, W, look)
    this.tex.update(true)
    const m = new StandardMaterial(`${name}-floorlights`, scene)
    m.disableLighting = true
    m.diffuseColor = new Color3(0, 0, 0)
    m.specularColor = new Color3(0, 0, 0)
    m.emissiveTexture = this.tex
    m.emissiveColor = new Color3(0, 0, 0)
    m.alpha = 0.999
    m.alphaMode = Constants.ALPHA_ADD
    m.disableDepthWrite = true
    m.fogEnabled = false
    m.backFaceCulling = false
    m.zOffset = -2
    this.mat = m
    this.k = look.k ?? 1
    this.setLevel(1)
  }

  private quad(a: Vector3, b: Vector3, c: Vector3, d: Vector3, ua: readonly [number, number], ub: readonly [number, number], uc: readonly [number, number], ud: readonly [number, number]) {
    const base = this.pos.length / 3
    for (const p of [a, b, c, d]) this.pos.push(p.x, p.y, p.z)
    for (const u of [ua, ub, uc, ud]) this.uvs.push(u[0], u[1])
    this.idx.push(base, base + 1, base + 2, base, base + 2, base + 3)
  }

  /**
   * Faixa da pista num piso retangular: `frame` = quadro do piso (x de lado a lado,
   * z ao longo, para a frente = +z), largura `w`, comprimento `L`, altura local `y`.
   * Cada `period` metros repete o período do atlas (a seta e os pontinhos).
   */
  strip(frame: Matrix, w: number, L: number, y: number, period = 6) {
    if (w < 0.6 || L < 0.6) return
    const n = Math.max(1, Math.round(L / period))
    const seg = L / n
    const P = (x: number, z: number) => Vector3.TransformCoordinates(new Vector3(x, y, z), frame)
    const u0 = 0.004
    const u1 = 0.496
    for (let k = 0; k < n; k++) {
      const z0 = -L / 2 + k * seg
      const z1 = z0 + seg
      this.quad(P(-w / 2, z0), P(w / 2, z0), P(w / 2, z1), P(-w / 2, z1), [u0, 0.004], [u1, 0.004], [u1, 0.996], [u0, 0.996])
    }
  }

  /** Emblema redondo no chão (raio `r`, giro `rot`). */
  emblem(x: number, y: number, z: number, r: number, rot = 0) {
    if (r < 0.8) return
    const c = Math.cos(rot)
    const s = Math.sin(rot)
    const P = (lx: number, lz: number) => new Vector3(x + lx * c + lz * s, y, z - lx * s + lz * c)
    this.quad(P(-r, -r), P(r, -r), P(r, r), P(-r, r), [0.502, 0.004], [0.998, 0.004], [0.998, 0.996], [0.502, 0.996])
  }

  /**
   * Faixa acesa que acompanha um contorno fechado (ilha de qualquer forma), `inset`
   * metros para dentro da borda, `w` de largura. Pontos em x, z; altura `y`.
   */
  outline(ring: readonly (readonly [number, number])[], y: number, inset = 0.45, w = 0.5) {
    const n = ring.length
    if (n < 3) return
    let cx = 0
    let cz = 0
    for (const [x, z] of ring) {
      cx += x / n
      cz += z / n
    }
    const inner = (k: number, d: number): Vector3 => {
      const [x, z] = ring[k]
      const L = Math.hypot(x - cx, z - cz) || 1
      const t = Math.max(0, L - d) / L
      return new Vector3(cx + (x - cx) * t, y, cz + (z - cz) * t)
    }
    const va = PROFILE.v0
    const vb = PROFILE.v1
    for (let k = 0; k < n; k++) {
      const k2 = (k + 1) % n
      const ao = inner(k, inset - w / 2)
      const ai = inner(k, inset + w / 2)
      const bo = inner(k2, inset - w / 2)
      const bi = inner(k2, inset + w / 2)
      this.quad(ao, bo, bi, ai, [PROFILE.u0, va], [PROFILE.u0, vb], [PROFILE.u1, vb], [PROFILE.u1, va])
    }
  }

  /** Contorno de um retângulo no quadro `frame` (x de lado a lado, z ao longo), na altura local `y`. */
  rectOutline(frame: Matrix, w: number, L: number, y: number, inset = 0.45, lw = 0.5) {
    const pts: [number, number][] = []
    let ry = 0
    const push = (x: number, z: number) => {
      const v = Vector3.TransformCoordinates(new Vector3(x, y, z), frame)
      pts.push([v.x, v.z])
      ry += v.y
    }
    // passo de ~1,5 m nos lados (o contorno anda pelo centro: pontos espalhados dão a mesma faixa)
    const nx = Math.max(1, Math.round(w / 1.5))
    const nz = Math.max(1, Math.round(L / 1.5))
    for (let i = 0; i < nx; i++) push(-w / 2 + (w * i) / nx, -L / 2)
    for (let i = 0; i < nz; i++) push(w / 2, -L / 2 + (L * i) / nz)
    for (let i = 0; i < nx; i++) push(w / 2 - (w * i) / nx, L / 2)
    for (let i = 0; i < nz; i++) push(-w / 2, L / 2 - (L * i) / nz)
    this.outline(pts, ry / pts.length, inset, lw)
  }

  /** Contorno de um círculo (disco da Gincana). */
  ring(x: number, y: number, z: number, r: number, inset = 0.45, w = 0.5, sides = 40) {
    const pts: [number, number][] = []
    for (let k = 0; k < sides; k++) {
      const a = (k / sides) * Math.PI * 2
      pts.push([x + Math.sin(a) * r, z + Math.cos(a) * r])
    }
    this.outline(pts, y, inset, w)
  }

  get empty() {
    return this.idx.length === 0
  }

  build(name: string): Mesh | null {
    if (this.mesh || this.empty) return this.mesh
    const vd = new VertexData()
    vd.positions = this.pos
    vd.uvs = this.uvs
    vd.indices = this.idx
    vd.normals = this.pos.map((_, k) => (k % 3 === 1 ? 1 : 0))
    const m = new Mesh(name, this.scene)
    vd.applyToMesh(m)
    m.material = this.mat
    m.isPickable = false
    m.freezeWorldMatrix()
    m.doNotSyncBoundingInfo = true
    this.mesh = m
    this.pos = []
    this.uvs = []
    this.idx = []
    return m
  }

  /** Dia e noite: 0 apaga, 1 = o normal; com uma respiração lenta `t` (s). */
  setLevel(level: number, t = 0) {
    this.level = level
    const k = this.k * level * (0.9 + 0.1 * Math.sin(t * 1.7))
    // a cor emissiva SOMA com a textura no Babylon: fica preta e a força vai no level da textura
    this.tex.level = k
  }

  tick(t: number) {
    this.setLevel(this.level, t)
  }

  dispose() {
    this.mesh?.dispose()
    this.mat.dispose()
    this.tex.dispose()
  }
}
