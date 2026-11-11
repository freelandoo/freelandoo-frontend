// features/meu-mundo/engine/cena-codigo/kit-natureza.ts — formas NATURAIS estilizadas (skill `meu-mundo-cenario-codigo`).
//
// Tudo de pé (y para cima), facetado, cor por vértice, com o SOL do jogo levemente pintado nas
// faces (o jogo tem sol de verdade; a pintura só reforça a leitura das facetas). Usa o `Geo` do
// kit.ts. Peças: bloco de pedra em faixas, mesa/penhasco, tubo, copa (bolha facetada), árvore,
// arbusto, tufo de capim, pedra solta.

import { Geo, noise, TAU, type RGB, type V3 } from "./kit"

export const mul = (c: RGB, f: number): RGB => [c[0] * f, c[1] * f, c[2] * f]
export const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
export const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
export const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
/** Número pseudoaleatório 0–1 estável por (a, b, c). */
export const rnd = (a: number, b = 0, c = 0) => {
  const x = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453
  return x - Math.floor(x)
}

// ── sol pintado ──
const norm = (v: V3): V3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / l, v[1] / l, v[2] / l]
}
/** De onde vem a luz (o `mm-sun` do jogo aponta (−0.55, −1, −0.35); a luz vem do oposto). */
let SUN: V3 = norm([0.55, 1, 0.35])
/** Força da pintura (0 = nada; 1 = ±18%). Cena com sol de verdade: 1. Vitrine só com luz de céu: 2. */
let BAKE = 1
export function setSun(dir: V3, bake = 1) {
  SUN = norm(dir)
  BAKE = bake
}
export const sunK = (n: V3) => 1 + BAKE * (-0.18 + 0.36 * Math.max(0, n[0] * SUN[0] + n[1] * SUN[1] + n[2] * SUN[2]))

/** Triângulo com a frente virada para `N` (confere o sentido e troca se precisar). */
export function tri(g: Geo, a: number, b: number, c: number, N: V3) {
  const P = (i: number): V3 => [g.p[i * 3], g.p[i * 3 + 1], g.p[i * 3 + 2]]
  const p = P(a), q = P(b), r = P(c)
  const ux = q[0] - p[0], uy = q[1] - p[1], uz = q[2] - p[2]
  const vx = r[0] - p[0], vy = r[1] - p[1], vz = r[2] - p[2]
  const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx
  if (cx * N[0] + cy * N[1] + cz * N[2] > 0) g.i.push(a, c, b)
  else g.i.push(a, b, c)
}

/** Polígono plano convexo (leque), facetado, virado para `want`, com o sol pintado. `cols`: uma cor ou uma por ponto. */
export function face(g: Geo, pts: V3[], cols: RGB | RGB[], want: V3, wear = 0) {
  const [a, b, c] = pts
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2]
  const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2]
  let n: V3 = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx]
  if (n[0] * want[0] + n[1] * want[1] + n[2] * want[2] < 0) n = [-n[0], -n[1], -n[2]]
  n = norm(n)
  const k0 = sunK(n)
  const many = Array.isArray(cols[0])
  const ids = pts.map((p, k) => g.v(p, n, mul(many ? (cols as RGB[])[k] : (cols as RGB), k0), wear))
  for (let k = 1; k < ids.length - 1; k++) tri(g, ids[0], ids[k], ids[k + 1], n)
}

// ── faixas de rocha (estratos) ──
export interface Strata {
  cuts: number[]
  cols: RGB[]
}
/**
 * Faixas horizontais: `bands` = [cor, espessura em m] em sequência (repete até `h`), espessura ±30%
 * pelo ruído. Faixa clara FINA entre faixas escuras grossas é o que faz a rocha parecer arenito.
 */
export function strata(bands: readonly (readonly [RGB, number])[], h: number, seed = 0): Strata {
  const cuts: number[] = [], cols: RGB[] = []
  let y = 0, k = 0
  while (y < h + 2) {
    const [c, t] = bands[k % bands.length]
    y += t * (0.7 + 0.6 * noise(k * 1.7 + seed * 3.3, 4.1, 0.7))
    cuts.push(y)
    cols.push(c)
    k++
  }
  return { cuts, cols }
}
export const bandAt = (s: Strata, y: number) => {
  let k = 0
  while (k < s.cuts.length - 1 && s.cuts[k] < y) k++
  return s.cols[k]
}

const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]

/**
 * Bloco de pedra facetado: octógono irregular de y0 a y1, lados cortados nas faixas, quina de cima
 * chanfrada e clara, tampa. Serve para laje, pedra solta, degrau, pilar. Devolve `top(u, v)` (−1..1).
 */
export function block(g: Geo, cx: number, cz: number, y0: number, y1: number, w: number, d: number, o: { strata: Strata; seed?: number; rot?: number; taper?: number; tilt?: number; bevel?: number; top?: RGB; topHi?: RGB }) {
  const s = o.seed ?? cx * 3.7 + cz * 1.3 + y0
  const { rot = 0, taper = 0.92, tilt = 0.06, bevel = Math.min(0.12, (y1 - y0) * 0.12, Math.min(w, d) * 0.12) } = o
  const c = Math.min(w, d) * 0.24
  const base: [number, number][] = [
    [w / 2, d / 2 - c], [w / 2 - c, d / 2], [-w / 2 + c, d / 2], [-w / 2, d / 2 - c],
    [-w / 2, -d / 2 + c], [-w / 2 + c, -d / 2], [w / 2 - c, -d / 2], [w / 2, -d / 2 + c],
  ]
  const cr = Math.cos(rot), sr = Math.sin(rot)
  const ring = (y: number, k: number, salt: number): V3[] =>
    base.map(([x, z], i) => {
      const j = 0.86 + 0.26 * noise(i * 2.3 + s * 7.1, salt, s * 0.37)
      const X = x * j * k, Z = z * j * k
      return [cx + X * cr - Z * sr, y, cz + X * sr + Z * cr]
    })
  const bot = ring(y0, 1, 1.1)
  const topY = (p: V3) => y1 + tilt * ((p[0] - cx) * 0.7 - (p[2] - cz) * 0.5)
  const mid = ring(0, taper, 2.9)
  for (const p of mid) p[1] = topY(p) - bevel
  const cap = mid.map((p) => {
    const q = lerp3([cx, p[1], cz], p, 1 - bevel / Math.max(0.2, Math.hypot(p[0] - cx, p[2] - cz)))
    return [q[0], topY(p), q[2]] as V3
  })
  const off = (noise(s * 3.3, 0.5, 9.1) - 0.5) * 0.14
  const vary = 0.9 + 0.2 * noise(s * 1.9, 2.2, 3.3)
  const topC = o.top ?? o.strata.cols[1] ?? o.strata.cols[0]
  const topHi = o.topHi ?? mul(topC, 1.12)
  for (let i = 0; i < 8; i++) {
    const j = (i + 1) % 8
    const out: V3 = [(bot[i][0] + bot[j][0]) / 2 - cx, 0, (bot[i][2] + bot[j][2]) / 2 - cz]
    const yA = y0, yB = Math.min(mid[i][1], mid[j][1])
    const cuts = [0, ...o.strata.cuts.map((y) => (y + off - yA) / (yB - yA)).filter((t) => t > 0.04 && t < 0.96), 1]
    for (let k = 0; k < cuts.length - 1; k++) {
      const t0 = cuts[k], t1 = cuts[k + 1]
      const yMid = yA + ((yB - yA) * (t0 + t1)) / 2
      const ao = Math.min(1, 0.62 + 0.38 * Math.min(1, (yMid - y0) / 0.6 + (y0 > 0.05 ? 1 : 0)))
      face(g, [lerp3(bot[i], mid[i], t0), lerp3(bot[j], mid[j], t0), lerp3(bot[j], mid[j], t1), lerp3(bot[i], mid[i], t1)], mul(bandAt(o.strata, yMid - off), vary * ao), out, 0.12)
    }
    face(g, [mid[i], mid[j], cap[j], cap[i]], mul(topHi, vary), [out[0], 0.8, out[2]], 1)
  }
  face(g, cap, cap.map((_, k) => mul(topC, (k % 2 ? 0.95 : 1) * vary)), [0, 1, 0], 0.3)
  return {
    top: (u: number, v: number): V3 => {
      const x = cx + (u * w) / 2, z = cz + (v * d) / 2
      return [x, topY([x, 0, z]), z]
    },
  }
}

export interface MesaOut {
  x: number
  z: number
  rx: number
  rz: number
  topY: number
  /** Ponto no platô (u, v em −1..1 do miolo). */
  top: (u: number, v: number) => V3
  /** Dentro da planta? `k` = folga (1 = borda; 1.15 = pé; 0.6 = miolo do platô). */
  inside: (x: number, z: number, k?: number) => boolean
}

/**
 * MESA / PENHASCO: planta oval irregular, parede em faixas com prateleiras (cada faixa entra ou sai
 * alguns %), fendas verticais escuras, pé alargado e platô com borda de rocha e miolo de `grass`.
 * Empilhe duas (a de cima com `y0 = topY` da de baixo) para fazer o penhasco em andares.
 */
export function mesa(g: Geo, o: { x: number; z: number; rx: number; rz: number; h: number; strata: Strata; y0?: number; seed?: number; seg?: number; flare?: number; grass?: RGB; rim?: RGB; lod?: number }): MesaOut {
  const { x, z, rx, rz, h, y0 = 0, seed = x * 0.37 + z * 0.11, flare = 0.14, lod = 0 } = o
  const seg = o.seg ?? (lod ? 11 : 17) // poucas colunas LARGAS: a parede tem que ser angulosa, não um cilindro
  const st = o.strata
  const topY = y0 + h
  const ys = [y0, ...st.cuts.map((c) => c + y0 * 0).filter((c) => c > y0 + 0.4 && c < topY - 0.4), topY]
  const nb = ys.length - 1
  const lobe = (k: number) => {
    const th = (k / seg) * TAU
    // lóbulos largos + contraforte por coluna (a planta não pode parecer um bolo redondo)
    return 0.8 + 0.34 * noise(Math.cos(th) * 1.4 + seed * 3.1, Math.sin(th) * 1.4 + 7, seed) + 0.24 * (rnd(k, seed, 6) - 0.5)
  }
  const crack = (k: number) => noise(k * 1.7 + seed * 5.3, 9.1, 2.2) < 0.26
  const scaleOf = (b: number) => {
    const t = (ys[b] + ys[b + 1]) / 2 - y0
    // de longe (lod) a parede é contínua: sem degrau entre faixas (o degrau sem prateleira abre buraco)
    return 1 + flare * (1 - t / h) ** 2 + (lod ? 0 : (rnd(b, seed, 3) - 0.5) * 0.06)
  }
  const P = (k: number, y: number, s: number, b: number): V3 => {
    const kk = ((k % seg) + seg) % seg
    const th = (kk / seg) * TAU
    const j = (1 + 0.07 * (noise(kk * 0.9 + seed, b * 1.3, 4.4) - 0.5)) * (crack(kk) ? 0.9 : 1)
    const r = lobe(kk) * s * j
    return [x + Math.cos(th) * rx * r, y, z + Math.sin(th) * rz * r]
  }
  const rimC = o.rim ?? mul(st.cols[1] ?? st.cols[0], 0.96)
  for (let b = 0; b < nb; b++) {
    const s = scaleOf(b)
    const yMid = (ys[b] + ys[b + 1]) / 2
    const base = bandAt(st, yMid)
    for (let k = 0; k < seg; k++) {
      const th = ((k + 0.5) / seg) * TAU
      const out: V3 = [Math.cos(th) * rz, 0, Math.sin(th) * rx]
      const dark = (crack(k) && crack(k + 1) ? 0.6 : crack(k) || crack(k + 1) ? 0.8 : 1) * (b === 0 && y0 < 0.1 ? 0.78 : 1)
      const vary = 0.92 + 0.16 * noise(k * 0.7 + seed, b * 2.1, 1.1)
      const sTop = lod ? scaleOf(Math.min(nb - 1, b + 1)) : s * 0.985
      face(g, [P(k, ys[b], s, b), P(k + 1, ys[b], s, b), P(k + 1, ys[b + 1], sTop, lod ? b + 1 : b), P(k, ys[b + 1], sTop, lod ? b + 1 : b)], mul(base, dark * vary), out, 0.15)
      // prateleira entre esta faixa e a de cima (para cima = poeira clara; para baixo = sombra)
      if (b < nb - 1 && !lod) {
        const s2 = scaleOf(b + 1)
        const up = s2 < s * 0.985
        face(g, [P(k, ys[b + 1], s * 0.985, b), P(k + 1, ys[b + 1], s * 0.985, b), P(k + 1, ys[b + 1], s2, b + 1), P(k, ys[b + 1], s2, b + 1)], up ? mul(rimC, 0.95) : mul(base, 0.5), [0, up ? 1 : -1, 0], up ? 0.6 : 0)
      }
    }
  }
  // platô: borda de rocha clara, anel de capim, miolo
  const sT = scaleOf(nb - 1) * 0.985
  const grass = o.grass ?? rimC
  const C: V3 = [x, topY + 0.12, z]
  for (let k = 0; k < seg; k++) {
    const a0 = P(k, topY, sT, nb - 1), a1 = P(k + 1, topY, sT, nb - 1)
    const b0 = lerp3(C, a0, 0.9), b1 = lerp3(C, a1, 0.9)
    b0[1] = b1[1] = topY + 0.03
    const c0 = lerp3(C, a0, 0.45), c1 = lerp3(C, a1, 0.45)
    c0[1] = c1[1] = topY + 0.1
    const gv = (p: V3) => mul(grass, 0.82 + 0.36 * noise(p[0] * 0.35, 3.3, p[2] * 0.35))
    face(g, [a0, a1, b1, b0], mul(rimC, 0.95 + 0.12 * rnd(k, seed)), [0, 1, 0], 0.5)
    face(g, [b0, b1, c1, c0], [gv(b0), gv(b1), gv(c1), gv(c0)], [0, 1, 0])
    face(g, [c0, c1, C], [gv(c0), gv(c1), gv(C)], [0, 1, 0])
  }
  return {
    x, z, rx, rz, topY,
    top: (u, v) => [x + u * rx * 0.5, topY + 0.08, z + v * rz * 0.5],
    inside: (px, pz, k = 1) => ((px - x) / (rx * k)) ** 2 + ((pz - z) / (rz * k)) ** 2 < 1,
  }
}

/**
 * Contrafortes: `n` pilares de pedra (blocos em faixas) encostados na parede da mesa, de alturas
 * variadas. É o que tira a cara de "bolo em camadas": quebra a parede em colunas e a silhueta em dentes.
 */
export function buttresses(g: Geo, m: MesaOut, n: number, st: Strata, seed: number, y0 = 0) {
  for (let k = 0; k < n; k++) {
    const th = ((k + rnd(k, seed, 1) * 0.7) / n) * TAU
    const hh = (m.topY - y0) * (0.4 + 0.55 * rnd(k, seed, 2))
    const w = Math.min(m.rx, m.rz) * (0.28 + 0.2 * rnd(k, seed, 3))
    const x = m.x + Math.cos(th) * m.rx * 0.97, z = m.z + Math.sin(th) * m.rz * 0.97
    block(g, x, z, y0, y0 + hh, w, w * (0.8 + 0.4 * rnd(k, seed, 4)), { strata: st, seed: seed + k * 3.1, rot: -th + rnd(k, seed, 5) * 0.5, taper: 0.9, tilt: 0.05 })
  }
}

/** Tubo de `a` a `b` (raio ra → rb), `n` lados, liso; `cols(k)` = cor do lado k; `capEnd` fecha a ponta. */
export function tube(g: Geo, a: V3, b: V3, ra: number, rb: number, n: number, cols: (k: number) => RGB, capEnd = true) {
  const ax: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
  const t = norm(ax)
  const ref: V3 = Math.abs(t[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]
  const u = norm([t[1] * ref[2] - t[2] * ref[1], t[2] * ref[0] - t[0] * ref[2], t[0] * ref[1] - t[1] * ref[0]])
  const v: V3 = [t[1] * u[2] - t[2] * u[1], t[2] * u[0] - t[0] * u[2], t[0] * u[1] - t[1] * u[0]]
  const dir = (k: number): V3 => {
    const th = (k / n) * TAU
    return [u[0] * Math.cos(th) + v[0] * Math.sin(th), u[1] * Math.cos(th) + v[1] * Math.sin(th), u[2] * Math.cos(th) + v[2] * Math.sin(th)]
  }
  const ia: number[] = [], ib: number[] = []
  for (let k = 0; k < n; k++) {
    const d = dir(k), f = sunK(d)
    ia.push(g.v([a[0] + d[0] * ra, a[1] + d[1] * ra, a[2] + d[2] * ra], d, mul(cols(k), 0.8 * f)))
    ib.push(g.v([b[0] + d[0] * rb, b[1] + d[1] * rb, b[2] + d[2] * rb], d, mul(cols(k), f)))
  }
  for (let k = 0; k < n; k++) {
    const j = (k + 1) % n, d = dir(k + 0.5)
    tri(g, ia[k], ib[k], ib[j], d)
    tri(g, ia[k], ib[j], ia[j], d)
  }
  if (capEnd) {
    const tip = g.v([b[0] + t[0] * rb * 0.6, b[1] + t[1] * rb * 0.6, b[2] + t[2] * rb * 0.6], t, mul(cols(0), 1.15))
    for (let k = 0; k < n; k++) tri(g, ib[k], ib[(k + 1) % n], tip, t)
  }
}

// ── copa: bolha facetada (icosaedro amassado) ──
const PHI = (1 + Math.sqrt(5)) / 2
const ICO_V: V3[] = ([[-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0], [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI], [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1]] as V3[]).map(norm)
const ICO_F = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]]

export interface Foliage {
  dark: RGB
  mid: RGB
  hi: RGB
}
/** Bolha de folhagem: 20 faces, escura embaixo → clara em cima (a luz vem de cima), cada face num tom. */
export function blob(g: Geo, c: V3, r: V3, f: Foliage, seed: number) {
  const pts = ICO_V.map((d, i): V3 => {
    const j = 0.8 + 0.4 * rnd(i, seed, 1.7)
    return [c[0] + d[0] * r[0] * j, c[1] + d[1] * r[1] * j, c[2] + d[2] * r[2] * j]
  })
  ICO_F.forEach(([a, b, d], k) => {
    const m: V3 = [(pts[a][0] + pts[b][0] + pts[d][0]) / 3 - c[0], (pts[a][1] + pts[b][1] + pts[d][1]) / 3 - c[1], (pts[a][2] + pts[b][2] + pts[d][2]) / 3 - c[2]]
    const up = clamp01(0.5 + (0.5 * m[1]) / (Math.hypot(m[0], m[1], m[2]) || 1))
    const t = clamp01(up + (rnd(k, seed, 9.3) - 0.5) * 0.3)
    face(g, [pts[a], pts[b], pts[d]], t < 0.5 ? mix(f.dark, f.mid, t * 2) : mix(f.mid, f.hi, t * 2 - 1), m)
  })
}

/**
 * Árvore estilizada: tronco de 5 lados + copa de 3–4 bolhas (perto) ou 1 bolha (`lod` 1).
 * `h` = altura total; `r` = raio da copa. ~110 triângulos perto, ~35 longe.
 */
export function tree(g: Geo, p: V3, o: { h: number; r: number; leaf: Foliage; bark?: RGB; seed: number; lod?: number }) {
  const { h, r, leaf, seed, lod = 0 } = o
  const bark = o.bark ?? [0.46, 0.33, 0.22]
  const lean: V3 = [(rnd(seed, 1) - 0.5) * 0.25 * h, 0, (rnd(seed, 2) - 0.5) * 0.25 * h]
  const top: V3 = [p[0] + lean[0], p[1] + h * 0.58, p[2] + lean[2]]
  tube(g, [p[0], p[1] - 0.1, p[2]], top, r * 0.16, r * 0.09, lod ? 4 : 5, () => bark, false)
  const cy = p[1] + h - r * 0.75
  if (lod) {
    blob(g, [top[0], cy, top[2]], [r * 1.1, r * 0.95, r * 1.1], leaf, seed)
    return
  }
  blob(g, [top[0], cy, top[2]], [r, r * 0.85, r], leaf, seed)
  const n = 2 + (rnd(seed, 5) > 0.5 ? 1 : 0)
  for (let k = 0; k < n; k++) {
    const th = (k / n) * TAU + rnd(seed, k, 7) * 1.5
    const rr = r * (0.55 + 0.2 * rnd(seed, k, 8))
    blob(g, [top[0] + Math.cos(th) * r * 0.7, cy - r * (0.25 + 0.3 * rnd(seed, k, 9)), top[2] + Math.sin(th) * r * 0.7], [rr, rr * 0.8, rr], leaf, seed + k + 1)
  }
}

/** Arbusto: 1–2 bolhas achatadas no chão. */
export function bush(g: Geo, p: V3, r: number, leaf: Foliage, seed: number, lod = 0) {
  blob(g, [p[0], p[1] + r * 0.45, p[2]], [r, r * 0.62, r], leaf, seed)
  if (!lod && rnd(seed, 3) > 0.4) blob(g, [p[0] + r * 0.7, p[1] + r * 0.3, p[2] + (rnd(seed, 4) - 0.5) * r], [r * 0.6, r * 0.42, r * 0.6], leaf, seed + 1)
}

/** Tufo de capim: `n` folhas finas (duas faces), escuras na base e claras na ponta. Só perto (lod 0). */
export function tuft(g: Geo, p: V3, n: number, h: number, seed: number, dark: RGB, hi: RGB) {
  for (let k = 0; k < n; k++) {
    const th = (k / n) * TAU + rnd(seed, k, 1) * 0.8
    const lean = 0.35 + 0.4 * rnd(k, seed, 2)
    const hh = h * (0.65 + 0.5 * rnd(seed, k, 3))
    const dx = Math.cos(th), dz = Math.sin(th)
    const wx = -dz * 0.05, wz = dx * 0.05
    const tip: V3 = [p[0] + dx * hh * lean, p[1] + hh, p[2] + dz * hh * lean]
    const l: V3 = [p[0] - wx, p[1], p[2] - wz], r: V3 = [p[0] + wx, p[1], p[2] + wz]
    for (const s of [1, -1]) {
      const N: V3 = [dx * s, 0.4, dz * s]
      const i0 = g.v(l, N, dark), i1 = g.v(r, N, dark), i2 = g.v(tip, N, hi)
      tri(g, i0, i1, i2, N)
    }
  }
}

/** Pedra solta: bloco baixo e afunilado. */
export function rock(g: Geo, p: V3, s: number, st: Strata, seed: number) {
  return block(g, p[0], p[2], p[1] - 0.05, p[1] + s * (0.6 + 0.5 * rnd(seed, 1)), s * (1.2 + 0.6 * rnd(seed, 2)), s * (1 + 0.5 * rnd(seed, 3)), { strata: st, seed, rot: rnd(seed, 4) * 3, taper: 0.72, tilt: 0.1 })
}
