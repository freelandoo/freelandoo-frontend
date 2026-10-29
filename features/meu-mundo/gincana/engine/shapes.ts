// features/meu-mundo/gincana/engine/shapes.ts — GINCANA (mm3d-47): formas arredondadas.
//
// O pedido do Alex: cores vivas e tudo ARREDONDADO, sem cantos. Aqui ficam as
// formas "infláveis" da prova — caixa de cantos redondos (esfera esticada:
// soma de Minkowski de caixa e esfera), cilindro com borda redonda, toro
// (a boia em volta dos discos), cápsula listrada (barras e colunas de
// bala) — com COR POR VÉRTICE num acumulador só: a pista inteira vira poucas
// malhas, que é o que pesa no celular.

import { Mesh } from "@babylonjs/core/Meshes/mesh"
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData"
import { CreateSphereVertexData } from "@babylonjs/core/Meshes/Builders/sphereBuilder"
import { CreateCylinderVertexData } from "@babylonjs/core/Meshes/Builders/cylinderBuilder"
import { CreateTorusVertexData } from "@babylonjs/core/Meshes/Builders/torusBuilder"
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector"
import type { Scene } from "@babylonjs/core/scene"
import type { Material } from "@babylonjs/core/Materials/material"

export type RGB = readonly [number, number, number]

export function hex(h: string): RGB {
  const v = parseInt(h.slice(1), 16)
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255]
}

export function mix(a: RGB, b: RGB, k: number): RGB {
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]
}

/** Matriz: escala, giro (y, depois x/z) e posição. */
export function at(x: number, y: number, z: number, rotY = 0, rotX = 0, rotZ = 0): Matrix {
  return Matrix.RotationYawPitchRoll(rotY, rotX, rotZ).multiply(Matrix.Translation(x, y, z))
}

/** Cor por vértice: fixa ou por posição LOCAL (listras). */
type Paint = RGB | ((x: number, y: number, z: number) => RGB)

export class SoftGeo {
  private positions: number[] = []
  private normals: number[] = []
  private colors: number[] = []
  private indices: number[] = []

  private append(vd: VertexData, paint: Paint, m: Matrix) {
    const base = this.positions.length / 3
    const p = vd.positions as ArrayLike<number>
    const n = vd.normals as ArrayLike<number>
    const idx = vd.indices as ArrayLike<number>
    const v = new Vector3()
    const w = new Vector3()
    for (let k = 0; k < p.length; k += 3) {
      const c = typeof paint === "function" ? paint(p[k], p[k + 1], p[k + 2]) : paint
      v.set(p[k], p[k + 1], p[k + 2])
      Vector3.TransformCoordinatesToRef(v, m, w)
      this.positions.push(w.x, w.y, w.z)
      v.set(n[k], n[k + 1], n[k + 2])
      Vector3.TransformNormalToRef(v, m, w)
      w.normalize()
      this.normals.push(w.x, w.y, w.z)
      this.colors.push(c[0], c[1], c[2], 1)
    }
    for (let k = 0; k < idx.length; k++) this.indices.push(idx[k] + base)
  }

  /**
   * Caixa de cantos redondos w×h×d (raio r) centrada na matriz. Esfera
   * "esticada": cada vértice vai para o canto da caixa interna do seu octante
   * mais o raio na direção da normal (as faces ficam retas, as quinas redondas).
   */
  roundBox(w: number, h: number, d: number, r: number, m: Matrix, paint: Paint, seg = 10) {
    // mm3d-47b: a versão por esfera esticada dobrava triângulos no meio das
    // faces (os "pedaços faltando" que o Alex viu). Agora: uma grade em cada
    // face do cubo, com linhas só na faixa da curva; cada ponto vai para o
    // ponto mais perto da caixa interna + o raio na direção dele.
    const hx = w / 2
    const hy = h / 2
    const hz = d / 2
    const rr = Math.max(0.005, Math.min(r, hx, hy, hz))
    const n = Math.max(2, Math.round(seg / 3))
    const axis = (half: number) => {
      const out: number[] = []
      for (let k = 0; k <= n; k++) out.push(-half + (rr * k) / n)
      if (half - rr > 1e-4) out.push(half - rr)
      for (let k = 1; k <= n; k++) out.push(half - rr + (rr * k) / n)
      if (half - rr <= 1e-4) out.pop()
      return out
    }
    const ax = axis(hx)
    const ay = axis(hy)
    const az = axis(hz)
    const positions: number[] = []
    const normals: number[] = []
    const indices: number[] = []
    const ins = [hx - rr, hy - rr, hz - rr]
    const put = (q: number[]) => {
      const c = [Math.max(-ins[0], Math.min(ins[0], q[0])), Math.max(-ins[1], Math.min(ins[1], q[1])), Math.max(-ins[2], Math.min(ins[2], q[2]))]
      const dx = q[0] - c[0]
      const dy = q[1] - c[1]
      const dz = q[2] - c[2]
      const l = Math.hypot(dx, dy, dz) || 1
      positions.push(c[0] + (dx / l) * rr, c[1] + (dy / l) * rr, c[2] + (dz / l) * rr)
      normals.push(dx / l, dy / l, dz / l)
    }
    // faces: eixo fixo, sinal, e os dois eixos da grade (ordem para a frente ficar para fora)
    const faces: [number, number, number, number][] = [
      [0, 1, 1, 2],
      [0, -1, 2, 1],
      [1, 1, 2, 0],
      [1, -1, 0, 2],
      [2, 1, 0, 1],
      [2, -1, 1, 0],
    ]
    const halves = [hx, hy, hz]
    const grids = [ax, ay, az]
    for (const [fa, sg, ua, va] of faces) {
      const us = grids[ua]
      const vs = grids[va]
      const base = positions.length / 3
      for (const v of vs) {
        for (const u of us) {
          const q = [0, 0, 0]
          q[fa] = sg * halves[fa]
          q[ua] = u
          q[va] = v
          put(q)
        }
      }
      const cols = us.length
      for (let j = 0; j < vs.length - 1; j++) {
        for (let i = 0; i < cols - 1; i++) {
          const a = base + j * cols + i
          const b = a + 1
          const c = a + cols
          const e = c + 1
          indices.push(a, e, b, a, c, e)
        }
      }
    }
    const vd = new VertexData()
    vd.positions = positions
    vd.normals = normals
    vd.indices = indices
    this.append(vd, paint, m)
  }

  /** Cilindro vertical (centro na matriz). */
  cylinder(diameter: number, h: number, m: Matrix, paint: Paint, sides = 24, top = diameter) {
    const vd = CreateCylinderVertexData({ height: h, diameterBottom: diameter, diameterTop: top, tessellation: sides })
    this.append(vd, paint, m)
  }

  /** Toro deitado (anel inflável): diâmetro do anel e grossura do tubo. */
  torus(diameter: number, thickness: number, m: Matrix, paint: Paint, tess = 36) {
    const vd = CreateTorusVertexData({ diameter, thickness, tessellation: tess })
    this.append(vd, paint, m)
  }

  /** Esfera (escala por eixo; normais recalculadas). */
  sphere(diameter: number, m: Matrix, paint: Paint, seg = 10, sx = 1, sy = 1, sz = 1) {
    const vd = CreateSphereVertexData({ diameter, segments: seg })
    const sm = Matrix.Scaling(sx, sy, sz)
    const p = vd.positions as number[]
    const v = new Vector3()
    for (let k = 0; k < p.length; k += 3) {
      v.set(p[k], p[k + 1], p[k + 2])
      Vector3.TransformCoordinatesToRef(v, sm, v)
      p[k] = v.x
      p[k + 1] = v.y
      p[k + 2] = v.z
    }
    const nn: number[] = []
    VertexData.ComputeNormals(p, vd.indices!, nn)
    vd.normals = nn
    this.append(vd, paint, m)
  }

  /** Cápsula vertical: comprimento total `len` (pontas redondas incluídas), raio r. */
  capsule(r: number, len: number, m: Matrix, paint: Paint, seg = 12) {
    this.roundBox(2 * r, len, 2 * r, r, m, paint, seg)
  }

  /** Tubo de a até b (cilindro sem tampa girado), raio r. */
  tube(a: Vector3, b: Vector3, r: number, paint: Paint, sides = 10) {
    const d = b.subtract(a)
    const L = d.length()
    if (L < 1e-4) return
    const mid = a.add(b).scale(0.5)
    const yaw = Math.atan2(d.x, d.z)
    const pitch = Math.acos(Math.max(-1, Math.min(1, d.y / L)))
    const m = Matrix.RotationX(pitch).multiply(Matrix.RotationY(yaw)).multiply(Matrix.Translation(mid.x, mid.y, mid.z))
    this.cylinder(2 * r, L, m, paint, sides)
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
    vd.indices = this.indices
    vd.applyToMesh(mesh, false)
    mesh.material = material
    mesh.isPickable = false
    if (isStatic) {
      mesh.freezeWorldMatrix()
      mesh.doNotSyncBoundingInfo = true
    }
    this.positions = []
    this.normals = []
    this.colors = []
    this.indices = []
    return mesh
  }
}

/** Listras ao longo de y local (bala de doce): `period` m, cores alternadas. */
export function stripesY(a: RGB, b: RGB, period: number, tilt = 0.35): (x: number, y: number, z: number) => RGB {
  return (x, y, z) => ((Math.floor((y + Math.atan2(x, z) * tilt) / period) % 2) + 2) % 2 === 0 ? a : b
}
