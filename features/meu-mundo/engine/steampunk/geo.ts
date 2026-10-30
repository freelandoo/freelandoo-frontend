// features/meu-mundo/engine/steampunk/geo.ts
//
// O acumulador do bairro steampunk: o mesmo GeoBuilder (cor por vértice, tudo
// num buffer só), com três jeitos de gerar a UV — é a UV que decide o que a
// textura de detalhe faz em cada peça:
//
//  - "face"  (padrão): cada face vai de 0 a 1. Com a textura de acabamento
//    (materials.ts) isso vira a borda escura de cada face = chanfro barato.
//  - "flat": UV parada no meio da textura (copas, esferas, vidro): sem borda.
//  - número: projeção no MUNDO com aquele tamanho de ladrilho (m), pela face
//    dominante da normal. É como o chão, a rua e a calçada repetem a textura
//    sem esticar, e duas peças vizinhas continuam o mesmo desenho.
//
// Mais as formas que o kit precisa: cone/tronco de cone, tubo entre dois
// pontos, engrenagem, arco de anel.

import { CreateCylinderVertexData } from "@babylonjs/core/Meshes/Builders/cylinderBuilder"
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData"
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector"
import type { Mesh } from "@babylonjs/core/Meshes/mesh"
import type { Material } from "@babylonjs/core/Materials/material"
import type { Scene } from "@babylonjs/core/scene"
import { GeoBuilder, type RGB } from "../geometry"
import { shade } from "./palette"

export type UvMode = "face" | "flat" | number

export type V3 = readonly [number, number, number]

export class SteamGeo extends GeoBuilder {
  uv: UvMode = "face"

  /** Roda `fn` com outro modo de UV e volta ao anterior. */
  with(mode: UvMode, fn: () => void) {
    const prev = this.uv
    this.uv = mode
    try {
      fn()
    } finally {
      this.uv = prev
    }
  }

  protected append(vd: VertexData, color: RGB) {
    const p = vd.positions as ArrayLike<number>
    const count = p.length / 3
    if (this.uv === "flat") {
      vd.uvs = new Array(count * 2).fill(0.5)
    } else if (typeof this.uv === "number") {
      const s = 1 / this.uv
      const n = vd.normals as ArrayLike<number>
      const uvs = new Array(count * 2)
      for (let i = 0; i < count; i++) {
        const nx = Math.abs(n[i * 3]), ny = Math.abs(n[i * 3 + 1]), nz = Math.abs(n[i * 3 + 2])
        const x = p[i * 3], y = p[i * 3 + 1], z = p[i * 3 + 2]
        if (ny >= nx && ny >= nz) {
          uvs[i * 2] = x * s
          uvs[i * 2 + 1] = z * s
        } else if (nx >= nz) {
          uvs[i * 2] = z * s
          uvs[i * 2 + 1] = y * s
        } else {
          uvs[i * 2] = x * s
          uvs[i * 2 + 1] = y * s
        }
      }
      vd.uvs = uvs
    }
    super.append(vd, color)
  }

  /** Placa vertical w×h no plano XY local (normal −Z), dos dois lados: grade, haste fina. */
  panel(w: number, h: number, m: Matrix, color: RGB) {
    const vd = new VertexData()
    vd.positions = [-w / 2, -h / 2, 0, w / 2, -h / 2, 0, w / 2, h / 2, 0, -w / 2, h / 2, 0]
    vd.normals = [0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1]
    vd.uvs = [0, 0, 1, 0, 1, 1, 0, 1]
    vd.indices = [0, 1, 2, 0, 2, 3]
    vd.transform(m)
    this.append(vd, color)
  }

  /** Tronco de cone vertical centrado (dTop/dBottom = diâmetros). */
  cone(dTop: number, dBottom: number, h: number, m: Matrix, color: RGB, sides = 8) {
    const vd = CreateCylinderVertexData({ height: h, diameterTop: dTop, diameterBottom: dBottom, tessellation: sides })
    vd.transform(m)
    this.append(vd, color)
  }

  /**
   * Anel (toro) no plano XZ local: arco de praça, aro de roda, friso. Seção
   * de 4 lados por padrão — o toro do Babylon usa a mesma divisão nas duas
   * direções e um aro de 24 lados custaria 625 vértices em vez de 125.
   */
  ring(diameter: number, thickness: number, m: Matrix, color: RGB, sides = 24, tube = 4) {
    const R = diameter / 2
    const r = thickness / 2
    const positions: number[] = []
    const normals: number[] = []
    const uvs: number[] = []
    const indices: number[] = []
    for (let i = 0; i <= sides; i++) {
      const u = (i / sides) * Math.PI * 2
      const cu = Math.cos(u)
      const su = Math.sin(u)
      for (let j = 0; j <= tube; j++) {
        const v = (j / tube) * Math.PI * 2 + Math.PI / tube
        const cv = Math.cos(v)
        const sv = Math.sin(v)
        normals.push(cv * cu, sv, cv * su)
        positions.push((R + r * cv) * cu, r * sv, (R + r * cv) * su)
        uvs.push(i / sides, j / tube)
      }
    }
    const row = tube + 1
    for (let i = 0; i < sides; i++) {
      for (let j = 0; j < tube; j++) {
        const a = i * row + j
        const b = a + row
        indices.push(a, b, a + 1, b, b + 1, a + 1)
      }
    }
    const vd = new VertexData()
    vd.positions = positions
    vd.normals = normals
    vd.uvs = uvs
    vd.indices = indices
    vd.transform(m)
    this.append(vd, color)
  }

  /** Cilindro de raio r entre dois pontos (tubo, cano, braço). */
  tube(a: V3, b: V3, r: number, color: RGB, sides = 6, frame?: Matrix) {
    const A = new Vector3(a[0], a[1], a[2])
    const B = new Vector3(b[0], b[1], b[2])
    const d = B.subtract(A)
    const len = d.length()
    if (len < 1e-4) return
    const dir = d.scale(1 / len)
    const up = Vector3.Up()
    const dot = Vector3.Dot(up, dir)
    let q: Quaternion
    if (dot > 0.9999) q = Quaternion.Identity()
    else if (dot < -0.9999) q = Quaternion.RotationAxis(Vector3.Right(), Math.PI)
    else q = Quaternion.RotationAxis(Vector3.Cross(up, dir).normalize(), Math.acos(dot))
    const mid = A.add(B).scale(0.5)
    let m = Matrix.Compose(Vector3.One(), q, mid)
    if (frame) m = m.multiply(frame)
    const vd = CreateCylinderVertexData({ height: len, diameter: 2 * r, tessellation: sides })
    vd.transform(m)
    this.append(vd, color)
  }

  /** Cano em L/zigue-zague por uma lista de pontos, com luva em cada dobra. */
  pipe(points: V3[], r: number, color: RGB, joint: RGB, frame?: Matrix) {
    for (let i = 0; i + 1 < points.length; i++) this.tube(points[i], points[i + 1], r, color, 6, frame)
    for (let i = 1; i + 1 < points.length; i++) {
      const [x, y, z] = points[i]
      const m = Matrix.Translation(x, y, z)
      this.box(2.6 * r, 2.6 * r, 2.6 * r, frame ? m.multiply(frame) : m, joint)
    }
  }

  /**
   * Engrenagem com eixo no Y local, centrada na origem de `m`: disco, cubo,
   * raios vazados (quatro barras) e `teeth` dentes no aro.
   */
  gear(r: number, thick: number, teeth: number, m: Matrix, color: RGB, hub?: RGB) {
    this.gearInto(this, r, thick, teeth, m, color, hub)
  }

  /** O mesmo desenho, em qualquer acumulador (a malha das engrenagens que giram). */
  gearInto(g: SteamGeo, r: number, thick: number, teeth: number, m: Matrix, color: RGB, hub?: RGB) {
    // Perfil de dentes extrudado (16 vértices por dente) + cubo e miolo mais
    // escuro: lê como engrenagem de longe e de perto por uma fração das caixas.
    const pts: [number, number][] = []
    const step = (Math.PI * 2) / teeth
    const root = r * 0.8
    for (let i = 0; i < teeth; i++) {
      const a = i * step
      pts.push([root, a], [r, a + 0.14 * step], [r, a + 0.46 * step], [root, a + 0.6 * step])
    }
    const P = pts.length
    const h = thick / 2
    const positions: number[] = []
    const normals: number[] = []
    const uvs: number[] = []
    const indices: number[] = []
    const xy = pts.map(([rr, a]) => [Math.cos(a) * rr, Math.sin(a) * rr] as const)
    for (const [y, ny] of [
      [h, 1],
      [-h, -1],
    ] as const) {
      const c = positions.length / 3
      positions.push(0, y, 0)
      normals.push(0, ny, 0)
      uvs.push(0.5, 0.5)
      for (const [x, z] of xy) {
        positions.push(x, y, z)
        normals.push(0, ny, 0)
        uvs.push(0.5 + x / (2 * r), 0.5 + z / (2 * r))
      }
      for (let i = 0; i < P; i++) {
        const a = c + 1 + i
        const b = c + 1 + ((i + 1) % P)
        if (ny > 0) indices.push(c, b, a)
        else indices.push(c, a, b)
      }
    }
    const s0 = positions.length / 3
    for (let i = 0; i < P; i++) {
      const [x, z] = xy[i]
      const l = Math.hypot(x, z)
      positions.push(x, h, z, x, -h, z)
      normals.push(x / l, 0, z / l, x / l, 0, z / l)
      uvs.push(i / P, 1, i / P, 0)
    }
    for (let i = 0; i < P; i++) {
      const a = s0 + i * 2
      const b = s0 + ((i + 1) % P) * 2
      indices.push(a, a + 1, b, b, a + 1, b + 1)
    }
    const vd = new VertexData()
    vd.positions = positions
    vd.normals = normals
    vd.uvs = uvs
    vd.indices = indices
    vd.transform(m)
    g.append(vd, color)
    g.cylinder(r * 1.15, thick * 1.12, m, shade(color, 0.72), 10)
    g.cylinder(r * 0.34, thick * 1.6, m, hub ?? color, 8)
  }

}

/** Matriz de peça: escala, rotação (X, Y, Z em rad) e posição, dentro do quadro. */
export function xf(x: number, y: number, z: number, ry = 0, frame?: Matrix, rx = 0, rz = 0): Matrix {
  const m = Matrix.RotationYawPitchRoll(ry, rx, rz).multiply(Matrix.Translation(x, y, z))
  return frame ? m.multiply(frame) : m
}

/** Peça de frente para −Z local (rosto na fachada): o eixo Y dela vira −Z. */
export function facing(x: number, y: number, z: number, frame?: Matrix, ry = 0): Matrix {
  const m = Matrix.RotationX(-Math.PI / 2).multiply(Matrix.RotationY(ry)).multiply(Matrix.Translation(x, y, z))
  return frame ? m.multiply(frame) : m
}

/**
 * Acumulador dividido em blocos no chão (grade de `cell` m): cada peça cai no
 * bloco do seu centro e cada bloco vira uma malha. Assim o recorte pela câmera
 * descarta o que está atrás dela — o bairro inteiro numa malha só seria
 * desenhado sempre, mesmo olhando para o chão.
 */
export class ChunkedGeo extends SteamGeo {
  private readonly parts = new Map<string, ChunkedGeo>()

  constructor(private readonly cell = 0) {
    super()
  }

  protected append(vd: VertexData, color: RGB) {
    if (!this.cell) {
      super.append(vd, color)
      return
    }
    const p = vd.positions as ArrayLike<number>
    let sx = 0
    let sz = 0
    const n = p.length / 3
    for (let i = 0; i < p.length; i += 3) {
      sx += p[i]
      sz += p[i + 2]
    }
    const key = `${Math.floor(sx / n / this.cell)},${Math.floor(sz / n / this.cell)}`
    let part = this.parts.get(key)
    if (!part) this.parts.set(key, (part = new ChunkedGeo(0)))
    part.uv = this.uv
    part.append(vd, color)
  }

  get vertexCount() {
    if (!this.cell) return super.vertexCount
    let t = 0
    for (const part of this.parts.values()) t += part.vertexCount
    return t
  }

  /** Uma malha por bloco não vazio. */
  buildChunks(name: string, scene: Scene, material: Material): Mesh[] {
    if (!this.cell) return this.vertexCount ? [this.build(name, scene, material)] : []
    const out: Mesh[] = []
    for (const [key, part] of this.parts) if (part.vertexCount) out.push(part.build(`${name}-${key}`, scene, material))
    this.parts.clear()
    return out
  }
}
