// features/meu-mundo/engine/geometry.ts
//
// Acumulador de geometria com cor por vértice.
//
// O bairro é estático, então em vez de uma malha (e uma chamada de desenho)
// por peça, todas as peças com o mesmo material entram num ÚNICO buffer. A cor
// de cada casa vai no vértice, por isso 20 fachadas diferentes não pedem 20
// materiais. O resultado são poucas malhas no bairro inteiro — o que mais pesa
// no celular é o número de chamadas de desenho, não o de triângulos.

import { Mesh } from "@babylonjs/core/Meshes/mesh"
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData"
import { CreateBoxVertexData } from "@babylonjs/core/Meshes/Builders/boxBuilder"
import { CreateCylinderVertexData } from "@babylonjs/core/Meshes/Builders/cylinderBuilder"
import { CreateSphereVertexData } from "@babylonjs/core/Meshes/Builders/sphereBuilder"
import { Matrix } from "@babylonjs/core/Maths/math.vector"
import type { Scene } from "@babylonjs/core/scene"
import type { Material } from "@babylonjs/core/Materials/material"

export type RGB = readonly [number, number, number]

/** Transformação de uma peça: rotação em Y local, posição local e o quadro (lote) por fora. */
export function place(x: number, y: number, z: number, rotY = 0, frame?: Matrix): Matrix {
  const m = Matrix.RotationY(rotY).multiply(Matrix.Translation(x, y, z))
  return frame ? m.multiply(frame) : m
}

/** Quadro de um lote: tudo que for colocado nele gira e anda junto. */
export function frameOf(x: number, z: number, rotY: number): Matrix {
  return Matrix.RotationY(rotY).multiply(Matrix.Translation(x, 0, z))
}

export class GeoBuilder {
  private positions: number[] = []
  private normals: number[] = []
  private colors: number[] = []
  private uvs: number[] = []
  private indices: number[] = []

  // protected: o construtor do bairro steampunk (steampunk/geo.ts) reescreve as UVs antes.
  protected append(vd: VertexData, color: RGB) {
    const base = this.positions.length / 3
    const p = vd.positions as ArrayLike<number>
    const n = vd.normals as ArrayLike<number>
    const uv = vd.uvs as ArrayLike<number> | null | undefined
    const idx = vd.indices as ArrayLike<number>
    for (let k = 0; k < p.length; k++) this.positions.push(p[k])
    for (let k = 0; k < n.length; k++) this.normals.push(n[k])
    const count = p.length / 3
    for (let k = 0; k < count; k++) {
      this.colors.push(color[0], color[1], color[2], 1)
      if (uv && uv.length >= (k + 1) * 2) this.uvs.push(uv[k * 2], uv[k * 2 + 1])
      else this.uvs.push(0, 0)
    }
    for (let k = 0; k < idx.length; k++) this.indices.push(idx[k] + base)
  }

  /** Caixa de tamanho (w,h,d) cujo CENTRO é levado pela matriz. */
  box(w: number, h: number, d: number, m: Matrix, color: RGB) {
    const vd = CreateBoxVertexData({ width: w, height: h, depth: d })
    vd.transform(m)
    this.append(vd, color)
  }

  /** Cilindro vertical centrado. Poucos lados: o estilo é de formas simples. */
  cylinder(diameter: number, h: number, m: Matrix, color: RGB, sides = 8) {
    const vd = CreateCylinderVertexData({ height: h, diameter, tessellation: sides })
    vd.transform(m)
    this.append(vd, color)
  }

  /**
   * Esfera, com escala por eixo. A escala não uniforme entorta as normais,
   * então elas são recalculadas depois de transformar.
   */
  sphere(diameter: number, scale: [number, number, number], m: Matrix, color: RGB, segments = 6) {
    const vd = CreateSphereVertexData({ diameter, segments })
    vd.transform(Matrix.Scaling(scale[0], scale[1], scale[2]).multiply(m))
    const normals: number[] = []
    VertexData.ComputeNormals(vd.positions!, vd.indices!, normals)
    vd.normals = normals
    this.append(vd, color)
  }

  /**
   * Telhado: prisma triangular com a cumeeira ao longo de X. Base no y=0 local,
   * largura w (X), profundidade d (Z) e altura h. Faces planas.
   */
  prism(w: number, d: number, h: number, m: Matrix, color: RGB) {
    const x = w / 2
    const z = d / 2
    const A = [-x, 0, -z], B = [x, 0, -z], C = [x, 0, z], D = [-x, 0, z]
    const E = [-x, h, 0], F = [x, h, 0]
    const ln = Math.hypot(z, h)
    const front = [0, z / ln, -h / ln]
    const back = [0, z / ln, h / ln]
    const faces: [number[][], number[]][] = [
      [[A, B, F, E], front],
      [[C, D, E, F], back],
      [[D, A, E], [-1, 0, 0]],
      [[B, C, F], [1, 0, 0]],
    ]
    const positions: number[] = []
    const normals: number[] = []
    const indices: number[] = []
    for (const [pts, nrm] of faces) {
      const base = positions.length / 3
      for (const p of pts) {
        positions.push(p[0], p[1], p[2])
        normals.push(nrm[0], nrm[1], nrm[2])
      }
      indices.push(base, base + 1, base + 2)
      if (pts.length === 4) indices.push(base, base + 2, base + 3)
    }
    const vd = new VertexData()
    vd.positions = positions
    vd.normals = normals
    vd.indices = indices
    vd.transform(m)
    this.append(vd, color)
  }

  /**
   * Retângulo vertical de w×h no plano XY local, virado para -Z, com um
   * recorte de UV (u0,v0)-(u1,v1). É a face de texto das placas.
   */
  quad(w: number, h: number, uv: [number, number, number, number], m: Matrix) {
    const [u0, v0, u1, v1] = uv
    const vd = new VertexData()
    vd.positions = [-w / 2, -h / 2, 0, w / 2, -h / 2, 0, w / 2, h / 2, 0, -w / 2, h / 2, 0]
    vd.normals = [0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1]
    vd.uvs = [u0, v0, u1, v0, u1, v1, u0, v1]
    vd.indices = [0, 1, 2, 0, 2, 3]
    vd.transform(m)
    this.append(vd, [1, 1, 1])
  }

  get vertexCount() {
    return this.positions.length / 3
  }

  build(name: string, scene: Scene, material: Material, isStatic = true): Mesh {
    const mesh = new Mesh(name, scene)
    const vd = new VertexData()
    vd.positions = this.positions
    vd.normals = this.normals
    vd.colors = this.colors
    vd.uvs = this.uvs
    vd.indices = this.indices
    vd.applyToMesh(mesh, false)
    mesh.material = material
    mesh.isPickable = false
    if (isStatic) {
      // Nada disto se move: congelar poupa o recálculo de matriz e caixa por quadro.
      mesh.freezeWorldMatrix()
      mesh.doNotSyncBoundingInfo = true
    }
    // Os buffers já estão na GPU; os arrays de JS não servem mais para nada.
    this.positions = []
    this.normals = []
    this.colors = []
    this.uvs = []
    this.indices = []
    return mesh
  }
}
