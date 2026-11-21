// features/meu-mundo/paint/engine/arenas/kit.ts — PAINT (2026-11-21): o kit dos 5 mapas dos Domínios.
//
// O que os arquivos `arenas/<id>.ts` dividem:
//  - `Poly`: sólido facetado a partir do CONTORNO da ilha (anéis de cima para
//    baixo, cada um com escala e cor) — o casco do navio, o toco, o bloco de
//    gelo, a barragem, a placa de vidro. Cor por vértice, normal por face
//    (facetas, como a rocha comum).
//  - `soft()`: as malhas das peças da Gincana (`SoftGeo`, já aprovadas nos
//    fundos das fases) com os materiais da cena.
//  - `tileTex()`: a textura do chão de cada tema (canvas 256², quase branco; o
//    vértice tinge), na mesma escala das outras (4 m por volta).
//  - `seaFloor()`: o chão lá embaixo que o `arena-view` não desenha (mar de
//    gelo, represa), com a textura que anda.
//  - `around()`: pontos em anel para o fundo, sorteados e fixos.

import { Color3 } from "@babylonjs/core/Maths/math.color"
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector"
import { Mesh } from "@babylonjs/core/Meshes/mesh"
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData"
import { CreateDisc } from "@babylonjs/core/Meshes/Builders/discBuilder"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture"
import { Texture } from "@babylonjs/core/Materials/Textures/texture"
import type { Scene } from "@babylonjs/core/scene"
import type { Material } from "@babylonjs/core/Materials/material"
import { SoftGeo } from "../../../gincana/engine/shapes"
import type { RGB } from "../../../engine/geometry"
import type { Island } from "../../sim/map"
import { krnd } from "../arena-kit"
import type { ArenaCtx } from "./types"

export const rnd = krnd
export const mixc = (a: RGB, b: RGB, k: number): RGB => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]
export const mulc = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k]
/** Varia o tom em ±k pelo número (lasca, tábua, bloco). */
export const jit = (c: RGB, n: number, k = 0.08): RGB => mulc(c, 1 - k + rnd(n) * k * 2)

/** Um anel do sólido: altura (mundo), escala em volta do centro e cor. */
export interface Ring {
  y: number
  k: number
  c: RGB | ((i: number, x: number, z: number) => RGB)
  /** Empurra cada ponto para fora/dentro por sorteio (pedra torta); 0 = reto. */
  j?: number
}

/** Sólido facetado por contorno (cor por vértice, normal por face). */
export class Poly {
  private P: number[] = []
  private N: number[] = []
  private C: number[] = []
  private I: number[] = []
  get vertexCount() {
    return this.P.length / 3
  }
  /** Triângulo com cor por canto (normal da face). */
  tri(a: number[], b: number[], c: number[], ca: RGB, cb: RGB = ca, cc: RGB = ca) {
    const ux = b[0] - a[0]
    const uy = b[1] - a[1]
    const uz = b[2] - a[2]
    const vx = c[0] - a[0]
    const vy = c[1] - a[1]
    const vz = c[2] - a[2]
    let nx = uy * vz - uz * vy
    let ny = uz * vx - ux * vz
    let nz = ux * vy - uy * vx
    const l = Math.hypot(nx, ny, nz) || 1
    nx /= l
    ny /= l
    nz /= l
    const base = this.P.length / 3
    for (const [p, col] of [[a, ca], [b, cb], [c, cc]] as const) {
      this.P.push(p[0], p[1], p[2])
      this.N.push(nx, ny, nz)
      this.C.push(col[0], col[1], col[2], 1)
    }
    // Babylon: frente no sentido horário visto de fora
    this.I.push(base, base + 2, base + 1)
  }
  quad(a: number[], b: number[], c: number[], d: number[], ca: RGB, cb: RGB = ca, cc: RGB = cb, cd: RGB = ca) {
    this.tri(a, b, c, ca, cb, cc)
    this.tri(a, c, d, ca, cc, cd)
  }
  /**
   * O sólido do contorno `O` (sentido qualquer), de anel em anel, com tampa
   * embaixo (e em cima se `top`). Os lados olham para fora.
   */
  stack(O: [number, number][], cx: number, cz: number, rings: Ring[], seed = 0, top: RGB | null = null) {
    const n = O.length
    // contorno em sentido anti-horário (visto de cima) para as normais saírem para fora
    let area = 0
    for (let i = 0; i < n; i++) area += O[i][0] * O[(i + 1) % n][1] - O[(i + 1) % n][0] * O[i][1]
    const pts = area > 0 ? O : [...O].reverse()
    const ring = (r: Ring, ri: number) =>
      pts.map(([x, z], i) => {
        const jj = r.j ? 1 + (rnd(seed * 131 + ri * 37 + i * 7) - 0.5) * 2 * r.j : 1
        const k = r.k * jj
        const px = cx + (x - cx) * k
        const pz = cz + (z - cz) * k
        const col = typeof r.c === "function" ? r.c(i, px, pz) : r.c
        return { p: [px, r.y, pz], c: col }
      })
    const R = rings.map(ring)
    for (let r = 0; r + 1 < R.length; r++) {
      const A = R[r]
      const B = R[r + 1]
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n
        this.quad(A[i].p, A[j].p, B[j].p, B[i].p, A[i].c, A[j].c, B[j].c, B[i].c)
      }
    }
    const last = R[R.length - 1]
    const lc = rings[rings.length - 1]
    const bot = [cx, lc.y - 0.001, cz]
    for (let i = 0; i < n; i++) this.tri(bot, last[(i + 1) % n].p, last[i].p, last[i].c)
    if (top) {
      const first = R[0]
      const tp = [cx, rings[0].y, cz]
      for (let i = 0; i < n; i++) this.tri(tp, first[i].p, first[(i + 1) % n].p, top)
    }
  }
  /** Caixa orientada (centro, meias medidas, giro em y) com cor de cima/lado/baixo. */
  box(x: number, y: number, z: number, hw: number, hh: number, hd: number, rot: number, top: RGB, side: RGB = top, bottom: RGB = side) {
    const c = Math.cos(rot)
    const s = Math.sin(rot)
    const O: [number, number][] = [
      [-hw, -hd],
      [hw, -hd],
      [hw, hd],
      [-hw, hd],
    ].map(([a, b]) => [x + a * c + b * s, z - a * s + b * c])
    this.stack(O, x, z, [
      { y: y + hh, k: 1, c: side },
      { y: y - hh, k: 1, c: bottom },
    ], 0, top)
  }
  build(name: string, scene: Scene, mat: Material): Mesh {
    const m = new Mesh(name, scene)
    const vd = new VertexData()
    vd.positions = this.P
    vd.normals = this.N
    vd.colors = this.C
    vd.indices = this.I
    vd.applyToMesh(m, false)
    m.material = mat
    m.isPickable = false
    m.freezeWorldMatrix()
    m.doNotSyncBoundingInfo = true
    return m
  }
}

/**
 * Anéis de crescimento de verdade no corte do toco (por cima do chão, centrados nele): faixas claras e escuras
 * alternadas, mais finas para fora, rachas do miolo. `O` = contorno; `lift` acima do chão.
 */
export function rings(poly: Poly, O: [number, number][], cx: number, cz: number, y: number, light: RGB, dark: RGB, seed: number, lift = 0.016) {
  const R = Math.max(...O.map(([x, z]) => Math.hypot(x - cx, z - cz)))
  const yy = y + lift
  let k0 = 0.97
  let band = 0
  while (k0 > 0.04) {
    // claro largo (0,22–0,55 m, mais fino para fora) e escuro fino (0,06–0,12 m), em contraste baixo
    const m = band % 2 ? 0.06 + rnd(seed * 7 + band) * 0.06 : (0.22 + rnd(seed * 7 + band) * 0.33) * (0.55 + (1 - k0) * 0.6)
    const k1 = Math.max(0.02, k0 - m / R)
    const c = band % 2 ? mixc(light, dark, 0.5) : jit(light, seed + band, 0.04)
    for (let i = 0; i < O.length; i++) {
      const a = O[i]
      const b = O[(i + 1) % O.length]
      const p = (q: [number, number], k: number) => [cx + (q[0] - cx) * k, yy, cz + (q[1] - cz) * k]
      poly.quad(p(a, k0), p(b, k0), p(b, k1), p(a, k1), c, c, c, c)
    }
    k0 = k1
    band++
  }
}

/** Monta as malhas de um mapa: `lit` (peças da Gincana, aceso pela luz), `glow` (sem luz) e `poly` (facetado). */
export function meshes(ctx: ArenaCtx, name: string) {
  const lit = new SoftGeo()
  const glow = new SoftGeo()
  const poly = new Poly()
  return {
    lit,
    glow,
    poly,
    done() {
      const { scene } = ctx
      if (poly.vertexCount) ctx.add(poly.build(`paint-${name}-poly`, scene, ctx.solidMat))
      if (lit.vertexCount) ctx.add(lit.build(`paint-${name}-lit`, scene, ctx.solidMat))
      if (glow.vertexCount) ctx.add(glow.build(`paint-${name}-glow`, scene, ctx.glowMat))
    },
  }
}

/** Centro do contorno (média dos pontos). */
export function centerOf(O: [number, number][]) {
  let x = 0
  let z = 0
  for (const p of O) {
    x += p[0]
    z += p[1]
  }
  return { x: x / O.length, z: z / O.length }
}

/** Pontos em anel (fundo): `n` lugares de raio R0–R1, com sorteio fixo; `skip(a)` tira um ângulo (rad, 0 = +z). */
export function around(n: number, R0: number, R1: number, seed: number, skip?: (a: number) => boolean) {
  const out: { x: number; z: number; a: number; d: number; i: number }[] = []
  for (let i = 0; i < n; i++) {
    const a = ((i + rnd(seed * 97 + i) * 0.7) / n) * Math.PI * 2
    if (skip?.(a)) continue
    const d = R0 + rnd(seed * 89 + i * 3) * (R1 - R0)
    out.push({ x: Math.sin(a) * d, z: Math.cos(a) * d, a, d, i })
  }
  return out
}

/** Ilha é de qual tag? */
export const tagOf = (isl: Island) => isl.tag ?? ""

// ── texturas do chão (256², quase branco; o vértice tinge) ──

type TileKind = "sand" | "ice" | "glass" | "wood" | "concrete"

export function tileTex(scene: Scene, kind: TileKind): DynamicTexture {
  const S = 256
  const tex = new DynamicTexture(`paint-tile-${kind}`, { width: S, height: S }, scene, true)
  const g = tex.getContext() as unknown as CanvasRenderingContext2D
  const grey = (k: number, a = 1) => `rgba(${Math.round(k * 255)},${Math.round(k * 255)},${Math.round(k * 255)},${a})`
  g.fillStyle = grey(0.95)
  g.fillRect(0, 0, S, S)
  if (kind === "sand") {
    // arenito: faixas finas onduladas (estrato visto de cima), manchas e pedrinhas
    for (let i = 0; i < 26; i++) {
      g.strokeStyle = grey(0.8 + rnd(i + 3) * 0.12, 0.6)
      g.lineWidth = 2 + rnd(i + 5) * 5
      g.beginPath()
      const y0 = (i / 26) * S
      for (let x = -8; x <= S + 8; x += 16) g.lineTo(x, y0 + Math.sin(x * 0.045 + i) * 6)
      g.stroke()
    }
    for (let i = 0; i < 60; i++) {
      g.fillStyle = grey(rnd(i * 7) > 0.5 ? 1 : 0.7, 0.5)
      g.beginPath()
      g.arc(rnd(i * 3 + 1) * S, rnd(i * 5 + 2) * S, 1 + rnd(i * 11) * 2.5, 0, Math.PI * 2)
      g.fill()
    }
    g.strokeStyle = grey(0.55, 0.45)
    g.lineWidth = 1.5
    for (let i = 0; i < 7; i++) {
      g.beginPath()
      let x = rnd(i * 13) * S
      let y = rnd(i * 17) * S
      g.moveTo(x, y)
      for (let k = 0; k < 4; k++) {
        x += (rnd(i * 19 + k) - 0.5) * 40
        y += (rnd(i * 23 + k) - 0.5) * 40
        g.lineTo(x, y)
      }
      g.stroke()
    }
  } else if (kind === "ice") {
    // gelo: placas com rachaduras finas claras e escuras, neve soprada em faixas
    for (let i = 0; i < 9; i++) {
      g.fillStyle = grey(0.86 + rnd(i * 3) * 0.12, 0.7)
      g.beginPath()
      const x = rnd(i * 5) * S
      const y = rnd(i * 7) * S
      g.ellipse(x, y, 30 + rnd(i) * 50, 14 + rnd(i + 1) * 20, rnd(i + 2) * 3, 0, Math.PI * 2)
      g.fill()
    }
    for (let i = 0; i < 16; i++) {
      g.strokeStyle = i % 3 ? grey(0.74, 0.35) : grey(1, 0.9)
      g.lineWidth = i % 3 ? 1.2 : 1
      g.beginPath()
      let x = rnd(i * 13 + 4) * S
      let y = rnd(i * 17 + 4) * S
      g.moveTo(x, y)
      for (let k = 0; k < 5; k++) {
        x += (rnd(i * 19 + k) - 0.5) * 60
        y += (rnd(i * 23 + k) - 0.5) * 60
        g.lineTo(x, y)
      }
      g.stroke()
    }
  } else if (kind === "glass") {
    // vidro: ladrilho grande com fio de metal, reflexo em diagonal
    g.fillStyle = grey(0.9)
    g.fillRect(0, 0, S, S)
    for (let y = 0; y < 2; y++)
      for (let x = 0; x < 2; x++) {
        const k = 0.86 + rnd(x * 3 + y * 5) * 0.12
        g.fillStyle = grey(k)
        g.fillRect(x * 128 + 5, y * 128 + 5, 118, 118)
        g.fillStyle = grey(1, 0.5)
        g.beginPath()
        g.moveTo(x * 128 + 20, y * 128 + 110)
        g.lineTo(x * 128 + 50, y * 128 + 110)
        g.lineTo(x * 128 + 110, y * 128 + 20)
        g.lineTo(x * 128 + 80, y * 128 + 20)
        g.fill()
      }
    g.fillStyle = grey(0.5)
    for (const p of [0, 128]) {
      g.fillRect(p, 0, 4, S)
      g.fillRect(0, p, S, 4)
    }
  } else if (kind === "wood") {
    // madeira: veio fino e ondulado (os anéis de verdade cada toco desenha por cima, `rings()`)
    for (let i = 0; i < 70; i++) {
      g.strokeStyle = grey(0.74 + rnd(i * 3) * 0.2, 0.55)
      g.lineWidth = 1 + rnd(i + 5) * 2.5
      g.beginPath()
      const y0 = rnd(i * 7 + 1) * S
      for (let x = -8; x <= S + 8; x += 12) g.lineTo(x, y0 + Math.sin(x * 0.03 + i) * 5)
      g.stroke()
    }
    g.strokeStyle = grey(0.45, 0.5)
    g.lineWidth = 1.5
    for (let i = 0; i < 4; i++) {
      const x = rnd(i * 17) * S
      const y = rnd(i * 19) * S
      g.beginPath()
      g.moveTo(x, y)
      g.lineTo(x + 20 + rnd(i) * 30, y + (rnd(i + 2) - 0.5) * 6)
      g.stroke()
    }
  } else {
    // concreto: placas de 2 m com junta, poros e manchas de água
    g.fillStyle = grey(0.5, 0.5)
    g.fillRect(0, 126, S, 4)
    g.fillRect(126, 0, 4, S)
    for (let i = 0; i < 260; i++) {
      g.fillStyle = grey(rnd(i * 3) > 0.5 ? 0.72 : 1, 0.45)
      g.fillRect(rnd(i * 5) * S, rnd(i * 7) * S, 1.5 + rnd(i) * 2, 1.5 + rnd(i + 1) * 2)
    }
    for (let i = 0; i < 6; i++) {
      g.fillStyle = grey(0.78, 0.25)
      g.beginPath()
      g.ellipse(rnd(i * 11) * S, rnd(i * 13) * S, 16 + rnd(i) * 26, 8 + rnd(i + 2) * 14, rnd(i + 3) * 3, 0, Math.PI * 2)
      g.fill()
    }
  }
  tex.wrapU = Texture.WRAP_ADDRESSMODE
  tex.wrapV = Texture.WRAP_ADDRESSMODE
  tex.update(true)
  return tex
}

// ── o chão lá embaixo (mar de gelo, represa) ──

/** Disco grande na altura `y` com textura pintada que repete (`paint` desenha no canvas 256²); `flow` faz andar. */
export function seaFloor(ctx: ArenaCtx, name: string, y: number, radius: number, rep: number, paint: (g: CanvasRenderingContext2D, S: number) => void, tint: RGB, emissive: RGB, flow = 0) {
  const S = 256
  const tex = ctx.own(new DynamicTexture(`paint-${name}-sea`, { width: S, height: S }, ctx.scene, true))
  paint(tex.getContext() as unknown as CanvasRenderingContext2D, S)
  tex.wrapU = Texture.WRAP_ADDRESSMODE
  tex.wrapV = Texture.WRAP_ADDRESSMODE
  tex.uScale = rep
  tex.vScale = rep
  tex.update(true)
  const mat = ctx.own(new StandardMaterial(`paint-${name}-sea`, ctx.scene))
  mat.diffuseTexture = tex
  mat.diffuseColor = new Color3(tint[0], tint[1], tint[2])
  mat.emissiveColor = new Color3(emissive[0], emissive[1], emissive[2])
  mat.specularColor = new Color3(0.25, 0.25, 0.28)
  mat.specularPower = 48
  const sea = CreateDisc(`paint-${name}-sea`, { radius, tessellation: 48 }, ctx.scene)
  sea.rotation.x = Math.PI / 2
  sea.position.set(0, y, 0)
  sea.material = mat
  sea.isPickable = false
  sea.freezeWorldMatrix()
  ctx.add(sea)
  return {
    tick(dt: number) {
      if (!flow) return
      tex.uOffset = (tex.uOffset + dt * flow) % 1
      tex.vOffset = (tex.vOffset + dt * flow * 0.37) % 1
    },
  }
}

/** Desenha com `fn` e sobe/desce (e gira) o que ela pôs — as peças da Gincana nascem no nível 0 da prova. */
export function placed(geos: SoftGeo[], m: Matrix, fn: () => void) {
  const starts = geos.map((g) => g.vertexCount)
  fn()
  geos.forEach((g, i) => g.transformSince(starts[i], m))
}

/** Vetor (para `SoftGeo.tube`). */
export const v3 = (x: number, y: number, z: number) => new Vector3(x, y, z)
