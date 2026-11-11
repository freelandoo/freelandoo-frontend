// features/meu-mundo/engine/cena-codigo/kit.ts — KIT das peças feitas em código (skill `meu-mundo-cenario-codigo`).
//
// Acumulador de malha com cor e DESGASTE por vértice, perfil girado (`sweep`), caixas no quadro
// polar (`pbox`/`hexa`), parafuso, ruído e o acabamento (`finish`: corpo + brilho numa chamada).
// Convenções: frente da peça = −z; quad(a,b,c,d) com normal (b−a)×(d−a); perfil do `sweep`
// anda com o "fora" à direita (normal da aresta = (dz, −dr)).

import type { Scene } from "@babylonjs/core/scene"
import { Mesh } from "@babylonjs/core/Meshes/mesh"
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { fuseGlow } from "../steampunk/glow-fuse"

export type V3 = [number, number, number]
export type RGB = readonly [number, number, number]
export const TAU = Math.PI * 2

export const NAVY: RGB = [0.075, 0.095, 0.16]
export const NAVY_DK: RGB = [0.035, 0.045, 0.08]
export const PLATE: RGB = [0.11, 0.14, 0.225]
export const SHELL: RGB = [0.15, 0.185, 0.29]
export const EDGE: RGB = [0.27, 0.34, 0.5]
export const BARE: RGB = [0.6, 0.67, 0.8]
export const DEEP: RGB = [0.015, 0.02, 0.035]
export const STEEL: RGB = [0.2, 0.23, 0.3]
export const BRASS: RGB = [0.62, 0.45, 0.18]
export const COPPER: RGB = [0.6, 0.31, 0.13]
export const RUST: RGB = [0.3, 0.15, 0.07]
export const HAZ_Y: RGB = [0.9, 0.62, 0.08]
export const HAZ_K: RGB = [0.03, 0.03, 0.04]
export const G_RED: RGB = [1, 0.26, 0.03]
export const G_OR: RGB = [1, 0.5, 0.08]
export const G_HOT: RGB = [1, 0.84, 0.32]
export const G_CORE: RGB = [1, 0.97, 0.82]
export const G_AMB: RGB = [1, 0.6, 0.12]
export const CYAN: RGB = [0.35, 0.95, 1]

// ── ruído de valor 3D (determinístico) ──
const fr = (x: number) => x - Math.floor(x)
const h3 = (i: number, j: number, k: number) => fr(Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453)
const sm = (t: number) => t * t * (3 - 2 * t)
export function noise(x: number, y: number, z: number) {
  const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z)
  const u = sm(x - i), v = sm(y - j), w = sm(z - k)
  const L = (a: number, b: number, t: number) => a + (b - a) * t
  return L(
    L(L(h3(i, j, k), h3(i + 1, j, k), u), L(h3(i, j + 1, k), h3(i + 1, j + 1, k), u), v),
    L(L(h3(i, j, k + 1), h3(i + 1, j, k + 1), u), L(h3(i, j + 1, k + 1), h3(i + 1, j + 1, k + 1), u), v),
    w,
  )
}
export const step01 = (a: number, b: number, x: number) => sm(Math.min(1, Math.max(0, (x - a) / (b - a))))

export class Geo {
  p: number[] = []
  n: number[] = []
  c: number[] = []
  w: number[] = []
  i: number[] = []
  get count() {
    return this.p.length / 3
  }
  v(pos: V3, nor: V3, col: RGB, wear = 0) {
    this.p.push(pos[0], pos[1], pos[2])
    this.n.push(nor[0], nor[1], nor[2])
    this.c.push(col[0], col[1], col[2], 1)
    this.w.push(wear)
    return this.count - 1
  }
  /** a,b,c,d em volta; normal = (b−a)×(d−a). `col`: uma cor ou quatro. */
  quad(a: V3, b: V3, c: V3, d: V3, col: RGB | readonly RGB[], wear = 0) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2]
    const vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2]
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx
    const l = Math.hypot(nx, ny, nz) || 1
    nx /= l; ny /= l; nz /= l
    const s = this.count
    const many = Array.isArray(col[0])
    const q = [a, b, c, d]
    for (let k = 0; k < 4; k++) this.v(q[k], [nx, ny, nz], many ? (col as readonly RGB[])[k] : (col as RGB), wear)
    this.i.push(s, s + 2, s + 1, s, s + 3, s + 2)
  }
  /** Sujeira, ferrugem e quina lascada, pelo lugar do vértice. */
  weather(o: { rust?: RGB; bare?: RGB; grime?: number; rustAmt?: number } = {}) {
    const RUST_ = o.rust ?? RUST, BARE_ = o.bare ?? BARE, GR = o.grime ?? 1, RA = o.rustAmt ?? 1
    for (let k = 0; k < this.count; k++) {
      const x = this.p[k * 3], y = this.p[k * 3 + 1], z = this.p[k * 3 + 2]
      let r = this.c[k * 4], g = this.c[k * 4 + 1], b = this.c[k * 4 + 2]
      const wear = this.w[k]
      const grime = 1 + GR * (-0.26 + 0.46 * noise(x * 2.3 + 3, y * 2.3, z * 2.3) - 0.1 * noise(x * 11, y * 11, z * 11))
      r *= grime; g *= grime; b *= grime
      const ru = step01(0.6, 0.85, noise(x * 4.7 + 17, y * 4.7 + 5, z * 6)) * 0.75 * RA * (1 - wear)
      r += (RUST_[0] - r) * ru; g += (RUST_[1] - g) * ru; b += (RUST_[2] - b) * ru
      if (wear > 0) {
        const chip = step01(0.38, 0.62, noise(x * 13 + 5, y * 13 + 9, z * 13)) * wear
        r += (BARE_[0] - r) * chip; g += (BARE_[1] - g) * chip; b += (BARE_[2] - b) * chip
      }
      this.c[k * 4] = r; this.c[k * 4 + 1] = g; this.c[k * 4 + 2] = b
    }
  }
  build(name: string, scene: Scene, mat: StandardMaterial) {
    const m = new Mesh(name, scene)
    const vd = new VertexData()
    vd.positions = this.p
    vd.normals = this.n
    vd.colors = this.c
    vd.indices = this.i
    vd.uvs = new Array(this.count * 2).fill(0.5)
    vd.applyToMesh(m)
    m.material = mat
    return m
  }
}

export interface Pt {
  r: number
  z: number
  c: RGB
  w?: number
}
export const pt = (r: number, z: number, c: RGB, w = 0): Pt => ({ r, z, c, w })

/**
 * Gira o perfil (r, z) em volta de z, centro (cx, cy). O perfil anda com o "fora" à direita:
 * normal da aresta = (dz, −dr). `smooth`: normais e cores por ponto (liso); senão por aresta
 * (quina dura; cor e desgaste do ponto onde a aresta começa). `shade(t)`: escurece ao longo do giro.
 */
export function sweep(g: Geo, prof: Pt[], o: { a0?: number; a1?: number; seg: number; cx?: number; cy?: number; smooth?: boolean; shade?: (t: number) => number }) {
  const { a0 = 0, a1 = TAU, seg, cx = 0, cy = 0, smooth = false, shade } = o
  const en: [number, number][] = []
  for (let k = 0; k < prof.length - 1; k++) {
    const nr = prof[k + 1].z - prof[k].z, nz = -(prof[k + 1].r - prof[k].r)
    const l = Math.hypot(nr, nz) || 1
    en.push([nr / l, nz / l])
  }
  const mul = (c: RGB, f: number): RGB => [c[0] * f, c[1] * f, c[2] * f]
  if (smooth) {
    const L = prof.length
    const base = g.count
    for (let s = 0; s <= seg; s++) {
      const t = s / seg, a = a0 + (a1 - a0) * t
      const ca = Math.cos(a), sa = Math.sin(a), f = shade ? shade(t) : 1
      for (let k = 0; k < L; k++) {
        const e0 = en[Math.max(0, k - 1)], e1 = en[Math.min(L - 2, k)]
        let nr = e0[0] + e1[0], nz = e0[1] + e1[1]
        const l = Math.hypot(nr, nz) || 1
        nr /= l; nz /= l
        g.v([cx + prof[k].r * ca, cy + prof[k].r * sa, prof[k].z], [nr * ca, nr * sa, nz], mul(prof[k].c, f), prof[k].w)
      }
    }
    for (let s = 0; s < seg; s++)
      for (let k = 0; k < L - 1; k++) {
        const v00 = base + s * L + k, v01 = v00 + 1, v10 = v00 + L, v11 = v10 + 1
        g.i.push(v00, v01, v10, v01, v11, v10)
      }
    return
  }
  for (let k = 0; k < prof.length - 1; k++) {
    const p0 = prof[k], p1 = prof[k + 1], [nr, nz] = en[k]
    const base = g.count
    for (let s = 0; s <= seg; s++) {
      const t = s / seg, a = a0 + (a1 - a0) * t
      const ca = Math.cos(a), sa = Math.sin(a)
      const col = shade ? mul(p0.c, shade(t)) : p0.c
      g.v([cx + p0.r * ca, cy + p0.r * sa, p0.z], [nr * ca, nr * sa, nz], col, p0.w)
      g.v([cx + p1.r * ca, cy + p1.r * sa, p1.z], [nr * ca, nr * sa, nz], col, p0.w)
    }
    for (let s = 0; s < seg; s++) {
      const a = base + s * 2
      g.i.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
  }
}

/** Ponto no quadro polar: ângulo `a`, raio `r`, deslocamento tangencial `u`. */
export const pp = (a: number, r: number, u: number, z: number): V3 => {
  const c = Math.cos(a), s = Math.sin(a)
  return [c * r - s * u, s * r + c * u, z]
}

export function hexa(g: Geo, f: V3[], b: V3[], cf: RGB, cs: RGB, o: { front?: boolean; back?: boolean; ends?: boolean; wf?: number; ws?: number } = {}) {
  const { front = true, back = true, ends = true, wf = 0, ws = 0 } = o
  if (front) g.quad(f[0], f[1], f[2], f[3], cf, wf)
  if (back) g.quad(b[3], b[2], b[1], b[0], cs)
  if (ends) {
    g.quad(f[3], f[2], b[2], b[3], cs, ws)
    g.quad(f[1], f[0], b[0], b[1], cs, ws)
  }
  g.quad(f[2], f[1], b[1], b[2], cs, ws)
  g.quad(f[0], f[3], b[3], b[0], cs, ws)
}

/** Caixa (trapézio) no quadro polar: raio r0→r1, meia-largura h0→h1, z de zf (frente) a zb. */
export function pbox(g: Geo, a: number, r0: number, r1: number, h0: number, h1: number, zf: number, zb: number, cf: RGB, cs: RGB, o: { uc?: number; bevel?: number; ce?: RGB; back?: boolean; ends?: boolean } = {}) {
  const { uc = 0, bevel = 0, ce = EDGE, back = true, ends = true } = o
  const C = (z: number, i: number): V3[] => [pp(a, r0 + i, uc - (h0 - i), z), pp(a, r0 + i, uc + (h0 - i), z), pp(a, r1 - i, uc + (h1 - i), z), pp(a, r1 - i, uc - (h1 - i), z)]
  if (bevel > 0) {
    const F = C(zf, bevel), M = C(zf + bevel, 0)
    hexa(g, F, M, cf, ce, { back: false, ws: 1 })
    hexa(g, M, C(zb, 0), cf, cs, { front: false, back })
  } else hexa(g, C(zf, 0), C(zb, 0), cf, cs, { back, ends })
}

/** Parafuso de 5 lados no ponto polar (a, r, u), saindo da face em z. */
export function bolt(g: Geo, a: number, r: number, u: number, z: number, s = 0.02) {
  const [cx, cy] = pp(a, r, u, 0)
  sweep(g, [pt(0, z - s, BARE, 0.4), pt(s * 0.75, z - s, STEEL), pt(s * 1.1, z + 0.002, STEEL)], { seg: 5, cx, cy })
}


/**
 * Fecha a peça: desgaste no corpo, materiais e corpo + brilho numa malha (1 chamada).
 * `spec`: cor do reflexo (metal frio = azulado; pedra/madeira = quase preto, power baixo).
 */
export function finish(scene: Scene, name: string, body: Geo, glow: Geo | null, o: { spec?: RGB; power?: number; self?: RGB; weather?: Parameters<Geo["weather"]>[0] | false } = {}): Mesh {
  if (o.weather !== false) body.weather(o.weather ?? {})
  const spec = o.spec ?? [0.55, 0.62, 0.78], self = o.self ?? [0.035, 0.045, 0.07]
  const mat = new StandardMaterial(name, scene)
  mat.diffuseColor = new Color3(1, 1, 1)
  mat.specularColor = new Color3(spec[0], spec[1], spec[2])
  mat.specularPower = o.power ?? 40
  mat.emissiveColor = new Color3(self[0], self[1], self[2])
  const b = body.build(name, scene, mat)
  if (!glow || !glow.count) return b
  const gm = new StandardMaterial(name + "-glow", scene)
  gm.disableLighting = true
  gm.emissiveColor = new Color3(1, 1, 1)
  gm.diffuseColor = new Color3(0, 0, 0)
  gm.specularColor = new Color3(0, 0, 0)
  return fuseGlow(b, glow.build(name + "-glow", scene, gm))
}
