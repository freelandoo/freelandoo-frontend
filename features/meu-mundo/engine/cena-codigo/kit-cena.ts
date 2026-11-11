// features/meu-mundo/engine/cena-codigo/kit-cena.ts — CENÁRIO inteiro em código (skill `meu-mundo-cenario-codigo`).
//
// Uma `Cena` é só geometria (sem Babylon): um `Geo` por BLOCO de 32 m (o mesmo tamanho dos blocos
// do bairro, `QUALITY.propCell`), um `Geo` de pano de fundo, as caixas de colisão e os caminhos de
// andar. Tudo usa UM material de cor por vértice → cada bloco é UMA chamada de desenho.
// `finishCena` vira malhas do Babylon (no harness e, depois, no jogo).
//
// Regra do jogo: o chão de ANDAR é plano (y = 0) e a colisão é por caixas (`Box2`). Relevo só
// fora do caminho; o que é alto vira caixa.

import type { Scene } from "@babylonjs/core/scene"
import { Mesh } from "@babylonjs/core/Meshes/mesh"
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial"
import { Color3 } from "@babylonjs/core/Maths/math.color"
import { Geo, type RGB, type V3 } from "./kit"
import { mul, smooth } from "./kit-natureza"
import { fuseGlow } from "../steampunk/glow-fuse"

/** A caixa de colisão do jogo (`engine/collision.ts`). */
export interface Box2 {
  x: number
  z: number
  hx: number
  hz: number
  rot: number
  h: number
}
export type XZ = readonly [number, number]

export class Cena {
  readonly cells = new Map<string, Geo>()
  /** Luz ACESA de cada bloco (outdoor, letreiro, janela à noite, lava): junta no bloco pelo `fuseGlow` (continua 1 chamada). */
  readonly glows = new Map<string, Geo>()
  /** Pano de fundo (fora da área jogável): 1 malha, nunca colide. */
  readonly fundo = new Geo()
  readonly blockers: Box2[] = []
  /** Caminhos de andar (polilinhas): o harness confere que estão livres e planos. */
  readonly walk: XZ[][] = []
  /** Pontos que o JOGO lê (Domínios: `entrada`, `saida`, `chefe`, `guardiao`, `deus`, lugares da lore). `ang` = para onde olha. */
  readonly pontos: Record<string, { x: number; z: number; ang: number }> = {}
  /** Zonas de monstro: polígono no chão, uma por setor do Domínio (os monstros soltos daquele setor andam dentro). */
  readonly zonas: { setor: number; poly: XZ[] }[] = []
  /** Altura do chão desenhado (a `ground` registra); o caminho tem que dar 0. */
  height: (x: number, z: number) => number = () => 0
  constructor(
    readonly name: string,
    /** 0 = perto (tudo); 1 = longe (sem capim, árvore de 1 bolha, mesa sem prateleira). */
    readonly lod = 0,
    readonly cell = 32,
  ) {}
  /** O `Geo` do bloco que contém (x, z). Cada objeto entra no bloco do PÉ dele. */
  geo(x: number, z: number): Geo {
    const k = `${Math.floor(x / this.cell)},${Math.floor(z / this.cell)}`
    let g = this.cells.get(k)
    if (!g) this.cells.set(k, (g = new Geo()))
    return g
  }
  /** O `Geo` de luz acesa do bloco de (x, z). Tudo aqui fica 2–15 cm À FRENTE da face do corpo. */
  glow(x: number, z: number): Geo {
    this.geo(x, z)
    const k = `${Math.floor(x / this.cell)},${Math.floor(z / this.cell)}`
    let g = this.glows.get(k)
    if (!g) this.glows.set(k, (g = new Geo()))
    return g
  }
  block(x: number, z: number, hx: number, hz: number, h = 4, rot = 0) {
    this.blockers.push({ x, z, hx, hz, rot, h })
  }
  ponto(nome: string, x: number, z: number, ang = 0) {
    this.pontos[nome] = { x, z, ang }
  }
  zona(setor: number, poly: XZ[]) {
    this.zonas.push({ setor, poly })
  }
  /** Planta oval → duas caixas (reta e a 45°): aproxima o octógono. */
  blockOval(x: number, z: number, rx: number, rz: number, h: number) {
    this.block(x, z, rx * 0.8, rz * 0.8, h, 0)
    const r = (rx + rz) / 2
    this.block(x, z, r * 0.78, r * 0.78, h, Math.PI / 4)
  }
  get tris() {
    let n = this.fundo.i.length / 3
    for (const g of this.cells.values()) n += g.i.length / 3
    for (const g of this.glows.values()) n += g.i.length / 3
    return n
  }
}

/** Distância de (x, z) à polilinha. */
export function distPath(x: number, z: number, pts: readonly XZ[]) {
  let best = Infinity
  for (let k = 0; k < pts.length - 1; k++) {
    const [ax, az] = pts[k], [bx, bz] = pts[k + 1]
    const dx = bx - ax, dz = bz - az
    const t = Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)))
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t))
  }
  return best
}

/**
 * Chão: grade de `step` m sobre o retângulo, um pedaço por bloco (as bordas batem: mesma função).
 * `color(x, z)` pinta (misture máscaras: trilha, capim, terra perto da rocha, margem). `height`
 * tem que dar 0 em todo lugar onde se anda. Em `fundo: true` vai para o pano de fundo (grade larga).
 */
export function ground(c: Cena, o: { x0: number; z0: number; x1: number; z1: number; step: number; color: (x: number, z: number) => RGB; height?: (x: number, z: number) => number; fundo?: boolean; y?: number; hole?: readonly [number, number, number, number] }) {
  const H = o.height ?? (() => 0)
  if (!o.fundo) c.height = H
  const { step, y = 0 } = o
  const put = (g: Geo, xa: number, za: number, xb: number, zb: number) => {
    const nx = Math.max(1, Math.round((xb - xa) / step)), nz = Math.max(1, Math.round((zb - za) / step))
    const base = g.count
    for (let j = 0; j <= nz; j++)
      for (let i = 0; i <= nx; i++) {
        const x = xa + ((xb - xa) * i) / nx, z = za + ((zb - za) * j) / nz
        const e = 0.5
        const n: V3 = [H(x - e, z) - H(x + e, z), 2 * e, H(x, z - e) - H(x, z + e)]
        const l = Math.hypot(n[0], n[1], n[2])
        g.v([x, y + H(x, z), z], [n[0] / l, n[1] / l, n[2] / l], o.color(x, z))
      }
    for (let j = 0; j < nz; j++)
      for (let i = 0; i < nx; i++) {
        const a = base + j * (nx + 1) + i, b = a + 1, d = a + nx + 1, e2 = d + 1
        g.i.push(a, b, d, b, e2, d)
      }
  }
  if (o.fundo) {
    // saia do pano de fundo: com `hole` = [x0, z0, x1, z1] da área jogável, contorna a área (não cobre o rio nem o relevo)
    if (!o.hole) return put(c.fundo, o.x0, o.z0, o.x1, o.z1)
    const [hx0, hz0, hx1, hz1] = o.hole
    put(c.fundo, o.x0, o.z0, o.x1, hz0)
    put(c.fundo, o.x0, hz1, o.x1, o.z1)
    put(c.fundo, o.x0, hz0, hx0, hz1)
    put(c.fundo, hx1, hz0, o.x1, hz1)
    return
  }
  const S = c.cell
  for (let cz = Math.floor(o.z0 / S); cz * S < o.z1; cz++)
    for (let cx = Math.floor(o.x0 / S); cx * S < o.x1; cx++) put(c.geo(cx * S + 1, cz * S + 1), Math.max(o.x0, cx * S), Math.max(o.z0, cz * S), Math.min(o.x1, (cx + 1) * S), Math.min(o.z1, (cz + 1) * S))
}

/**
 * Rio/canal: fita de `width` m ao longo da polilinha, em y = `y` (abaixo do chão), funda no meio e
 * clara na margem, com fio de espuma. Põe caixas de colisão (rio não se atravessa).
 */
export function river(c: Cena, pts: readonly XZ[], width: number, o: { y?: number; deep: RGB; shallow: RGB; foam: RGB; block?: boolean }) {
  const { y = -0.3, block = true } = o
  const across: [number, RGB][] = [[-0.5, o.foam], [-0.42, o.shallow], [0, o.deep], [0.42, o.shallow], [0.5, o.foam]]
  for (let k = 0; k < pts.length - 1; k++) {
    const [ax, az] = pts[k], [bx, bz] = pts[k + 1]
    const L = Math.hypot(bx - ax, bz - az)
    const n = Math.max(1, Math.round(L / 4))
    // normal de cada ponta = média com o trecho vizinho (a fita não abre na curva)
    const side = (i: number): XZ => {
      const p = pts[Math.max(0, i - 1)], q = pts[Math.min(pts.length - 1, i + 1)]
      const dx = q[0] - p[0], dz = q[1] - p[1], l = Math.hypot(dx, dz) || 1
      return [-dz / l, dx / l]
    }
    const sa = side(k), sb = side(k + 1)
    for (let s = 0; s < n; s++) {
      const t0 = s / n, t1 = (s + 1) / n
      const g = c.geo(ax + (bx - ax) * (t0 + t1) * 0.5, az + (bz - az) * (t0 + t1) * 0.5)
      const base = g.count
      for (const t of [t0, t1]) {
        const px = ax + (bx - ax) * t, pz = az + (bz - az) * t
        const sx = sa[0] + (sb[0] - sa[0]) * t, sz = sa[1] + (sb[1] - sa[1]) * t
        const wob = 0.92 + 0.16 * Math.sin((k + t) * 2.7)
        for (const [u, col] of across) g.v([px + sx * u * width, y, pz + sz * u * width], [0, 1, 0], mul(col, wob))
      }
      for (let j = 0; j < across.length - 1; j++) {
        const a = base + j, b = a + 1, d = a + across.length, e = d + 1
        g.i.push(a, d, b, b, d, e, a, b, d, b, e, d) // duas faces (a fita é fina; evita depender do sentido)
      }
    }
    if (block) c.block((ax + bx) / 2, (az + bz) / 2, L / 2 + width * 0.2, width * 0.5, 2, Math.atan2(bx - ax, bz - az) - Math.PI / 2)
  }
}

/** Espalha pontos numa grade com tremor: chama `fn(x, z, r)`; `r(n)` = número 0–1 estável do ponto. */
export function scatter(x0: number, z0: number, x1: number, z1: number, step: number, seed: number, fn: (x: number, z: number, r: (n: number) => number) => void) {
  const h = (a: number, b: number, n: number) => {
    const v = Math.sin(a * 127.1 + b * 311.7 + (seed + n) * 74.7) * 43758.5453
    return v - Math.floor(v)
  }
  for (let j = 0; z0 + j * step < z1; j++)
    for (let i = 0; x0 + i * step < x1; i++) {
      const x = x0 + (i + 0.15 + 0.7 * h(i, j, 1)) * step, z = z0 + (j + 0.15 + 0.7 * h(i, j, 2)) * step
      if (x < x1 && z < z1) fn(x, z, (n) => h(i, j, 10 + n))
    }
}

/** O ponto (x, z) está dentro de alguma caixa (com folga `pad`)? */
export function blocked(c: Cena, x: number, z: number, pad = 0.4) {
  for (const b of c.blockers) {
    const cs = Math.cos(-b.rot), sn = Math.sin(-b.rot)
    const dx = x - b.x, dz = z - b.z
    const lx = dx * cs + dz * sn, lz = -dx * sn + dz * cs
    if (Math.abs(lx) < b.hx + pad && Math.abs(lz) < b.hz + pad) return true
  }
  return false
}

/** Confere os caminhos: de 1 em 1 m, sem caixa em cima e com o chão em y = 0. Devolve os pontos ruins. */
export function checkWalk(c: Cena) {
  const bad: string[] = []
  for (const path of c.walk)
    for (let k = 0; k < path.length - 1; k++) {
      const [ax, az] = path[k], [bx, bz] = path[k + 1]
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az)))
      for (let s = 0; s <= n; s++) {
        const x = ax + ((bx - ax) * s) / n, z = az + ((bz - az) * s) / n
        if (blocked(c, x, z)) bad.push(`caixa em (${x.toFixed(1)}, ${z.toFixed(1)})`)
        else if (Math.abs(c.height(x, z)) > 0.03) bad.push(`chão fora de 0 em (${x.toFixed(1)}, ${z.toFixed(1)}): ${c.height(x, z).toFixed(2)}`)
      }
    }
  return bad
}

/** (x, z) está dentro do polígono? */
export function inPoly(x: number, z: number, poly: readonly XZ[]) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j]
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside
  }
  return inside
}

/**
 * Confere os pontos e as zonas do jogo. Ponto: dentro da área, chão em 0, sem caixa a 0,8 m.
 * Zona: toda dentro da área, ≥ 120 m² de chão livre e ≥ 70% livre (o monstro precisa de onde andar).
 * `exige` = o que a cena TEM que ter (cena inteira de Domínio: `meta.pontos` e `meta.setores`).
 */
export function checkMarcas(c: Cena, exige: { pontos?: readonly string[]; setores?: readonly number[] } = {}) {
  const bad: string[] = []
  const dentro = (x: number, z: number) => c.cells.has(`${Math.floor(x / c.cell)},${Math.floor(z / c.cell)}`)
  const livre = (x: number, z: number, pad: number) => dentro(x, z) && !blocked(c, x, z, pad) && Math.abs(c.height(x, z)) <= 0.03
  for (const n of exige.pontos ?? []) if (!c.pontos[n]) bad.push(`falta o ponto "${n}"`)
  for (const s of exige.setores ?? []) if (!c.zonas.some((q) => q.setor === s)) bad.push(`falta a zona do setor ${s}`)
  for (const [n, p] of Object.entries(c.pontos)) {
    if (!dentro(p.x, p.z)) bad.push(`ponto "${n}" fora da área`)
    else if (!livre(p.x, p.z, 0.8)) bad.push(`ponto "${n}" em cima de caixa ou de chão fora de 0`)
  }
  for (const q of c.zonas) {
    let tot = 0, ok = 0, fora = 0
    const xs = q.poly.map((p) => p[0]), zs = q.poly.map((p) => p[1])
    for (let z = Math.min(...zs) + 1; z < Math.max(...zs); z += 2)
      for (let x = Math.min(...xs) + 1; x < Math.max(...xs); x += 2) {
        if (!inPoly(x, z, q.poly)) continue
        tot++
        if (!dentro(x, z)) fora++
        else if (livre(x, z, 0.5)) ok++
      }
    if (fora) bad.push(`zona do setor ${q.setor} sai da área`)
    else if (ok * 4 < 120) bad.push(`zona do setor ${q.setor} com só ${ok * 4} m² livres (mínimo 120)`)
    else if (ok < tot * 0.7) bad.push(`zona do setor ${q.setor} só ${Math.round((ok / tot) * 100)}% livre (mínimo 70%)`)
  }
  return bad
}

/**
 * Vira malhas: uma por bloco + o pano de fundo, todas com o MESMO material (cor por vértice,
 * quase sem reflexo). `grime` = variação de tom em mancha larga (0 desliga).
 */
export function finishCena(scene: Scene, c: Cena, o: { grime?: number; spec?: RGB; bare?: RGB } = {}) {
  const mat = new StandardMaterial(`cena-${c.name}`, scene)
  mat.diffuseColor = new Color3(1, 1, 1)
  const sp = o.spec ?? [0.04, 0.04, 0.04]
  mat.specularColor = new Color3(sp[0], sp[1], sp[2])
  mat.specularPower = 8
  const meshes: Mesh[] = []
  const glowMat = new StandardMaterial(`cena-${c.name}-luz`, scene)
  glowMat.disableLighting = true
  glowMat.emissiveColor = new Color3(1, 1, 1)
  glowMat.diffuseColor = new Color3(0, 0, 0)
  glowMat.specularColor = new Color3(0, 0, 0)
  const add = (g: Geo, name: string, glow?: Geo) => {
    if (!g.count) return
    if ((o.grime ?? 0.25) > 0) g.weather({ grime: o.grime ?? 0.25, rustAmt: 0, bare: o.bare ?? [0.95, 0.82, 0.62] })
    let m = g.build(name, scene, mat)
    if (glow && glow.count) m = fuseGlow(m, glow.build(name + "-luz", scene, glowMat))
    m.isPickable = false
    meshes.push(m)
  }
  for (const [k, g] of c.cells) add(g, `cena-${c.name}-${k}`, c.glows.get(k))
  add(c.fundo, `cena-${c.name}-fundo`)
  return { meshes, material: mat, glowMaterial: glowMat }
}

export { smooth }
