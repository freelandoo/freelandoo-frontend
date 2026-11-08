// features/meu-mundo/corrida/engine/flame.ts — CORRIDA: o fogo dos bocais.
//
// mm3d-73 (prompt da reformulação visual do Alex): SEM shader próprio. O fogo
// é feito de camadas com o StandardMaterial do Babylon:
//  1. NÚCLEO — tubo fino e pontudo; cor pela textura ao longo do comprimento
//     (branco-amarelado na boca → amarelo → laranja → apaga na ponta).
//  2. CHAMA EXTERNA — tubo mais largo que incha logo depois da boca;
//     laranja → vermelho nas bordas, e um ruído em listras (textura difusa)
//     que CORRE para trás: o fogo parece gás sob pressão, não um cone.
//  Nas duas: o contorno some pelo fresnel do emissivo (a face de frente para a
//  câmera acende, a borda apaga) e a soma é aditiva, sem gravar profundidade.
//  3. As faíscas (sistema de partículas) e o rastro (trail.ts) ficam com a nave.
//
// Uma instância fina por bocal em cada camada; a força (e a cor do turbo) vai
// na cor da instância, o comprimento e a curva na matriz (quem chama monta).

import type { Scene } from "@babylonjs/core/scene"
import "@babylonjs/core/Meshes/thinInstanceMesh"
import { Mesh } from "@babylonjs/core/Meshes/mesh"
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { Material } from "@babylonjs/core/Materials/material"
import { FresnelParameters } from "@babylonjs/core/Materials/fresnelParameters"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { Texture } from "@babylonjs/core/Materials/Textures/texture"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { Constants } from "@babylonjs/core/Engines/constants"

const SIDES = 12
const RINGS = 10

/** Tubo: boca de raio 1 em z = 0, ponta em z = −1; v da textura = 0 na boca, 1 na ponta. */
function tube(name: string, scene: Scene, profile: (t: number) => number): Mesh {
  const pos: number[] = []
  const nrm: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  for (let r = 0; r <= RINGS; r++) {
    const t = r / RINGS
    const rad = Math.max(0.012, profile(t))
    for (let s = 0; s <= SIDES; s++) {
      const a = (s / SIDES) * Math.PI * 2
      pos.push(Math.cos(a) * rad, Math.sin(a) * rad, -t)
      // a normal inclina para trás: vista de trás (a câmera da corrida) a chama
      // acende inteira; de lado, o meio acende e a borda some
      nrm.push(Math.cos(a) * 0.6, Math.sin(a) * 0.6, 0.8)
      uv.push(s / SIDES, t)
    }
  }
  const row = SIDES + 1
  for (let r = 0; r < RINGS; r++)
    for (let s = 0; s < SIDES; s++) {
      const a = r * row + s
      const b = a + row
      idx.push(a, b, a + 1, a + 1, b, b + 1)
    }
  const m = new Mesh(name, scene)
  const vd = new VertexData()
  vd.positions = pos
  vd.normals = nrm
  vd.uvs = uv
  vd.indices = idx
  vd.applyToMesh(m)
  m.isPickable = false
  m.alwaysSelectAsActiveMesh = true
  return m
}

/** Degradê ao longo da chama (v = 0 na boca). */
function gradient(scene: Scene, name: string, stops: [number, string][]): DynamicTexture {
  const tex = new DynamicTexture(name, { width: 4, height: 128 }, scene, false)
  const g = tex.getContext() as CanvasRenderingContext2D
  const grad = g.createLinearGradient(0, 0, 0, 128)
  for (const [at, c] of stops) grad.addColorStop(at, c)
  g.fillStyle = grad
  g.fillRect(0, 0, 4, 128)
  tex.update(false)
  tex.wrapU = Texture.CLAMP_ADDRESSMODE
  tex.wrapV = Texture.CLAMP_ADDRESSMODE
  return tex
}

/** Listras de ruído que correm ao longo da chama (cinza claro → branco). */
function streaks(scene: Scene): DynamicTexture {
  const W = 64
  const H = 128
  const tex = new DynamicTexture("corrida-flame-noise", { width: W, height: H }, scene, false)
  const g = tex.getContext() as CanvasRenderingContext2D
  g.fillStyle = "#8a8a8a"
  g.fillRect(0, 0, W, H)
  let seed = 4242
  const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  for (let k = 0; k < 90; k++) {
    const x = r() * W
    const y = r() * H
    const len = 10 + r() * 40
    const w = 2 + r() * 6
    const b = 170 + Math.floor(r() * 85)
    g.fillStyle = `rgba(${b},${b},${b},0.75)`
    // repete nas bordas para emendar (a textura dá a volta)
    for (const dx of [-W, 0, W]) for (const dy of [-H, 0, H]) g.fillRect(x + dx - w / 2, y + dy, w, len)
  }
  tex.update(false)
  tex.wrapU = Texture.WRAP_ADDRESSMODE
  tex.wrapV = Texture.WRAP_ADDRESSMODE
  return tex
}

function flameMat(scene: Scene, name: string, grad: DynamicTexture, noise: DynamicTexture | null, power: number): StandardMaterial {
  const m = new StandardMaterial(name, scene)
  m.disableLighting = true
  m.diffuseColor = new Color3(0, 0, 0)
  m.specularColor = new Color3(0, 0, 0)
  m.emissiveTexture = grad
  // a face de frente acende e a borda some (o gás); multiplica o emissivo
  m.emissiveFresnelParameters = new FresnelParameters({
    leftColor: new Color3(0, 0, 0),
    rightColor: new Color3(1, 1, 1),
    bias: 0,
    power,
  })
  if (noise) m.diffuseTexture = noise
  m.backFaceCulling = false
  m.disableDepthWrite = true
  m.fogEnabled = false
  m.transparencyMode = Material.MATERIAL_ALPHABLEND
  m.alphaMode = Constants.ALPHA_ADD
  return m
}

export interface FlameLayer {
  mesh: Mesh
  /** 16 floats por chama. */
  matrices: Float32Array
  /** 4 floats por chama: força e tom (r, g, b, 1). */
  colors: Float32Array
}

export interface FlameBank {
  core: FlameLayer
  outer: FlameLayer
  /** Depois de escrever os buffers do quadro. */
  update(dt: number): void
  dispose(): void
}

export function createFlames(scene: Scene, count: number): FlameBank {
  const noise = streaks(scene)
  const coreGrad = gradient(scene, "corrida-flame-core", [
    [0, "#ffffff"],
    [0.12, "#fff6d0"],
    [0.35, "#ffd24a"],
    [0.6, "#ff8a1a"],
    [0.85, "#5a1404"],
    [1, "#000000"],
  ])
  const outerGrad = gradient(scene, "corrida-flame-outer", [
    [0, "#ffd890"],
    [0.18, "#ff9a2a"],
    [0.45, "#ff5a10"],
    [0.75, "#c41a06"],
    [0.92, "#3a0602"],
    [1, "#000000"],
  ])
  const coreMat = flameMat(scene, "corrida-flame-core", coreGrad, null, 3.2)
  const outerMat = flameMat(scene, "corrida-flame-outer", outerGrad, noise, 1.6)
  noise.vScale = 1.4
  // núcleo: estreito e pontudo; externa: incha depois da boca e afina num rabo fino
  const coreMesh = tube("corrida-flame-core", scene, (t) => 0.5 * (1 - t) ** 1.6 * (1 + 0.25 * Math.sin(Math.min(1, t * 6) * Math.PI)))
  const outerMesh = tube("corrida-flame-outer", scene, (t) => (1 - t) ** 1.9 * (1 + 0.55 * Math.sin(Math.min(1, t * 4.5) * Math.PI)))
  coreMesh.material = coreMat
  outerMesh.material = outerMat
  // a externa desenha antes (o núcleo soma por cima)
  outerMesh.alphaIndex = 1
  coreMesh.alphaIndex = 2
  const layer = (mesh: Mesh): FlameLayer => {
    const matrices = new Float32Array(count * 16)
    const colors = new Float32Array(count * 4)
    mesh.thinInstanceSetBuffer("matrix", matrices, 16, false)
    mesh.thinInstanceSetBuffer("color", colors, 4, false)
    return { mesh, matrices, colors }
  }
  const core = layer(coreMesh)
  const outer = layer(outerMesh)
  return {
    core,
    outer,
    update(dt) {
      // o ruído corre da boca para a ponta (v cresce para trás)
      noise.vOffset = (noise.vOffset - dt * 3.4) % 1
      noise.uOffset = (noise.uOffset + dt * 0.21) % 1
      for (const l of [core, outer]) {
        l.mesh.thinInstanceBufferUpdated("matrix")
        l.mesh.thinInstanceBufferUpdated("color")
      }
    },
    dispose() {
      for (const x of [coreMesh, outerMesh, coreMat, outerMat, coreGrad, outerGrad, noise]) x.dispose()
    },
  }
}
