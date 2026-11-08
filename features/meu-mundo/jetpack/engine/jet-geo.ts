// features/meu-mundo/jetpack/engine/jet-geo.ts — JETPACK (mm3d-75): formas que só as fases usam.
//
// O mesmo acumulador do steampunk (cor por vértice, UV por face) com três
// formas a mais: a PLACA COM FURO redondo (o anel: quadrado 2×2 menos o
// círculo de raio 1, para escalar pelo raio da regra), a GEMA (cristal de 8
// lados, pontudo na frente e atrás, que cobre o disco da colisão) e a ROCHA
// (esfera baixa e amassada, determinística).

import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData"
import { CreateIcoSphereVertexData } from "@babylonjs/core/Meshes/Builders/icoSphereBuilder"
import type { Matrix } from "@babylonjs/core/Maths/math.vector"
import { SteamGeo } from "../../engine/steampunk/geo"
import type { RGB } from "../../engine/geometry"

function push(vd: VertexData, positions: number[], normals: number[], indices: number[]) {
  vd.positions = positions
  vd.normals = normals
  vd.indices = indices
  vd.uvs = new Array((positions.length / 3) * 2).fill(0.5)
}

export class JetGeo extends SteamGeo {
  /**
   * Placa quadrada (lado 2, centro na origem, plano XY) com um furo redondo de
   * raio 1, profundidade d de z = 0 a z = d. Faces da frente, de trás e a
   * parede de dentro do furo.
   */
  holePlate(d: number, m: Matrix, color: RGB, sides = 32) {
    const positions: number[] = []
    const normals: number[] = []
    const indices: number[] = []
    const ring: [number, number][] = []
    const edge: [number, number][] = []
    for (let i = 0; i <= sides; i++) {
      const a = (i / sides) * Math.PI * 2
      const c = Math.cos(a)
      const s = Math.sin(a)
      ring.push([c, s])
      const k = 1 / Math.max(Math.abs(c), Math.abs(s))
      edge.push([c * k, s * k])
    }
    for (const [z, nz] of [
      [0, -1],
      [d, 1],
    ] as const) {
      const base = positions.length / 3
      for (let i = 0; i <= sides; i++) {
        positions.push(ring[i][0], ring[i][1], z, edge[i][0], edge[i][1], z)
        normals.push(0, 0, nz, 0, 0, nz)
      }
      for (let i = 0; i < sides; i++) {
        const a = base + i * 2
        const b = a + 2
        if (nz < 0) indices.push(a, b, a + 1, b, b + 1, a + 1)
        else indices.push(a, a + 1, b, b, a + 1, b + 1)
      }
    }
    // parede do furo (normal para o centro)
    const base = positions.length / 3
    for (let i = 0; i <= sides; i++) {
      positions.push(ring[i][0], ring[i][1], 0, ring[i][0], ring[i][1], d)
      normals.push(-ring[i][0], -ring[i][1], 0, -ring[i][0], -ring[i][1], 0)
    }
    for (let i = 0; i < sides; i++) {
      const a = base + i * 2
      const b = a + 2
      indices.push(a, a + 1, b, b, a + 1, b + 1)
    }
    const vd = new VertexData()
    push(vd, positions, normals, indices)
    vd.transform(m)
    this.append(vd, color)
  }

  /** Cristal: octógono de raio 1,06 (cobre o disco de raio 1) no plano XY, pontudo em z (±len). */
  gem(len: number, m: Matrix, color: RGB) {
    const positions: number[] = []
    const normals: number[] = []
    const indices: number[] = []
    const R = 1.06
    const n = 8
    for (const tip of [-len, len]) {
      for (let i = 0; i < n; i++) {
        const a0 = ((i + 0.5) / n) * Math.PI * 2
        const a1 = ((i + 1.5) / n) * Math.PI * 2
        const p0 = [Math.cos(a0) * R, Math.sin(a0) * R, 0]
        const p1 = [Math.cos(a1) * R, Math.sin(a1) * R, 0]
        const pt = [0, 0, tip]
        // normal da face
        const ux = p1[0] - p0[0], uy = p1[1] - p0[1], uz = 0
        const vx = pt[0] - p0[0], vy = pt[1] - p0[1], vz = pt[2] - p0[2]
        let nx = uy * vz - uz * vy
        let ny = uz * vx - ux * vz
        let nz = ux * vy - uy * vx
        const mid = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2]
        if (nx * mid[0] + ny * mid[1] + nz * tip < 0) {
          nx = -nx
          ny = -ny
          nz = -nz
        }
        const l = Math.hypot(nx, ny, nz) || 1
        const b = positions.length / 3
        positions.push(...p0, ...p1, ...pt)
        for (let k = 0; k < 3; k++) normals.push(nx / l, ny / l, nz / l)
        if (tip > 0) indices.push(b, b + 2, b + 1)
        else indices.push(b, b + 1, b + 2)
      }
    }
    const vd = new VertexData()
    push(vd, positions, normals, indices)
    vd.transform(m)
    this.append(vd, color)
  }

  /** Rocha de raio ~1: icosfera baixa amassada por um ruído fixo pela semente. */
  rock(seed: number, m: Matrix, color: RGB) {
    const vd = CreateIcoSphereVertexData({ radius: 1, subdivisions: 1, flat: true })
    const p = vd.positions as number[]
    for (let i = 0; i < p.length; i += 3) {
      const x = p[i], y = p[i + 1], z = p[i + 2]
      // nunca menor que o disco da colisão (≥ 0,96 nas pontas da icosfera)
      const k = 1.06 + 0.07 * Math.sin(x * 3.1 + seed) * Math.cos(y * 2.7 - seed * 0.7) + 0.03 * Math.sin(z * 5 + seed * 1.3)
      p[i] = x * k
      p[i + 1] = y * k
      p[i + 2] = z * k * 0.8
    }
    const normals: number[] = []
    VertexData.ComputeNormals(p, vd.indices!, normals)
    vd.normals = normals
    vd.uvs = new Array((p.length / 3) * 2).fill(0.5)
    vd.transform(m)
    this.append(vd, color)
  }
}
