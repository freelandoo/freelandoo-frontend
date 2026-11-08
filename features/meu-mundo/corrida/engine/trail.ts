// features/meu-mundo/corrida/engine/trail.ts — CORRIDA (mm3d-73): o RASTRO dos propulsores.
//
// Pedido do Alex: em velocidade alta, um rastro de luz curto que nasce na
// boca do motor, segue o caminho da nave e apaga aos poucos. Uma fita por
// bocal grande, todas numa MALHA SÓ (uma chamada de desenho): cada fita
// guarda as últimas posições num anel fixo (nada é criado por quadro), vira
// para a câmera e afina para a ponta. A força vem na cor do vértice (soma
// aditiva: preto = invisível); abaixo de ~55% da velocidade não aparece.
// Pulo grande de posição (renasceu, caiu) zera a fita.

import type { Scene } from "@babylonjs/core/scene"
import { Mesh } from "@babylonjs/core/Meshes/mesh"
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData"
import { VertexBuffer } from "@babylonjs/core/Buffers/buffer"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { Material } from "@babylonjs/core/Materials/material"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { Texture } from "@babylonjs/core/Materials/Textures/texture"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { Vector3 } from "@babylonjs/core/Maths/math.vector"
import { Constants } from "@babylonjs/core/Engines/constants"

/** Uma amostra a cada este tempo (s). */
const SAMPLE = 1 / 60

export class TrailBank {
  private readonly mesh: Mesh
  private readonly mat: StandardMaterial
  private readonly tex: DynamicTexture
  private readonly pos: Float32Array
  private readonly col: Float32Array
  /** Histórico de cada fita: N pontos (x, y, z), o mais novo em `head`. */
  private readonly hist: Float32Array[]
  private readonly head: number[]
  private readonly filled: number[]
  private readonly power: number[]
  private readonly acc: number[]
  private readonly tmp = new Vector3()
  private readonly side = new Vector3()

  constructor(
    scene: Scene,
    private readonly count: number,
    /** Pontos por fita (o comprimento). */
    private readonly N: number,
    /** Meia largura na boca (m). */
    private readonly width: number,
  ) {
    this.tex = new DynamicTexture("corrida-trail", { width: 64, height: 4 }, scene, false)
    const g = this.tex.getContext() as CanvasRenderingContext2D
    const grad = g.createLinearGradient(0, 0, 64, 0)
    grad.addColorStop(0, "#000000")
    grad.addColorStop(0.3, "#7a7a7a")
    grad.addColorStop(0.5, "#ffffff")
    grad.addColorStop(0.7, "#7a7a7a")
    grad.addColorStop(1, "#000000")
    g.fillStyle = grad
    g.fillRect(0, 0, 64, 4)
    this.tex.update(false)
    this.tex.wrapU = Texture.CLAMP_ADDRESSMODE
    this.mat = new StandardMaterial("corrida-trail", scene)
    this.mat.disableLighting = true
    this.mat.diffuseColor = new Color3(0, 0, 0)
    this.mat.specularColor = new Color3(0, 0, 0)
    this.mat.emissiveTexture = this.tex
    this.mat.backFaceCulling = false
    this.mat.disableDepthWrite = true
    this.mat.fogEnabled = false
    this.mat.transparencyMode = Material.MATERIAL_ALPHABLEND
    this.mat.alphaMode = Constants.ALPHA_ADD
    const verts = count * N * 2
    this.pos = new Float32Array(verts * 3)
    this.col = new Float32Array(verts * 4)
    const uv = new Float32Array(verts * 2)
    const idx: number[] = []
    for (let f = 0; f < count; f++)
      for (let k = 0; k < N; k++) {
        const v = (f * N + k) * 2
        uv[v * 2] = 0
        uv[v * 2 + 1] = k / (N - 1)
        uv[v * 2 + 2] = 1
        uv[v * 2 + 3] = k / (N - 1)
        if (k < N - 1) idx.push(v, v + 1, v + 3, v, v + 3, v + 2)
      }
    this.mesh = new Mesh("corrida-trail", scene)
    const vd = new VertexData()
    vd.positions = this.pos
    vd.colors = this.col
    vd.uvs = uv
    vd.indices = idx
    vd.applyToMesh(this.mesh, true)
    this.mesh.material = this.mat
    this.mesh.isPickable = false
    this.mesh.alwaysSelectAsActiveMesh = true
    this.mesh.hasVertexAlpha = false
    this.mesh.alphaIndex = 0
    this.hist = Array.from({ length: count }, () => new Float32Array(N * 3))
    this.head = new Array(count).fill(0)
    this.filled = new Array(count).fill(0)
    this.power = new Array(count).fill(0)
    this.acc = new Array(count).fill(0)
  }

  /**
   * Fita `f` neste quadro: onde está a boca do motor e a força (0 = some,
   * 1 = rastro cheio). `boost` esquenta a cor.
   */
  feed(f: number, x: number, y: number, z: number, strength: number, boost: boolean, dt: number) {
    const h = this.hist[f]
    const N = this.N
    // a força sobe rápido e apaga devagar
    const p0 = this.power[f]
    this.power[f] = p0 + (strength - p0) * Math.min(1, dt * (strength > p0 ? 8 : 3))
    const last = this.head[f] * 3
    if (this.filled[f] === 0 || Math.hypot(h[last] - x, h[last + 1] - y, h[last + 2] - z) > 25) {
      // começa (ou recomeça) com a fita toda no mesmo ponto
      for (let k = 0; k < N; k++) {
        h[k * 3] = x
        h[k * 3 + 1] = y
        h[k * 3 + 2] = z
      }
      this.filled[f] = 1
      this.acc[f] = 0
    }
    this.acc[f] += dt
    while (this.acc[f] >= SAMPLE) {
      this.acc[f] -= SAMPLE
      this.head[f] = (this.head[f] + 1) % N
      const i = this.head[f] * 3
      h[i] = x
      h[i + 1] = y
      h[i + 2] = z
    }
    // a ponta mais nova é sempre a boca de agora (não fica para trás no quadro)
    const i = this.head[f] * 3
    h[i] = x
    h[i + 1] = y
    h[i + 2] = z
    this.write(f, boost)
  }

  private write(f: number, boost: boolean) {
    const h = this.hist[f]
    const N = this.N
    const eye = this.mesh.getScene().activeCamera?.globalPosition
    const pw = this.power[f]
    for (let k = 0; k < N; k++) {
      // k = 0 é a boca (o mais novo), k = N−1 a ponta
      const a = ((this.head[f] - k) % N + N) % N
      const b = ((this.head[f] - Math.min(N - 1, k + 1)) % N + N) % N
      const c = ((this.head[f] - Math.max(0, k - 1)) % N + N) % N
      const px = h[a * 3]
      const py = h[a * 3 + 1]
      const pz = h[a * 3 + 2]
      // direção da fita aqui e o lado (de frente para a câmera)
      this.tmp.set(h[c * 3] - h[b * 3], h[c * 3 + 1] - h[b * 3 + 1], h[c * 3 + 2] - h[b * 3 + 2])
      if (eye) {
        Vector3.CrossToRef(this.tmp, eye.subtractFromFloatsToRef(px, py, pz, this.side), this.side)
      } else this.side.set(1, 0, 0)
      const len = this.side.length()
      if (len > 1e-5) this.side.scaleInPlace(1 / len)
      else this.side.set(0, 0, 0)
      const t = k / (N - 1)
      const w = this.width * (1 - t * 0.8)
      const v = (f * N + k) * 2
      this.pos[v * 3] = px - this.side.x * w
      this.pos[v * 3 + 1] = py - this.side.y * w
      this.pos[v * 3 + 2] = pz - this.side.z * w
      this.pos[v * 3 + 3] = px + this.side.x * w
      this.pos[v * 3 + 4] = py + this.side.y * w
      this.pos[v * 3 + 5] = pz + this.side.z * w
      // laranja-avermelhado que apaga para a ponta; turbo mais quente e claro.
      // Perto da câmera apaga: a câmera de perseguição anda pelo mesmo caminho
      // da nave, e a fita passaria do lado dela como uma linha na tela toda.
      const dc = eye ? Math.hypot(eye.x - px, eye.y - py, eye.z - pz) : 99
      const near = Math.min(1, Math.max(0, (dc - 5) / 5))
      const fade = pw * (1 - t) ** 1.4 * near
      const r = (boost ? 1 : 0.95) * fade
      const g = (boost ? 0.62 - 0.4 * t : 0.42 - 0.3 * t) * fade
      const bl = (boost ? 0.3 - 0.25 * t : 0.12 - 0.1 * t) * fade
      for (const o of [0, 4]) {
        this.col[v * 4 + o] = r
        this.col[v * 4 + o + 1] = Math.max(0, g)
        this.col[v * 4 + o + 2] = Math.max(0, bl)
        this.col[v * 4 + o + 3] = 1
      }
    }
  }

  /** Fita que não está no jogo neste quadro (nave caída ou escondida). */
  hide(f: number) {
    this.power[f] = 0
    this.filled[f] = 0
    const N = this.N
    for (let k = 0; k < N * 2; k++) for (let c = 0; c < 4; c++) this.col[(f * N * 2 + k) * 4 + c] = c === 3 ? 1 : 0
  }

  /** Depois de alimentar todas as fitas no quadro. */
  flush() {
    this.mesh.updateVerticesData(VertexBuffer.PositionKind, this.pos, false, false)
    this.mesh.updateVerticesData(VertexBuffer.ColorKind, this.col, false, false)
  }

  get size() {
    return this.count
  }

  dispose() {
    this.mesh.dispose()
    this.mat.dispose()
    this.tex.dispose()
  }
}
